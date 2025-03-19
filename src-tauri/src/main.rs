// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use std::thread::sleep;
use std::time::Duration;
use uiautomation::types::{Handle, TreeScope};
use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GWL_EXSTYLE, GWL_STYLE, GetWindowLongPtrW, GetWindowTextW, PostMessageW,
    SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WM_CLOSE,
};
use windows::core::Result;
use windows::core::{BOOL, PCWSTR};

use device_query::{DeviceEvents, DeviceEventsHandler};
use uiautomation::{UIAutomation, types::Point};

mod app_error;
mod app_log;
mod ocr;
mod os;
mod screenshot;

fn main() {
    app_lib::run();

    // return;
    // let device_state = DeviceEventsHandler::new(Duration::from_millis(1000 / 60))
    //     .expect("Failed to start event loop");

    // // Register a key down event callback
    // // The guard is used to keep the callback alive

    // let mut ui_elements = os::ui_automation::UIElements::new();
    // ui_elements.init().unwrap();
    // ui_elements.init_cache().unwrap();

    // println!("init cache");

    // // let mouse_x = 300;
    // // let mouse_y = 300;

    // // let rect = match ui_elements.get_element_from_point_walker(mouse_x, mouse_y) {
    // //     Ok(rect) => rect,
    // //     Err(_) => return,
    // // };

    // // println!(
    // //     "element: left {}, top {}, width {}, height {}",
    // //     rect.min_x,
    // //     rect.min_y,
    // //     rect.max_x - rect.min_x,
    // //     rect.max_y - rect.min_y
    // // );

    // sleep(Duration::from_secs(0));
    // let ui_elements = Arc::new(Mutex::new(ui_elements));
    // let _guard = device_state.on_mouse_move(move |position| {
    //     let (mouse_x, mouse_y) = position;

    //     let mut ui_elements = ui_elements.lock().unwrap();

    //     let rect = match ui_elements.get_element_from_point_walker(*mouse_x, *mouse_y) {
    //         Ok(rect) => rect,
    //         Err(_) => return,
    //     };

    //     println!(
    //         "element: left {}, top {}, width {}, height {}",
    //         rect.min_x,
    //         rect.min_y,
    //         rect.max_x - rect.min_x,
    //         rect.max_y - rect.min_y
    //     );
    // });

    // loop {}
}
