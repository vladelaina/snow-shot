import { DrawRectIcon } from '@/components/icons';
import { Button, Tooltip } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';

export type DrawRectValue = {
    enable: boolean;
};

export const defaultDrawRectValue: DrawRectValue = {
    enable: false,
};

const DrawRectPickerComponent: React.FC<{
    value: DrawRectValue;
    setValue: React.Dispatch<React.SetStateAction<DrawRectValue>>;
}> = ({ value, setValue }) => {
    return (
        <Tooltip title={<FormattedMessage id="draw.selectRect" />}>
            <Button
                icon={<DrawRectIcon style={{ fontSize: '0.9em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </Tooltip>
    );
};

export const DrawRectPicker = withPickerBase(
    DrawRectPickerComponent,
    'drawRectPicker',
    defaultDrawRectValue,
);
