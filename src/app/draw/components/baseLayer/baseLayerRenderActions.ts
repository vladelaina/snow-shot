import { Application, ApplicationOptions } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { RefWrap } from './workers/renderWorkerTypes';
import { RefObject } from 'react';
import { ElementRect } from '@/commands';

type RefType<T> = RefWrap<T> | RefObject<T>;

export const renderDisposeCanvasAction = (canvasAppRef: RefType<Application | undefined>) => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }
    canvasApp.destroy();
    canvasAppRef.current = undefined;
};

export const renderInitCanvasAction = async (
    canvasAppRef: RefType<Application | undefined>,
    appOptions: Partial<ApplicationOptions>,
): Promise<OffscreenCanvas | HTMLCanvasElement | undefined> => {
    const canvasApp = new PIXI.Application();
    await canvasApp.init({
        ...appOptions,
    });
    canvasAppRef.current = canvasApp;
    return canvasApp.canvas;
};

export const renderCreateNewCanvasContainerAction = (
    canvasAppRef: RefType<Application | undefined>,
    canvasContainerListRef: RefType<Map<string, PIXI.Container>>,
    containerKey: string,
) => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }

    const container = new PIXI.Container();
    container.zIndex = canvasContainerListRef.current.size + 1;
    container.sortableChildren = true;
    container.x = 0;
    container.y = 0;
    canvasApp.stage.addChild(container);
    canvasContainerListRef.current.set(containerKey, container);

    return containerKey;
};

export const renderResizeCanvasAction = (
    canvasAppRef: RefType<Application | undefined>,
    width: number,
    height: number,
) => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }

    canvasApp.renderer.resize(width, height);
};

export const renderClearCanvasAction = (
    canvasAppRef: RefType<Application | undefined>,
    canvasContainerMapRef: RefType<Map<string, PIXI.Container>>,
    canvasContainerChildCountRef: RefType<number>,
) => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }
    while (canvasApp.stage.children[0]) {
        canvasApp.stage.removeChild(canvasApp.stage.children[0]);
    }
    canvasContainerMapRef.current.clear();
    canvasContainerChildCountRef.current = 0;

    canvasApp.render();
};

export const renderGetImageDataAction = (
    canvasAppRef: RefType<Application | undefined>,
    selectRect: ElementRect,
): ImageData | undefined => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }

    return canvasApp.renderer.extract
        .canvas(canvasApp.stage)
        .getContext('2d')
        ?.getImageData(
            selectRect.min_x,
            selectRect.min_y,
            selectRect.max_x - selectRect.min_x,
            selectRect.max_y - selectRect.min_y,
            {
                colorSpace: 'srgb',
            },
        );
};

export const renderCanvasRenderAction = (canvasAppRef: RefType<Application | undefined>) => {
    const canvasApp = canvasAppRef.current;
    if (!canvasApp) {
        return;
    }

    canvasApp.render();
};

export const renderAddImageToContainerAction = async (
    canvasContainerMapRef: RefType<Map<string, PIXI.Container>>,
    currentImageTextureRef: RefType<PIXI.Texture | undefined>,
    containerKey: string,
    imageSrc: string,
): Promise<void> => {
    const container = canvasContainerMapRef.current.get(containerKey);
    if (!container) {
        return;
    }

    const texture = await PIXI.Assets.load<PIXI.Texture>({
        src: imageSrc,
        parser: 'texture',
    });
    const image = new PIXI.Sprite(texture);
    container.addChild(image);
    currentImageTextureRef.current = texture;
};

export const renderClearContainerAction = (
    canvasContainerMapRef: RefType<Map<string, PIXI.Container>>,
    containerKey: string,
) => {
    const container = canvasContainerMapRef.current.get(containerKey);
    if (!container) {
        return;
    }

    container.removeChildren();
};

export type BlurSprite = {
    sprite: PIXI.Sprite;
    spriteBlurFliter: PIXI.BlurFilter;
    spriteMask: PIXI.Graphics;
};

export const renderCreateBlurSpriteAction = (
    canvasContainerMapRef: RefType<Map<string, PIXI.Container>>,
    currentImageTextureRef: RefType<PIXI.Texture | undefined>,
    blurSpriteMapRef: RefType<Map<string, BlurSprite>>,
    blurContainerKey: string,
    blurElementId: string,
) => {
    const container = canvasContainerMapRef.current.get(blurContainerKey);
    if (!container) {
        return;
    }

    const imageTexture = currentImageTextureRef.current;
    if (!imageTexture) {
        return;
    }

    const blurSprite: BlurSprite = {
        sprite: new PIXI.Sprite(imageTexture),
        spriteBlurFliter: new PIXI.BlurFilter(),
        spriteMask: new PIXI.Graphics(),
    };
    blurSprite.sprite.filters = [blurSprite.spriteBlurFliter];
    blurSprite.sprite.x = 0;
    blurSprite.sprite.y = 0;
    blurSprite.sprite.width = imageTexture.width;
    blurSprite.sprite.height = imageTexture.height;
    blurSprite.sprite.setMask({
        mask: blurSprite.spriteMask,
    });
    blurSprite.spriteMask.setFillStyle({
        color: 'white',
        alpha: 1,
    });
    container.addChild(blurSprite.sprite);
    container.addChild(blurSprite.spriteMask);

    blurSpriteMapRef.current.set(blurElementId, blurSprite);
};

export type BlurSpriteProps = {
    blur: number;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    opacity: number;
    zoom: number;
};

export const renderUpdateBlurSpriteAction = (
    blurSpriteMapRef: RefType<Map<string, BlurSprite>>,
    blurElementId: string,
    blurProps: BlurSpriteProps,
    updateFilter: boolean,
) => {
    const blurSprite = blurSpriteMapRef.current.get(blurElementId);
    if (!blurSprite) {
        return;
    }

    blurSprite.spriteMask
        .clear()
        .rotateTransform(blurProps.angle)
        .translateTransform(
            blurProps.x + blurProps.width * 0.5,
            blurProps.y + blurProps.height * 0.5,
        )
        .scaleTransform(blurProps.zoom, blurProps.zoom)
        .rect(-blurProps.width * 0.5, -blurProps.height * 0.5, blurProps.width, blurProps.height)
        .fill();
    blurSprite.sprite.alpha = blurProps.opacity / 100;

    if (updateFilter) {
        blurSprite.spriteBlurFliter.strength = Math.max(0, (blurProps.blur / 100) * 32);
    }
};

export const renderDeleteBlurSpriteAction = (
    blurSpriteMapRef: RefType<Map<string, BlurSprite>>,
    blurElementId: string,
) => {
    const blurSprite = blurSpriteMapRef.current.get(blurElementId);
    if (!blurSprite) {
        return;
    }

    blurSprite.sprite.destroy();
    blurSprite.spriteBlurFliter.destroy();
    blurSprite.spriteMask.destroy();
    blurSpriteMapRef.current.delete(blurElementId);
};
