'use client';

import { useCallback, useContext, useRef } from 'react';
import {
    defaultLineColorPickerValue,
    defaultLineWidthPickerValue,
    LineColorPickerValue,
} from '../pickers/defaultValues';
import { LineWidthPickerValue } from '../pickers/defaultValues';
import { LineWidthPicker } from '../pickers/lineWidthPicker';
import { LineColorPicker } from '../pickers/lineColorPicker';
import { CircleCursor, CircleCursorActionType } from '../pickers/components/circleCursor';
import { useHistory } from '../../../historyContext';
import { DrawContext, DrawState } from '@/app/draw/types';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawingPublisher } from '../..';
import { BaseToolEnablePublisher, withBaseTool } from './baseTool';
import { MousePosition } from '@/utils/mousePosition';
import { CanvasDrawPen } from '@/core/canvas/canvasDrawPen';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { AppSettingsGroup, AppSettingsPublisher } from '@/app/contextWrap';

const PenToolCore: React.FC = () => {
    const { history } = useHistory();

    const { drawLayerActionRef, imageBufferRef } = useContext(DrawContext);

    const [getAppSettings] = useStateSubscriber(AppSettingsPublisher, undefined);
    const widthRef = useRef<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const colorRef = useRef<LineColorPickerValue>(defaultLineColorPickerValue);
    const circleCursorActionRef = useRef<CircleCursorActionType | undefined>(undefined);

    const [, setDrawing] = useStateSubscriber(DrawingPublisher, undefined);
    const [getEnable] = useStateSubscriber(BaseToolEnablePublisher, undefined);

    const canvasDrawRef = useRef<CanvasDrawPen | undefined>(undefined);

    const onMouseDown = useCallback(
        (mousePosition: MousePosition) => {
            if (!getEnable()) {
                return;
            }
            if (!canvasDrawRef.current) {
                return;
            }

            canvasDrawRef.current.setStyle(widthRef.current.width, colorRef.current.color);
            canvasDrawRef.current.start(mousePosition);
        },
        [colorRef, getEnable, widthRef],
    );

    const onMouseMove = useCallback((mousePosition: MousePosition) => {
        if (!canvasDrawRef.current) {
            return;
        }
        if (!canvasDrawRef.current.drawing) {
            return;
        }

        canvasDrawRef.current.execute(mousePosition);
    }, []);
    const onMouseMoveRender = useCallbackRender(onMouseMove);

    const onMouseUp = useCallback(() => {
        if (!canvasDrawRef.current) {
            return;
        }
        if (!canvasDrawRef.current.drawing) {
            return;
        }
        canvasDrawRef.current.finish();
    }, []);

    const initEvents = useCallback(
        (enable: boolean) => {
            if (!enable) {
                return;
            }

            const layerContainerElement = drawLayerActionRef.current?.getLayerContainerElement();
            if (!layerContainerElement) {
                return;
            }

            const handleMouseDown = (e: MouseEvent) => {
                const mousePosition = new MousePosition(e.clientX, e.clientY);
                onMouseDown(mousePosition);
            };

            const handleMouseMove = (e: MouseEvent) => {
                const mousePosition = new MousePosition(e.clientX, e.clientY);
                onMouseMoveRender(mousePosition);
            };

            const handleMouseUp = () => {
                onMouseUp();
            };

            layerContainerElement.addEventListener('mousemove', handleMouseMove);
            layerContainerElement.addEventListener('mouseup', handleMouseUp);
            layerContainerElement.addEventListener('mousedown', handleMouseDown);

            return () => {
                layerContainerElement.removeEventListener('mousemove', handleMouseMove);
                layerContainerElement.removeEventListener('mouseup', handleMouseUp);
                layerContainerElement.removeEventListener('mousedown', handleMouseDown);
            };
        },
        [drawLayerActionRef, onMouseUp, onMouseDown, onMouseMoveRender],
    );

    const initDraw = useCallback(
        (enable: boolean) => {
            if (!enable) {
                return;
            }

            if (!drawLayerActionRef.current) {
                return;
            }

            canvasDrawRef.current = new CanvasDrawPen(
                history,
                imageBufferRef.current?.monitorScaleFactor ?? 1,
                setDrawing,
                drawLayerActionRef.current,
                getAppSettings()[AppSettingsGroup.Render],
            );
        },
        [drawLayerActionRef, history, imageBufferRef, setDrawing, getAppSettings],
    );
    const onEnableChange = useCallback(
        (enable: boolean) => {
            initEvents(enable);
            initDraw(enable);
        },
        [initEvents, initDraw],
    );
    useStateSubscriber(BaseToolEnablePublisher, onEnableChange);

    return (
        <>
            <CircleCursor actionRef={circleCursorActionRef} />

            <LineWidthPicker
                onChange={(value) => {
                    widthRef.current = value;
                    circleCursorActionRef.current?.setRadius(value.width / 2);
                }}
                toolbarLocation="pen"
            />

            <div className="draw-toolbar-splitter" />

            <LineColorPicker
                onChange={(value) => {
                    colorRef.current = value;
                }}
                toolbarLocation="pen"
            />
        </>
    );
};

export const PenTool = withBaseTool(PenToolCore, DrawState.Pen);
