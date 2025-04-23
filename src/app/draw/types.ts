import React from 'react';
import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { ImageBuffer } from '@/commands';
import { DrawToolbarActionType } from './components/drawToolbar';
import { MousePosition } from '@/utils/mousePosition';
import { DrawCacheLayerActionType } from './components/drawCacheLayer/extra';

export enum CaptureStep {
    // 选择阶段
    Pending = 0,
    // 选择阶段
    Select = 1,
    // 绘制阶段
    Draw = 2,
    // 置顶阶段
    TopUp = 3,
}

export enum DrawState {
    Idle = 0,
    // 选择元素
    Select = 1,
    // 矩形
    Rect = 2,
    // 菱形
    Diamond = 3,
    // 椭圆
    Ellipse = 4,
    // 箭头
    Arrow = 5,
    // 线条
    Line = 6,
    // 画笔
    Pen = 7,
    // 文本
    Text = 8,
    // 模糊
    Blur = 9,
    // 橡皮擦
    Eraser = 10,
    // 撤销
    Undo = 101,
    // 重做
    Redo = 102,
    // 取消
    Cancel = 103,
}

export enum CanvasLayer {
    CaptureImage = 0,
    BlurImage = 1,
    Draw = 2,
    Select = 3,
}

export type DrawContextType = {
    finishCapture: () => void;
    drawLayerActionRef: React.RefObject<DrawLayerActionType | undefined>;
    selectLayerActionRef: React.RefObject<SelectLayerActionType | undefined>;
    imageBufferRef: React.RefObject<ImageBuffer | undefined>;
    mousePositionRef: React.RefObject<MousePosition>;
    drawToolbarActionRef: React.RefObject<DrawToolbarActionType | undefined>;
    circleCursorRef: React.RefObject<HTMLDivElement | null>;
    drawCacheLayerActionRef: React.RefObject<DrawCacheLayerActionType | undefined>;
};

export const DrawContext = React.createContext<DrawContextType>({
    mousePositionRef: { current: new MousePosition(0, 0) },
    imageBufferRef: { current: undefined },
    finishCapture: () => {},
    drawLayerActionRef: { current: undefined },
    selectLayerActionRef: { current: undefined },
    drawToolbarActionRef: { current: undefined },
    circleCursorRef: { current: null },
    drawCacheLayerActionRef: { current: undefined },
});
