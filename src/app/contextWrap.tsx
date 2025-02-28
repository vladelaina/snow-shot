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

export enum AppSettingsGroup {
    Common = 'common',
    Cache = 'cache',
}

export enum AppSettingsLanguage {
    ZHHans = 'zh-Hans',
    ZHHant = 'zh-Hant',
    EN = 'en',
}

type AppSettingsData = {
    [AppSettingsGroup.Common]: {
        darkMode: boolean;
        language: AppSettingsLanguage;
        /** 浏览器语言，用于自动切换语言 */
        browserLanguage: string;
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
        debounce?: boolean,
    ) => void;
};

export const AppSettingsContext = createContext<AppSettingsContextType>({
    isDefaultData: true,
    ...defaultAppSettingsData,
    updateAppSettings: () => {},
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
        (group: AppSettingsGroup, data: AppSettingsData[typeof group]) => {
            writeTextFile(getFileName(group), JSON.stringify(data), {
                baseDir: BaseDirectory.AppConfig,
            });
        },
        [],
    );
    const writeAppSettingsDebounce = useCallback(
        (group: AppSettingsGroup, data: AppSettingsData[typeof group]) => {
            _.debounce(() => writeAppSettings(group, data), 1000)();
        },
        [writeAppSettings],
    );

    const updateAppSettings = useCallback(
        async (
            group: AppSettingsGroup,
            val: Partial<AppSettingsData[typeof group]> | string,
            debounce?: boolean,
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
            } else {
                return;
            }

            setAppSettings(group, settings);
            if (debounce) {
                writeAppSettingsDebounce(group, settings);
            } else {
                writeAppSettings(group, settings);
            }
        },
        [writeAppSettings, writeAppSettingsDebounce, setAppSettings],
    );

    useEffect(() => {
        (async () => {
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

                if (!isFileExists) {
                    updateAppSettings(group, defaultAppSettingsData[group]);
                    return;
                }

                const content = await readTextFile(getFileName(group), {
                    baseDir: BaseDirectory.AppConfig,
                });

                updateAppSettings(group, content);
            }

            setIsDefaultData(false);
        })();
    }, [updateAppSettings]);

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
