use std::ffi::c_void;
use std::fs;
use std::path::PathBuf;

use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GWL_EXSTYLE, GWL_STYLE, GetWindowLongPtrW, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOMOVE,
    SWP_NOSIZE, SetWindowLongW, SetWindowPos, WS_EX_TOPMOST,
};
use zune_core::bit_depth::BitDepth;
use zune_core::colorspace::ColorSpace;
use zune_core::options::EncoderOptions;
use zune_jpegxl::JxlSimpleEncoder;

pub fn switch_always_on_top(hwnd: *mut c_void) -> bool {
    let hwnd = HWND(hwnd);

    // 获取窗口的扩展样式
    let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };

    // 检查窗口是否已经置顶
    let is_topmost = (ex_style & WS_EX_TOPMOST.0 as isize) != 0;

    // 根据当前状态切换置顶
    let result = unsafe {
        SetWindowPos(
            hwnd,
            if is_topmost {
                Some(HWND_NOTOPMOST)
            } else {
                Some(HWND_TOPMOST)
            },
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE,
        )
    };

    result.is_ok()
}

pub fn set_draw_window_style(window: tauri::Window) {
    let window_hwnd = window.hwnd();

    if let Ok(hwnd) = window_hwnd {
        // 设置窗口样式为0x96000000
        let new_style = -1778384896;
        unsafe { SetWindowLongW(hwnd, GWL_STYLE, new_style) };
    }
}

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
