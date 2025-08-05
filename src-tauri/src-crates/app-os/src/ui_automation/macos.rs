use super::TryGetElementByFocus;
use snow_shot_app_shared::ElementRect;

pub struct UIElements {}

#[allow(unused)]
impl UIElements {
    pub fn new() -> Self {
        Self {}
    }

    pub fn init(&mut self) -> Result<(), ()> {
        Ok(())
    }

    pub fn init_cache(&mut self, try_get_element_by_focus: TryGetElementByFocus) -> Result<(), ()> {
        Ok(())
    }

    pub fn recovery_window_z_order(&self) {}

    pub fn get_element_from_point_walker<F>(
        &mut self,
        mouse_x: i32,
        mouse_y: i32,
        on_try_focus: &F,
    ) -> Result<Vec<ElementRect>, ()>
    where
        F: Fn(),
    {
        log::warn!("[os::ui_automation::macos::get_element_from_point_walker] not implemented");
        Ok(vec![])
    }
}
