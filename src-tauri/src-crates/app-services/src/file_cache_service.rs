use dashmap::{DashMap, DashSet};
use std::{fs, path::PathBuf};
use tauri::Manager;

/**
 * 配置文件每个窗口同步时都会读取一次
 * 通过统一读取提速
 */
pub struct FileCacheService {
    file_cache: DashMap<PathBuf, String>,
    exists_path_cache: DashSet<PathBuf>,
    env_path_cache: DashMap<String, PathBuf>,
}

impl FileCacheService {
    pub fn new() -> Self {
        Self {
            file_cache: DashMap::new(),
            exists_path_cache: DashSet::new(),
            env_path_cache: DashMap::new(),
        }
    }

    pub fn get_app_config_dir(&self, app: &tauri::AppHandle) -> Result<PathBuf, String> {
        const APP_CONFIG_DIR: &str = "app_config_dir";

        if let Some(path) = self.env_path_cache.get(APP_CONFIG_DIR) {
            return Ok(path.clone());
        }

        let path = app.path().app_config_dir().map_err(|e| e.to_string())?;
        self.env_path_cache
            .insert(APP_CONFIG_DIR.to_string(), path.clone());

        Ok(path)
    }

    pub fn create_dir(&self, dir_path: PathBuf) -> Result<(), String> {
        if self.exists_path_cache.contains(&dir_path) {
            return Ok(());
        }

        let exists = match fs::exists(dir_path.clone()) {
            Ok(exists) => exists,
            Err(e) => {
                log::warn!(
                    "[TextFileCacheService] check dir exists failed: [{}] {}",
                    dir_path.display(),
                    e.to_string()
                );
                false
            }
        };

        if !exists {
            if let Err(e) = fs::create_dir_all(dir_path.clone()) {
                return Err(format!(
                    "[TextFileCacheService] create dir failed: [{}] {}",
                    dir_path.display(),
                    e.to_string()
                ));
            }
        }

        self.exists_path_cache.insert(dir_path);

        Ok(())
    }

    pub fn read(&self, file_path: PathBuf) -> Result<String, String> {
        if let Some(content) = self.file_cache.get(&file_path) {
            return Ok(content.clone());
        }

        let content = match fs::read_to_string(file_path.clone()) {
            Ok(content) => content,
            Err(e) => {
                return Err(format!(
                    "[TextFileCacheService] read failed: [{}] {}",
                    file_path.display(),
                    e.to_string()
                ));
            }
        };

        Ok(content)
    }

    pub fn write(&self, file_path: PathBuf, content: String) -> Result<(), String> {
        if let Err(e) = fs::write(file_path.clone(), content.clone()) {
            return Err(format!(
                "[TextFileCacheService] write failed: [{}] {}",
                file_path.display(),
                e.to_string()
            ));
        };

        self.file_cache.insert(file_path, content.clone());

        Ok(())
    }

    pub fn clear(&self) {
        self.file_cache.clear();
    }
}
