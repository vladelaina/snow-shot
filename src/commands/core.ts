import { invoke } from '@tauri-apps/api/core';

export const getSelectedText = async () => {
    const result = await invoke<string>('get_selected_text');
    return result;
};

export const setEnableProxy = async (enable: boolean) => {
    const result = await invoke<string>('set_enable_proxy', {
        enable,
    });
    return result;
};
