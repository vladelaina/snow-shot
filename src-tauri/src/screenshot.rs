use crate::app_utils::save_image_to_file;
use crate::os;
use crate::os::ElementRect;
use crate::os::TryGetElementByFocus;
use crate::os::ui_automation::UIElements;
use device_query::{DeviceQuery, DeviceState, MouseState};
use image::EncodableLayout;
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::codecs::webp::WebPEncoder;
use serde::Serialize;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri::command;
use tauri::ipc::Response;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::sync::Mutex;
use xcap::{Monitor, Window};

pub fn get_device_mouse_position() -> (i32, i32) {
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();

    mouse.coords
}

#[cfg(target_os = "macos")]
fn bgra_to_rgb(bgra_data: &[u8]) -> Vec<u8> {
    let pixel_count = bgra_data.len() / 4;
    let mut rgb_data = Vec::with_capacity(pixel_count * 3);

    unsafe {
        rgb_data.set_len(pixel_count * 3);

        let bgra_ptr = bgra_data.as_ptr();
        let rgb_ptr: *mut u8 = rgb_data.as_mut_ptr();

        for i in 0..pixel_count {
            let bgra_base = i * 4;
            let rgb_base = i * 3;

            *rgb_ptr.add(rgb_base) = *bgra_ptr.add(bgra_base + 2); // R
            *rgb_ptr.add(rgb_base + 1) = *bgra_ptr.add(bgra_base + 1); // G  
            *rgb_ptr.add(rgb_base + 2) = *bgra_ptr.add(bgra_base); // B
        }
    }

    rgb_data
}

pub fn get_target_monitor() -> (i32, i32, Monitor) {
    let (mut mouse_x, mut mouse_y) = get_device_mouse_position();
    let monitor = Monitor::from_point(mouse_x, mouse_y).unwrap_or_else(|_| {
        // 在 Wayland 中，获取不到鼠标位置，选用第一个显示器作为位置

        log::warn!("[get_target_monitor] No monitor found, using first monitor");

        let monitor_list = xcap::Monitor::all().expect("[get_target_monitor] No monitor found");
        let first_monitor = monitor_list
            .first()
            .expect("[get_target_monitor] No monitor found");

        mouse_x = first_monitor.x().unwrap_or(0) + first_monitor.width().unwrap_or(0) as i32 / 2;
        mouse_y = first_monitor.y().unwrap_or(0) + first_monitor.height().unwrap_or(0) as i32 / 2;

        first_monitor.clone()
    });

    (mouse_x, mouse_y, monitor)
}

#[cfg(target_os = "macos")]
pub fn get_window_id_from_ns_handle(ns_handle: *mut std::ffi::c_void) -> u32 {
    use objc2::runtime::AnyObject;

    unsafe {
        let ns_window = ns_handle as *mut AnyObject;
        let window_id: u32 = objc2::msg_send![ns_window, windowNumber];
        window_id
    }
}

fn capture_current_monitor_with_scap(
    window: &tauri::Window,
    monitor: &Monitor,
) -> Option<image::DynamicImage> {
    #[cfg(not(target_os = "macos"))]
    {
        return None;
    }

    #[cfg(target_os = "macos")]
    {
        // macOS 下用 scap 截取，scap 使用最新的 ScreenCaptureKit API 进行截取
        // macOS 可能遇到旧平台，这时回退到 xcap 截取
        // if !scap::is_supported() {
        //     return None;
        // }
        // scap 的版本比较看着不是很可靠，用 tauri 提供的方案比较下
        let os_version = tauri_plugin_os::version();
        if os_version.cmp(&tauri_plugin_os::Version::from_string("12.3.0"))
            != std::cmp::Ordering::Greater
        {
            return None;
        }

        if !scap::has_permission() {
            log::warn!("[capture_current_monitor_with_scap] failed tohas_permission");
            if !scap::request_permission() {
                log::error!("[capture_current_monitor_with_scap] failed to request_permission");
                return None;
            }
        }

        let ns_handle = match window.ns_window() {
            Ok(ns_handle) => ns_handle,
            Err(_) => {
                log::error!("[capture_current_monitor_with_scap] failed to get ns_window");
                return None;
            }
        };

        let monitor_id = match monitor.id() {
            Ok(id) => id,
            Err(e) => {
                log::error!(
                    "[capture_current_monitor_with_scap] failed to get monitor id: {:?}",
                    e
                );
                return None;
            }
        };

        let window_id = get_window_id_from_ns_handle(ns_handle);

        let options = scap::capturer::Options {
            fps: 1,
            target: Some(scap::Target::Display(scap::Display {
                id: monitor_id as u32,
                title: "".to_string(), // 这里 title 不重要
                raw_handle: core_graphics_helmer_fork::display::CGDisplay::new(monitor_id),
            })),
            show_cursor: false,
            show_highlight: true,
            excluded_targets: Some(vec![scap::Target::Window(scap::Window {
                id: window_id,
                title: "Snow Shot - Draw".to_string(),
                raw_handle: window_id,
            })]),
            output_type: scap::frame::FrameType::BGRAFrame,
            output_resolution: scap::capturer::Resolution::Captured,
            crop_area: Some(scap::capturer::Area {
                origin: scap::capturer::Point {
                    x: monitor.x().unwrap_or(0) as f64,
                    y: monitor.y().unwrap_or(0) as f64,
                },
                size: scap::capturer::Size {
                    width: monitor.width().unwrap_or(0) as f64,
                    height: monitor.height().unwrap_or(0) as f64,
                },
            }),
            ..Default::default()
        };

        // Create Capturer
        let capturer = scap::capturer::Capturer::build(options);
        let mut capturer = match capturer {
            Ok(capturer) => capturer,
            Err(e) => {
                log::error!(
                    "[capture_current_monitor_with_scap] failed to build capturer: {:?}",
                    e
                );
                return None;
            }
        };

        capturer.start_capture();
        let frame = match capturer.get_next_frame() {
            Ok(frame) => match frame {
                scap::frame::Frame::BGRA(frame) => frame,
                _ => {
                    log::error!("[capture_current_monitor_with_scap] valid frame type");
                    return None;
                }
            },
            Err(e) => {
                log::error!(
                    "[capture_current_monitor_with_scap] failed to get_next_frame: {:?}",
                    e
                );
                return None;
            }
        };
        capturer.stop_capture();

        match image::RgbImage::from_raw(
            frame.width as u32,
            frame.height as u32,
            bgra_to_rgb(&frame.data),
        ) {
            Some(rgb_image) => Some(image::DynamicImage::ImageRgb8(rgb_image)),
            None => {
                log::error!("[capture_current_monitor_with_scap] failed to create image");
                return None;
            }
        }
    }
}

#[command]
pub async fn capture_current_monitor(window: tauri::Window, encoder: String) -> Response {
    // 获取当前鼠标的位置
    let (_, _, monitor) = get_target_monitor();

    let image_buffer = match capture_current_monitor_with_scap(&window, &monitor) {
        Some(image) => image,
        None => match monitor.capture_image() {
            Ok(image) => image::DynamicImage::ImageRgba8(image),
            Err(_) => {
                log::error!("Failed to capture current monitor");
                return Response::new(Vec::new());
            }
        },
    };

    // 前端处理渲染图片的方式有两种
    // 1. 接受 RGBA 数据通过 canvas 转为 base64 后显示
    // 2. 直接接受 png、jpg 文件格式的二进制数据
    // 所以无需将原始的 RGBA 数据返回给前端，直接在 rust 编码为指定格式返回前端
    // 前端也无需再转为 base64 显示

    // 编码为指定格式
    let mut buf = Vec::with_capacity(image_buffer.as_bytes().len() / 8);

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

#[command]
pub async fn capture_focused_window(
    app: tauri::AppHandle,
    file_path: Option<String>,
) -> Result<(), String> {
    let image;

    #[cfg(target_os = "windows")]
    {
        let hwnd = os::utils::get_focused_window();

        let focused_window = xcap::Window::new(xcap::ImplWindow::new(hwnd));

        image = match focused_window.capture_image() {
            Ok(image) => image,
            Err(_) => {
                log::warn!("[capture_focused_window] Failed to capture focused window");
                // 改成捕获当前显示器

                let (_, _, monitor) = get_target_monitor();

                match monitor.capture_image() {
                    Ok(image) => image,
                    Err(_) => {
                        return Err(String::from(
                            "[capture_focused_window] Failed to capture image",
                        ));
                    }
                }
            }
        };
    }

    #[cfg(target_os = "linux")]
    {
        let (_, _, monitor) = get_target_monitor();

        image = match monitor.capture_image() {
            Ok(image) => image,
            Err(_) => {
                return Err(String::from(
                    "[capture_focused_window] Failed to capture image",
                ));
            }
        };
    }

    #[cfg(target_os = "macos")]
    {
        let (_, _, monitor) = get_target_monitor();

        image = match monitor.capture_image() {
            Ok(image) => image,
            Err(_) => {
                return Err(String::from(
                    "[capture_focused_window] Failed to capture image",
                ));
            }
        };
    }

    // 写入到剪贴板
    match app.clipboard().write_image(&tauri::image::Image::new(
        image.as_bytes(),
        image.width(),
        image.height(),
    )) {
        Ok(_) => (),
        Err(_) => {
            return Err(String::from(
                "[capture_focused_window] Failed to write image to clipboard",
            ));
        }
    }

    if let Some(file_path) = file_path {
        save_image_to_file(
            &image::DynamicImage::ImageRgba8(image),
            PathBuf::from(file_path),
        )?;
    }

    Ok(())
}

#[command]
pub async fn init_ui_elements(ui_elements: tauri::State<'_, Mutex<UIElements>>) -> Result<(), ()> {
    let mut ui_elements = ui_elements.lock().await;

    match ui_elements.init() {
        Ok(_) => Ok(()),
        Err(_) => Err(()),
    }
}

#[command]
pub async fn init_ui_elements_cache(
    ui_elements: tauri::State<'_, Mutex<UIElements>>,
    try_get_element_by_focus: TryGetElementByFocus,
) -> Result<(), ()> {
    let mut ui_elements = ui_elements.lock().await;

    // 多显示器时会获取错误
    // 临时用显示器坐标做个转换，后面兼容跨屏截图时取消
    let (_, _, monitor) = get_target_monitor();
    let monitor_x = monitor.x().unwrap_or(0);
    let monitor_y = monitor.y().unwrap_or(0);
    let monitor_width = monitor.width().unwrap_or(0) as i32;
    let monitor_height = monitor.height().unwrap_or(0) as i32;

    match ui_elements.init_cache(
        ElementRect {
            min_x: monitor_x,
            min_y: monitor_y,
            max_x: monitor_x + monitor_width,
            max_y: monitor_y + monitor_height,
        },
        try_get_element_by_focus,
    ) {
        Ok(_) => (),
        Err(_) => return Err(()),
    }

    Ok(())
}

#[command]
pub async fn recovery_window_z_order(
    ui_elements: tauri::State<'_, Mutex<UIElements>>,
) -> Result<(), ()> {
    let ui_elements = ui_elements.lock().await;

    ui_elements.recovery_window_z_order();

    Ok(())
}

#[derive(PartialEq, Eq, Serialize, Clone, Debug, Copy, Hash)]
pub struct WindowElement {
    element_rect: ElementRect,
    window_id: u32,
}

#[command]
pub async fn get_window_elements() -> Result<Vec<WindowElement>, ()> {
    let (_, _, monitor) = get_target_monitor();

    let monitor_min_x = monitor.x().unwrap_or(0);
    let monitor_min_y = monitor.y().unwrap_or(0);
    let monitor_max_x = monitor_min_x + monitor.width().unwrap_or(0) as i32;
    let monitor_max_y = monitor_min_y + monitor.height().unwrap_or(0) as i32;
    // 获取所有窗口，简单筛选下需要的窗口，然后获取窗口所有元素
    let windows = Window::all().unwrap_or_default();

    let mut rect_list = Vec::new();
    for window in windows {
        if window.is_minimized().unwrap_or(true) {
            continue;
        }

        if let Ok(title) = window.title() {
            if title.eq("Shell Handwriting Canvas") {
                continue;
            }
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

        let window_id = match window.id() {
            Ok(id) => id,
            Err(_) => continue,
        };

        // 保留在屏幕内的窗口
        if !(x >= monitor_min_x && y >= monitor_min_y && x <= monitor_max_x && y <= monitor_max_y) {
            continue;
        }

        rect_list.push(WindowElement {
            element_rect: ElementRect {
                min_x: x - monitor_min_x,
                min_y: y - monitor_min_y,
                max_x: x + width as i32 - monitor_min_x,
                max_y: y + height as i32 - monitor_min_y,
            },
            window_id,
        });
    }

    // 把显示器的窗口也推入到 rect_list 中
    rect_list.push(WindowElement {
        element_rect: ElementRect {
            min_x: monitor_min_x,
            min_y: monitor_min_y,
            max_x: monitor_max_x,
            max_y: monitor_max_y,
        },
        window_id: 0,
    });

    Ok(rect_list)
}

#[command]
pub async fn switch_always_on_top(window_id: u32) -> bool {
    if window_id == 0 {
        return false;
    }

    let window_list = Window::all().unwrap_or_default();
    let window = window_list
        .iter()
        .find(|w| w.id().unwrap_or(0) == window_id);

    let window = match window {
        Some(window) => window,
        None => return false,
    };

    #[cfg(target_os = "windows")]
    {
        let window_hwnd = window.hwnd();

        let window_hwnd = match window_hwnd {
            Ok(hwnd) => hwnd,
            Err(_) => return false,
        };

        os::utils::switch_always_on_top(window_hwnd);
    }

    #[cfg(target_os = "linux")]
    #[cfg(target_os = "macos")]
    {
        os::utils::switch_always_on_top();
    }

    true
}

#[command]
pub async fn get_element_from_position(
    ui_elements: tauri::State<'_, Mutex<UIElements>>,
    window: tauri::Window,
    mouse_x: i32,
    mouse_y: i32,
) -> Result<Vec<ElementRect>, ()> {
    let mut ui_elements = ui_elements.lock().await;

    let element_rect_list =
        match ui_elements.get_element_from_point_walker(mouse_x, mouse_y, &window) {
            Ok(element_rect) => element_rect,
            Err(_) => {
                return Err(());
            }
        };

    Ok(element_rect_list)
}

#[command]
pub async fn get_mouse_position() -> Result<(i32, i32), ()> {
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();
    let (mouse_x, mouse_y) = mouse.coords;

    Ok((mouse_x, mouse_y))
}

#[command]
pub async fn create_draw_window(app: tauri::AppHandle) {
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        format!(
            "draw-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
        ),
        tauri::WebviewUrl::App(format!("/draw").into()),
    )
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .fullscreen(false)
    .title("Snow Shot - Draw")
    .center()
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .skip_taskbar(true)
    .maximizable(false)
    .minimizable(false)
    .resizable(false)
    .inner_size(1.0, 1.0)
    .visible(false)
    .focused(false)
    .build()
    .unwrap();

    window.hide().unwrap();
}

#[command]
pub async fn set_draw_window_style(window: tauri::Window) {
    os::utils::set_draw_window_style(window);
}
