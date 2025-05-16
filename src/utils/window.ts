import { getCurrentWindow } from '@tauri-apps/api/window';

export const showWindow = async (ignoreFocus = false) => {
    const appWindow = getCurrentWindow();
    await Promise.all([await appWindow.unminimize(), appWindow.show()]);
    if (!ignoreFocus) {
        await appWindow.setFocus();
    }
};

export const hideWindow = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    await new Promise((resolve) => {
        setTimeout(resolve, 42);
    });
};

export const closeWindow = async () => {
    const appWindow = getCurrentWindow();
    await hideWindow();
    await appWindow.close();
};
