use std::ffi::c_void;

use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{GetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, WS_EX_TOPMOST, HWND_TOPMOST, HWND_NOTOPMOST, SWP_NOMOVE, SWP_NOSIZE};

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
            if is_topmost { Some(HWND_NOTOPMOST) } else { Some(HWND_TOPMOST) },
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE,
        )
    };
    
    result.is_ok()
}
