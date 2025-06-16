'use client';

import { EventListenerContext } from '@/components/eventListener';
import { MouseThroughIcon } from '@/components/icons';
import { fullScreenDrawChangeMouseThrough } from '@/functions/fullScreenDraw';
import { getCurrentWindow, PhysicalSize, PhysicalPosition } from '@tauri-apps/api/window';
import { Button, theme } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';

const PAGE_WIDTH = 256;
const PAGE_HEIGHT = 32;

export default function MouseThroughPage() {
    const { token } = theme.useToken();

    const [enable, setEnable] = useState(false);

    useEffect(() => {
        const appWindow = getCurrentWindow();
        const scaleFactor = window.devicePixelRatio;
        const physicalWidth = PAGE_WIDTH * scaleFactor;
        const physicalHeight = PAGE_HEIGHT * scaleFactor;

        const screenWidth = window.screen.width * scaleFactor;

        const centerX = (screenWidth - physicalWidth) / 2;

        appWindow.setSize(new PhysicalSize(physicalWidth, physicalHeight));
        appWindow.setPosition(new PhysicalPosition(centerX, 0));
    }, []);

    useEffect(() => {
        const appWindow = getCurrentWindow();
        if (enable) {
            appWindow.setIgnoreCursorEvents(false);
        } else {
            appWindow.setIgnoreCursorEvents(true);
        }
    }, [enable]);

    const { addListener, removeListener } = useContext(EventListenerContext);
    useEffect(() => {
        const listenerId = addListener('full-screen-draw-change-mouse-through', () => {
            setEnable(!enable);
        });

        const closeListenerId = addListener('close-full-screen-draw', () => {
            getCurrentWindow().close();
        });

        return () => {
            removeListener(listenerId);
            removeListener(closeListenerId);
        };
    }, [addListener, removeListener, enable]);

    return (
        <div className="container">
            <Button
                block
                icon={<MouseThroughIcon />}
                onClick={() => {
                    fullScreenDrawChangeMouseThrough();
                }}
            >
                <FormattedMessage id="fullScreenDraw.mouseThrough" />
            </Button>

            <style jsx>{`
                .container {
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    padding: 0 3px 3px 3px;
                    transition: opacity ${token.motionDurationMid} ${token.motionEaseInOut};

                    ${enable ? 'opacity: 0.42;' : 'opacity: 0 !important;'}
                }

                .container:hover {
                    opacity: 1;
                }

                .container :global(.ant-btn) {
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                    border-top: unset;
                }
            `}</style>
        </div>
    );
}
