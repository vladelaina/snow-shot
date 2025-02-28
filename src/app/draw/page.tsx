'use client';

import { useContext, useRef, useEffect, useCallback, useState } from 'react';
import { ScreenshotContext } from '../contextWrap';
import { ImageBuffer } from '@/commands';
import * as fabric from 'fabric';
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/dpi';

export enum CaptureStep {
    /** 选择截图区域 */
    Select = 'select',
    /** 绘制截图区域 */
    Draw = 'draw',
}

export enum DrawState {
    /** 空闲 */
    Idle = 'idle',
    /** 调整截图区域 */
    Resize = 'resize',
}

export default function Draw() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRectRef = useRef<fabric.Rect | null>(null);
    const maskRectClipPathRef = useRef<fabric.Rect | null>(null);

    const appWindowRef = useRef<AppWindow | null>(null);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const captureStepRef = useRef(CaptureStep.Select);
    const drawStateRef = useRef<DrawState>(DrawState.Idle);
    const resizeModeRef = useRef<string>('default');
    const moveOffsetRef = useRef<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    const resizeClipPathControlRef = useRef<() => void>(() => {});

    useEffect(() => {
        const appWindow = getCurrentWindow();
        appWindowRef.current = appWindow;
        // appWindow.hide();
    }, []);

    const changeCursor = useCallback((event: fabric.TEvent): string => {
        let cursor = 'default';

        const canvas = fabricRef.current;
        const rect = maskRectClipPathRef.current;
        if (!canvas || !rect) {
            return cursor;
        }

        // 处理不同情况下的鼠标指针状态
        if (captureStepRef.current === CaptureStep.Select) {
            if (startPointRef.current === null) {
                cursor = 'crosshair';
            }
        } else if (captureStepRef.current === CaptureStep.Draw) {
            // 获取当前指针位置，如果指针在选定区域（maskRectClipPathRef）的上则设置为 n-resize
            // 下侧为 s-resize，左侧为 w-resize，右侧为 e-resize
            // 左上为 nw-resize，右上为ne-resize，左下为 sw-resize，右下为 se-resize

            const pointer = canvas.getScenePoint(event.e);
            const tolerance = 8; // 边缘检测的容差范围

            const left = rect.left || 0;
            const top = rect.top || 0;
            const right = left + (rect.width || 0) * (rect.scaleX || 1);
            const bottom = top + (rect.height || 0) * (rect.scaleY || 1);

            const nearTop = pointer.y <= top + tolerance;
            const nearBottom = pointer.y >= bottom - tolerance;
            const nearLeft = pointer.x <= left + tolerance;
            const nearRight = pointer.x >= right - tolerance;

            // 设置光标样式
            if (nearTop && nearLeft) {
                cursor = 'nw-resize';
            } else if (nearTop && nearRight) {
                cursor = 'ne-resize';
            } else if (nearBottom && nearLeft) {
                cursor = 'sw-resize';
            } else if (nearBottom && nearRight) {
                cursor = 'se-resize';
            } else if (nearTop) {
                cursor = 'n-resize';
            } else if (nearBottom) {
                cursor = 's-resize';
            } else if (nearLeft) {
                cursor = 'w-resize';
            } else if (nearRight) {
                cursor = 'e-resize';
            } else if (
                pointer.x >= left &&
                pointer.x <= right &&
                pointer.y >= top &&
                pointer.y <= bottom
            ) {
                cursor = 'move';
            } else {
                cursor = 'default';
            }
        }

        canvas.setCursor(cursor);
        return cursor;
    }, []);

    // 处理鼠标按下事件
    const onMouseDown = useCallback(
        (event: fabric.TEvent) => {
            const currentCursor = changeCursor(event);

            const rect = maskRectClipPathRef.current;
            if (!fabricRef.current || !rect) {
                return;
            }

            let needRender = false;

            const cursorPoint = fabricRef.current.getScenePoint(event.e);
            if (captureStepRef.current === CaptureStep.Select) {
                if (!wrapRef.current || !maskRectRef.current) {
                    return;
                }

                rect.set('active', true);

                startPointRef.current = { x: cursorPoint.x, y: cursorPoint.y };

                rect.set({
                    left: cursorPoint.x,
                    top: cursorPoint.y,
                    width: 0,
                    height: 0,
                    scaleX: 1,
                    scaleY: 1,
                });
                maskRectRef.current.set('dirty', true);

                needRender = true;
            } else if (captureStepRef.current === CaptureStep.Draw) {
                if (drawStateRef.current === DrawState.Idle) {
                    drawStateRef.current = DrawState.Resize;
                    resizeModeRef.current = currentCursor;
                    moveOffsetRef.current = {
                        x: cursorPoint.x - rect.left,
                        y: cursorPoint.y - rect.top,
                    };
                } else if (drawStateRef.current === DrawState.Resize) {
                }
            }

            resizeClipPathControlRef.current();

            if (needRender) {
                fabricRef.current.renderAll();
            }
        },
        [changeCursor],
    );

    // 处理鼠标移动事件
    const onMouseMove = useCallback(
        (event: fabric.TEvent) => {
            changeCursor(event);

            if (!fabricRef.current || !maskRectClipPathRef.current) {
                return;
            }

            let needRender = false;

            if (captureStepRef.current === CaptureStep.Select) {
                if (
                    !wrapRef.current ||
                    !maskRectRef.current?.clipPath ||
                    !startPointRef.current ||
                    !maskRectClipPathRef.current
                ) {
                    return;
                }

                const pointer = fabricRef.current.getScenePoint(event.e);

                const x = Math.min(startPointRef.current.x, pointer.x);
                const y = Math.min(startPointRef.current.y, pointer.y);
                const width = Math.abs(pointer.x - startPointRef.current.x);
                const height = Math.abs(pointer.y - startPointRef.current.y);

                maskRectClipPathRef.current.set({
                    left: x,
                    top: y,
                    width,
                    height,
                });
                maskRectRef.current!.set('dirty', true);
                needRender = true;
            } else if (captureStepRef.current === CaptureStep.Draw) {
                if (drawStateRef.current === DrawState.Idle) {
                } else if (drawStateRef.current === DrawState.Resize) {
                    const rect = maskRectClipPathRef.current;
                    if (!rect) {
                        return;
                    }

                    // 根据不同的缩放模式，进行缩放
                    const resizeMode = resizeModeRef.current;

                    if (resizeMode === 'default') {
                        return;
                    }

                    let firstPoint = new fabric.Point(0, 0);
                    let secondPoint = new fabric.Point(0, 0);
                    if (resizeMode === 'nw-resize') {
                        // 左上角缩放
                        // 当前指针位置作为第一点，选取右下角位置作为第二点
                        firstPoint = fabricRef.current.getScenePoint(event.e);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'n-resize') {
                        // 上侧缩放
                        // 此时只影响高度，选取左上角的 x 和光标所在位置的 y 作为第一点，选取右下角位置作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(rect.left, cursorPoint.y);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'ne-resize') {
                        // 右上角缩放
                        // 当前光标位置的 y 和左上角的 x 作为第一点，选取右下角的 y 和光标所在位置的 x 作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(rect.left, cursorPoint.y);
                        secondPoint = new fabric.Point(cursorPoint.x, rect.top + rect.height);
                    } else if (resizeMode === 'e-resize') {
                        // 右侧缩放
                        // 只影响宽度，选取左上角的 x 和 y 作为第一点，光标所在位置的 x 和右下角的 y 作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = new fabric.Point(cursorPoint.x, rect.top + rect.height);
                    } else if (resizeMode === 'se-resize') {
                        // 右下角缩放
                        // 直接取左上角坐标作为第一点，光标所在位置作为第二点
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = fabricRef.current.getScenePoint(event.e);
                    } else if (resizeMode === 's-resize') {
                        // 下侧缩放
                        // 只影响高度，左上角的 x 和 y 作为第一点，右下角的 x 和鼠标所在 y 作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = new fabric.Point(rect.left + rect.width, cursorPoint.y);
                    } else if (resizeMode === 'sw-resize') {
                        // 左下角缩放
                        // 左上角的 y 和鼠标所在的 x 作为第一点，右下角的 x 和 y 作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(cursorPoint.x, rect.top);
                        secondPoint = new fabric.Point(rect.left + rect.width, cursorPoint.y);
                    } else if (resizeMode === 'w-resize') {
                        // 左侧缩放
                        // 只影响宽度，鼠标所在位置的 x 和左上角的 y 作为第一点，右下角的 x 和 y 作为第二点
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);
                        firstPoint = new fabric.Point(cursorPoint.x, rect.top);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'move') {
                        // 移动模式
                        // 获取当前鼠标位置
                        const cursorPoint = fabricRef.current.getScenePoint(event.e);

                        // 计算鼠标初始点击点相对矩形左上角的偏移量
                        if (!moveOffsetRef.current) {
                            moveOffsetRef.current = {
                                x: cursorPoint.x - rect.left,
                                y: cursorPoint.y - rect.top,
                            };
                        }

                        // 计算新的左上角位置（保持鼠标点击点相对于矩形的偏移量不变）
                        firstPoint = new fabric.Point(
                            cursorPoint.x - moveOffsetRef.current.x,
                            cursorPoint.y - moveOffsetRef.current.y,
                        );
                        secondPoint = new fabric.Point(
                            firstPoint.x + rect.width,
                            firstPoint.y + rect.height,
                        );
                    }

                    maskRectClipPathRef.current.set({
                        left: firstPoint.x,
                        top: firstPoint.y,
                        width: secondPoint.x - firstPoint.x,
                        height: secondPoint.y - firstPoint.y,
                    });
                    maskRectRef.current!.set('dirty', true);
                    needRender = true;
                }
            }

            resizeClipPathControlRef.current();

            if (needRender) {
                fabricRef.current.renderAll();
            }
        },
        [changeCursor],
    );

    // 处理鼠标松开事件
    const onMouseUp = useCallback(() => {
        if (captureStepRef.current === CaptureStep.Select) {
            if (!fabricRef.current || !maskRectClipPathRef.current) {
                return;
            }

            startPointRef.current = null;
            captureStepRef.current = CaptureStep.Draw;
        } else if (captureStepRef.current === CaptureStep.Draw) {
            if (drawStateRef.current === DrawState.Idle) {
            } else if (drawStateRef.current === DrawState.Resize) {
                drawStateRef.current = DrawState.Idle;
                resizeModeRef.current = '';
            }
        }
    }, []);

    useEffect(() => {
        const appWindow = appWindowRef.current;
        if (!appWindow) {
            return;
        }

        const initFabric = async () => {
            if (!canvasRef.current || !wrapRef.current) {
                return;
            }

            const canvasWidth = wrapRef.current.clientWidth;
            const canvasHeight = wrapRef.current.clientHeight;

            // 初始化 Fabric 画布
            fabricRef.current = new fabric.Canvas(canvasRef.current, {
                width: canvasWidth,
                height: canvasHeight,
                selection: false, // 禁用默认选择框
            });

            // 监听鼠标事件
            fabricRef.current.on('mouse:down', onMouseDown);
            fabricRef.current.on('mouse:move', onMouseMove);
            fabricRef.current.on('mouse:up', onMouseUp);
        };

        const disposeFabric = () => {
            if (!fabricRef.current) {
                return;
            }

            fabricRef.current.off('mouse:down', onMouseDown);
            fabricRef.current.off('mouse:move', onMouseMove);
            fabricRef.current.off('mouse:up', onMouseUp);
            fabricRef.current.dispose();
        };

        Promise.all([
            appWindow.setAlwaysOnTop(process.env.NODE_ENV === 'development' ? false : true),
            appWindow.setPosition(new PhysicalPosition(0, 0)),
            appWindow.setFullscreen(true),
        ]).then(() => {
            initFabric();
        });

        return () => {
            disposeFabric();
        };
    }, [onMouseDown, onMouseMove, onMouseUp]);

    const imageBufferRef = useRef<ImageBuffer | undefined>(undefined);
    const { imageBuffer } = useContext(ScreenshotContext);

    useEffect(() => {
        const initImage = async () => {
            const appWindow = appWindowRef.current;
            if (!appWindow || !canvasRef.current || !wrapRef.current || !fabricRef.current) {
                return;
            }

            const canvasWidth = wrapRef.current.clientWidth;
            const canvasHeight = wrapRef.current.clientHeight;

            if (imageBufferRef.current || !imageBuffer) {
                return;
            }

            // 设置截图图层
            const imgLayer = await fabric.FabricImage.fromURL(
                URL.createObjectURL(imageBuffer.data),
            );

            imgLayer.set({
                top: 0,
                left: 0,
                selectable: false,
            });
            imgLayer.scaleToHeight(canvasHeight);
            imgLayer.scaleToWidth(canvasWidth);
            fabricRef.current.add(imgLayer);

            // 添加遮罩
            maskRectClipPathRef.current = new fabric.Rect({
                width: 0,
                height: 0,
                left: 0,
                top: 0,
                objectCaching: false,
                originX: 'left',
                originY: 'top',
                inverted: true,
                selectable: true,
                hasControls: false,
                absolutePositioned: true,
                lockRotation: true,
                opacity: 0,
            });
            maskRectRef.current = new fabric.Rect({
                dirty: true,
                width: canvasWidth,
                height: canvasHeight,
                left: 0,
                top: 0,
                fill: 'rgba(0, 0, 0, 0.5)',
                selectable: false,
                clipPath: maskRectClipPathRef.current,
            });
            fabricRef.current.add(maskRectRef.current);
            fabricRef.current.add(maskRectClipPathRef.current);

            // 设置边框
            const borderOptiopns = {
                stroke: '#4096ff',
                strokeWidth: 2,
            };
            const topBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const rightBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const bottomBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const leftBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const circleOptions = {
                radius: 4,
                left: 0,
                top: 0,
                fill: '#4096ff',
                stroke: 'white',
                strokeWidth: 1,
                opacity: 0,
            };
            const topLeftCircle = new fabric.Circle(circleOptions);
            const topCircle = new fabric.Circle(circleOptions);
            const topRightCircle = new fabric.Circle(circleOptions);
            const rightCircle = new fabric.Circle(circleOptions);
            const bottomRightCircle = new fabric.Circle(circleOptions);
            const bottomCircle = new fabric.Circle(circleOptions);
            const bottomLeftCircle = new fabric.Circle(circleOptions);
            const leftCircle = new fabric.Circle(circleOptions);
            fabricRef.current.add(
                topBorder,
                rightBorder,
                bottomBorder,
                leftBorder,
                topLeftCircle,
                topCircle,
                topRightCircle,
                rightCircle,
                bottomRightCircle,
                bottomCircle,
                bottomLeftCircle,
                leftCircle,
            );

            let previousLeft: number | null = null;
            let previousTop: number | null = null;
            let previousWidth: number | null = null;
            let previousHeight: number | null = null;
            resizeClipPathControlRef.current = () => {
                const rect = maskRectClipPathRef.current;
                if (!rect) {
                    return;
                }

                const left = rect.left;
                const top = rect.top;
                const width = rect.width;
                const height = rect.height;

                if (
                    previousLeft === left &&
                    previousTop === top &&
                    previousWidth === width &&
                    previousHeight === height
                ) {
                    return;
                }

                topBorder.set({
                    x1: left,
                    y1: top,
                    x2: left + width,
                    y2: top,
                });
                rightBorder.set({
                    x1: left + width,
                    y1: top,
                    x2: left + width,
                    y2: top + height,
                });
                bottomBorder.set({
                    x1: left,
                    y1: top + height,
                    x2: left + width,
                    y2: top + height,
                });
                leftBorder.set({
                    x1: left,
                    y1: top,
                    x2: left,
                    y2: top + height,
                });

                // 每个圆点的间距为 5 个圆点大小时，显示圆点
                const showCircleSpace = circleOptions.radius * 5 * 2;
                const showCircle = width / 2 > showCircleSpace && height / 2 > showCircleSpace;
                const circleOpacity = showCircle ? 1 : 0;
                if (showCircle) {
                    topLeftCircle.set({
                        left: left - circleOptions.radius,
                        top: top - circleOptions.radius,
                    });
                    topCircle.set({
                        left: left + width / 2 - circleOptions.radius,
                        top: top - circleOptions.radius,
                    });
                    topRightCircle.set({
                        left: left + width - circleOptions.radius,
                        top: top - circleOptions.radius,
                    });
                    rightCircle.set({
                        left: left + width - circleOptions.radius,
                        top: top + height / 2 - circleOptions.radius,
                    });
                    bottomRightCircle.set({
                        left: left + width - circleOptions.radius,
                        top: top + height - circleOptions.radius,
                    });
                    bottomCircle.set({
                        left: left + width / 2 - circleOptions.radius,
                        top: top + height - circleOptions.radius,
                    });
                    bottomLeftCircle.set({
                        left: left - circleOptions.radius,
                        top: top + height - circleOptions.radius,
                    });
                    leftCircle.set({
                        left: left - circleOptions.radius,
                        top: top + height / 2 - circleOptions.radius,
                    });
                }
                topLeftCircle.set('opacity', circleOpacity);
                topCircle.set('opacity', circleOpacity);
                topRightCircle.set('opacity', circleOpacity);
                rightCircle.set('opacity', circleOpacity);
                bottomRightCircle.set('opacity', circleOpacity);
                bottomCircle.set('opacity', circleOpacity);
                bottomLeftCircle.set('opacity', circleOpacity);
                leftCircle.set('opacity', circleOpacity);

                previousLeft = left;
                previousTop = top;
                previousWidth = width;
                previousHeight = height;
            };

            await appWindow.show();
        };

        initImage();

        return () => {};
    }, [imageBuffer]);

    return (
        <div className="draw-wrap" data-tauri-drag-region ref={wrapRef}>
            <canvas className="draw-canvas" ref={canvasRef} />
            <style jsx>{`
                .draw-wrap {
                    height: 100vh;
                    width: 100vw;
                }

                .draw-canvas {
                    width: 100vh;
                    height: 100vw;
                }
            `}</style>
        </div>
    );
}
