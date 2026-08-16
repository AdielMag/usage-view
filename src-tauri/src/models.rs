use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    ClaudeWeb,
    ClaudeApi,
    ClaudeCli,
    AntigravityApi,
    AntigravityCli,
    GeminiApi,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountConfig {
    pub id: String,
    pub name: String,
    pub provider_type: ProviderType,
    pub enabled: bool,
    // Sensitive fields are retrieved via vault/keyring or config
    #[serde(default)]
    pub token: Option<String>,
    #[serde(default)]
    pub org_id: Option<String>,
    #[serde(default)]
    pub custom_endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLimit {
    pub name: String,                  // e.g. "5-Hour Rolling Limit", "TPM Limit", "Daily Quota"
    pub used: f64,                     // Used amount (e.g. 32 messages or 45,000 tokens)
    pub total: f64,                    // Total capacity (e.g. 45 messages or 100,000 tokens)
    pub percentage: f64,               // 0.0 - 100.0%
    pub unit: String,                  // "messages", "tokens", "requests", "%"
    pub resets_at: Option<i64>,        // Unix epoch timestamp (seconds)
    pub reset_in_seconds: Option<i64>, // Countdown in seconds
    pub status: LimitStatus,           // Normal, Warning, Exhausted
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LimitStatus {
    Normal,    // < 75%
    Warning,   // 75% - 95%
    Exhausted, // >= 95%
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelUsage {
    pub model_id: String,              // e.g. "claude-3-7-sonnet", "gemini-2.0-flash"
    pub display_name: String,
    pub tokens_used: u64,
    pub requests_used: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountUsageReport {
    pub account_id: String,
    pub account_name: String,
    pub provider_type: ProviderType,
    pub is_connected: bool,
    pub last_updated: i64,             // Unix timestamp
    pub primary_limit: SessionLimit,
    pub secondary_limits: Vec<SessionLimit>,
    pub models: Vec<ModelUsage>,
    pub error_message: Option<String>,
    pub tier_name: Option<String>,     // e.g. "Claude Pro", "Team", "Scale Tier 4"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub poll_interval_minutes: u32,
    pub notify_on_reset: bool,
    pub notify_on_low_quota: bool,
    pub low_quota_threshold_percent: u32,
    pub launch_at_login: bool,
    pub dark_mode: bool,
    pub auto_detect_cli: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountNotificationState {
    pub last_remaining_pct: f64,
    pub last_status: LimitStatus,
    pub last_notified_reset_epoch: Option<i64>,
    pub was_depleted: bool,
    pub last_reset_notified_at: Option<i64>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            poll_interval_minutes: 3,
            notify_on_reset: true,
            notify_on_low_quota: true,
            low_quota_threshold_percent: 80,
            launch_at_login: false,
            dark_mode: true,
            auto_detect_cli: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedCliAccount {
    pub provider_type: ProviderType,
    pub detected_name: String,
    pub path: String,
    pub has_credentials: bool,
    pub preview_token: Option<String>,
}
