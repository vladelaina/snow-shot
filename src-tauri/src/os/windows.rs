use std::cmp;
use std::collections::VecDeque;
use std::mem;

use crate::app_error::AutomationError;
use device_query::DeviceQuery;
use device_query::DeviceState;
use device_query::MouseState;
use static_aabb2d_index::*;
use windows::Win32::System::Com::CoInitializeEx;
use windows::Win32::System::Com::COINIT_APARTMENTTHREADED;
use windows::Win32::UI::Accessibility::TreeScope_Children;
use windows::Win32::UI::WindowsAndMessaging::GetWindowInfo;
use windows::Win32::UI::WindowsAndMessaging::WINDOWINFO;
use windows::Win32::{
    Foundation::HWND,
    System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER},
    UI::Accessibility::{CUIAutomation, IUIAutomation, IUIAutomationElement},
};
use xcap::Window;

use super::ElementInfo;
use super::ElementRect;

pub struct UIAutomation {
    automation: IUIAutomation,
}

unsafe impl Send for UIAutomation {}

impl UIAutomation {
    pub fn new() -> Self {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED).unwrap();

            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).unwrap();

            Self { automation }
        }
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

    /**
     * 获取所有可选区域
     */
    pub fn get_element_info(&self) -> Result<ElementInfo, AutomationError> {
        // 获取当前鼠标的位置
        let device_state = DeviceState::new();
        let mouse: MouseState = device_state.get_mouse();
        let (mouse_x, mouse_y) = mouse.coords;

        let mut element_rect_list = Vec::new();

        let monitor = xcap::Monitor::from_point(mouse_x, mouse_y)?;
        let monitor_min_x = monitor.x()?;
        let monitor_min_y = monitor.y()?;
        let monitor_max_x = monitor_min_x + monitor.width()? as i32;
        let monitor_max_y = monitor_min_y + monitor.height()? as i32;

        element_rect_list.push(ElementRect {
            min_x: monitor_min_x,
            min_y: monitor_min_y,
            max_x: monitor_max_x,
            max_y: monitor_max_y,
        });

        // 获取所有窗口，简单筛选下需要的窗口，然后获取窗口所有元素
        let mut windows = Window::all().unwrap_or_default();
        // 获取窗口是，是从最顶层的窗口依次遍历，这里反转下便于后续查找
        windows.reverse();

        let mut window_hwnd_list = Vec::new();
        for window in windows {
            // if window.title().unwrap() != "主文件夹 - 文件资源管理器" {
            //     continue;
            // }
            // if !window.title().unwrap().ends_with("Mozilla Firefox") {
            //     continue;
            // }
            // println!("window.title(): {:?}", window.title());

            if window.is_minimized().unwrap_or(true) {
                continue;
            }

            let hwnd = match window.hwnd() {
                Ok(hwnd) => HWND(hwnd),
                Err(_) => continue,
            };

            let window_info = match Self::get_window_info(hwnd) {
                Ok(window_info) => window_info,
                Err(_) => continue,
            };

            let window_min_x = window_info.rcClient.left;
            let window_min_y = window_info.rcClient.top;
            let window_max_x = window_info.rcClient.right;
            let window_max_y = window_info.rcClient.bottom;

            // 保留在屏幕内的窗口
            if !(window_min_x >= monitor_min_x
                && window_min_y >= monitor_min_y
                && window_min_x <= monitor_max_x
                && window_min_y <= monitor_max_y)
            {
                continue;
            }

            element_rect_list.push(ElementRect {
                min_x: window_min_x,
                min_y: window_min_y,
                max_x: window_max_x,
                max_y: window_max_y,
            });
            window_hwnd_list.push(hwnd);
        }

        let mut windows_rtree_builder: StaticAABB2DIndexBuilder<i32> =
            StaticAABB2DIndexBuilder::new(element_rect_list.len() - 1);
        for element_rect in element_rect_list[1..].iter() {
            windows_rtree_builder.add(
                element_rect.min_x,
                element_rect.min_y,
                element_rect.max_x,
                element_rect.max_y,
            );
        }

        let windows_rtree = windows_rtree_builder.build().unwrap();

        let automation = &self.automation;
        unsafe {
            // let condition = automation.CreatePropertyCondition(
            //     UIA_ControlTypePropertyId,
            //     &windows::Win32::System::Variant::VARIANT::from(UIA_TextControlTypeId.0),
            // )?;
            let condition = automation.CreateTrueCondition()?;
            for (index, hwnd) in window_hwnd_list.iter().enumerate() {
                let window_rect_index = index;
                let window_rect = element_rect_list[window_rect_index + 1];

                let window_element = match automation.ElementFromHandle(*hwnd) {
                    Ok(element) => element,
                    Err(_) => continue,
                };

                let window_children_elements =
                    match window_element.FindAll(TreeScope_Children, &condition) {
                        Ok(elements) => elements,
                        Err(_) => continue,
                    };

                let window_children_elements_count = match window_children_elements.Length() {
                    Ok(count) => count,
                    Err(_) => continue,
                };

                if window_children_elements_count == 0 {
                    continue;
                }

                let mut queue: VecDeque<IUIAutomationElement> =
                    VecDeque::with_capacity((window_children_elements_count * 4) as usize);

                for i in 0..window_children_elements_count {
                    let child_element = window_children_elements.GetElement(i)?;
                    queue.push_back(child_element);
                }

                let mut element_count = 0;
                while let Some(current_element) = queue.pop_front() {
                    element_count += 1;

                    let current_element_rect = match current_element.CurrentBoundingRectangle() {
                        Ok(rect) => rect,
                        Err(_) => continue,
                    };

                    if element_count <= window_children_elements_count {
                        // 第一层级时判断元素的 4 个点是否有在窗口内的
                        let mut has_hit = false;
                        let point_list = [
                            (current_element_rect.left, current_element_rect.top),
                            (current_element_rect.right, current_element_rect.top),
                            (current_element_rect.left, current_element_rect.bottom),
                            (current_element_rect.right, current_element_rect.bottom),
                        ];
                        for point in point_list {
                            match windows_rtree
                                .query(point.0, point.1, point.0, point.1)
                                .iter()
                                .max()
                            {
                                Some(index) => {
                                    has_hit = *index == window_rect_index;
                                }
                                None => {}
                            };

                            if has_hit {
                                break;
                            }
                        }

                        if !has_hit {
                            continue;
                        }
                    }

                    element_rect_list.push(ElementRect {
                        min_x: cmp::max(current_element_rect.left, window_rect.min_x),
                        min_y: cmp::max(current_element_rect.top, window_rect.min_y),
                        max_x: cmp::min(current_element_rect.right, window_rect.max_x),
                        max_y: cmp::min(current_element_rect.bottom, window_rect.max_y),
                    });

                    let children_elements =
                        match current_element.FindAll(TreeScope_Children, &condition) {
                            Ok(elements) => elements,
                            Err(_) => continue,
                        };

                    let children_elements_count = children_elements.Length()?;

                    // 预分配容量
                    if children_elements_count == 0 {
                        continue;
                    }

                    for i in 0..children_elements_count {
                        let child_element = children_elements.GetElement(i)?;
                        queue.push_back(child_element);
                    }
                }
            }
        }

        Ok(ElementInfo {
            rect_list: element_rect_list,
            scale_factor: monitor.scale_factor()?,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::time::Instant;

    use super::*;

    #[test]
    fn test_get_all_elements() {
        let instant = Instant::now();
        let ui_automation = UIAutomation::new();
        let element_info = ui_automation.get_element_info().unwrap();
        // element_info.rect_list.iter().for_each(|rect| {
        //     println!("rect: {:?}", rect);
        // });
        println!("elapsed: {:?}", instant.elapsed());
        println!("element_rect_list length {}", element_info.rect_list.len());
    }
}
