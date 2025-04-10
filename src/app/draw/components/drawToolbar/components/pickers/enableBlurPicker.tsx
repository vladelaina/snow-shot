import { BlurIcon } from '@/components/icons';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { getButtonTypeByState } from '../../extra';
import { defaultEnableBlurValue, EnableBlurValue } from './defaultValues';

const EnableBlurPickerComponent: React.FC<{
    value: EnableBlurValue;
    setValue: React.Dispatch<React.SetStateAction<EnableBlurValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip title={<FormattedMessage id="draw.enableBlur" />}>
            <Button
                icon={<BlurIcon />}
                type={getButtonTypeByState(value.blur)}
                onClick={() => {
                    setValue((prev) => ({ blur: !prev.blur }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableBlurPicker = withPickerBase(
    EnableBlurPickerComponent,
    'enableBlurPicker',
    defaultEnableBlurValue,
);
