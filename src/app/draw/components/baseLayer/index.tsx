'use client';

import React, {
    ComponentType,
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import * as PIXI from 'pixi.js';
import _ from 'lodash';
import { ImageBuffer } from '@/commands';
import styles from './index.module.css';
import { AppSettingsContext } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';

export type BaseLayerContextType = {
    /** 调整画布大小 */
    resizeCanvas: (width: number, height: number) => void;
    /** 添加一个子元素到最上层的容器 */
    addChildToTopContainer: (children: PIXI.Container<PIXI.ContainerChild>) => void;
    /** 创建一个新的画布容器 */
    createNewCanvasContainer: () => void;
    /** 清空画布 */
    clearCanvas: () => void;
    /** 是否启用 */
    isEnable: boolean;
    /**
     * 改变光标样式
     */
    changeCursor: (cursor: Required<React.CSSProperties>['cursor']) => void;
    /** 画布容器元素 */
    layerContainerElementRef: React.RefObject<HTMLDivElement | null>;
    /** 获取画布上下文 */
    getCanvasApp: () => PIXI.Application | undefined;
};

export const BaseLayerContext = React.createContext<BaseLayerContextType>({
    resizeCanvas: () => {},
    addChildToTopContainer: () => {},
    createNewCanvasContainer: () => {},
    clearCanvas: () => {},
    isEnable: false,
    /**
     * 改变光标样式
     */
    changeCursor: () => {},
    /** 画布容器元素 */
    layerContainerElementRef: { current: null },
    /** 获取画布上下文 */
    getCanvasApp: () => undefined,
});

export type BaseLayerEventActionType = {
    /**
     * 执行截图
     */
    onExecuteScreenshot: () => Promise<void>;
    /**
     * 画布准备就绪
     */
    onCanvasReady: (app: PIXI.Application) => void;
    /**
     * 截图准备
     */
    onCaptureReady: (texture: PIXI.Texture, imageBuffer: ImageBuffer) => Promise<void>;
    /**
     * 截图加载完成
     */
    onCaptureLoad: () => Promise<void>;
    /**
     * 截图完成
     */
    onCaptureFinish: () => void;
    /**
     * 获取画布上下文
     */
    getCanvasApp: () => PIXI.Application | undefined | null;
    /**
     * 获取画布容器元素
     */
    getLayerContainerElement: () => HTMLDivElement | null;
    /**
     * 添加一个子元素到最上层的容器
     */
    addChildToTopContainer: (children: PIXI.Container<PIXI.ContainerChild>) => void;
};

export type BaseLayerActionType = {
    /**
     * 设置是否启用
     */
    setEnable: (enable: boolean) => void;
} & BaseLayerEventActionType;

export const defaultBaseLayerActions: BaseLayerActionType = {
    onCanvasReady: () => {},
    onCaptureReady: () => Promise.resolve(),
    onCaptureLoad: () => Promise.resolve(),
    onCaptureFinish: () => {},
    setEnable: () => {},
    onExecuteScreenshot: () => Promise.resolve(),
    getCanvasApp: () => null,
    getLayerContainerElement: () => null,
    addChildToTopContainer: () => {},
};

type BaseLayerCoreActionType = {
    resizeCanvas: (width: number, height: number) => void;
    clearCanvas: () => void;
    getCanvasApp: () => PIXI.Application | undefined;
    getLayerContainerElement: () => HTMLDivElement | null;
    addChildToTopContainer: (children: PIXI.Container<PIXI.ContainerChild>) => void;
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
    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    const {
        render: { antialias },
    } = useContext(AppSettingsContext);
    useAppSettingsLoad(
        useCallback(() => {
            setAppSettingsLoading(false);
        }, []),
    );

    const layerContainerElementRef = useRef<HTMLDivElement>(null);
    const canvasAppRef = useRef<PIXI.Application | undefined>(undefined);
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
        container.sortableChildren = true;
        container.x = 0;
        container.y = 0;
        canvasApp.stage.addChild(container);
        canvasContainerListRef.current.push(container);
        return container;
    }, []);

    /** 初始化画布 */
    const initCanvas = useCallback(
        async (antialias: boolean) => {
            const canvasApp = new PIXI.Application();
            await canvasApp.init({
                backgroundAlpha: 0,
                eventFeatures: {
                    move: false,
                    globalMove: false,
                    click: false,
                    wheel: false,
                },
                antialias,
            });
            canvasAppRef.current = canvasApp;
            layerContainerElementRef.current?.appendChild(canvasApp.canvas);
            onCanvasReady(canvasApp);
        },
        [onCanvasReady],
    );

    const disposeCanvas = useCallback(() => {
        const canvasApp = canvasAppRef.current;
        if (!canvasApp) {
            return;
        }
        layerContainerElementRef.current?.removeChild(canvasApp.canvas);
        canvasApp.destroy();
    }, []);

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
        (children: PIXI.Container<PIXI.ContainerChild>) => {
            const topContainer = getTopContainer();
            if (!topContainer) {
                throw new Error('Top container not found');
            }
            children.zIndex = canvasContainerChildCountRef.current + 1;
            topContainer.addChild(children);
            canvasContainerChildCountRef.current++;
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
        layerContainerElementRef.current!.style.cursor = 'auto';
    }, []);

    const changeCursor = useCallback<BaseLayerContextType['changeCursor']>((cursor) => {
        layerContainerElementRef.current!.style.cursor = cursor;
    }, []);

    const getCanvasApp = useCallback<BaseLayerContextType['getCanvasApp']>(() => {
        return canvasAppRef.current;
    }, []);

    const getLayerContainerElement = useCallback<
        BaseLayerCoreActionType['getLayerContainerElement']
    >(() => layerContainerElementRef.current, []);

    useEffect(() => {
        if (appSettingsLoading) {
            return;
        }

        initCanvas(antialias);

        return () => {
            disposeCanvas();
        };
    }, [initCanvas, antialias, disposeCanvas, appSettingsLoading]);

    useImperativeHandle(
        actionRef,
        () => ({
            resizeCanvas,
            clearCanvas,
            getCanvasApp,
            getLayerContainerElement,
            addChildToTopContainer,
        }),
        [resizeCanvas, clearCanvas, getCanvasApp, getLayerContainerElement, addChildToTopContainer],
    );

    useEffect(() => {
        if (enable) {
            layerContainerElementRef.current!.style.pointerEvents = 'auto';
            canvasAppRef.current?.start();
        } else {
            layerContainerElementRef.current!.style.pointerEvents = 'none';
            canvasAppRef.current?.stop();
        }
    }, [enable]);

    const baseLayerContextValue = useMemo(() => {
        return {
            resizeCanvas,
            addChildToTopContainer,
            clearCanvas,
            createNewCanvasContainer,
            isEnable: enable,
            changeCursor,
            layerContainerElementRef,
            getCanvasApp,
        };
    }, [
        resizeCanvas,
        addChildToTopContainer,
        clearCanvas,
        createNewCanvasContainer,
        enable,
        changeCursor,
        getCanvasApp,
    ]);

    return (
        <BaseLayerContext.Provider value={baseLayerContextValue}>
            <div className={styles.baseLayer} ref={layerContainerElementRef} style={{ zIndex }} />
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

        const setEnable = useCallback((...args: Parameters<BaseLayerActionType['setEnable']>) => {
            setLayerEnable(...args);
            layerActionRef.current?.setEnable(...args);
        }, []);

        const onCanvasReady = useCallback((app: PIXI.Application) => {
            layerActionRef.current?.onCanvasReady(app);
        }, []);

        const getCanvasApp = useCallback(() => {
            return baseLayerCoreActionRef.current?.getCanvasApp();
        }, []);

        const getLayerContainerElement = useCallback(() => {
            return baseLayerCoreActionRef.current?.getLayerContainerElement();
        }, []);

        const addChildToTopContainer = useCallback(
            (children: PIXI.Container<PIXI.ContainerChild>) => {
                baseLayerCoreActionRef.current?.addChildToTopContainer(children);
            },
            [],
        );

        useImperativeHandle(
            actionRef,
            () => ({
                ...(layerActionRef.current as ActionType),
                onCaptureReady,
                onCaptureFinish,
                setEnable,
                getCanvasApp,
                getLayerContainerElement,
                addChildToTopContainer,
            }),
            [
                onCaptureReady,
                onCaptureFinish,
                setEnable,
                getCanvasApp,
                getLayerContainerElement,
                addChildToTopContainer,
            ],
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
