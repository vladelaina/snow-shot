import { invoke } from '@tauri-apps/api/core';

export enum ImageEncoder {
    Png = 'png',
    WebP = 'webp',
}

export type ImageBuffer = {
    encoder: ImageEncoder;
    data: Blob;
};

/**
 * 捕获鼠标所在位置的屏幕图像
 */
export const captureCurrentMonitor = async (encoder: ImageEncoder): Promise<ImageBuffer> => {
    const result = await invoke<ArrayBuffer>('capture_current_monitor', {
        encoder,
    });

    return {
        encoder,
        data: new Blob([result]),
    };
};
