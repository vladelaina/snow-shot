mod app_error;
mod app_log;
mod core;
mod file;
mod ocr;
mod os;
mod screenshot;
use std::sync::Mutex;

use ocr::OcrLiteWrap;
use os::ui_automation::UIElements;
use paddle_ocr_rs::ocr_lite::OcrLite;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ocr_instance = OcrLiteWrap {
        ocr_instance: Some(OcrLite::new()),
    };
    let ocr_instance = Mutex::new(ocr_instance);

    let ui_elements = Mutex::new(UIElements::new());
    let auto_start_hide_window = Mutex::new(false);

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--auto_start"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
        .manage(ui_elements)
        .manage(ocr_instance)
        .manage(auto_start_hide_window)
        .invoke_handler(tauri::generate_handler![
            screenshot::capture_current_monitor,
            screenshot::get_window_elements,
            screenshot::init_ui_elements,
            screenshot::get_element_from_position,
            screenshot::init_ui_elements_cache,
            screenshot::get_mouse_position,
            screenshot::create_draw_window,
            core::exit_app,
            file::save_file,
            ocr::ocr_detect,
            ocr::ocr_init,
            ocr::ocr_release,
            core::auto_start_hide_window,
            core::get_selected_text,
            core::set_enable_proxy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
