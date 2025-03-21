import {
    defaultLineWidthPickerValue,
    LineWidthPicker,
    LineWidthPickerValue,
} from './pickers/lineWidthPicker';
import { useContext, useEffect, useState } from 'react';
import {
    defaultLineColorPickerValue,
    LineColorPicker,
    LineColorPickerValue,
} from './pickers/lineColorPicker';
import * as fabric from 'fabric';
import { DrawContext } from '@/app/draw/context';
import { CircleCursor } from './pickers/components/circleCursor';
import { useStateRef } from '@/hooks/useStateRef';
import { defaultDrawRectValue, DrawRectPicker, DrawRectValue } from './pickers/drawRectPicker';
import Color from 'color';
export class HighlightBrush extends fabric.PencilBrush {
    constructor(canvas: fabric.Canvas) {
        super(canvas);
    }

    needsFullRender() {
        return true;
    }

    _setBrushStyles(ctx: CanvasRenderingContext2D) {
        // 受限于画笔的实现方式，无法在绘制时加上混合模式，暂时用透明替代
        ctx.strokeStyle = Color(this.color).alpha(0.5).hexa();
        ctx.lineWidth = this.width;
        ctx.lineCap = this.strokeLineCap;
        ctx.miterLimit = this.strokeMiterLimit;
        ctx.lineJoin = this.strokeLineJoin;
        ctx.setLineDash(this.strokeDashArray || []);
    }

    onMouseMove(pointer: fabric.Point, event: fabric.TEvent): void {
        super.onMouseMove(pointer, event);
    }

    /**
     * Creates a Path object to add on canvas
     * @param {TSimplePathData} pathData Path data
     * @return {Path} Path to add on canvas
     */
    createPath(pathData: fabric.TSimplePathData): fabric.Path {
        const path = new fabric.Path(pathData, {
            fill: null,
            stroke: this.color,
            strokeWidth: this.width,
            strokeLineCap: this.strokeLineCap,
            strokeMiterLimit: this.strokeMiterLimit,
            strokeLineJoin: this.strokeLineJoin,
            strokeDashArray: this.strokeDashArray,
            globalCompositeOperation: 'multiply',
        });
        if (this.shadow) {
            this.shadow.affectStroke = true;
            path.shadow = new fabric.Shadow(this.shadow);
        }

        return path;
    }
}

export const HighlightTool: React.FC = () => {
    const { fabricRef, canvasCursorRef } = useContext(DrawContext);
    const [width, setWidth] = useState<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const [color, setColor, colorRef] = useStateRef<LineColorPickerValue>(
        defaultLineColorPickerValue,
    );
    const [drawRect, setDrawRect, drawRectRef] = useStateRef<DrawRectValue>(defaultDrawRectValue);
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        if (drawRect.enable) {
            canvas.isDrawingMode = false;
            canvasCursorRef.current = 'crosshair';
        } else {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new HighlightBrush(canvas);
            canvasCursorRef.current = 'auto';
        }

        return () => {
            canvas.isDrawingMode = false;
            canvas.freeDrawingBrush = undefined;
            canvasCursorRef.current = 'auto';
        };
    }, [canvasCursorRef, colorRef, drawRect.enable, fabricRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !canvas.freeDrawingBrush) {
            return;
        }

        canvas.freeDrawingBrush.color = color.color;
        canvas.freeDrawingBrush.width = width.width;
    }, [color, fabricRef, width, drawRect.enable]);

    useEffect(() => {
        let isDrawing = false;
        let shape: fabric.Rect | fabric.Ellipse | undefined = undefined;
        let startX = 0;
        let startY = 0;

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
            shape = new fabric.Rect({
                left: startX,
                top: startY,
                width: 0,
                height: 0,
                fill: colorRef.current.color,
                stroke: colorRef.current.color,
                strokeWidth: 0,
                selectable: true,
                hasControls: true,
                absolutePositioned: true,
                globalCompositeOperation: 'multiply',
            });

            canvas.add(shape);
        };

        // 监听鼠标移动事件，动态调整矩形大小
        const onMouseMoveCore = (point: fabric.Point) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            if (!isDrawing || !shape) return;

            const left = Math.min(startX, point.x);
            const top = Math.min(startY, point.y);
            const width = Math.abs(point.x - startX);
            const height = Math.abs(point.y - startY);

            shape.set({ left, top, width, height });
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

            if (shape) {
                canvas.setActiveObject(shape);
            }
            isDrawing = false;
            shape = undefined;
        };

        const canvas = fabricRef.current;
        if (!canvas) return;

        const downListener = canvas.on('mouse:down', onMouseDown);
        const moveListener = canvas.on('mouse:move', onMouseMove);
        const upListener = canvas.on('mouse:up', onMouseUp);

        return () => {
            downListener();
            moveListener();
            upListener();
        };
    }, [colorRef, drawRectRef, fabricRef]);

    return (
        <>
            {!drawRect.enable && <CircleCursor radius={width.width / 2} />}

            <DrawRectPicker onChange={setDrawRect} toolbarLocation="mosaic" />

            {<LineWidthPicker onChange={setWidth} toolbarLocation="highlight" />}

            <div className="draw-toolbar-splitter" />

            <LineColorPicker onChange={setColor} toolbarLocation="highlight" />
        </>
    );
};
