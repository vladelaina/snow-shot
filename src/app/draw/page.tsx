'use client';

import { captureCurrentMonitor, ImageBuffer, ImageEncoder } from '@/commands';
import { EventListenerContext } from '@/components/eventListener';
import React, { useMemo } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import * as PIXI from 'pixi.js';
import { CanvasLayer, CaptureStep, DrawContext, DrawContextType, DrawState } from './types';
import SelectLayer, { SelectLayerActionType } from './components/selectLayer';
import DrawLayer, { DrawLayerActionType } from './components/drawLayer';
import { Window as AppWindow, getCurrentWindow } from '@tauri-apps/api/window';
import {
    CaptureLoadingPublisher,
    DrawStatePublisher,
    CaptureStepPublisher,
    switchLayer,
} from './extra';
import { DrawToolbar, DrawToolbarActionType } from './components/drawToolbar';
import { BaseLayerEventActionType } from './components/baseLayer';
import { ColorPicker } from './components/colorPicker';
import { HistoryContext, withCanvasHistory } from './components/historyContext';
import { withStatePublisher } from '@/hooks/useStatePublisher';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import StatusBar from './components/statusBar';
import { MousePosition } from '@/utils/mousePosition';
import { EnableKeyEventPublisher } from './components/drawToolbar/components/keyEventWrap/extra';
import { zIndexs } from '@/utils/zIndex';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import { DrawCacheLayerActionType } from './components/drawCacheLayer/extra';

const DrawCacheLayer = dynamic(
    async () => (await import('./components/drawCacheLayer')).DrawCacheLayer,
    {
        ssr: false,
    },
);

const DrawPageCore: React.FC = () => {
    const appWindowRef = useRef<AppWindow>(undefined as unknown as AppWindow);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    // 截图原始数据
    const imageBufferRef = useRef<ImageBuffer | undefined>(undefined);
    const imageBlobUrlRef = useRef<string | undefined>(undefined);
    const { addListener, removeListener } = useContext(EventListenerContext);

    // 层级
    const drawLayerActionRef = useRef<DrawLayerActionType | undefined>(undefined);
    const drawCacheLayerActionRef = useRef<DrawCacheLayerActionType | undefined>(undefined);
    const selectLayerActionRef = useRef<SelectLayerActionType | undefined>(undefined);
    const drawToolbarActionRef = useRef<DrawToolbarActionType | undefined>(undefined);

    // 状态
    const mousePositionRef = useRef<MousePosition>(new MousePosition(0, 0));
    const [getCaptureStep, , resetCaptureStep] = useStateSubscriber(
        CaptureStepPublisher,
        undefined,
    );
    const [getDrawState, , resetDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    const [, setCaptureLoading] = useStateSubscriber(CaptureLoadingPublisher, undefined);
    const onCaptureLoad = useCallback<BaseLayerEventActionType['onCaptureLoad']>(async () => {
        await Promise.all([
            drawLayerActionRef.current?.onCaptureLoad(),
            selectLayerActionRef.current?.onCaptureLoad(),
        ]);
    }, []);
    const capturingRef = useRef(false);
    const { history } = useContext(HistoryContext);
    const circleCursorRef = useRef<HTMLDivElement>(null);

    const handleLayerSwitch = useCallback((layer: CanvasLayer) => {
        switchLayer(layer, drawLayerActionRef.current, selectLayerActionRef.current);
    }, []);
    const onCaptureStepDrawStateChange = useCallback(() => {
        const captureStep = getCaptureStep();
        const drawState = getDrawState();

        if (captureStep === CaptureStep.Select) {
            handleLayerSwitch(CanvasLayer.Select);
            return;
        } else if (captureStep === CaptureStep.Draw) {
            if (drawState === DrawState.Select || drawState === DrawState.Idle) {
                handleLayerSwitch(CanvasLayer.Select);
                drawCacheLayerActionRef.current?.setEnable(false);
                return;
            }

            handleLayerSwitch(CanvasLayer.Draw);
            return;
        }

        handleLayerSwitch(CanvasLayer.Select);
    }, [getCaptureStep, getDrawState, handleLayerSwitch]);
    useStateSubscriber(CaptureStepPublisher, onCaptureStepDrawStateChange);
    useStateSubscriber(DrawStatePublisher, onCaptureStepDrawStateChange);

    /** 截图准备 */
    const readyCapture = useCallback(
        async (imageBuffer: ImageBuffer) => {
            capturingRef.current = true;
            setCaptureLoading(true);
            drawToolbarActionRef.current?.setEnable(false);

            if (imageBlobUrlRef.current) {
                const tempUrl = imageBlobUrlRef.current;
                // 延迟释放 URL，提速
                setTimeout(() => {
                    URL.revokeObjectURL(tempUrl);
                }, 0);
            }

            imageBlobUrlRef.current = URL.createObjectURL(new Blob([imageBuffer.data]));
            const imageTexture = await PIXI.Assets.load<PIXI.Texture>({
                src: imageBlobUrlRef.current,
                loadParser: 'loadTextures',
            });
            mousePositionRef.current = new MousePosition(
                Math.floor(imageBuffer.mouseX / imageBuffer.monitorScaleFactor),
                Math.floor(imageBuffer.mouseY / imageBuffer.monitorScaleFactor),
            );

            await Promise.all([
                drawLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
                selectLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
                drawCacheLayerActionRef.current?.onCaptureReady(),
            ]);
            setCaptureLoading(false);

            onCaptureLoad();
        },
        [onCaptureLoad, setCaptureLoading],
    );

    /** 显示截图窗口 */
    const showWindow = useCallback(async (imageBuffer: ImageBuffer) => {
        const appWindow = appWindowRef.current;

        const { monitorX, monitorY } = imageBuffer;

        await Promise.all([
            appWindow.setAlwaysOnTop(true),
            appWindow.setPosition(new PhysicalPosition(monitorX, monitorY)),
        ]);
        await Promise.all([appWindow.setFullscreen(true), appWindow.show()]);
        if (process.env.NODE_ENV === 'development') {
            appWindow.setAlwaysOnTop(false);
        }
    }, []);

    const hideWindow = useCallback(async () => {
        await appWindowRef.current.hide();
    }, []);

    const finishCapture = useCallback<DrawContextType['finishCapture']>(async () => {
        hideWindow();
        await Promise.all([
            drawLayerActionRef.current?.onCaptureFinish(),
            selectLayerActionRef.current?.onCaptureFinish(),
            drawCacheLayerActionRef.current?.onCaptureFinish(),
        ]);
        imageBufferRef.current = undefined;
        resetCaptureStep();
        resetDrawState();
        drawToolbarActionRef.current?.setEnable(false);
        capturingRef.current = false;
        history.clear();
    }, [hideWindow, resetCaptureStep, resetDrawState, history]);

    /** 执行截图 */
    const excuteScreenshot = useCallback(async () => {
        const layerOnExecuteScreenshotPromise = Promise.all([
            drawLayerActionRef.current?.onExecuteScreenshot(),
            selectLayerActionRef.current?.onExecuteScreenshot(),
        ]);

        // 发起截图
        const imageBuffer = await captureCurrentMonitor(ImageEncoder.WebP);
        imageBufferRef.current = imageBuffer;

        // 因为窗口是空的，所以窗口显示和图片显示先后顺序倒无所谓
        await Promise.all([
            showWindow(imageBuffer),
            readyCapture(imageBuffer),
            layerOnExecuteScreenshotPromise,
        ]);
    }, [readyCapture, showWindow]);

    useEffect(() => {
        // 监听截图命令
        const listenerId = addListener('execute-screenshot', () => {
            if (capturingRef.current) {
                return;
            }

            excuteScreenshot();
        });
        return () => {
            removeListener(listenerId);
        };
    }, [addListener, excuteScreenshot, removeListener]);

    // 默认隐藏
    useEffect(() => {
        hideWindow();
    }, [hideWindow]);

    const drawContextValue = useMemo<DrawContextType>(() => {
        return {
            finishCapture,
            drawLayerActionRef,
            selectLayerActionRef,
            imageBufferRef,
            drawToolbarActionRef,
            mousePositionRef,
            circleCursorRef,
            drawCacheLayerActionRef,
        };
    }, [finishCapture]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePositionRef.current = new MousePosition(e.clientX, e.clientY);
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <DrawContext.Provider value={drawContextValue}>
            <DrawLayer actionRef={drawLayerActionRef} />
            <DrawCacheLayer actionRef={drawCacheLayerActionRef} />
            <SelectLayer actionRef={selectLayerActionRef} />
            <DrawToolbar actionRef={drawToolbarActionRef} onCancel={finishCapture} />
            <ColorPicker
                onCopyColor={() => {
                    finishCapture();
                }}
            />
            <StatusBar />

            <div
                ref={circleCursorRef}
                className={styles.drawToolbarCursor}
                style={{ zIndex: zIndexs.Draw_Cursor }}
            />
        </DrawContext.Provider>
    );
};

export default React.memo(
    withCanvasHistory(
        withStatePublisher(
            DrawPageCore,
            CaptureStepPublisher,
            DrawStatePublisher,
            CaptureLoadingPublisher,
            EnableKeyEventPublisher,
        ),
    ),
);
