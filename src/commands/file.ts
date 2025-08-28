import { invoke } from '@tauri-apps/api/core';

export const createDir = async (dirPath: string) => {
    const result = await invoke<void>('create_dir', {
        dirPath,
    });
    return result;
};

export const textFileRead = async (filePath: string) => {
    const result = await invoke<string>('text_file_read', { filePath });
    return result;
};

export const textFileWrite = async (filePath: string, content: string) => {
    const result = await invoke<void>('text_file_write', { filePath, content });
    return result;
};

export const textFileClear = async (filePath: string) => {
    const result = await invoke<void>('text_file_clear', { filePath });
    return result;
};

export const getAppConfigDir = async () => {
    const result = await invoke<string>('get_app_config_dir');
    return result;
};
