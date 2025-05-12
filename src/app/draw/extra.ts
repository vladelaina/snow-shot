import { CanvasLayer, CaptureStep, DrawState } from './types';
import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { ImageBuffer } from '@/commands';
import { createPublisher } from '@/hooks/useStatePublisher';
import { BaseLayerEventActionType } from './components/baseLayer';
import { ScreenshotType } from '@/functions/screenshot';

export const switchLayer = (
    layer: CanvasLayer | undefined,
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
        default:
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

export enum CaptureEvent {
    onExecuteScreenshot = 'onExecuteScreenshot',
    onCaptureReady = 'onCaptureReady',
    onCaptureLoad = 'onCaptureLoad',
    onCaptureFinish = 'onCaptureFinish',
}

export type CaptureEventParams =
    | {
          event: CaptureEvent.onExecuteScreenshot;
      }
    | {
          event: CaptureEvent.onCaptureLoad;
          params: Parameters<BaseLayerEventActionType['onCaptureLoad']>;
      }
    | {
          event: CaptureEvent.onCaptureFinish;
      }
    | {
          event: CaptureEvent.onCaptureReady;
          params: Parameters<BaseLayerEventActionType['onCaptureReady']>;
      };

export const CaptureStepPublisher = createPublisher<CaptureStep>(CaptureStep.Select);
export const DrawStatePublisher = createPublisher<DrawState>(DrawState.Idle);
export const CaptureLoadingPublisher = createPublisher<boolean>(true);
export const CaptureEventPublisher = createPublisher<CaptureEventParams | undefined>(undefined);
export const ScreenshotTypePublisher = createPublisher<ScreenshotType>(ScreenshotType.Default);
