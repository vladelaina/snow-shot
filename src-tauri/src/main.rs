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

use uiautomation::{UIAutomation, types::Point};

mod app_error;
mod app_log;
mod ocr;
mod os;
mod screenshot;

fn main() {
    app_lib::run();
}
