'use client';

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { TrayIcon, TrayIconOptions } from '@tauri-apps/api/tray';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';

const TrayIconLoaderComponent = () => {
    useEffect(() => {
        let trayIcon: TrayIcon | null = null;
        const init = async () => {
            const appWindow = getCurrentWindow();

            const options: TrayIconOptions = {
                icon: (await defaultWindowIcon()) ?? '',
                title: 'Sonnet Shot',
                tooltip: 'Sonnet Shot',
                action: (event) => {
                    switch (event.type) {
                        case 'Click':
                            if (event.button === 'Left') {
                                appWindow.show();
                            }
                            break;
                    }
                },
            };

            trayIcon = await TrayIcon.new(options);
        };
        init();

        const closeTrayIcon = () => {
            if (!trayIcon) {
                return;
            }

            trayIcon.close();
        };

        window.onbeforeunload = () => {
            closeTrayIcon();
        };

        return () => {
            document.removeEventListener('DOMContentLoaded', init);
            closeTrayIcon();
        };
    }, []);

    return null;
};

export const TrayIconLoader = React.memo(TrayIconLoaderComponent);
