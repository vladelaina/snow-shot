use std::fs;

use tauri::command;

#[command]
pub fn save_file(request: tauri::ipc::Request<'_>) -> bool {
    let raw_data = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data,
        _ => return false,
    };

    let file_path = match request.headers().get("x-file-path") {
        Some(header) => header.to_str().unwrap(),
        None => return false,
    };

    match fs::write(file_path, raw_data) {
        Ok(_) => true,
        Err(_) => false,
    }
}
