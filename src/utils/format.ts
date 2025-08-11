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

    let result = key;
    switch (getPlatform()) {
        case 'macos':
            result = result
                .replace('Meta', 'Command')
                .replace('Alt', 'Option')
                .replace('Ctrl', 'Control')
                .replace('Super', 'Win');
        default:
            result = result.replace('Super', 'Win');
    }

    return result.replace('Period', '.').replace('Comma', ',');
};
