'use client';

import { useCallback, useImperativeHandle } from 'react';
import React from 'react';
import {
    BaseLayerEventActionType,
    withBaseLayer,
    BaseLayerActionType,
    defaultBaseLayerActions,
} from '../baseLayer';
import { zIndexs } from '@/utils/zIndex';

export type DrawLayerActionType = BaseLayerActionType & {};

export type DrawLayerProps = {
    actionRef: React.RefObject<DrawLayerActionType | undefined>;
};

const DrawLayerCore: React.FC<DrawLayerProps> = ({ actionRef }) => {
    const onCaptureReady = useCallback<
        BaseLayerEventActionType['onCaptureReady']
    >(async (): Promise<void> => {}, []);

    const onCaptureFinish = useCallback<BaseLayerEventActionType['onCaptureFinish']>(() => {}, []);

    useImperativeHandle(
        actionRef,
        () => ({
            ...defaultBaseLayerActions,
            onCaptureReady,
            onCaptureFinish,
        }),
        [onCaptureFinish, onCaptureReady],
    );

    return <></>;
};

export default withBaseLayer(DrawLayerCore, zIndexs.Draw_DrawLayer);
