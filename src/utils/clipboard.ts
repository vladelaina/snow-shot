import { platform } from '@tauri-apps/plugin-os';
import * as clipboard from '@tauri-apps/plugin-clipboard-manager';

export const writeTextToClipboard = async (text: string) => {
    const currentPlatform = platform();

    let isSuccess = false;
    try {
        if (currentPlatform === 'macos') {
            isSuccess = false;
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })]);
            isSuccess = true;
        }
    } catch (error) {
        isSuccess = false;
        console.warn('[clipboard] writeTextToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }

    await clipboard.writeText(text);
};

export const writeImageToClipboard = async (image: Blob, format = 'image/png') => {
    const currentPlatform = platform();

    let isSuccess = false;
    try {
        if (currentPlatform === 'macos') {
            isSuccess = false;
        } else {
            await navigator.clipboard.write([new ClipboardItem({ [format]: image })]);
            isSuccess = true;
        }
    } catch (error) {
        isSuccess = false;
        console.warn('[clipboard] writeImageToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }

    await clipboard.writeImage(await image.arrayBuffer());
};

export const writeHtmlToClipboard = async (html: string) => {
    const currentPlatform = platform();

    let isSuccess = false;
    try {
        if (currentPlatform === 'macos') {
            isSuccess = false;
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': html })]);
            isSuccess = true;
        }
    } catch (error) {
        isSuccess = false;
        console.warn('[clipboard] writeHtmlToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }

    await clipboard.writeHtml(html);
};
