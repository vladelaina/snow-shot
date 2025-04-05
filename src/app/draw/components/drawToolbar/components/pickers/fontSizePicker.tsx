import { Button, Flex, Select, theme } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
import { withPickerBase } from './pickerBase';
import { WidthIcon } from './lineWidthPicker';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { defaultFontSizePickerValue, FontSizePickerValue } from './defaultValues';

const minWidth = 1;
const maxWidth = 83;

const FontSizePickerComponent: React.FC<{
    value: FontSizePickerValue;
    setValue: React.Dispatch<React.SetStateAction<FontSizePickerValue>>;
}> = ({ value, setValue }) => {
    const { token } = theme.useToken();

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

            let newSize = valueRef.current.size + (e.deltaY > 0 ? -1 : 1);
            if (newSize < minWidth) {
                newSize = minWidth;
            } else if (newSize > maxWidth) {
                newSize = maxWidth;
            }

            setValue({ size: newSize });
        },
        [setValue],
    );
    const onWheelRender = useCallbackRender(onWheel);

    return (
        <Flex align="center" gap={token.marginXXS}>
            <ToolbarTip destroyTooltipOnHide title={`${value.size}px`}>
                <Button
                    icon={<WidthIcon width={value.size} maxWidth={0} />}
                    type="dashed"
                    onMouseEnter={() => (isHoveredRef.current = true)}
                    onMouseLeave={() => (isHoveredRef.current = false)}
                    onWheel={onWheelRender}
                />
            </ToolbarTip>
            <Select
                size="small"
                defaultValue={value.size}
                popupClassName="toolbar_font-size-picker_select-popup"
                style={{ width: 64 }}
                onChange={(value) => {
                    setValue({ size: value });
                }}
                options={[
                    { value: 38, label: 'H1', style: { fontSize: '38px' } },
                    { value: 30, label: 'H2', style: { fontSize: '30px' } },
                    { value: 24, label: 'H3', style: { fontSize: '24px' } },
                    { value: 20, label: 'H4', style: { fontSize: '20px' } },
                    { value: 16, label: 'H5', style: { fontSize: '16px' } },
                    { value: 14, label: 'text', style: { fontSize: '14px' } },
                ]}
            />
            <style jsx global>
                {`
                    .toolbar_font-size-picker_select-popup {
                        width: 100px !important;
                    }
                `}
            </style>
        </Flex>
    );
};

export const FontSizePicker = withPickerBase(
    FontSizePickerComponent,
    'fontSizePicker',
    defaultFontSizePickerValue,
    1000,
);
