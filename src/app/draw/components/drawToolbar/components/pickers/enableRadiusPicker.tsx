import { Button, Tooltip } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { RadiusSettingOutlined } from '@ant-design/icons';

export type EnableRadiusValue = {
    enable: boolean;
};

export const defaultEnableRadiusValue: EnableRadiusValue = {
    enable: true,
};

const EnableRadiusPickerComponent: React.FC<{
    value: EnableRadiusValue;
    setValue: React.Dispatch<React.SetStateAction<EnableRadiusValue>>;
}> = ({ value, setValue }) => {
    return (
        <Tooltip title={<FormattedMessage id="draw.enableRadius" />}>
            <Button
                icon={<RadiusSettingOutlined />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </Tooltip>
    );
};

export const EnableRadiusPicker = withPickerBase(
    EnableRadiusPickerComponent,
    'enableRadiusPicker',
    defaultEnableRadiusValue,
);
