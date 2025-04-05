'use client';

import { captureCurrentMonitor, ImageBuffer, ImageEncoder } from '@/commands';
import { EventListenerContext } from '@/components/eventListener';
import React, { useMemo } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import CaptureImageLayer, { CaptureImageLayerActionType } from './components/captureImageLayer';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import BlurImageLayer, { BlurImageLayerActionType } from './components/blurImageLayer';
import * as PIXI from 'pixi.js';
import { CanvasLayer, CaptureStep, DrawContext, DrawContextType, DrawState } from './types';
import SelectLayer, { SelectLayerActionType } from './components/selectLayer';
import DrawLayer, { DrawLayerActionType } from './components/drawLayer';
import { Window as AppWindow, getCurrentWindow } from '@tauri-apps/api/window';
import { switchLayer } from './extra';
import { DrawToolbar, DrawToolbarActionType } from './components/drawToolbar';
import { BaseLayerEventActionType } from './components/baseLayer';
import { ColorPicker } from './components/colorPicker';
import { HistoryProvider } from './components/historyContext';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import StatusBar from './components/statusBar';
import { MousePosition } from '@/utils/mousePosition';
import { EnableKeyEventPublisher } from './components/drawToolbar/components/keyEventWrap/extra';

export const CaptureStepPublisher = createPublisher<CaptureStep>(CaptureStep.Select);
export const DrawStatePublisher = createPublisher<DrawState>(DrawState.Idle);
export const CaptureLoadingPublisher = createPublisher<boolean>(true);

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
    const captureImageLayerActionRef = useRef<CaptureImageLayerActionType | undefined>(undefined);
    const blurImageLayerActionRef = useRef<BlurImageLayerActionType | undefined>(undefined);
    const drawLayerActionRef = useRef<DrawLayerActionType | undefined>(undefined);
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
            captureImageLayerActionRef.current?.onCaptureLoad(),
            blurImageLayerActionRef.current?.onCaptureLoad(),
            drawLayerActionRef.current?.onCaptureLoad(),
            selectLayerActionRef.current?.onCaptureLoad(),
        ]);
    }, []);

    /** 截图准备 */
    const readyCapture = useCallback(
        async (imageBuffer: ImageBuffer) => {
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
                captureImageLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
                blurImageLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
                drawLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
                selectLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
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

    const finishCapture = useCallback<DrawContextType['finishCapture']>(() => {
        imageBufferRef.current = undefined;
        captureImageLayerActionRef.current?.onCaptureFinish();
        blurImageLayerActionRef.current?.onCaptureFinish();
        drawLayerActionRef.current?.onCaptureFinish();
        selectLayerActionRef.current?.onCaptureFinish();
        resetCaptureStep();
        resetDrawState();
        hideWindow();
        drawToolbarActionRef.current?.setEnable(false);
    }, [hideWindow, resetCaptureStep, resetDrawState]);

    /** 执行截图 */
    const excuteScreenshot = useCallback(async () => {
        // @test 测试
        if (imageBufferRef.current) {
            finishCapture();
            window.location.reload();
            return;
        }

        const layerOnExecuteScreenshotPromise = Promise.all([
            captureImageLayerActionRef.current?.onExecuteScreenshot(),
            blurImageLayerActionRef.current?.onExecuteScreenshot(),
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
    }, [finishCapture, readyCapture, showWindow]);

    useEffect(() => {
        // 监听截图命令
        const listenerId = addListener('execute-screenshot', excuteScreenshot);
        return () => {
            removeListener(listenerId);
        };
    }, [addListener, excuteScreenshot, removeListener]);

    const handleLayerSwitch = useCallback((layer: CanvasLayer) => {
        switchLayer(
            layer,
            captureImageLayerActionRef.current,
            blurImageLayerActionRef.current,
            drawLayerActionRef.current,
            selectLayerActionRef.current,
        );
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
                return;
            }

            handleLayerSwitch(CanvasLayer.Draw);
            return;
        }

        handleLayerSwitch(CanvasLayer.Select);
    }, [getCaptureStep, getDrawState, handleLayerSwitch]);
    useStateSubscriber(CaptureStepPublisher, onCaptureStepDrawStateChange);
    useStateSubscriber(DrawStatePublisher, onCaptureStepDrawStateChange);

    // 默认隐藏
    useEffect(() => {
        hideWindow();
    }, [hideWindow]);

    const drawContextValue = useMemo(() => {
        return {
            finishCapture,
            captureImageLayerActionRef,
            blurImageLayerActionRef,
            drawLayerActionRef,
            selectLayerActionRef,
            imageBufferRef,
            drawToolbarActionRef,
            mousePositionRef,
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
            <HistoryProvider>
                <CaptureImageLayer actionRef={captureImageLayerActionRef} />
                <BlurImageLayer actionRef={blurImageLayerActionRef} />
                <DrawLayer actionRef={drawLayerActionRef} />
                <SelectLayer actionRef={selectLayerActionRef} />
                <DrawToolbar actionRef={drawToolbarActionRef} />
                <ColorPicker />
                <StatusBar />
            </HistoryProvider>
        </DrawContext.Provider>
    );
};

export default React.memo(
    withStatePublisher(
        DrawPageCore,
        CaptureStepPublisher,
        DrawStatePublisher,
        CaptureLoadingPublisher,
        EnableKeyEventPublisher,
    ),
);
