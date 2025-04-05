import { DrawContext } from '@/app/draw/types';
import { ToolbarTip } from '@/components/toolbarTip';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { MousePosition } from '@/utils/mousePosition';
import { HolderOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import React, {
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { FormattedMessage } from 'react-intl';
import { DrawToolbarContext } from '../../extra';
import { ElementRect } from '@/commands';
import { dragRect } from './extra';

export type DragButtonActionType = {
    setEnable: (enable: boolean) => void;
    onDraggingChange: (dragging: boolean) => void;
};

export const DragButton: React.FC<{
    enableSubToolbar: boolean;
    actionRef: React.RefObject<DragButtonActionType | undefined>;
}> = ({ enableSubToolbar, actionRef }) => {
    const enableRef = useRef(false);

    const enableSubToolbarRef = useRef(enableSubToolbar);
    useEffect(() => {
        enableSubToolbarRef.current = enableSubToolbar;
    }, [enableSubToolbar]);

    const [hideTooltip, setHideTooltip] = useState(false);
    const { selectLayerActionRef, imageBufferRef } = useContext(DrawContext);
    const { drawToolbarRef, drawSubToolbarRef, setDragging, draggingRef } =
        useContext(DrawToolbarContext);
    const { token } = theme.useToken();

    // 保存 toolbar 位置
    const mouseOriginPositionRef = useRef<MousePosition>(new MousePosition(0, 0));
    const mouseCurrentPositionRef = useRef<MousePosition>(new MousePosition(0, 0));
    const toolbarCurrentRectRef = useRef<ElementRect>({
        min_x: 0,
        min_y: 0,
        max_x: 0,
        max_y: 0,
    });
    const toolbarPreviousRectRef = useRef<ElementRect>(undefined);
    const updateDrawToolbarStyle = useCallback(() => {
        const drawToolbar = drawToolbarRef.current;
        const drawSubToolbar = drawSubToolbarRef.current;
        if (!drawToolbar || !drawSubToolbar) {
            return;
        }

        const imageBuffer = imageBufferRef.current;
        if (!imageBuffer) {
            return;
        }

        const selectedRect = selectLayerActionRef.current?.getSelectRect();
        if (!selectedRect) {
            return;
        }

        const marginHeight = token.marginXXS;
        const { clientWidth: toolbarWidth, clientHeight: toolbarHeight } = drawToolbar;
        const isSubToolbarVisible = enableSubToolbarRef.current;

        const subToolbarWidth = isSubToolbarVisible ? drawSubToolbar.clientWidth : 0;
        const subToolbarHeight = isSubToolbarVisible
            ? drawSubToolbar.clientHeight + marginHeight
            : 0;

        const scaleFactor = imageBuffer.monitorScaleFactor || 1;
        const baseOffsetX = selectedRect.max_x / scaleFactor - toolbarWidth;
        const baseOffsetY = selectedRect.max_y / scaleFactor + marginHeight;

        const totalHeight = toolbarHeight + subToolbarHeight;
        const subToolbarWidthDiff = isSubToolbarVisible ? subToolbarWidth - toolbarWidth : 0;

        const extraLeftSpace = Math.max(0, subToolbarWidthDiff);

        const viewportWidth = Math.max(document.body.clientWidth, toolbarWidth + extraLeftSpace);
        const viewportHeight = Math.max(document.body.clientHeight, totalHeight);

        const dragRes = dragRect(
            {
                min_x: 0,
                min_y: 0,
                max_x: toolbarWidth,
                max_y: toolbarHeight,
            },
            mouseOriginPositionRef.current,
            mouseCurrentPositionRef.current,
            toolbarPreviousRectRef.current,
            {
                min_x: extraLeftSpace - baseOffsetX,
                min_y: 0 - baseOffsetY,
                max_x: viewportWidth - baseOffsetX,
                max_y: viewportHeight - baseOffsetY - (totalHeight - toolbarHeight),
            },
        );

        toolbarCurrentRectRef.current = dragRes.rect;
        mouseOriginPositionRef.current = dragRes.newOriginPosition;

        const translateX = baseOffsetX + toolbarCurrentRectRef.current.min_x;
        const translateY = baseOffsetY + toolbarCurrentRectRef.current.min_y;
        drawToolbar.style.transform = `translate(${translateX}px, ${translateY}px)`;
    }, [drawSubToolbarRef, drawToolbarRef, imageBufferRef, selectLayerActionRef, token.marginXXS]);
    const updateDrawToolbarStyleRender = useCallbackRender(updateDrawToolbarStyle);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
            setDragging(true);
            mouseOriginPositionRef.current = new MousePosition(e.clientX, e.clientY);
            mouseCurrentPositionRef.current = new MousePosition(e.clientX, e.clientY);
            toolbarPreviousRectRef.current = toolbarCurrentRectRef.current;
        },
        [setDragging],
    );

    // 处理鼠标释放事件
    const handleMouseUp = useCallback(() => {
        if (!draggingRef.current) {
            return;
        }

        setDragging(false);
    }, [draggingRef, setDragging]);

    // 处理鼠标移动事件
    const handleMouseMove = useCallback(
        (mousePosition: MousePosition) => {
            if (!draggingRef.current) return;

            mouseCurrentPositionRef.current = mousePosition;
            updateDrawToolbarStyleRender();
        },
        [draggingRef, updateDrawToolbarStyleRender],
    );

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const mousePosition = new MousePosition(e.clientX, e.clientY);
            handleMouseMove(mousePosition);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const onEnableChange = useCallback(
        (enable: boolean) => {
            enableRef.current = enable;

            if (enable) {
                drawToolbarRef.current!.style.opacity = '1';
                updateDrawToolbarStyleRender();
            } else {
                drawToolbarRef.current!.style.opacity = '0';
                drawSubToolbarRef.current!.style.opacity = '0';
                toolbarCurrentRectRef.current = {
                    min_x: 0,
                    min_y: 0,
                    max_x: 0,
                    max_y: 0,
                };
                toolbarPreviousRectRef.current = undefined;
                mouseOriginPositionRef.current = new MousePosition(0, 0);
                mouseCurrentPositionRef.current = new MousePosition(0, 0);
            }
        },
        [drawSubToolbarRef, drawToolbarRef, updateDrawToolbarStyleRender],
    );

    const setEnable = useCallback(
        (enable: boolean) => {
            if (enableRef.current === enable) {
                return;
            }

            onEnableChange(enable);
        },
        [onEnableChange],
    );

    useEffect(() => {
        drawSubToolbarRef.current!.style.opacity = enableSubToolbar ? '1' : '0';
        updateDrawToolbarStyleRender();
    }, [drawSubToolbarRef, enableSubToolbar, updateDrawToolbarStyleRender]);

    const onDraggingChange = useCallback((dragging: boolean) => {
        setHideTooltip(dragging);
    }, []);

    useImperativeHandle(actionRef, () => {
        return {
            setEnable,
            onDraggingChange,
        };
    }, [setEnable, onDraggingChange]);

    return (
        <ToolbarTip
            destroyTooltipOnHide
            title={hideTooltip ? '' : <FormattedMessage id="draw.drag" />}
        >
            <div className="draw-toolbar-drag" onMouseDown={handleMouseDown}>
                <HolderOutlined />
            </div>
        </ToolbarTip>
    );
};
