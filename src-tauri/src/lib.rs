mod app_error;
mod app_log;
mod core;
mod file;
mod os;
mod screenshot;
mod ocr;
use std::sync::Mutex;

use os::ui_automation::UIElements;
use tauri_plugin_log::{Target, TargetKind};
use paddle_ocr_rs::ocr_lite::OcrLite;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    let mut ocr_instance = OcrLite::new();
    ocr_instance.init_models(
        "./models/ch_PP-OCRv4_det_infer.onnx",
        "./models/ch_ppocr_mobile_v2.0_cls_infer.onnx",
        "./models/ch_PP-OCRv4_rec_infer.onnx",
        "./models/ppocr_keys_v1.txt",
        2,
    ).unwrap();
    let ocr_instance = Mutex::new(ocr_instance);

    let ui_elements = Mutex::new(UIElements::new());

    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
