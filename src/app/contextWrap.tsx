'use client';

import { createContext, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import Color from 'color';
import {
    defaultLockWidthHeightValue,
    LockWidthHeightValue,
    defaultRadiusPickerValue,
    RadiusPickerValue,
    defaultLineColorPickerValue,
    LineColorPickerValue,
    defaultLineWidthPickerValue,
    LineWidthPickerValue,
    defaultSliderPickerValue,
    SliderPickerValue,
    defaultEnableBlurValue,
    EnableBlurValue,
    defaultDrawRectValue,
    DrawRectValue,
    defaultFontSizePickerValue,
    FontSizePickerValue,
    defaultEnableBoldValue,
    EnableBoldValue,
    defaultEnableItalicValue,
    EnableItalicValue,
    defaultEnableUnderlineValue,
    EnableUnderlineValue,
    defaultEnableStrikethroughValue,
    EnableStrikethroughValue,
    defaultFontFamilyPickerValue,
    FontFamilyPickerValue,
    ArrowConfigValue,
    defaultArrowConfigValue,
    defaultEnableRadiusValue,
    EnableRadiusValue,
    defaultFillShapePickerValue,
    FillShapePickerValue,
    defaultLockAngleValue,
    LockAngleValue,
} from './draw/components/drawToolbar/components/pickers/defaultValues';
import { AppFunction, AppFunctionConfig, defaultAppFunctionConfigs } from './page';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import {
    defaultKeyEventSettings,
    KeyEventKey,
    KeyEventValue,
} from './draw/components/drawToolbar/components/keyEventWrap/index';

export enum AppSettingsGroup {
    Common = 'common',
    Cache = 'cache',
    Screenshot = 'screenshot',
    DrawToolbarPicker = 'drawToolbarPicker',
    DrawToolbarKeyEvent = 'drawToolbarKeyEvent',
    AppFunction = 'appFunction',
    Render = 'render',
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
        lockAnglePicker: Record<string, LockAngleValue>;
    };
    [AppSettingsGroup.DrawToolbarKeyEvent]: Record<KeyEventKey, KeyEventValue>;
    [AppSettingsGroup.AppFunction]: Record<AppFunction, AppFunctionConfig>;
    [AppSettingsGroup.Render]: {
        antialias: boolean;
        enableDrawLineSimplify: boolean;
        drawLineSimplifyTolerance: number;
        drawLineSimplifyHighQuality: boolean;
        enableDrawLineSmooth: boolean;
        drawLineSmoothRatio: number;
        drawLineSmoothIterations: number;
    };
};

export const defaultAppSettingsData: AppSettingsData = {
    [AppSettingsGroup.Common]: {
        darkMode: false,
        language: AppSettingsLanguage.ZHHans,
        browserLanguage: '',
    },
    [AppSettingsGroup.Screenshot]: {
        controlNode: AppSettingsControlNode.Circle,
        findChildrenElements: true,
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
        lockAnglePicker: {},
    },
    [AppSettingsGroup.DrawToolbarKeyEvent]: defaultKeyEventSettings,
    [AppSettingsGroup.AppFunction]: defaultAppFunctionConfigs,
    [AppSettingsGroup.Render]: {
        antialias: true,
        enableDrawLineSimplify: true,
        drawLineSimplifyTolerance: 0.42,
        drawLineSimplifyHighQuality: false,
        enableDrawLineSmooth: true,
        drawLineSmoothRatio: 0.25,
        drawLineSmoothIterations: 3,
    },
};

export type AppSettingsActionContextType = {
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
        /** 是否忽略 publisher 更新 */
        ignorePublisher?: boolean,
    ) => void;
    reloadAppSettings: () => void;
};

export const AppSettingsActionContext = createContext<AppSettingsActionContextType>({
    updateAppSettings: () => {},
    reloadAppSettings: () => {},
});
export const AppSettingsPublisher = createPublisher<AppSettingsData>(defaultAppSettingsData);

export const AppSettingsLoadingPublisher = createPublisher<boolean>(true);

export type ScreenshotContextType = {
    imageBuffer: ImageBuffer | undefined;
    setImageBuffer: (imageBuffer: ImageBuffer | undefined) => void;
};

const configDir = 'configs';
const getFileName = (group: AppSettingsGroup) => {
    return `${configDir}\\${group}.json`;
};

export type AppContextType = {
    appWindowRef: RefObject<AppWindow | undefined>;
};

export const AppContext = createContext<AppContextType>({
    appWindowRef: { current: undefined },
});

const ContextWrapCore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const appWindowRef = useRef<AppWindow>(undefined);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    const [appSettings, _setAppSettings] = useState<AppSettingsData>(defaultAppSettingsData);
    const appSettingsRef = useRef<AppSettingsData>(defaultAppSettingsData);
    const [, setAppSettingsStatePublisher] = useStateSubscriber(AppSettingsPublisher, undefined);
    const [, setAppSettingsLoadingPublisher] = useStateSubscriber(
        AppSettingsLoadingPublisher,
        undefined,
    );
    const setAppSettings = useCallback(
        (newSettings: AppSettingsData, ignoreState?: boolean, ignorePublisher?: boolean) => {
            appSettingsRef.current = newSettings;
            if (!ignorePublisher) {
                setAppSettingsStatePublisher(newSettings);
            }
            if (!ignoreState) {
                _setAppSettings(newSettings);
            }
        },
        [_setAppSettings, setAppSettingsStatePublisher],
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
            /** 是否忽略 publisher 更新 */
            ignorePublisher?: boolean,
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

                settings = {
                    controlNode,
                    findChildrenElements,
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
                const lockAnglePickerSettings = newSettings.lockAnglePicker ?? {};

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

                Object.keys(lockAnglePickerSettings).forEach((key) => {
                    lockAnglePickerSettings[key] = {
                        lock:
                            typeof lockAnglePickerSettings[key]?.lock === 'boolean'
                                ? lockAnglePickerSettings[key].lock
                                : (prevSettings?.lockAnglePicker[key]?.lock ??
                                  defaultLockAngleValue.lock),
                        angle:
                            typeof lockAnglePickerSettings[key]?.angle === 'number'
                                ? lockAnglePickerSettings[key].angle
                                : (prevSettings?.lockAnglePicker[key]?.angle ??
                                  defaultLockAngleValue.angle),
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
                    lockAnglePicker: {
                        ...prevSettings?.lockAnglePicker,
                        ...lockAnglePickerSettings,
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
                        typeof keyEventSettings[key]?.hotKey === 'string'
                            ? keyEventSettings[key].hotKey
                            : (prevSettings?.[key]?.hotKey ?? defaultKeyEventSettings[key].hotKey);

                    // 格式化处理下
                    keyEventSettingsKey = keyEventSettingsKey
                        .split(',')
                        .map(trim)
                        .filter((val) => {
                            if (settingsKeySet.has(val)) {
                                return false;
                            }

                            if (defaultKeyEventSettings[key].unique) {
                                settingsKeySet.add(val);
                            }

                            return true;
                        })
                        .join(', ');

                    keyEventSettings[key] = {
                        hotKey: keyEventSettingsKey,
                    };
                });

                settings = {
                    ...defaultKeyEventSettings,
                    ...newSettings,
                };
            } else if (group === AppSettingsGroup.AppFunction) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;

                const settingsKeySet = new Set<string>();
                const settingKeys: AppFunction[] = Object.keys(
                    defaultAppFunctionConfigs,
                ) as AppFunction[];
                settingKeys.forEach((key) => {
                    const keyEventSettings = newSettings as Record<AppFunction, AppFunctionConfig>;

                    let keyEventSettingsKey =
                        typeof keyEventSettings[key]?.shortcutKey === 'string'
                            ? keyEventSettings[key].shortcutKey
                            : (prevSettings?.[key]?.shortcutKey ??
                              defaultAppFunctionConfigs[key].shortcutKey);

                    // 格式化处理下
                    keyEventSettingsKey = keyEventSettingsKey
                        .split(',')
                        .slice(0, 1) // 快捷键不支持多个键，这里也限制下
                        .map(trim)
                        .filter((val) => {
                            if (settingsKeySet.has(val)) {
                                return false;
                            }

                            return true;
                        })
                        .join(', ');

                    settingsKeySet.add(keyEventSettingsKey);

                    keyEventSettings[key] = {
                        shortcutKey: keyEventSettingsKey,
                    };
                });

                settings = {
                    ...defaultAppFunctionConfigs,
                    ...newSettings,
                };
            } else if (group === AppSettingsGroup.Render) {
                newSettings = newSettings as AppSettingsData[typeof group];
                const prevSettings = appSettingsRef.current[group] as
                    | AppSettingsData[typeof group]
                    | undefined;

                settings = {
                    antialias:
                        typeof newSettings?.antialias === 'boolean'
                            ? newSettings.antialias
                            : (prevSettings?.antialias ?? defaultAppSettingsData[group].antialias),
                    enableDrawLineSimplify:
                        typeof newSettings?.enableDrawLineSimplify === 'boolean'
                            ? newSettings.enableDrawLineSimplify
                            : (prevSettings?.enableDrawLineSimplify ??
                              defaultAppSettingsData[group].enableDrawLineSimplify),
                    drawLineSimplifyTolerance:
                        typeof newSettings?.drawLineSimplifyTolerance === 'number'
                            ? Math.min(Math.max(newSettings.drawLineSimplifyTolerance, 0.1), 5)
                            : (prevSettings?.drawLineSimplifyTolerance ??
                              defaultAppSettingsData[group].drawLineSimplifyTolerance),
                    drawLineSimplifyHighQuality:
                        typeof newSettings?.drawLineSimplifyHighQuality === 'boolean'
                            ? newSettings.drawLineSimplifyHighQuality
                            : (prevSettings?.drawLineSimplifyHighQuality ??
                              defaultAppSettingsData[group].drawLineSimplifyHighQuality),
                    enableDrawLineSmooth:
                        typeof newSettings?.enableDrawLineSmooth === 'boolean'
                            ? newSettings.enableDrawLineSmooth
                            : (prevSettings?.enableDrawLineSmooth ??
                              defaultAppSettingsData[group].enableDrawLineSmooth),
                    drawLineSmoothRatio:
                        typeof newSettings?.drawLineSmoothRatio === 'number'
                            ? Math.min(Math.max(newSettings.drawLineSmoothRatio, 0.1), 0.5)
                            : (prevSettings?.drawLineSmoothRatio ??
                              defaultAppSettingsData[group].drawLineSmoothRatio),
                    drawLineSmoothIterations:
                        typeof newSettings?.drawLineSmoothIterations === 'number'
                            ? Math.min(Math.max(newSettings.drawLineSmoothIterations, 1), 8)
                            : (prevSettings?.drawLineSmoothIterations ??
                              defaultAppSettingsData[group].drawLineSmoothIterations),
                };
            } else {
                return defaultAppSettingsData[group];
            }

            setAppSettings(
                {
                    ...appSettingsRef.current,
                    [group]: settings,
                },
                ignoreState,
                ignorePublisher,
            );

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
        setAppSettingsLoadingPublisher(true);
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

            const saveToFile = appWindowRef.current?.label === 'main';

            if (!isFileExists) {
                settings[group] = updateAppSettings(
                    group,
                    defaultAppSettingsData[group],
                    false,
                    saveToFile,
                    false,
                    true,
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
                true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }

        if (_.isEqual(appSettingsRef.current, settings)) {
            setAppSettings(settings);
        }
        setAppSettingsLoadingPublisher(false);
    }, [setAppSettingsLoadingPublisher, updateAppSettings, setAppSettings]);
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

    const appSettingsContextValue = useMemo(() => {
        return {
            ...appSettings,
            updateAppSettings,
            reloadAppSettings,
        };
    }, [appSettings, updateAppSettings, reloadAppSettings]);

    const appContextValue = useMemo(() => {
        return {
            appWindowRef,
        };
    }, [appWindowRef]);

    return (
        <AppSettingsActionContext.Provider value={appSettingsContextValue}>
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
                    <AppContext.Provider value={appContextValue}>{children}</AppContext.Provider>
                </IntlProvider>
            </ConfigProvider>
        </AppSettingsActionContext.Provider>
    );
};

export const ContextWrap = withStatePublisher(
    withStatePublisher(ContextWrapCore, AppSettingsPublisher),
    AppSettingsLoadingPublisher,
);
