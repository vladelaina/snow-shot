use crate::app_error::AutomationError;
use crate::ui_automation::UIAutomationBase;

pub struct LinuxUIAutomation;
pub struct LinuxUIElement;

impl UIAutomationBase for LinuxUIAutomation {
    fn new() -> Self {
        Self
    }

    fn get_element_info_from_point(
        &self,
        _: i32,
        _: i32,
    ) -> Result<Option<crate::ui_automation::ElementInfo>, AutomationError> {
        Ok(None)
    }
}
