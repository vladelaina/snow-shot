// 'use client';

// import {
//     useContext,
//     useRef,
//     useEffect,
//     useCallback,
//     useState,
//     useImperativeHandle,
//     RefObject,
// } from 'react';
// import { AppSettingsContext, AppSettingsControlNode } from '../contextWrap';
// import {
//     captureCurrentMonitor,
//     ElementInfo,
//     ElementRect,
//     getElementFromPosition,
//     getElementInfo,
//     ImageBuffer,
//     ImageEncoder,
//     initUiElementsCache,
// } from '@/commands';
// import * as fabric from 'fabric';
// import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
// import { PhysicalPosition } from '@tauri-apps/api/dpi';
// import { zIndexs } from '@/utils/zIndex';
// import { DrawToolbar } from './components/drawToolbar';
// import { EventListenerContext } from '@/components/eventListener';
// import React from 'react';
// import { CaptureStep, DrawState, getMaskBackgroundColor } from './types';
// import { theme } from 'antd';
// import { FabricHistory, ignoreHistory } from '@/utils/fabricjsHistory';
// import { DrawContentActionType, DrawContext } from './context';
// import Flatbush from 'flatbush';
// import StatusBar from './components/statusBar';
// import { useHotkeys } from 'react-hotkeys-hook';
// import { ColorPicker } from './components/colorPicker';

type CanvasPosition = {
    left: number;
    top: number;
};

type CanvasSize = {
    width: number;
    height: number;
};

type DrawContentProps = {
    onCancel: () => void;
    imageBuffer: ImageBuffer | undefined;
    getElementRectFromMousePosition: (mouseX: number, mouseY: number) => Promise<ElementRect[]>;
    getElementRectFromMousePositionLoading: boolean;
    actionRef: RefObject<DrawContentActionType | undefined>;
};

type SelectWindowFromMousePositionCallback = (
    image: ImageBuffer,
    point: fabric.Point,
) => Promise<
    | {
          left: number;
          top: number;
          width: number;
          height: number;
      }
    | undefined
>;

export const setSelectOnClick = (object: fabric.Object) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (object as any).selectOnClick = true;
};

export const isSelectOnClick = (object: fabric.Object | undefined) => {
    if (!object) {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(object as any).selectOnClick;
};

const maskOpacity = 0.5;
const DrawContent: React.FC<DrawContentProps> = ({
    onCancel,
    imageBuffer,
    getElementRectFromMousePosition,
    getElementRectFromMousePositionLoading,
    actionRef,
}) => {
    const { token } = theme.useToken();

    const {
        common: { darkMode },
        screenshot: { controlNode, findChildrenElements },
    } = useContext(AppSettingsContext);

    const findChildrenElementsRef = useRef(findChildrenElements);
    useEffect(() => {
        findChildrenElementsRef.current = findChildrenElements;
    }, [findChildrenElements]);

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
    const objectCacheRef = useRef<Record<string, fabric.Object>>({});
    const canvasHistoryRef = useRef<FabricHistory | undefined>(undefined);

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
    const setDrawState = useCallback((val: DrawState | ((prev: DrawState) => DrawState)) => {
        drawStateRef.current = typeof val === 'function' ? val(drawStateRef.current) : val;
        _setDrawState(drawStateRef.current);
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

    const normalizePositionAndSize = useCallback(
        (left: number, top: number, width: number, height: number) => {
            const maskRect = maskRectRef.current;
            if (!maskRect) {
                return { left, top, width, height };
            }

            const minLeft = 0;
            const minTop = 0;
            const maxLeft = maskRect.left + maskRect.width;
            const maxTop = maskRect.top + maskRect.height;

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

            const minWidth = 0;
            const minHeight = 0;
            const maxWidth = maxLeft - left;
            const maxHeight = maxTop - top;

            if (width < minWidth) {
                width = minWidth;
            } else if (width > maxWidth) {
                width = maxWidth;
            }

            if (height < minHeight) {
                height = minHeight;
            } else if (height > maxHeight) {
                height = maxHeight;
            }

            return { left, top, width, height };
        },
        [],
    );

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
            } else if (drawStateRef.current === DrawState.Select) {
                cursor = 'crosshair';
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

    const selectWindowFromMousePositionLevelRef = useRef(0);
    const selectWindowFromMousePositionCallbackRef =
        useRef<SelectWindowFromMousePositionCallback>(undefined);

    useEffect(() => {
        selectWindowFromMousePositionCallbackRef.current = async (
            image: ImageBuffer,
            point: fabric.Point,
        ) => {
            const monitorX = image.monitorX;
            const monitorY = image.monitorY;
            const mouseScaleFactor = image.monitorScaleFactor;
            const monitorScale = 1 / mouseScaleFactor;
            const monitorWidth = image.monitorWidth;
            const monitorHeight = image.monitorHeight;

            const mouseX = monitorX + point.x * mouseScaleFactor;
            const mouseY = monitorY + point.y * mouseScaleFactor;
            const elementRectList = await getElementRectFromMousePosition(
                mouseX * monitorScale,
                mouseY * monitorScale,
            );

            const minLevel = 0;
            const maxLevel = Math.max(elementRectList.length - 1, minLevel);
            let currentLevel = selectWindowFromMousePositionLevelRef.current;
            if (currentLevel < minLevel) {
                currentLevel = minLevel;
            } else if (currentLevel > maxLevel) {
                currentLevel = maxLevel;
                selectWindowFromMousePositionLevelRef.current = maxLevel;
            }

            const lastElementRect = elementRectList[currentLevel] ?? {
                min_x: 0,
                min_y: 0,
                max_x: monitorWidth * monitorScale,
                max_y: monitorHeight * monitorScale,
            };

            return normalizePositionAndSize(
                lastElementRect.min_x,
                lastElementRect.min_y,
                lastElementRect.max_x - lastElementRect.min_x,
                lastElementRect.max_y - lastElementRect.min_y,
            );
        };
    }, [getElementRectFromMousePosition, normalizePositionAndSize]);

    const lastMouseMovePointRef = useRef<fabric.Point | undefined>(undefined);
    const selectWindowFromMousePositionCallbackPendingRef = useRef(false);
    const onMouseMove = useCallback(
        async (point: fabric.Point) => {
            lastMouseMovePointRef.current = point;

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

                    if (selectWindowFromMousePositionCallbackPendingRef.current) {
                        return;
                    }

                    selectWindowFromMousePositionCallbackPendingRef.current = true;
                    const res = await selectWindowFromMousePositionCallbackRef.current?.(
                        imageBuffer,
                        point,
                    );
                    selectWindowFromMousePositionCallbackPendingRef.current = false;
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
        },
        [limitPosition, limitSize],
    );

    const onMouseMoveRefresh = useCallback(async () => {
        if (!lastMouseMovePointRef.current) {
            return;
        }

        await onMouseMove(lastMouseMovePointRef.current);
    }, [onMouseMove]);

    // 选取更新时，自动选择下
    useEffect(() => {
        if (captureStepRef.current === CaptureStep.Select) {
            if (startPointRef.current) {
            } else {
                onMouseMoveRefresh();
            }
        }
    }, [getElementRectFromMousePosition, onMouseMoveRefresh]);

    const onMouseWheel = useCallback(
        (e: fabric.TPointerEventInfo<WheelEvent>) => {
            if (captureStepRef.current === CaptureStep.Select) {
                if (startPointRef.current) {
                } else {
                    const deltaLevel = e.e.deltaY > 0 ? 1 : -1;
                    selectWindowFromMousePositionLevelRef.current = Math.max(
                        selectWindowFromMousePositionLevelRef.current + deltaLevel,
                        0,
                    );
                    onMouseMoveRefresh();
                }
            }
        },
        [onMouseMoveRefresh],
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
    const onMouseUp = useCallback(
        (e: { currentTarget?: fabric.FabricObject }) => {
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
                } else if (drawStateRef.current === DrawState.Select) {
                    const currentObject = e.currentTarget;
                    if (!isSelectOnClick(currentObject)) {
                        return;
                    }

                    fabricRef.current?.setActiveObject(currentObject!);
                }
            }
        },
        [setCaptureStep, setDrawState],
    );

    useEffect(() => {
        const appWindow = appWindowRef.current;
        if (!appWindow) {
            return;
        }

        let mouseDownUnlisten: VoidFunction;
        let mouseMoveUnlisten: VoidFunction;
        let mouseUpUnlisten: VoidFunction;
        let mouseWheelUnlisten: VoidFunction;
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
            let lastCursor = 'default';
            mouseMoveUnlisten = canvas.on('mouse:move', (e) => {
                currentPoint = canvas.getScenePoint(e.e);
                canvas.setCursor(lastCursor);
                if (!rendered) {
                    return;
                }

                rendered = false;
                requestAnimationFrame(async () => {
                    lastCursor = changeCursor(currentPoint);
                    await onMouseMove(currentPoint);
                    rendered = true;
                });
            });
            mouseUpUnlisten = canvas.on('mouse:up', (e) => {
                onMouseUp(e);
                if (maskRectRef.current) {
                    fabricRef.current!.bringObjectToFront(maskRectRef.current);
                }
                maskRectObjectListRef.current.forEach((object) => {
                    fabricRef.current!.bringObjectToFront(object);
                });
            });
            mouseWheelUnlisten = canvas.on('mouse:wheel', onMouseWheel);
        };

        const disposeFabric = () => {
            mouseDownUnlisten?.();
            mouseMoveUnlisten?.();
            mouseUpUnlisten?.();
            mouseWheelUnlisten?.();
            canvas?.dispose();
        };

        initFabric();

        return () => {
            disposeFabric();
        };
    }, [changeCursor, onMouseDown, onMouseMove, onMouseUp, onMouseWheel]);

    const [imageLoading, setImageLoading] = useState(true);
    useEffect(() => {
        const appWindow = appWindowRef.current;
        if (!appWindow) {
            return;
        }

        const initImage = async () => {
            if (!canvasRef.current || !wrapRef.current || !fabricRef.current) {
                return;
            }

            if (!imageBuffer) {
                return;
            }

            setImageLoading(true);

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

            const canvasWidth = imageBuffer.monitorWidth / imageBuffer.monitorScaleFactor;
            const canvasHeight = imageBuffer.monitorHeight / imageBuffer.monitorScaleFactor;

            const resizePromise = Promise.all([
                appWindow.setAlwaysOnTop(process.env.NODE_ENV !== 'development'),
                appWindow.setPosition(
                    new PhysicalPosition(imageBuffer.monitorX, imageBuffer.monitorY),
                ),
                appWindow.setFullscreen(true),
                new Promise((resolve) => {
                    wrapRef.current!.style.width = `${canvasWidth}px`;
                    wrapRef.current!.style.height = `${canvasHeight}px`;

                    fabricRef.current!.setDimensions({
                        height: canvasHeight,
                        width: canvasWidth,
                    });

                    resolve(undefined);
                }),
            ]);

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
            ignoreHistory(imgLayer);
            imageLayerRef.current = imgLayer;

            lastMouseMovePointRef.current =
                lastMouseMovePointRef.current ??
                new fabric.Point(
                    imageBuffer.mouseX / imageBuffer.monitorScaleFactor,
                    imageBuffer.mouseY / imageBuffer.monitorScaleFactor,
                );
            // 添加遮罩
            maskRectClipPathRef.current = new fabric.Rect({
                left: 0,
                top: 0,
                width: canvasWidth,
                height: canvasHeight,
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
                fill: getMaskBackgroundColor(darkMode),
                opacity: maskOpacity,
                selectable: false,
                absolutePositioned: true,
                clipPath: maskRectClipPathRef.current,
                evented: false,
            });
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
            fabricRef.current!.add(maskRectRef.current);
            ignoreHistory(maskRectRef.current);
            maskRectObjectListRef.current.forEach((object) => {
                fabricRef.current!.add(object);
                ignoreHistory(object);
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

            await resizePromise;
            await appWindow.show();
            setImageLoading(false);
        };

        initImage();

        return () => {
            fabricRef.current?.remove(...fabricRef.current.getObjects());
            maskRectObjectListRef.current = [];
            canvasUnlistenListRef.current.forEach((unlisten) => unlisten());
            canvasUnlistenListRef.current = [];
            canvasHistoryRef.current = undefined;
            objectCacheRef.current = {};
            selectWindowFromMousePositionLevelRef.current = 0;
            lastMouseMovePointRef.current = undefined;
        };
    }, [
        controlNode,
        darkMode,
        imageBuffer,
        onMouseMoveRefresh,
        setCaptureStep,
        setDrawState,
        token.colorPrimaryHover,
    ]);

    const initState = useCallback(() => {
        setCaptureStep(CaptureStep.Select);
        setDrawState(DrawState.Idle);
        resizeModeRef.current = 'auto';
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
                if (drawStateRef.current !== DrawState.Select) {
                    setDrawState(DrawState.Select);
                    return;
                }

                initState();
                onMouseMoveRefresh();
            } else if (captureStepRef.current === CaptureStep.Select) {
                onCancel();
            }
        };

        document.addEventListener('contextmenu', mouseRightClick);

        return () => {
            document.removeEventListener('contextmenu', mouseRightClick);
        };
    }, [initState, onCancel, onMouseMoveRefresh, setDrawState]);

    useEffect(() => {
        changeCursor(lastMouseMovePointRef.current ?? new fabric.Point(0, 0));
    }, [changeCursor, drawState, captureStep]);

    useImperativeHandle(
        actionRef,
        () => ({
            onMouseMoveRefresh,
        }),
        [onMouseMoveRefresh],
    );

    const setMaskVisible = useCallback((visible: boolean) => {
        const maskRect = maskRectRef.current;
        const maskRectObjectList = maskRectObjectListRef.current;
        if (!maskRect || !maskRectObjectList) {
            return;
        }

        maskRect.set({
            opacity: visible ? maskOpacity : 0,
        });
        maskRectObjectList.forEach((object) => {
            object.set({
                opacity: visible ? 1 : 0,
            });
        });
    }, []);
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
                objectCacheRef,
                canvasHistoryRef,
                actionRef,
                setMaskVisible,
            }}
        >
            <div className="draw-wrap" data-tauri-drag-region ref={wrapRef}>
                <canvas
                    className="draw-canvas"
                    ref={canvasRef}
                    style={{ zIndex: zIndexs.Draw_Canvas }}
                />
                <StatusBar
                    loadingElements={getElementRectFromMousePositionLoading}
                    captureStep={captureStep}
                    drawState={drawState}
                    enable={!!imageBuffer && !imageLoading}
                />

                <DrawToolbar
                    step={captureStep}
                    drawState={drawState}
                    setDrawState={setDrawState}
                    onCancel={onCancel}
                    enable={!!imageBuffer && !imageLoading}
                />

                {!imageLoading && (
                    <ColorPicker
                        captureStep={captureStep}
                        drawState={drawState}
                        onCopyColor={onCancel}
                    />
                )}

                <style jsx>{`
                    .draw-wrap {
                        height: 100vh;
                        width: 100vw;
                    }

                    .draw-canvas {
                        width: 100%
                        height: 100%;
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
    const [imageBuffer, _setImageBuffer] = useState<ImageBuffer | undefined>(undefined);
    const imageBufferRef = useRef<ImageBuffer | undefined>(undefined);
    const setImageBuffer = useCallback((imageBuffer: ImageBuffer | undefined) => {
        imageBufferRef.current = imageBuffer;
        _setImageBuffer(imageBuffer);
    }, []);
    const elementInfoRef = useRef<ElementInfo | undefined>(undefined);
    const [elementsRTree, setElementsRTree] = useState<Flatbush | undefined>(undefined);
    const { addListener, removeListener } = useContext(EventListenerContext);

    const actionRef = useRef<DrawContentActionType | undefined>(undefined);

    const {
        screenshot: { findChildrenElements },
    } = useContext(AppSettingsContext);
    const findChildrenElementsRef = useRef<boolean>(false);
    const [tabFindChildrenElements, setTabFindChildrenElements] = useState<boolean | undefined>(
        undefined,
    );
    useEffect(() => {
        if (findChildrenElements) {
            findChildrenElementsRef.current = tabFindChildrenElements ?? findChildrenElements;
            actionRef.current?.onMouseMoveRefresh();
        }
    }, [findChildrenElements, tabFindChildrenElements]);

    const initUiElementsReadyRef = useRef(false);
    useEffect(() => {
        const listenerId = addListener('execute-screenshot', async () => {
            if (imageBufferRef.current) {
                return;
            }

            elementInfoRef.current = undefined;
            setElementsRTree(undefined);
            getElementInfo()
                .then((elementInfo) => {
                    elementInfoRef.current = elementInfo;
                    const rTree = new Flatbush(elementInfo.rect_list.length);
                    const scale = 1 / elementInfo.scale_factor;
                    elementInfo.rect_list.forEach((rect) => {
                        rect.min_x *= scale;
                        rect.min_y *= scale;
                        rect.max_x *= scale;
                        rect.max_y *= scale;
                        rTree.add(rect.min_x, rect.min_y, rect.max_x, rect.max_y);
                    });
                    rTree.finish();

                    setElementsRTree(rTree);
                })
                .finally(() => {
                    initUiElementsReadyRef.current = false;
                    initUiElementsCache().then(() => {
                        initUiElementsReadyRef.current = true;
                    });
                });

            captureCurrentMonitor(ImageEncoder.WebP).then((imageBuffer) => {
                setImageBuffer(imageBuffer);
            });
        });
        return () => {
            removeListener(listenerId);
        };
    }, [addListener, removeListener, setImageBuffer]);

    const reload = useCallback(() => {
        setImageBuffer(undefined);
    }, [setImageBuffer]);

    const getElementRectFromMousePosition = useCallback(
        async (mouseX: number, mouseY: number): Promise<ElementRect[]> => {
            if (!elementsRTree || !elementInfoRef.current) {
                return [];
            }

            const scale = 1 / elementInfoRef.current.scale_factor;

            let elementRectList = undefined;
            if (findChildrenElementsRef.current && initUiElementsReadyRef.current) {
                try {
                    elementRectList = await getElementFromPosition(
                        Math.round(mouseX / scale),
                        Math.round(mouseY / scale),
                    );

                    elementRectList.forEach((item) => {
                        item.min_x *= scale;
                        item.min_y *= scale;
                        item.max_x *= scale;
                        item.max_y *= scale;
                    });
                } catch {
                    // 获取元素失败，忽略
                }
            }

            let result;
            if (elementRectList) {
                result = elementRectList;
            } else {
                const rectIndexs = elementsRTree.search(mouseX, mouseY, mouseX, mouseY);
                rectIndexs.sort((a, b) => b - a);

                result = rectIndexs.map((index) => {
                    return elementInfoRef.current!.rect_list[index];
                });
            }

            return result;
        },
        [elementsRTree],
    );

    useHotkeys(
        'Tab',
        () => {
            setTabFindChildrenElements((prev) => (prev === undefined ? false : !prev));
        },
        {
            preventDefault: false,
            enabled: true,
        },
    );
    return (
        <DrawContent
            onCancel={reload}
            imageBuffer={imageBuffer}
            getElementRectFromMousePosition={getElementRectFromMousePosition}
            getElementRectFromMousePositionLoading={elementsRTree === undefined}
            actionRef={actionRef}
        />
    );
};

const Temp = () => {
    return <></>;
};

export default Temp;
