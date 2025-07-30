use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{self, CompressionType, PngEncoder};
use image::imageops::FilterType;
use serde::Serialize;
use std::path::PathBuf;
use tauri::ipc::Response;
use tauri::{command, image::Image};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::sync::Mutex;
use xcap::Monitor;

use snow_shot_app_utils::{self, save_image_to_file};
use snow_shot_app_services::scroll_screenshot_image_service::ScrollScreenshotImageService;
use snow_shot_app_services::scroll_screenshot_service::{
    ScrollDirection, ScrollImageList, ScrollScreenshotService,
};

#[command]
pub async fn scroll_screenshot_init(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
    direction: ScrollDirection,
    sample_rate: f32,
    min_sample_size: u32,
    max_sample_size: u32,
    corner_threshold: u8,
    descriptor_patch_size: usize,
    min_size_delta: i32,
    try_rollback: bool,
) -> Result<(), ()> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    scroll_screenshot_service.init(
        direction,
        sample_rate,
        min_sample_size,
        max_sample_size,
        corner_threshold,
        descriptor_patch_size,
        min_size_delta,
        try_rollback,
    );

    Ok(())
}

#[command]
pub async fn scroll_screenshot_capture(
    window: tauri::Window,
    scroll_screenshot_image_service: tauri::State<'_, Mutex<ScrollScreenshotImageService>>,
    scroll_image_list: ScrollImageList,
    monitor_x: i32,
    monitor_y: i32,
    min_x: u32,
    min_y: u32,
    max_x: u32,
    max_y: u32,
) -> Result<(), String> {
    // 区域截图
    let image = {
        let monitor = Monitor::from_point(monitor_x, monitor_y).unwrap();

        #[cfg(target_os = "macos")]
        let mut rect_scale = 1.0f64;
        #[cfg(not(target_os = "macos"))]
        let rect_scale = 1.0f64;

        // macOS 下截图区域是基于逻辑像素
        #[cfg(target_os = "macos")]
        {
            rect_scale = (1.0 / monitor.scale_factor().unwrap_or(1.0)) as f64;
        }

        let min_x = min_x as f64 * rect_scale;
        let min_y = min_y as f64 * rect_scale;
        let width = max_x as f64 * rect_scale - min_x;
        let height = max_y as f64 * rect_scale - min_y;

        if let Some(image) = snow_shot_app_utils::capture_current_monitor_with_scap(
            &window,
            &monitor,
            #[cfg(target_os = "windows")]
            None,
            #[cfg(target_os = "macos")]
            Some(scap::capturer::Area {
                origin: scap::capturer::Point { x: min_x, y: min_y },
                size: scap::capturer::Size { width, height },
            }),
        ) {
            image
        } else {
            match monitor.capture_region(min_x as u32, min_y as u32, width as u32, height as u32) {
                Ok(image) => image::DynamicImage::ImageRgba8(image),
                Err(error) => {
                    return Err(format!("[scroll_screenshot_capture] error: {}", error));
                }
            }
        }
    };

    scroll_screenshot_image_service
        .lock()
        .await
        .push_image(image, scroll_image_list);

    Ok(())
}

/**
 * 处理目前截取到的所有图片
 */
#[command]
pub async fn scroll_screenshot_handle_image(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
    scroll_screenshot_image_service: tauri::State<'_, Mutex<ScrollScreenshotImageService>>,
    thumbnail_size: u32,
) -> Result<Response, ()> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    // 把 scroll_screenshot_image_service.lock 后置，降低阻塞截图的概率，让截图堆积在截图队列中
    let scroll_image = {
        let mut scroll_screenshot_image_service = scroll_screenshot_image_service.lock().await;

        match scroll_screenshot_image_service.pop_image() {
            Some(scroll_image) => scroll_image,
            None => return Ok(Response::new(vec![2])), // 特殊标记，表示没有图片
        }
    };

    let (handle_result, is_origin) =
        scroll_screenshot_service.handle_image(scroll_image.image, scroll_image.direction);

    if is_origin {
        return Ok(Response::new(vec![1])); // 特殊标记，表示是未变化
    }

    let handle_result = match handle_result {
        Some(result) => result,
        None => return Ok(Response::new(vec![])),
    };

    let crop_image = match handle_result {
        (edge_position, None) => {
            return Ok(Response::new(edge_position.to_le_bytes().to_vec()));
        }
        (_, Some(ScrollImageList::Top)) => scroll_screenshot_service.top_image_list.last().unwrap(),
        (_, Some(ScrollImageList::Bottom)) => {
            scroll_screenshot_service.bottom_image_list.last().unwrap()
        }
    };

    let mut buf = Vec::new();

    let image_width = crop_image.width();
    let image_height = crop_image.height();
    let scale = if scroll_screenshot_service.current_direction == ScrollDirection::Vertical {
        thumbnail_size as f32 / image_width as f32
    } else {
        thumbnail_size as f32 / image_height as f32
    };

    let thumbnail = crop_image.resize(
        ((image_width as f32 * scale) as u32).max(1), // 防止图片某一边为 0
        ((image_height as f32 * scale) as u32).max(1),
        FilterType::Nearest,
    );

    thumbnail
        .to_rgb8()
        .write_with_encoder(JpegEncoder::new_with_quality(&mut buf, 83))
        .unwrap();

    // 添加边缘位置信息到缓冲区末尾
    buf.extend_from_slice(&handle_result.0.to_le_bytes());

    Ok(Response::new(buf))
}

#[derive(Serialize)]
pub struct ScrollScreenshotCaptureSize {
    pub top_image_size: i32,
    pub bottom_image_size: i32,
}

#[command]
pub async fn scroll_screenshot_get_size(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<ScrollScreenshotCaptureSize, ()> {
    let scroll_screenshot_service = scroll_screenshot_service.lock().await;

    Ok(ScrollScreenshotCaptureSize {
        top_image_size: scroll_screenshot_service.top_image_size,
        bottom_image_size: scroll_screenshot_service.bottom_image_size,
    })
}

#[command]
pub async fn scroll_screenshot_save_to_file(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
    file_path: String,
) -> Result<(), String> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    let image = scroll_screenshot_service.export();
    let image = match image {
        Some(image) => image,
        None => {
            return Err(format!(
                "[scroll_screenshot_save_to_file] Failed to export image"
            ));
        }
    };

    save_image_to_file(&image, PathBuf::from(file_path))?;

    Ok(())
}

#[command]
pub async fn scroll_screenshot_save_to_clipboard(
    app: tauri::AppHandle,
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<(), ()> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    let image = scroll_screenshot_service.export();
    match image {
        Some(image) => {
            let rgba_image = image.to_rgba8();
            app.clipboard()
                .write_image(&Image::new(
                    rgba_image.as_raw(),
                    rgba_image.width(),
                    rgba_image.height(),
                ))
                .unwrap();
        }
        None => return Err(()),
    }

    Ok(())
}

#[command]
pub async fn scroll_screenshot_clear(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<(), ()> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    scroll_screenshot_service.clear();

    Ok(())
}

#[command]
pub async fn scroll_screenshot_get_image_data(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<Response, ()> {
    let mut scroll_screenshot_service = scroll_screenshot_service.lock().await;

    let image = scroll_screenshot_service.export();
    let image_data = match image {
        Some(image) => image,
        None => return Err(()),
    };

    let mut buf = Vec::with_capacity((image_data.height() * image_data.width() * 3 / 8) as usize);

    image_data
        .write_with_encoder(PngEncoder::new_with_quality(
            &mut buf,
            CompressionType::Fast,
            png::FilterType::Adaptive,
        ))
        .unwrap();

    Ok(Response::new(buf))
}
