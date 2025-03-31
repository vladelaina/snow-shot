'use client';

import { theme } from 'antd';
import { zIndexs } from '@/utils/zIndex';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCurrentWindow, Window as AppWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { CaptureStep, DrawContext, DrawState } from '@/app/draw/types';
import { KeyEventKey, KeyEventWrap } from '../drawToolbar/components/keyEventWrap';
import { useCallbackRender, useCallbackRenderSlow } from '@/hooks/useCallbackRender';
import { MousePosition } from '@/utils/mousePosition';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { CaptureLoadingPublisher, CaptureStepPublisher, DrawStatePublisher } from '../../page';

const previewScale = 12;
const previewPickerSize = 10 + 1;
const previewCanvasSize = previewPickerSize * previewScale;

export const isEnableColorPicker = (
    captureStep: CaptureStep,
    drawState: DrawState,
    captureLoading: boolean,
) => {
    return (
        (captureStep === CaptureStep.Select ||
            (captureStep === CaptureStep.Draw && drawState === DrawState.Idle)) &&
        !captureLoading
    );
};

const ColorPickerCore: React.FC<{
    onCopyColor?: () => void;
}> = ({ onCopyColor }) => {
    const [getCaptureStep] = useStateSubscriber(CaptureStepPublisher, undefined);
    const [getDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    const [enableKeyEvent, setEnableKeyEvent] = useState(false);
    const onCaptureLoadingChange = useCallback((captureLoading: boolean) => {
        setEnableKeyEvent(!captureLoading);
    }, []);
    const [getCaptureLoading] = useStateSubscriber(CaptureLoadingPublisher, onCaptureLoadingChange);

    const { token } = theme.useToken();

    const { imageBufferRef, captureImageLayerActionRef } = useContext(DrawContext);

    const appWindowRef = useRef<AppWindow | undefined>(undefined);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    const colorPickerRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const latestTransformRef = useRef<{ left: number; top: number }>({
        left: 0,
        top: 0,
    });

    const initPreviewCanvas = useCallback(() => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas) {
            return;
        }

        const ctx = previewCanvas.getContext('2d');
        if (!ctx) {
            return;
        }

        previewCanvasCtxRef.current = ctx;
        previewCanvas.width = previewCanvasSize;
        previewCanvas.height = previewCanvasSize;
    }, []);
    const initImageData = useCallback(() => {
        const canvasApp = captureImageLayerActionRef.current?.getCanvasApp();
        if (!canvasApp) {
            return;
        }

        requestAnimationFrame(() => {
            currentCanvasImageDataRef.current = canvasApp.renderer.extract
                .canvas(canvasApp.stage)
                .getContext('2d')
                ?.getImageData(
                    0,
                    0,
                    imageBufferRef.current!.monitorWidth,
                    imageBufferRef.current!.monitorHeight,
                    {
                        colorSpace: 'srgb',
                    },
                );
        });
    }, [captureImageLayerActionRef, imageBufferRef]);
    const enableRef = useRef(false);
    const [enable, _setEnable] = useState(enableRef.current);
    const setEnable = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
        enableRef.current = typeof value === 'function' ? value(enableRef.current) : value;
        _setEnable(enableRef.current);
    }, []);
    const onEnableChange = useCallback(
        (enable: boolean) => {
            if (!enable) {
                return;
            }

            setEnable(enable);
            initPreviewCanvas();
            initImageData();
        },
        [initImageData, initPreviewCanvas, setEnable],
    );
    const updateEnable = useCallback(() => {
        const enable = isEnableColorPicker(getCaptureStep(), getDrawState(), getCaptureLoading());

        if (enableRef.current === enable) {
            return;
        }

        onEnableChange(enable);
    }, [getCaptureLoading, getCaptureStep, getDrawState, onEnableChange]);
    useStateSubscriber(CaptureStepPublisher, updateEnable);
    useStateSubscriber(DrawStatePublisher, updateEnable);
    useStateSubscriber(CaptureLoadingPublisher, updateEnable);

    const currentCanvasImageDataRef = useRef<ImageData | undefined>(undefined);

    const colorRef = useRef({
        red: 0,
        green: 0,
        blue: 0,
    });
    // usestate 的性能太低了，直接用 ref 更新
    const colorElementRef = useRef<HTMLDivElement>(null);
    const previewColorElementRef = useRef<HTMLDivElement>(null);
    const updateColor = useCallback((red: number, green: number, blue: number) => {
        colorRef.current.red = red;
        colorRef.current.green = green;
        colorRef.current.blue = blue;
        colorElementRef.current!.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
        colorElementRef.current!.style.color =
            red + green + blue < 383 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.88)';
        colorElementRef.current!.textContent = `RGB (${red}, ${green}, ${blue})`;
        previewColorElementRef.current!.style.boxShadow = `0 0 0 1px ${colorElementRef.current!.style.color}`;
    }, []);

    const pickerPositionElementRef = useRef<HTMLDivElement>(null);
    const pickerPositionRef = useRef<MousePosition>(new MousePosition(0, 0));
    const updatePickerPosition = useCallback((x: number, y: number) => {
        pickerPositionRef.current.mouseX = x;
        pickerPositionRef.current.mouseY = y;
        pickerPositionElementRef.current!.textContent = `X: ${x} Y: ${y}`;
    }, []);

    const moveCursorFinishedRef = useRef(true);
    const moveCursorFinishedTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const updateImageDataPutImage = useCallback(
        (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            ctx.clearRect(0, 0, previewCanvasSize, previewCanvasSize);
            ctx.putImageData(
                currentCanvasImageDataRef.current!,
                -x,
                -y,
                x,
                y,
                previewPickerSize,
                previewPickerSize,
            );
        },
        [],
    );
    const updateImageDataPutImageRender = useCallbackRender(updateImageDataPutImage);
    const updateImageData = useCallback(
        async (mouseX: number, mouseY: number, physicalX?: number, physicalY?: number) => {
            if (!currentCanvasImageDataRef.current) {
                return;
            }

            // 延迟一下阻止鼠标事件触发
            if (moveCursorFinishedTimeoutRef.current) {
                clearTimeout(moveCursorFinishedTimeoutRef.current);
            }
            moveCursorFinishedTimeoutRef.current = setTimeout(() => {
                moveCursorFinishedRef.current = true;
                moveCursorFinishedTimeoutRef.current = undefined;
            }, 256);

            // 带宽限制，暂时不从系统获取 mouseposition
            // let [mouseX, mouseY] = await getMousePosition();
            // mouseX = Math.min(
            //     Math.max(0, mouseX - imageBufferRef.current!.monitorX),
            //     imageBufferRef.current!.monitorWidth,
            // );
            // mouseY = Math.min(
            //     Math.max(0, mouseY - imageBufferRef.current!.monitorY),
            //     imageBufferRef.current!.monitorHeight,
            // );

            mouseX = physicalX ?? Math.floor(mouseX * imageBufferRef.current!.monitorScaleFactor);
            mouseY = physicalY ?? Math.floor(mouseY * imageBufferRef.current!.monitorScaleFactor);

            const ctx = previewCanvasCtxRef.current!;
            const halfPickerSize = Math.floor(previewPickerSize / 2);
            // 将数据绘制到预览画布
            const x = Math.floor(mouseX - halfPickerSize);
            const y = Math.floor(mouseY - halfPickerSize);
            const pickerX = x + halfPickerSize;
            const pickerY = y + halfPickerSize;
            updatePickerPosition(pickerX, pickerY);
            const imageData = currentCanvasImageDataRef.current!;
            const baseIndex = (pickerY * imageBufferRef.current!.monitorWidth + pickerX) * 4;

            // 更新颜色
            updateColor(
                imageData.data[baseIndex],
                imageData.data[baseIndex + 1],
                imageData.data[baseIndex + 2],
            );

            // 计算和绘制错开 1 帧率
            updateImageDataPutImageRender(ctx, x, y);
        },
        [imageBufferRef, updateColor, updateImageDataPutImageRender, updatePickerPosition],
    );
    const updateImageRender = useCallbackRenderSlow(updateImageData);

    const updateTransform = useCallback((mouseX: number, mouseY: number) => {
        const colorPickerElement = colorPickerRef.current;
        if (!colorPickerElement) {
            return;
        }

        const colorPickerWidth = colorPickerElement.clientWidth;
        const colorPickerHeight = colorPickerElement.clientHeight;

        const canvasWidth = document.body.clientWidth;
        const canvasHeight = document.body.clientHeight;

        const maxTop = canvasHeight - colorPickerHeight;
        const maxLeft = canvasWidth - colorPickerWidth;

        const colorPickerLeft = Math.min(Math.max(mouseX, 0), maxLeft);
        const colorPickerTop = Math.min(Math.max(mouseY, 0), maxTop);

        latestTransformRef.current.left = colorPickerLeft;
        latestTransformRef.current.top = colorPickerTop;

        colorPickerElement.style.transform = `translate(${latestTransformRef.current.left}px, ${latestTransformRef.current.top}px)`;
        colorPickerElement.style.opacity = '1';
    }, []);
    const updateTransformRender = useCallbackRender(updateTransform);
    const update = useCallback(
        (mouseX: number, mouseY: number, physicalX?: number, physicalY?: number) => {
            updateTransformRender(mouseX, mouseY);
            updateImageRender(mouseX, mouseY, physicalX, physicalY);
        },
        [updateImageRender, updateTransformRender],
    );

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!enableRef.current) {
                return;
            }

            if (!moveCursorFinishedRef.current) {
                return;
            }

            update(e.clientX, e.clientY);
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [enableRef, update, updateImageRender, updateTransformRender]);

    const moveCursor = useCallback(
        (offsetX: number, offsetY: number) => {
            const appWindow = appWindowRef.current;
            if (!appWindow) {
                return;
            }

            let mouseX = pickerPositionRef.current.mouseX + offsetX;
            let mouseY = pickerPositionRef.current.mouseY + offsetY;

            if (mouseX < 0) {
                mouseX = 0;
            } else if (mouseX > imageBufferRef.current!.monitorWidth) {
                mouseX = imageBufferRef.current!.monitorWidth;
            }

            if (mouseY < 0) {
                mouseY = 0;
            } else if (mouseY > imageBufferRef.current!.monitorHeight) {
                mouseY = imageBufferRef.current!.monitorHeight;
            }

            moveCursorFinishedRef.current = false;
            appWindow.setCursorPosition(new PhysicalPosition(mouseX, mouseY));
            update(
                mouseX / imageBufferRef.current!.monitorScaleFactor,
                mouseY / imageBufferRef.current!.monitorScaleFactor,
                mouseX,
                mouseY,
            );
        },
        [imageBufferRef, update],
    );
    return (
        <div className="color-picker" ref={colorPickerRef} style={enable ? {} : { opacity: 0 }}>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerCopy}
                onKeyDown={() => {
                    navigator.clipboard.writeText(
                        `rgb(${colorRef.current.red}, ${colorRef.current.green}, ${colorRef.current.blue})`,
                    );
                    onCopyColor?.();
                }}
                enable={enableKeyEvent}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveUp}
                onKeyDown={() => {
                    moveCursor(0, -1);
                }}
                enable={enableKeyEvent}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveDown}
                onKeyDown={() => {
                    moveCursor(0, 1);
                }}
                enable={enableKeyEvent}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveLeft}
                onKeyDown={() => {
                    moveCursor(-1, 0);
                }}
                enable={enableKeyEvent}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveRight}
                onKeyDown={() => {
                    moveCursor(1, 0);
                }}
                enable={enableKeyEvent}
            >
                <div />
            </KeyEventWrap>

            <div className="color-picker-container">
                <div className="color-picker-preview">
                    <canvas ref={previewCanvasRef} className="preview-canvas" />
                    <div ref={previewColorElementRef} className="color-picker-preview-border" />
                </div>
            </div>

            <div className="color-picker-content">
                <div className="color-picker-content-text" ref={pickerPositionElementRef}></div>
                <div className="color-picker-content-color" ref={colorElementRef}></div>
            </div>
            <style jsx>
                {`
                    .color-picker {
                        position: fixed;
                        top: 0;
                        left: 0;
                        background-color: ${token.colorBgContainer};
                        border-radius: ${token.borderRadius}px;
                        box-shadow: ${token.boxShadowSecondary};
                        z-index: ${zIndexs.Draw_ColorPicker};
                        pointer-events: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        color: ${token.colorText};
                        display: flex;
                        flex-direction: column;
                        padding: ${token.paddingXXS}px;
                    }

                    .color-picker-container {
                        width: ${previewCanvasSize}px;
                        height: ${previewCanvasSize}px;
                        border-radius: ${token.borderRadius}px;
                        overflow: hidden;
                    }

                    .color-picker-preview {
                    }

                    .color-picker-preview-border {
                        position: absolute;
                        width: ${1 * previewScale}px;
                        height: ${1 * previewScale}px;
                        left: ${previewCanvasSize / 2 - 2}px;
                        top: ${previewCanvasSize / 2 - 2}px;
                        background-color: transparent;
                        border-radius: ${token.borderRadiusXS}px;
                    }

                    .preview-canvas {
                        width: ${previewCanvasSize}px;
                        height: ${previewCanvasSize}px;
                        transform-origin: 0 0;
                        transform: scale(${previewScale});
                        image-rendering: pixelated;
                    }

                    .color-picker-content {
                        display: flex;
                        flex-direction: column;
                        gap: ${token.marginXXS}px;
                        margin-top: ${token.marginXXS}px;
                        font-size: ${token.fontSizeSM}px;
                        width: ${previewCanvasSize}px;
                        border-bottom-left-radius: ${token.borderRadius}px;
                        border-bottom-right-radius: ${token.borderRadius}px;
                        overflow: hidden;
                    }

                    .color-picker-content-color {
                        padding: ${token.paddingXXS}px;
                        text-align: center;
                    }

                    .color-picker-content-text {
                        text-align: center;
                    }
                `}
            </style>
        </div>
    );
};

export const ColorPicker = React.memo(ColorPickerCore);
