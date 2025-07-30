#[cfg(target_os = "windows")]
#[path = "./notification/windows.rs"]
pub mod notification;
#[cfg(target_os = "linux")]
#[path = "./notification/linux.rs"]
pub mod notification;

#[cfg(target_os = "macos")]
#[path = "./notification/macos.rs"]
pub mod notification;

#[cfg(target_os = "windows")]
#[path = "./ui_automation/windows.rs"]
pub mod ui_automation;
#[cfg(target_os = "linux")]
#[path = "./ui_automation/linux.rs"]
pub mod ui_automation;

#[cfg(target_os = "macos")]
#[path = "./ui_automation/macos.rs"]
pub mod ui_automation;

#[cfg(target_os = "windows")]
#[path = "./utils/windows.rs"]
pub mod utils;

#[cfg(target_os = "linux")]
#[path = "./utils/linux.rs"]
pub mod utils;

#[cfg(target_os = "macos")]
#[path = "./utils/macos.rs"]
pub mod utils;

// #[cfg(target_os = "linux")]
// #[path = "./linux.rs"]
// pub mod ui_automation;

// #[cfg(target_os = "macos")]
// #[path = "./macos.rs"]
// pub mod ui_automation;

use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, hash::Hash};

#[derive(PartialEq, Serialize, Clone, Debug)]
pub struct ElementInfo {
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

    pub fn clip_rect(&self, rect: &ElementRect) -> ElementRect {
        ElementRect {
            min_x: self.min_x.max(rect.min_x),
            min_y: self.min_y.max(rect.min_y),
            max_x: self.max_x.min(rect.max_x),
            max_y: self.max_y.min(rect.max_y),
        }
    }

    /// 检查两个 ElementRect 是否有重叠部分
    pub fn overlaps(&self, other: &ElementRect) -> bool {
        // 检查是否有重叠：一个矩形在另一个矩形的左边、右边、上边或下边时，它们不重叠
        !(self.max_x <= other.min_x
            || self.min_x >= other.max_x
            || self.max_y <= other.min_y
            || self.min_y >= other.max_y)
    }

    pub fn scale(&self, scale: f32) -> ElementRect {
        ElementRect {
            min_x: (self.min_x as f32 * scale) as i32,
            min_y: (self.min_y as f32 * scale) as i32,
            max_x: (self.max_x as f32 * scale) as i32,
            max_y: (self.max_y as f32 * scale) as i32,
        }
    }
}

/**
 * 元素层级
 */
#[derive(Debug, Clone, PartialEq, Eq, Hash, Copy, PartialOrd)]
pub struct ElementLevel {
    /**
     * 遍历时，首先获得层级最高的元素
     * 同级元素，index 越高，层级越低
     */
    pub element_index: i32,
    /**
     * 元素层级
     */
    pub element_level: i32,
    /**
     * 父元素索引
     */
    pub parent_index: i32,
    /**
     * 窗口索引
     */
    pub window_index: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Copy, PartialOrd, Serialize, Deserialize)]
pub enum TryGetElementByFocus {
    /// 从不
    Never,
    /// 仅针对 Firefox 浏览器
    Firefox,
    /// 尝试在白名单中获取焦点
    WhiteList,
    /// 总是尝试获取焦点
    Always,
}

impl ElementLevel {
    pub fn min() -> Self {
        Self {
            element_index: 0,
            element_level: 0,
            parent_index: 0,
            window_index: i32::MAX,
        }
    }

    pub fn next_level(&mut self) {
        self.element_level += 1;
        let current_element_index = self.element_index;
        self.element_index = 0;
        self.parent_index = current_element_index;
    }

    pub fn next_element(&mut self) {
        self.element_index += 1;
    }
}

impl Ord for ElementLevel {
    fn cmp(&self, other: &Self) -> Ordering {
        // 先窗口索引排序，窗口索引小的优先级越高
        if self.window_index != other.window_index {
            return other.window_index.cmp(&self.window_index);
        }

        // 元素层级排序，层级高的优先级越高
        if self.element_level != other.element_level {
            return self.element_level.cmp(&other.element_level);
        }

        // 元素索引排序，索引小的优先级越高
        if self.element_index != other.element_index {
            return other.element_index.cmp(&self.element_index);
        }

        // 父元素索引排序，索引大的优先级越高
        other.parent_index.cmp(&self.parent_index)
    }
}

#[cfg(target_os = "windows")]
impl From<uiautomation::types::Rect> for ElementRect {
    fn from(rect: uiautomation::types::Rect) -> Self {
        ElementRect {
            min_x: rect.get_left(),
            min_y: rect.get_top(),
            max_x: rect.get_right(),
            max_y: rect.get_bottom(),
        }
    }
}
