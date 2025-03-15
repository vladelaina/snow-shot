import { Button, Tooltip } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
import { withPickerBase } from './pickerBase';

export const WidthIcon: React.FC<{ width: number; maxWidth: number }> = ({ width, maxWidth }) => {
    const showWidth = width > maxWidth ? 0 : width;
    return (
        <div
            style={{
                width: showWidth === 0 ? '100%' : showWidth,
                height: showWidth === 0 ? '100%' : showWidth,
                backgroundColor: showWidth === 0 ? 'transparent' : 'currentcolor',
                opacity: 0.83,
                borderRadius: showWidth / 2,
                fontSize: 14,
            }}
        >
            {showWidth === 0 ? width : ''}
        </div>
    );
};

export type LineWidthPickerValue = {
    width: number;
};

export const defaultLineWidthPickerValue: LineWidthPickerValue = {
    width: 5,
};

const minWidth = 1;
const maxWidth = 83;
const smallWidth = 5;
const mediumWidth = 15;
const largeWidth = 30;

const LineWidthPickerComponent: React.FC<{
    value: LineWidthPickerValue;
    setValue: React.Dispatch<React.SetStateAction<LineWidthPickerValue>>;
}> = ({ value, setValue }) => {
    const isHoveredRef = useRef(false);
    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const onWheel = useCallback(
        (e: React.WheelEvent<HTMLButtonElement>) => {
            if (!isHoveredRef.current) {
                return;
            }

            let newWidth = valueRef.current.width + (e.deltaY > 0 ? -1 : 1);
            if (newWidth < minWidth) {
                newWidth = minWidth;
            } else if (newWidth > maxWidth) {
                newWidth = maxWidth;
            }

            setValue({ width: newWidth });
        },
        [setValue],
    );

    return (
        <>
            <Tooltip title={`${value.width}px`}>
                <Button
                    icon={<WidthIcon width={value.width} maxWidth={21} />}
                    type="dashed"
                    onMouseEnter={() => (isHoveredRef.current = true)}
                    onMouseLeave={() => (isHoveredRef.current = false)}
                    onWheel={onWheel}
                />
            </Tooltip>
            <Tooltip title={`${smallWidth}px`}>
                <Button
                    icon={<WidthIcon width={5} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: smallWidth });
                    }}
                />
            </Tooltip>
            <Tooltip title={`${mediumWidth}px`}>
                <Button
                    icon={<WidthIcon width={10} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: mediumWidth });
                    }}
                />
            </Tooltip>
            <Tooltip title={`${largeWidth}px`}>
                <Button
                    icon={<WidthIcon width={20} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: largeWidth });
                    }}
                />
            </Tooltip>
        </>
    );
};

export const LineWidthPicker = withPickerBase(
    LineWidthPickerComponent,
    'lineWidthPicker',
    defaultLineWidthPickerValue,
    1000,
);
