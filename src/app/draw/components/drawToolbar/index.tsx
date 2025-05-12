'use client';

import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawContext, DrawState } from '../../types';
import { useCallback, useContext, useImperativeHandle, useMemo, useRef } from 'react';
import { Flex, theme } from 'antd';
import React from 'react';
import { DragButton, DragButtonActionType } from './components/dragButton';
import { DrawToolbarContext } from './extra';
import { KeyEventKey } from './components/keyEventWrap/extra';
import { CloseOutlined, CopyOutlined, DragOutlined } from '@ant-design/icons';
import {
    ArrowIcon,
    ArrowSelectIcon,
    CircleIcon,
    DiamondIcon,
    EraserIcon,
    FixedIcon,
    LineIcon,
    MosaicIcon,
    OcrDetectIcon,
    PenIcon,
    RectIcon,
    SaveIcon,
    TextIcon,
} from '@/components/icons';
import {
    CaptureEvent,
    CaptureEventPublisher,
    CaptureStepPublisher,
    DrawStatePublisher,
    ScreenshotTypePublisher,
} from '../../extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { EnableKeyEventPublisher } from './components/keyEventWrap/extra';
import { HistoryControls } from './components/historyControls';
import { ToolButton } from './components/toolButton';
import { FormattedMessage } from 'react-intl';
import { BlurTool } from './components/tools/blurTool';
import { ScreenshotType } from '@/functions/screenshot';

export type DrawToolbarProps = {
    actionRef: React.RefObject<DrawToolbarActionType | undefined>;
    onCancel: () => void;
    onSave: () => void;
    onFixed: () => void;
    onTopWindow: () => void;
    onCopyToClipboard: () => void;
    onOcrDetect: () => void;
};

export type DrawToolbarActionType = {
    setEnable: (enable: boolean) => void;
};

export const DrawingPublisher = createPublisher<boolean>(false);

const DrawToolbarCore: React.FC<DrawToolbarProps> = ({
    actionRef,
    onCancel,
    onSave,
    onFixed,
    onCopyToClipboard,
    onTopWindow,
    onOcrDetect,
}) => {
    const { drawCacheLayerActionRef } = useContext(DrawContext);

    const [getDrawState, setDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    const [, setCaptureStep] = useStateSubscriber(CaptureStepPublisher, undefined);
    const [getScreenshotType] = useStateSubscriber(ScreenshotTypePublisher, undefined);
    const { token } = theme.useToken();

    const enableRef = useRef(false);
    const drawToolarContainerRef = useRef<HTMLDivElement | null>(null);
    const drawToolbarRef = useRef<HTMLDivElement | null>(null);
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
                next = DrawState.Select;
            }

            if (next !== DrawState.Idle) {
                setCaptureStep(CaptureStep.Draw);
            } else {
                setCaptureStep(CaptureStep.Select);
            }

            switch (next) {
                case DrawState.Idle:
                    drawCacheLayerActionRef.current?.setEnable(false);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'hand',
                    });
                    break;
                case DrawState.Select:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'selection',
                    });
                    break;
                case DrawState.Rect:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'rectangle',
                        locked: true,
                    });
                    break;
                case DrawState.Diamond:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'diamond',
                        locked: true,
                    });
                    break;
                case DrawState.Ellipse:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'ellipse',
                        locked: true,
                    });
                    break;
                case DrawState.Arrow:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'arrow',
                        locked: true,
                    });
                    break;
                case DrawState.Line:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'line',
                        locked: true,
                    });
                    break;
                case DrawState.Pen:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'freedraw',
                        locked: true,
                    });
                    break;
                case DrawState.Text:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'text',
                        locked: true,
                    });
                    break;
                case DrawState.Blur:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'blur',
                        locked: true,
                    });
                    break;
                case DrawState.Eraser:
                    drawCacheLayerActionRef.current?.setEnable(true);
                    drawCacheLayerActionRef.current?.setActiveTool({
                        type: 'eraser',
                        locked: true,
                    });
                    break;
                case DrawState.OcrDetect:
                    onOcrDetect();
                    break;
                default:
                    break;
            }

            setDrawState(next);
        },
        [drawCacheLayerActionRef, getDrawState, onOcrDetect, setCaptureStep, setDrawState],
    );

    const drawToolbarContextValue = useMemo(() => {
        return {
            drawToolbarRef,
            draggingRef,
            setDragging,
        };
    }, [drawToolbarRef, draggingRef, setDragging]);

    const canHandleScreenshotTypeRef = useRef(false);
    useStateSubscriber(CaptureEventPublisher, (event) => {
        if (event?.event === CaptureEvent.onCaptureReady) {
            canHandleScreenshotTypeRef.current = true;
        }
    });

    const onEnableChange = useCallback(
        (enable: boolean) => {
            enableRef.current = enable;
            dragButtonActionRef.current?.setEnable(enable);
            drawToolarContainerRef.current!.style.pointerEvents = enable ? 'auto' : 'none';

            if (canHandleScreenshotTypeRef.current) {
                switch (getScreenshotType()) {
                    case ScreenshotType.Fixed:
                        onFixed();
                        break;
                    case ScreenshotType.OcrDetect:
                        onToolClick(DrawState.OcrDetect);
                        break;
                    case ScreenshotType.TopWindow:
                        onTopWindow();
                        break;
                    case ScreenshotType.Default:
                    default:
                        onToolClick(DrawState.Idle);
                        break;
                }
                canHandleScreenshotTypeRef.current = false;
            }
        },
        [onFixed, onToolClick, onTopWindow, getScreenshotType],
    );

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

                        {/* 选择状态 */}
                        <ToolButton
                            componentKey={KeyEventKey.SelectTool}
                            icon={<ArrowSelectIcon style={{ fontSize: '1.08em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Select}
                            onClick={() => {
                                onToolClick(DrawState.Select);
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

                        {/* 菱形 */}
                        <ToolButton
                            componentKey={KeyEventKey.DiamondTool}
                            icon={<DiamondIcon style={{ fontSize: '1em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Diamond}
                            onClick={() => {
                                onToolClick(DrawState.Diamond);
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

                        {/* 线条 */}
                        <ToolButton
                            componentKey={KeyEventKey.LineTool}
                            icon={<LineIcon style={{ fontSize: '1.16em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Line}
                            onClick={() => {
                                onToolClick(DrawState.Line);
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

                        {/* 文本 */}
                        <ToolButton
                            componentKey={KeyEventKey.TextTool}
                            icon={<TextIcon style={{ fontSize: '1.08em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Text}
                            onClick={() => {
                                onToolClick(DrawState.Text);
                            }}
                        />

                        {/* 模糊 */}
                        <ToolButton
                            componentKey={KeyEventKey.BlurTool}
                            icon={<MosaicIcon />}
                            disableOnDrawing
                            drawState={DrawState.Blur}
                            onClick={() => {
                                onToolClick(DrawState.Blur);
                            }}
                        />

                        {/* 橡皮擦 */}
                        <ToolButton
                            componentKey={KeyEventKey.EraserTool}
                            icon={<EraserIcon style={{ fontSize: '0.9em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Eraser}
                            onClick={() => {
                                onToolClick(DrawState.Eraser);
                            }}
                        />

                        <div className="draw-toolbar-splitter" />

                        <HistoryControls />

                        <div className="draw-toolbar-splitter" />

                        {/* 固定到屏幕 */}
                        <ToolButton
                            componentKey={KeyEventKey.FixedTool}
                            icon={<FixedIcon style={{ fontSize: '1em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Fixed}
                            onClick={() => {
                                onFixed();
                            }}
                        />

                        {/* OCR */}
                        <ToolButton
                            componentKey={KeyEventKey.OcrDetectTool}
                            icon={<OcrDetectIcon style={{ fontSize: '0.88em' }} />}
                            disableOnDrawing
                            drawState={DrawState.OcrDetect}
                            onClick={() => {
                                onToolClick(DrawState.OcrDetect);
                            }}
                        />

                        {/* 保存截图 */}
                        <ToolButton
                            componentKey={KeyEventKey.SaveTool}
                            icon={<SaveIcon style={{ fontSize: '1em' }} />}
                            disableOnDrawing
                            drawState={DrawState.Save}
                            onClick={() => {
                                onSave();
                            }}
                        />

                        <div className="draw-toolbar-splitter" />

                        {/* 取消截图 */}
                        <ToolButton
                            componentKey={KeyEventKey.CancelTool}
                            icon={
                                <CloseOutlined
                                    style={{ fontSize: '0.83em', color: token.colorError }}
                                />
                            }
                            confirmTip={<FormattedMessage id="draw.cancel.tip1" />}
                            disableOnDrawing
                            drawState={DrawState.Cancel}
                            onClick={() => {
                                onCancel();
                            }}
                        />

                        {/* 复制截图 */}
                        <ToolButton
                            componentKey={KeyEventKey.CopyTool}
                            icon={
                                <CopyOutlined
                                    style={{ fontSize: '0.92em', color: token.colorPrimary }}
                                />
                            }
                            disableOnDrawing
                            drawState={DrawState.Copy}
                            onClick={() => {
                                onCopyToClipboard();
                            }}
                        />
                    </Flex>
                </div>

                <BlurTool />
            </DrawToolbarContext.Provider>
            <style jsx>{`
                .draw-toolbar-container {
                    user-select: none;
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

                .draw-toolbar {
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

                :global(.drag-button) {
                    color: ${token.colorTextQuaternary};
                    cursor: move;
                }

                .draw-toolbar :global(.draw-toolbar-drag) {
                    font-size: 18px;
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
