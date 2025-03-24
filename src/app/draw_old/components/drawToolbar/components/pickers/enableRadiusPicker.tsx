import { Button } from 'antd';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { RadiusSettingOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../toolbarTip';

export type EnableRadiusValue = {
    enable: boolean;
};

export const defaultEnableRadiusValue: EnableRadiusValue = {
    enable: true,
};

const EnableRadiusPickerComponent: React.FC<{
    value: EnableRadiusValue;
    setValue: React.Dispatch<React.SetStateAction<EnableRadiusValue>>;
}> = ({ value, setValue }) => {
    return (
        <ToolbarTip destroyTooltipOnHide title={<FormattedMessage id="draw.enableRadius" />}>
            <Button
                icon={<RadiusSettingOutlined style={{ fontSize: '0.9em' }} />}
                type={getButtonTypeByState(value.enable)}
                onClick={() => {
                    setValue((prev) => ({ enable: !prev.enable }));
                }}
            />
        </ToolbarTip>
    );
};

export const EnableRadiusPicker = withPickerBase(
    EnableRadiusPickerComponent,
    'enableRadiusPicker',
    defaultEnableRadiusValue,
);
