'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ConfigProvider, theme } from 'antd';
import _ from 'lodash';
import zhCN from 'antd/es/locale/zh_CN';
import zhTW from 'antd/es/locale/zh_TW';
import enUS from 'antd/es/locale/en_US';
import { IntlProvider } from 'react-intl';
import { messages } from '@/messages/map';
import { ImageBuffer } from '@/commands';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export enum AppSettingsGroup {
    Common = 'common',
    Cache = 'cache',
    Screenshot = 'screenshot',
}

export enum AppSettingsLanguage {
    ZHHans = 'zh-Hans',
    ZHHant = 'zh-Hant',
    EN = 'en',
}

export enum AppSettingsControlNode {
    Circle = 'circle',
    Polyline = 'polyline',
}

export type AppSettingsData = {
    [AppSettingsGroup.Common]: {
        darkMode: boolean;
        language: AppSettingsLanguage;
        /** 浏览器语言，用于自动切换语言 */
        browserLanguage: string;
    };
    [AppSettingsGroup.Screenshot]: {
        /** 选区控件样式 */
        controlNode: AppSettingsControlNode;
    };
    [AppSettingsGroup.Cache]: {
        menuCollapsed: boolean;
    };
};

const defaultAppSettingsData: AppSettingsData = {
    [AppSettingsGroup.Common]: {
        darkMode: false,
        language: AppSettingsLanguage.ZHHans,
        browserLanguage: '',
    },
    [AppSettingsGroup.Screenshot]: {
        controlNode: AppSettingsControlNode.Polyline,
    },
    [AppSettingsGroup.Cache]: {
        menuCollapsed: false,
    },
};

export type AppSettingsContextType = AppSettingsData & {
    /** 是否时未加载的默认数据 */
    isDefaultData: boolean;
    updateAppSettings: (
        group: AppSettingsGroup,
        settings: Partial<AppSettingsData[typeof group]>,
        debounce: boolean,
        /** 是否保存到文件 */
        saveToFile: boolean,
        /** 是否同步到所有窗口 */
        syncAllWindow: boolean,
    ) => void;
    reloadAppSettings: () => void;
};

export const AppSettingsContext = createContext<AppSettingsContextType>({
    isDefaultData: true,
    ...defaultAppSettingsData,
    updateAppSettings: () => {},
    reloadAppSettings: () => {},
});

export type ScreenshotContextType = {
    imageBuffer: ImageBuffer | undefined;
    setImageBuffer: (imageBuffer: ImageBuffer) => void;
};

export const ScreenshotContext = createContext<ScreenshotContextType>({
    imageBuffer: undefined,
    setImageBuffer: () => {},
});

const configDir = 'configs';
const getFileName = (group: AppSettingsGroup) => {
    return `${configDir}\\${group}.json`;
};

export const ContextWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDefaultData, setIsDefaultData] = useState(true);
    const [appSettings, _setAppSettings] = useState<AppSettingsData>(defaultAppSettingsData);
    const appSettingsRef = useRef<AppSettingsData>(defaultAppSettingsData);
    useEffect(() => {
        appSettingsRef.current = appSettings;
    }, [appSettings]);

    const setAppSettings = useCallback(
        (group: AppSettingsGroup, settings: AppSettingsData[typeof group]) => {
            _setAppSettings((prev) => ({
                ...prev,
                [group]: settings,
            }));
        },
        [_setAppSettings],
    );

    const writeAppSettings = useCallback(
        async (
            group: AppSettingsGroup,
            data: AppSettingsData[typeof group],
            syncAllWindow: boolean,
        ) => {
            await writeTextFile(getFileName(group), JSON.stringify(data), {
                baseDir: BaseDirectory.AppConfig,
            });
            if (syncAllWindow) {
                emit('reload-app-settings');
            }
        },
        [],
    );
    const writeAppSettingsDebounce = useCallback(
        (group: AppSettingsGroup, data: AppSettingsData[typeof group], syncAllWindow: boolean) => {
            _.debounce(() => writeAppSettings(group, data, syncAllWindow), 1000)();
        },
        [writeAppSettings],
    );

    const updateAppSettings = useCallback(
        async (
            group: AppSettingsGroup,
            val: Partial<AppSettingsData[typeof group]> | string,
            debounce: boolean,
            /** 是否保存到文件 */
            saveToFile: boolean,
            /** 是否同步到所有窗口 */
            syncAllWindow: boolean,
        ) => {
            let newSettings: Partial<AppSettingsData[typeof group]>;
            if (typeof val === 'string') {
                try {
                    const parsedObj = JSON.parse(val);
                    newSettings =
                        typeof parsedObj === 'object' ? parsedObj : defaultAppSettingsData[group];
                } catch {
                    newSettings = defaultAppSettingsData[group];
                }
            } else {
                newSettings = val;
            }

            let settings: AppSettingsData[typeof group];
            if (group === AppSettingsGroup.Common) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as AppSettingsData[typeof group];
                settings = {
                    darkMode:
                        typeof newSettings?.darkMode === 'boolean'
                            ? newSettings.darkMode
                            : (prevSettings?.darkMode ?? false),
                    language: (() => {
                        switch (newSettings?.language) {
                            case 'zh-Hans':
                                return AppSettingsLanguage.ZHHans;
                            case 'zh-Hant':
                                return AppSettingsLanguage.ZHHant;
                            case 'en':
                                return AppSettingsLanguage.EN;
                            default:
                                return prevSettings?.language ?? AppSettingsLanguage.EN;
                        }
                    })(),
                    browserLanguage:
                        typeof newSettings?.browserLanguage === 'string'
                            ? newSettings.browserLanguage
                            : (prevSettings?.browserLanguage ?? ''),
                };
            } else if (group === AppSettingsGroup.Cache) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as AppSettingsData[typeof group];
                settings = {
                    menuCollapsed:
                        typeof newSettings?.menuCollapsed === 'boolean'
                            ? newSettings.menuCollapsed
                            : (prevSettings?.menuCollapsed ?? false),
                };
            } else if (group === AppSettingsGroup.Screenshot) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as AppSettingsData[typeof group];

                let controlNode = prevSettings.controlNode;
                if (newSettings?.controlNode) {
                    if (newSettings.controlNode === AppSettingsControlNode.Circle) {
                        controlNode = AppSettingsControlNode.Circle;
                    } else if (newSettings.controlNode === AppSettingsControlNode.Polyline) {
                        controlNode = AppSettingsControlNode.Polyline;
                    }
                }
                settings = {
                    controlNode,
                };
            } else {
                return;
            }

            setAppSettings(group, settings);
            if (saveToFile) {
                if (debounce) {
                    writeAppSettingsDebounce(group, settings, syncAllWindow);
                } else {
                    writeAppSettings(group, settings, syncAllWindow);
                }
            }
        },
        [writeAppSettings, writeAppSettingsDebounce, setAppSettings],
    );

    const reloadAppSettings = useCallback(async () => {
        const groups = Object.keys(defaultAppSettingsData).filter(
            (group) => group in defaultAppSettingsData,
        );

        for (const group of groups as AppSettingsGroup[]) {
            // 启动时验证下目录是否存在
            let isDirExists = await exists('', {
                baseDir: BaseDirectory.AppConfig,
            });
            if (!isDirExists) {
                await mkdir('', {
                    baseDir: BaseDirectory.AppConfig,
                });
            }

            isDirExists = await exists(configDir, {
                baseDir: BaseDirectory.AppConfig,
            });
            if (!isDirExists) {
                await mkdir(configDir, {
                    baseDir: BaseDirectory.AppConfig,
                });
            }

            const isFileExists = await exists(getFileName(group), {
                baseDir: BaseDirectory.AppConfig,
            });

            const saveToFile = getCurrentWindow().label === 'main';

            if (!isFileExists) {
                updateAppSettings(group, defaultAppSettingsData[group], false, saveToFile, false);
                return;
            }

            const content = await readTextFile(getFileName(group), {
                baseDir: BaseDirectory.AppConfig,
            });

            updateAppSettings(group, content, false, saveToFile, false);
        }

        setIsDefaultData(false);
    }, [updateAppSettings]);
    useEffect(() => {
        reloadAppSettings();
    }, [reloadAppSettings]);

    const [, antdLocale] = useMemo(() => {
        const language = appSettings[AppSettingsGroup.Common].language;
        switch (language) {
            case AppSettingsLanguage.ZHHans:
                return ['zh-CN', zhCN];
            case AppSettingsLanguage.ZHHant:
                return ['zh-TW', zhTW];
            default:
                return ['en-US', enUS];
        }
    }, [appSettings]);

    const [imageBuffer, setImageBuffer] = useState<ImageBuffer | undefined>(undefined);
    return (
        <AppSettingsContext.Provider
            value={{
                isDefaultData,
                ...appSettings,
                updateAppSettings,
                reloadAppSettings,
            }}
        >
            <ConfigProvider
                theme={{
                    algorithm: appSettings[AppSettingsGroup.Common].darkMode
                        ? theme.darkAlgorithm
                        : theme.defaultAlgorithm,
                }}
                locale={antdLocale}
            >
                <IntlProvider
                    locale={appSettings[AppSettingsGroup.Common].language}
                    messages={messages[appSettings[AppSettingsGroup.Common].language]}
                >
                    <ScreenshotContext.Provider value={{ imageBuffer, setImageBuffer }}>
                        {children}
                    </ScreenshotContext.Provider>
                </IntlProvider>
            </ConfigProvider>
        </AppSettingsContext.Provider>
    );
};
