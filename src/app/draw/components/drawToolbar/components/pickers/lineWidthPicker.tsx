import { Button } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
import { withPickerBase } from './pickerBase';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { defaultLineWidthPickerValue, LineWidthPickerValue } from './defaultValues';

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
    const onWheelRender = useCallbackRender(onWheel);

    return (
        <>
            <ToolbarTip destroyTooltipOnHide title={`${value.width}px`}>
                <Button
                    icon={<WidthIcon width={value.width} maxWidth={21} />}
                    type="dashed"
                    onMouseEnter={() => (isHoveredRef.current = true)}
                    onMouseLeave={() => (isHoveredRef.current = false)}
                    onWheel={onWheelRender}
                />
            </ToolbarTip>
            <ToolbarTip destroyTooltipOnHide title={`${smallWidth}px`}>
                <Button
                    icon={<WidthIcon width={5} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: smallWidth });
                    }}
                />
            </ToolbarTip>
            <ToolbarTip destroyTooltipOnHide title={`${mediumWidth}px`}>
                <Button
                    icon={<WidthIcon width={10} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: mediumWidth });
                    }}
                />
            </ToolbarTip>
            <ToolbarTip destroyTooltipOnHide title={`${largeWidth}px`}>
                <Button
                    icon={<WidthIcon width={20} maxWidth={maxWidth} />}
                    type="text"
                    onClick={() => {
                        setValue({ width: largeWidth });
                    }}
                />
            </ToolbarTip>
        </>
    );
};

export const LineWidthPicker = withPickerBase(
    LineWidthPickerComponent,
    'lineWidthPicker',
    defaultLineWidthPickerValue,
    1000,
);
