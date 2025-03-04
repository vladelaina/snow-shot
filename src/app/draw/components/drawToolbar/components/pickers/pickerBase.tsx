import React, { useContext, useEffect, useState, ComponentType, useRef, useCallback } from 'react';
import { AppSettingsContext, AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import _, { debounce } from 'lodash';

export type PickerProps<ValueType> = {
    onChange: (value: ValueType) => void;
    toolbarLocation: string;
};

export type WithPickerBaseProps<T extends object> = T & {
    value: T;
    setValue: React.Dispatch<React.SetStateAction<T>>;
    tempValue: T | undefined;
    setTempValue: React.Dispatch<React.SetStateAction<T | undefined>>;
};

const getSettingsKey = (toolbarLocation: string) => {
    return `draw_toolbar_picker:${toolbarLocation}`;
};

/**
 * PickerBase 高阶组件
 * @param WrappedComponent 需要包装的基础组件
 * @param settingsKey 需要更新的 AppSetting Key
 * @param defaultValue 组件的默认值
 */
export function withPickerBase<T extends object>(
    WrappedComponent: ComponentType<T & WithPickerBaseProps<T>>,
    settingsKey: keyof AppSettingsData[AppSettingsGroup.DrawToolbarPicker],
    defaultValue: T,
) {
    return React.memo(function PickerBase(props: PickerProps<T>) {
        const { onChange, toolbarLocation } = props;

        const appSettings = useContext(AppSettingsContext);
        const { updateAppSettings } = appSettings;

        const [value, _setValue] = useState<T | undefined>();
        const valueRef = useRef<T | undefined>(undefined);
        const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((newValue) => {
            _setValue((prev) => {
                let res;
                if (typeof newValue === 'function') {
                    res = newValue(prev ?? defaultValue);
                } else {
                    res = newValue;
                }

                valueRef.current = res;
                return res;
            });
        }, []);
        const [tempValue, setTempValue] = useState<T | undefined>(undefined);

        const settingsValueRef = useRef<T | undefined>(undefined);

        useEffect(() => {
            const currentSettings =
                appSettings[AppSettingsGroup.DrawToolbarPicker][settingsKey][
                    getSettingsKey(toolbarLocation)
                ];
            const settingsValue = (currentSettings as T) ?? defaultValue;

            settingsValueRef.current = settingsValue;
            setValue((prev) => {
                if (_.isEqual(prev, settingsValue)) {
                    return prev;
                }

                return settingsValue;
            });
        }, [appSettings, setValue, toolbarLocation]);

        const updateSettings = useCallback(() => {
            if (_.isEqual(valueRef.current, settingsValueRef.current)) {
                return;
            }

            updateAppSettings(
                AppSettingsGroup.DrawToolbarPicker,
                {
                    [settingsKey]: {
                        [getSettingsKey(toolbarLocation)]: valueRef.current,
                    },
                },
                false,
                true,
                true,
            );
        }, [updateAppSettings, toolbarLocation]);
        const updateSettingsDebounce = useCallback(() => {
            debounce(() => {
                updateSettings();
            }, 1000)();
        }, [updateSettings]);

        useEffect(() => {
            if (!value) {
                return;
            }

            updateSettingsDebounce();
        }, [value, updateSettingsDebounce]);

        useEffect(() => {
            onChange(tempValue ?? value ?? defaultValue);
        }, [value, tempValue, onChange]);

        return (
            <WrappedComponent
                {...(props as T)}
                value={value ?? defaultValue}
                tempValue={tempValue}
                setValue={setValue}
                setTempValue={setTempValue}
            />
        );
    });
}
