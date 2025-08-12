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
import { CaptureHistoryItem } from '@/utils/appStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCaptureHistoryImageAbsPath } from '@/utils/captureHistory';

export type DrawLayerActionType = BaseLayerActionType & {
    getBlurContainer: () => PIXI.Container | undefined;
    getDrawContainer: () => PIXI.Container | undefined;
    switchCaptureHistory: (item: CaptureHistoryItem | undefined) => Promise<void>;
};

export type DrawLayerProps = {
    actionRef: React.RefObject<DrawLayerActionType | undefined>;
};

const DrawLayerCore: React.FC<DrawLayerProps> = ({ actionRef }) => {
    const { addChildToTopContainer, createNewCanvasContainer, getCanvasApp, getTopContainer } =
        useContext(BaseLayerContext);

    const imageContainerRef = useRef<PIXI.Container | undefined>(undefined);
    const imageTextureRef = useRef<PIXI.Texture | undefined>(undefined);
    const imageSpriteRef = useRef<PIXI.Sprite | undefined>(undefined);
    const captureHistoryImageSpriteRef = useRef<PIXI.Sprite | undefined>(undefined);
    const blurContainerRef = useRef<PIXI.Container | undefined>(undefined);
    const drawContainerRef = useRef<PIXI.Container | undefined>(undefined);
    /*
     * 初始化截图
     */
    const onCaptureReady = useCallback<BaseLayerEventActionType['onCaptureReady']>(
        async (texture: PIXI.Texture): Promise<void> => {
            // 底图作为单独的层级显示
            imageContainerRef.current = getTopContainer();
            const imageSprite = new PIXI.Sprite(texture);
            addChildToTopContainer(imageSprite);
            imageSpriteRef.current = imageSprite;

            imageTextureRef.current = texture;

            // 模糊层和和绘制层独立处理
            blurContainerRef.current = createNewCanvasContainer();
            drawContainerRef.current = createNewCanvasContainer();

            getCanvasApp()!.render();
        },
        [addChildToTopContainer, createNewCanvasContainer, getCanvasApp, getTopContainer],
    );

    const onCaptureFinish = useCallback<
        BaseLayerEventActionType['onCaptureFinish']
    >(async () => {}, []);

    const switchCaptureHistory = useCallback(
        async (item: CaptureHistoryItem | undefined) => {
            // 移除当前显示的已有内容
            captureHistoryImageSpriteRef.current?.destroy(); // 移除历史截图
            imageSpriteRef.current?.removeFromParent(); // 移除当前截图

            if (!item) {
                if (imageContainerRef.current && imageSpriteRef.current) {
                    imageContainerRef.current.addChild(imageSpriteRef.current);
                }
            } else {
                let imageTexture: PIXI.Texture | undefined = undefined;
                try {
                    const fileUri = convertFileSrc(
                        await getCaptureHistoryImageAbsPath(item.file_name),
                    );

                    imageTexture = await PIXI.Assets.load<PIXI.Texture>({
                        src: fileUri,
                        parser: 'texture',
                    });
                } catch (error) {
                    // 如果读取失败，则使用当前截图
                    imageTexture = imageTextureRef.current;

                    console.warn('[switchCaptureHistory] failed read image file', error);
                }

                if (imageTexture) {
                    const imageSprite = new PIXI.Sprite(imageTexture);
                    captureHistoryImageSpriteRef.current = imageSprite;

                    imageContainerRef.current?.addChild(imageSprite);
                }
            }

            getCanvasApp()!.render();
        },
        [getCanvasApp],
    );

    useImperativeHandle(
        actionRef,
        () => ({
            ...defaultBaseLayerActions,
            onCaptureReady,
            onCaptureFinish,
            getBlurContainer: () => blurContainerRef.current,
            getDrawContainer: () => drawContainerRef.current,
            switchCaptureHistory,
        }),
        [onCaptureFinish, onCaptureReady, switchCaptureHistory],
    );

    return <></>;
};

export default withBaseLayer(DrawLayerCore, zIndexs.Draw_DrawLayer);
