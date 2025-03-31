import React from 'react';
import { CaptureImageLayerActionType } from './components/captureImageLayer';
import { BlurImageLayerActionType } from './components/blurImageLayer';
import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { ImageBuffer } from '@/commands';
import { DrawToolbarActionType } from './components/drawToolbar';
export enum CaptureStep {
    // 选择阶段
    Select = 0,
    // 绘制阶段
    Draw = 1,
    // 置顶阶段
    TopUp = 2,
}

export enum DrawState {
    Idle = 0,
    // 选择元素
    Select = 1,
    // 矩形
    Rect = 2,
    // 椭圆
    Ellipse = 3,
}

export enum CanvasLayer {
    CaptureImage = 0,
    BlurImage = 1,
    Draw = 2,
    Select = 3,
}

export type DrawContextType = {
    finishCapture: () => void;
    captureImageLayerActionRef: React.RefObject<CaptureImageLayerActionType | undefined>;
    blurImageLayerActionRef: React.RefObject<BlurImageLayerActionType | undefined>;
    drawLayerActionRef: React.RefObject<DrawLayerActionType | undefined>;
    selectLayerActionRef: React.RefObject<SelectLayerActionType | undefined>;
    imageBufferRef: React.RefObject<ImageBuffer | undefined>;
    drawToolbarActionRef: React.RefObject<DrawToolbarActionType | undefined>;
};

export const DrawContext = React.createContext<DrawContextType>({
    imageBufferRef: { current: undefined },
    finishCapture: () => {},
    captureImageLayerActionRef: { current: undefined },
    blurImageLayerActionRef: { current: undefined },
    drawLayerActionRef: { current: undefined },
    selectLayerActionRef: { current: undefined },
    drawToolbarActionRef: { current: undefined },
});
