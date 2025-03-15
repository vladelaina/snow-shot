// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_log;
mod ocr;
mod screenshot;

fn main() {
    app_lib::run();
}

#[cfg(test)]
mod test {
    use std::{thread::sleep, time::Duration};
    use crate::screenshot;

    #[test]
    fn test_get_window_from_mouse_position() {
        sleep(Duration::from_secs(3));
        let window = screenshot::get_window_from_mouse_position();
        println!("window: {:?}", window);
    }
}
