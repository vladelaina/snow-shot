import { DOMAdapter, Application, WebWorkerAdapter, Container, Texture } from 'pixi.js';

DOMAdapter.set(WebWorkerAdapter);

import {
    renderClearCanvasAction,
    renderCreateNewCanvasContainerAction,
    renderDisposeCanvasAction,
    renderInitCanvasAction,
    renderGetImageDataAction,
    renderResizeCanvasAction,
    renderCanvasRenderAction,
    renderAddImageToContainerAction,
    renderClearContainerAction,
    renderCreateBlurSpriteAction,
    renderUpdateBlurSpriteAction,
    renderDeleteBlurSpriteAction,
    BlurSprite,
} from '../baseLayerRenderActions';
import {
    BaseLayerRenderAddImageToContainerData,
    BaseLayerRenderClearContainerData,
    BaseLayerRenderCreateNewCanvasContainerData,
    BaseLayerRenderData,
    BaseLayerRenderGetImageDataData,
    BaseLayerRenderInitData,
    BaseLayerRenderMessageType,
    BaseLayerRenderResizeCanvasData,
    RefWrap,
    RenderResult,
    BaseLayerRenderCreateBlurSpriteData,
    BaseLayerRenderUpdateBlurSpriteData,
    BaseLayerRenderDeleteBlurSpriteData,
} from './renderWorkerTypes';

const canvasAppRef: RefWrap<Application | undefined> = { current: undefined };
const canvasContainerMapRef: RefWrap<Map<string, Container>> = { current: new Map() };
const canvasContainerChildCountRef: RefWrap<number> = { current: 0 };
const currentImageTextureRef: RefWrap<Texture | undefined> = { current: undefined };
const blurSpriteMapRef: RefWrap<Map<string, BlurSprite>> = { current: new Map() };

const handleInit = async (data: BaseLayerRenderInitData) => {
    await renderInitCanvasAction(canvasAppRef, data.payload.appOptions);
};

const handleDispose = async () => {
    renderDisposeCanvasAction(canvasAppRef);
};

const handleCreateNewCanvasContainer = (
    data: BaseLayerRenderCreateNewCanvasContainerData,
): string | undefined => {
    return renderCreateNewCanvasContainerAction(
        canvasAppRef,
        canvasContainerMapRef,
        data.payload.containerKey,
    );
};

const handleResizeCanvas = (data: BaseLayerRenderResizeCanvasData) => {
    renderResizeCanvasAction(canvasAppRef, data.payload.width, data.payload.height);
};

const handleClearCanvas = () => {
    renderClearCanvasAction(canvasAppRef, canvasContainerMapRef, canvasContainerChildCountRef);
};

const handleGetImageData = (data: BaseLayerRenderGetImageDataData) => {
    return renderGetImageDataAction(canvasAppRef, data.payload.selectRect);
};

const handleCanvasRender = () => {
    renderCanvasRenderAction(canvasAppRef);
};

const handleAddImageToContainer = async (data: BaseLayerRenderAddImageToContainerData) => {
    await renderAddImageToContainerAction(
        canvasContainerMapRef,
        currentImageTextureRef,
        data.payload.containerKey,
        data.payload.imageSrc,
    );
};

const handleClearContainer = (data: BaseLayerRenderClearContainerData) => {
    renderClearContainerAction(canvasContainerMapRef, data.payload.containerKey);
};

const handleCreateBlurSprite = (data: BaseLayerRenderCreateBlurSpriteData) => {
    renderCreateBlurSpriteAction(
        canvasContainerMapRef,
        currentImageTextureRef,
        blurSpriteMapRef,
        data.payload.blurContainerKey,
        data.payload.blurElementId,
    );
};

const handleUpdateBlurSprite = (data: BaseLayerRenderUpdateBlurSpriteData) => {
    renderUpdateBlurSpriteAction(
        blurSpriteMapRef,
        data.payload.blurElementId,
        data.payload.blurProps,
        data.payload.updateFilter,
    );
};

const handleDeleteBlurSprite = (data: BaseLayerRenderDeleteBlurSpriteData) => {
    renderDeleteBlurSpriteAction(blurSpriteMapRef, data.payload.blurElementId);
};

self.onmessage = async ({ data }: MessageEvent<BaseLayerRenderData>) => {
    let message: RenderResult;
    switch (data.type) {
        case BaseLayerRenderMessageType.Init:
            await handleInit(data);
            message = {
                type: BaseLayerRenderMessageType.Init,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.Dispose:
            await handleDispose();
            message = {
                type: BaseLayerRenderMessageType.Dispose,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.CreateNewCanvasContainer:
            const containerKey = handleCreateNewCanvasContainer(data);
            message = {
                type: BaseLayerRenderMessageType.CreateNewCanvasContainer,
                payload: { containerKey },
            };
            break;
        case BaseLayerRenderMessageType.ResizeCanvas:
            handleResizeCanvas(data);
            message = {
                type: BaseLayerRenderMessageType.ResizeCanvas,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.ClearCanvas:
            handleClearCanvas();
            message = {
                type: BaseLayerRenderMessageType.ClearCanvas,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.GetImageData:
            const imageData = handleGetImageData(data);
            message = {
                type: BaseLayerRenderMessageType.GetImageData,
                payload: { imageData },
            };
            break;
        case BaseLayerRenderMessageType.CanvasRender:
            handleCanvasRender();
            message = {
                type: BaseLayerRenderMessageType.CanvasRender,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.AddImageToContainer:
            await handleAddImageToContainer(data);
            message = {
                type: BaseLayerRenderMessageType.AddImageToContainer,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.ClearContainer:
            handleClearContainer(data);
            message = {
                type: BaseLayerRenderMessageType.ClearContainer,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.CreateBlurSprite:
            handleCreateBlurSprite(data);
            message = {
                type: BaseLayerRenderMessageType.CreateBlurSprite,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.UpdateBlurSprite:
            handleUpdateBlurSprite(data);
            message = {
                type: BaseLayerRenderMessageType.UpdateBlurSprite,
                payload: undefined,
            };
            break;
        case BaseLayerRenderMessageType.DeleteBlurSprite:
            handleDeleteBlurSprite(data);
            message = {
                type: BaseLayerRenderMessageType.DeleteBlurSprite,
                payload: undefined,
            };
            break;
    }

    self.postMessage(message);
};
