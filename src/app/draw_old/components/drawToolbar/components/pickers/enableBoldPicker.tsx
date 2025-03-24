import { Button } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { BoldOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../toolbarTip';

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
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.bold" />}>
            <Button
                icon={<BoldOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableBoldPicker = withPickerBase(
    EnableBoldPickerComponent,
    'enableBoldPicker',
    defaultEnableBoldValue,
);
