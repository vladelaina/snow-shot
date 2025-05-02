'use client';

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { TrayIcon, TrayIconOptions } from '@tauri-apps/api/tray';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { Menu } from '@tauri-apps/api/menu';
import { useIntl } from 'react-intl';
import { exitApp } from '@/commands';
import { showWindow } from '@/utils/window';

const TrayIconLoaderComponent = () => {
    const intl = useIntl();

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            return;
        }

        let trayIcon: TrayIcon | undefined = undefined;
        const init = async () => {
            const appWindow = getCurrentWindow();

            const options: TrayIconOptions = {
                icon: (await defaultWindowIcon()) ?? '',
                title: 'Snow Shot',
                tooltip: 'Snow Shot',
                action: (event) => {
                    switch (event.type) {
                        case 'Click':
                            if (event.button === 'Left') {
                                showWindow();
                            }
                            break;
                    }
                },
                menu: await Menu.new({
                    items: [
                        {
                            id: `${appWindow.label}-exit`,
                            text: intl.formatMessage({ id: 'home.exit' }),
                            action: async () => {
                                exitApp();
                            },
                        },
                    ],
                }),
            };

            trayIcon = await TrayIcon.new(options);
        };
        init();

        const closeTrayIcon = () => {
            if (!trayIcon) {
                return;
            }

            trayIcon.close();
            trayIcon = undefined;
        };

        window.onbeforeunload = () => {
            closeTrayIcon();
        };

        return () => {
            document.removeEventListener('DOMContentLoaded', init);
            closeTrayIcon();
        };
    }, [intl]);

    return null;
};

export const TrayIconLoader = React.memo(TrayIconLoaderComponent);
