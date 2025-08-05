import * as clipboard from '@tauri-apps/plugin-clipboard-manager';
import { getPlatform } from '.';

export const writeTextToClipboard = async (text: string) => {
    let isSuccess = false;
    try {
        await clipboard.writeText(text);
        isSuccess = true;
    } catch (error) {
        isSuccess = false;
        console.warn('[clipboard] writeTextToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })]);
};

export const writeImageToClipboard = async (image: Blob, format = 'image/png') => {
    const currentPlatform = getPlatform();

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
    let isSuccess = false;
    try {
        await clipboard.writeHtml(html);
        isSuccess = true;
    } catch (error) {
        isSuccess = false;
        console.warn('[clipboard] writeHtmlToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': html })]);
};
