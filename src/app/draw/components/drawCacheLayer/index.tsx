'use client';
/** pixijs 的绘制效果很差，没找到成熟的绘制方案，自己写绘制的太烂了，用 excalidraw 作为绘制缓存层实现绘制效果 */

import React from 'react';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { zIndexs } from '@/utils/zIndex';
import { Excalidraw } from '@mg-chao/excalidraw';
import {
    ExcalidrawInitialDataState,
    ExcalidrawImperativeAPI,
    ExcalidrawActionType,
    ExcalidrawPropsCustomOptions,
} from '@mg-chao/excalidraw/types';
import '@mg-chao/excalidraw/index.css';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { withStatePublisher } from '@/hooks/useStatePublisher';
import { ExcalidrawKeyEventHandler } from './components/excalidrawKeyEventHandler';
import {
    convertLocalToLocalCode,
    ExcalidrawKeyEventPublisher,
    ExcalidrawOnChangePublisher,
    ExcalidrawOnHandleEraserPublisher,
} from './extra';
import { DrawCacheLayerActionType } from './extra';
import { useIntl } from 'react-intl';
import { theme } from 'antd';
import { useHistory } from '../historyContext';
import { layoutRenders } from './excalidrawRenders';
import { pickerRenders } from './excalidrawRenders';

const DrawCacheLayerCore: React.FC<{
    actionRef: React.RefObject<DrawCacheLayerActionType | undefined>;
}> = ({ actionRef }) => {
    const { token } = theme.useToken();
    const intl = useIntl();

    const { history } = useHistory();

    const initialData = useMemo<ExcalidrawInitialDataState>(() => {
        return {
            appState: { viewBackgroundColor: '#00000000' },
        };
    }, []);

    const [, setExcalidrawOnChangeEvent] = useStateSubscriber(
        ExcalidrawOnChangePublisher,
        undefined,
    );
    const [, setExcalidrawOnHandleEraserEvent] = useStateSubscriber(
        ExcalidrawOnHandleEraserPublisher,
        undefined,
    );
    const [getExcalidrawKeyEvent] = useStateSubscriber(ExcalidrawKeyEventPublisher, undefined);
    const drawCacheLayerElementRef = useRef<HTMLDivElement>(null);
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>(undefined);
    const excalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
        excalidrawAPIRef.current = api;
    }, []);
    const excalidrawActionRef = useRef<ExcalidrawActionType>(undefined);

    const updateScene = useCallback<DrawCacheLayerActionType['updateScene']>((...args) => {
        excalidrawAPIRef.current?.updateScene(...args);
    }, []);

    const setEnable = useCallback<DrawCacheLayerActionType['setEnable']>((enable: boolean) => {
        if (!drawCacheLayerElementRef.current) {
            return;
        }

        if (enable) {
            drawCacheLayerElementRef.current.style.pointerEvents = 'auto';
            drawCacheLayerElementRef.current.style.opacity = '1';
        } else {
            drawCacheLayerElementRef.current.style.pointerEvents = 'none';
        }
    }, []);

    useImperativeHandle(
        actionRef,
        () => ({
            setActiveTool: (...args) => {
                excalidrawAPIRef.current?.setActiveTool(...args);
            },
            syncActionResult: (...args) => {
                excalidrawActionRef.current?.syncActionResult(...args);
            },
            updateScene,
            setEnable,
            onCaptureReady: async () => {
                setEnable(false);
                excalidrawAPIRef.current?.updateScene({
                    elements: [],
                });
            },
            onCaptureFinish: async () => {
                setEnable(false);
                excalidrawAPIRef.current?.setActiveTool({
                    type: 'hand',
                });
                updateScene({
                    elements: [],
                    captureUpdate: 'IMMEDIATELY',
                });
                excalidrawAPIRef.current?.history.clear();
                history.clear();
            },
        }),
        [history, setEnable, updateScene],
    );

    const shouldResizeFromCenter = useCallback<
        NonNullable<ExcalidrawPropsCustomOptions['shouldResizeFromCenter']>
    >(() => {
        return getExcalidrawKeyEvent().resizeFromCenter;
    }, [getExcalidrawKeyEvent]);

    const shouldMaintainAspectRatio = useCallback<
        NonNullable<ExcalidrawPropsCustomOptions['shouldMaintainAspectRatio']>
    >(() => {
        return getExcalidrawKeyEvent().maintainAspectRatio;
    }, [getExcalidrawKeyEvent]);

    const shouldRotateWithDiscreteAngle = useCallback<
        NonNullable<ExcalidrawPropsCustomOptions['shouldRotateWithDiscreteAngle']>
    >(() => {
        return getExcalidrawKeyEvent().rotateWithDiscreteAngle;
    }, [getExcalidrawKeyEvent]);

    const shouldSnapping = useCallback<
        NonNullable<ExcalidrawPropsCustomOptions['shouldSnapping']>
    >(() => {
        return getExcalidrawKeyEvent().autoAlign;
    }, [getExcalidrawKeyEvent]);

    const onHistoryChange = useCallback<
        NonNullable<ExcalidrawPropsCustomOptions['onHistoryChange']>
    >(
        (_, type) => {
            if (type === 'record') {
                history.pushDrawCacheRecordAction(excalidrawActionRef);
            }
        },
        [history],
    );

    return (
        <div ref={drawCacheLayerElementRef} className="draw-cache-layer">
            <Excalidraw
                actionRef={excalidrawActionRef}
                initialData={initialData}
                handleKeyboardGlobally
                excalidrawAPI={excalidrawAPI}
                customOptions={{
                    disableKeyEvents: true,
                    hideFooter: true,
                    hideMainToolbar: true,
                    hideContextMenu: true,
                    shouldResizeFromCenter,
                    shouldMaintainAspectRatio,
                    shouldSnapping,
                    shouldRotateWithDiscreteAngle,
                    pickerRenders: pickerRenders,
                    layoutRenders: layoutRenders,
                    onHistoryChange,
                    onHandleEraser: (elements) => {
                        setExcalidrawOnHandleEraserEvent({
                            elements,
                        });
                    },
                }}
                onChange={(elements, appState, files) => {
                    setExcalidrawOnChangeEvent({
                        elements,
                        appState,
                        files,
                    });
                }}
                langCode={convertLocalToLocalCode(intl.locale)}
            />
            <ExcalidrawKeyEventHandler />

            <style jsx>{`
                .draw-cache-layer {
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                }

                .draw-cache-layer :global(.excalidraw .layer-ui__wrapper) {
                    z-index: unset !important;
                }

                .draw-cache-layer :global(.excalidraw .layout-menu-render) {
                    position: fixed;
                    z-index: 204;
                    left: 0;
                    top: 0;
                    box-sizing: border-box;
                    background-color: ${token.colorBgContainer};
                    transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                    box-shadow: 0 0 3px 0px ${token.colorPrimaryHover};
                    color: ${token.colorText};
                    border-radius: ${token.borderRadiusLG}px;
                    animation: slideIn ${token.motionDurationFast} ${token.motionEaseInOut};
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .draw-cache-layer :global(.layout-menu-render-drag-button) {
                    text-align: center;
                    margin-top: ${token.marginXS}px;
                    margin-bottom: -${token.marginXS}px;
                }

                .draw-cache-layer :global(.layout-menu-render-drag-button > span) {
                    transform: rotate(90deg);
                }

                .draw-cache-layer :global(.Island.App-menu__left) {
                    --text-primary-color: ${token.colorText};

                    background-color: unset !important;
                    box-shadow: unset !important;
                    position: relative !important;
                    padding: ${token.paddingSM}px ${token.paddingSM}px !important;
                }

                .draw-cache-layer :global(.excalidraw-container-inner) {
                    z-index: ${zIndexs.Draw_DrawCacheLayer};
                    position: fixed;
                }

                .draw-cache-layer :global(.excalidraw .radio-button-icon) {
                    width: var(--default-icon-size);
                    height: 100%;
                    display: flex;
                    align-items: center;
                }

                .draw-cache-layer :global(.excalidraw .ant-radio-button-wrapper) {
                    padding-inline: ${token.paddingXS}px;
                }
            `}</style>
        </div>
    );
};

export const DrawCacheLayer = React.memo(
    withStatePublisher(DrawCacheLayerCore, ExcalidrawKeyEventPublisher),
);
