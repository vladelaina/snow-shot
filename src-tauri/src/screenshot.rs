use device_query::{DeviceQuery, DeviceState, MouseState};
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::codecs::webp::WebPEncoder;
use tauri::command;
use tauri::ipc::Response;
use xcap::Monitor;

#[command]
pub fn capture_current_monitor(encoder: String) -> Response {
    // 获取当前鼠标的位置
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();
    let (mouse_x, mouse_y) = mouse.coords;

    // 获取当前鼠标所在屏幕的截图图像
    let screen = Monitor::from_point(mouse_x, mouse_y).unwrap();

    let image_buffer = screen.capture_image().unwrap();

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

    return Response::new(buf);
}
