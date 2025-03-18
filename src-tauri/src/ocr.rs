use std::path::PathBuf;

use tauri::command;

#[command]
pub fn append_chunk_to_file(request: tauri::ipc::Request<'_>) -> Option<String> {
    if let tauri::ipc::InvokeBody::Raw(data) = request.body() {
    } else {
        todo!()
    }

    None
}
