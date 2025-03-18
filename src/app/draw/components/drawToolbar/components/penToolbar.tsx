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

export const PenToolbar: React.FC = () => {
    const { fabricRef } = useContext(DrawContext);
    const [width, setWidth] = useState<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const [color, setColor] = useState<LineColorPickerValue>(defaultLineColorPickerValue);
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);

        return () => {
            canvas.freeDrawingBrush = undefined;
            canvas.isDrawingMode = false;
        };
    }, [fabricRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !canvas.freeDrawingBrush) {
            return;
        }

        canvas.freeDrawingBrush.color = color.color;
        canvas.freeDrawingBrush.width = width.width;
    }, [color, fabricRef, width]);

    return (
        <>
            <CircleCursor radius={width.width / 2} />

            <LineWidthPicker onChange={setWidth} toolbarLocation="pen" />

            <div className="draw-toolbar-splitter" />

            <LineColorPicker onChange={setColor} toolbarLocation="pen" />
        </>
    );
};
