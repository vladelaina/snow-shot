import { LockWidthHeightIcon } from '@/components/icons';
import { Button, Tooltip } from 'antd';
import { useEffect } from 'react';
import { getButtonTypeByState } from '../..';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';

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
        <Tooltip title={<FormattedMessage id="draw.lockWidthHeight" />}>
            <Button
                icon={<LockWidthHeightIcon style={{ fontSize: '0.9em' }} />}
                type={getButtonTypeByState(enableLockWidthHeight)}
                onClick={() => {
                    setValue((prev) => ({ lock: !prev.lock }));
                }}
            />
        </Tooltip>
    );
};

export const LockWidthHeightPicker = withPickerBase(
    LockWidthHeightPickerComponent,
    'lockWidthHeightPicker',
    defaultLockWidthHeightValue,
);
