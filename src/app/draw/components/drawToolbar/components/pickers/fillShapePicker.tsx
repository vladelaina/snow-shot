import { FillIcon } from '@/components/icons';
import { Button } from 'antd';
import { getButtonTypeByState } from '../../extra';
import { FormattedMessage } from 'react-intl';
import { withPickerBase, WithPickerBaseProps } from './pickerBase';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultFillShapePickerValue, FillShapePickerValue } from './defaultValues';

const FillShapePickerComponent: React.FC<WithPickerBaseProps<FillShapePickerValue>> = ({
    value,
    setValue,
}) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.fillShape" />}>
            <Button
                icon={<FillIcon style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.fill)}
                onClick={() => setValue((prev) => ({ fill: !prev.fill }))}
            />
        </ToolbarTip>
    );
};

export const FillShapePicker = withPickerBase(
    FillShapePickerComponent,
    'fillShapePicker',
    defaultFillShapePickerValue,
);
