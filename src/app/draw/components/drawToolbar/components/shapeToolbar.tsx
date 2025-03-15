import { defaultLineWidthPickerValue, LineWidthPicker } from './pickers/lineWidthPicker';
import { useContext, useEffect, useRef } from 'react';
import {
    defaultLineColorPickerValue,
    LineColorPicker,
    LineColorPickerValue,
} from './pickers/lineColorPicker';
import * as fabric from 'fabric';
import { defaultLockWidthHeightValue, LockWidthHeightPicker } from './pickers/lockWidthHeightPicker';
import { defaultFillShapePickerValue, FillShapePicker } from './pickers/fillShapePicker';
import { defaultRadiusPickerValue, RadiusPicker } from './pickers/radiusPicker';
import React from 'react';
import { DrawContext } from '@/app/draw/page';

enum ShapeType {
    Rect,
    Ellipse,
}

const ShapeToolbar: React.FC<{
    shapeType: ShapeType;
}> = ({ shapeType }) => {
    const { fabricRef } = useContext(DrawContext);
    const borderWidthRef = useRef(defaultLineWidthPickerValue);
    const radiusRef = useRef(defaultRadiusPickerValue);
    const borderColorRef = useRef(defaultLineColorPickerValue);
    const lockWidthHeightRef = useRef(defaultLockWidthHeightValue);
    const fillShapeRef = useRef(defaultFillShapePickerValue);

    useEffect(() => {
        let isDrawing = false;
        let shape: fabric.Rect | fabric.Ellipse | undefined = undefined;
        let startX = 0;
        let startY = 0;

        // 监听鼠标按下事件，开始绘制
        const onMouseDown = (event: fabric.TEvent<fabric.TPointerEvent>) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            canvas.discardActiveObject();

            const pointer = canvas.getScenePoint(event.e);
            startX = pointer.x;
            startY = pointer.y;
            isDrawing = true;
            if (shapeType === ShapeType.Rect) {
                shape = new fabric.Rect({
                    left: startX,
                    top: startY,
                    width: 0,
                    height: 0,
                    fill: fillShapeRef.current.fill ? borderColorRef.current.color : 'transparent',
                    stroke: fillShapeRef.current.fill
                        ? 'transparent'
                        : borderColorRef.current.color,
                    strokeWidth: borderWidthRef.current.width,
                    selectable: true,
                    hasControls: true,
                    absolutePositioned: true,
                    rx: radiusRef.current.radius,
                    ry: radiusRef.current.radius,
                });
            } else {
                shape = new fabric.Ellipse({
                    left: startX,
                    top: startY,
                    rx: 0,
                    ry: 0,
                    fill: fillShapeRef.current.fill ? borderColorRef.current.color : 'transparent',
                    stroke: fillShapeRef.current.fill
                        ? 'transparent'
                        : borderColorRef.current.color,
                    strokeWidth: borderWidthRef.current.width,
                    selectable: true,
                    hasControls: true,
                    absolutePositioned: true,
                });
            }

            canvas.add(shape);
        };

        // 监听鼠标移动事件，动态调整矩形大小
        const onMouseMoveCore = (point: fabric.Point) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            if (!isDrawing || !shape) return;

            let left = Math.min(startX, point.x);
            let top = Math.min(startY, point.y);
            let width = Math.abs(point.x - startX);
            let height = Math.abs(point.y - startY);

            if (lockWidthHeightRef.current.lock) {
                const maxSize = Math.max(width, height);
                width = maxSize;
                height = maxSize;

                if (point.x < startX) {
                    left = startX - maxSize;
                }
                if (point.y < startY) {
                    top = startY - maxSize;
                }
            }

            if (shapeType === ShapeType.Rect) {
                shape.set({ left, top, width, height });
            } else {
                const rx = width / 2;
                const ry = height / 2;

                shape.set({
                    left,
                    top,
                    rx,
                    ry,
                });
            }
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

        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);

        return () => {
            canvas.off('mouse:down', onMouseDown);
            canvas.off('mouse:move', onMouseMove);
            canvas.off('mouse:up', onMouseUp);
        };
    }, [fabricRef, shapeType]);

    const toolbarLocation = shapeType === ShapeType.Rect ? 'shape_rect' : 'shape_ellipse';

    return (
        <>
            <LineWidthPicker
                onChange={(width) => (borderWidthRef.current = width)}
                toolbarLocation={toolbarLocation}
            />
            <div className="draw-toolbar-splitter" />
            <LineColorPicker
                onChange={(value: LineColorPickerValue) => {
                    borderColorRef.current = value;
                }}
                toolbarLocation={toolbarLocation}
            />
            <div className="draw-toolbar-splitter" />
            {shapeType === ShapeType.Rect && (
                <RadiusPicker
                    onChange={(radius) => (radiusRef.current = radius)}
                    toolbarLocation={toolbarLocation}
                />
            )}
            <LockWidthHeightPicker
                onChange={(lockWidthHeight) => (lockWidthHeightRef.current = lockWidthHeight)}
                toolbarLocation={toolbarLocation}
            />
            <FillShapePicker
                onChange={(fillShape) => (fillShapeRef.current = fillShape)}
                toolbarLocation={toolbarLocation}
            />
        </>
    );
};

export const EllipseToolbar: React.FC = () => {
    return <ShapeToolbar shapeType={ShapeType.Ellipse} />;
};

export const RectToolbar: React.FC = () => {
    return <ShapeToolbar shapeType={ShapeType.Rect} />;
};
