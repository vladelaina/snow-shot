import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

function listenDevicePixelRatio(callback: (ratio: number) => void) {
    const media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

    function handleChange() {
        callback(window.devicePixelRatio);
    }

    media.addEventListener('change', handleChange);

    return function stopListen() {
        media.removeEventListener('change', handleChange);
    };
}

/**
 * 获取文本缩放比例
 */
export const useTextScaleFactor = () => {
    const [textScaleFactor, setTextScaleFactor] = useState(1);

    const initTextScaleFactor = async (devicePixelRatio: number) => {
        const scaleFactor = await getCurrentWindow().scaleFactor();
        console.log(devicePixelRatio, scaleFactor);
        setTextScaleFactor(devicePixelRatio / scaleFactor);
    };

    useEffect(() => {
        initTextScaleFactor(window.devicePixelRatio);
        const stopListen = listenDevicePixelRatio((ratio) => {
            initTextScaleFactor(ratio);
        });
        return () => {
            stopListen();
        };
    }, []);

    return textScaleFactor;
};
