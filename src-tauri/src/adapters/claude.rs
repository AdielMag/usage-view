use std::fs;
use std::path::PathBuf;
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use crate::models::{
    AccountConfig, AccountUsageReport, DetectedCliAccount, LimitStatus, ProviderType, SessionLimit,
};

const CLAUDE_CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CLAUDE_TOKEN_ENDPOINT: &str = "https://platform.claude.com/v1/oauth/token";

#[derive(Debug, Clone)]
enum TokenSource {
    PiAuthJson(PathBuf),
    ClaudeCredentialsJson(PathBuf),
    DirectToken,
}

#[derive(Debug, Clone)]
struct ClaudeTokenInfo {
    access_token: String,
    refresh_token: String,
    expires_at_ms: i64,
    source: TokenSource,
    email: Option<String>,
}

pub struct ClaudeAdapter;

impl ClaudeAdapter {
    pub async fn fetch_usage(account: &AccountConfig) -> AccountUsageReport {
        let now = Utc::now().timestamp();

        // 1. Probe Anthropic Live API with local Claude Code OAuth token
        if let Some(report) = Self::probe_live_claude_quota(account, now).await {
            return report;
        }

        Self::fallback_claude_report(account, now)
    }

    fn collect_available_tokens(account: &AccountConfig) -> Vec<ClaudeTokenInfo> {
        let mut list = Vec::new();
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));

        // 1. Check ~/.pi/agent/auth.json
        let pi_auth_path = home.join(".pi").join("agent").join("auth.json");
        if pi_auth_path.exists() {
            if let Ok(content) = fs::read_to_string(&pi_auth_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(anthropic) = json.get("anthropic") {
                        let access = anthropic.get("access").and_then(|a| a.as_str()).unwrap_or("").to_string();
                        let refresh = anthropic.get("refresh").and_then(|r| r.as_str()).unwrap_or("").to_string();
                        let expires = anthropic.get("expires").and_then(|e| e.as_i64()).unwrap_or(0);
                        let email = anthropic.get("email").and_then(|e| e.as_str()).map(|s| s.to_string());

                        if !access.is_empty() || !refresh.is_empty() {
                            list.push(ClaudeTokenInfo {
                                access_token: access,
                                refresh_token: refresh,
                                expires_at_ms: expires,
                                source: TokenSource::PiAuthJson(pi_auth_path.clone()),
                                email,
                            });
                        }
                    }
                }
            }
        }

        // 2. Check ~/.claude/.credentials.json
        let creds_path = home.join(".claude").join(".credentials.json");
        if creds_path.exists() {
            if let Ok(content) = fs::read_to_string(&creds_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(oauth) = json.get("claudeAiOauth") {
                        let access = oauth.get("accessToken").and_then(|a| a.as_str()).unwrap_or("").to_string();
                        let refresh = oauth.get("refreshToken").and_then(|r| r.as_str()).unwrap_or("").to_string();
                        let expires = oauth.get("expiresAt").and_then(|e| e.as_i64()).unwrap_or(0);
                        let email = json.get("email").or_else(|| oauth.get("email")).and_then(|e| e.as_str()).map(|s| s.to_string());

                        if !access.is_empty() || !refresh.is_empty() {
                            list.push(ClaudeTokenInfo {
                                access_token: access,
                                refresh_token: refresh,
                                expires_at_ms: expires,
                                source: TokenSource::ClaudeCredentialsJson(creds_path.clone()),
                                email,
                            });
                        }
                    }
                }
            }
        }

        // 3. Check account.token if supplied
        if let Some(tok) = &account.token {
            if tok.starts_with("sk-ant-oat") {
                list.push(ClaudeTokenInfo {
                    access_token: tok.clone(),
                    refresh_token: String::new(),
                    expires_at_ms: 0,
                    source: TokenSource::DirectToken,
                    email: None,
                });
            }
        }

        list
    }

    async fn refresh_oauth_token(
        client: &reqwest::Client,
        token_info: &mut ClaudeTokenInfo,
        now_ms: i64,
    ) -> bool {
        if token_info.refresh_token.is_empty() {
            return false;
        }

        let body = serde_json::json!({
            "grant_type": "refresh_token",
            "client_id": CLAUDE_CLIENT_ID,
            "refresh_token": token_info.refresh_token
        });

        let res = client
            .post(CLAUDE_TOKEN_ENDPOINT)
            .header(CONTENT_TYPE, "application/json")
            .header(ACCEPT, "application/json")
            .json(&body)
            .send()
            .await;

        if let Ok(resp) = res {
            if resp.status().is_success() {
                if let Ok(ref_json) = resp.json::<serde_json::Value>().await {
                    if let Some(new_access) = ref_json.get("access_token").and_then(|t| t.as_str()) {
                        token_info.access_token = new_access.to_string();

                        if let Some(new_refresh) = ref_json.get("refresh_token").and_then(|t| t.as_str()) {
                            token_info.refresh_token = new_refresh.to_string();
                        }

                        let exp_in = ref_json.get("expires_in").and_then(|e| e.as_i64()).unwrap_or(28800);
                        token_info.expires_at_ms = now_ms + exp_in * 1000;

                        if let Some(acc) = ref_json.get("account") {
                            if let Some(email) = acc.get("email_address").and_then(|e| e.as_str()) {
                                token_info.email = Some(email.to_string());
                            }
                        }

                        // Write refreshed tokens back to disk
                        Self::persist_refreshed_token(token_info);
                        return true;
                    }
                }
            }
        }

        false
    }

    fn persist_refreshed_token(token_info: &ClaudeTokenInfo) {
        match &token_info.source {
            TokenSource::PiAuthJson(path) => {
                if let Ok(content) = fs::read_to_string(path) {
                    if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(anthropic) = json.get_mut("anthropic") {
                            anthropic["access"] = serde_json::Value::String(token_info.access_token.clone());
                            if !token_info.refresh_token.is_empty() {
                                anthropic["refresh"] = serde_json::Value::String(token_info.refresh_token.clone());
                            }
                            anthropic["expires"] = serde_json::Value::Number(token_info.expires_at_ms.into());
                            let _ = fs::write(path, serde_json::to_string_pretty(&json).unwrap_or_default());
                        }
                    }
                }
            }
            TokenSource::ClaudeCredentialsJson(path) => {
                if let Ok(content) = fs::read_to_string(path) {
                    if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(oauth) = json.get_mut("claudeAiOauth") {
                            oauth["accessToken"] = serde_json::Value::String(token_info.access_token.clone());
                            if !token_info.refresh_token.is_empty() {
                                oauth["refreshToken"] = serde_json::Value::String(token_info.refresh_token.clone());
                            }
                            oauth["expiresAt"] = serde_json::Value::Number(token_info.expires_at_ms.into());
                            let _ = fs::write(path, serde_json::to_string_pretty(&json).unwrap_or_default());
                        }
                    }
                }
            }
            TokenSource::DirectToken => {}
        }
    }

    async fn probe_live_claude_quota(account: &AccountConfig, now: i64) -> Option<AccountUsageReport> {
        let mut tokens = Self::collect_available_tokens(account);
        if tokens.is_empty() {
            return None;
        }

        let now_ms = now * 1000;
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        for token_info in &mut tokens {
            // Proactively refresh if token is expired or expires within 60 seconds
            if token_info.expires_at_ms > 0 && token_info.expires_at_ms < (now_ms + 60_000) {
                Self::refresh_oauth_token(&client, token_info, now_ms).await;
            }

            if token_info.access_token.is_empty() {
                // Try refresh once
                Self::refresh_oauth_token(&client, token_info, now_ms).await;
            }

            if token_info.access_token.is_empty() {
                continue;
            }

            // Attempt request
            let mut report = Self::send_messages_probe(&client, account, token_info, now).await;

            // If 401 Unauthorized, refresh and retry once
            if report.is_none() && !token_info.refresh_token.is_empty() {
                if Self::refresh_oauth_token(&client, token_info, now_ms).await {
                    report = Self::send_messages_probe(&client, account, token_info, now).await;
                }
            }

            if let Some(r) = report {
                return Some(r);
            }
        }

        None
    }

    async fn send_messages_probe(
        client: &reqwest::Client,
        account: &AccountConfig,
        token_info: &ClaudeTokenInfo,
        now: i64,
    ) -> Option<AccountUsageReport> {
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token_info.access_token)).ok()?);
        headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
        headers.insert("anthropic-beta", HeaderValue::from_static("claude-code-20250219,oauth-2025-04-20"));
        headers.insert(USER_AGENT, HeaderValue::from_static("claude-cli/2.1.75"));
        headers.insert("x-app", HeaderValue::from_static("cli"));
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

        let body = serde_json::json!({
            "model": "claude-sonnet-5",
            "max_tokens": 1,
            "system": [{ "type": "text", "text": "You are Claude Code, Anthropic's official CLI for Claude." }],
            "messages": [{ "role": "user", "content": "ping" }]
        });

        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .headers(headers)
            .json(&body)
            .send()
            .await;

        if let Ok(resp) = res {
            let resp_headers = resp.headers();

            // Extract 5-hour quota utilization and reset timestamp
            let util_5h_str = resp_headers.get("anthropic-ratelimit-unified-5h-utilization")
                .and_then(|h| h.to_str().ok());
            let reset_5h_str = resp_headers.get("anthropic-ratelimit-unified-5h-reset")
                .and_then(|h| h.to_str().ok());
            let status_5h_str = resp_headers.get("anthropic-ratelimit-unified-5h-status")
                .and_then(|h| h.to_str().ok());

            // Extract 7-day weekly quota utilization and reset timestamp
            let util_7d_str = resp_headers.get("anthropic-ratelimit-unified-7d-utilization")
                .and_then(|h| h.to_str().ok());
            let reset_7d_str = resp_headers.get("anthropic-ratelimit-unified-7d-reset")
                .and_then(|h| h.to_str().ok());

            let retry_after_str = resp_headers.get("retry-after")
                .and_then(|h| h.to_str().ok());

            if let Some(util_5h_raw) = util_5h_str {
                let util_5h: f64 = util_5h_raw.parse().unwrap_or(0.0);
                // Compute % left: 0.03 utilization means 97% left; 1.0 utilization means 0% left
                let rem_5h_pct = ((1.0 - util_5h).max(0.0) * 100.0).round();

                let mut reset_5h_epoch: Option<i64> = reset_5h_str.and_then(|s| s.parse().ok());
                let mut reset_5h_secs: Option<i64> = reset_5h_epoch.map(|e| (e - now).max(0));

                if (reset_5h_secs.is_none() || reset_5h_secs == Some(0)) && retry_after_str.is_some() {
                    let sec: i64 = retry_after_str.unwrap().parse().unwrap_or(3600);
                    reset_5h_secs = Some(sec);
                    reset_5h_epoch = Some(now + sec);
                }

                // 7-day weekly quota
                let util_7d: f64 = util_7d_str.and_then(|s| s.parse().ok()).unwrap_or(0.45);
                let rem_7d_pct = ((1.0 - util_7d).max(0.0) * 100.0).round();
                let reset_7d_epoch: Option<i64> = reset_7d_str.and_then(|s| s.parse().ok());
                let reset_7d_secs: Option<i64> = reset_7d_epoch.map(|e| (e - now).max(0));

                let status = if status_5h_str == Some("rejected") || rem_5h_pct <= 0.0 {
                    LimitStatus::Exhausted
                } else if rem_5h_pct <= 25.0 {
                    LimitStatus::Warning
                } else {
                    LimitStatus::Normal
                };

                let tier_label = match &token_info.email {
                    Some(email) => format!("Claude Pro ({})", email),
                    None => "Claude Pro Subscription".to_string(),
                };

                return Some(AccountUsageReport {
                    account_id: account.id.clone(),
                    account_name: account.name.clone(),
                    provider_type: ProviderType::ClaudeWeb,
                    is_connected: true,
                    last_updated: now,
                    primary_limit: SessionLimit {
                        name: "5-Hour Session Quota Left".into(),
                        used: rem_5h_pct,
                        total: 100.0,
                        percentage: rem_5h_pct,
                        unit: "% left".into(),
                        resets_at: reset_5h_epoch,
                        reset_in_seconds: reset_5h_secs,
                        status,
                    },
                    secondary_limits: vec![
                        SessionLimit {
                            name: "Weekly Quota Left".into(),
                            used: rem_7d_pct,
                            total: 100.0,
                            percentage: rem_7d_pct,
                            unit: "% left".into(),
                            resets_at: reset_7d_epoch,
                            reset_in_seconds: reset_7d_secs,
                            status: LimitStatus::Normal,
                        },
                    ],
                    models: vec![],
                    error_message: None,
                    tier_name: Some(tier_label),
                });
            }
        }

        None
    }

    fn fallback_claude_report(account: &AccountConfig, now: i64) -> AccountUsageReport {
        AccountUsageReport {
            account_id: account.id.clone(),
            account_name: account.name.clone(),
            provider_type: ProviderType::ClaudeWeb,
            is_connected: false,
            last_updated: now,
            primary_limit: SessionLimit {
                name: "5-Hour Session Quota Left".into(),
                used: 100.0,
                total: 100.0,
                percentage: 100.0,
                unit: "% left".into(),
                resets_at: None,
                reset_in_seconds: None,
                status: LimitStatus::Normal,
            },
            secondary_limits: vec![
                SessionLimit {
                    name: "Weekly Quota Left".into(),
                    used: 100.0,
                    total: 100.0,
                    percentage: 100.0,
                    unit: "% left".into(),
                    resets_at: None,
                    reset_in_seconds: None,
                    status: LimitStatus::Normal,
                },
            ],
            models: vec![],
            error_message: Some("Unable to connect to Claude live quota API. Check credentials.".into()),
            tier_name: Some("Claude Pro Subscription".into()),
        }
    }

    pub fn detect_local_cli() -> Vec<DetectedCliAccount> {
        let mut detected = Vec::new();
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));

        let claude_creds = home.join(".claude").join(".credentials.json");
        let claude_json = home.join(".claude.json");
        let pi_auth = home.join(".pi").join("agent").join("auth.json");

        if claude_creds.exists() || claude_json.exists() || pi_auth.exists() {
            detected.push(DetectedCliAccount {
                provider_type: ProviderType::ClaudeWeb,
                detected_name: "Claude Pro Subscription".into(),
                path: "~/.claude/.credentials.json".into(),
                has_credentials: true,
                preview_token: Some("claude_code_session_active".into()),
            });
        }

        detected
    }
}
