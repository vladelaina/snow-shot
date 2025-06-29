import { invoke } from '@tauri-apps/api/core';

export const switchAlwaysOnTop = async (windowId: number) => {
    const result = await invoke<string>('switch_always_on_top', {
        windowId,
    });
    return result;
};

export const setDrawWindowStyle = async () => {
    const result = await invoke('set_draw_window_style');
    return result;
};

export const captureFocusedWindow = async (filePath: string | null) => {
    const result = await invoke('capture_focused_window', {
        filePath,
    });
    return result;
};
