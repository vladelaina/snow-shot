import { BlurIcon } from '@/components/icons';
import { Button } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { ToolbarTip } from '../../../../../../components/toolbarTip';

export type EnableBlurValue = {
    blur: boolean;
};

export const defaultEnableBlurValue: EnableBlurValue = {
    blur: false,
};

const EnableBlurPickerComponent: React.FC<{
    value: EnableBlurValue;
    setValue: React.Dispatch<React.SetStateAction<EnableBlurValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.enableBlur" />}>
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
