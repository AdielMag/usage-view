use std::path::PathBuf;
use crate::models::{AccountNotificationState, AccountUsageReport, AppSettings, LimitStatus};

pub const APP_ID: &str = "com.usageview.desktop";
pub const APP_NAME: &str = "Usage View";

#[derive(Debug, PartialEq, Clone)]
pub enum NotificationAction {
    None,
    QuotaRefreshed {
        account_name: String,
        limit_name: String,
    },
}

pub struct Notifier;

impl Notifier {
    /// Initialize desktop notification identity (registers AUMID & App Icon on Windows).
    pub fn init() {
        #[cfg(windows)]
        {
            Self::setup_windows_identity();
        }
    }

    #[cfg(windows)]
    fn setup_windows_identity() {
        use std::ffi::OsStr;
        use std::fs;
        use std::os::windows::ffi::OsStrExt;
        use std::os::windows::process::CommandExt;

        // 1. Explicitly set process AppUserModelID
        let wide_id: Vec<u16> = OsStr::new(APP_ID)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        #[link(name = "shell32")]
        extern "system" {
            fn SetCurrentProcessExplicitAppUserModelID(AppID: *const u16) -> i32;
        }

        unsafe {
            let _ = SetCurrentProcessExplicitAppUserModelID(wide_id.as_ptr());
        }

        // 2. Persist icon to AppData for Windows Toast Notification Manager
        let local_appdata = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("C:\\ProgramData"));
        let icon_dir = local_appdata.join("UsageView");
        let _ = fs::create_dir_all(&icon_dir);
        let icon_path = icon_dir.join("app-icon.png");

        let icon_bytes = include_bytes!("../icons/128x128@2x.png");
        let _ = fs::write(&icon_path, icon_bytes);

        // 3. Register AUMID in Windows Registry HKCU\Software\Classes\AppUserModelId\com.usageview.desktop
        let reg_key_path = format!("Software\\Classes\\AppUserModelId\\{}", APP_ID);
        let icon_str = icon_path.to_string_lossy().to_string();

        let _ = std::process::Command::new("reg")
            .args([
                "add",
                &format!("HKCU\\{}", reg_key_path),
                "/v",
                "DisplayName",
                "/t",
                "REG_SZ",
                "/d",
                APP_NAME,
                "/f",
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();

        let _ = std::process::Command::new("reg")
            .args([
                "add",
                &format!("HKCU\\{}", reg_key_path),
                "/v",
                "IconUri",
                "/t",
                "REG_SZ",
                "/d",
                &icon_str,
                "/f",
            ])
            .creation_flags(0x08000000)
            .output();

        let _ = std::process::Command::new("reg")
            .args([
                "add",
                &format!("HKCU\\{}", reg_key_path),
                "/v",
                "ShowInSettings",
                "/t",
                "REG_DWORD",
                "/d",
                "1",
                "/f",
            ])
            .creation_flags(0x08000000)
            .output();
    }

    #[cfg(not(windows))]
    fn setup_windows_identity() {}

    /// Evaluates whether a quota refreshed notification should be triggered for an account report.
    /// Triggers EXACTLY ONCE when quota resets back to 100% / Normal capacity.
    /// NEVER triggers percentage warnings or duplicate notifications on subsequent polls.
    pub fn evaluate_notification_action(
        report: &AccountUsageReport,
        state: &mut AccountNotificationState,
        settings: &AppSettings,
        now: i64,
    ) -> NotificationAction {
        let limit = &report.primary_limit;

        let is_currently_depleted = limit.status == LimitStatus::Exhausted
            || limit.status == LimitStatus::Warning
            || limit.percentage < 70.0;

        let is_currently_restored = (limit.status == LimitStatus::Normal || limit.percentage >= 80.0)
            && !is_currently_depleted;

        let mut action = NotificationAction::None;

        // Check Quota Reset (transition from depleted -> restored)
        if settings.notify_on_reset && is_currently_restored && state.was_depleted {
            let is_new_epoch = match (state.last_notified_reset_epoch, limit.resets_at) {
                (Some(last), Some(curr)) => curr > last || (now - state.last_reset_notified_at.unwrap_or(0) > 300),
                _ => state.last_reset_notified_at.map_or(true, |t| now - t > 300),
            };

            if is_new_epoch {
                state.last_notified_reset_epoch = limit.resets_at;
                state.last_reset_notified_at = Some(now);
                state.was_depleted = false;

                action = NotificationAction::QuotaRefreshed {
                    account_name: report.account_name.clone(),
                    limit_name: limit.name.clone(),
                };
            }
        }

        // Track depletion state without sending any percentage warnings
        if is_currently_depleted {
            state.was_depleted = true;
        } else if is_currently_restored && !state.was_depleted {
            state.last_notified_reset_epoch = limit.resets_at;
        }

        state.last_remaining_pct = limit.percentage;
        state.last_status = limit.status.clone();

        action
    }

    /// Evaluates all reports and sends notifications if needed using the shared notification state.
    pub async fn process_and_notify_reports(
        reports: &[AccountUsageReport],
        state: &crate::commands::AppState,
        settings: &AppSettings,
    ) {
        if !settings.notify_on_reset {
            return;
        }

        let now = chrono::Utc::now().timestamp();
        let mut notif_guard = state.notif_state.lock().await;

        for report in reports {
            let is_depleted = report.primary_limit.status == LimitStatus::Exhausted
                || report.primary_limit.status == LimitStatus::Warning
                || report.primary_limit.percentage < 70.0;

            let entry = notif_guard.entry(report.account_id.clone()).or_insert_with(|| {
                AccountNotificationState {
                    last_remaining_pct: report.primary_limit.percentage,
                    last_status: report.primary_limit.status.clone(),
                    last_notified_reset_epoch: report.primary_limit.resets_at,
                    was_depleted: is_depleted,
                    last_reset_notified_at: None,
                }
            });

            let action = Self::evaluate_notification_action(report, entry, settings, now);
            if let NotificationAction::QuotaRefreshed { account_name, limit_name } = action {
                Self::send_quota_refreshed(&account_name, &limit_name);
            }
        }
    }

    /// Send a clean, branded Quota Refreshed notification
    pub fn send_quota_refreshed(account_name: &str, limit_name: &str) {
        let clean_name = limit_name.trim_end_matches(" Left").trim_end_matches(" left");
        let title = format!("Quota Refreshed • {}", account_name);
        let body = format!("Your {} has reset to 100% capacity. Ready to code!", clean_name);

        Self::send(&title, &body);
    }

    /// Internal dispatch to native OS notification system (pure app-branded, never powershell)
    pub fn send(title: &str, body: &str) {
        let title = title.to_string();
        let body = body.to_string();

        tauri::async_runtime::spawn(async move {
            #[cfg(windows)]
            {
                let mut notif = notify_rust::Notification::new();
                notif.app_id(APP_ID)
                    .summary(&title)
                    .body(&body)
                    .sound_name("Notification.Default");

                let _ = notif.show();
            }

            #[cfg(target_os = "macos")]
            {
                let _ = notify_rust::set_application(APP_ID);
                let _ = notify_rust::Notification::new()
                    .summary(&title)
                    .body(&body)
                    .show();
            }

            #[cfg(not(any(windows, target_os = "macos")))]
            {
                let _ = notify_rust::Notification::new()
                    .summary(&title)
                    .body(&body)
                    .show();
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProviderType, SessionLimit};

    fn make_mock_report(pct: f64, status: LimitStatus, resets_at: Option<i64>) -> AccountUsageReport {
        AccountUsageReport {
            account_id: "test-claude".into(),
            account_name: "Claude Pro".into(),
            provider_type: ProviderType::ClaudeWeb,
            is_connected: true,
            last_updated: 1000,
            primary_limit: SessionLimit {
                name: "5-Hour Session Quota".into(),
                used: pct,
                total: 100.0,
                percentage: pct,
                unit: "% left".into(),
                resets_at,
                reset_in_seconds: resets_at.map(|r| r - 1000),
                status,
            },
            secondary_limits: vec![],
            models: vec![],
            error_message: None,
            tier_name: Some("Claude Pro".into()),
        }
    }

    #[test]
    fn test_windows_identity_registration() {
        Notifier::init();
        let local_appdata = dirs::data_local_dir().unwrap();
        let icon_path = local_appdata.join("UsageView").join("app-icon.png");
        assert!(icon_path.exists(), "Icon file should exist in AppData/Local/UsageView");
    }

    #[test]
    fn test_initial_full_quota_does_not_notify() {
        let settings = AppSettings::default();
        let report = make_mock_report(100.0, LimitStatus::Normal, Some(5000));
        let mut state = AccountNotificationState {
            last_remaining_pct: 100.0,
            last_status: LimitStatus::Normal,
            last_notified_reset_epoch: Some(5000),
            was_depleted: false,
            last_reset_notified_at: None,
        };

        let action = Notifier::evaluate_notification_action(&report, &mut state, &settings, 1000);
        assert_eq!(action, NotificationAction::None);

        // Next poll still 100%
        let action2 = Notifier::evaluate_notification_action(&report, &mut state, &settings, 1180);
        assert_eq!(action2, NotificationAction::None);
    }

    #[test]
    fn test_low_quota_does_not_fire_percentage_warning() {
        let settings = AppSettings::default();
        let mut state = AccountNotificationState {
            last_remaining_pct: 100.0,
            last_status: LimitStatus::Normal,
            last_notified_reset_epoch: Some(5000),
            was_depleted: false,
            last_reset_notified_at: None,
        };

        // Quota drops to 15%
        let low_report = make_mock_report(15.0, LimitStatus::Warning, Some(5000));
        let action1 = Notifier::evaluate_notification_action(&low_report, &mut state, &settings, 2000);
        assert_eq!(action1, NotificationAction::None, "Should NEVER send percentage warnings");
        assert!(state.was_depleted, "State should be marked as depleted");
    }

    #[test]
    fn test_reset_notification_fires_once_and_does_not_repeat() {
        let settings = AppSettings::default();
        let mut state = AccountNotificationState {
            last_remaining_pct: 0.0,
            last_status: LimitStatus::Exhausted,
            last_notified_reset_epoch: Some(5000),
            was_depleted: true,
            last_reset_notified_at: None,
        };

        // Quota resets to 100% with new epoch 10000
        let restored_report = make_mock_report(100.0, LimitStatus::Normal, Some(10000));
        let action1 = Notifier::evaluate_notification_action(&restored_report, &mut state, &settings, 5001);
        assert!(matches!(action1, NotificationAction::QuotaRefreshed { .. }), "Should fire reset notification when refreshed");

        // Subsequent poll 1 (still 100%)
        let action2 = Notifier::evaluate_notification_action(&restored_report, &mut state, &settings, 5181);
        assert_eq!(action2, NotificationAction::None, "Must NOT repeat reset notification on subsequent polls!");

        // Subsequent poll 2 (still 100%)
        let action3 = Notifier::evaluate_notification_action(&restored_report, &mut state, &settings, 5361);
        assert_eq!(action3, NotificationAction::None, "Must NOT repeat reset notification on subsequent polls!");
    }
}
