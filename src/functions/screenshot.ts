import { AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import { captureFocusedWindow } from '@/commands/screenshot';
import { getImagePathFromSettings } from '@/utils/file';
import { playSound } from '@/utils/audio';
import { emit } from '@tauri-apps/api/event';

export enum ScreenshotType {
    Default = 'default',
    Fixed = 'fixed',
    OcrDetect = 'ocr-detect',
    TopWindow = 'top-window',
}

export const executeScreenshot = async (type: ScreenshotType = ScreenshotType.Default) => {
    await emit('execute-screenshot', {
        type,
    });
};

export const executeScreenshotFocusedWindow = async (appSettings: AppSettingsData) => {
    const enableAutoSave =
        appSettings[AppSettingsGroup.FunctionScreenshot].enhanceSaveFile &&
        appSettings[AppSettingsGroup.FunctionScreenshot].autoSaveOnCopy;

    const imagePath = enableAutoSave
        ? await getImagePathFromSettings(appSettings, 'focused-window')
        : null;
    captureFocusedWindow(imagePath?.filePath ?? null);
    // 播放相机快门音效
    playSound('/audios/camera_shutter.mp3');
};

export const finishScreenshot = async () => {
    await emit('finish-screenshot');
};

export const releaseDrawPage = async () => {
    await emit('release-draw-page');
};
