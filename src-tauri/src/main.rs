// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_error;
mod app_log;
mod app_utils;
mod file;
mod ocr;
mod screenshot;

fn main() {
    app_lib::run();
}
