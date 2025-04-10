import React, {
    useContext,
    useEffect,
    useState,
    ComponentType,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import _, { debounce } from 'lodash';
import { BaseToolEnablePublisher } from '../tools/baseTool';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';

export type PickerProps<ValueType> = {
    onChange: (value: ValueType) => void;
    toolbarLocation: string;
    hidden?: boolean;
};

export type WithPickerBaseProps<T extends object> = T & {
    value: T;
    setValue: React.Dispatch<React.SetStateAction<T>>;
    tempValue: T | undefined;
    setTempValue: React.Dispatch<React.SetStateAction<T | undefined>>;
    updateDebounce?: number;
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
    updateDebounce: number = 0,
) {
    return React.memo(function PickerBase(props: PickerProps<T>) {
        const [getEnable] = useStateSubscriber(BaseToolEnablePublisher, () => {});

        const { onChange, toolbarLocation, hidden } = props;

        const { updateAppSettings } = useContext(AppSettingsActionContext);
        const [getAppSettings] = useStateSubscriber(AppSettingsPublisher, undefined);

        const [value, _setValue] = useState<T | undefined>();
        const valueRef = useRef<T | undefined>(undefined);
        const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
            (newValue) => {
                if (!getEnable()) {
                    return;
                }

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
            },
            [getEnable],
        );
        const [tempValue, _setTempValue] = useState<T | undefined>(undefined);
        const setTempValue: React.Dispatch<React.SetStateAction<T | undefined>> = useCallback(
            (newValue) => {
                if (!getEnable()) {
                    return;
                }

                _setTempValue(newValue);
            },
            [getEnable],
        );

        const settingsValueRef = useRef<T | undefined>(undefined);

        const onEnableChange = useCallback(
            (enable: boolean) => {
                if (!enable) {
                    return;
                }

                const currentSettings =
                    getAppSettings()[AppSettingsGroup.DrawToolbarPicker][settingsKey][
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
            },
            [getAppSettings, setValue, toolbarLocation],
        );
        useStateSubscriber(BaseToolEnablePublisher, onEnableChange);

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
                false,
                true,
                true,
            );
        }, [updateAppSettings, toolbarLocation]);
        const updateSettingsDebounce = useMemo(() => {
            if (updateDebounce === 0) {
                return () => {
                    updateSettings();
                };
            } else {
                return debounce(() => {
                    updateSettings();
                }, updateDebounce);
            }
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
            <div style={{ display: hidden ? 'none' : 'flex' }}>
                <WrappedComponent
                    {...(props as T)}
                    value={value ?? defaultValue}
                    tempValue={tempValue}
                    setValue={setValue}
                    setTempValue={setTempValue}
                />
            </div>
        );
    });
}
