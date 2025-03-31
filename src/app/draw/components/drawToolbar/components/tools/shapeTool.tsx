import { defaultFillShapePickerValue, FillShapePicker } from '../pickers/fillShapePicker';
import {
    defaultLineColorPickerValue,
    LineColorPicker,
    LineColorPickerValue,
} from '../pickers/lineColorPicker';
import { defaultLineWidthPickerValue, LineWidthPicker } from '../pickers/lineWidthPicker';
import {
    defaultLockWidthHeightValue,
    LockWidthHeightPicker,
} from '../pickers/lockWidthHeightPicker';
import { defaultRadiusPickerValue, RadiusPicker } from '../pickers/radiusPicker';
import { useCallback, useContext, useRef } from 'react';
import { BaseToolEnablePublisher, withBaseTool } from './baseTool';
import { DrawContext, DrawState } from '@/app/draw/types';
import { MousePosition } from '@/utils/mousePosition';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { CanvasDrawShape, CanvasDrawShapeType } from '@/core/canvas/canvasDrawShape';
import { useHistory } from '../../../historyContext';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawingPublisher } from '../..';

const ShapeTool: React.FC<{
    shapeType: CanvasDrawShapeType;
}> = ({ shapeType }) => {
    const { history } = useHistory();

    const { drawLayerActionRef, imageBufferRef } = useContext(DrawContext);

    const borderWidthRef = useRef(defaultLineWidthPickerValue);
    const radiusRef = useRef(defaultRadiusPickerValue);
    const borderColorRef = useRef(defaultLineColorPickerValue);
    const lockWidthHeightRef = useRef(defaultLockWidthHeightValue);
    const fillShapeRef = useRef(defaultFillShapePickerValue);
    const [, setDrawing] = useStateSubscriber(DrawingPublisher, undefined);
    const [getEnable] = useStateSubscriber(BaseToolEnablePublisher, undefined);

    const canvasDrawShapeRef = useRef<CanvasDrawShape | undefined>(undefined);
    const lastMouseMoveRef = useRef<MousePosition | undefined>(undefined);

    const onMouseDown = useCallback(
        (mousePosition: MousePosition) => {
            if (!getEnable()) {
                return;
            }
            if (!canvasDrawShapeRef.current) {
                return;
            }

            canvasDrawShapeRef.current.setStyle(
                borderWidthRef.current.width,
                radiusRef.current.radius,
                borderColorRef.current.color,
                fillShapeRef.current.fill,
            );
            canvasDrawShapeRef.current.start(mousePosition);
        },
        [getEnable],
    );

    const onMouseMove = useCallback((mousePosition: MousePosition) => {
        if (!canvasDrawShapeRef.current) {
            return;
        }
        if (!canvasDrawShapeRef.current.drawing) {
            return;
        }
        lastMouseMoveRef.current = mousePosition;
        canvasDrawShapeRef.current.execute(mousePosition, lockWidthHeightRef.current.lock);
    }, []);
    const onMouseMoveRender = useCallbackRender(onMouseMove);
    const refreshMouseMove = useCallback(() => {
        if (!lastMouseMoveRef.current) {
            return;
        }
        onMouseMoveRender(lastMouseMoveRef.current);
    }, [onMouseMoveRender]);

    const onMouseUp = useCallback(() => {
        if (!canvasDrawShapeRef.current) {
            return;
        }
        if (!canvasDrawShapeRef.current.drawing) {
            return;
        }
        canvasDrawShapeRef.current.finish();
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

    const initCanvasDrawShape = useCallback(
        (enable: boolean) => {
            if (!enable) {
                return;
            }

            if (!drawLayerActionRef.current) {
                return;
            }

            canvasDrawShapeRef.current = new CanvasDrawShape(
                history,
                imageBufferRef.current?.monitorScaleFactor ?? 1,
                setDrawing,
                drawLayerActionRef.current,
                shapeType,
            );
        },
        [history, drawLayerActionRef, imageBufferRef, shapeType, setDrawing],
    );
    const onEnableChange = useCallback(
        (enable: boolean) => {
            initEvents(enable);
            initCanvasDrawShape(enable);
        },
        [initEvents, initCanvasDrawShape],
    );
    useStateSubscriber(BaseToolEnablePublisher, onEnableChange);

    const toolbarLocation = shapeType === CanvasDrawShapeType.Rect ? 'shape_rect' : 'shape_ellipse';

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
            {shapeType === CanvasDrawShapeType.Rect && (
                <RadiusPicker
                    onChange={(radius) => (radiusRef.current = radius)}
                    toolbarLocation={toolbarLocation}
                />
            )}
            <LockWidthHeightPicker
                onChange={(lockWidthHeight) => {
                    lockWidthHeightRef.current = lockWidthHeight;
                    refreshMouseMove();
                }}
                toolbarLocation={toolbarLocation}
            />
            <FillShapePicker
                onChange={(fillShape) => (fillShapeRef.current = fillShape)}
                toolbarLocation={toolbarLocation}
            />
        </>
    );
};

const EllipseToolCore: React.FC = () => {
    return <ShapeTool shapeType={CanvasDrawShapeType.Ellipse} />;
};

export const EllipseTool = withBaseTool(EllipseToolCore, DrawState.Ellipse);

const RectToolCore: React.FC = () => {
    return <ShapeTool shapeType={CanvasDrawShapeType.Rect} />;
};

export const RectTool = withBaseTool(RectToolCore, DrawState.Rect);
