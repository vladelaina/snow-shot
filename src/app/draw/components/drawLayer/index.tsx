'use client';

import { useCallback, useContext, useImperativeHandle, useRef } from 'react';
import React from 'react';
import {
    BaseLayerEventActionType,
    withBaseLayer,
    BaseLayerActionType,
    defaultBaseLayerActions,
    BaseLayerContext,
} from '../baseLayer';
import { zIndexs } from '@/utils/zIndex';
import * as PIXI from 'pixi.js';

export type DrawLayerActionType = BaseLayerActionType & {
    getBlurContainer: () => PIXI.Container | undefined;
    getDrawContainer: () => PIXI.Container | undefined;
};

export type DrawLayerProps = {
    actionRef: React.RefObject<DrawLayerActionType | undefined>;
};

const DrawLayerCore: React.FC<DrawLayerProps> = ({ actionRef }) => {
    const { addChildToTopContainer, createNewCanvasContainer, getCanvasApp } =
        useContext(BaseLayerContext);

    const imageTextureRef = useRef<PIXI.Texture | undefined>(undefined);
    const blurContainerRef = useRef<PIXI.Container | undefined>(undefined);
    const drawContainerRef = useRef<PIXI.Container | undefined>(undefined);
    /*
     * 初始化截图
     */
    const onCaptureReady = useCallback<BaseLayerEventActionType['onCaptureReady']>(
        async (texture: PIXI.Texture): Promise<void> => {
            // 底图作为单独的层级显示
            const imageSprite = new PIXI.Sprite(texture);
            addChildToTopContainer(imageSprite);

            // 模糊层和和绘制层独立处理
            imageTextureRef.current = texture;

            blurContainerRef.current = createNewCanvasContainer();
            drawContainerRef.current = createNewCanvasContainer();

            getCanvasApp()!.render();
        },
        [addChildToTopContainer, createNewCanvasContainer, getCanvasApp],
    );

    const onCaptureFinish = useCallback<
        BaseLayerEventActionType['onCaptureFinish']
    >(async () => {}, []);

    useImperativeHandle(
        actionRef,
        () => ({
            ...defaultBaseLayerActions,
            onCaptureReady,
            onCaptureFinish,
            getBlurContainer: () => blurContainerRef.current,
            getDrawContainer: () => drawContainerRef.current,
        }),
        [onCaptureFinish, onCaptureReady],
    );

    return <></>;
};

export default withBaseLayer(DrawLayerCore, zIndexs.Draw_DrawLayer);
