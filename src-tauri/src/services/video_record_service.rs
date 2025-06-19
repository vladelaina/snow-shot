use ffmpeg_sidecar::{child::FfmpegChild, command::FfmpegCommand, event::FfmpegEvent};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::Result;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Copy)]
pub enum VideoRecordState {
    Idle,
    Recording,
    Paused,
}

#[derive(PartialEq, Serialize, Deserialize, Debug, Clone, Copy)]
pub enum VideoFormat {
    Mp4,
    Gif,
}

impl VideoFormat {
    pub fn extension(&self) -> &str {
        match self {
            VideoFormat::Mp4 => "mp4",
            VideoFormat::Gif => "gif",
        }
    }
}

pub struct VideoRecordService {
    pub state: VideoRecordState,
    pub child: Option<FfmpegChild>,
}

impl VideoRecordService {
    pub fn new() -> Self {
        Self {
            state: VideoRecordState::Idle,
            child: None,
        }
    }

    pub fn get_ffmpeg_command(&self) -> FfmpegCommand {
        FfmpegCommand::new_with_path("./ffmpeg/ffmpeg.exe")
    }

    pub fn start(
        &mut self,
        min_x: i32,
        min_y: i32,
        max_x: i32,
        max_y: i32,
        output_file: String,
        format: VideoFormat,
        frame_rate: u32,
        enable_microphone: bool,
        enable_system_audio: bool,
        microphone_device_name: String,
        hwaccel: bool,
        encoder: String,
        encoder_preset: String,
    ) -> Result<()> {
        if self.state == VideoRecordState::Recording {
            return Err(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                "Recording is already in progress",
            ));
        }

        // 计算录制区域的宽度和高度
        let mut width = max_x - min_x;
        let mut height = max_y - min_y;

        if width <= 0 || height <= 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid recording area dimensions",
            ));
        }

        // 确保宽度和高度都是偶数（libx264要求）
        if width % 2 == 1 {
            width -= 1;
        }
        if height % 2 == 1 {
            height -= 1;
        }

        println!(
            "Recording area: {}x{} at ({}, {})",
            width, height, min_x, min_y
        );

        let mut command = self.get_ffmpeg_command();

        // 硬件加速选项必须在输入选项之前
        if hwaccel {
            command.arg("-hwaccel").arg("auto");
        }

        // 设置输入格式为 gdigrab (Windows 屏幕录制)
        command
            .arg("-f")
            .arg("gdigrab")
            .arg("-framerate")
            .arg(frame_rate.to_string())
            // 设置偏移量
            .arg("-offset_x")
            .arg(min_x.to_string())
            .arg("-offset_y")
            .arg(min_y.to_string())
            // 设置录制区域大小
            .arg("-video_size")
            .arg(format!("{}x{}", width, height))
            // 输入源为桌面
            .arg("-i")
            .arg("desktop");

        // 音频输入计数器
        let mut audio_inputs: Vec<String> = Vec::new();

        // 添加系统音频输入
        if enable_system_audio {
            // command
            //     .arg("-f")
            //     .arg("dshow")
            //     .arg("-i")
            //     .arg("audio=virtual-audio-capturer");
            // audio_inputs.push("1:a".to_string());
        }

        // 添加麦克风音频输入
        if enable_microphone {
            let device_names = self.get_microphone_device_names();

            if device_names.len() > 0 {
                command.arg("-f").arg("dshow").arg("-i").arg(format!(
                    "audio={}",
                    if device_names.contains(&microphone_device_name) {
                        microphone_device_name
                    } else {
                        device_names[0].clone()
                    }
                ));
                audio_inputs.push(format!("{}:a", audio_inputs.len() + 1));
            }
        }

        // 根据格式设置不同的参数
        match format {
            VideoFormat::Mp4 => {
                command
                    .arg("-c:v")
                    .arg(encoder)
                    .arg("-preset")
                    .arg(encoder_preset)
                    .arg("-crf")
                    .arg("23")
                    .arg("-pix_fmt")
                    .arg("yuv420p"); // 添加像素格式，确保兼容性

                // 音频编码设置
                if !audio_inputs.is_empty() {
                    command.arg("-c:a").arg("aac").arg("-b:a").arg("128k");

                    // 如果有多个音频输入，需要混音
                    if audio_inputs.len() > 1 {
                        let filter_complex = format!(
                            "[{}]amix=inputs={}[aout]",
                            audio_inputs.join("]["),
                            audio_inputs.len()
                        );
                        command.arg("-filter_complex").arg(filter_complex);
                        command.arg("-map").arg("0:v").arg("-map").arg("[aout]");
                    } else {
                        command
                            .arg("-map")
                            .arg("0:v")
                            .arg("-map")
                            .arg(&audio_inputs[0]);
                    }
                } else {
                    // 没有音频输入时，只映射视频
                    command.arg("-map").arg("0:v");
                }

                command.arg("-movflags").arg("+faststart"); // 优化MP4文件结构
            }
            VideoFormat::Gif => {
                // GIF格式不包含音频
                command
                    .arg("-vf")
                    .arg("fps=10,scale=-1:-1:flags=lanczos,palettegen=reserve_transparent=0")
                    .arg("-loop")
                    .arg("0");
            }
        }

        command.arg("-y");

        // 输出文件
        command.arg(format!("{}.{}", output_file, format.extension()));

        println!("FFmpeg command args: {:?}", command);

        // 启动ffmpeg进程
        match command.spawn() {
            Ok(mut child) => {
                for event in child.iter().unwrap() {
                    if format == VideoFormat::Mp4 {
                        match event {
                            FfmpegEvent::Progress(_) => {
                                self.child = Some(child);
                                self.state = VideoRecordState::Recording;
                                return Ok(());
                            }
                            _ => {}
                        }
                    }
                }

                Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    "Failed to start recording",
                ))
            }
            Err(e) => {
                self.state = VideoRecordState::Idle;
                println!("FFmpeg start error: {}", e);
                Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to start recording: {}", e),
                ))
            }
        }
    }

    pub fn get_microphone_device_names(&self) -> Vec<String> {
        let mut command = self.get_ffmpeg_command();
        command
            .arg("-list_devices")
            .arg("true")
            .arg("-f")
            .arg("dshow")
            .arg("-i")
            .arg("dummy");

        let mut device_names = Vec::new();

        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(e) => {
                println!(
                    "[get_microphone_device_names] Failed to spawn ffmpeg: {}",
                    e
                );
                return device_names;
            }
        };

        let output_iter = match child.iter() {
            Ok(output) => output,
            Err(e) => {
                println!("[get_microphone_device_names] Failed to iter ffmpeg: {}", e);
                return device_names;
            }
        };

        // 创建正则表达式来匹配音频设备
        // 格式: [dshow @ address] [info] "设备名称" (audio)
        let device_regex = match Regex::new(r#"\[info\]\s+"([^"]+)"\s+\(audio\)"#) {
            Ok(regex) => regex,
            Err(e) => {
                println!(
                    "[get_microphone_device_names] Failed to create regex: {}",
                    e
                );
                return device_names;
            }
        };

        for line in output_iter {
            match line {
                FfmpegEvent::Log(_, line) => {
                    // 使用正则表达式解析音频设备
                    if let Some(captures) = device_regex.captures(&line) {
                        if let Some(device_name) = captures.get(1) {
                            let name = device_name.as_str().to_string();
                            device_names.push(name.clone());
                            println!("[get_microphone_device_names] Found audio device: {}", name);
                        }
                    }
                }
                _ => {}
            }
        }

        let _ = child.wait();

        println!(
            "[get_microphone_device_names] Total found devices: {}",
            device_names.len()
        );
        device_names
    }

    pub fn stop(&mut self) -> Result<()> {
        if self.state != VideoRecordState::Recording && self.state != VideoRecordState::Paused {
            return Ok(());
        }

        println!("[FFmpeg] Stopping");
        if let Some(mut child) = self.child.take() {
            let _ = child.quit();
            let _ = child.wait();
        }

        self.state = VideoRecordState::Idle;
        Ok(())
    }

    pub fn pause(&mut self) -> Result<()> {
        if self.state != VideoRecordState::Recording {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "No recording in progress",
            ));
        }

        if let Some(ref mut child) = self.child {
            child.send_stdin_command(b" ").unwrap();
        }

        self.state = VideoRecordState::Paused;
        Ok(())
    }

    pub fn resume(&mut self) -> Result<()> {
        if self.state != VideoRecordState::Paused {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Recording is not paused",
            ));
        }

        if let Some(ref mut child) = self.child {
            child.send_stdin_command(b"\n").unwrap();
        }

        self.state = VideoRecordState::Recording;
        Ok(())
    }
}
