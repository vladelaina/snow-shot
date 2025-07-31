use std::time::Duration;

use device_query::{
    CallbackGuard, DeviceEvents, DeviceEventsHandler, Keycode, MouseButton, MousePosition,
};

const DEVICE_EVENT_HANDLER_FPS: u64 = 60;

pub struct DeviceEventHandlerService {
    /* 设备事件处理 */
    device_event_handler: DeviceEventsHandler,
}

impl DeviceEventHandlerService {
    pub fn new() -> Self {
        let handler = match DeviceEventsHandler::new(Duration::from_millis(
            1000 / DEVICE_EVENT_HANDLER_FPS,
        )) {
            Some(handler) => handler,
            None => {
                panic!("[DeviceEventHandlerService] Could not get device event handler");
            }
        };

        Self {
            device_event_handler: handler,
        }
    }

    pub fn on_mouse_move<Callback: Fn(&MousePosition) + Sync + Send + 'static>(
        &self,
        callback: Callback,
    ) -> CallbackGuard<Callback> {
        self.device_event_handler.on_mouse_move(callback)
    }

    pub fn on_mouse_up<Callback: Fn(&MouseButton) + Sync + Send + 'static>(
        &self,
        callback: Callback,
    ) -> CallbackGuard<Callback> {
        self.device_event_handler.on_mouse_up(callback)
    }

    pub fn on_key_down<Callback: Fn(&Keycode) + Sync + Send + 'static>(
        &self,
        callback: Callback,
    ) -> CallbackGuard<Callback> {
        self.device_event_handler.on_key_down(callback)
    }

    pub fn on_key_up<Callback: Fn(&Keycode) + Sync + Send + 'static>(
        &self,
        callback: Callback,
    ) -> CallbackGuard<Callback> {
        self.device_event_handler.on_key_up(callback)
    }
}
