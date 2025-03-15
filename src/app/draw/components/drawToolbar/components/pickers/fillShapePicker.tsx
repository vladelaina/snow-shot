import { FillIcon } from '@/components/icons';
import { Button, Tooltip } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase, WithPickerBaseProps } from './pickerBase';

export type FillShapePickerValue = {
    fill: boolean;
};

export const defaultFillShapePickerValue: FillShapePickerValue = {
    fill: false,
};

const FillShapePickerComponent: React.FC<WithPickerBaseProps<FillShapePickerValue>> = ({
    value,
    setValue,
}) => {
    return (
        <Tooltip title={<FormattedMessage id="draw.fillShape" />}>
            <Button
                icon={<FillIcon style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.fill)}
                onClick={() => setValue((prev) => ({ fill: !prev.fill }))}
            />
        </Tooltip>
    );
};

export const FillShapePicker = withPickerBase(
    FillShapePickerComponent,
    'fillShapePicker',
    defaultFillShapePickerValue,
);
