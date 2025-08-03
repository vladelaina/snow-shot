use tauri::command;
use tokio::sync::Mutex;

use snow_shot_tauri_commands_ocr::{OcrDetectResult, OcrLiteWrap, OcrModel};

#[command]
pub async fn ocr_init(
    app: tauri::AppHandle,
    ocr_instance: tauri::State<'_, Mutex<OcrLiteWrap>>,
    model: OcrModel,
) -> Result<(), ()> {
    snow_shot_tauri_commands_ocr::ocr_init(app, ocr_instance, model).await
}

#[command]
pub async fn ocr_detect(
    ocr_instance: tauri::State<'_, Mutex<OcrLiteWrap>>,
    request: tauri::ipc::Request<'_>,
) -> Result<OcrDetectResult, ()> {
    snow_shot_tauri_commands_ocr::ocr_detect(ocr_instance, request).await
}

#[command]
pub async fn ocr_release(ocr_instance: tauri::State<'_, Mutex<OcrLiteWrap>>) -> Result<(), ()> {
    snow_shot_tauri_commands_ocr::ocr_release(ocr_instance).await
}
