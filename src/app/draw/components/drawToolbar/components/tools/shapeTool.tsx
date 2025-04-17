import { FillShapePicker } from '../pickers/fillShapePicker';
import { LineColorPicker } from '../pickers/lineColorPicker';
import { LineWidthPicker } from '../pickers/lineWidthPicker';
import { useCallback, useContext, useRef } from 'react';
import { BaseToolEnablePublisher, withBaseTool } from './baseTool';
import { DrawContext, DrawState } from '@/app/draw/types';
import { CanvasDrawShapeType } from '@/core/canvas/canvasDrawShape';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import {
    defaultEnableRadiusValue,
    defaultLineColorPickerValue,
    LineColorPickerValue,
} from '../pickers/defaultValues';
import { defaultLineWidthPickerValue } from '../pickers/defaultValues';
import { defaultFillShapePickerValue } from '../pickers/defaultValues';
import { EnableRadiusPicker } from '../pickers/enableRadiusPicker';
import { CaptureUpdateAction } from '@mg-chao/excalidraw/index';

const ShapeTool: React.FC<{
    shapeType: CanvasDrawShapeType;
}> = ({ shapeType }) => {
    const { drawCacheLayerActionRef } = useContext(DrawContext);

    const borderWidthRef = useRef(defaultLineWidthPickerValue);
    const enableRadiusRef = useRef(defaultEnableRadiusValue);
    const borderColorRef = useRef(defaultLineColorPickerValue);
    const fillShapeRef = useRef(defaultFillShapePickerValue);

    const [getEnable] = useStateSubscriber(BaseToolEnablePublisher, undefined);
    const updateStyle = useCallback(() => {
        if (!getEnable()) {
            return;
        }

        drawCacheLayerActionRef.current?.updateScene({
            appState: {
                currentItemStrokeColor: borderColorRef.current.color,
                currentItemStrokeWidth: borderWidthRef.current.width,
                currentItemRoundness: enableRadiusRef.current.enable ? 'round' : 'sharp',
                currentItemBackgroundColor: fillShapeRef.current.fill
                    ? borderColorRef.current.color
                    : 'transparent',
            },
            captureUpdate: CaptureUpdateAction.NEVER,
        });
    }, [drawCacheLayerActionRef, getEnable]);

    const initDraw = useCallback(() => {
        drawCacheLayerActionRef.current?.setEnable(true);
        drawCacheLayerActionRef.current?.setActiveTool({
            type: 'rectangle',
            locked: true,
        });
        updateStyle();
    }, [drawCacheLayerActionRef, updateStyle]);

    const onEnableChange = useCallback(
        (enable: boolean) => {
            if (enable) {
                initDraw();
            }
        },
        [initDraw],
    );
    useStateSubscriber(BaseToolEnablePublisher, onEnableChange);

    const toolbarLocation = shapeType === CanvasDrawShapeType.Rect ? 'shape_rect' : 'shape_ellipse';

    return (
        <>
            <LineWidthPicker
                onChange={(width) => {
                    borderWidthRef.current = width;
                    updateStyle();
                }}
                toolbarLocation={toolbarLocation}
            />
            <div className="draw-toolbar-splitter" />
            <LineColorPicker
                onChange={(value: LineColorPickerValue) => {
                    borderColorRef.current = value;
                    updateStyle();
                }}
                toolbarLocation={toolbarLocation}
            />
            <div className="draw-toolbar-splitter" />
            {shapeType === CanvasDrawShapeType.Rect && (
                <EnableRadiusPicker
                    onChange={(enableRadius) => {
                        enableRadiusRef.current = enableRadius;
                        updateStyle();
                    }}
                    toolbarLocation={toolbarLocation}
                />
            )}
            <FillShapePicker
                onChange={(fillShape) => {
                    fillShapeRef.current = fillShape;
                    updateStyle();
                }}
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
