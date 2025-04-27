use std::{io::Cursor, sync::Mutex};

use paddle_ocr_rs::ocr_lite::OcrLite;
use tauri::{Manager, command, path::BaseDirectory};

#[command]
pub async fn ocr_init(
    app: tauri::AppHandle,
    ocr_instance: tauri::State<'_, Mutex<OcrLite>>,
) -> Result<(), ()> {
    let mut ocr_instance = match ocr_instance.lock() {
        Ok(ocr_instance) => ocr_instance,
        Err(_) => return Err(()),
    };

    let resource_path = match app.path().resolve("models", BaseDirectory::Resource) {
        Ok(resource_path) => resource_path,
        Err(_) => return Err(()),
    };

    ocr_instance
        .init_models(
            &resource_path
                .join("ch_PP-OCRv4_det_infer.onnx")
                .display()
                .to_string(),
            &resource_path
                .join("ch_ppocr_mobile_v2.0_cls_infer.onnx")
                .display()
                .to_string(),
            &resource_path
                .join("ch_PP-OCRv4_rec_infer.onnx")
                .display()
                .to_string(),
            &resource_path
                .join("ppocr_keys_v1.txt")
                .display()
                .to_string(),
            2,
        )
        .unwrap();

    Ok(())
}

#[command]
pub async fn ocr_detect(
    ocr_instance: tauri::State<'_, Mutex<OcrLite>>,
    request: tauri::ipc::Request<'_>,
) -> Result<String, ()> {
    let ocr_instance = match ocr_instance.lock() {
        Ok(ocr_instance) => ocr_instance,
        Err(_) => return Err(()),
    };

    let image_data = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data,
        _ => return Err(()),
    };

    let image = match image::load(Cursor::new(image_data), image::ImageFormat::Jpeg) {
        Ok(image) => image,
        Err(_) => return Err(()),
    };

    let image_buffer = image.to_rgb8();
    let ocr_result = ocr_instance.detect(
        &image_buffer,
        50,
        image.height().max(image.width()),
        0.5,
        0.3,
        1.6,
        true,
        false,
    );

    match ocr_result {
        Ok(ocr_result) => Ok(serde_json::to_string(&ocr_result).unwrap()),
        Err(_) => return Err(()),
    }
}
