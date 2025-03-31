import { Button } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { ItalicOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';

export type EnableItalicValue = {
    enable: boolean;
};

export const defaultEnableItalicValue: EnableItalicValue = {
    enable: false,
};

const EnableItalicPickerComponent: React.FC<{
    value: EnableItalicValue;
    setValue: React.Dispatch<React.SetStateAction<EnableItalicValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.italic" />}>
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
