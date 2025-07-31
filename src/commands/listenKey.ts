import { invoke } from '@tauri-apps/api/core';

export type ListenKeyDownEvent = {
    key: number;
};

export type ListenKeyUpEvent = {
    key: number;
};

export enum ListenKeyCode {
    LControl = 58,
    RControl = 59,
    LShift = 60,
    RShift = 61,
    LAlt = 62,
    RAlt = 63,
    Command = 64,
    RCommand = 65,
    LOption = 66,
    ROption = 67,
    LMeta = 68,
    RMeta = 69,
}

export const LISTEN_KEY_SERVICE_KEY_DOWN_EMIT_KEY = 'listen-key-service:key-down';
export const LISTEN_KEY_SERVICE_KEY_UP_EMIT_KEY = 'listen-key-service:key-up';

export const listenKeyStart = async () => {
    const result = await invoke<void>('listen_key_start');
    return result;
};

export const listenKeyStop = async () => {
    const result = await invoke<void>('listen_key_stop');
    return result;
};
