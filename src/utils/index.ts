import { getCurrentWindow } from '@tauri-apps/api/window';
import { Base64 } from 'js-base64';
import { writeTextToClipboard } from './clipboard';

export const encodeParamsValue = (value: string) => {
    return encodeURIComponent(Base64.encode(value));
};

export const decodeParamsValue = (value: string) => {
    return Base64.decode(decodeURIComponent(value));
};

export const copyText = (text: string) => {
    const selected = window.getSelection();
    if (selected && selected.toString()) {
        writeTextToClipboard(selected.toString());
        selected.removeAllRanges();
    } else {
        writeTextToClipboard(text);
    }
};

export const copyTextAndHide = (text: string) => {
    copyText(text);
    getCurrentWindow().hide();
};
