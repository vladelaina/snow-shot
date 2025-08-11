import { getPlatform } from './index';

/**
 * 格式化快捷键
 * @param key 快捷键
 * @returns 格式化后的快捷键
 */
export const formatKey = (key: string | undefined | null) => {
    if (!key) {
        return '';
    }

    switch (getPlatform()) {
        case 'macos':
            return key
                .replace('Meta', 'Command')
                .replace('Alt', 'Option')
                .replace('Ctrl', 'Control');
        default:
            return key.replace('Super', 'Win');
    }
};
