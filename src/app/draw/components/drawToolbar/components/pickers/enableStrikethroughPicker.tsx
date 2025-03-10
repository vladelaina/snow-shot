import { Button, Tooltip } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { StrikethroughOutlined } from '@ant-design/icons';

export type EnableStrikethroughValue = {
    enable: boolean;
};

export const defaultEnableStrikethroughValue: EnableStrikethroughValue = {
    enable: false,
};

const EnableStrikethroughPickerComponent: React.FC<{
    value: EnableStrikethroughValue;
    setValue: React.Dispatch<React.SetStateAction<EnableStrikethroughValue>>;
}> = ({ value, setValue }) => {
    return (
        <Tooltip title={<FormattedMessage id="draw.strikethrough" />}>
            <Button
                icon={<StrikethroughOutlined style={{ fontSize: '0.83em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </Tooltip>
    );
};

export const EnableStrikethroughPicker = withPickerBase(
    EnableStrikethroughPickerComponent,
    'enableStrikethroughPicker',
    defaultEnableStrikethroughValue,
);
