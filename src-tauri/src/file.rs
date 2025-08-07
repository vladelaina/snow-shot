use tauri::command;

#[command]
pub async fn save_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    snow_shot_tauri_commands_file::save_file(request).await
}

#[command]
pub async fn create_dir(dir_path: String) -> Result<(), ()> {
    snow_shot_tauri_commands_file::create_dir(dir_path).await
}
