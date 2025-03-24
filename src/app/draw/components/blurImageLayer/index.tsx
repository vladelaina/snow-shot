'use client';

import { useCallback, useImperativeHandle, useRef } from 'react';
import * as PIXI from 'pixi.js';
import React from 'react';
import { BaseLayerEventActionType, withBaseLayer, BaseLayerActionType } from '../baseLayer';
import { zIndexs } from '@/utils/zIndex';

export type BlurImageLayerActionType = BaseLayerActionType & {};

export type BlurImageLayerProps = {
    actionRef: React.RefObject<BlurImageLayerActionType | undefined>;
};

const BlurImageLayerCore: React.FC<BlurImageLayerProps> = ({ actionRef }) => {
    const imageTextureRef = useRef<PIXI.Texture | null>(null);

    /*
     * 模糊图层不覆盖其他元素，在 imageLayer 层上绘制
     */
    const onCaptureReady = useCallback<BaseLayerEventActionType['onCaptureReady']>(
        async (texture: PIXI.Texture): Promise<void> => {
            imageTextureRef.current = texture;
        },
        [],
    );

    const onCaptureFinish = useCallback<BaseLayerEventActionType['onCaptureFinish']>(() => {}, []);

    useImperativeHandle(
        actionRef,
        () => ({
            onCaptureReady,
            onCaptureFinish,
            disable: () => {},
            enable: () => {},
            onCanvasReady: () => {},
        }),
        [onCaptureFinish, onCaptureReady],
    );

    return <></>;
};

export default withBaseLayer(BlurImageLayerCore, zIndexs.Draw_BlurImageLayer);
