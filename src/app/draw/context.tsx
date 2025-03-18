import { ImageBuffer } from '@/commands';
import { FabricHistory } from '@/utils/fabricjsHistory';
import * as fabric from 'fabric';
import { createContext, RefObject } from 'react';

export const DrawContext = createContext<{
    fabricRef: RefObject<fabric.Canvas | undefined>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    maskRectObjectListRef: RefObject<fabric.Object[]>;
    maskRectRef: RefObject<fabric.Rect | undefined>;
    maskRectClipPathRef: RefObject<fabric.Rect | undefined>;
    circleCursorRef: RefObject<HTMLDivElement | null>;
    imageBufferRef: RefObject<ImageBuffer | undefined>;
    canvasCursorRef: RefObject<string>;
    canvasUnlistenListRef: RefObject<VoidFunction[]>;
    imageLayerRef: RefObject<fabric.Image | undefined>;
    canvasHistoryRef: RefObject<FabricHistory | undefined>;
}>({
    fabricRef: { current: undefined },
    canvasRef: { current: null },
    maskRectObjectListRef: { current: [] },
    maskRectRef: { current: undefined },
    maskRectClipPathRef: { current: undefined },
    circleCursorRef: { current: null },
    imageBufferRef: { current: undefined },
    canvasCursorRef: { current: 'auto' },
    canvasUnlistenListRef: { current: [] },
    imageLayerRef: { current: undefined },
    canvasHistoryRef: { current: undefined },
});
