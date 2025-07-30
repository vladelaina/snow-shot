use enigo::Enigo;
use enigo::Settings;

pub struct EnigoManager {
    pub enigo: Enigo,
}

impl EnigoManager {
    pub fn new() -> Self {
        Self {
            enigo: Enigo::new(&Settings::default()).unwrap(),
        }
    }
}
