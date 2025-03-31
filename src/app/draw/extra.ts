import { CanvasLayer } from './types';
import { CaptureImageLayerActionType } from './components/captureImageLayer';
import { BlurImageLayerActionType } from './components/blurImageLayer';
import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { ImageBuffer } from '@/commands';

export const switchLayer = (
    layer: CanvasLayer,
    captureImageLayerAction: CaptureImageLayerActionType | undefined,
    blurImageLayerAction: BlurImageLayerActionType | undefined,
    drawLayerAction: DrawLayerActionType | undefined,
    selectLayerAction: SelectLayerActionType | undefined,
) => {
    let switchCaptureImage = false;
    let switchBlurImage = false;
    let switchDraw = false;
    let switchSelect = false;

    switch (layer) {
        case CanvasLayer.CaptureImage:
            switchCaptureImage = true;
            break;
        case CanvasLayer.BlurImage:
            switchBlurImage = true;
            break;
        case CanvasLayer.Draw:
            switchDraw = true;
            break;
        case CanvasLayer.Select:
            switchSelect = true;
            break;
    }

    captureImageLayerAction?.setEnable(switchCaptureImage);
    blurImageLayerAction?.setEnable(switchBlurImage);
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
