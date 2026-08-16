use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use crate::adapters::AdapterRegistry;
use crate::commands::AppState;
use crate::models::AccountUsageReport;
use crate::notifier::Notifier;

pub struct PollerService;

impl PollerService {
    pub fn start(app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            loop {
                let state_option = app.try_state::<AppState>();
                if let Some(state) = state_option {
                    let vault_guard = state.vault.lock().await;
                    let accounts = vault_guard.load_accounts();
                    let settings = vault_guard.load_settings();
                    drop(vault_guard);

                    let mut updated_reports = Vec::new();
                    for acc in accounts.iter().filter(|a| a.enabled) {
                        let report = AdapterRegistry::fetch_usage_for_account(acc).await;
                        updated_reports.push(report);
                    }

                    // Update cached reports
                    *state.cached_reports.lock().await = updated_reports.clone();

                    // Evaluate and dispatch notifications using unified state
                    Notifier::process_and_notify_reports(&updated_reports, &state, &settings).await;

                    // Emit event to frontend
                    let _ = app.emit("usage-updated", &updated_reports);

                    // Update tray tooltip with primary account percentages
                    Self::update_tray_tooltip(&app, &updated_reports);

                    let sleep_mins = settings.poll_interval_minutes.max(1);
                    tokio::time::sleep(Duration::from_secs(sleep_mins as u64 * 60)).await;
                } else {
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        });
    }

    fn update_tray_tooltip(app: &AppHandle, reports: &[AccountUsageReport]) {
        if reports.is_empty() {
            if let Some(tray) = app.tray_by_id("main-tray") {
                let _ = tray.set_tooltip(Some("Usage View (No Accounts Connected)"));
            }
            return;
        }

        let summary = reports
            .iter()
            .map(|r| format!("{}: {:.0}%", r.account_name, r.primary_limit.percentage))
            .collect::<Vec<_>>()
            .join(" | ");

        let tooltip_text = format!("Usage View • {}", summary);
        if let Some(tray) = app.tray_by_id("main-tray") {
            let _ = tray.set_tooltip(Some(&tooltip_text));
        }
    }
}
