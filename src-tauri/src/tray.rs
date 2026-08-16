use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, Position as TauriPosition,
};
use tauri_plugin_positioner::{Position, WindowExt};

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItem::with_id(app, "show", "Open Usage View", true, None::<&str>)?;
    let refresh_i = MenuItem::with_id(app, "refresh", "Refresh Quotas", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Usage View", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &refresh_i, &quit_i])?;

    let _ = TrayIconBuilder::with_id("main-tray")
        .tooltip("Usage View • Claude & Antigravity")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                toggle_tray_window(app);
            }
            "refresh" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("trigger-refresh", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_tray_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn toggle_tray_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            #[cfg(target_os = "windows")]
            {
                // DPI-safe Windows bottom-left positioning above taskbar
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale = monitor.scale_factor();
                    let mon_pos = monitor.position();
                    let mon_size = monitor.size();

                    let _win_w = (380.0 * scale) as i32;
                    let win_h = (580.0 * scale) as i32;
                    let margin_x = (16.0 * scale) as i32; // Left side screen margin
                    let margin_y = (54.0 * scale) as i32; // Taskbar clearance

                    let target_x = mon_pos.x + margin_x;
                    let target_y = mon_pos.y + (mon_size.height as i32) - win_h - margin_y;

                    let _ = window.set_position(TauriPosition::Physical(PhysicalPosition::new(target_x, target_y)));
                } else {
                    let _ = window.as_ref().window().move_window(Position::BottomLeft);
                }
            }

            #[cfg(target_os = "macos")]
            {
                let _ = window.as_ref().window().move_window(Position::TrayCenter);
            }

            #[cfg(not(any(target_os = "windows", target_os = "macos")))]
            {
                let _ = window.as_ref().window().move_window(Position::BottomLeft);
            }

            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
