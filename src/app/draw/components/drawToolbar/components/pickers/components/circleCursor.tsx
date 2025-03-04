import { DrawContext } from '@/app/draw/page';
import React, { useContext, useEffect } from 'react';

const CircleCursorCore: React.FC<{
    radius: number;
}> = ({ radius }) => {
    const { circleCursorRef } = useContext(DrawContext);

    useEffect(() => {
        const cursor = circleCursorRef.current;
        if (!cursor) {
            return;
        }

        let x = 0;
        let y = 0;
        let rendered = true;
        const onMouseMove = (e: MouseEvent) => {
            if (!rendered) {
                return;
            }

            x = e.clientX;
            y = e.clientY;

            rendered = false;
            requestAnimationFrame(() => {
                rendered = true;

                cursor.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
            });
        };

        document.addEventListener('mousemove', onMouseMove);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            cursor.style.width = '0px';
            cursor.style.height = '0px';
        };
    }, [circleCursorRef]);

    useEffect(() => {
        const circleCursor = circleCursorRef.current;
        if (!circleCursor) {
            return;
        }
        circleCursor.style.width = `${radius * 2}px`;
        circleCursor.style.height = `${radius * 2}px`;
    }, [circleCursorRef, radius]);

    return null;
};

export const CircleCursor = React.memo(CircleCursorCore);
