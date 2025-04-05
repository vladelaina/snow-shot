'use client';

import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawState } from '../../types';
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Flex, theme } from 'antd';
import React from 'react';
import { DragButton, DragButtonActionType } from './components/dragButton';
import { DrawToolbarContext, getButtonTypeByState } from './extra';
import { KeyEventKey, KeyEventWrap } from './components/keyEventWrap';
import { DragOutlined } from '@ant-design/icons';
import { ArrowIcon, CircleIcon, RectIcon } from '@/components/icons';
import { EllipseTool, RectTool } from './components/tools/shapeTool';
import { CaptureStepPublisher, DrawStatePublisher } from '../../page';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { ArrowTool } from './components/tools/arrowTool';
import { EnableKeyEventPublisher } from './components/keyEventWrap/extra';

export type DrawToolbarProps = {
    actionRef: React.RefObject<DrawToolbarActionType | undefined>;
};

export type DrawToolbarActionType = {
    setEnable: (enable: boolean) => void;
};

export const DrawingPublisher = createPublisher<boolean>(false);

const DrawToolbarCore: React.FC<DrawToolbarProps> = ({ actionRef }) => {
    const [drawState, _setDrawState] = useState(DrawStatePublisher.defaultValue);
    const [getDrawState, setDrawState] = useStateSubscriber(DrawStatePublisher, _setDrawState);
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

    const enableSubToolbar = useMemo(() => {
        switch (drawState) {
            case DrawState.Idle:
                return false;
            default:
                return true;
        }
    }, [drawState]);

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
                        <DragButton
                            enableSubToolbar={enableSubToolbar}
                            actionRef={dragButtonActionRef}
                        />

                        {/* 默认状态 */}
                        <KeyEventWrap
                            onKeyDownEventPropName="onClick"
                            componentKey={KeyEventKey.MoveTool}
                            disableOnDrawing
                        >
                            <Button
                                icon={<DragOutlined />}
                                type={getButtonTypeByState(drawState === DrawState.Idle)}
                                onClick={() => {
                                    onToolClick(DrawState.Idle);
                                }}
                            />
                        </KeyEventWrap>

                        {/* 选择物体 */}
                        {/* <KeyEventWrap
                            onKeyDownEventPropName="onClick"
                            componentKey={KeyEventKey.SelectTool}
                            enable={enableKeyEvent}
                        >
                            <Button
                                icon={<ArrowSelectIcon style={{ fontSize: '1.08em' }} />}
                                type={getButtonTypeByState(drawState === DrawState.Select)}
                                onClick={() => {
                                    onToolClick(DrawState.Select);
                                }}
                            />
                        </KeyEventWrap> */}

                        <div className="draw-toolbar-splitter" />

                        {/* 矩形 */}
                        <KeyEventWrap
                            onKeyDownEventPropName="onClick"
                            componentKey={KeyEventKey.RectTool}
                            disableOnDrawing
                        >
                            <Button
                                icon={<RectIcon style={{ fontSize: '1em' }} />}
                                type={getButtonTypeByState(drawState === DrawState.Rect)}
                                onClick={() => {
                                    onToolClick(DrawState.Rect);
                                }}
                            />
                        </KeyEventWrap>

                        {/* 椭圆 */}
                        <KeyEventWrap
                            onKeyDownEventPropName="onClick"
                            componentKey={KeyEventKey.EllipseTool}
                            disableOnDrawing
                        >
                            <Button
                                icon={<CircleIcon style={{ fontSize: '1em' }} />}
                                type={getButtonTypeByState(drawState === DrawState.Ellipse)}
                                onClick={() => {
                                    onToolClick(DrawState.Ellipse);
                                }}
                            />
                        </KeyEventWrap>

                        {/* 箭头 */}
                        <KeyEventWrap
                            onKeyDownEventPropName="onClick"
                            componentKey={KeyEventKey.ArrowTool}
                            disableOnDrawing
                        >
                            <Button
                                icon={<ArrowIcon style={{ fontSize: '0.83em' }} />}
                                type={getButtonTypeByState(drawState === DrawState.Arrow)}
                                onClick={() => {
                                    onToolClick(DrawState.Arrow);
                                }}
                            />
                        </KeyEventWrap>
                    </Flex>

                    <div className="draw-subtoolbar-container">
                        <div className="draw-subtoolbar" ref={drawSubToolbarRef}>
                            <EllipseTool />
                            <RectTool />
                            <ArrowTool />
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
