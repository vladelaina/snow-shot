use base64::prelude::*;
use std::{fs, io::Cursor};
use zune_core::bit_depth::BitDepth;
use zune_core::colorspace::ColorSpace;
use zune_core::options::EncoderOptions;
use zune_jpegxl::JxlSimpleEncoder;

pub async fn save_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let file_data = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data,
        _ => return Err(String::from("[save_file] Invalid request body")),
    };

    let file_path: String = match request.headers().get("x-file-path") {
        Some(header) => match BASE64_STANDARD.decode(header.to_str().unwrap()) {
            Ok(file_path) => String::from_utf8(file_path).unwrap(),
            Err(_) => return Err(String::from("[save_file] Invalid file path")),
        },
        None => return Err(String::from("[save_file] Missing file path")),
    };
    let file_type: String = match request.headers().get("x-file-type") {
        Some(header) => match BASE64_STANDARD.decode(header.to_str().unwrap()) {
            Ok(file_type) => String::from_utf8(file_type).unwrap(),
            Err(_) => return Err(String::from("[save_file] Invalid file type")),
        },
        None => return Err(String::from("[save_file] Missing file type")),
    };

    // 如果是 avif 则重写解码写入
    if file_type == "image/avif" {
        let image = match image::load(Cursor::new(file_data), image::ImageFormat::WebP) {
            Ok(image) => image,
            Err(_) => return Err(String::from("[save_file] Invalid image")),
        };

        return match image.save_with_format(file_path, image::ImageFormat::Avif) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!(
                "[save_file] Failed to save image to file: {}",
                e.to_string()
            )),
        };
    } else if file_type == "image/jpeg-xl" {
        let image = match image::load(Cursor::new(file_data), image::ImageFormat::WebP) {
            Ok(image) => image,
            Err(_) => return Err(String::from("[save_file] Invalid image")),
        };
        let image_data = image.to_rgb8();
        let encoder = JxlSimpleEncoder::new(
            image_data.as_raw(),
            EncoderOptions::new(
                image.width() as usize,
                image.height() as usize,
                ColorSpace::RGB,
                BitDepth::Eight,
            ),
        );
        let encoder_result = match encoder.encode() {
            Ok(encoder_result) => encoder_result,
            Err(_) => return Err(String::from("[save_file] Failed to encode image")),
        };
        return match fs::write(file_path, encoder_result) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!(
                "[save_file] Failed to save image to file: {}",
                e.to_string()
            )),
        };
    }

    match fs::write(file_path, file_data) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!(
            "[save_file] Failed to save image to file: {}",
            e.to_string()
        )),
    }
}

pub async fn create_dir(dir_path: String) -> Result<(), ()> {
    match std::fs::create_dir_all(dir_path) {
        Ok(_) => Ok(()),
        Err(_) => Err(()),
    }
}
