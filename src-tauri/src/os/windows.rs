use std::cmp::Ordering;
use std::collections::HashMap;
use std::collections::HashSet;
use std::collections::VecDeque;
use std::mem;

use crate::app_error::AutomationError;
use rtree_rs::{RTree, Rect};
use uiautomation::UIAutomation;
use uiautomation::UIElement;
use uiautomation::UITreeWalker;
use uiautomation::types::Handle;
use uiautomation::types::Point;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::GetWindowInfo;
use windows::Win32::UI::WindowsAndMessaging::WINDOWINFO;

use super::ElementRect;

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
        self.element_index = 0;
        self.parent_index = 0;
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

pub struct UIElements {
    automation: Option<UIAutomation>,
    automation_walker: Option<UITreeWalker>,
    root_element: Option<UIElement>,
    element_cache: RTree<2, i32, ElementLevel>,
    element_level_map: HashMap<ElementLevel, UIElement>,
    init_window: Option<UIElement>,
    init_window_runtime_id: Option<Vec<i32>>,
}

unsafe impl Send for UIElements {}
unsafe impl Sync for UIElements {}

impl UIElements {
    pub fn new() -> Self {
        Self {
            automation: None,
            automation_walker: None,
            root_element: None,
            init_window: None,
            init_window_runtime_id: None,
            element_cache: RTree::new(),
            element_level_map: HashMap::new(),
        }
    }

    pub fn init(&mut self, hwnd: HWND) -> Result<(), AutomationError> {
        if self.automation.is_some() && self.automation_walker.is_some() {
            return Ok(());
        }

        let automation = UIAutomation::new()?;
        let automation_walker = automation.get_raw_view_walker()?;
        let root_element = automation.get_root_element()?;
        let init_window = automation.element_from_handle(Handle::from(hwnd))?;
        let init_window_runtime_id = init_window.get_runtime_id()?;

        self.automation = Some(automation);
        self.automation_walker = Some(automation_walker);
        self.root_element = Some(root_element);
        self.init_window = Some(init_window);
        self.init_window_runtime_id = Some(init_window_runtime_id);
        Ok(())
    }

    pub fn convert_element_rect_to_rtree_rect(rect: uiautomation::types::Rect) -> Rect<2, i32> {
        Rect::new(
            [rect.get_left(), rect.get_top()],
            [rect.get_right(), rect.get_bottom()],
        )
    }

    pub fn clip_rect(
        rect: uiautomation::types::Rect,
        parent_rect: uiautomation::types::Rect,
    ) -> uiautomation::types::Rect {
        uiautomation::types::Rect::new(
            rect.get_left().max(parent_rect.get_left()),
            rect.get_top().max(parent_rect.get_top()),
            rect.get_right().min(parent_rect.get_right()),
            rect.get_bottom().min(parent_rect.get_bottom()),
        )
    }

    /**
     * 初始化窗口元素缓存
     */
    pub fn init_cache(&mut self) -> Result<(), AutomationError> {
        let automation_walker = self.automation_walker.clone().unwrap();
        let root_element = self.root_element.clone().unwrap();

        self.element_cache = RTree::new();
        self.element_level_map = HashMap::new();

        // 桌面的窗口索引应该是最高，因为其优先级最低
        let mut current_level = ElementLevel::min();
        let root_element_rect = root_element.get_bounding_rectangle()?;
        let parent_rtree_rect = self.insert_element_cache(
            root_element.clone(),
            root_element_rect,
            current_level,
            root_element_rect,
        );

        if let Ok(mut first_child) = automation_walker.get_first_child(&root_element) {
            if first_child
                .get_runtime_id()?
                .eq(self.init_window_runtime_id.as_ref().unwrap())
            {
                first_child = match automation_walker.get_next_sibling(&first_child) {
                    Ok(sibling) => sibling,
                    Err(_) => return Ok(()),
                };
            }

            current_level.window_index = 0;
            current_level.next_level();

            self.insert_element_cache(
                first_child.clone(),
                first_child.get_bounding_rectangle()?,
                current_level,
                parent_rtree_rect,
            );
            while let Ok(sibling) = automation_walker.get_next_sibling(&first_child) {
                if sibling
                    .get_runtime_id()?
                    .eq(self.init_window_runtime_id.as_ref().unwrap())
                {
                    continue;
                }

                current_level.window_index += 1;
                current_level.next_element();

                self.insert_element_cache(
                    sibling.clone(),
                    sibling.get_bounding_rectangle()?,
                    current_level,
                    parent_rtree_rect,
                );

                first_child = sibling;
            }
        }

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

    pub fn insert_element_cache(
        &mut self,
        element: UIElement,
        element_rect: uiautomation::types::Rect,
        element_level: ElementLevel,
        parent_element_rect: uiautomation::types::Rect,
    ) -> uiautomation::types::Rect {
        let element_rect = Self::clip_rect(element_rect, parent_element_rect);
        self.element_cache.insert(
            Self::convert_element_rect_to_rtree_rect(element_rect),
            element_level,
        );
        self.element_level_map.insert(element_level, element);

        element_rect
    }

    fn get_element_from_cache(
        &self,
        mouse_x: i32,
        mouse_y: i32,
    ) -> Option<(UIElement, ElementLevel, uiautomation::types::Rect)> {
        let element_rect = self
            .element_cache
            .search(Rect::new_point([mouse_x, mouse_y]));

        // 获取层级最高的元素
        let mut max_level = ElementLevel::min();
        let mut max_level_rect = None;
        for rect in element_rect {
            if max_level.cmp(&rect.data) == Ordering::Less {
                max_level = rect.data.clone();
                max_level_rect = Some(rect.rect);
            }
        }
        let element_rtree_rect = match max_level_rect {
            Some(rect) => {
                uiautomation::types::Rect::new(rect.min[0], rect.min[1], rect.max[0], rect.max[1])
            }
            None => return None,
        };

        match self.element_level_map.get(&max_level) {
            Some(element) => Some((element.clone(), max_level, element_rtree_rect)),
            None => None,
        }
    }

    /**
     * 获取所有可选区域
     */
    pub fn get_element_from_point_walker(
        &mut self,
        mouse_x: i32,
        mouse_y: i32,
    ) -> Result<ElementRect, AutomationError> {
        let automation_walker = self.automation_walker.clone().unwrap();
        let (parent_element, mut current_level, mut parent_rect) =
            match self.get_element_from_cache(mouse_x, mouse_y) {
                Some(element) => element,
                None => (
                    self.root_element.clone().unwrap(),
                    ElementLevel::min(),
                    uiautomation::types::Rect::new(0, 0, i32::MAX, i32::MAX),
                ),
            };

        // 父元素必然命中了 mouse position，所以直接取第一个元素
        let mut queue = VecDeque::with_capacity(128);
        match automation_walker.get_first_child(&parent_element) {
            Ok(element) => {
                queue.push_back(element);
                current_level.next_level();
            }
            Err(_) => {}
        };

        let mut current_element_rect = parent_rect;
        let mut result_rect = current_element_rect;

        while let Some(current_element) = queue.pop_front() {
            current_element_rect = match current_element.get_bounding_rectangle() {
                Ok(rect) => rect,
                Err(_) => continue,
            };

            let current_element_left = current_element_rect.get_left();
            let current_element_right = current_element_rect.get_right();
            let current_element_top = current_element_rect.get_top();
            let current_element_bottom = current_element_rect.get_bottom();

            current_element_rect = self.insert_element_cache(
                current_element.clone(),
                current_element_rect,
                current_level,
                parent_rect,
            );

            if current_element_left <= mouse_x
                && current_element_right >= mouse_x
                && current_element_top <= mouse_y
                && current_element_bottom >= mouse_y
            {
                result_rect = current_element_rect;

                let first_child = automation_walker.get_first_child(&current_element);
                if let Ok(child) = first_child {
                    queue.push_back(child);
                    current_level.next_level();
                    parent_rect = current_element_rect;
                }
            }

            let next_sibling = automation_walker.get_next_sibling(&current_element);
            if let Ok(sibling) = next_sibling {
                queue.push_back(sibling);
                current_level.next_element();
            }
        }

        return Ok(ElementRect::from(result_rect));
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

impl Drop for UIElements {
    fn drop(&mut self) {
        // 清理资源
        self.automation = None;
        self.automation_walker = None;
        self.root_element = None;
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
