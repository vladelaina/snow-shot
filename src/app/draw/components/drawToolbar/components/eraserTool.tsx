import React, { useCallback, useContext, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import {
    defaultLineWidthPickerValue,
    LineWidthPicker,
    LineWidthPickerValue,
} from './pickers/lineWidthPicker';
import { DrawContext } from '@/app/draw/context';
import { useStateRef } from '@/hooks/useStateRef';
import { CircleCursor } from './pickers/components/circleCursor';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { defaultDrawRectValue, DrawRectPicker, DrawRectValue } from './pickers/drawRectPicker';
import { ignoreHistory } from '@/utils/fabricjsHistory';
import { clearMosaicCache } from './mosaicTool/mosaicTool';
import { setSelectOnClick } from '@/app/draw/page';

class EraserBrush extends fabric.PatternBrush {
    clipPathGroup?: fabric.Group;

    constructor(canvas: fabric.Canvas, clipPathGroup: fabric.Group | undefined) {
        super(canvas);
        this.clipPathGroup = clipPathGroup;
    }

    /**
     * Creates a Path object to add on canvas
     * @param {TSimplePathData} pathData Path data
     * @return {Path} Path to add on canvas
     */
    createPath(pathData: fabric.TSimplePathData): fabric.Path {
        const path = new fabric.Path(pathData, {
            fill: null,
            stroke: 'black',
            strokeWidth: this.width,
            strokeLineCap: this.strokeLineCap,
            strokeMiterLimit: this.strokeMiterLimit,
            strokeLineJoin: this.strokeLineJoin,
            strokeDashArray: this.strokeDashArray,
            globalCompositeOperation: 'multiply',
            selectable: false,
        });
        setSelectOnClick(path);
        if (this.shadow) {
            this.shadow.affectStroke = true;
            path.shadow = new fabric.Shadow(this.shadow);
        }

        path.on('removed', () => {
            this.clipPathGroup?.remove(path);
        });
        path.on('added', ({ target }) => {
            if (target === this.clipPathGroup) {
                return;
            }

            this.clipPathGroup?.add(path);
        });

        return path;
    }
}

export const EraserTool: React.FC = () => {
    const { fabricRef, imageBufferRef, canvasCursorRef, imageLayerRef, objectCacheRef } =
        useContext(DrawContext);

    const [width, setWidth] = useStateRef<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const [drawRect, setDrawRect, drawRectRef] = useStateRef<DrawRectValue>(defaultDrawRectValue);

    const eraserBrushRef = useRef<EraserBrush | undefined>(undefined);

    const lastBlurRef = useRef<
        | {
              drawRect: boolean;
          }
        | undefined
    >(undefined);
    const blurLayerRef = useRef<fabric.FabricImage | undefined>(undefined);
    const blurLayerMaskGroupRef = useRef<fabric.Group>(undefined);
    const updateFilter = useCallback(async () => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        if (lastBlurRef.current?.drawRect === drawRectRef.current.enable) {
            return;
        }
        lastBlurRef.current = {
            drawRect: drawRectRef.current.enable,
        };

        // 创建一个模糊图层
        let blurLayer: fabric.FabricImage;
        if (
            !blurLayerMaskGroupRef.current ||
            blurLayerMaskGroupRef.current.getObjects().length !== 0 ||
            !blurLayerRef.current
        ) {
            blurLayer = await imageLayerRef.current!.clone();

            // 设置遮罩
            const blurLayerMaskGroup = new fabric.Group([], {
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                scaleX: 0,
                scaleY: 0,
                originX: 'left',
                originY: 'top',
                hasControls: false,
                selectable: false,
                opacity: 0,
                absolutePositioned: true,
                evented: false,
                subTargetCheck: true,
            });
            blurLayerMaskGroupRef.current = blurLayerMaskGroup;
            blurLayer.set({
                left: 0,
                top: 0,
                selectable: false,
                clipPath: blurLayerMaskGroup,
                evented: false,
                dirty: true,
            });
            ignoreHistory(blurLayer);
            ignoreHistory(blurLayerMaskGroup);

            canvas.add(blurLayer);
            canvas.add(blurLayerMaskGroup);
        } else {
            blurLayer = blurLayerRef.current;
        }

        blurLayer.filters = [];
        blurLayer.applyFilters();
        blurLayerRef.current = blurLayer;

        if (drawRectRef.current.enable) {
            canvas.isDrawingMode = false;
        } else {
            const eraserBrush = eraserBrushRef.current;
            if (!eraserBrush) {
                return;
            }
            eraserBrush.clipPathGroup = blurLayerMaskGroupRef.current;

            // 使用处理后的图像作为画笔源
            const eraserBrushSource = await imageLayerRef.current!.clone();
            eraserBrushSource.filters = [];
            eraserBrushSource.applyFilters();
            eraserBrush.source = eraserBrushSource.toCanvasElement({
                format: 'jpeg',
                multiplier: 1,
                left: 0,
                top: 0,
            });
            canvas.isDrawingMode = true;
        }
    }, [drawRectRef, fabricRef, imageLayerRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        const eraserBrush = eraserBrushRef.current;
        if (!canvas || !eraserBrush) {
            return;
        }

        eraserBrush.width = width.width;
    }, [fabricRef, width]);

    useAppSettingsLoad(
        useCallback(async () => {
            const canvas = fabricRef.current;
            if (!canvas) {
                return;
            }

            const imageBuffer = imageBufferRef.current;
            if (!imageBuffer) {
                return;
            }

            updateFilter();
        }, [fabricRef, imageBufferRef, updateFilter]),
    );

    useEffect(() => {
        // 因为初始化时会自动调用一次更新，所以可以用是否有上一个记录判断是否是初始化
        if (lastBlurRef.current === undefined) {
            return;
        }

        updateFilter();
    }, [drawRect.enable, updateFilter]);

    useEffect(() => {
        const enableDrawRect = drawRect.enable;
        if (enableDrawRect) {
            canvasCursorRef.current = 'crosshair';
        } else {
            canvasCursorRef.current = 'auto';
        }

        return () => {
            canvasCursorRef.current = 'auto';
        };
    }, [canvasCursorRef, drawRect.enable, fabricRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        const eraserBrush = new EraserBrush(canvas, blurLayerMaskGroupRef.current);
        eraserBrushRef.current = eraserBrush;
        canvas.freeDrawingBrush = eraserBrush;

        return () => {
            canvas.freeDrawingBrush = undefined;
            canvas.isDrawingMode = false;
            if (
                blurLayerMaskGroupRef.current?.getObjects().length === 0 &&
                blurLayerMaskGroupRef.current
            ) {
                canvas.remove(blurLayerMaskGroupRef.current);
            }
        };
    }, [fabricRef, imageBufferRef]);

    useEffect(() => {
        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let shape: fabric.Rect | undefined = undefined;
        let shapeControls: fabric.Rect | undefined = undefined;
        const shapeOptions: fabric.TOptions<fabric.RectProps> = {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            absolutePositioned: true,
            originX: 'left',
            originY: 'top',
            hasControls: true,
            selectable: false,
            evented: true,
        };

        // 监听鼠标按下事件，开始绘制
        const onMouseDown = (event: fabric.TEvent<fabric.TPointerEvent>) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            if (!drawRectRef.current.enable) {
                return;
            }

            canvas.discardActiveObject();

            const pointer = canvas.getScenePoint(event.e);
            startX = pointer.x;
            startY = pointer.y;
            isDrawing = true;

            shape = new fabric.Rect({ ...shapeOptions, left: startX, top: startY });

            shapeControls = new fabric.Rect({
                left: startX,
                top: startY,
                width: 0,
                height: 0,
                absolutePositioned: true,
                originX: 'left',
                originY: 'top',
                hasControls: true,
                selectable: true,
                evented: true,
                fill: 'transparent',
                strokeWidth: 1,
                stroke: 'rgba(0, 0, 0, 0.16)',
            });
            ignoreHistory(shapeControls);

            const blurLayerMaskGroup = blurLayerMaskGroupRef.current!;
            const shapeCopy = shape;
            shape.on('removed', () => {
                blurLayerMaskGroup.remove(shapeCopy);
            });
            shape.on('added', ({ target }) => {
                if (target === blurLayerMaskGroup) {
                    return;
                }

                blurLayerMaskGroup.add(shapeCopy);
            });

            canvas.add(shape);
            setSelectOnClick(shape);
            canvas.add(shapeControls);
            blurLayerRef.current!.set('dirty', true);
        };

        // 监听鼠标移动事件，动态调整矩形大小
        const onMouseMoveCore = (point: fabric.Point) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            if (!isDrawing || !shape || !shapeControls) return;

            const left = Math.min(startX, point.x);
            const top = Math.min(startY, point.y);
            const width = Math.abs(point.x - startX);
            const height = Math.abs(point.y - startY);

            // 将全局坐标转换为 Group 内部的局部坐标
            const localPoint = new fabric.Point(left, top).transform(
                fabric.util.invertTransform(blurLayerMaskGroupRef.current!.calcTransformMatrix()),
            );
            shape.set({
                left: localPoint.x,
                top: localPoint.y,
                width,
                height,
            });
            shapeControls.set({
                left,
                top,
                width,
                height,
            });
            blurLayerRef.current!.set('dirty', true);
            canvas.renderAll();
        };
        let rendered = true;
        let currentPoint: fabric.Point | undefined = undefined;
        const onMouseMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            currentPoint = canvas.getScenePoint(e.e);
            if (!rendered) {
                return;
            }

            rendered = false;
            requestAnimationFrame(() => {
                rendered = true;

                if (!currentPoint) {
                    return;
                }

                onMouseMoveCore(currentPoint);

                currentPoint = undefined;
            });
        };

        const onMouseUp = () => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            // 清除下马赛克的缓存，避免橡皮擦擦除后无法应用马赛克效果
            if (objectCacheRef.current) {
                clearMosaicCache(objectCacheRef.current);
            }

            if (shape && shapeControls) {
                shape.set({ strokeWidth: 0 });
                canvas.remove(shapeControls);

                if (shape.width <= 1 || shape.height <= 1 || shape.width + shape.height <= 3) {
                    canvas.remove(shape);
                    return;
                }

                canvas.bringObjectToFront(shape);
                canvas.setActiveObject(shape);
            }
            isDrawing = false;
            shape = undefined;
        };

        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);

        const pathCreatedUnlisten = canvas.on('path:created', (e) => {
            canvas.setActiveObject(e.path);
        });

        return () => {
            canvas.off('mouse:down', onMouseDown);
            canvas.off('mouse:move', onMouseMove);
            canvas.off('mouse:up', onMouseUp);
            pathCreatedUnlisten();
        };
    }, [drawRectRef, fabricRef, objectCacheRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        return () => {
            if (blurLayerMaskGroupRef.current?.getObjects().length !== 0) {
                return;
            }

            canvas.remove(blurLayerRef.current!);
            canvas.remove(blurLayerMaskGroupRef.current!);
        };
    }, [fabricRef, objectCacheRef]);
    return (
        <>
            <DrawRectPicker onChange={setDrawRect} toolbarLocation={'eraser'} />

            {!drawRect.enable && <CircleCursor radius={width.width / 2} />}

            <LineWidthPicker onChange={setWidth} toolbarLocation={'eraser'} />
        </>
    );
};
