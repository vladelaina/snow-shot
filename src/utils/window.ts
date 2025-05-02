import { getCurrentWindow } from '@tauri-apps/api/window';

export const showWindow = async (ignoreFocus = false) => {
    const appWindow = getCurrentWindow();
    await Promise.all([
        async () => {
            if (await appWindow.isMinimized()) {
                await appWindow.unminimize();
            }
        },
        appWindow.show(),
    ]);
    if (!ignoreFocus) {
        await appWindow.setFocus();
    }
};

export const closeWindow = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    await appWindow.close();
};
