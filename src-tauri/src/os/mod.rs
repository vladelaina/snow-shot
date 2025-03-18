#[cfg(target_os = "windows")]
#[path = "./windows.rs"]
pub mod ui_automation;

#[cfg(target_os = "linux")]
#[path = "./linux.rs"]
pub mod ui_automation;

#[cfg(target_os = "macos")]
#[path = "./macos.rs"]
pub mod ui_automation;

use serde::Serialize;
use std::hash::Hash;

#[derive(PartialEq, Serialize, Clone, Debug)]
pub struct ElementInfo {
    pub scale_factor: f32,
    pub rect_list: Vec<ElementRect>,
}

#[derive(PartialEq, Eq, Serialize, Clone, Debug, Copy, Hash)]
pub struct ElementRect {
    pub min_x: i32,
    pub min_y: i32,
    pub max_x: i32,
    pub max_y: i32,
}

impl ElementRect {
    pub fn equals(&self, min_x: i32, min_y: i32, max_x: i32, max_y: i32) -> bool {
        self.min_x == min_x && self.min_y == min_y && self.max_x == max_x && self.max_y == max_y
    }
}
