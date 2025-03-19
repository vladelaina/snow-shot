use std::collections::HashMap;
use std::collections::VecDeque;
use std::mem;

use crate::app_error::AutomationError;
use rtree_rs::{RTree, Rect};
use uiautomation::UIAutomation;
use uiautomation::UIElement;
use uiautomation::UITreeWalker;
use uiautomation::types::Point;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::GetWindowInfo;
use windows::Win32::UI::WindowsAndMessaging::WINDOWINFO;

use super::ElementRect;

/**
 * 元素层级
 */
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ElementLevel {
    /**
     * 遍历时，首先获得层级最高的元素
     * 同级元素，index 越高，层级越低
     */
    pub element_index: i32,
    /**
     * 因为窗口很大概率重叠，用窗口索引做个细分
     */
    pub window_index: i32,
    /**
     * 元素层级
     */
    pub element_level: i32,
}

pub struct UIElements {
    automation: Option<UIAutomation>,
    automation_walker: Option<UITreeWalker>,
    root_element: Option<UIElement>,
    element_cache: Option<RTree<2, i32, ElementLevel>>,
    element_level_map: HashMap<ElementLevel, UIElement>,
}

unsafe impl Send for UIElements {}
unsafe impl Sync for UIElements {}

impl UIElements {
    pub fn new() -> Self {
        Self {
            automation: None,
            automation_walker: None,
            root_element: None,
            element_cache: None,
            element_level_map: HashMap::new(),
        }
    }

    pub fn init(&mut self) -> Result<(), AutomationError> {
        if self.automation.is_some() && self.automation_walker.is_some() {
            return Ok(());
        }

        let automation = UIAutomation::new()?;
        let automation_walker = automation.get_raw_view_walker()?;
        let root_element = automation.get_root_element()?;
        self.automation = Some(automation);
        self.automation_walker = Some(automation_walker);
        self.root_element = Some(root_element);
        Ok(())
    }

    pub fn convert_element_rect_to_rtree_rect(rect: uiautomation::types::Rect) -> Rect<2, i32> {
        Rect::new(
            [rect.get_left(), rect.get_top()],
            [rect.get_right(), rect.get_bottom()],
        )
    }

    /**
     * 初始化窗口元素缓存
     */
    pub fn init_cache(&mut self) -> Result<(), AutomationError> {
        let automation_walker = self.automation_walker.as_ref().unwrap();
        let root_element = self.root_element.as_ref().unwrap();

        let root_element_rect = root_element.get_bounding_rectangle()?;

        let mut element_cache = RTree::new();
        let mut element_level_map = HashMap::new();

        let mut window_index = 0;
        let root_element_level = ElementLevel {
            window_index,
            element_index: 0,
            element_level: 0,
        };
        element_cache.insert(
            Self::convert_element_rect_to_rtree_rect(root_element_rect),
            root_element_level,
        );
        element_level_map.insert(root_element_level, root_element.clone());

        let mut element_index = 0;
        if let Ok(first_child) = automation_walker.get_first_child(root_element) {
            window_index += 1;
            element_index += 1;
            element_cache.insert(
                Self::convert_element_rect_to_rtree_rect(first_child.get_bounding_rectangle()?),
                ElementLevel {
                    window_index,
                    element_index,
                    element_level: 1,
                },
            );
            element_level_map.insert(
                ElementLevel {
                    window_index,
                    element_index,
                    element_level: 1,
                },
                first_child.clone(),
            );

            while let Ok(sibling) = automation_walker.get_next_sibling(&first_child) {
                window_index += 1;
                element_index += 1;
                element_cache.insert(
                    Self::convert_element_rect_to_rtree_rect(sibling.get_bounding_rectangle()?),
                    ElementLevel {
                        window_index,
                        element_index,
                        element_level: 1,
                    },
                );
                element_level_map.insert(
                    ElementLevel {
                        window_index,
                        element_index,
                        element_level: 1,
                    },
                    sibling.clone(),
                );
            }
        }

        self.element_cache = Some(element_cache);
        self.element_level_map = element_level_map;
        Ok(())
    }

    pub fn get_element_from_point(
        &self,
        mouse_x: i32,
        mouse_y: i32,
    ) -> Result<Option<ElementRect>, AutomationError> {
        let automation = match self.automation.as_ref() {
            Some(automation) => automation,
            None => return Ok(None),
        };

        let element = automation.element_from_point(Point::new(mouse_x, mouse_y))?;
        let rect = element.get_bounding_rectangle()?;

        Ok(Some(ElementRect {
            min_x: rect.get_left(),
            min_y: rect.get_top(),
            max_x: rect.get_right(),
            max_y: rect.get_bottom(),
        }))
    }

    /**
     * 获取所有可选区域
     */
    pub fn get_element_from_point_walker(
        &self,
        mouse_x: i32,
        mouse_y: i32,
    ) -> Result<ElementRect, AutomationError> {
        let automation_walker = self.automation_walker.as_ref().unwrap();
        let root_element = self.root_element.as_ref().unwrap();
        let mut rect = ElementRect {
            min_x: 0,
            min_y: 0,
            max_x: 0,
            max_y: 0,
        };
        let mut queue = VecDeque::with_capacity(128);
        queue.push_back(root_element.clone());
        while let Some(current_element) = queue.pop_front() {
            let current_element_rect = match current_element.get_bounding_rectangle() {
                Ok(rect) => rect,
                Err(_) => continue,
            };

            let left = current_element_rect.get_left();
            let right = current_element_rect.get_right();
            let top = current_element_rect.get_top();
            let bottom = current_element_rect.get_bottom();

            if left <= mouse_x && right >= mouse_x && top <= mouse_y && bottom >= mouse_y {
                rect.min_x = left;
                rect.min_y = top;
                rect.max_x = right;
                rect.max_y = bottom;

                let first_child = automation_walker.get_first_child(&current_element);
                if let Ok(child) = first_child {
                    queue.push_back(child);
                }
            }

            let next_sibling = automation_walker.get_next_sibling(&current_element);
            if let Ok(sibling) = next_sibling {
                queue.push_back(sibling);
            }
        }

        return Ok(rect);
    }

    fn get_window_info(hwnd: HWND) -> Result<WINDOWINFO, AutomationError> {
        let mut window_info = WINDOWINFO {
            cbSize: mem::size_of::<WINDOWINFO>() as u32,
            ..WINDOWINFO::default()
        };

        unsafe {
            GetWindowInfo(hwnd, &mut window_info)?;
        };

        Ok(window_info)
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use device_query::{DeviceEvents, DeviceEventsHandler};
    use uiautomation::types::Point;

    use super::*;

    #[test]
    fn test_get_element_from_point() {
        let device_state = DeviceEventsHandler::new(Duration::from_millis(1000 / 60))
            .expect("Failed to start event loop");

        // Register a key down event callback
        // The guard is used to keep the callback alive
        let _guard = device_state.on_mouse_move(|position| {
            let (mouse_x, mouse_y) = position;

            let automation = UIAutomation::new().unwrap();
            let element = match automation.element_from_point(Point::new(*mouse_x, *mouse_y)) {
                Ok(element) => element,
                Err(_) => return,
            };

            let rect = match element.get_bounding_rectangle() {
                Ok(rect) => rect,
                Err(_) => return,
            };

            println!(
                "element: left {}, top {}, width {}, height {}",
                rect.get_left(),
                rect.get_top(),
                rect.get_width(),
                rect.get_height()
            );
        });

        loop {}
    }
}
