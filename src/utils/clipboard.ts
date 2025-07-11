import { platform } from '@tauri-apps/plugin-os';
import clipboard from 'tauri-plugin-clipboard-api';

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

    await clipboard.writeImageBinary(Array.from(new Uint8Array(await image.arrayBuffer())));
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
