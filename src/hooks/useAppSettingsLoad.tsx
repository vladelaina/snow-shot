import { AppSettingsContext, AppSettingsContextType } from '@/app/contextWrap';
import { useContext, useEffect, useRef } from 'react';

/**
 * 应用设置加载完毕后执行
 * @param onLoad 加载回调
 */
export function useAppSettingsLoad(onLoad: (settings: AppSettingsContextType) => void) {
    const settings = useContext(AppSettingsContext);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (hasLoaded.current || settings.isDefaultData) {
            return;
        }

        onLoad(settings);
        hasLoaded.current = true;
    }, [settings, onLoad]);
}
