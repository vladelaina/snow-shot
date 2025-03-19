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

unsafe extern "system" fn enum_window_proc(hwnd: HWND, _: LPARAM) -> BOOL {
    let mut title = [0u16; 512];
    let title_len = GetWindowTextW(hwnd, &mut title);
    if title_len > 0 {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);

        let title_str = String::from_utf16_lossy(&title[..title_len as usize]);

        let mut count = 0;
        if title_str.contains("N") {
            count += 1;

            if count != 1 {
                return BOOL(1);
            }

            let automation = UIAutomation::new().unwrap();
            let element = automation.element_from_handle(Handle::from(hwnd)).unwrap();
            let rect = element.get_bounding_rectangle();

            println!("element title: {:?}", element.get_name().unwrap());
            println!("element rect: {:?}", rect);
            println!(
                "element subcount: {:?}",
                element.find_all(
                    TreeScope::Descendants,
                    &automation.create_true_condition().unwrap()
                )
            );

            if ex_style > 0 {
                println!("窗口标题: {}", title_str);
                println!("窗口样式: {}", style);
                println!("扩展样式: {}", ex_style);
            }

            println!("正在关闭窗口: {}", title_str);
            unsafe {
                match PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)) {
                    Ok(_) => println!("已发送关闭消息"),
                    Err(e) => println!("发送关闭消息失败: {}", e),
                }
            }

            println!("------------------------");
        }
    }
    BOOL(1)
}

fn set_window_transparent_for_automation(hwnd: HWND) -> Result<()> {
    unsafe {
        SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)?;
    }
    Ok(())
}

fn main() {
    // app_lib::run();

    // return;
    let device_state = DeviceEventsHandler::new(Duration::from_millis(1000 / 60))
        .expect("Failed to start event loop");

    // Register a key down event callback
    // The guard is used to keep the callback alive

    let mut ui_elements = os::ui_automation::UIElements::new();
    ui_elements.init().unwrap();
    let _guard = device_state.on_mouse_move(move |position| {
        let (mouse_x, mouse_y) = position;

        let rect = match ui_elements.get_element_from_point_walker(*mouse_x, *mouse_y) {
            Ok(rect) => rect,
            Err(_) => return,
        };

        println!(
            "element: left {}, top {}, width {}, height {}",
            rect.min_x,
            rect.min_y,
            rect.max_x - rect.min_x,
            rect.max_y - rect.min_y
        );
    });

    loop {}
}
