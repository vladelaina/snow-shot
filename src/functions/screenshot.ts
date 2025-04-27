import { emit } from '@tauri-apps/api/event';

export const executeScreenshot = async () => {
    await emit('execute-screenshot');
};
