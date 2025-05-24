use enigo::{Axis, Enigo, Mouse};
use std::{env, sync::Mutex, thread::sleep, time::Duration};
use tauri::command;

#[command]
pub async fn exit_app(window: tauri::Window, handle: tauri::AppHandle) {
    window.hide().unwrap();
    handle.exit(0);
}

#[command]
pub async fn get_selected_text() -> String {
    let text = match get_selected_text::get_selected_text() {
        Ok(text) => text,
        Err(_) => {
            return String::new();
        }
    };
    text
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

#[command]
pub async fn set_enable_proxy(enable: bool, host: String) -> Result<(), ()> {
    unsafe {
        if enable {
            std::env::set_var("NO_PROXY", "");
        } else {
            std::env::set_var("NO_PROXY", host);
        }
    }
    Ok(())
}

/// 鼠标滚轮穿透
#[command]
pub async fn scroll_through(
    window: tauri::Window,
    enigo: tauri::State<'_, Mutex<Enigo>>,
    length: i32,
) -> Result<(), ()> {
    let result = window.set_ignore_cursor_events(true);
    if result.is_err() {
        return Ok(());
    }

    sleep(Duration::from_millis(1));

    if let Ok(mut enigo) = enigo.lock() {
        enigo.scroll(length, Axis::Vertical).unwrap();

        // 让用户的鼠标也能触发滚轮事件
        sleep(Duration::from_millis(128));
        match window.set_ignore_cursor_events(false) {
            Ok(_) => (),
            Err(_) => (),
        }
    }

    Ok(())
}

/// 鼠标滚轮穿透
#[command]
pub async fn click_through(window: tauri::Window) -> Result<(), ()> {
    let result = window.set_ignore_cursor_events(true);
    if result.is_err() {
        return Ok(());
    }

    sleep(Duration::from_millis(128));
    match window.set_ignore_cursor_events(false) {
        Ok(_) => (),
        Err(_) => (),
    }

    Ok(())
}
