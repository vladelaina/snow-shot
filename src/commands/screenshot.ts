import { invoke } from '@tauri-apps/api/core';

export const switchAlwaysOnTop = async (windowId: number) => {
    const result = await invoke<string>('switch_always_on_top', {
        windowId,
    });
    return result;
};
