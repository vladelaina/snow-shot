import { zIndexs } from '@/utils/zIndex';
import { CaptureStep, DrawState } from '../../types';
import { RefObject, useCallback, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Button, Flex, theme, Tooltip } from 'antd';
import { useIntl } from 'react-intl';
import { CloseOutlined, DragOutlined, HolderOutlined } from '@ant-design/icons';

export type DrawToolbarProps = {
    step: CaptureStep;
    drawState: DrawState;
    setDrawState: (drawState: DrawState) => void;
    maskRectClipPathRef: RefObject<fabric.Rect<
        Partial<fabric.RectProps>,
        fabric.SerializedRectProps,
        fabric.ObjectEvents
    > | null>;
    maskRectRef: RefObject<fabric.Rect<
        Partial<fabric.RectProps>,
        fabric.SerializedRectProps,
        fabric.ObjectEvents
    > | null>;
    onCancel: () => void;
};

export const DrawToolbar: React.FC<DrawToolbarProps> = ({
    step,
    drawState,
    setDrawState,
    maskRectClipPathRef,
    maskRectRef,
    onCancel,
}) => {
    const intl = useIntl();
    const { token } = theme.useToken();

    const drawToolbarRef = useRef<HTMLDivElement>(null);

    // 保存 toolbar 位置
    const draggedLeftRef = useRef(0);
    const draggedTopRef = useRef(0);

    const [drawToolbarStyle, setDrawToolbarStyle] = useState({
        left: 0,
        top: 0,
    });
    const updateDrawToolbarStyle = useCallback(() => {
        if (!drawToolbarRef.current) {
            return;
        }

        const maskRectClipPath = maskRectClipPathRef.current;
        const drawToolbar = drawToolbarRef.current;
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

        const toolbarLeft = rectBottomRightPointLeft - toolbarWidth;
        const toolbarTop = rectBottomRightPointTop + token.paddingXXS;

        left += toolbarLeft;
        top += toolbarTop;

        // 如果此时工具栏超出画布，则调整位置
        const minLeft = 0;
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

        setDrawToolbarStyle({
            left,
            top,
        });
    }, [maskRectClipPathRef, maskRectRef, token.paddingXXS]);

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

        // 移除监听事件
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, setDragging]);

    // 处理鼠标按下事件
    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            setDragging(true);
            lastX.current = event.clientX;
            lastY.current = event.clientY;

            // 监听鼠标移动和释放事件
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [handleMouseMove, handleMouseUp, setDragging],
    );

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
    return (
        <div
            className="draw-toolbar-container"
            style={{
                opacity: visible ? 1 : 0,
            }}
        >
            <div className="draw-toolbar" style={drawToolbarStyle} ref={drawToolbarRef}>
                <Flex align="center" gap={token.paddingXXS}>
                    {/* 拖动按钮 */}
                    <Tooltip title={dragging ? '' : intl.formatMessage({ id: 'draw.drag' })}>
                        <div className="draw-toolbar-drag" onMouseDown={handleMouseDown}>
                            <HolderOutlined />
                        </div>
                    </Tooltip>

                    {/* 移动物体 */}
                    <Tooltip title={intl.formatMessage({ id: 'draw.move' })}>
                        <Button
                            icon={<DragOutlined />}
                            type="text"
                            onClick={() => {
                                // 设为 idle 状态即可
                                setDrawState(DrawState.Idle);
                            }}
                        />
                    </Tooltip>

                    <div className="draw-toolbar-splitter" />

                    {/* 取消截图 */}
                    <Tooltip title={intl.formatMessage({ id: 'draw.cancel' })}>
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
            <style jsx>{`
                .draw-toolbar-container {
                    position: absolute;
                    z-index: ${zIndexs.Draw_Toolbar};
                    top: 0;
                    left: 0;
                }

                .draw-toolbar {
                    position: absolute;
                    padding: ${token.paddingXXS}px ${token.paddingSM}px;
                    box-sizing: border-box;
                    background-color: ${token.colorBgContainer};
                    border-radius: ${token.borderRadiusLG}px;
                    cursor: default; /* 防止非拖动区域也变成可拖动状态 */
                    color: ${token.colorText};
                }

                .draw-toolbar-drag {
                    font-size: 21px;
                    cursor: move;
                    margin-right: 3px;
                }

                .draw-toolbar :global(.ant-btn) :global(.ant-btn-icon) {
                    font-size: 24px;
                }

                .draw-toolbar :global(.ant-btn-icon) {
                    display: flex;
                    align-items: center;
                }

                .draw-toolbar-splitter {
                    width: 1px;
                    height: 0.83em;
                    background-color: ${token.colorBorder};
                    margin: 0 ${token.marginXS}px;
                }
            `}</style>
        </div>
    );
};
