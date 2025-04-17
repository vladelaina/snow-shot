import { ExcalidrawActionType } from '@mg-chao/excalidraw/types';
import { ExcalidrawImperativeAPI } from '@mg-chao/excalidraw/types';
import { createPublisher } from '@/hooks/useStatePublisher';

export type DrawCacheLayerActionType = {
    setActiveTool: ExcalidrawImperativeAPI['setActiveTool'];
    syncActionResult: ExcalidrawActionType['syncActionResult'];
    updateScene: ExcalidrawImperativeAPI['updateScene'];
    setEnable: (enable: boolean) => void;
    onCaptureReady: () => Promise<void>;
    onCaptureFinish: () => Promise<void>;
};

export type ExcalidrawKeyEvent = {
    resizeFromCenter: boolean;
    maintainAspectRatio: boolean;
    rotateWithDiscreteAngle: boolean;
    autoAlign: boolean;
};

export const ExcalidrawKeyEventPublisher = createPublisher<ExcalidrawKeyEvent>({
    resizeFromCenter: false,
    maintainAspectRatio: false,
    rotateWithDiscreteAngle: false,
    autoAlign: false,
});

export const convertLocalToLocalCode = (local: string) => {
    switch (local) {
        case 'zh-Hans':
            return 'zh-CN';
        case 'zh-Hant':
            return 'zh-TW';
        case 'en':
            return 'en-US';
        default:
            return local;
    }
};
