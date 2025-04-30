use std::{env, sync::Mutex};

use tauri::command;

#[command]
pub async fn exit_app(handle: tauri::AppHandle) {
    handle.exit(0);
}

#[command]
pub async fn auto_start_hide_window(
    window: tauri::Window,
    auto_start_hide_window: tauri::State<'_, Mutex<bool>>,
) -> Result<(), ()> {
    let mut auto_start_hide_window = match auto_start_hide_window.lock() {
        Ok(auto_start_hide_window) => auto_start_hide_window,
        Err(_) => return Err(()),
    };

    if *auto_start_hide_window == false && env::args().any(|arg| arg == "--auto_start") {
        window.hide().unwrap();
        *auto_start_hide_window = true;
    }
    Ok(())
}
