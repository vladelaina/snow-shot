'use client';

import { captureCurrentMonitor, ImageBuffer, ImageEncoder } from '@/commands';
import { EventListenerContext } from '@/components/eventListener';
import React, { useState } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import CaptureImageLayer, { CaptureImageLayerActionType } from './components/captureImageLayer';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import BlurImageLayer, { BlurImageLayerActionType } from './components/blurImageLayer';
import * as PIXI from 'pixi.js';
import { CanvasLayer, CaptureStep, DrawState } from './types';
import SelectLayer, { SelectLayerActionType } from './components/selectLayer';
import DrawLayer, { DrawLayerActionType } from './components/drawLayer';
import { Window as AppWindow, getCurrentWindow } from '@tauri-apps/api/window';

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

    // 状态
    const [captureStep, setCaptureStep] = useState<CaptureStep>(CaptureStep.Select);
    const [drawState, setDrawState] = useState<DrawState>(DrawState.Move);

    const switchLayer = useCallback((layer: CanvasLayer) => {
        if (layer === CanvasLayer.CaptureImage) {
            captureImageLayerActionRef.current?.enable();
            blurImageLayerActionRef.current?.disable();
            drawLayerActionRef.current?.disable();
            selectLayerActionRef.current?.disable();
        } else if (layer === CanvasLayer.BlurImage) {
            captureImageLayerActionRef.current?.disable();
            blurImageLayerActionRef.current?.enable();
            drawLayerActionRef.current?.disable();
            selectLayerActionRef.current?.disable();
        } else if (layer === CanvasLayer.Draw) {
            captureImageLayerActionRef.current?.disable();
            blurImageLayerActionRef.current?.disable();
            drawLayerActionRef.current?.enable();
            selectLayerActionRef.current?.disable();
        } else if (layer === CanvasLayer.Select || true) {
            captureImageLayerActionRef.current?.disable();
            blurImageLayerActionRef.current?.disable();
            drawLayerActionRef.current?.disable();
            selectLayerActionRef.current?.enable();
        }
    }, []);

    /** 截图准备 */
    const readyCapture = useCallback(async (imageBuffer: ImageBuffer) => {
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

        await Promise.all([
            captureImageLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
            blurImageLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
            drawLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
            selectLayerActionRef.current?.onCaptureReady(imageTexture, imageBuffer),
        ]);
    }, []);

    /** 显示截图窗口 */
    const showWindow = useCallback(
        async (imageBuffer: ImageBuffer) => {
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
        },
        [appWindowRef],
    );

    const hideWindow = useCallback(async () => {
        await appWindowRef.current.hide();
    }, [appWindowRef]);

    const finishCapture = useCallback(() => {
        imageBufferRef.current = undefined;
        captureImageLayerActionRef.current?.onCaptureFinish();
        blurImageLayerActionRef.current?.onCaptureFinish();
        drawLayerActionRef.current?.onCaptureFinish();
        selectLayerActionRef.current?.onCaptureFinish();
        setCaptureStep(CaptureStep.Select);
        setDrawState(DrawState.Move);
    }, []);

    /** 执行截图 */
    const excuteScreenshot = useCallback(async () => {
        // @test 测试
        if (imageBufferRef.current) {
            finishCapture();
            hideWindow();
            return;
        }

        // 发起截图
        const imageBuffer = await captureCurrentMonitor(ImageEncoder.WebP);
        imageBufferRef.current = imageBuffer;

        // 因为窗口是空的，所以窗口显示和图片显示先后顺序倒无所谓
        await Promise.all([showWindow(imageBuffer), readyCapture(imageBuffer)]);
    }, [finishCapture, hideWindow, readyCapture, showWindow]);

    useEffect(() => {
        // 监听截图命令
        const listenerId = addListener('execute-screenshot', excuteScreenshot);
        return () => {
            removeListener(listenerId);
        };
    }, [addListener, excuteScreenshot, removeListener]);

    useEffect(() => {
        if (captureStep === CaptureStep.Select) {
            switchLayer(CanvasLayer.Select);
            return;
        }

        if (drawState === DrawState.Move) {
            switchLayer(CanvasLayer.Select);
            return;
        }
    }, [captureStep, drawState, switchLayer]);

    // 默认隐藏
    useEffect(() => {
        hideWindow();
    }, [hideWindow]);

    return (
        <>
            <CaptureImageLayer actionRef={captureImageLayerActionRef} />
            <BlurImageLayer actionRef={blurImageLayerActionRef} />
            <DrawLayer actionRef={drawLayerActionRef} />
            <SelectLayer actionRef={selectLayerActionRef} />
        </>
    );
};

export default React.memo(DrawPageCore);
