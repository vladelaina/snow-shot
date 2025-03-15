import { Select } from 'antd';
import { withPickerBase } from './pickerBase';
import { DefaultOptionType } from 'antd/es/select';

export type ArrowConfigValue = {
    configId: string;
};

export const defaultArrowConfigValue: ArrowConfigValue = {
    configId: 'arrow-style-1',
};

export type ArrowStyleConfig = {
    id: string;
    headHeight: number;
    headBottomWidth: number;
    headBottomInnerWidth: number;
    bodyBottomWidth: number;
};

const configMap: Map<string, ArrowStyleConfig> = new Map();

configMap.set(defaultArrowConfigValue.configId, {
    id: defaultArrowConfigValue.configId,
    headHeight: 50,
    headBottomWidth: 42,
    headBottomInnerWidth: 16,
    bodyBottomWidth: 1,
});
configMap.set('arrow-style-2', {
    id: 'arrow-style-2',
    headHeight: 0,
    headBottomWidth: 42,
    headBottomInnerWidth: 42,
    bodyBottomWidth: 42,
});

export const getArrowStyleConfig = (configId: string) => {
    return configMap.get(configId) ?? configMap.get(defaultArrowConfigValue.configId)!;
};

const ArrowConfigPickerComponent: React.FC<{
    value: ArrowConfigValue;
    setValue: React.Dispatch<React.SetStateAction<ArrowConfigValue>>;
}> = ({ value, setValue }) => {
    return (
        <>
            <Select
                size="small"
                value={value.configId}
                popupClassName="toolbar_arrow-config-picker_select-popup"
                style={{ width: 64 }}
                onChange={(value) => {
                    setValue({ configId: value });
                }}
                options={configMap
                    .values()
                    .toArray()
                    .map((config): DefaultOptionType => {
                        return {
                            value: config.id,
                            label: <div>config.id</div>,
                        };
                    })}
            />
            <style jsx global>
                {`
                    .toolbar_font-family-picker_select-popup {
                        width: 200px !important;
                    }
                `}
            </style>
        </>
    );
};

export const ArrowConfigPicker = withPickerBase(
    ArrowConfigPickerComponent,
    'arrowConfigPicker',
    defaultArrowConfigValue,
);
