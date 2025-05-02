import { invoke } from '@tauri-apps/api/core';

export const getSelectedText = async () => {
    const result = await invoke<string>('get_selected_text');
    return result;
};
