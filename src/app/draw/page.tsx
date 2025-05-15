'use client';

import { captureCurrentMonitor, ImageBuffer, ImageEncoder } from '@/commands';
import { EventListenerContext } from '@/components/eventListener';
import React, { useMemo, useState } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi';
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
    CaptureEventPublisher,
    CaptureEvent,
    ScreenshotTypePublisher,
} from './extra';
import { DrawToolbar, DrawToolbarActionType } from './components/drawToolbar';
import { BaseLayerEventActionType } from './components/baseLayer';
import { ColorPicker, ColorPickerActionType } from './components/colorPicker';
import { HistoryContext, withCanvasHistory } from './components/historyContext';
import { withStatePublisher } from '@/hooks/useStatePublisher';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import StatusBar from './components/statusBar';
import { MousePosition } from '@/utils/mousePosition';
import { EnableKeyEventPublisher } from './components/drawToolbar/components/keyEventWrap/extra';
import { zIndexs } from '@/utils/zIndex';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import {
    DrawCacheLayerActionType,
    ExcalidrawOnChangePublisher,
    ExcalidrawOnHandleEraserPublisher,
} from './components/drawCacheLayer/extra';
import { copyToClipboard, fixedToScreen, handleOcrDetect, saveToFile } from './actions';
import { FixedImage, FixedImageActionType } from './components/fixedImage';
import { OcrBlocks, OcrBlocksActionType } from './components/ocrBlocks';
import { ocrInit } from '@/commands/ocr';
import { ScreenshotType } from '@/functions/screenshot';
import { showWindow as showCurrentWindow } from '@/utils/window';
import _ from 'lodash';
import { switchAlwaysOnTop } from '@/commands/screenshot';

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
    const layerContainerRef = useRef<HTMLDivElement>(null);
    const drawLayerActionRef = useRef<DrawLayerActionType | undefined>(undefined);
    const drawCacheLayerActionRef = useRef<DrawCacheLayerActionType | undefined>(undefined);
    const selectLayerActionRef = useRef<SelectLayerActionType | undefined>(undefined);
    const drawToolbarActionRef = useRef<DrawToolbarActionType | undefined>(undefined);
    const colorPickerActionRef = useRef<ColorPickerActionType | undefined>(undefined);
    const [isFixed, setIsFixed] = useState(false);
    const fixedImageActionRef = useRef<FixedImageActionType | undefined>(undefined);
    const ocrBlocksActionRef = useRef<OcrBlocksActionType | undefined>(undefined);

    // 状态
    const mousePositionRef = useRef<MousePosition>(new MousePosition(0, 0));
    const [getScreenshotType, setScreenshotType, resetScreenshotType] = useStateSubscriber(
        ScreenshotTypePublisher,
        undefined,
    );
    const [getCaptureStep, setCaptureStep, resetCaptureStep] = useStateSubscriber(
        CaptureStepPublisher,
        undefined,
    );
    const [getDrawState, , resetDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    const [, setCaptureLoading] = useStateSubscriber(CaptureLoadingPublisher, undefined);
    const [, setCaptureEvent] = useStateSubscriber(CaptureEventPublisher, undefined);
    const onCaptureLoad = useCallback<BaseLayerEventActionType['onCaptureLoad']>(
        async (texture: PIXI.Texture, imageBuffer: ImageBuffer) => {
            await Promise.all([drawLayerActionRef.current?.onCaptureLoad(texture, imageBuffer)]);

            setCaptureEvent({
                event: CaptureEvent.onCaptureLoad,
                params: [texture, imageBuffer],
            });
        },
        [setCaptureEvent],
    );
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
            if (drawState === DrawState.Idle) {
                handleLayerSwitch(CanvasLayer.Select);
                drawCacheLayerActionRef.current?.setEnable(false);
                return;
            }

            handleLayerSwitch(CanvasLayer.Draw);
            return;
        }

        handleLayerSwitch(CanvasLayer.Select);
    }, [getCaptureStep, getDrawState, handleLayerSwitch]);
    const onCaptureStepDrawStateChangeDebounce = useMemo(() => {
        return _.debounce(onCaptureStepDrawStateChange, 0);
    }, [onCaptureStepDrawStateChange]);
    useStateSubscriber(CaptureStepPublisher, onCaptureStepDrawStateChangeDebounce);
    useStateSubscriber(DrawStatePublisher, onCaptureStepDrawStateChangeDebounce);

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
            setCaptureEvent({
                event: CaptureEvent.onCaptureReady,
                params: [imageTexture, imageBuffer],
            });
            setCaptureLoading(false);

            onCaptureLoad(imageTexture, imageBuffer);
        },
        [onCaptureLoad, setCaptureLoading, setCaptureEvent],
    );

    /** 显示截图窗口 */
    const showWindow = useCallback(
        async (imageBuffer: ImageBuffer) => {
            const appWindow = appWindowRef.current;

            const { monitorX, monitorY, monitorWidth, monitorHeight } = imageBuffer;

            await Promise.all([
                appWindow.setAlwaysOnTop(true),
                appWindow.setPosition(new PhysicalPosition(monitorX, monitorY)),
                appWindow.setSize(new PhysicalSize(monitorWidth, monitorHeight)),
            ]);
            if (layerContainerRef.current) {
                layerContainerRef.current.style.width = `${window.screen.width}px`;
                layerContainerRef.current.style.height = `${window.screen.height}px`;
            }
            await showCurrentWindow();
            if (
                process.env.NODE_ENV === 'development' &&
                getScreenshotType() !== ScreenshotType.TopWindow
            ) {
                await appWindow.setAlwaysOnTop(false);
            }
        },
        [getScreenshotType],
    );

    const hideWindow = useCallback(async () => {
        await appWindowRef.current.hide();
    }, []);

    const finishCapture = useCallback<DrawContextType['finishCapture']>(async () => {
        window.getSelection()?.removeAllRanges();
        await Promise.all([
            drawLayerActionRef.current?.onCaptureFinish(),
            selectLayerActionRef.current?.onCaptureFinish(),
            drawCacheLayerActionRef.current?.onCaptureFinish(),
        ]);
        hideWindow();
        setCaptureEvent({
            event: CaptureEvent.onCaptureFinish,
        });
        imageBufferRef.current = undefined;
        resetCaptureStep();
        resetDrawState();
        resetScreenshotType();
        drawToolbarActionRef.current?.setEnable(false);
        capturingRef.current = false;
        history.clear();
    }, [
        hideWindow,
        setCaptureEvent,
        resetCaptureStep,
        resetDrawState,
        history,
        resetScreenshotType,
    ]);

    /** 执行截图 */
    const excuteScreenshot = useCallback(
        async (excuteScreenshotType: ScreenshotType) => {
            setScreenshotType(excuteScreenshotType);
            const layerOnExecuteScreenshotPromise = Promise.all([
                drawLayerActionRef.current?.onExecuteScreenshot(),
                selectLayerActionRef.current?.onExecuteScreenshot(),
            ]);
            setCaptureEvent({
                event: CaptureEvent.onExecuteScreenshot,
            });

            // 发起截图
            const imageBuffer = await captureCurrentMonitor(ImageEncoder.WebP);
            imageBufferRef.current = imageBuffer;

            // 因为窗口是空的，所以窗口显示和图片显示先后顺序倒无所谓
            await Promise.all([
                showWindow(imageBuffer),
                readyCapture(imageBuffer),
                layerOnExecuteScreenshotPromise,
            ]);
        },
        [setScreenshotType, setCaptureEvent, showWindow, readyCapture],
    );

    const onSave = useCallback(async () => {
        if (
            !selectLayerActionRef.current ||
            !drawLayerActionRef.current ||
            !drawCacheLayerActionRef.current
        ) {
            return;
        }

        saveToFile(
            selectLayerActionRef.current,
            drawLayerActionRef.current,
            drawCacheLayerActionRef.current,
            async () => {
                finishCapture();
            },
        );
    }, [finishCapture]);

    const onFixed = useCallback(async () => {
        if (
            !layerContainerRef.current ||
            !selectLayerActionRef.current ||
            !imageBufferRef.current ||
            !drawLayerActionRef.current ||
            !drawCacheLayerActionRef.current ||
            !fixedImageActionRef.current ||
            !ocrBlocksActionRef.current
        ) {
            return;
        }

        await fixedToScreen(
            imageBufferRef.current,
            appWindowRef.current,
            layerContainerRef.current,
            selectLayerActionRef.current,
            drawLayerActionRef.current,
            drawCacheLayerActionRef.current,
            fixedImageActionRef.current,
            ocrBlocksActionRef.current,
            setCaptureStep,
        );

        switchLayer(undefined, drawLayerActionRef.current, selectLayerActionRef.current);
    }, [setCaptureStep]);

    const onTopWindow = useCallback(async () => {
        const windowId = selectLayerActionRef.current?.getWindowId();

        if (windowId) {
            await switchAlwaysOnTop(windowId);
        }

        await finishCapture();
    }, [finishCapture]);

    const onOcrDetect = useCallback(async () => {
        if (
            !imageBufferRef.current ||
            !selectLayerActionRef.current ||
            !drawLayerActionRef.current ||
            !drawCacheLayerActionRef.current ||
            !ocrBlocksActionRef.current
        ) {
            return;
        }

        handleOcrDetect(
            imageBufferRef.current,
            selectLayerActionRef.current,
            drawLayerActionRef.current,
            drawCacheLayerActionRef.current,
            ocrBlocksActionRef.current,
        );
    }, []);

    const onCopyToClipboard = useCallback(async () => {
        const selected = window.getSelection();
        if (getDrawState() === DrawState.OcrDetect && selected && selected.toString()) {
            navigator.clipboard.writeText(selected.toString());
            finishCapture();
            return;
        }

        if (
            !selectLayerActionRef.current ||
            !drawLayerActionRef.current ||
            !drawCacheLayerActionRef.current
        ) {
            return;
        }

        copyToClipboard(
            selectLayerActionRef.current,
            drawLayerActionRef.current,
            drawCacheLayerActionRef.current,
            async () => {
                finishCapture();
            },
        );
    }, [finishCapture, getDrawState]);

    useEffect(() => {
        if (isFixed) {
            return;
        }

        // 监听截图命令
        const listenerId = addListener('execute-screenshot', (args) => {
            if (capturingRef.current) {
                return;
            }

            excuteScreenshot((args as { payload: { type: ScreenshotType } }).payload.type);
        });

        const finishListenerId = addListener('finish-screenshot', () => {
            finishCapture();
        });

        return () => {
            removeListener(listenerId);
            removeListener(finishListenerId);
        };
    }, [addListener, excuteScreenshot, removeListener, isFixed, finishCapture]);

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
            ocrBlocksActionRef,
            fixedImageActionRef,
            colorPickerActionRef,
        };
    }, [finishCapture]);

    useEffect(() => {
        if (isFixed) {
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            mousePositionRef.current = new MousePosition(e.clientX, e.clientY);
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isFixed]);

    const ocrInitRef = useRef(false);
    useEffect(() => {
        if (ocrInitRef.current) {
            return;
        }

        ocrInit();
        ocrInitRef.current = true;
    }, []);

    useEffect(() => {
        document.oncopy = function () {
            if (getCaptureStep() === CaptureStep.Fixed) {
                return true;
            }

            return false;
        };
    }, [getCaptureStep, onCopyToClipboard]);

    return (
        <DrawContext.Provider value={drawContextValue}>
            <div className={styles.layerContainer} ref={layerContainerRef}>
                <FixedImage
                    actionRef={fixedImageActionRef}
                    onLoad={() => {
                        setIsFixed(true);
                    }}
                />
                <OcrBlocks actionRef={ocrBlocksActionRef} />
                {!isFixed && (
                    <>
                        <DrawLayer actionRef={drawLayerActionRef} />
                        <DrawCacheLayer actionRef={drawCacheLayerActionRef} />
                        <SelectLayer actionRef={selectLayerActionRef} />
                        <DrawToolbar
                            actionRef={drawToolbarActionRef}
                            onCancel={finishCapture}
                            onSave={onSave}
                            onFixed={onFixed}
                            onCopyToClipboard={onCopyToClipboard}
                            onOcrDetect={onOcrDetect}
                            onTopWindow={onTopWindow}
                        />
                        <ColorPicker
                            onCopyColor={() => {
                                finishCapture();
                            }}
                            actionRef={colorPickerActionRef}
                        />
                        <StatusBar />

                        <div
                            ref={circleCursorRef}
                            className={styles.drawToolbarCursor}
                            style={{ zIndex: zIndexs.Draw_Cursor }}
                        />
                    </>
                )}
            </div>
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
            ExcalidrawOnChangePublisher,
            CaptureEventPublisher,
            ExcalidrawOnHandleEraserPublisher,
            ScreenshotTypePublisher,
        ),
    ),
);
