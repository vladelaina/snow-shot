use base64::prelude::*;
use std::fs;

use tauri::command;

#[command]
pub fn save_file(request: tauri::ipc::Request<'_>) -> bool {
    let raw_data = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data,
        _ => return false,
    };

    let file_path: String = match request.headers().get("x-file-path") {
        Some(header) => match BASE64_STANDARD.decode(header.to_str().unwrap()) {
            Ok(file_path) => String::from_utf8(file_path).unwrap(),
            Err(_) => return false,
        },
        None => return false,
    };

    match fs::write(file_path, raw_data) {
        Ok(_) => true,
        Err(_) => false,
    }
}
