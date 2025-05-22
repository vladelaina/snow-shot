'use client';

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { TrayIcon, TrayIconOptions } from '@tauri-apps/api/tray';
import { useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { Menu } from '@tauri-apps/api/menu';
import { useIntl } from 'react-intl';
import { exitApp } from '@/commands';
import { showWindow } from '@/utils/window';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { AppSettingsData, AppSettingsGroup, AppSettingsPublisher } from './contextWrap';
import { isEqual } from 'es-toolkit';
import { AppFunction, AppFunctionConfig } from './extra';
import { executeScreenshot, ScreenshotType } from '@/functions/screenshot';
import { useStateRef } from '@/hooks/useStateRef';
import {
    executeChat,
    executeChatSelectedText,
    executeTranslate,
    executeTranslateSelectedText,
} from '@/functions/tools';
import { openUrl } from '@tauri-apps/plugin-opener';

const TrayIconLoaderComponent = () => {
    const intl = useIntl();

    const [shortcutKeys, setShortcutKeys, shortcutKeysRef] = useStateRef<
        Record<AppFunction, AppFunctionConfig> | undefined
    >(undefined);
    useStateSubscriber(
        AppSettingsPublisher,
        useCallback(
            (settings: AppSettingsData, previous: AppSettingsData) => {
                if (
                    shortcutKeysRef.current !== undefined &&
                    isEqual(
                        settings[AppSettingsGroup.AppFunction],
                        previous[AppSettingsGroup.AppFunction],
                    )
                ) {
                    return;
                }

                setShortcutKeys(settings[AppSettingsGroup.AppFunction]);
            },
            [setShortcutKeys, shortcutKeysRef],
        ),
    );

    useEffect(() => {
        console.log(shortcutKeys);
        if (!shortcutKeys) {
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
                            id: `${appWindow.label}-screenshot`,
                            text: intl.formatMessage({ id: 'home.screenshot' }),
                            accelerator: shortcutKeys[AppFunction.Screenshot].shortcutKey,
                            action: async () => {
                                executeScreenshot();
                            },
                        },
                        {
                            id: `${appWindow.label}-screenshot-fixedTool`,
                            text: intl.formatMessage(
                                { id: 'home.screenshotAfter' },
                                {
                                    text: intl.formatMessage({ id: 'draw.fixedTool' }),
                                },
                            ),
                            accelerator: shortcutKeys[AppFunction.ScreenshotFixed].shortcutKey,
                            action: async () => {
                                executeScreenshot(ScreenshotType.Fixed);
                            },
                        },
                        {
                            id: `${appWindow.label}-screenshot-ocr`,
                            text: intl.formatMessage(
                                { id: 'home.screenshotAfter' },
                                {
                                    text: intl.formatMessage({ id: 'draw.ocrDetectTool' }),
                                },
                            ),
                            accelerator: shortcutKeys[AppFunction.ScreenshotOcr].shortcutKey,
                            action: async () => {
                                executeScreenshot(ScreenshotType.OcrDetect);
                            },
                        },
                        {
                            item: 'Separator',
                        },
                        {
                            id: `${appWindow.label}-chat`,
                            text: intl.formatMessage({ id: 'home.chat' }),
                            accelerator: shortcutKeys[AppFunction.Chat].shortcutKey,
                            action: async () => {
                                executeChat();
                            },
                        },
                        {
                            id: `${appWindow.label}-chat-selectText`,
                            text: intl.formatMessage({ id: 'home.chatSelectText' }),
                            accelerator: shortcutKeys[AppFunction.ChatSelectText].shortcutKey,
                            action: async () => {
                                executeChatSelectedText();
                            },
                        },
                        {
                            item: 'Separator',
                        },
                        {
                            id: `${appWindow.label}-translation`,
                            text: intl.formatMessage({ id: 'home.translation' }),
                            accelerator: shortcutKeys[AppFunction.Translation].shortcutKey,
                            action: async () => {
                                executeTranslate();
                            },
                        },
                        {
                            id: `${appWindow.label}-translation-selectText`,
                            text: intl.formatMessage({ id: 'home.translationSelectText' }),
                            accelerator:
                                shortcutKeys[AppFunction.TranslationSelectText].shortcutKey,
                            action: async () => {
                                executeTranslateSelectedText();
                            },
                        },
                        {
                            item: 'Separator',
                        },
                        {
                            id: `${appWindow.label}-about`,
                            text: intl.formatMessage({ id: 'home.about' }),
                            action: async () => {
                                openUrl('https://github.com/mg-chao/snow-shot');
                            },
                        },
                        {
                            item: 'Separator',
                        },
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

        window.addEventListener('beforeunload', () => {
            closeTrayIcon();
        });

        return () => {
            closeTrayIcon();
            window.removeEventListener('beforeunload', closeTrayIcon);
        };
    }, [intl, shortcutKeys]);

    return null;
};

export const TrayIconLoader = React.memo(TrayIconLoaderComponent);
