'use client';

import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useContext, useEffect, useRef } from 'react';
import { attachConsole } from '@tauri-apps/plugin-log';
import { appLog, LogMessageEvent } from '@/utils/appLog';
import React from 'react';
import { MenuLayoutContext } from '@/app/menuLayout';
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import { ScreenshotContext } from '@/app/contextWrap';
import { captureCurrentMonitor, ImageEncoder } from '@/commands';

/**
 * 监听 tauri 的消息
 */
const EventListenerCore: React.FC = () => {
    const { noLayout, pathname } = useContext(MenuLayoutContext);
    const appWindowRef = useRef<AppWindow | null>(null);
    const { setImageBuffer } = useContext(ScreenshotContext);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    useEffect(() => {
        let detach: UnlistenFn;
        attachConsole().then((d) => {
            detach = d;
        });

        const listenerList: UnlistenFn[] = [];

        if (noLayout) {
            if (pathname === '/draw') {
                listen('execute-screenshot', async () => {
                    const buffer = await captureCurrentMonitor(ImageEncoder.WebP);
                    setImageBuffer(buffer);
                }).then((listener) => {
                    listenerList.push(listener);
                });
            }
        } else {
            listen('log-message', ({ payload }: { payload: LogMessageEvent }) => {
                appLog(payload, undefined, 'APP_TAURI');
            }).then((listener) => {
                listenerList.push(listener);
            });
        }

        return () => {
            detach?.();

            listenerList.forEach((listener) => {
                listener();
            });
        };
    }, [noLayout, pathname, setImageBuffer]);
    return <></>;
};

export const EventListener = React.memo(EventListenerCore);
