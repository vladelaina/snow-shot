import { emit } from '@tauri-apps/api/event';

export const updateSelectedText = async () => {
    await emit('update-selected-text');
};
