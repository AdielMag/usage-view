pub mod adapters;
pub mod commands;
pub mod models;
pub mod notifier;
pub mod poller;
pub mod tray;
pub mod vault;

use std::sync::Arc;
use tauri::{Manager, WindowEvent};
use tokio::sync::Mutex;
use crate::commands::AppState;
use crate::poller::PollerService;
use crate::vault::VaultManager;

pub fn run() {
    let _ = env_logger::try_init();

    let vault = Arc::new(Mutex::new(VaultManager::new()));
    let cached_reports = Arc::new(Mutex::new(Vec::new()));
    let notif_state = Arc::new(Mutex::new(std::collections::HashMap::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::get_all_usage,
            commands::refresh_usage,
            commands::get_accounts,
            commands::save_account,
            commands::delete_account,
            commands::get_settings,
            commands::save_settings,
            commands::detect_local_cli,
            commands::hide_window,
            commands::open_external_url,
            commands::auto_connect_local_subscriptions,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            app.manage(AppState {
                app_handle: app_handle.clone(),
                vault,
                cached_reports,
                notif_state,
            });

            // Initialize notification identity (AUMID & App Icon on Windows)
            notifier::Notifier::init();

            // Build the system tray
            if let Err(e) = tray::create_tray(&app_handle) {
                eprintln!("Failed to initialize system tray: {}", e);
            }

            // Start background usage poller
            PollerService::start(app_handle.clone());

            // Add automatic blur-to-hide listener for main window
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let _ = win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running UsageView application");
}
