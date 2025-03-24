'use client';

import { useCallback, useContext, useImperativeHandle } from 'react';
import * as PIXI from 'pixi.js';
import React from 'react';
import {
    BaseLayerEventActionType,
    BaseLayerContext,
    withBaseLayer,
    BaseLayerActionType,
} from '../baseLayer';
import { zIndexs } from '@/utils/zIndex';

export type CaptureImageLayerActionType = BaseLayerActionType & {};

export type CaptureImageLayerProps = {
    actionRef: React.RefObject<CaptureImageLayerActionType | undefined>;
};

const CaptureImageLayerCore: React.FC<CaptureImageLayerProps> = ({ actionRef }) => {
    const { addChildToTopContainer } = useContext(BaseLayerContext);

    /*
     * 初始化截图
     */
    const onCaptureReady = useCallback<BaseLayerEventActionType['onCaptureReady']>(
        async (texture: PIXI.Texture): Promise<void> => {
            const imageSprite = new PIXI.Sprite(texture);
            addChildToTopContainer(imageSprite);
        },
        [addChildToTopContainer],
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

export default withBaseLayer(CaptureImageLayerCore, zIndexs.Draw_CaptureImageLayer);
