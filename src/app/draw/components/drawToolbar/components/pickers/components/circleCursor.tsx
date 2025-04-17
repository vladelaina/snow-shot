import { DrawContext } from '@/app/draw/types';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useCallbackRender } from '@/hooks/useCallbackRender';

export type CircleCursorActionType = {
    setRadius: (radius: number) => void;
    setEnable: (enable: boolean) => void;
};

const CircleCursorCore: React.FC<{
    actionRef: React.RefObject<CircleCursorActionType | undefined>;
}> = ({ actionRef }) => {
    const { circleCursorRef, drawLayerActionRef } = useContext(DrawContext);

    const [enable, setEnable] = useState(false);

    const onMouseMove = (cursor: HTMLDivElement, clientX: number, clientY: number) => {
        if (!cursor) {
            return;
        }

        cursor.style.transform = `translate(calc(${clientX}px - 50%), calc(${clientY}px - 50%))`;
    };
    const onMouseMoveRender = useCallbackRender(onMouseMove);

    useEffect(() => {
        if (!enable) {
            return;
        }

        const cursor = circleCursorRef.current;
        if (!cursor) {
            return;
        }

        const layerAction = drawLayerActionRef.current;
        if (!layerAction) {
            return;
        }

        layerAction.changeCursor('none');

        const handleMouseMove = (e: MouseEvent) => {
            onMouseMoveRender(cursor, e.clientX, e.clientY);
        };
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            cursor.style.width = '0px';
            cursor.style.height = '0px';
        };
    }, [enable, drawLayerActionRef, circleCursorRef, onMouseMoveRender]);

    const setRadius = useCallback(
        (radius: number) => {
            const circleCursor = circleCursorRef.current;
            if (!circleCursor) {
                return;
            }
            circleCursor.style.width = `${radius * 2}px`;
            circleCursor.style.height = `${radius * 2}px`;
        },
        [circleCursorRef],
    );

    useEffect(() => {
        actionRef.current = {
            setRadius,
            setEnable,
        };
    }, [actionRef, setEnable, setRadius]);

    return null;
};

export const CircleCursor = React.memo(CircleCursorCore);
