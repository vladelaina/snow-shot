use snow_shot_app_shared::ElementRect;
use snow_shot_app_utils::monitor_info::MonitorList;

/**
 * 将截图和处理截图分开处理
 * 通过短时间内多次截图来提高滚动截图的响应速度和可靠性
 */
pub struct ScrollScreenshotCaptureService {
    monitor_list: Option<MonitorList>,
}

impl ScrollScreenshotCaptureService {
    pub fn new() -> Self {
        Self { monitor_list: None }
    }

    pub fn init(&mut self, region: ElementRect) {
        if self.monitor_list.is_none() {
            self.monitor_list = Some(MonitorList::get_by_region(region));
        }
    }

    pub fn get(&self) -> &MonitorList {
        self.monitor_list.as_ref().unwrap()
    }

    pub fn clear(&mut self) {
        self.monitor_list = None;
    }
}
