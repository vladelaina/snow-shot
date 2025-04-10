import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { StrikethroughOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultEnableStrikethroughValue, EnableStrikethroughValue } from './defaultValues';

const EnableStrikethroughPickerComponent: React.FC<{
    value: EnableStrikethroughValue;
    setValue: React.Dispatch<React.SetStateAction<EnableStrikethroughValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip title={<FormattedMessage id="draw.strikethrough" />}>
            <Button
                icon={<StrikethroughOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableStrikethroughPicker = withPickerBase(
    EnableStrikethroughPickerComponent,
    'enableStrikethroughPicker',
    defaultEnableStrikethroughValue,
);
