import { Button, Tooltip } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { BoldOutlined } from '@ant-design/icons';

export type EnableBoldValue = {
    enable: boolean;
};

export const defaultEnableBoldValue: EnableBoldValue = {
    enable: false,
};

const EnableBoldPickerComponent: React.FC<{
    value: EnableBoldValue;
    setValue: React.Dispatch<React.SetStateAction<EnableBoldValue>>;
}> = ({ value, setValue }) => {
    return (
        <Tooltip title={<FormattedMessage id="draw.bold" />}>
            <Button
                icon={<BoldOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </Tooltip>
    );
};

export const EnableBoldPicker = withPickerBase(
    EnableBoldPickerComponent,
    'enableBoldPicker',
    defaultEnableBoldValue,
);
