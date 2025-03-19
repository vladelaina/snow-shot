use tauri::command;

#[command]
pub async fn exit_app(handle: tauri::AppHandle) {
    handle.exit(0);
}
