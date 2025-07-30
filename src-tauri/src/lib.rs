pub mod core;
pub mod file;
pub mod ocr;
pub mod screenshot;
pub mod scroll_screenshot;
pub mod video_record;

use tokio::sync::Mutex;

use enigo::{Enigo, Settings};
use ocr::OcrLiteWrap;
use paddle_ocr_rs::ocr_lite::OcrLite;
use snow_shot_app_os::ui_automation::UIElements;
use snow_shot_app_services::free_drag_window_service;
use snow_shot_app_services::scroll_screenshot_image_service;
use snow_shot_app_services::scroll_screenshot_service;
use snow_shot_app_services::video_record_service;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ocr_instance = OcrLiteWrap {
        ocr_instance: Some(OcrLite::new()),
    };
    let ocr_instance = Mutex::new(ocr_instance);
    let video_record_service = Mutex::new(video_record_service::VideoRecordService::new());

    let enigo_instance = Enigo::new(&Settings::default()).unwrap();
    let enigo_instance = Mutex::new(enigo_instance);

    let ui_elements = Mutex::new(UIElements::new());
    let auto_start_hide_window = Mutex::new(false);

    let scroll_screenshot_service =
        Mutex::new(scroll_screenshot_service::ScrollScreenshotService::new());
    let scroll_screenshot_image_service =
        Mutex::new(scroll_screenshot_image_service::ScrollScreenshotImageService::new());

    let free_drag_window_service =
        Mutex::new(free_drag_window_service::FreeDragWindowService::new());

    let mut app_builder = tauri::Builder::default().plugin(tauri_plugin_os::init());

    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let app_window = app.get_webview_window("main").expect("no main window");
            app_window.unminimize().unwrap();
            app_window.set_focus().unwrap();
            app_window.show().unwrap();
        }));
    }

    #[cfg(target_os = "macos")]
    {
        app_builder = app_builder.plugin(tauri_nspanel::init());
    }

    app_builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--auto_start"]),
        ))
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
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
        .manage(enigo_instance)
        .manage(scroll_screenshot_service)
        .manage(video_record_service)
        .manage(scroll_screenshot_image_service)
        .manage(free_drag_window_service)
        .invoke_handler(tauri::generate_handler![
            screenshot::capture_current_monitor,
            screenshot::capture_focused_window,
            screenshot::get_window_elements,
            screenshot::init_ui_elements,
            screenshot::get_element_from_position,
            screenshot::init_ui_elements_cache,
            screenshot::get_mouse_position,
            screenshot::create_draw_window,
            screenshot::switch_always_on_top,
            screenshot::set_draw_window_style,
            screenshot::recovery_window_z_order,
            core::exit_app,
            core::start_free_drag,
            file::save_file,
            file::create_dir,
            ocr::ocr_detect,
            ocr::ocr_init,
            ocr::ocr_release,
            core::auto_start_hide_window,
            core::get_selected_text,
            core::set_enable_proxy,
            core::scroll_through,
            core::click_through,
            core::create_fixed_content_window,
            core::read_image_from_clipboard,
            core::create_full_screen_draw_window,
            core::get_current_monitor_info,
            core::send_new_version_notification,
            core::create_video_record_window,
            core::set_always_on_top,
            scroll_screenshot::scroll_screenshot_get_image_data,
            scroll_screenshot::scroll_screenshot_init,
            scroll_screenshot::scroll_screenshot_capture,
            scroll_screenshot::scroll_screenshot_handle_image,
            scroll_screenshot::scroll_screenshot_save_to_file,
            scroll_screenshot::scroll_screenshot_save_to_clipboard,
            scroll_screenshot::scroll_screenshot_get_size,
            scroll_screenshot::scroll_screenshot_clear,
            video_record::video_record_start,
            video_record::video_record_stop,
            video_record::video_record_pause,
            video_record::video_record_resume,
            video_record::video_record_kill,
            video_record::video_record_get_microphone_device_names,
            video_record::video_record_init,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
