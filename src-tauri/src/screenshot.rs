use device_query::{DeviceQuery, DeviceState, MouseState};
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::codecs::webp::WebPEncoder;
use std::sync::Mutex;
use tauri::command;
use tauri::ipc::Response;
use windows::Win32::UI::WindowsAndMessaging::{HWND_BOTTOM, HWND_TOP, WS_EX_TRANSPARENT};
use xcap::{Monitor, Window};

use crate::os::ui_automation::UIElements;
use crate::os::{ElementInfo, ElementRect};

#[command]
pub async fn capture_current_monitor(encoder: String) -> Response {
    // 获取当前鼠标的位置
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();
    let (mouse_x, mouse_y) = mouse.coords;

    // 获取当前鼠标所在屏幕的截图图像
    let monitor = Monitor::from_point(mouse_x, mouse_y).unwrap();

    let image_buffer = monitor.capture_image().unwrap();

    // 前端处理渲染图片的方式有两种
    // 1. 接受 RGBA 数据通过 canvas 转为 base64 后显示
    // 2. 直接接受 png、jpg 文件格式的二进制数据
    // 所以无需将原始的 RGBA 数据返回给前端，直接在 rust 编码为指定格式返回前端
    // 前端也无需再转为 base64 显示

    // 编码为指定格式
    let mut buf = Vec::new();

    if encoder == "webp" {
        image_buffer
            .write_with_encoder(WebPEncoder::new_lossless(&mut buf))
            .unwrap();
    } else {
        image_buffer
            .write_with_encoder(PngEncoder::new_with_quality(
                &mut buf,
                CompressionType::Fast,
                FilterType::Adaptive,
            ))
            .unwrap();
    }

    // 将屏幕信息也推送到前端
    let monitor_x_bytes = monitor.x().unwrap_or(0).to_le_bytes();
    let monitor_y_bytes = monitor.y().unwrap_or(0).to_le_bytes();
    let monitor_width_bytes = monitor.width().unwrap_or(0).to_le_bytes();
    let monitor_height_bytes = monitor.height().unwrap_or(0).to_le_bytes();
    let monitor_scale_factor_bytes = monitor.scale_factor().unwrap_or(0.0).to_le_bytes();

    buf.push(monitor_x_bytes[0]);
    buf.push(monitor_x_bytes[1]);
    buf.push(monitor_x_bytes[2]);
    buf.push(monitor_x_bytes[3]);

    buf.push(monitor_y_bytes[0]);
    buf.push(monitor_y_bytes[1]);
    buf.push(monitor_y_bytes[2]);
    buf.push(monitor_y_bytes[3]);

    buf.push(monitor_width_bytes[0]);
    buf.push(monitor_width_bytes[1]);
    buf.push(monitor_width_bytes[2]);
    buf.push(monitor_width_bytes[3]);

    buf.push(monitor_height_bytes[0]);
    buf.push(monitor_height_bytes[1]);
    buf.push(monitor_height_bytes[2]);
    buf.push(monitor_height_bytes[3]);

    buf.push(monitor_scale_factor_bytes[0]);
    buf.push(monitor_scale_factor_bytes[1]);
    buf.push(monitor_scale_factor_bytes[2]);
    buf.push(monitor_scale_factor_bytes[3]);

    return Response::new(buf);
}

#[command]
pub async fn remove_draw_window_elements(window: tauri::Window) -> Result<(), ()> {
    let hwnd = match window.hwnd() {
        Ok(hwnd) => hwnd,
        Err(_) => return Ok(()),
    };

    #[cfg(target_os = "windows")]
    {
        unsafe {
            windows::Win32::UI::WindowsAndMessaging::SetWindowDisplayAffinity(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::WDA_EXCLUDEFROMCAPTURE,
            )
            .unwrap();

            windows::Win32::UI::WindowsAndMessaging::SetWindowLongPtrA(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWL_EXSTYLE,
                524456 as isize | WS_EX_TRANSPARENT.0 as isize,
            );
            windows::Win32::UI::WindowsAndMessaging::SetWindowLongPtrA(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWL_STYLE,
                2516582400,
            );

            let current_ex_style = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrA(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWL_EXSTYLE,
            );
            let current_style = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrA(
                hwnd,
                windows::Win32::UI::WindowsAndMessaging::GWL_STYLE,
            );

            println!("current_ex_style: {:X}", current_ex_style);
            println!("current_style: {:X}", current_style);
        }
    }

    Ok(())
}

#[command]
pub async fn init_ui_elements(ui_elements: tauri::State<'_, Mutex<UIElements>>) -> Result<(), ()> {
    let mut ui_elements = match ui_elements.lock() {
        Ok(ui_elements) => ui_elements,
        Err(_) => return Err(()),
    };

    match ui_elements.init() {
        Ok(_) => Ok(()),
        Err(_) => Err(()),
    }
}

#[command]
pub async fn get_element_info() -> Result<ElementInfo, ()> {
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();
    let (mouse_x, mouse_y) = mouse.coords;

    let monitor = xcap::Monitor::from_point(mouse_x, mouse_y).unwrap();
    let monitor_min_x = monitor.x().unwrap_or(0);
    let monitor_min_y = monitor.y().unwrap_or(0);
    let monitor_max_x = monitor_min_x + monitor.width().unwrap_or(0) as i32;
    let monitor_max_y = monitor_min_y + monitor.height().unwrap_or(0) as i32;

    // 获取所有窗口，简单筛选下需要的窗口，然后获取窗口所有元素
    let mut windows = Window::all().unwrap_or_default();
    // 获取窗口是，是从最顶层的窗口依次遍历，这里反转下便于后续查找
    windows.reverse();

    let mut rect_list = Vec::new();
    for window in windows {
        if window.is_minimized().unwrap_or(true) {
            continue;
        }

        let x = match window.x() {
            Ok(x) => x,
            Err(_) => continue,
        };

        let y = match window.y() {
            Ok(y) => y,
            Err(_) => continue,
        };

        let width = match window.width() {
            Ok(width) => width,
            Err(_) => continue,
        };
        let height = match window.height() {
            Ok(height) => height,
            Err(_) => continue,
        };

        // 保留在屏幕内的窗口
        if !(x >= monitor_min_x && y >= monitor_min_y && x <= monitor_max_x && y <= monitor_max_y) {
            continue;
        }

        rect_list.push(ElementRect {
            min_x: x,
            min_y: y,
            max_x: x + width as i32,
            max_y: y + height as i32,
        });
    }

    Ok(ElementInfo {
        scale_factor: monitor.scale_factor().unwrap_or(1.0),
        rect_list,
    })
}

#[command]
pub async fn get_element_from_position(
    window: tauri::Window,
    ui_elements: tauri::State<'_, Mutex<UIElements>>,
    mouse_x: i32,
    mouse_y: i32,
) -> Result<Option<ElementRect>, ()> {
    let hwnd = match window.hwnd() {
        Ok(hwnd) => hwnd,
        Err(_) => return Err(()),
    };

    let ui_elements = ui_elements.lock().unwrap();
    // 移动窗口到屏幕外

    let flag = windows::Win32::UI::WindowsAndMessaging::SWP_NOSIZE
        | windows::Win32::UI::WindowsAndMessaging::SWP_NOMOVE;
    unsafe {
        windows::Win32::UI::WindowsAndMessaging::SetWindowPos(
            hwnd,
            Some(HWND_BOTTOM),
            0,
            0,
            0,
            0,
            flag,
        );
    }
    let element_rect = match ui_elements.get_element_from_point(mouse_x, mouse_y) {
        Ok(element_rect) => element_rect,
        Err(_) => {
            // 恢复窗口位置
            unsafe {
                windows::Win32::UI::WindowsAndMessaging::SetWindowPos(
                    hwnd,
                    Some(HWND_TOP),
                    0,
                    0,
                    0,
                    0,
                    flag,
                );
            }
            return Err(());
        }
    };

    // 恢复窗口位置
    unsafe {
        windows::Win32::UI::WindowsAndMessaging::SetWindowPos(hwnd, Some(hwnd), 0, 0, 0, 0, flag);
    }

    Ok(element_rect)
}
