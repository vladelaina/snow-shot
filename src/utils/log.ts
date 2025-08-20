import * as tauriLog from '@tauri-apps/plugin-log';

export const appError = (message: string, extra?: unknown, options?: tauriLog.LogOptions) => {
    tauriLog.error(`[${location.href}] ${message} ${extra ? JSON.stringify(extra) : ''}`, options);
};

export const appWarn = (message: string, extra?: unknown, options?: tauriLog.LogOptions) => {
    tauriLog.warn(`[${location.href}] ${message} ${extra ? JSON.stringify(extra) : ''}`, options);
};
