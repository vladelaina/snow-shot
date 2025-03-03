'use client';

import { EventCallback, listen, UnlistenFn } from '@tauri-apps/api/event';
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { attachConsole } from '@tauri-apps/plugin-log';
import { appLog, LogMessageEvent } from '@/utils/appLog';
import React from 'react';
import { MenuLayoutContext } from '@/app/menuLayout';
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import { ScreenshotContext } from '@/app/contextWrap';
import { captureCurrentMonitor, ImageEncoder } from '@/commands';

type Listener = {
    event: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: EventCallback<any>;
};

export type EventListenerContextType = {
    addListener: (event: string, listener: () => void) => number;
    removeListener: (id: number) => boolean;
};

export const EventListenerContext = createContext<EventListenerContextType>({
    addListener: () => 0,
    removeListener: () => false,
});
/**
 * 监听 tauri 的消息
 */
const EventListenerCore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { noLayout, pathname } = useContext(MenuLayoutContext);
    const appWindowRef = useRef<AppWindow | null>(null);
    const { setImageBuffer } = useContext(ScreenshotContext);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    const listenerCount = useRef<number>(0);
    const listenerMapRef = useRef<Map<number, Listener>>(new Map());
    const listenerEventMapRef = useRef<Map<string, Set<number>>>(new Map());
    const addListener = useCallback((event: string, listener: () => void) => {
        listenerCount.current++;
        const listenerId = listenerCount.current;
        listenerMapRef.current.set(listenerId, { event, callback: listener });

        let listenerList = listenerEventMapRef.current.get(event);
        if (!listenerList) {
            listenerList = new Set();
        }
        listenerList.add(listenerId);
        listenerEventMapRef.current.set(event, listenerList);

        return listenerId;
    }, []);
    const removeListener = useCallback((listenerId: number): boolean => {
        const listener = listenerMapRef.current.get(listenerId);
        if (!listener) {
            return false;
        }

        let res = true;
        res = (res && listenerEventMapRef.current.get(listener.event)?.delete(listenerId)) ?? false;
        res = res && listenerMapRef.current.delete(listenerId);

        return res;
    }, []);

    useEffect(() => {
        let detach: UnlistenFn;
        attachConsole().then((d) => {
            detach = d;
        });

        const unlistenList: UnlistenFn[] = [];
        const defaultListener: Listener[] = [];

        if (noLayout) {
            if (pathname === '/draw') {
                defaultListener.push({
                    event: 'execute-screenshot',
                    callback: async () => {
                        const buffer = await captureCurrentMonitor(ImageEncoder.WebP);
                        setImageBuffer(buffer);
                    },
                });
                defaultListener.push({
                    event: 'reload-app-settings',
                    callback: async () => {
                    },
                });
            }
        } else {
            defaultListener.push({
                event: 'log-message',
                callback: ({ payload }: { payload: LogMessageEvent }) => {
                    appLog(payload, undefined, 'APP_TAURI');
                },
            });
        }

        defaultListener
            .map((listener) => {
                const res: Listener = {
                    event: listener.event,
                    callback: (e) => {
                        listener.callback(e);
                        try {
                            listenerEventMapRef.current.get(listener.event)?.forEach((id) => {
                                listenerMapRef.current.get(id)?.callback(e);
                            });
                        } catch (error) {
                            console.error(error);
                        }
                    },
                };
                return res;
            })
            .forEach((listener) => {
                listen(listener.event, listener.callback).then((unlisten) => {
                    unlistenList.push(unlisten);
                });
            });

        return () => {
            detach?.();

            unlistenList.forEach((unlisten) => {
                unlisten();
            });
        };
    }, [noLayout, pathname, setImageBuffer]);
    return (
        <EventListenerContext.Provider value={{ addListener, removeListener }}>
            {children}
        </EventListenerContext.Provider>
    );
};

export const EventListener = React.memo(EventListenerCore);
