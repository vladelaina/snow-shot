'use client';

import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawState } from '../../types';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Flex, theme, Tooltip } from 'antd';
import { FormattedMessage } from 'react-intl';
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
import { PenToolbar } from './components/penToolbar';
import { EllipseToolbar, RectToolbar } from './components/shapeToolbar';
import React from 'react';
import { DrawContext } from '../../page';
import { EraserToolbar, MosaicToolbar } from './components/mosaicToolbar';
import { TextToolbar } from './components/textToolbar';
import { HighlightToolbar } from './components/highlightToolbar';
import { ArrowToolbar } from './components/arrowToolbar';

export type DrawToolbarProps = {
    step: CaptureStep;
    drawState: DrawState;
    setDrawState: (drawState: DrawState) => void;
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
            if (!drawToolbarRef.current || !drawSubToolbarRef.current) {
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

    return (
        <div
            className="draw-toolbar-container"
            style={{
                opacity: visible ? 1 : 0,
            }}
        >
            <div className="draw-toolbar" ref={drawToolbarRef}>
                <Flex align="center" gap={token.paddingXS}>
                    {/* 拖动按钮 */}
                    <Tooltip title={dragging ? '' : <FormattedMessage id="draw.drag" />}>
                        <div className="draw-toolbar-drag" onMouseDown={handleMouseDown}>
                            <HolderOutlined />
                        </div>
                    </Tooltip>

                    {/* 移动物体 */}
                    <Tooltip title={<FormattedMessage id="draw.move" />}>
                        <Button
                            icon={<DragOutlined />}
                            type={getButtonTypeByState(drawState === DrawState.Idle)}
                            onClick={() => {
                                // 设为 idle 状态即可
                                setDrawState(DrawState.Idle);
                            }}
                        />
                    </Tooltip>

                    {/* 选择物体 */}
                    <Tooltip title={<FormattedMessage id="draw.select" />}>
                        <Button
                            icon={<ArrowSelectIcon />}
                            type={getButtonTypeByState(drawState === DrawState.Select)}
                            onClick={() => {
                                if (!maskRectRef.current) {
                                    return;
                                }

                                setDrawState(DrawState.Select);
                            }}
                        />
                    </Tooltip>

                    <div className="draw-toolbar-splitter" />

                    {/* 矩形 */}
                    <Tooltip title={<FormattedMessage id="draw.rect" />}>
                        <Button
                            icon={<RectIcon style={{ fontSize: '0.9em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Rect)}
                            onClick={() => {
                                setDrawState(DrawState.Rect);
                            }}
                        />
                    </Tooltip>

                    {/* 椭圆 */}
                    <Tooltip title={<FormattedMessage id="draw.ellipse" />}>
                        <Button
                            icon={<CircleIcon style={{ fontSize: '0.9em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Ellipse)}
                            onClick={() => {
                                setDrawState(DrawState.Ellipse);
                            }}
                        />
                    </Tooltip>

                    {/* 箭头 */}
                    <Tooltip title={<FormattedMessage id="draw.arrow" />}>
                        <Button
                            icon={<ArrowIcon style={{ fontSize: '0.83em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Arrow)}
                            onClick={() => {
                                setDrawState(DrawState.Arrow);
                            }}
                        />
                    </Tooltip>

                    {/* 画笔 */}
                    <Tooltip title={<FormattedMessage id="draw.pen" />}>
                        <Button
                            icon={<PenIcon style={{ fontSize: '1.08em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Pen)}
                            onClick={() => {
                                setDrawState(DrawState.Pen);
                            }}
                        />
                    </Tooltip>

                    {/* 高亮 */}
                    <Tooltip title={<FormattedMessage id="draw.highlight" />}>
                        <Button
                            icon={<HighlightOutlined />}
                            type={getButtonTypeByState(drawState === DrawState.Highlight)}
                            onClick={() => {
                                setDrawState(DrawState.Highlight);
                            }}
                        />
                    </Tooltip>

                    {/* 马赛克 */}
                    <Tooltip title={<FormattedMessage id="draw.mosaic" />}>
                        <Button
                            icon={<MosaicIcon />}
                            type={getButtonTypeByState(drawState === DrawState.Mosaic)}
                            onClick={() => {
                                setDrawState(DrawState.Mosaic);
                            }}
                        />
                    </Tooltip>

                    {/* 文字 */}
                    <Tooltip title={<FormattedMessage id="draw.text" />}>
                        <Button
                            icon={<TextIcon style={{ fontSize: '1.08em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Text)}
                            onClick={() => {
                                setDrawState(DrawState.Text);
                            }}
                        />
                    </Tooltip>

                    {/* 橡皮擦 */}
                    <Tooltip title={<FormattedMessage id="draw.eraser" />}>
                        <Button
                            icon={<EraserIcon style={{ fontSize: '0.9em' }} />}
                            type={getButtonTypeByState(drawState === DrawState.Eraser)}
                            onClick={() => {
                                setDrawState(DrawState.Eraser);
                            }}
                        />
                    </Tooltip>

                    <div className="draw-toolbar-splitter" />

                    {/* 撤销 */}
                    <Tooltip title={<FormattedMessage id="draw.undo" />}>
                        <Button
                            disabled={!canUndo}
                            icon={<UndoOutlined />}
                            type={getButtonTypeByState(false)}
                            onClick={() => {
                                canvasHistoryRef.current?.undo();
                            }}
                        />
                    </Tooltip>

                    {/* 重做 */}
                    <Tooltip title={<FormattedMessage id="draw.redo" />}>
                        <Button
                            disabled={!canRedo}
                            icon={<RedoOutlined />}
                            type={getButtonTypeByState(false)}
                            onClick={() => {
                                canvasHistoryRef.current?.redo();
                            }}
                        />
                    </Tooltip>

                    <div className="draw-toolbar-splitter" />

                    {/* 取消截图 */}
                    <Tooltip title={<FormattedMessage id="draw.cancel" />}>
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
                    </Tooltip>
                </Flex>
            </div>
            <div className="draw-subtoolbar" ref={drawSubToolbarRef}>
                <Flex align="center" gap={token.paddingXS}>
                    {drawState === DrawState.Pen && <PenToolbar />}
                    {drawState === DrawState.Arrow && <ArrowToolbar />}
                    {drawState === DrawState.Rect && <RectToolbar />}
                    {drawState === DrawState.Ellipse && <EllipseToolbar />}
                    {drawState === DrawState.Mosaic && <MosaicToolbar />}
                    {drawState === DrawState.Eraser && <EraserToolbar />}
                    {drawState === DrawState.Highlight && <HighlightToolbar />}
                    {drawState === DrawState.Text && <TextToolbar />}
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
