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
import Color from 'color';
import {
    defaultFillShapePickerValue,
    FillShapePickerValue,
} from './draw/components/drawToolbar/components/pickers/fillShapePicker';
import {
    defaultLockWidthHeightValue,
    LockWidthHeightValue,
} from './draw/components/drawToolbar/components/pickers/lockWidthHeight';
import {
    defaultRadiusPickerValue,
    RadiusPickerValue,
} from './draw/components/drawToolbar/components/pickers/radiusPicker';
import {
    defaultLineColorPickerValue,
    LineColorPickerValue,
} from './draw/components/drawToolbar/components/pickers/lineColorPicker';
import {
    defaultLineWidthPickerValue,
    LineWidthPickerValue,
} from './draw/components/drawToolbar/components/pickers/lineWidthPicker';
import {
    defaultSliderPickerValue,
    SliderPickerValue,
} from './draw/components/drawToolbar/components/pickers/sliderPicker';
import {
    defaultEnableBlurValue,
    EnableBlurValue,
} from './draw/components/drawToolbar/components/pickers/enableBlur';

export enum AppSettingsGroup {
    Common = 'common',
    Cache = 'cache',
    Screenshot = 'screenshot',
    DrawToolbarPicker = 'drawToolbarPicker',
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
    [AppSettingsGroup.DrawToolbarPicker]: {
        fillShapePicker: Record<string, FillShapePickerValue>;
        lockWidthHeight: Record<string, LockWidthHeightValue>;
        radiusPicker: Record<string, RadiusPickerValue>;
        lineColorPicker: Record<string, LineColorPickerValue>;
        lineWidthPicker: Record<string, LineWidthPickerValue>;
        sliderPicker: Record<string, SliderPickerValue>;
        enableBlur: Record<string, EnableBlurValue>;
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
    [AppSettingsGroup.DrawToolbarPicker]: {
        fillShapePicker: {},
        lockWidthHeight: {},
        radiusPicker: {},
        lineColorPicker: {},
        lineWidthPicker: {},
        sliderPicker: {},
        enableBlur: {},
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
        /** 是否忽略状态更新 */
        ignoreState?: boolean,
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
    setImageBuffer: (imageBuffer: ImageBuffer | undefined) => void;
};

const configDir = 'configs';
const getFileName = (group: AppSettingsGroup) => {
    return `${configDir}\\${group}.json`;
};

export const ContextWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDefaultData, setIsDefaultData] = useState(true);
    const [appSettings, setAppSettings] = useState<AppSettingsData>(defaultAppSettingsData);
    const appSettingsRef = useRef<AppSettingsData>(defaultAppSettingsData);
    useEffect(() => {
        appSettingsRef.current = appSettings;
    }, [appSettings]);

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
        (
            group: AppSettingsGroup,
            val: Partial<AppSettingsData[typeof group]> | string,
            debounce: boolean,
            /** 是否保存到文件 */
            saveToFile: boolean,
            /** 是否同步到所有窗口 */
            syncAllWindow: boolean,
            /** 是否忽略状态更新 */
            ignoreState?: boolean,
        ): AppSettingsData[typeof group] => {
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
            } else if (group === AppSettingsGroup.DrawToolbarPicker) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as AppSettingsData[typeof group];

                const fillShapePickerSettings = newSettings.fillShapePicker ?? {};
                const lockWidthHeightSettings = newSettings.lockWidthHeight ?? {};
                const radiusPickerSettings = newSettings.radiusPicker ?? {};
                const lineColorPickerSettings = newSettings.lineColorPicker ?? {};
                const lineWidthPickerSettings = newSettings.lineWidthPicker ?? {};
                const sliderPickerSettings = newSettings.sliderPicker ?? {};
                const enableBlurSettings = newSettings.enableBlur ?? {};

                Object.keys(fillShapePickerSettings).forEach((key) => {
                    fillShapePickerSettings[key] = {
                        fill:
                            typeof fillShapePickerSettings[key]?.fill === 'boolean'
                                ? fillShapePickerSettings[key]?.fill
                                : (prevSettings.fillShapePicker[key]?.fill ??
                                  defaultFillShapePickerValue.fill),
                    };
                });

                Object.keys(lockWidthHeightSettings).forEach((key) => {
                    lockWidthHeightSettings[key] = {
                        lock:
                            typeof lockWidthHeightSettings[key]?.lock === 'boolean'
                                ? lockWidthHeightSettings[key]?.lock
                                : (prevSettings.lockWidthHeight[key]?.lock ??
                                  defaultLockWidthHeightValue.lock),
                    };
                });

                Object.keys(radiusPickerSettings).forEach((key) => {
                    radiusPickerSettings[key] = {
                        radius:
                            typeof radiusPickerSettings[key]?.radius === 'number'
                                ? radiusPickerSettings[key]?.radius
                                : (prevSettings.radiusPicker[key]?.radius ??
                                  defaultRadiusPickerValue.radius),
                    };
                });

                Object.keys(lineColorPickerSettings).forEach((key) => {
                    const prevLineColor =
                        prevSettings.lineColorPicker[key]?.color ??
                        defaultLineColorPickerValue.color;
                    let lineColor =
                        typeof lineColorPickerSettings[key]?.color === 'string'
                            ? lineColorPickerSettings[key]?.color
                            : prevLineColor;

                    try {
                        lineColor = Color(lineColor).hexa();
                    } catch {
                        lineColor = prevLineColor;
                    }

                    lineColorPickerSettings[key] = {
                        color: lineColor,
                    };
                });

                Object.keys(lineWidthPickerSettings).forEach((key) => {
                    lineWidthPickerSettings[key] = {
                        width:
                            typeof lineWidthPickerSettings[key]?.width === 'number'
                                ? lineWidthPickerSettings[key]?.width
                                : (prevSettings.lineWidthPicker[key]?.width ??
                                  defaultLineWidthPickerValue.width),
                    };
                });

                Object.keys(sliderPickerSettings).forEach((key) => {
                    sliderPickerSettings[key] = {
                        value: sliderPickerSettings[key]?.value ?? defaultSliderPickerValue.value,
                    };
                });

                Object.keys(enableBlurSettings).forEach((key) => {
                    enableBlurSettings[key] = {
                        blur:
                            typeof enableBlurSettings[key]?.blur === 'boolean'
                                ? enableBlurSettings[key].blur
                                : (prevSettings.enableBlur[key]?.blur ??
                                  defaultEnableBlurValue.blur),
                    };
                });

                settings = {
                    fillShapePicker: {
                        ...prevSettings.fillShapePicker,
                        ...fillShapePickerSettings,
                    },
                    lockWidthHeight: {
                        ...prevSettings.lockWidthHeight,
                        ...lockWidthHeightSettings,
                    },
                    radiusPicker: {
                        ...prevSettings.radiusPicker,
                        ...radiusPickerSettings,
                    },
                    lineColorPicker: {
                        ...prevSettings.lineColorPicker,
                        ...lineColorPickerSettings,
                    },
                    lineWidthPicker: {
                        ...prevSettings.lineWidthPicker,
                        ...lineWidthPickerSettings,
                    },
                    sliderPicker: {
                        ...prevSettings.sliderPicker,
                        ...sliderPickerSettings,
                    },
                    enableBlur: {
                        ...prevSettings.enableBlur,
                        ...enableBlurSettings,
                    },
                };
            } else {
                return defaultAppSettingsData[group];
            }

            if (!ignoreState) {
                setAppSettings((prev) => {
                    return {
                        ...prev,
                        [group]: settings,
                    };
                });
            }

            if (saveToFile) {
                if (debounce) {
                    writeAppSettingsDebounce(group, settings, syncAllWindow);
                } else {
                    writeAppSettings(group, settings, syncAllWindow);
                }
            }

            return settings;
        },
        [writeAppSettings, writeAppSettingsDebounce, setAppSettings],
    );

    const reloadAppSettings = useCallback(async () => {
        const groups = Object.keys(defaultAppSettingsData).filter(
            (group) => group in defaultAppSettingsData,
        );

        const settings: AppSettingsData = {} as AppSettingsData;
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
                settings[group] = updateAppSettings(
                    group,
                    defaultAppSettingsData[group],
                    false,
                    saveToFile,
                    false,
                    true,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ) as any;
                return;
            }

            const content = await readTextFile(getFileName(group), {
                baseDir: BaseDirectory.AppConfig,
            });

            settings[group] = updateAppSettings(
                group,
                content,
                false,
                saveToFile,
                false,
                true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }

        setAppSettings((prev) => {
            if (_.isEqual(prev, settings)) {
                return prev;
            }

            return settings;
        });
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
                    {children}
                </IntlProvider>
            </ConfigProvider>
        </AppSettingsContext.Provider>
    );
};
