'use client';

import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawState } from '../../types';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Flex, theme } from 'antd';
import { FormattedMessage, useIntl } from 'react-intl';
import {
    CloseOutlined,
    DragOutlined,
    HighlightOutlined,
    HolderOutlined,
    RedoOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import {
    ArrowIcon,
    ArrowSelectIcon,
    CircleIcon,
    EraserIcon,
    MosaicIcon,
    PenIcon,
    RectIcon,
    TextIcon,
} from '@/components/icons';
import { PenTool } from './components/penTool';
import { EllipseTool, RectTool } from './components/shapeTool';
import React from 'react';
import { DrawContext } from '../../context';
import { MosaicTool } from './components/mosaicTool/mosaicTool';
import { TextTool } from './components/textTool';
import { HighlightTool } from './components/highlightTool';
import { ArrowTool } from './components/arrowTool';
import { EraserTool } from './components/eraserTool';
import { KeyEventKey, KeyEventWrap } from './components/keyEventWrap';
import { ToolbarTip } from '../toolbarTip';

export type DrawToolbarProps = {
    step: CaptureStep;
    drawState: DrawState;
    setDrawState: (val: DrawState | ((prev: DrawState) => DrawState)) => void;
    onCancel: () => void;
};

export const getButtonTypeByState = (active: boolean) => {
    return active ? 'primary' : 'text';
};

const DrawToolbarCore: React.FC<DrawToolbarProps> = ({
    step,
    drawState,
    setDrawState,
    onCancel,
}) => {
    const intl = useIntl();

    const { fabricRef, maskRectRef, maskRectClipPathRef, canvasHistoryRef } =
        useContext(DrawContext);

    const { token } = theme.useToken();

    const drawToolbarRef = useRef<HTMLDivElement>(null);
    const drawSubToolbarRef = useRef<HTMLDivElement>(null);

    // 保存 toolbar 位置
    const draggedLeftRef = useRef(0);
    const draggedTopRef = useRef(0);
    const lastDraggedLeftRef = useRef(0);
    const lastDraggedTopRef = useRef(0);
    const drawToolbarStyleRef = useRef({
        left: 0,
        top: 0,
    });
    const drawSubToolbarStyleRef = useRef({
        left: 0,
        top: 0,
        opacity: '0',
    });
    const renderedRef = useRef(true);
    const updateDrawToolbarStyle = useCallback(
        (hideSubToolbar: boolean = true) => {
            if (
                !drawToolbarRef.current ||
                !drawSubToolbarRef.current ||
                !maskRectClipPathRef.current
            ) {
                return;
            }

            const maskRectClipPath = maskRectClipPathRef.current;
            const drawToolbar = drawToolbarRef.current;
            const drawSubToolbar = drawSubToolbarRef.current;
            const maskRect = maskRectRef.current;

            let left = draggedLeftRef.current;
            let top = draggedTopRef.current;

            // 工具栏位于画布的右下角
            const rectBottomRightPointLeft = maskRectClipPath
                ? maskRectClipPath.left + maskRectClipPath.width
                : 0;
            const rectBottomRightPointTop = maskRectClipPath
                ? maskRectClipPath.top + maskRectClipPath.height
                : 0;

            const toolbarWidth = drawToolbar.clientWidth;
            const toolbarHeight = drawToolbar.clientHeight;
            const subToolbarWidth = drawSubToolbar.clientWidth;
            const subToolbarHeight = drawSubToolbar.clientHeight;

            const toolbarLeft = rectBottomRightPointLeft - toolbarWidth;
            const toolbarTop = rectBottomRightPointTop + token.marginXS;

            left += toolbarLeft;
            top += toolbarTop;

            // 如果此时工具栏超出画布，则调整位置
            const minLeft = Math.max(0, subToolbarWidth - toolbarWidth);
            const maxLeft = maskRect ? 0 + maskRect.width - toolbarWidth : Number.MAX_SAFE_INTEGER;
            const minTop = 0;
            const maxTop = maskRect ? 0 + maskRect.height - toolbarHeight : Number.MAX_SAFE_INTEGER;

            if (left < minLeft) {
                left = minLeft;
            } else if (left > maxLeft) {
                left = maxLeft;
            }

            if (top < minTop) {
                top = minTop;
            } else if (top > maxTop) {
                top = maxTop;
            }

            // 计算子工具栏位置
            const subToolbarLeft = left + (toolbarWidth - subToolbarWidth);
            let subToolbarTop = top + toolbarHeight + token.marginXS;

            if (subToolbarTop + subToolbarHeight > maxTop) {
                subToolbarTop = top - toolbarHeight - token.marginXS;
            }

            // 无变化则不更新拖动距离
            if (left === drawToolbarStyleRef.current.left) {
                draggedLeftRef.current = lastDraggedLeftRef.current;
            }
            if (top === drawToolbarStyleRef.current.top) {
                draggedTopRef.current = lastDraggedTopRef.current;
            }

            drawToolbarStyleRef.current = {
                left,
                top,
            };
            drawSubToolbarStyleRef.current = {
                left: subToolbarLeft,
                top: subToolbarTop,
                opacity: hideSubToolbar ? '0' : '1',
            };

            if (!renderedRef.current) {
                return;
            }

            renderedRef.current = false;
            drawToolbar.style.willChange = 'transform';
            drawSubToolbar.style.willChange = 'transform, opacity';
            requestAnimationFrame(() => {
                renderedRef.current = true;
                drawToolbar.style.transform = `translate(${drawToolbarStyleRef.current.left}px, ${drawToolbarStyleRef.current.top}px)`;
                drawSubToolbar.style.transform = `translate(${drawSubToolbarStyleRef.current.left}px, ${drawSubToolbarStyleRef.current.top}px)`;
                drawSubToolbar.style.opacity = drawSubToolbarStyleRef.current.opacity;
            });
        },
        [maskRectClipPathRef, maskRectRef, token.marginXS],
    );

    // 追踪拖动状态
    const draggingRef = useRef(false);
    const [dragging, _setDragging] = useState(false);
    const setDragging = useCallback(
        (dragging: boolean) => {
            draggingRef.current = dragging;
            _setDragging(dragging);
        },
        [_setDragging],
    );

    const lastX = useRef(0);
    const lastY = useRef(0);

    // 处理鼠标移动事件
    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!draggingRef.current) return;

            // 计算新的位置，只记录增量
            lastDraggedLeftRef.current = draggedLeftRef.current;
            lastDraggedTopRef.current = draggedTopRef.current;
            draggedLeftRef.current += event.clientX - lastX.current;
            draggedTopRef.current += event.clientY - lastY.current;
            lastX.current = event.clientX;
            lastY.current = event.clientY;
            updateDrawToolbarStyle();
        },
        [updateDrawToolbarStyle],
    );

    // 处理鼠标释放事件
    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, [setDragging]);

    // 处理鼠标按下事件
    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            setDragging(true);
            lastX.current = event.clientX;
            lastY.current = event.clientY;
        },
        [setDragging],
    );

    useEffect(() => {
        // 监听鼠标移动和释放事件
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const visible = useMemo(() => {
        if (step !== CaptureStep.Draw) {
            return false;
        }

        if (drawState === DrawState.Resize) {
            return false;
        }

        updateDrawToolbarStyle();
        return true;
    }, [step, drawState, updateDrawToolbarStyle]);

    useEffect(() => {
        draggedLeftRef.current = 0;
        draggedTopRef.current = 0;
        lastDraggedLeftRef.current = 0;
        lastDraggedTopRef.current = 0;
        if (drawToolbarRef.current) {
            drawToolbarRef.current.style.transform = `unset`;
        }
        if (drawSubToolbarRef.current) {
            drawSubToolbarRef.current.style.transform = `unset`;
        }
    }, [visible]);

    useEffect(() => {
        if (dragging) {
            return;
        }

        let hideSubToolbar = true;
        if (
            drawState === DrawState.Pen ||
            drawState === DrawState.Rect ||
            drawState === DrawState.Ellipse ||
            drawState === DrawState.Mosaic ||
            drawState === DrawState.Eraser ||
            drawState === DrawState.Highlight ||
            drawState === DrawState.Text ||
            drawState === DrawState.Arrow
        ) {
            hideSubToolbar = false;
        }

        updateDrawToolbarStyle(hideSubToolbar);
    }, [drawState, updateDrawToolbarStyle, dragging]);

    useEffect(() => {
        if (!maskRectRef.current || !fabricRef.current) {
            return;
        }

        fabricRef.current.set({
            selection: drawState === DrawState.Select,
        });
        fabricRef.current.discardActiveObject();
        fabricRef.current.renderAll();
    }, [drawState, fabricRef, maskRectRef]);

    const [canRedo, setCanRedo] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    useEffect(() => {
        if (!visible) {
            return;
        }

        const canvas = fabricRef.current;

        if (!canvas) {
            return;
        }

        setCanUndo(canvasHistoryRef.current?.canUndo() ?? false);
        setCanRedo(canvasHistoryRef.current?.canRedo() ?? false);

        const historyUpdatedUnlisten = canvas.on('history:updated', () => {
            const canvasHistory = canvasHistoryRef.current;
            if (!canvasHistory) {
                return;
            }

            setCanUndo(canvasHistory.canUndo());
            setCanRedo(canvasHistory.canRedo());
        });

        const historyUndoUnlisten = canvas.on('history:undo', () => {
            const canvasHistory = canvasHistoryRef.current;
            if (!canvasHistory) {
                return;
            }

            setCanUndo(canvasHistory.canUndo());
            setCanRedo(canvasHistory.canRedo());
        });
        const historyRedoUnlisten = canvas.on('history:redo', () => {
            const canvasHistory = canvasHistoryRef.current;
            if (!canvasHistory) {
                return;
            }

            setCanUndo(canvasHistory.canUndo());
            setCanRedo(canvasHistory.canRedo());
        });

        return () => {
            historyUpdatedUnlisten();
            historyUndoUnlisten();
            historyRedoUnlisten();
        };
    }, [canvasHistoryRef, fabricRef, visible]);

    const onToolClick = useCallback(
        (tool: DrawState) => {
            setDrawState((prev) => {
                if (prev === tool) {
                    return DrawState.Idle;
                }

                return tool;
            });
        },
        [setDrawState],
    );
    return (
        <div
            className="draw-toolbar-container"
            style={{
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? 'auto' : 'none',
            }}
        >
            <div className="draw-toolbar" ref={drawToolbarRef}>
                <Flex align="center" gap={token.paddingXS}>
                    {/* 拖动按钮 */}
                    <ToolbarTip
                        destroyTooltipOnHide
                        title={dragging ? '' : <FormattedMessage id="draw.drag" />}
                    >
                        <div className="draw-toolbar-drag" onMouseDown={handleMouseDown}>
                            <HolderOutlined />
                        </div>
                    </ToolbarTip>

                    {/* 移动物体 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.MoveTool}
                        enable={visible}
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
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.SelectTool}
                        enable={visible}
                    >
                        <Button
                            icon={<ArrowSelectIcon />}
                            type={getButtonTypeByState(drawState === DrawState.Select)}
                            onClick={() => {
                                if (!maskRectRef.current) {
                                    return;
                                }

                                onToolClick(DrawState.Select);
                            }}
                        />
                    </KeyEventWrap>

                    <div className="draw-toolbar-splitter" />

                    {/* 矩形 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.RectTool}
                        enable={visible}
                    >
                        <Button
                            icon={<RectIcon style={{ fontSize: '0.9em' }} />}
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
                        enable={visible}
                    >
                        <Button
                            icon={<CircleIcon style={{ fontSize: '0.9em' }} />}
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
                        enable={visible}
                    >
                        <Button
                            icon={<ArrowIcon style={{ fontSize: '0.83em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Arrow)}
                            onClick={() => {
                                onToolClick(DrawState.Arrow);
                            }}
                        />
                    </KeyEventWrap>

                    {/* 画笔 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.PenTool}
                        enable={visible}
                    >
                        <Button
                            icon={<PenIcon style={{ fontSize: '1.08em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Pen)}
                            onClick={() => {
                                onToolClick(DrawState.Pen);
                            }}
                        />
                    </KeyEventWrap>

                    {/* 高亮 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.HighlightTool}
                        enable={visible}
                    >
                        <Button
                            icon={<HighlightOutlined />}
                            type={getButtonTypeByState(drawState === DrawState.Highlight)}
                            onClick={() => {
                                onToolClick(DrawState.Highlight);
                            }}
                        />
                    </KeyEventWrap>

                    {/* 文字 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.TextTool}
                        enable={visible}
                    >
                        <Button
                            icon={<TextIcon style={{ fontSize: '1.08em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Text)}
                            onClick={() => {
                                onToolClick(DrawState.Text);
                            }}
                        />
                    </KeyEventWrap>

                    {/* 马赛克 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.MosaicTool}
                        enable={visible}
                    >
                        <Button
                            icon={<MosaicIcon />}
                            type={getButtonTypeByState(drawState === DrawState.Mosaic)}
                            onClick={() => {
                                onToolClick(DrawState.Mosaic);
                            }}
                        />
                    </KeyEventWrap>

                    {/* 橡皮擦 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.EraserTool}
                        enable={visible}
                    >
                        <Button
                            icon={<EraserIcon style={{ fontSize: '0.9em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Eraser)}
                            onClick={() => {
                                onToolClick(DrawState.Eraser);
                            }}
                        />
                    </KeyEventWrap>

                    <div className="draw-toolbar-splitter" />

                    {/* 撤销 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.UndoTool}
                        enable={visible}
                    >
                        <Button
                            disabled={!canUndo}
                            icon={<UndoOutlined />}
                            type={getButtonTypeByState(false)}
                            onClick={() => {
                                canvasHistoryRef.current?.undo();
                            }}
                        />
                    </KeyEventWrap>

                    {/* 重做 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.RedoTool}
                        enable={visible}
                    >
                        <Button
                            disabled={!canRedo}
                            icon={<RedoOutlined />}
                            type={getButtonTypeByState(false)}
                            onClick={() => {
                                canvasHistoryRef.current?.redo();
                            }}
                        />
                    </KeyEventWrap>

                    <div className="draw-toolbar-splitter" />

                    {/* 取消截图 */}
                    <KeyEventWrap
                        onKeyDownEventPropName="onClick"
                        componentKey={KeyEventKey.CancelTool}
                        confirmTip={<>{intl.formatMessage({ id: 'draw.cancel.tip1' })}</>}
                        enable={visible}
                    >
                        <Button
                            icon={
                                <CloseOutlined
                                    style={{ fontSize: '0.83em', color: token.colorError }}
                                />
                            }
                            type="text"
                            onClick={() => {
                                onCancel();
                            }}
                        />
                    </KeyEventWrap>
                </Flex>
            </div>
            <div className="draw-subtoolbar" ref={drawSubToolbarRef}>
                <Flex align="center" gap={token.paddingXS}>
                    {drawState === DrawState.Pen && <PenTool />}
                    {drawState === DrawState.Arrow && <ArrowTool />}
                    {drawState === DrawState.Rect && <RectTool />}
                    {drawState === DrawState.Ellipse && <EllipseTool />}
                    {drawState === DrawState.Mosaic && <MosaicTool />}
                    {drawState === DrawState.Eraser && <EraserTool />}
                    {drawState === DrawState.Highlight && <HighlightTool />}
                    {drawState === DrawState.Text && <TextTool />}
                </Flex>
            </div>
            <style jsx>{`
                .draw-toolbar-container {
                    position: absolute;
                    z-index: ${zIndexs.Draw_Toolbar};
                    top: 0;
                    left: 0;
                }

                .draw-toolbar,
                .draw-subtoolbar {
                    position: absolute;
                    padding: ${token.paddingXXS}px ${token.paddingSM}px;
                    box-sizing: border-box;
                    background-color: ${token.colorBgContainer};
                    border-radius: ${token.borderRadiusLG}px;
                    cursor: default; /* 防止非拖动区域也变成可拖动状态 */
                    color: ${token.colorText};
                    box-shadow: 0 0 3px 0px ${token.colorPrimaryHover};
                }

                .draw-subtoolbar {
                    opacity: 0;
                }

                .draw-toolbar-drag {
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

export const DrawToolbar = React.memo(DrawToolbarCore);
