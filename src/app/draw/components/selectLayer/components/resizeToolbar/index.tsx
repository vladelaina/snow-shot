import { MousePosition } from '@/utils/mousePosition';
import { DrawContext } from '@/app/draw/types';
import { zIndexs } from '@/utils/zIndex';
import { Flex, theme } from 'antd';
import React, { useCallback, useContext, useImperativeHandle, useRef, useState } from 'react';
import { updateElementPosition } from '../../../drawToolbar/components/dragButton/extra';
import { ElementRect } from '@/commands';
import { CaptureEvent, CaptureEventPublisher } from '@/app/draw/extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';

export type ResizeToolbarActionType = {
    updateStyle: (selectedRect: ElementRect) => void;
    setSize: (width: number, height: number) => void;
};

export const ResizeToolbar: React.FC<{
    actionRef: React.RefObject<ResizeToolbarActionType | undefined>;
}> = ({ actionRef }) => {
    const { token } = theme.useToken();

    const resizeToolbarRef = useRef<HTMLDivElement>(null);
    const { imageBufferRef } = useContext(DrawContext);

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    const updateStyle = useCallback(
        (selectedRect: ElementRect) => {
            const resizeToolbar = resizeToolbarRef.current;
            if (!resizeToolbar) {
                return;
            }

            const imageBuffer = imageBufferRef.current;
            if (!imageBuffer) {
                return;
            }

            const dragRes = updateElementPosition(
                resizeToolbar,
                0,
                0,
                new MousePosition(0, resizeToolbar.clientHeight + token.marginXXS),
                new MousePosition(
                    selectedRect.min_x / imageBuffer.monitorScaleFactor,
                    selectedRect.min_y / imageBuffer.monitorScaleFactor,
                ),
                undefined,
            );
            resizeToolbar.style.transform = `translate(${dragRes.rect.min_x}px, ${dragRes.rect.min_y}px)`;
        },
        [imageBufferRef, token.marginXXS],
    );

    const setEnable = useCallback((enable: boolean) => {
        const resizeToolbar = resizeToolbarRef.current;
        if (!resizeToolbar) {
            return;
        }

        if (enable) {
            resizeToolbar.style.opacity = '1';
        } else {
            resizeToolbar.style.opacity = '0';
        }
    }, []);

    useStateSubscriber(CaptureEventPublisher, (event) => {
        if (!event) {
            return;
        }

        if (event.event === CaptureEvent.onCaptureReady) {
            setEnable(true);
        } else if (event.event === CaptureEvent.onCaptureFinish) {
            setEnable(false);
        }
    });

    useImperativeHandle(actionRef, () => {
        return {
            updateStyle,
            setSize: (width: number, height: number) => {
                setWidth(width);
                setHeight(height);
            },
        };
    }, [updateStyle]);

    return (
        <div className="draw-resize-toolbar" ref={resizeToolbarRef}>
            <Flex align="center">{`${width} x ${height}`}</Flex>
            <style jsx>{`
                .draw-resize-toolbar {
                    box-shadow: 0 0 1px 0px ${token.colorPrimaryHover};
                    border-radius: ${token.borderRadius}px;
                    position: absolute;
                    top: 0;
                    left: 0;
                    padding: ${2}px ${token.paddingXS}px;
                    background-color: ${token.colorBgMask};
                    z-index: ${zIndexs.Draw_ResizeToolbar};
                    color: ${token.colorWhite};
                    pointer-events: none;
                    opacity: 0;
                }

                .draw-resize-toolbar:hover {
                    opacity: 0 !important;
                }
            `}</style>
        </div>
    );
};
