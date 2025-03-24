'use client';

import { theme } from 'antd';
import { CaptureStep, DrawState } from '../../types';
import { zIndexs } from '@/utils/zIndex';
import React, {
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { DrawContext } from '../../context';
import Color, { ColorInstance } from 'color';
import { FormattedMessage } from 'react-intl';
import { KeyEventKey, KeyEventWrap } from '../drawToolbar/components/keyEventWrap';
import { getCurrentWindow, Window as AppWindow, PhysicalPosition } from '@tauri-apps/api/window';

export type ColorPickerActionType = {
    update: (mouseX: number, mouseY: number) => void;
};

const previewScale = 12;
const previewPickerSize = 10 + 1;
const previewCanvasSize = previewPickerSize * previewScale;

export const isEnableColorPicker = (captureStep: CaptureStep, drawState: DrawState) => {
    return captureStep === CaptureStep.Select || drawState === DrawState.Idle;
};

export const ColorPickerCore: React.FC<{
    actionRef?: React.RefObject<ColorPickerActionType | undefined>;
    captureStep: CaptureStep;
    drawState: DrawState;
    onCopyColor?: () => void;
}> = ({ actionRef, captureStep, drawState, onCopyColor }) => {
    const enable = isEnableColorPicker(captureStep, drawState);

    const enableRef = useRef(enable);
    useEffect(() => {
        enableRef.current = enable;
    }, [enable]);

    const { token } = theme.useToken();

    const appWindowRef = useRef<AppWindow | undefined>(undefined);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    const { fabricRef, imageBufferRef, setMaskVisible } = useContext(DrawContext);

    const colorPickerRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const previewCanvasRenderedRef = useRef(true);
    const latestTransformRef = useRef<{ left: number; top: number }>({
        left: 0,
        top: 0,
    });
    const renderedRef = useRef(true);

    useEffect(() => {
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

    const currentCanvasImageDataRef = useRef<ImageData | null>(null);
    useEffect(() => {
        if (!enableRef.current) {
            return;
        }

        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext();
        requestAnimationFrame(() => {
            setMaskVisible(false);
            canvas.renderAll();
            currentCanvasImageDataRef.current = ctx.getImageData(
                0,
                0,
                imageBufferRef.current!.monitorWidth,
                imageBufferRef.current!.monitorHeight,
                {
                    colorSpace: 'srgb',
                },
            );
            setMaskVisible(true);
            canvas.renderAll();
        });
    }, [enable, fabricRef, imageBufferRef, setMaskVisible]);

    const [color, setColor] = useState<ColorInstance>(Color('rgb(0, 0, 0)'));
    const [pickerPosition, _setPickerPosition] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });
    const pickerPositionRef = useRef<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });
    const setPickerPosition = useCallback((position: { x: number; y: number }) => {
        _setPickerPosition(position);
        pickerPositionRef.current = position;
    }, []);
    const moveCursorFinishedRef = useRef(true);
    const moveCursorFinishedTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const updateImageData = useCallback(
        async (mouseX: number, mouseY: number, physicalX?: number, physicalY?: number) => {
            if (!previewCanvasRenderedRef.current) {
                return;
            }

            if (!currentCanvasImageDataRef.current) {
                return;
            }

            previewCanvasRenderedRef.current = false;
            requestAnimationFrame(async () => {
                previewCanvasRenderedRef.current = true;

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

                mouseX =
                    physicalX ?? Math.floor(mouseX * imageBufferRef.current!.monitorScaleFactor);
                mouseY =
                    physicalY ?? Math.floor(mouseY * imageBufferRef.current!.monitorScaleFactor);

                const ctx = previewCanvasCtxRef.current!;
                const halfPickerSize = Math.floor(previewPickerSize / 2);
                // 将数据绘制到预览画布
                const x = Math.floor(mouseX - halfPickerSize);
                const y = Math.floor(mouseY - halfPickerSize);
                const pickerX = x + halfPickerSize;
                const pickerY = y + halfPickerSize;
                setPickerPosition({
                    x: pickerX,
                    y: pickerY,
                });
                const imageData = currentCanvasImageDataRef.current!;
                const baseIndex = (pickerY * imageBufferRef.current!.monitorWidth + pickerX) * 4;

                // 更新颜色
                setColor(
                    Color(
                        `rgb(${imageData.data[baseIndex]}, ${imageData.data[baseIndex + 1]}, ${imageData.data[baseIndex + 2]})`,
                    ),
                );

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
            });
        },
        [imageBufferRef, setPickerPosition],
    );

    const update = useCallback(
        (mouseX: number, mouseY: number, physicalX?: number, physicalY?: number) => {
            if (!enableRef.current) {
                return;
            }

            const canvas = fabricRef.current;
            if (!canvas) {
                return;
            }

            const colorPickerElement = colorPickerRef.current;
            if (!colorPickerElement) {
                return;
            }

            // 更新图像数据
            updateImageData(mouseX, mouseY, physicalX, physicalY);

            const colorPickerWidth = colorPickerElement.clientWidth;
            const colorPickerHeight = colorPickerElement.clientHeight;

            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            const maxTop = canvasHeight - colorPickerHeight;
            const maxLeft = canvasWidth - colorPickerWidth;

            const colorPickerLeft = Math.min(Math.max(mouseX, 0), maxLeft);
            const colorPickerTop = Math.min(Math.max(mouseY, 0), maxTop);

            latestTransformRef.current.left = colorPickerLeft;
            latestTransformRef.current.top = colorPickerTop;

            if (!renderedRef.current) {
                return;
            }

            renderedRef.current = false;
            requestAnimationFrame(() => {
                colorPickerElement.style.transform = `translate(${latestTransformRef.current.left}px, ${latestTransformRef.current.top}px)`;
                colorPickerElement.style.opacity = '1';
                renderedRef.current = true;
            });
        },
        [fabricRef, updateImageData],
    );
    useImperativeHandle(
        actionRef,
        () => ({
            update,
        }),
        [update],
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
    }, [enableRef, update]);

    const moveCursor = useCallback(
        (offsetX: number, offsetY: number) => {
            const appWindow = appWindowRef.current;
            if (!appWindow) {
                return;
            }

            let mouseX = pickerPositionRef.current.x + offsetX;
            let mouseY = pickerPositionRef.current.y + offsetY;

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

    const colorRgbArray = useMemo(() => {
        return [color.red(), color.green(), color.blue()];
    }, [color]);
    const colorRgbTextColor = useMemo(() => {
        return colorRgbArray.reduce((acc, curr) => acc + curr, 0) < 255 + 128
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(0,0,0,0.88)';
    }, [colorRgbArray]);

    return (
        <div className="color-picker" ref={colorPickerRef} style={enable ? {} : { opacity: 0 }}>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerCopy}
                onKeyDown={() => {
                    navigator.clipboard.writeText(
                        `rgb(${colorRgbArray[0]}, ${colorRgbArray[1]}, ${colorRgbArray[2]})`,
                    );
                    onCopyColor?.();
                }}
                enable={enable}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveUp}
                onKeyDown={() => {
                    moveCursor(0, -1);
                }}
                enable={enable}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveDown}
                onKeyDown={() => {
                    moveCursor(0, 1);
                }}
                enable={enable}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveLeft}
                onKeyDown={() => {
                    moveCursor(-1, 0);
                }}
                enable={enable}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.ColorPickerMoveRight}
                onKeyDown={() => {
                    moveCursor(1, 0);
                }}
                enable={enable}
            >
                <div />
            </KeyEventWrap>

            <div className="color-picker-container">
                <div className="color-picker-preview">
                    <canvas ref={previewCanvasRef} className="preview-canvas" />
                    <div
                        className="color-picker-preview-border"
                        style={{
                            boxShadow: `0 0 0 1px ${colorRgbTextColor}`,
                        }}
                    />
                </div>
            </div>

            <div className="color-picker-content">
                <div className="color-picker-content-text">
                    {`X: ${pickerPosition.x} Y: ${pickerPosition.y}`}
                </div>
                <div
                    className="color-picker-content-color"
                    style={{
                        backgroundColor: color.toString(),
                        color: colorRgbTextColor,
                    }}
                >
                    <FormattedMessage
                        id="draw.rgb"
                        values={{ r: colorRgbArray[0], g: colorRgbArray[1], b: colorRgbArray[2] }}
                    />
                </div>
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
