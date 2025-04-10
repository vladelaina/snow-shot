'use client';

import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawState } from '../../types';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Flex, theme } from 'antd';
import React from 'react';
import { DragButton, DragButtonActionType } from './components/dragButton';
import { DrawToolbarContext } from './extra';
import { KeyEventKey } from './components/keyEventWrap';
import { CloseOutlined, DragOutlined } from '@ant-design/icons';
import { ArrowIcon, CircleIcon, PenIcon, RectIcon } from '@/components/icons';
import { EllipseTool, RectTool } from './components/tools/shapeTool';
import { CaptureStepPublisher, DrawStatePublisher } from '../../page';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { ArrowTool } from './components/tools/arrowTool';
import { EnableKeyEventPublisher } from './components/keyEventWrap/extra';
import { HistoryControls } from './components/historyControls';
import { ToolButton } from './components/toolButton';
import { PenTool } from './components/tools/penTool';

export type DrawToolbarProps = {
    actionRef: React.RefObject<DrawToolbarActionType | undefined>;
    onCancel: () => void;
};

export type DrawToolbarActionType = {
    setEnable: (enable: boolean) => void;
};

export const DrawingPublisher = createPublisher<boolean>(false);

const DrawToolbarCore: React.FC<DrawToolbarProps> = ({ actionRef, onCancel }) => {
    const [getDrawState, setDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    const [, setCaptureStep] = useStateSubscriber(CaptureStepPublisher, undefined);
    const { token } = theme.useToken();

    const enableRef = useRef(false);
    const drawToolarContainerRef = useRef<HTMLDivElement | null>(null);
    const drawToolbarRef = useRef<HTMLDivElement | null>(null);
    const drawSubToolbarRef = useRef<HTMLDivElement | null>(null);
    const dragButtonActionRef = useRef<DragButtonActionType | undefined>(undefined);
    const [, setEnableKeyEvent] = useStateSubscriber(EnableKeyEventPublisher, undefined);
    const draggingRef = useRef(false);
    const onDrawingChange = useCallback((drawing: boolean) => {
        if (!drawToolarContainerRef.current) {
            return;
        }

        if (drawing) {
            drawToolarContainerRef.current.style.opacity = '0.32';
            drawToolarContainerRef.current.style.pointerEvents = 'none';
        } else {
            drawToolarContainerRef.current.style.opacity = '1';
            drawToolarContainerRef.current.style.pointerEvents = 'auto';
        }
    }, []);
    useStateSubscriber(DrawingPublisher, onDrawingChange);

    const updateEnableKeyEvent = useCallback(() => {
        setEnableKeyEvent(enableRef.current && !draggingRef.current);
    }, [setEnableKeyEvent]);

    const onDraggingChange = useCallback(
        (dragging: boolean) => {
            draggingRef.current = dragging;
            updateEnableKeyEvent();
        },
        [updateEnableKeyEvent],
    );

    const setDragging = useCallback(
        (dragging: boolean) => {
            if (draggingRef.current === dragging) {
                return;
            }

            onDraggingChange(dragging);
        },
        [onDraggingChange],
    );

    const onToolClick = useCallback(
        (drawState: DrawState) => {
            const prev = getDrawState();

            let next = drawState;
            if (prev === drawState) {
                next = DrawState.Idle;
            }

            if (next !== DrawState.Idle) {
                setCaptureStep(CaptureStep.Draw);
            } else {
                setCaptureStep(CaptureStep.Select);
            }

            setDrawState(next);
        },
        [getDrawState, setCaptureStep, setDrawState],
    );

    const drawToolbarContextValue = useMemo(() => {
        return {
            drawToolbarRef,
            drawSubToolbarRef,
            draggingRef,
            setDragging,
        };
    }, [drawToolbarRef, drawSubToolbarRef, draggingRef, setDragging]);

    const onEnableChange = useCallback((enable: boolean) => {
        enableRef.current = enable;
        dragButtonActionRef.current?.setEnable(enable);
    }, []);

    const setEnable = useCallback(
        (enable: boolean) => {
            if (enableRef.current === enable) {
                return;
            }

            onEnableChange(enable);
            updateEnableKeyEvent();
        },
        [onEnableChange, updateEnableKeyEvent],
    );

    useImperativeHandle(actionRef, () => {
        return {
            setEnable,
        };
    }, [setEnable]);
    return (
        <div
            className="draw-toolbar-container"
            onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            ref={drawToolarContainerRef}
        >
            <DrawToolbarContext.Provider value={drawToolbarContextValue}>
                <div className="draw-toolbar" ref={drawToolbarRef}>
                    <Flex align="center" gap={token.paddingXS}>
                        <DragButton actionRef={dragButtonActionRef} />

                        {/* 默认状态 */}
                        <ToolButton
                            componentKey={KeyEventKey.MoveTool}
                            icon={<DragOutlined />}
                            disableOnDrawing
                            drawState={DrawState.Idle}
                            onClick={() => {
                                onToolClick(DrawState.Idle);
                            }}
                        />

                        <div className="draw-toolbar-splitter" />

                        {/* 矩形 */}
                        <ToolButton
                            componentKey={KeyEventKey.RectTool}
                            icon={<RectIcon style={{ fontSize: '1em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Rect}
                            onClick={() => {
                                onToolClick(DrawState.Rect);
                            }}
                        />

                        {/* 椭圆 */}
                        <ToolButton
                            componentKey={KeyEventKey.EllipseTool}
                            icon={<CircleIcon style={{ fontSize: '1em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Ellipse}
                            onClick={() => {
                                onToolClick(DrawState.Ellipse);
                            }}
                        />

                        {/* 箭头 */}
                        <ToolButton
                            componentKey={KeyEventKey.ArrowTool}
                            icon={<ArrowIcon style={{ fontSize: '0.83em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Arrow}
                            onClick={() => {
                                onToolClick(DrawState.Arrow);
                            }}
                        />

                        {/* 画笔 */}
                        <ToolButton
                            componentKey={KeyEventKey.PenTool}
                            icon={<PenIcon style={{ fontSize: '1.08em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Pen}
                            onClick={() => {
                                onToolClick(DrawState.Pen);
                            }}
                        />

                        <div className="draw-toolbar-splitter" />

                        <HistoryControls />

                        <div className="draw-toolbar-splitter" />

                        {/* 取消截图 */}
                        <ToolButton
                            componentKey={KeyEventKey.CancelTool}
                            icon={
                                <CloseOutlined
                                    style={{ fontSize: '0.83em', color: token.colorError }}
                                />
                            }
                            disableOnDrawing
                            drawState={DrawState.Cancel}
                            onClick={() => {
                                onCancel();
                            }}
                        />
                    </Flex>

                    <div className="draw-subtoolbar-container">
                        <div className="draw-subtoolbar" ref={drawSubToolbarRef}>
                            <EllipseTool />
                            <RectTool />
                            <ArrowTool />
                            <PenTool />
                        </div>
                    </div>
                </div>
            </DrawToolbarContext.Provider>
            <style jsx>{`
                .draw-toolbar-container {
                    position: absolute;
                    z-index: ${zIndexs.Draw_Toolbar};
                    top: 0;
                    left: 0;
                    transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                }

                .draw-toolbar {
                    position: absolute;
                    opacity: 0;
                }

                .draw-toolbar,
                .draw-subtoolbar :global(.base-tool-container) {
                    padding: ${token.paddingXXS}px ${token.paddingSM}px;
                    box-sizing: border-box;
                    background-color: ${token.colorBgContainer};
                    border-radius: ${token.borderRadiusLG}px;
                    cursor: default; /* 防止非拖动区域也变成可拖动状态 */
                    color: ${token.colorText};
                    box-shadow: 0 0 3px 0px ${token.colorPrimaryHover};
                    transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                }

                .draw-subtoolbar {
                    opacity: 0;
                }

                .draw-subtoolbar-container {
                    position: absolute;
                    right: 0;
                    bottom: calc(-100% - ${token.marginXXS}px);
                    height: 100%;
                }

                .draw-toolbar :global(.draw-toolbar-drag) {
                    font-size: 18px;
                    color: ${token.colorTextQuaternary};
                    cursor: move;
                    margin-right: -3px;
                    margin-left: -3px;
                }

                .draw-toolbar-container :global(.ant-btn) :global(.ant-btn-icon) {
                    font-size: 24px;
                }

                .draw-toolbar-container :global(.ant-btn-icon) {
                    display: flex;
                    align-items: center;
                }

                .draw-toolbar-container :global(.draw-toolbar-splitter),
                .draw-toolbar-splitter {
                    width: 1px;
                    height: 0.83em;
                    background-color: ${token.colorBorder};
                    margin: 0 ${token.marginXXS}px;
                }
            `}</style>
        </div>
    );
};

export const DrawToolbar = React.memo(withStatePublisher(DrawToolbarCore, DrawingPublisher));
