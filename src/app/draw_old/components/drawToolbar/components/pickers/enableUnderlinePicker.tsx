import { Button } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { UnderlineOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../toolbarTip';

export type EnableUnderlineValue = {
    enable: boolean;
};

export const defaultEnableUnderlineValue: EnableUnderlineValue = {
    enable: false,
};

const EnableUnderlinePickerComponent: React.FC<{
    value: EnableUnderlineValue;
    setValue: React.Dispatch<React.SetStateAction<EnableUnderlineValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.underline" />}>
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
