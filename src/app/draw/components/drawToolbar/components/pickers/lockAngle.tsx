import { LockAngleIcon } from '@/components/icons';
import { Button } from 'antd';
import { withPickerBase } from './pickerBase';
import { KeyEventKey, KeyEventWrap } from '../keyEventWrap/index';
import { getButtonTypeByState } from '../../extra';
import { defaultLockAngleValue, LockAngleValue } from './defaultValues';

const LockAnglePickerComponent: React.FC<{
    value: LockAngleValue;
    tempValue: LockAngleValue | undefined;
    setValue: React.Dispatch<React.SetStateAction<LockAngleValue>>;
    setTempValue: React.Dispatch<React.SetStateAction<LockAngleValue | undefined>>;
}> = ({ value, tempValue, setValue, setTempValue }) => {
    const enableLockAngle = (tempValue?.lock ?? false) || value.lock;

    return (
        <KeyEventWrap
            onKeyDown={() => {
                setTempValue((pre) => {
                    return { lock: true, angle: pre?.angle ?? 0 };
                });
            }}
            onKeyUp={() => {
                setTempValue(undefined);
            }}
            componentKey={KeyEventKey.LockAnglePicker}
        >
            <Button
                icon={<LockAngleIcon />}
                type={getButtonTypeByState(enableLockAngle)}
                onClick={() => {
                    setValue((prev) => ({ lock: !prev.lock, angle: prev.angle }));
                }}
            />
        </KeyEventWrap>
    );
};

export const LockAnglePicker = withPickerBase(
    LockAnglePickerComponent,
    'lockAnglePicker',
    defaultLockAngleValue,
);
