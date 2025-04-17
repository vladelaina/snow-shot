import { CanvasLayer, CaptureStep, DrawState } from './types';
import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { ImageBuffer } from '@/commands';
import { createPublisher } from '@/hooks/useStatePublisher';

export const switchLayer = (
    layer: CanvasLayer,
    drawLayerAction: DrawLayerActionType | undefined,
    selectLayerAction: SelectLayerActionType | undefined,
) => {
    let switchDraw = false;
    let switchSelect = false;

    switch (layer) {
        case CanvasLayer.Draw:
            switchDraw = true;
            break;
        case CanvasLayer.Select:
            switchSelect = true;
            break;
    }

    drawLayerAction?.setEnable(switchDraw);
    selectLayerAction?.setEnable(switchSelect);
};

export const getMonitorRect = (imageBuffer: ImageBuffer | undefined) => {
    return {
        min_x: 0,
        min_y: 0,
        max_x: imageBuffer?.monitorWidth ?? 0,
        max_y: imageBuffer?.monitorHeight ?? 0,
    };
};

export const CaptureStepPublisher = createPublisher<CaptureStep>(CaptureStep.Select);
export const DrawStatePublisher = createPublisher<DrawState>(DrawState.Idle);
export const CaptureLoadingPublisher = createPublisher<boolean>(true);
