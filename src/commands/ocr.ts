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

export const ocrDetect = async (data: ArrayBuffer | Uint8Array): Promise<OcrDetectResult> => {
    const result = await invoke<string>('ocr_detect', data);
    return JSON.parse(result) as OcrDetectResult;
};
