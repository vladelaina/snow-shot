import { DrawRectIcon } from '@/components/icons';
import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultDrawRectValue, DrawRectValue } from './defaultValues';

const DrawRectPickerComponent: React.FC<{
    value: DrawRectValue;
    setValue: React.Dispatch<React.SetStateAction<DrawRectValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.selectRect" />}>
            <Button
                icon={<DrawRectIcon style={{ fontSize: '0.9em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const DrawRectPicker = withPickerBase(
    DrawRectPickerComponent,
    'drawRectPicker',
    defaultDrawRectValue,
);
