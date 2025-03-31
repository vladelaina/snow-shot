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
    mouseX: number;
    mouseY: number;
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
    const monitorInfoLength = 28;
    const imageDataLength = result.byteLength - monitorInfoLength;

    // 提取屏幕信息
    const screenInfoView = new DataView(result, imageDataLength, monitorInfoLength);
    const monitorX = screenInfoView.getInt32(0, true); // i32
    const monitorY = screenInfoView.getInt32(4, true); // i32
    const monitorWidth = screenInfoView.getUint32(8, true); // u32
    const monitorHeight = screenInfoView.getUint32(12, true); // u32
    const monitorScaleFactor = screenInfoView.getFloat32(16, true); // f32
    const mouseX = screenInfoView.getInt32(20, true); // i32
    const mouseY = screenInfoView.getInt32(24, true); // i32

    return {
        encoder,
        monitorX,
        monitorY,
        monitorWidth,
        monitorHeight,
        monitorScaleFactor,
        mouseX,
        mouseY,
        data: new Blob([result]),
    };
};

export type ElementRect = {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
};

export const getWindowElements = async () => {
    const result = await invoke<ElementRect[]>('get_window_elements');
    return result;
};

export const initUiElementsCache = async () => {
    const result = await invoke<void>('init_ui_elements_cache');
    return result;
};

export const initUiElements = async () => {
    const result = await invoke<void>('init_ui_elements');
    return result;
};

export const getElementFromPosition = async (mouseX: number, mouseY: number) => {
    const result = await invoke<ElementRect[]>('get_element_from_position', {
        mouseX,
        mouseY,
    });
    return result;
};

export const exitApp = async () => {
    const result = await invoke<void>('exit_app');
    return result;
};

export const getMousePosition = async () => {
    const result = await invoke<[number, number]>('get_mouse_position');
    return result;
};
