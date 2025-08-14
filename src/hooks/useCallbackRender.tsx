import { useCallback, useRef } from 'react';

export function useCallbackRender<
    T extends (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>,
>(action: T) {
    const renderingRef = useRef(false);
    const callbackContextRef = useRef<{
        params: Parameters<T>;
    }>(undefined);

    const callback = useCallback(
        (...args: Parameters<T>) => {
            (async () => {
                callbackContextRef.current = {
                    params: args,
                };
                if (renderingRef.current) {
                    return;
                }
                renderingRef.current = true;

                const params = callbackContextRef.current.params;
                callbackContextRef.current = undefined;
                await Promise.all([
                    action(...params),
                    new Promise((resolve) => requestAnimationFrame(resolve)),
                ]);

                renderingRef.current = false;
            })();
        },
        [action],
    );

    return callback;
}

export function useCallbackRenderSlow<
    T extends (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>,
>(action: T) {
    const renderingRef = useRef(false);
    const callbackContextRef = useRef<{
        params: Parameters<T>;
    }>(undefined);

    const callback = useCallback(
        (...args: Parameters<T>) => {
            (async () => {
                callbackContextRef.current = {
                    params: args,
                };
                if (renderingRef.current) {
                    return;
                }
                renderingRef.current = true;

                const params = callbackContextRef.current.params;
                callbackContextRef.current = undefined;
                await Promise.all([
                    action(...params),
                    new Promise((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(resolve)),
                    ),
                ]);
                renderingRef.current = false;
            })();
        },
        [action],
    );

    return callback;
}
