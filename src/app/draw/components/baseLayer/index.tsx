'use client';

import React, {
    ComponentType,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import * as PIXI from 'pixi.js';
import _ from 'lodash';
import { ImageBuffer } from '@/commands';
import styles from './index.module.css';

export type BaseLayerContextType = {
    /** 调整画布大小 */
    resizeCanvas: (width: number, height: number) => void;
    /** 添加一个子元素到最上层的容器 */
    addChildToTopContainer: (children: PIXI.Container<PIXI.ContainerChild>) => Promise<boolean>;
    /** 清空画布 */
    clearCanvas: () => void;
    /** 是否启用 */
    isEnable: boolean;
};

export const BaseLayerContext = React.createContext<BaseLayerContextType>({
    resizeCanvas: () => {},
    addChildToTopContainer: () => Promise.resolve(false),
    clearCanvas: () => {},
    isEnable: false,
});

export type BaseLayerEventActionType = {
    /**
     * 画布准备就绪
     */
    onCanvasReady: (app: PIXI.Application) => void;
    /**
     * 截图准备
     */
    onCaptureReady: (texture: PIXI.Texture, imageBuffer: ImageBuffer) => Promise<void>;
    /**
     * 截图完成
     */
    onCaptureFinish: () => void;
};

export type BaseLayerActionType = {
    /**
     * 禁用当前图层
     */
    disable: () => void;
    /**
     * 启用当前图层
     */
    enable: () => void;
} & BaseLayerEventActionType;

type BaseLayerCoreActionType = {
    resizeCanvas: (width: number, height: number) => void;
    clearCanvas: () => void;
};

export type BaseLayerProps = {
    children: React.ReactNode;
    zIndex: number;
    enable: boolean;
    onCanvasReady: (app: PIXI.Application) => void;
};

export const BaseLayerCore: React.FC<
    BaseLayerProps & { actionRef?: React.RefObject<BaseLayerCoreActionType | undefined> }
> = ({ zIndex, actionRef, enable, children, onCanvasReady }) => {
    const layerContainerElementRef = useRef<HTMLDivElement>(null);
    const canvasAppRef = useRef<PIXI.Application | null>(null);
    const canvasContainerListRef = useRef<PIXI.Container[]>([]);
    const canvasContainerChildCountRef = useRef<number>(0);

    /** 创建一个新的画布容器 */
    const createNewCanvasContainer = useCallback((): PIXI.Container | undefined => {
        const canvasApp = canvasAppRef.current;
        if (!canvasApp) {
            return;
        }

        const container = new PIXI.Container();
        container.zIndex = canvasContainerListRef.current.length + 1;
        container.x = 0;
        container.y = 0;
        canvasApp.stage.addChild(container);
        canvasContainerListRef.current.push(container);
        return container;
    }, []);

    /** 初始化画布 */
    const initCanvas = useCallback(async () => {
        const canvasApp = new PIXI.Application();
        await canvasApp.init({
            backgroundAlpha: 0,
            eventFeatures: {
                move: false,
                globalMove: false,
                click: false,
                wheel: false,
            },
        });
        canvasAppRef.current = canvasApp;
        layerContainerElementRef.current?.appendChild(canvasApp.canvas);
        onCanvasReady(canvasApp);
    }, [onCanvasReady]);

    /** 调整画布大小 */
    const resizeCanvas = useCallback(
        (width: number, height: number) => {
            const canvasApp = canvasAppRef.current;
            if (!canvasApp) {
                return;
            }

            canvasApp.renderer.resize(width, height);
            // 创建根画布容器
            createNewCanvasContainer();
        },
        [createNewCanvasContainer],
    );

    const getTopContainer = useCallback(() => {
        return _.last(canvasContainerListRef.current);
    }, []);

    const addChildToTopContainer = useCallback(
        async (children: PIXI.Container<PIXI.ContainerChild>): Promise<boolean> => {
            const topContainer = getTopContainer();
            if (!topContainer) {
                return false;
            }
            topContainer.zIndex = canvasContainerChildCountRef.current + 1;
            topContainer.addChild(children);
            canvasContainerChildCountRef.current++;
            return true;
        },
        [getTopContainer],
    );

    const clearCanvas = useCallback(() => {
        const canvasApp = canvasAppRef.current;
        if (!canvasApp) {
            return;
        }
        while (canvasApp.stage.children[0]) {
            canvasApp.stage.removeChild(canvasApp.stage.children[0]);
        }
        canvasContainerListRef.current = [];
        canvasContainerChildCountRef.current = 0;
    }, []);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    useImperativeHandle(actionRef, () => ({ resizeCanvas, clearCanvas }), [
        resizeCanvas,
        clearCanvas,
    ]);

    return (
        <BaseLayerContext.Provider
            value={{ resizeCanvas, addChildToTopContainer, clearCanvas, isEnable: enable }}
        >
            <div
                className={styles.baseLayer}
                ref={layerContainerElementRef}
                style={{ zIndex, pointerEvents: enable ? 'auto' : 'none' }}
            />
            {children}
        </BaseLayerContext.Provider>
    );
};

/**
 * BaseLayer 高阶组件
 * @param WrappedComponent 需要包装的基础组件
 */
export function withBaseLayer<
    ActionType extends BaseLayerActionType,
    Props extends { actionRef: React.RefObject<ActionType | undefined> },
>(WrappedComponent: ComponentType<Props>, zIndex: number) {
    return React.memo(function BaseLayer(props: Props) {
        const { actionRef } = props;
        const layerActionRef = useRef<ActionType | undefined>(undefined);
        const baseLayerCoreActionRef = useRef<BaseLayerCoreActionType | undefined>(undefined);

        const [layerEnable, setLayerEnable] = useState(false);

        const onCaptureReady = useCallback(
            async (...args: Parameters<BaseLayerActionType['onCaptureReady']>) => {
                const [, imageBuffer] = args;

                // 将画布调整为截图大小
                const { monitorWidth, monitorHeight } = imageBuffer;

                baseLayerCoreActionRef.current?.resizeCanvas(monitorWidth, monitorHeight);
                await layerActionRef.current?.onCaptureReady(...args);
            },
            [],
        );
        const onCaptureFinish = useCallback(
            async (...args: Parameters<BaseLayerActionType['onCaptureFinish']>) => {
                baseLayerCoreActionRef.current?.clearCanvas();
                layerActionRef.current?.onCaptureFinish(...args);
            },
            [],
        );
        const disable = useCallback((...args: Parameters<BaseLayerActionType['disable']>) => {
            setLayerEnable(false);
            layerActionRef.current?.disable(...args);
        }, []);
        const enable = useCallback((...args: Parameters<BaseLayerActionType['enable']>) => {
            setLayerEnable(true);
            layerActionRef.current?.enable(...args);
        }, []);

        const onCanvasReady = useCallback((app: PIXI.Application) => {
            layerActionRef.current?.onCanvasReady(app);
        }, []);

        useImperativeHandle(
            actionRef,
            () => ({
                ...(layerActionRef.current as ActionType),
                onCaptureReady,
                onCaptureFinish,
                disable,
                enable,
            }),
            [disable, enable, onCaptureFinish, onCaptureReady],
        );

        return (
            <BaseLayerCore
                zIndex={zIndex}
                actionRef={baseLayerCoreActionRef}
                enable={layerEnable}
                onCanvasReady={onCanvasReady}
            >
                <WrappedComponent {...props} actionRef={layerActionRef} />
            </BaseLayerCore>
        );
    });
}
