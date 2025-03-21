'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ConfigProvider, theme } from 'antd';
import _, { trim } from 'lodash';
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
} from './draw/components/drawToolbar/components/pickers/lockWidthHeightPicker';
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
} from './draw/components/drawToolbar/components/pickers/enableBlurPicker';
import {
    defaultDrawRectValue,
    DrawRectValue,
} from './draw/components/drawToolbar/components/pickers/drawRectPicker';
import {
    defaultFontSizePickerValue,
    FontSizePickerValue,
} from './draw/components/drawToolbar/components/pickers/fontSizePicker';
import {
    defaultEnableBoldValue,
    EnableBoldValue,
} from './draw/components/drawToolbar/components/pickers/enableBoldPicker';
import {
    defaultEnableItalicValue,
    EnableItalicValue,
} from './draw/components/drawToolbar/components/pickers/enableItalicPicker';
import {
    defaultEnableUnderlineValue,
    EnableUnderlineValue,
} from './draw/components/drawToolbar/components/pickers/enableUnderlinePicker';
import {
    defaultEnableStrikethroughValue,
    EnableStrikethroughValue,
} from './draw/components/drawToolbar/components/pickers/enableStrikethroughPicker';
import {
    defaultFontFamilyPickerValue,
    FontFamilyPickerValue,
} from './draw/components/drawToolbar/components/pickers/fontFamilyPicker';
import {
    ArrowConfigValue,
    defaultArrowConfigValue,
} from './draw/components/drawToolbar/components/pickers/arrowConfigPicker';
import {
    defaultEnableRadiusValue,
    EnableRadiusValue,
} from './draw/components/drawToolbar/components/pickers/enableRadiusPicker';
import {
    defaultKeyEventSettings,
    KeyEventKey,
    KeyEventValue,
} from './draw/components/drawToolbar/components/keyEventWrap';

export enum AppSettingsGroup {
    Common = 'common',
    Cache = 'cache',
    Screenshot = 'screenshot',
    DrawToolbarPicker = 'drawToolbarPicker',
    DrawToolbarKeyEvent = 'drawToolbarKeyEvent',
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
        /** 选取窗口子元素 */
        findChildrenElements: boolean;
        /** 性能模式 */
        performanceMode: boolean;
    };
    [AppSettingsGroup.Cache]: {
        menuCollapsed: boolean;
    };
    [AppSettingsGroup.DrawToolbarPicker]: {
        fillShapePicker: Record<string, FillShapePickerValue>;
        lockWidthHeightPicker: Record<string, LockWidthHeightValue>;
        radiusPicker: Record<string, RadiusPickerValue>;
        lineColorPicker: Record<string, LineColorPickerValue>;
        lineWidthPicker: Record<string, LineWidthPickerValue>;
        sliderPicker: Record<string, SliderPickerValue>;
        enableBlurPicker: Record<string, EnableBlurValue>;
        drawRectPicker: Record<string, DrawRectValue>;
        fontSizePicker: Record<string, FontSizePickerValue>;
        enableBoldPicker: Record<string, EnableBoldValue>;
        enableItalicPicker: Record<string, EnableItalicValue>;
        enableUnderlinePicker: Record<string, EnableUnderlineValue>;
        enableStrikethroughPicker: Record<string, EnableStrikethroughValue>;
        fontFamilyPicker: Record<string, FontFamilyPickerValue>;
        arrowConfigPicker: Record<string, ArrowConfigValue>;
        enableRadiusPicker: Record<string, EnableRadiusValue>;
    };
    [AppSettingsGroup.DrawToolbarKeyEvent]: Record<KeyEventKey, KeyEventValue>;
};

export const defaultAppSettingsData: AppSettingsData = {
    [AppSettingsGroup.Common]: {
        darkMode: false,
        language: AppSettingsLanguage.ZHHans,
        browserLanguage: '',
    },
    [AppSettingsGroup.Screenshot]: {
        controlNode: AppSettingsControlNode.Polyline,
        findChildrenElements: true,
        performanceMode: false,
    },
    [AppSettingsGroup.Cache]: {
        menuCollapsed: false,
    },
    [AppSettingsGroup.DrawToolbarPicker]: {
        fillShapePicker: {},
        lockWidthHeightPicker: {},
        radiusPicker: {},
        lineColorPicker: {},
        lineWidthPicker: {},
        sliderPicker: {},
        enableBlurPicker: {},
        drawRectPicker: {},
        fontSizePicker: {},
        enableBoldPicker: {},
        enableItalicPicker: {},
        enableUnderlinePicker: {},
        enableStrikethroughPicker: {},
        fontFamilyPicker: {},
        arrowConfigPicker: {},
        enableRadiusPicker: {},
    },
    [AppSettingsGroup.DrawToolbarKeyEvent]: defaultKeyEventSettings,
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
    const [appSettings, _setAppSettings] = useState<AppSettingsData>(defaultAppSettingsData);
    const appSettingsRef = useRef<AppSettingsData>(defaultAppSettingsData);
    const setAppSettings = useCallback<React.Dispatch<React.SetStateAction<AppSettingsData>>>(
        (newSettings) => {
            if (typeof newSettings === 'function') {
                newSettings = newSettings(appSettingsRef.current);
            }

            appSettingsRef.current = newSettings;
            _setAppSettings(newSettings);
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
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;
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
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;
                settings = {
                    menuCollapsed:
                        typeof newSettings?.menuCollapsed === 'boolean'
                            ? newSettings.menuCollapsed
                            : (prevSettings?.menuCollapsed ?? false),
                };
            } else if (group === AppSettingsGroup.Screenshot) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;

                let controlNode = prevSettings?.controlNode ?? AppSettingsControlNode.Polyline;
                if (newSettings?.controlNode) {
                    if (newSettings.controlNode === AppSettingsControlNode.Circle) {
                        controlNode = AppSettingsControlNode.Circle;
                    } else if (newSettings.controlNode === AppSettingsControlNode.Polyline) {
                        controlNode = AppSettingsControlNode.Polyline;
                    }
                }

                const findChildrenElements =
                    typeof newSettings?.findChildrenElements === 'boolean'
                        ? newSettings.findChildrenElements
                        : (prevSettings?.findChildrenElements ??
                          defaultAppSettingsData[group].findChildrenElements);

                const performanceMode =
                    typeof newSettings?.performanceMode === 'boolean'
                        ? newSettings.performanceMode
                        : (prevSettings?.performanceMode ??
                          defaultAppSettingsData[group].performanceMode);

                settings = {
                    controlNode,
                    findChildrenElements,
                    performanceMode,
                };
            } else if (group === AppSettingsGroup.DrawToolbarPicker) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;

                const fillShapePickerSettings = newSettings.fillShapePicker ?? {};
                const lockWidthHeightPickerSettings = newSettings.lockWidthHeightPicker ?? {};
                const radiusPickerSettings = newSettings.radiusPicker ?? {};
                const lineColorPickerSettings = newSettings.lineColorPicker ?? {};
                const lineWidthPickerSettings = newSettings.lineWidthPicker ?? {};
                const sliderPickerSettings = newSettings.sliderPicker ?? {};
                const enableBlurPickerSettings = newSettings.enableBlurPicker ?? {};
                const drawRectPickerSettings = newSettings.drawRectPicker ?? {};
                const fontSizePickerSettings = newSettings.fontSizePicker ?? {};
                const enableBoldPickerSettings = newSettings.enableBoldPicker ?? {};
                const enableItalicPickerSettings = newSettings.enableItalicPicker ?? {};
                const enableUnderlinePickerSettings = newSettings.enableUnderlinePicker ?? {};
                const enableStrikethroughPickerSettings =
                    newSettings.enableStrikethroughPicker ?? {};
                const fontFamilyPickerSettings = newSettings.fontFamilyPicker ?? {};
                const arrowConfigPickerSettings = newSettings.arrowConfigPicker ?? {};
                const enableRadiusPickerSettings = newSettings.enableRadiusPicker ?? {};

                Object.keys(fillShapePickerSettings).forEach((key) => {
                    fillShapePickerSettings[key] = {
                        fill:
                            typeof fillShapePickerSettings[key]?.fill === 'boolean'
                                ? fillShapePickerSettings[key]?.fill
                                : (prevSettings?.fillShapePicker[key]?.fill ??
                                  defaultFillShapePickerValue.fill),
                    };
                });

                Object.keys(lockWidthHeightPickerSettings).forEach((key) => {
                    lockWidthHeightPickerSettings[key] = {
                        lock:
                            typeof lockWidthHeightPickerSettings[key]?.lock === 'boolean'
                                ? lockWidthHeightPickerSettings[key]?.lock
                                : (prevSettings?.lockWidthHeightPicker[key]?.lock ??
                                  defaultLockWidthHeightValue.lock),
                    };
                });

                Object.keys(radiusPickerSettings).forEach((key) => {
                    radiusPickerSettings[key] = {
                        radius:
                            typeof radiusPickerSettings[key]?.radius === 'number'
                                ? radiusPickerSettings[key]?.radius
                                : (prevSettings?.radiusPicker[key]?.radius ??
                                  defaultRadiusPickerValue.radius),
                    };
                });

                Object.keys(lineColorPickerSettings).forEach((key) => {
                    const prevLineColor =
                        prevSettings?.lineColorPicker[key]?.color ??
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
                                : (prevSettings?.lineWidthPicker[key]?.width ??
                                  defaultLineWidthPickerValue.width),
                    };
                });

                Object.keys(sliderPickerSettings).forEach((key) => {
                    sliderPickerSettings[key] = {
                        value: sliderPickerSettings[key]?.value ?? defaultSliderPickerValue.value,
                    };
                });

                Object.keys(enableBlurPickerSettings).forEach((key) => {
                    enableBlurPickerSettings[key] = {
                        blur:
                            typeof enableBlurPickerSettings[key]?.blur === 'boolean'
                                ? enableBlurPickerSettings[key].blur
                                : (prevSettings?.enableBlurPicker[key]?.blur ??
                                  defaultEnableBlurValue.blur),
                    };
                });

                Object.keys(drawRectPickerSettings).forEach((key) => {
                    drawRectPickerSettings[key] = {
                        enable:
                            typeof drawRectPickerSettings[key]?.enable === 'boolean'
                                ? drawRectPickerSettings[key].enable
                                : (prevSettings?.drawRectPicker[key]?.enable ??
                                  defaultDrawRectValue.enable),
                    };
                });

                Object.keys(fontSizePickerSettings).forEach((key) => {
                    fontSizePickerSettings[key] = {
                        size:
                            typeof fontSizePickerSettings[key]?.size === 'number'
                                ? fontSizePickerSettings[key].size
                                : (prevSettings?.fontSizePicker[key]?.size ??
                                  defaultFontSizePickerValue.size),
                    };
                });

                Object.keys(enableBoldPickerSettings).forEach((key) => {
                    enableBoldPickerSettings[key] = {
                        enable:
                            typeof enableBoldPickerSettings[key]?.enable === 'boolean'
                                ? enableBoldPickerSettings[key].enable
                                : (prevSettings?.enableBoldPicker[key]?.enable ??
                                  defaultEnableBoldValue.enable),
                    };
                });

                Object.keys(enableItalicPickerSettings).forEach((key) => {
                    enableItalicPickerSettings[key] = {
                        enable:
                            typeof enableItalicPickerSettings[key]?.enable === 'boolean'
                                ? enableItalicPickerSettings[key].enable
                                : (prevSettings?.enableItalicPicker[key]?.enable ??
                                  defaultEnableItalicValue.enable),
                    };
                });

                Object.keys(enableUnderlinePickerSettings).forEach((key) => {
                    enableUnderlinePickerSettings[key] = {
                        enable:
                            typeof enableUnderlinePickerSettings[key]?.enable === 'boolean'
                                ? enableUnderlinePickerSettings[key].enable
                                : (prevSettings?.enableUnderlinePicker[key]?.enable ??
                                  defaultEnableUnderlineValue.enable),
                    };
                });

                Object.keys(enableStrikethroughPickerSettings).forEach((key) => {
                    enableStrikethroughPickerSettings[key] = {
                        enable:
                            typeof enableStrikethroughPickerSettings[key]?.enable === 'boolean'
                                ? enableStrikethroughPickerSettings[key].enable
                                : (prevSettings?.enableStrikethroughPicker[key]?.enable ??
                                  defaultEnableStrikethroughValue.enable),
                    };
                });

                Object.keys(fontFamilyPickerSettings).forEach((key) => {
                    fontFamilyPickerSettings[key] = {
                        value:
                            typeof fontFamilyPickerSettings[key]?.value === 'string'
                                ? fontFamilyPickerSettings[key].value
                                : (prevSettings?.fontFamilyPicker[key]?.value ??
                                  defaultFontFamilyPickerValue.value),
                    };
                });

                Object.keys(arrowConfigPickerSettings).forEach((key) => {
                    arrowConfigPickerSettings[key] = {
                        configId:
                            typeof arrowConfigPickerSettings[key]?.configId === 'string'
                                ? arrowConfigPickerSettings[key].configId
                                : (prevSettings?.arrowConfigPicker[key]?.configId ??
                                  defaultArrowConfigValue.configId),
                    };
                });

                Object.keys(enableRadiusPickerSettings).forEach((key) => {
                    enableRadiusPickerSettings[key] = {
                        enable:
                            typeof enableRadiusPickerSettings[key]?.enable === 'boolean'
                                ? enableRadiusPickerSettings[key].enable
                                : (prevSettings?.enableRadiusPicker[key]?.enable ??
                                  defaultEnableRadiusValue.enable),
                    };
                });

                settings = {
                    fillShapePicker: {
                        ...prevSettings?.fillShapePicker,
                        ...fillShapePickerSettings,
                    },
                    lockWidthHeightPicker: {
                        ...prevSettings?.lockWidthHeightPicker,
                        ...lockWidthHeightPickerSettings,
                    },
                    radiusPicker: {
                        ...prevSettings?.radiusPicker,
                        ...radiusPickerSettings,
                    },
                    lineColorPicker: {
                        ...prevSettings?.lineColorPicker,
                        ...lineColorPickerSettings,
                    },
                    lineWidthPicker: {
                        ...prevSettings?.lineWidthPicker,
                        ...lineWidthPickerSettings,
                    },
                    sliderPicker: {
                        ...prevSettings?.sliderPicker,
                        ...sliderPickerSettings,
                    },
                    enableBlurPicker: {
                        ...prevSettings?.enableBlurPicker,
                        ...enableBlurPickerSettings,
                    },
                    drawRectPicker: {
                        ...prevSettings?.drawRectPicker,
                        ...drawRectPickerSettings,
                    },
                    fontSizePicker: {
                        ...prevSettings?.fontSizePicker,
                        ...fontSizePickerSettings,
                    },
                    enableBoldPicker: {
                        ...prevSettings?.enableBoldPicker,
                        ...enableBoldPickerSettings,
                    },
                    enableItalicPicker: {
                        ...prevSettings?.enableItalicPicker,
                        ...enableItalicPickerSettings,
                    },
                    enableUnderlinePicker: {
                        ...prevSettings?.enableUnderlinePicker,
                        ...enableUnderlinePickerSettings,
                    },
                    enableStrikethroughPicker: {
                        ...prevSettings?.enableStrikethroughPicker,
                        ...enableStrikethroughPickerSettings,
                    },
                    fontFamilyPicker: {
                        ...prevSettings?.fontFamilyPicker,
                        ...fontFamilyPickerSettings,
                    },
                    arrowConfigPicker: {
                        ...prevSettings?.arrowConfigPicker,
                        ...arrowConfigPickerSettings,
                    },
                    enableRadiusPicker: {
                        ...prevSettings?.enableRadiusPicker,
                        ...enableRadiusPickerSettings,
                    },
                };
            } else if (group === AppSettingsGroup.DrawToolbarKeyEvent) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;

                const settingsKeySet = new Set<string>();
                const settingKeys: KeyEventKey[] = Object.keys(
                    defaultKeyEventSettings,
                ) as KeyEventKey[];
                settingKeys.forEach((key) => {
                    const keyEventSettings = newSettings as Record<KeyEventKey, KeyEventValue>;

                    let keyEventSettingsKey =
                        typeof keyEventSettings[key]?.key === 'string'
                            ? keyEventSettings[key].key
                            : (prevSettings?.[key]?.key ?? defaultKeyEventSettings[key].key);

                    // 格式化处理下
                    keyEventSettingsKey = keyEventSettingsKey
                        .split(',')
                        .map(trim)
                        .filter((val) => {
                            if (settingsKeySet.has(val)) {
                                return false;
                            }

                            settingsKeySet.add(val);
                            return true;
                        })
                        .join(', ');

                    settingsKeySet.add(keyEventSettingsKey);

                    keyEventSettings[key] = {
                        messageId:
                            typeof keyEventSettings[key]?.messageId === 'string'
                                ? keyEventSettings[key].messageId
                                : (prevSettings?.[key]?.messageId ??
                                  defaultKeyEventSettings[key].messageId),
                        key: keyEventSettingsKey,
                    };
                });

                settings = {
                    ...defaultKeyEventSettings,
                    ...newSettings,
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
    }, [setAppSettings, updateAppSettings]);
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
