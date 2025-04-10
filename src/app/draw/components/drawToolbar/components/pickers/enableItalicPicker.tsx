import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { ItalicOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultEnableItalicValue, EnableItalicValue } from './defaultValues';

const EnableItalicPickerComponent: React.FC<{
    value: EnableItalicValue;
    setValue: React.Dispatch<React.SetStateAction<EnableItalicValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip title={<FormattedMessage id="draw.italic" />}>
            <Button
                icon={<ItalicOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableItalicPicker = withPickerBase(
    EnableItalicPickerComponent,
    'enableItalicPicker',
    defaultEnableItalicValue,
);
