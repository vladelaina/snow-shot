import { useCallback, useRef } from 'react';

export function useCallbackRender<
    T extends (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>,
>(action: T) {
    const renderedRef = useRef(true);
    const lastArgsRef = useRef<Parameters<T>>(undefined as unknown as Parameters<T>);

    const callback = useCallback(
        (...args: Parameters<T>) => {
            lastArgsRef.current = args;
            if (!renderedRef.current) return;

            renderedRef.current = false;
            requestAnimationFrame(async () => {
                await action(...lastArgsRef.current);
                renderedRef.current = true;
            });
        },
        [action],
    );

    return callback;
}

export function useCallbackRenderSlow<
    T extends (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>,
>(action: T) {
    const renderedRef = useRef(true);
    const lastArgsRef = useRef<Parameters<T>>(undefined as unknown as Parameters<T>);

    const callback = useCallback(
        (...args: Parameters<T>) => {
            lastArgsRef.current = args;
            if (!renderedRef.current) return;

            renderedRef.current = false;
            requestAnimationFrame(() => {
                requestAnimationFrame(async () => {
                    await action(...lastArgsRef.current);
                    renderedRef.current = true;
                });
            });
        },
        [action],
    );

    return callback;
}
