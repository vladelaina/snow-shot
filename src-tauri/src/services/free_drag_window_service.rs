use tauri::PhysicalPosition;
extern crate device_query;
use device_query::{
    DeviceEvents, DeviceEventsHandler, DeviceQuery, DeviceState, MouseButton, MousePosition,
    MouseState,
};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct FreeDragWindowService {
    /* 目标窗口 */
    target_window: Arc<Mutex<Option<tauri::Window>>>,
    /* 设备事件处理 */
    device_event_handler: Option<DeviceEventsHandler>,
    _mouse_move_guard: Arc<Mutex<Option<Box<dyn std::any::Any + Send>>>>,
    _mouse_up_guard: Arc<Mutex<Option<Box<dyn std::any::Any + Send>>>>,
}

impl FreeDragWindowService {
    pub fn new() -> Self {
        return Self {
            target_window: Arc::new(Mutex::new(None)),
            // 先设置为 60fps
            device_event_handler: None,
            _mouse_move_guard: Arc::new(Mutex::new(None)),
            _mouse_up_guard: Arc::new(Mutex::new(None)),
        };
    }

    pub fn start_drag(&mut self, window: tauri::Window) -> Result<(), String> {
        self.stop_drag();

        // 计算当前鼠标相对窗口的位置
        let device_state = DeviceState::new();
        let mouse_state: MouseState = device_state.get_mouse();
        let (mouse_x, mouse_y) = (mouse_state.coords.0 as f64, mouse_state.coords.1 as f64);

        let window_position = match window.outer_position() {
            Ok(position) => position,
            Err(_) => {
                return Err(String::from(
                    "[FreeDragWindowService] Could not get window position",
                ));
            }
        };
        let window_x = window_position.x as f64;
        let window_y = window_position.y as f64;

        self.target_window = Arc::new(Mutex::new(Some(window)));

        let device_event_handler = match self.device_event_handler.as_ref() {
            Some(handler) => handler,
            None => {
                let fps = 60;
                let handler = match DeviceEventsHandler::new(Duration::from_millis(1000 / fps)) {
                    Some(handler) => handler,
                    None => {
                        return Err(String::from(
                            "[FreeDragWindowService] Could not get device event handler",
                        ));
                    }
                };

                self.device_event_handler = Some(handler);

                self.device_event_handler.as_ref().unwrap()
            }
        };

        // 监听鼠标移动事件
        // 克隆需要在闭包中使用的变量
        let target_window = Arc::clone(&self.target_window);
        let relative_position = Arc::new(Mutex::new((mouse_x - window_x, mouse_y - window_y)));
        self._mouse_move_guard.lock().unwrap().replace(Box::new(
            device_event_handler.on_mouse_move(move |position: &MousePosition| {
                let target_window = match target_window.lock() {
                    Ok(window) => window,
                    Err(_) => return,
                };
                let target_window = match target_window.as_ref() {
                    Some(window) => window,
                    None => return,
                };

                let relative_position = match relative_position.lock() {
                    Ok(position) => position,
                    Err(_) => return,
                };

                let (mouse_x, mouse_y) = (position.0 as f64, position.1 as f64);
                let (window_x, window_y) =
                    (mouse_x - relative_position.0, mouse_y - relative_position.1);
                let _ = target_window.set_position(PhysicalPosition::new(window_x, window_y));
            }),
        ));

        // 监听鼠标按钮事件 - 抬起时结束拖动
        let target_window_for_button = Arc::clone(&self.target_window);

        let _mouse_up_guard_clone = Arc::clone(&self._mouse_up_guard);
        let _mouse_move_guard_clone = Arc::clone(&self._mouse_move_guard);
        self._mouse_up_guard
            .lock()
            .unwrap()
            .replace(Box::new(device_event_handler.on_mouse_up(
                move |button: &MouseButton| {
                    // 当鼠标左键抬起时完全停止拖动，清除所有相关状态
                    if *button == 1 {
                        Self::stop_drag_core(
                            &target_window_for_button,
                            &_mouse_move_guard_clone,
                            &_mouse_up_guard_clone,
                        );
                    }
                },
            )));

        Ok(())
    }

    fn stop_drag_core(
        target_window: &Arc<Mutex<Option<tauri::Window>>>,
        mouse_move_guard: &Arc<Mutex<Option<Box<dyn std::any::Any + Send>>>>,
        mouse_up_guard: &Arc<Mutex<Option<Box<dyn std::any::Any + Send>>>>,
    ) {
        let mut target_window_lock = match target_window.lock() {
            Ok(window) => window,
            Err(_) => return,
        };
        *target_window_lock = None;

        let mut mouse_move_guard_lock = match mouse_move_guard.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        *mouse_move_guard_lock = None;
        let mut mouse_up_guard_lock = match mouse_up_guard.lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        *mouse_up_guard_lock = None;
    }

    pub fn stop_drag(&mut self) {
        Self::stop_drag_core(
            &self.target_window,
            &self._mouse_move_guard,
            &self._mouse_up_guard,
        );
    }
}
