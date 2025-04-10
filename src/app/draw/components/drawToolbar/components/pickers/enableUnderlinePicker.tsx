import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { UnderlineOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultEnableUnderlineValue, EnableUnderlineValue } from './defaultValues';

const EnableUnderlinePickerComponent: React.FC<{
    value: EnableUnderlineValue;
    setValue: React.Dispatch<React.SetStateAction<EnableUnderlineValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip title={<FormattedMessage id="draw.underline" />}>
            <Button
                icon={<UnderlineOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableUnderlinePicker = withPickerBase(
    EnableUnderlinePickerComponent,
    'enableUnderlinePicker',
    defaultEnableUnderlineValue,
);
