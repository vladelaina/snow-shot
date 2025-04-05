import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { RadiusSettingOutlined } from '@ant-design/icons';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { getButtonTypeByState } from '../../extra';
import { defaultEnableRadiusValue, EnableRadiusValue } from './defaultValues';

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
