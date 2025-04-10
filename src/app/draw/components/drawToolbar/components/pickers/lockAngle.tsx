import { LockAngleIcon } from '@/components/icons';
import { Button } from 'antd';
import { withPickerBase } from './pickerBase';
import { KeyEventKey, KeyEventWrap } from '../keyEventWrap/index';
import { getButtonTypeByState } from '../../extra';
import { defaultLockAngleValue, LockAngleValue } from './defaultValues';
import { useCallback, useState } from 'react';
import { WidthIcon } from './lineWidthPicker';
import { useCallbackRender } from '@/hooks/useCallbackRender';

const minAngle = 5;
const maxAngle = 90;

const LockAnglePickerComponent: React.FC<{
    value: LockAngleValue;
    tempValue: LockAngleValue | undefined;
    setValue: React.Dispatch<React.SetStateAction<LockAngleValue>>;
    setTempValue: React.Dispatch<React.SetStateAction<LockAngleValue | undefined>>;
}> = ({ value, tempValue, setValue, setTempValue }) => {
    const enableLockAngle = tempValue ? tempValue.lock : value.lock;

    const [isHover, setIsHover] = useState(false);

    const onWheel = useCallback(
        (e: React.WheelEvent<HTMLButtonElement>) => {
            setValue((prev) => {
                let newAngle = prev.angle + (e.deltaY > 0 ? -5 : 5);
                if (newAngle < minAngle) {
                    newAngle = minAngle;
                } else if (newAngle > maxAngle) {
                    newAngle = maxAngle;
                }
                return { ...prev, angle: newAngle };
            });
        },
        [setValue],
    );
    const onWheelRender = useCallbackRender(onWheel);
    return (
        <KeyEventWrap
            onKeyDown={() => {
                setTempValue({ lock: !value.lock, angle: value.angle });
            }}
            onKeyUp={() => {
                setTempValue(undefined);
            }}
            componentKey={KeyEventKey.LockAnglePicker}
        >
            <Button
                onMouseEnter={() => {
                    setIsHover(true);
                }}
                onMouseLeave={() => {
                    setIsHover(false);
                }}
                onWheel={onWheelRender}
                icon={
                    isHover ? (
                        <WidthIcon width={value.angle} maxWidth={0} />
                    ) : (
                        <LockAngleIcon style={{ fontSize: '0.83em' }} />
                    )
                }
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
