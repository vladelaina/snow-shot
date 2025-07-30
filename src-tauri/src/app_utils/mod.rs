use std::fs;
use std::path::PathBuf;

use device_query::{DeviceQuery, DeviceState, MouseState};
use tauri::AppHandle;
use xcap::Monitor;
use zune_core::bit_depth::BitDepth;
use zune_core::colorspace::ColorSpace;
use zune_core::options::EncoderOptions;
use zune_jpegxl::JxlSimpleEncoder;

pub fn save_image_to_file(image: &image::DynamicImage, file_path: PathBuf) -> Result<(), String> {
    if file_path.ends_with(".jxl") {
        let image_data = image.to_rgb8();
        let encoder = JxlSimpleEncoder::new(
            image_data.as_raw(),
            EncoderOptions::new(
                image.width() as usize,
                image.height() as usize,
                ColorSpace::RGB,
                BitDepth::Eight,
            ),
        );
        let encoder_result = match encoder.encode() {
            Ok(encoder_result) => encoder_result,
            Err(_) => {
                return Err(format!(
                    "[save_image_to_file] Failed to encode image: {}",
                    file_path.display()
                ));
            }
        };

        return match fs::write(file_path.clone(), encoder_result) {
            Ok(_) => Ok(()),
            Err(_) => Err(format!(
                "[save_image_to_file] Failed to save image to file: {}",
                file_path.display()
            )),
        };
    } else {
        if image.save(file_path.clone()).is_err() {
            return Err(format!(
                "[save_image_to_file] Failed to save image to file: {}",
                file_path.display()
            ));
        }
    }

    return Ok(());
}

pub fn get_mouse_position(#[allow(unused_variables)] app: &AppHandle) -> (i32, i32) {
    let device_state = DeviceState::new();
    let mouse: MouseState = device_state.get_mouse();
    let (mouse_x, mouse_y) = mouse.coords;

    #[cfg(target_os = "macos")]
    let mut position_scale = 1.0;
    #[cfg(not(target_os = "macos"))]
    let position_scale = 1.0;

    // macOS 下的鼠标位置是基于逻辑像素
    #[cfg(target_os = "macos")]
    {
        if let Ok(Some(monitor)) = app.monitor_from_point(mouse_x as f64, mouse_y as f64) {
            position_scale = monitor.scale_factor();
        }
    }

    (
        (mouse_x as f64 * position_scale) as i32,
        (mouse_y as f64 * position_scale) as i32,
    )
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

pub fn capture_current_monitor_with_scap(
    #[allow(unused_variables)] window: &tauri::Window,
    #[allow(unused_variables)] monitor: &Monitor,
    #[cfg(target_os = "macos")] crop_area: Option<scap::capturer::Area>,
    #[allow(unused_variables)]
    #[cfg(not(target_os = "macos"))]
    crop_area: Option<()>,
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
            crop_area: crop_area.or(Some(scap::capturer::Area {
                origin: scap::capturer::Point {
                    x: monitor.x().unwrap_or(0) as f64,
                    y: monitor.y().unwrap_or(0) as f64,
                },
                size: scap::capturer::Size {
                    width: monitor.width().unwrap_or(0) as f64,
                    height: monitor.height().unwrap_or(0) as f64,
                },
            })),
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
