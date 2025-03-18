use std::sync::Mutex;

use device_query::{DeviceQuery, DeviceState, MouseState};
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::codecs::webp::WebPEncoder;
use tauri::command;
use tauri::ipc::Response;
use xcap::Monitor;

use crate::os::ui_automation::UIAutomation;
use crate::os::ElementInfo;

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
pub async fn get_element_info(
    ui_automation: tauri::State<'_, Mutex<UIAutomation>>,
) -> Result<Option<ElementInfo>, ()> {
    let ui_automation = match ui_automation.lock() {
        Ok(ui_automation) => ui_automation,
        Err(_) => return Ok(None),
    };
    let element_info = match ui_automation.get_element_info() {
        Ok(element_info) => element_info,
        Err(_) => return Ok(None),
    };

    Ok(Some(element_info))
}
