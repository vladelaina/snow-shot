use tauri::command;
use tauri::ipc::Response;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::sync::Mutex;

use snow_shot_app_scroll_screenshot_service::scroll_screenshot_image_service::ScrollScreenshotImageService;
use snow_shot_app_scroll_screenshot_service::scroll_screenshot_service::{
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
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_init(
        scroll_screenshot_service,
        direction,
        sample_rate,
        min_sample_size,
        max_sample_size,
        corner_threshold,
        descriptor_patch_size,
        min_size_delta,
        try_rollback,
    )
    .await
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
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_capture(
        window,
        scroll_screenshot_image_service,
        scroll_image_list,
        monitor_x,
        monitor_y,
        min_x,
        min_y,
        max_x,
        max_y,
    )
    .await
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
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_handle_image(
        scroll_screenshot_service,
        scroll_screenshot_image_service,
        thumbnail_size,
    )
    .await
}

#[command]
pub async fn scroll_screenshot_get_size(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<snow_shot_tauri_commands_scroll_screenshot::ScrollScreenshotCaptureSize, ()> {
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_get_size(
        scroll_screenshot_service,
    )
    .await
}

#[command]
pub async fn scroll_screenshot_save_to_file(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
    file_path: String,
) -> Result<(), String> {
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_save_to_file(
        scroll_screenshot_service,
        file_path,
    )
    .await
}

#[command]
pub async fn scroll_screenshot_save_to_clipboard(
    app: tauri::AppHandle,
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<(), String> {
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_save_to_clipboard(
        |image| match app.clipboard().write_image(&tauri::image::Image::new(
            image.as_bytes(),
            image.width(),
            image.height(),
        )) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!(
                "[scroll_screenshot_save_to_clipboard] Failed to write image to clipboard: {}",
                e
            )),
        },
        scroll_screenshot_service,
    )
    .await
}

#[command]
pub async fn scroll_screenshot_clear(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<(), ()> {
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_clear(scroll_screenshot_service)
        .await
}

#[command]
pub async fn scroll_screenshot_get_image_data(
    scroll_screenshot_service: tauri::State<'_, Mutex<ScrollScreenshotService>>,
) -> Result<Response, ()> {
    snow_shot_tauri_commands_scroll_screenshot::scroll_screenshot_get_image_data(
        scroll_screenshot_service,
    )
    .await
}
