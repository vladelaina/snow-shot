import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { BoldOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultEnableBoldValue, EnableBoldValue } from './defaultValues';

const EnableBoldPickerComponent: React.FC<{
    value: EnableBoldValue;
    setValue: React.Dispatch<React.SetStateAction<EnableBoldValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip title={<FormattedMessage id="draw.bold" />}>
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
