import { useCallback, useRef } from 'react';

export function useCallbackRender<T extends (...args: Parameters<T>) => ReturnType<T>>(action: T) {
    const renderedRef = useRef(true);

    const callback = useCallback(
        (...args: Parameters<T>) => {
            if (!renderedRef.current) return;

            renderedRef.current = false;
            requestAnimationFrame(() => {
                renderedRef.current = true;
                action(...args);
            });
        },
        [action],
    );

    return callback;
}
