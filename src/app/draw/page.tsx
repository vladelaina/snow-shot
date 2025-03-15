'use client';

import {
    useContext,
    useRef,
    useEffect,
    useCallback,
    useState,
    RefObject,
    createContext,
} from 'react';
import { AppSettingsContext, AppSettingsControlNode } from '../contextWrap';
import {
    captureCurrentMonitor,
    getWindowFromMousePosition,
    ImageBuffer,
    ImageEncoder,
} from '@/commands';
import * as fabric from 'fabric';
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { zIndexs } from '@/utils/zIndex';
import { DrawToolbar } from './components/drawToolbar';
import { EventListenerContext } from '@/components/eventListener';
import React from 'react';
import { CaptureStep, DrawState } from './types';
import { theme } from 'antd';
import { FabricHistory } from '@/utils/fabricjsHistory';

type CanvasPosition = {
    left: number;
    top: number;
};

type CanvasSize = {
    width: number;
    height: number;
};

export const DrawContext = createContext<{
    fabricRef: RefObject<fabric.Canvas | undefined>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    maskRectObjectListRef: RefObject<fabric.Object[]>;
    maskRectRef: RefObject<fabric.Rect | undefined>;
    maskRectClipPathRef: RefObject<fabric.Rect | undefined>;
    circleCursorRef: RefObject<HTMLDivElement | null>;
    imageBufferRef: RefObject<ImageBuffer | undefined>;
    canvasCursorRef: RefObject<string>;
    canvasUnlistenListRef: RefObject<VoidFunction[]>;
    imageLayerRef: RefObject<fabric.Image | undefined>;
    canvasHistoryRef: RefObject<FabricHistory | undefined>;
}>({
    fabricRef: { current: undefined },
    canvasRef: { current: null },
    maskRectObjectListRef: { current: [] },
    maskRectRef: { current: undefined },
    maskRectClipPathRef: { current: undefined },
    circleCursorRef: { current: null },
    imageBufferRef: { current: undefined },
    canvasCursorRef: { current: 'auto' },
    canvasUnlistenListRef: { current: [] },
    imageLayerRef: { current: undefined },
    canvasHistoryRef: { current: undefined },
});

const DrawContent: React.FC<{ onCancel: () => void; imageBuffer: ImageBuffer | undefined }> = ({
    onCancel,
    imageBuffer,
}) => {
    const { token } = theme.useToken();

    const {
        common: { darkMode },
        screenshot: { controlNode },
    } = useContext(AppSettingsContext);

    const imageBufferRef = useRef<ImageBuffer | undefined>(undefined);
    useEffect(() => {
        if (imageBuffer) {
            imageBufferRef.current = imageBuffer;
        }
    }, [imageBuffer]);

    const wrapRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<fabric.Canvas | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskRectObjectListRef = useRef<fabric.Object[]>([]);
    const maskRectRef = useRef<fabric.Rect | undefined>(undefined);
    const maskRectClipPathRef = useRef<fabric.Rect | undefined>(undefined);
    const circleCursorRef = useRef<HTMLDivElement>(null);
    const canvasUnlistenListRef = useRef<VoidFunction[]>([]);
    const imageLayerRef = useRef<fabric.Image | undefined>(undefined);
    const canvasHistoryRef = useRef<FabricHistory | undefined>(undefined);
    /**
     * 创建矩形模糊图层时，创建后无法再次选中对象，发现可以通过 setActiveObject 来选中对象
     * 这里特殊处理下
     */
    const activeObjectListRef = useRef<Set<fabric.Object>>(new Set());

    const appWindowRef = useRef<AppWindow | undefined>(undefined);
    const startPointRef = useRef<{ x: number; y: number } | undefined>(undefined);
    const [captureStep, _setCaptureStep] = useState(CaptureStep.Select);
    const captureStepRef = useRef(CaptureStep.Select);
    const setCaptureStep = useCallback((step: CaptureStep) => {
        captureStepRef.current = step;
        _setCaptureStep(step);
    }, []);
    const [drawState, _setDrawState] = useState(DrawState.Idle);
    const drawStateRef = useRef<DrawState>(DrawState.Idle);
    const setDrawState = useCallback((state: DrawState) => {
        drawStateRef.current = state;
        _setDrawState(state);
    }, []);
    const resizeModeRef = useRef<string>('auto');
    const moveOffsetRef = useRef<CanvasPosition>({
        left: 0,
        top: 0,
    });

    const limitPosition = useCallback(
        (position: CanvasPosition, width: number, height: number): CanvasPosition => {
            let left = position.left;
            let top = position.top;

            const maskRect = maskRectRef.current;
            if (!maskRect) {
                return { left, top };
            }

            const minLeft = 0;
            const minTop = 0;
            const maxLeft = maskRect.left + maskRect.width - width;
            const maxTop = maskRect.top + maskRect.height - height;

            if (left < minLeft) {
                left = minLeft;
            } else if (left > maxLeft) {
                left = maxLeft;
            }

            if (top < minTop) {
                top = minTop;
            } else if (top > maxTop) {
                top = maxTop;
            }

            return { left, top };
        },
        [],
    );

    const limitSize = useCallback((size: CanvasSize, left: number, top: number): CanvasSize => {
        let width = size.width;
        let height = size.height;

        const maskRect = maskRectRef.current;
        if (!maskRect) {
            return { width, height };
        }

        // 定义截图区域的最小宽高
        const minWidth = 0;
        const minHeight = 0;

        // 计算截图区域的最大宽高
        // 该计算基于 `maskRect` (遮罩区域)，确保截图区域不会超出它的边界
        const maxWidth = maskRect.left + maskRect.width - left;
        const maxHeight = maskRect.top + maskRect.height - top;

        // 最小值和最大值构建成了一个矩形，该矩形表示截图的约束区域
        // 这个矩形的左上角固定在 (left, top)，但宽高受限于 min/max 约束
        width = Math.max(minWidth, Math.min(width, maxWidth));
        height = Math.max(minHeight, Math.min(height, maxHeight));

        return { width, height };
    }, []);

    const resizeClipPathControlRef = useRef<() => void>(() => {});

    useEffect(() => {
        const appWindow = getCurrentWindow();
        appWindowRef.current = appWindow;
    }, []);

    const canvasCursorRef = useRef<string>('auto');
    const changeCursor = useCallback((mousePoint: fabric.Point): string => {
        let cursor = 'auto';

        const canvas = fabricRef.current;
        const rect = maskRectClipPathRef.current;
        if (!canvas || !rect) {
            return cursor;
        }

        // 处理不同情况下的鼠标指针状态
        if (captureStepRef.current === CaptureStep.Select) {
            if (startPointRef.current === undefined) {
                cursor = 'crosshair';
            }
        } else if (captureStepRef.current === CaptureStep.Draw) {
            if (drawStateRef.current === DrawState.Idle) {
                // 获取当前指针位置，如果指针在选定区域（maskRectClipPathRef）的上则设置为 n-resize
                // 下侧为 s-resize，左侧为 w-resize，右侧为 e-resize
                // 左上为 nw-resize，右上为ne-resize，左下为 sw-resize，右下为 se-resize

                const tolerance = 8; // 边缘检测的容差范围

                const left = rect.left || 0;
                const top = rect.top || 0;
                const right = left + (rect.width || 0) * (rect.scaleX || 1);
                const bottom = top + (rect.height || 0) * (rect.scaleY || 1);

                const nearTop = mousePoint.y <= top + tolerance;
                const nearBottom = mousePoint.y >= bottom - tolerance;
                const nearLeft = mousePoint.x <= left + tolerance;
                const nearRight = mousePoint.x >= right - tolerance;

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
                    mousePoint.x >= left &&
                    mousePoint.x <= right &&
                    mousePoint.y >= top &&
                    mousePoint.y <= bottom
                ) {
                    cursor = 'move';
                } else {
                    cursor = 'auto';
                }
            } else if (
                drawStateRef.current === DrawState.Pen ||
                drawStateRef.current === DrawState.Mosaic ||
                drawStateRef.current === DrawState.Eraser ||
                drawStateRef.current === DrawState.Highlight
            ) {
                cursor = 'none';
            } else if (
                drawStateRef.current === DrawState.Ellipse ||
                drawStateRef.current === DrawState.Rect ||
                drawStateRef.current === DrawState.Arrow
            ) {
                cursor = 'crosshair';
            } else if (drawStateRef.current === DrawState.Text) {
                cursor = 'text';
            }
        }

        if (canvasCursorRef.current !== 'auto') {
            cursor = canvasCursorRef.current;
        }

        if (cursor === 'auto') {
        } else {
            canvas.setCursor(cursor);
        }
        return cursor;
    }, []);

    // 处理鼠标移动事件
    const lastWindowInfoRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>(undefined);

    const selectWindowFromMousePosition = useCallback(async (image: ImageBuffer) => {
        const monitorX = image.monitorX;
        const monitorY = image.monitorY;
        const monitorScaleFactor = image.monitorScaleFactor;
        const monitorWidth = image.monitorWidth;
        const monitorHeight = image.monitorHeight;

        const windowInfo = (await getWindowFromMousePosition()) ?? {
            x: 0,
            y: 0,
            width: monitorWidth,
            height: monitorHeight,
        };

        const lastWindowInfo = lastWindowInfoRef.current;
        if (
            lastWindowInfo &&
            lastWindowInfo.x === windowInfo.x &&
            lastWindowInfo.y === windowInfo.y &&
            lastWindowInfo.width === windowInfo.width &&
            lastWindowInfo.height === windowInfo.height
        ) {
            return;
        }

        const left = windowInfo.x / monitorScaleFactor - monitorX;
        const top = windowInfo.y / monitorScaleFactor - monitorY;
        const width = windowInfo.width / monitorScaleFactor;
        const height = windowInfo.height / monitorScaleFactor;

        lastWindowInfoRef.current = windowInfo;

        return { left, top, width, height };
    }, []);

    const waitSelectWindowFromMousePositionRef = useRef<boolean>(false);
    const waitSelectWindowFromMousePositionPointRef = useRef<fabric.Point | undefined>(undefined);
    const onMouseMove = useCallback(
        async (point: fabric.Point) => {
            if (!fabricRef.current || !maskRectClipPathRef.current) {
                return;
            }

            let needRender = false;

            if (captureStepRef.current === CaptureStep.Select) {
                if (
                    !wrapRef.current ||
                    !maskRectRef.current?.clipPath ||
                    !maskRectClipPathRef.current
                ) {
                    return;
                }

                let left = 0;
                let top = 0;
                let width = 0;
                let height = 0;

                if (startPointRef.current) {
                    left = Math.min(startPointRef.current.x, point.x);
                    top = Math.min(startPointRef.current.y, point.y);
                    width = Math.abs(point.x - startPointRef.current.x);
                    height = Math.abs(point.y - startPointRef.current.y);

                    if (width <= 1 || height <= 1 || width + height <= 3) {
                        return;
                    }
                } else {
                    const imageBuffer = imageBufferRef.current;
                    if (!imageBuffer) {
                        return;
                    }

                    if (waitSelectWindowFromMousePositionRef.current) {
                        waitSelectWindowFromMousePositionPointRef.current = point;
                        return;
                    }

                    waitSelectWindowFromMousePositionRef.current = true;
                    const res = await selectWindowFromMousePosition(imageBuffer);
                    waitSelectWindowFromMousePositionRef.current = false;
                    if (!res) {
                        return;
                    }

                    left = res.left;
                    top = res.top;
                    width = res.width;
                    height = res.height;
                }

                maskRectClipPathRef.current.set({
                    ...limitSize({ width, height }, left, top),
                    left,
                    top,
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

                    if (resizeMode === 'auto') {
                        return;
                    }

                    let firstPoint = new fabric.Point(0, 0);
                    let secondPoint = new fabric.Point(0, 0);
                    if (resizeMode === 'nw-resize') {
                        // 左上角缩放
                        // 当前指针位置作为第一点，选取右下角位置作为第二点
                        firstPoint = point;
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'n-resize') {
                        // 上侧缩放
                        // 此时只影响高度，选取左上角的 x 和光标所在位置的 y 作为第一点，选取右下角位置作为第二点
                        firstPoint = new fabric.Point(rect.left, point.y);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'ne-resize') {
                        // 右上角缩放
                        // 当前光标位置的 y 和左上角的 x 作为第一点，选取右下角的 y 和光标所在位置的 x 作为第二点
                        firstPoint = new fabric.Point(rect.left, point.y);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'e-resize') {
                        // 右侧缩放
                        // 只影响宽度，选取左上角的 x 和 y 作为第一点，光标所在位置的 x 和右下角的 y 作为第二点
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = new fabric.Point(point.x, rect.top + rect.height);
                    } else if (resizeMode === 'se-resize') {
                        // 右下角缩放
                        // 直接取左上角坐标作为第一点，光标所在位置作为第二点
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = point;
                    } else if (resizeMode === 's-resize') {
                        // 下侧缩放
                        // 只影响高度，左上角的 x 和 y 作为第一点，右下角的 x 和鼠标所在 y 作为第二点
                        firstPoint = new fabric.Point(rect.left, rect.top);
                        secondPoint = new fabric.Point(rect.left + rect.width, point.y);
                    } else if (resizeMode === 'sw-resize') {
                        // 左下角缩放
                        // 左上角的 y 和鼠标所在的 x 作为第一点，右下角的 x 和 y 作为第二点
                        firstPoint = new fabric.Point(point.x, rect.top);
                        secondPoint = new fabric.Point(rect.left + rect.width, point.y);
                    } else if (resizeMode === 'w-resize') {
                        // 左侧缩放
                        // 只影响宽度，鼠标所在位置的 x 和左上角的 y 作为第一点，右下角的 x 和 y 作为第二点
                        firstPoint = new fabric.Point(point.x, rect.top);
                        secondPoint = new fabric.Point(
                            rect.left + rect.width,
                            rect.top + rect.height,
                        );
                    } else if (resizeMode === 'move') {
                        // 移动模式

                        // 计算鼠标初始点击点相对矩形左上角的偏移量
                        if (!moveOffsetRef.current) {
                            moveOffsetRef.current = {
                                left: point.x - rect.left,
                                top: point.y - rect.top,
                            };
                        }

                        // 计算新的左上角位置（保持鼠标点击点相对于矩形的偏移量不变
                        const firstPointPosition = limitPosition(
                            {
                                left: point.x - moveOffsetRef.current.left,
                                top: point.y - moveOffsetRef.current.top,
                            },
                            rect.width,
                            rect.height,
                        );
                        firstPoint = new fabric.Point(
                            firstPointPosition.left,
                            firstPointPosition.top,
                        );
                        secondPoint = new fabric.Point(
                            firstPoint.x + rect.width,
                            firstPoint.y + rect.height,
                        );
                    } else {
                        return;
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

            if (waitSelectWindowFromMousePositionPointRef.current) {
                waitSelectWindowFromMousePositionRef.current = false;
                const tempPoint = waitSelectWindowFromMousePositionPointRef.current;
                waitSelectWindowFromMousePositionPointRef.current = undefined;
                onMouseMove(tempPoint);
            }
        },
        [limitPosition, limitSize, selectWindowFromMousePosition],
    );

    // 处理鼠标按下事件
    const onMouseDown = useCallback(
        (point: fabric.Point) => {
            const currentCursor = changeCursor(point);

            const rect = maskRectClipPathRef.current;
            if (!fabricRef.current || !rect) {
                return;
            }

            let needRender = false;

            if (captureStepRef.current === CaptureStep.Select) {
                if (!wrapRef.current || !maskRectRef.current) {
                    return;
                }

                rect.set('active', true);

                startPointRef.current = { x: point.x, y: point.y };

                needRender = false;
            } else if (captureStepRef.current === CaptureStep.Draw) {
                if (drawStateRef.current === DrawState.Idle) {
                    setDrawState(DrawState.Resize);
                    resizeModeRef.current = currentCursor;
                    moveOffsetRef.current = {
                        left: point.x - rect.left,
                        top: point.y - rect.top,
                    };
                    // 直接触发一次 onmousemove 事件
                    onMouseMove(point);
                } else if (drawStateRef.current === DrawState.Resize) {
                } else if (drawStateRef.current === DrawState.Pen) {
                }
            }

            resizeClipPathControlRef.current();

            if (needRender) {
                fabricRef.current.renderAll();
            }
        },
        [changeCursor, onMouseMove, setDrawState],
    );

    // 处理鼠标松开事件
    const onMouseUp = useCallback(() => {
        if (captureStepRef.current === CaptureStep.Select) {
            if (!fabricRef.current || !maskRectClipPathRef.current) {
                return;
            }

            startPointRef.current = undefined;
            setCaptureStep(CaptureStep.Draw);
        } else if (captureStepRef.current === CaptureStep.Draw) {
            if (drawStateRef.current === DrawState.Idle) {
            } else if (drawStateRef.current === DrawState.Resize) {
                setDrawState(DrawState.Idle);
                resizeModeRef.current = 'auto';

                // 将矩形的宽高可能变成负数了，纠正成正数
                const rect = maskRectClipPathRef.current;
                if (!rect) {
                    return;
                }

                let left = rect.left;
                let top = rect.top;
                let width = rect.width;
                let height = rect.height;

                if (width < 0) {
                    left += width;
                    width = -width;
                }

                if (height < 0) {
                    top += height;
                    height = -height;
                }

                rect.set({
                    left,
                    top,
                    width,
                    height,
                });

                // 矩形渲染位置和面积不变，不用重新渲染
            }
        }
    }, [setCaptureStep, setDrawState]);

    useEffect(() => {
        const appWindow = appWindowRef.current;
        if (!appWindow) {
            return;
        }

        let mouseDownUnlisten: VoidFunction;
        let mouseMoveUnlisten: VoidFunction;
        let mouseUpUnlisten: VoidFunction;
        let canvas: fabric.Canvas;
        const initFabric = async () => {
            if (!canvasRef.current || !wrapRef.current) {
                return;
            }

            const canvasWidth = wrapRef.current.clientWidth;
            const canvasHeight = wrapRef.current.clientHeight;

            fabric.InteractiveFabricObject.ownDefaults = {
                ...fabric.InteractiveFabricObject.ownDefaults,
                cornerStyle: 'circle',
                cornerSize: 9,
                cornerColor: 'white',
                cornerStrokeColor: '#4096ff',
                borderColor: '#69b1ff',
                transparentCorners: false,
                borderScaleFactor: 2,
            };

            // 初始化 Fabric 画布
            canvas = new fabric.Canvas(canvasRef.current, {
                width: canvasWidth,
                height: canvasHeight,
                selection: false,
                imageSmoothingEnabled: false,
                enableRetinaScaling: true,
            });
            fabricRef.current = canvas;

            // 监听鼠标事件
            mouseDownUnlisten = canvas.on('mouse:down', (e) => {
                const point = canvas.getScenePoint(e.e);
                onMouseDown(point);
            });

            let rendered = true;
            let currentPoint = new fabric.Point(0, 0);
            mouseMoveUnlisten = canvas.on('mouse:move', (e) => {
                currentPoint = canvas.getScenePoint(e.e);
                changeCursor(currentPoint);
                if (!rendered) {
                    return;
                }

                rendered = false;
                requestAnimationFrame(() => {
                    rendered = true;
                    onMouseMove(currentPoint);
                });
            });
            mouseUpUnlisten = canvas.on('mouse:up', () => {
                onMouseUp();
                maskRectObjectListRef.current.forEach((object) => {
                    fabricRef.current!.bringObjectToFront(object);
                });
            });
        };

        const disposeFabric = () => {
            mouseDownUnlisten?.();
            mouseMoveUnlisten?.();
            mouseUpUnlisten?.();
            canvas?.dispose();
        };

        Promise.all([
            appWindow.setAlwaysOnTop(process.env.NODE_ENV !== 'development'),
            appWindow.setPosition(new PhysicalPosition(0, 0)),
            appWindow.setFullscreen(true),
        ]).then(() => {
            initFabric();
        });

        return () => {
            disposeFabric();
        };
    }, [changeCursor, onMouseDown, onMouseMove, onMouseUp]);

    useEffect(() => {
        const initImage = async () => {
            const appWindow = appWindowRef.current;
            if (!appWindow || !canvasRef.current || !wrapRef.current || !fabricRef.current) {
                return;
            }

            if (!imageBuffer) {
                return;
            }

            fabric.config.perfLimitSizeTotal =
                imageBuffer.monitorWidth *
                imageBuffer.monitorHeight *
                imageBuffer.monitorScaleFactor;
            fabric.config.maxCacheSideLimit =
                Math.max(imageBuffer.monitorWidth, imageBuffer.monitorHeight) *
                imageBuffer.monitorScaleFactor;
            fabric.config.textureSize =
                imageBuffer.monitorWidth *
                imageBuffer.monitorHeight *
                imageBuffer.monitorScaleFactor;

            const canvasWidth = wrapRef.current.clientWidth;
            const canvasHeight = wrapRef.current.clientHeight;

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
            imageLayerRef.current = imgLayer;

            // 添加遮罩
            const selectWindow = await selectWindowFromMousePosition(imageBuffer);
            maskRectClipPathRef.current = new fabric.Rect({
                width: 0,
                height: 0,
                left: 0,
                top: 0,
                ...selectWindow,
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
                width: canvasWidth,
                height: canvasHeight,
                left: 0,
                top: 0,
                fill: darkMode ? '#434343' : '#000000',
                opacity: 0.5,
                selectable: false,
                absolutePositioned: true,
                clipPath: maskRectClipPathRef.current,
                evented: false,
            });
            maskRectObjectListRef.current.push(maskRectRef.current);
            // 设置边框
            const borderOptiopns: fabric.TOptions<fabric.FabricObjectProps> = {
                stroke: '#4096ff',
                strokeWidth: 2,
                selectable: false,
                opacity: 0,
                absolutePositioned: true,
            };
            const topBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const rightBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const bottomBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);
            const leftBorder = new fabric.Line([0, 0, 0, 0], borderOptiopns);

            const circleOptions: fabric.TOptions<fabric.FabricObjectProps> = {
                radius: 4,
                left: 0,
                top: 0,
                fill: '#4096ff',
                stroke: 'white',
                strokeWidth: 1,
                opacity: 0,
                absolutePositioned: true,
                selectable: false,
            };

            const polylineWidth = 33;
            const polylineWidthCenter = polylineWidth / 3;
            const polylineHeight = 0;
            const polylineStrokeWidth = 6;
            const polylineOptions: fabric.TOptions<fabric.FabricObjectProps> = {
                fill: 'transparent',
                stroke: 'white',
                strokeWidth: polylineStrokeWidth,
                strokeLineJoin: 'round',
                strokeLineCap: 'round',
                shadow: new fabric.Shadow({
                    color: token.colorPrimaryHover,
                    blur: 3,
                    offsetX: 0,
                    offsetY: 0,
                    affectStroke: true,
                }),
                absolutePositioned: true,
                selectable: false,
                opacity: 0,
            };
            const topLeftPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineWidth, y: 0 },
                    { x: polylineWidth, y: polylineHeight },
                    { x: polylineHeight, y: polylineHeight },
                    { x: polylineHeight, y: polylineWidth },
                    { x: 0, y: polylineWidth },
                ],
                polylineOptions,
            );
            const topPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineWidthCenter, y: 0 },
                    { x: polylineWidthCenter, y: polylineHeight },
                    { x: 0, y: polylineHeight },
                ],
                polylineOptions,
            );
            const topRightPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: -polylineWidth, y: 0 },
                    { x: -polylineWidth, y: polylineHeight },
                    { x: polylineHeight, y: polylineHeight },
                    { x: polylineHeight, y: polylineWidth },
                    { x: 0, y: polylineWidth },
                ],
                polylineOptions,
            );
            const rightPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineHeight, y: 0 },
                    { x: polylineHeight, y: polylineWidthCenter },
                    { x: 0, y: polylineWidthCenter },
                ],
                polylineOptions,
            );
            const bottomRightPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: -polylineWidth, y: 0 },
                    { x: -polylineWidth, y: polylineHeight },
                    { x: polylineHeight, y: polylineHeight },
                    { x: polylineHeight, y: -polylineWidth },
                    { x: 0, y: -polylineWidth },
                ],
                polylineOptions,
            );
            const bottomPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineWidthCenter, y: 0 },
                    { x: polylineWidthCenter, y: polylineHeight },
                    { x: 0, y: polylineHeight },
                ],
                polylineOptions,
            );
            const bottomLeftPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineWidth, y: 0 },
                    { x: polylineWidth, y: polylineHeight },
                    { x: polylineHeight, y: polylineHeight },
                    { x: polylineHeight, y: -polylineWidth },
                    { x: 0, y: -polylineWidth },
                ],
                polylineOptions,
            );
            const leftPolyline = new fabric.Polyline(
                [
                    { x: 0, y: 0 },
                    { x: polylineHeight, y: 0 },
                    { x: polylineHeight, y: polylineWidthCenter },
                    { x: 0, y: polylineWidthCenter },
                ],
                polylineOptions,
            );

            const topLeftCircle = new fabric.Circle(circleOptions);
            const topCircle = new fabric.Circle(circleOptions);
            const topRightCircle = new fabric.Circle(circleOptions);
            const rightCircle = new fabric.Circle(circleOptions);
            const bottomRightCircle = new fabric.Circle(circleOptions);
            const bottomCircle = new fabric.Circle(circleOptions);
            const bottomLeftCircle = new fabric.Circle(circleOptions);
            const leftCircle = new fabric.Circle(circleOptions);

            maskRectObjectListRef.current.push(topBorder, rightBorder, bottomBorder, leftBorder);
            if (controlNode === AppSettingsControlNode.Circle) {
                maskRectObjectListRef.current.push(
                    topLeftCircle,
                    topCircle,
                    topRightCircle,
                    rightCircle,
                    bottomRightCircle,
                    bottomCircle,
                    bottomLeftCircle,
                    leftCircle,
                );
            } else if (controlNode === AppSettingsControlNode.Polyline) {
                maskRectObjectListRef.current.push(
                    topLeftPolyline,
                    topPolyline,
                    topRightPolyline,
                    rightPolyline,
                    bottomRightPolyline,
                    bottomPolyline,
                    bottomLeftPolyline,
                    leftPolyline,
                );
            }
            maskRectObjectListRef.current.forEach((object) => {
                fabricRef.current!.add(object);
            });

            let previousLeft: number | undefined = undefined;
            let previousTop: number | undefined = undefined;
            let previousWidth: number | undefined = undefined;
            let previousHeight: number | undefined = undefined;
            resizeClipPathControlRef.current = () => {
                const rect = maskRectClipPathRef.current;
                if (!rect) {
                    return;
                }

                let left = rect.left;
                let top = rect.top;
                let width = rect.width;
                let height = rect.height;

                // 矩形的宽高可能是负数，转换回来
                if (width < 0) {
                    left += width;
                    width = -width;
                }

                if (height < 0) {
                    top += height;
                    height = -height;
                }

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
                    opacity: 1,
                });
                rightBorder.set({
                    x1: left + width,
                    y1: top,
                    x2: left + width,
                    y2: top + height,
                    opacity: 1,
                });
                bottomBorder.set({
                    x1: left,
                    y1: top + height,
                    x2: left + width,
                    y2: top + height,
                    opacity: 1,
                });
                leftBorder.set({
                    x1: left,
                    y1: top,
                    x2: left,
                    y2: top + height,
                    opacity: 1,
                });

                if (controlNode === AppSettingsControlNode.Circle) {
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
                } else if (controlNode === AppSettingsControlNode.Polyline) {
                    // 显示边角
                    const showCornerSpace = polylineWidth * 3;
                    const showCorner = width > showCornerSpace && height > showCornerSpace;
                    const cornerOpacity = showCorner ? 1 : 0;
                    const showCenterSpace = showCornerSpace + polylineWidthCenter * 3;
                    const showCenter = width > showCenterSpace && height > showCenterSpace;
                    const centerOpacity = showCenter ? 1 : 0;
                    const halfPolylineStrokeWidth = polylineStrokeWidth / 2;
                    if (showCorner) {
                        topLeftPolyline.set({
                            left: left - halfPolylineStrokeWidth,
                            top: top - halfPolylineStrokeWidth,
                        });
                        topRightPolyline.set({
                            left: left + width - polylineWidth - halfPolylineStrokeWidth,
                            top: top - halfPolylineStrokeWidth,
                        });
                        bottomRightPolyline.set({
                            left: left + width - halfPolylineStrokeWidth - polylineWidth,
                            top: top + height - halfPolylineStrokeWidth - polylineWidth,
                        });
                        bottomLeftPolyline.set({
                            left: left - halfPolylineStrokeWidth,
                            top: top + height - halfPolylineStrokeWidth - polylineWidth,
                        });
                    }

                    if (showCenter) {
                        const halfWidth = width / 2;
                        const halfHeight = height / 2;
                        const strokeOffset = polylineStrokeWidth / 2;
                        topPolyline.set({
                            left: left + halfWidth - polylineWidthCenter + strokeOffset,
                            top: top - halfPolylineStrokeWidth,
                        });
                        bottomPolyline.set({
                            left: left + halfWidth - polylineWidthCenter + strokeOffset,
                            top: top + height - halfPolylineStrokeWidth,
                        });
                        rightPolyline.set({
                            left: left + width - halfPolylineStrokeWidth,
                            top: top + halfHeight - polylineWidthCenter + strokeOffset,
                        });
                        leftPolyline.set({
                            left: left - halfPolylineStrokeWidth,
                            top: top + halfHeight - polylineWidthCenter + strokeOffset,
                        });
                    }

                    topLeftPolyline.set('opacity', cornerOpacity);
                    topRightPolyline.set('opacity', cornerOpacity);
                    bottomRightPolyline.set('opacity', cornerOpacity);
                    bottomLeftPolyline.set('opacity', cornerOpacity);

                    topPolyline.set('opacity', centerOpacity);
                    rightPolyline.set('opacity', centerOpacity);
                    bottomPolyline.set('opacity', centerOpacity);
                    leftPolyline.set('opacity', centerOpacity);
                }

                previousLeft = left;
                previousTop = top;
                previousWidth = width;
                previousHeight = height;
            };
            resizeClipPathControlRef.current();

            canvasHistoryRef.current = new FabricHistory(fabricRef.current);
            await appWindow.show();
        };

        initImage();

        return () => {
            fabricRef.current?.remove(...fabricRef.current.getObjects());
            maskRectObjectListRef.current = [];
            canvasUnlistenListRef.current.forEach((unlisten) => unlisten());
            canvasUnlistenListRef.current = [];
            activeObjectListRef.current = new Set();
            canvasHistoryRef.current = undefined;
        };
    }, [
        controlNode,
        darkMode,
        imageBuffer,
        selectWindowFromMousePosition,
        setCaptureStep,
        setDrawState,
        token.colorPrimaryHover,
    ]);

    const initState = useCallback(() => {
        setCaptureStep(CaptureStep.Select);
        setDrawState(DrawState.Idle);
        resizeModeRef.current = 'auto';
        lastWindowInfoRef.current = undefined;
        moveOffsetRef.current = {
            left: 0,
            top: 0,
        };
        startPointRef.current = undefined;
    }, [setCaptureStep, setDrawState]);

    useEffect(() => {
        if (imageBuffer) {
        } else {
            initState();
            appWindowRef.current?.hide();
        }
    }, [imageBuffer, initState]);

    useEffect(() => {
        const mouseRightClick = (e: MouseEvent) => {
            e.preventDefault();
            if (captureStepRef.current === CaptureStep.Draw) {
                initState();
                onMouseMove(new fabric.Point(0, 0));
            }
        };

        document.addEventListener('contextmenu', mouseRightClick);

        return () => {
            document.removeEventListener('contextmenu', mouseRightClick);
        };
    }, [initState, onMouseMove]);

    useEffect(() => {
        changeCursor(new fabric.Point(0, 0));
    }, [changeCursor, drawState, captureStep]);

    return (
        <DrawContext.Provider
            value={{
                fabricRef,
                canvasRef,
                maskRectObjectListRef,
                maskRectRef,
                maskRectClipPathRef,
                circleCursorRef,
                imageBufferRef,
                canvasCursorRef,
                canvasUnlistenListRef,
                imageLayerRef,
                canvasHistoryRef,
            }}
        >
            <div className="draw-wrap" data-tauri-drag-region ref={wrapRef}>
                <canvas
                    className="draw-canvas"
                    ref={canvasRef}
                    style={{ zIndex: zIndexs.Draw_Canvas }}
                />
                <DrawToolbar
                    step={captureStep}
                    drawState={drawState}
                    setDrawState={setDrawState}
                    onCancel={onCancel}
                />
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

            <div ref={circleCursorRef} className="draw-toolbar-cursor">
                <style jsx>{`
                    .draw-toolbar-cursor {
                        left: 0;
                        top: 0;
                        position: absolute;
                        z-index: ${zIndexs.Draw_Cursor};
                        width: 0px;
                        height: 0px;
                        background-color: transparent;
                        border: 1px solid #0000008d;
                        border-radius: 50%;
                        cursor: none;
                        pointer-events: none;
                    }
                `}</style>
            </div>
        </DrawContext.Provider>
    );
};

const DrawPage: React.FC = () => {
    const [imageBuffer, setImageBuffer] = useState<ImageBuffer | undefined>(undefined);
    const { addListener, removeListener } = useContext(EventListenerContext);
    useEffect(() => {
        const listenerId = addListener('execute-screenshot', async () => {
            setImageBuffer(await captureCurrentMonitor(ImageEncoder.WebP));
        });
        return () => {
            removeListener(listenerId);
        };
    }, [addListener, removeListener]);

    const reload = useCallback(() => {
        setImageBuffer(undefined);
    }, []);

    return <DrawContent onCancel={reload} imageBuffer={imageBuffer} />;
};

export default React.memo(DrawPage);
