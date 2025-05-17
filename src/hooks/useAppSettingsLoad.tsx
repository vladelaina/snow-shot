import {
    AppSettingsData,
    AppSettingsLoadingPublisher,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStateSubscriber } from './useStateSubscriber';
import { debounce } from 'es-toolkit';

/**
 * 应用设置加载完毕后执行
 * @param onLoad 加载回调
 */
export function useAppSettingsLoad(
    onLoad: (settings: AppSettingsData, preSettings?: AppSettingsData) => void,
    subscribe: boolean = false,
) {
    const preSettingsRef = useRef<AppSettingsData | undefined>(undefined);

    const invokeOnLoad = useMemo(
        () =>
            debounce((settings: AppSettingsData) => {
                onLoad(settings, preSettingsRef.current);
                preSettingsRef.current = settings;
            }, 0),
        [onLoad],
    );

    const [getAppSettingsLoading] = useStateSubscriber(AppSettingsLoadingPublisher, undefined);
    const [getAppSettings] = useStateSubscriber(
        AppSettingsPublisher,
        useCallback(
            (settings: AppSettingsData) => {
                if (getAppSettingsLoading()) {
                    return;
                }

                if (!subscribe) {
                    return;
                }

                invokeOnLoad(settings);
            },
            [getAppSettingsLoading, invokeOnLoad, subscribe],
        ),
    );

    useStateSubscriber(
        AppSettingsLoadingPublisher,
        useCallback(
            (loading: boolean) => {
                if (loading) {
                    return;
                }

                invokeOnLoad(getAppSettings());
            },
            [getAppSettings, invokeOnLoad],
        ),
    );

    useEffect(() => {
        if (getAppSettingsLoading()) {
            return;
        }

        invokeOnLoad(getAppSettings());
    }, [getAppSettings, getAppSettingsLoading, invokeOnLoad]);
}
