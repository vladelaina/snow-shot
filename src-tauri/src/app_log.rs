use serde::Serialize;
use tauri::Emitter;

/// 定义日志级别
#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

/// 定义日志消息结构
#[derive(Serialize)]
pub struct LogMessage {
    level: LogLevel,
    message: String,
}

/// 发送日志方法
pub fn send_log<S: Into<String>>(app: &tauri::AppHandle, level: LogLevel, message: S) {
    let log_message = LogMessage {
        level,
        message: message.into(),
    };

    // 向前端发送 `log-message` 事件
    app.emit("log-message", &log_message).unwrap();
}

/// 发送 `info` 级别日志
pub fn info<S: Into<String>>(app: &tauri::AppHandle, message: S) {
    send_log(app, LogLevel::Info, message);
}

/// 发送 `warn` 级别日志
pub fn warn<S: Into<String>>(app: &tauri::AppHandle, message: S) {
    send_log(app, LogLevel::Warn, message);
}

/// 发送 `error` 级别日志
pub fn error<S: Into<String>>(app: &tauri::AppHandle, message: S) {
    send_log(app, LogLevel::Error, message);
}
