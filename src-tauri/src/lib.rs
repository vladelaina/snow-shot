mod app_error;
mod app_log;
mod os;
mod screenshot;

use std::sync::Mutex;

use os::ui_automation::UIAutomation;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ui_automation = Mutex::new(UIAutomation::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .targets([
                            Target::new(TargetKind::Stdout),
                            Target::new(TargetKind::LogDir { file_name: None }),
                            Target::new(TargetKind::Webview),
                        ])
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(ui_automation)
        .invoke_handler(tauri::generate_handler![
            screenshot::capture_current_monitor,
            screenshot::get_element_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
