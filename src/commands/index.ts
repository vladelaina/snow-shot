import { invoke } from '@tauri-apps/api/core';

export enum ImageEncoder {
    Png = 'png',
    WebP = 'webp',
}

export type ImageBuffer = {
    encoder: ImageEncoder;
    monitorX: number;
    monitorY: number;
    monitorWidth: number;
    monitorHeight: number;
    monitorScaleFactor: number;
    data: Blob;
};

/**
 * 捕获鼠标所在位置的屏幕图像
 */
export const captureCurrentMonitor = async (encoder: ImageEncoder): Promise<ImageBuffer> => {
    const result = await invoke<ArrayBuffer>('capture_current_monitor', {
        encoder,
    });

    // 将屏幕信息和图像数据分离
    const monitorInfoLength = 20;
    const imageDataLength = result.byteLength - monitorInfoLength;

    // 提取屏幕信息
    const screenInfoView = new DataView(result, imageDataLength, monitorInfoLength);
    const monitorX = screenInfoView.getInt32(0, true); // i32
    const monitorY = screenInfoView.getInt32(4, true); // i32
    const monitorWidth = screenInfoView.getUint32(8, true); // u32
    const monitorHeight = screenInfoView.getUint32(12, true); // u32
    const monitorScaleFactor = screenInfoView.getFloat32(16, true); // f32

    return {
        encoder,
        monitorX,
        monitorY,
        monitorWidth,
        monitorHeight,
        monitorScaleFactor,
        data: new Blob([result.slice(0, imageDataLength)]),
    };
};

export type WindowInfo = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * 获取鼠标所在位置的窗口信息
 */
export const getWindowFromMousePosition = async () => {
    const result = await invoke<WindowInfo | undefined | null>('get_window_from_mouse_position');

    return result;
};
