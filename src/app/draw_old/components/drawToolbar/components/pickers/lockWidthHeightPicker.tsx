import { LockWidthHeightIcon } from '@/components/icons';
import { Button } from 'antd';
import { useEffect } from 'react';
import { getButtonTypeByState } from '../..';
import { withPickerBase } from './pickerBase';
import { KeyEventKey, KeyEventWrap } from '../keyEventWrap';

export type LockWidthHeightValue = {
    lock: boolean;
};

export const defaultLockWidthHeightValue: LockWidthHeightValue = {
    lock: false,
};

const LockWidthHeightPickerComponent: React.FC<{
    value: LockWidthHeightValue;
    tempValue: LockWidthHeightValue | undefined;
    setValue: React.Dispatch<React.SetStateAction<LockWidthHeightValue>>;
    setTempValue: React.Dispatch<React.SetStateAction<LockWidthHeightValue | undefined>>;
}> = ({ value, tempValue, setValue, setTempValue }) => {
    const enableLockWidthHeight = (tempValue?.lock ?? false) || value.lock;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setTempValue({ lock: true });
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setTempValue(undefined);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, [setTempValue]);

    return (
        <KeyEventWrap
            onKeyDown={() => {
                setTempValue({ lock: true });
            }}
            onKeyUp={() => {
                setTempValue(undefined);
            }}
            enable={true}
            componentKey={KeyEventKey.LockWidthHeightPicker}
        >
            <Button
                icon={<LockWidthHeightIcon style={{ fontSize: '0.9em' }} />}
                type={getButtonTypeByState(enableLockWidthHeight)}
                onClick={() => {
                    setValue((prev) => ({ lock: !prev.lock }));
                }}
            />
        </KeyEventWrap>
    );
};

export const LockWidthHeightPicker = withPickerBase(
    LockWidthHeightPickerComponent,
    'lockWidthHeightPicker',
    defaultLockWidthHeightValue,
);
