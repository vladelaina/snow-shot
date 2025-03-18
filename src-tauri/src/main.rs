// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_error;
mod app_log;
mod ocr;
mod os;
mod screenshot;

fn main() {
    app_lib::run();
}

#[cfg(test)]
mod test {
    use device_query::{DeviceQuery, DeviceState, MouseState};
    use xcap::Window;

    pub struct ElementRect {
        min_x: i32,
        min_y: i32,
        max_x: i32,
        max_y: i32,
    }
}
