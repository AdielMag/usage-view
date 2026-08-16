use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;
use crate::adapters::AdapterRegistry;
use crate::models::{
    AccountConfig, AccountNotificationState, AccountUsageReport, AppSettings, DetectedCliAccount,
    ProviderType,
};
use crate::vault::VaultManager;

pub struct AppState {
    pub app_handle: AppHandle,
    pub vault: Arc<Mutex<VaultManager>>,
    pub cached_reports: Arc<Mutex<Vec<AccountUsageReport>>>,
    pub notif_state: Arc<Mutex<HashMap<String, AccountNotificationState>>>,
}

#[tauri::command]
pub async fn get_all_usage(state: State<'_, AppState>) -> Result<Vec<AccountUsageReport>, String> {
    let reports = state.cached_reports.lock().await;
    if !reports.is_empty() {
        return Ok(reports.clone());
    }
    drop(reports);

    // If empty on first start, auto-import local sessions
    auto_connect_local_subscriptions(state.clone()).await
}

#[tauri::command]
pub async fn refresh_usage(state: State<'_, AppState>) -> Result<Vec<AccountUsageReport>, String> {
    let vault = state.vault.lock().await;
    let accounts = vault.load_accounts();
    let settings = vault.load_settings();
    drop(vault);

    if accounts.is_empty() {
        // Run auto-connect
        return auto_connect_local_subscriptions(state).await;
    }

    let mut new_reports = Vec::new();
    for acc in accounts.iter().filter(|a| a.enabled) {
        let report = AdapterRegistry::fetch_usage_for_account(acc).await;
        new_reports.push(report);
    }

    *state.cached_reports.lock().await = new_reports.clone();

    // Check notifications using shared state machine
    crate::notifier::Notifier::process_and_notify_reports(&new_reports, &state, &settings).await;

    Ok(new_reports)
}

#[tauri::command]
pub async fn auto_connect_local_subscriptions(
    state: State<'_, AppState>,
) -> Result<Vec<AccountUsageReport>, String> {
    let detected = AdapterRegistry::scan_all_local_credentials();
    let vault = state.vault.lock().await;
    let mut accounts = vault.load_accounts();

    for item in &detected {
        let exists = accounts.iter().any(|a| a.provider_type == item.provider_type);
        if !exists {
            accounts.push(AccountConfig {
                id: format!("{:?}-{}", item.provider_type, accounts.len() + 1).to_lowercase(),
                name: item.detected_name.clone(),
                provider_type: item.provider_type.clone(),
                enabled: true,
                token: item.preview_token.clone(),
                org_id: None,
                custom_endpoint: None,
            });
        }
    }

    // Default mock fallback accounts if none found locally
    if accounts.is_empty() {
        accounts.push(AccountConfig {
            id: "claude-sub-default".into(),
            name: "Claude Pro Subscription".into(),
            provider_type: ProviderType::ClaudeWeb,
            enabled: true,
            token: Some("pi_claude_oauth_active".into()),
            org_id: None,
            custom_endpoint: None,
        });
        accounts.push(AccountConfig {
            id: "antigravity-sub-default".into(),
            name: "Antigravity Subscription".into(),
            provider_type: ProviderType::AntigravityApi,
            enabled: true,
            token: Some("pi_antigravity_oauth_active".into()),
            org_id: None,
            custom_endpoint: None,
        });
    }

    vault.save_accounts(&accounts)?;
    drop(vault);

    let mut new_reports = Vec::new();
    for acc in accounts.iter().filter(|a| a.enabled) {
        let report = AdapterRegistry::fetch_usage_for_account(acc).await;
        new_reports.push(report);
    }

    *state.cached_reports.lock().await = new_reports.clone();
    Ok(new_reports)
}

#[tauri::command]
pub async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountConfig>, String> {
    let vault = state.vault.lock().await;
    Ok(vault.load_accounts())
}

#[tauri::command]
pub async fn save_account(
    account: AccountConfig,
    state: State<'_, AppState>,
) -> Result<Vec<AccountConfig>, String> {
    let vault = state.vault.lock().await;
    let mut accounts = vault.load_accounts();

    if let Some(pos) = accounts.iter().position(|a| a.id == account.id) {
        accounts[pos] = account;
    } else {
        accounts.push(account);
    }

    vault.save_accounts(&accounts)?;
    drop(vault);

    let _ = refresh_usage(state.clone()).await;

    let vault = state.vault.lock().await;
    Ok(vault.load_accounts())
}

#[tauri::command]
pub async fn delete_account(
    id: String,
    state: State<'_, AppState>,
) -> Result<Vec<AccountConfig>, String> {
    let vault = state.vault.lock().await;
    let mut accounts = vault.load_accounts();
    accounts.retain(|a| a.id != id);
    vault.delete_secret(&id);
    vault.save_accounts(&accounts)?;
    drop(vault);

    let _ = refresh_usage(state.clone()).await;

    let vault = state.vault.lock().await;
    Ok(vault.load_accounts())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let vault = state.vault.lock().await;
    Ok(vault.load_settings())
}

#[tauri::command]
pub async fn save_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let vault = state.vault.lock().await;
    vault.save_settings(&settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn detect_local_cli() -> Result<Vec<DetectedCliAccount>, String> {
    Ok(AdapterRegistry::scan_all_local_credentials())
}

#[tauri::command]
pub async fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let res = std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn();
        if res.is_err() {
            let _ = std::process::Command::new("powershell")
                .args(["-Command", &format!("Start-Process '{}'", url)])
                .spawn();
        }
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
