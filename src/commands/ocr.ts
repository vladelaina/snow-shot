import { invoke } from '@tauri-apps/api/core';

export interface OcrDetectResultTextPoint {
    x: number;
    y: number;
}

export interface OcrDetectResultTextBlock {
    box_points: OcrDetectResultTextPoint[];
    text: string;
    text_score: number;
}

export interface OcrDetectResult {
    text_blocks: OcrDetectResultTextBlock[];
}

export const ocrDetect = async (
    data: ArrayBuffer | Uint8Array,
    scaleFactor: number,
): Promise<OcrDetectResult> => {
    const result = await invoke<string>('ocr_detect', data, {
        headers: {
            'x-scale-factor': scaleFactor.toFixed(3),
        },
    });
    return JSON.parse(result) as OcrDetectResult;
};

export const ocrInit = async (): Promise<void> => {
    await invoke<void>('ocr_init');
};

export const ocrRelease = async (): Promise<void> => {
    await invoke<void>('ocr_release');
};
