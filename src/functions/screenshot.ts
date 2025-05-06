import { emit } from '@tauri-apps/api/event';

export enum ScreenshotType {
    Default = 'default',
    Fixed = 'fixed',
    OcrDetect = 'ocr-detect',
}

export const executeScreenshot = async (type: ScreenshotType = ScreenshotType.Default) => {
    await emit('execute-screenshot', {
        type,
    });
};

export const finishScreenshot = async () => {
    await emit('finish-screenshot');
};
