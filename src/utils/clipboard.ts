import * as clipboard from '@tauri-apps/plugin-clipboard-manager';

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
    let isSuccess = false;
    try {
        await clipboard.writeImage(await image.arrayBuffer());
        isSuccess = true;
    } catch (error) {
        console.warn('[clipboard] writeImageToClipboard error', error);
    }

    if (isSuccess) {
        return;
    }

    await navigator.clipboard.write([new ClipboardItem({ [format]: image })]);
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
