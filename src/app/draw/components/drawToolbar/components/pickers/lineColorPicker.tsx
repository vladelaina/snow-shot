import { Button, ColorPicker, ColorPickerProps, GetProp, theme } from 'antd';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import Color from 'color';
import { useCallback, useEffect, useState } from 'react';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultLineColorPickerValue, LineColorPickerValue } from './defaultValues';

type Color = Extract<GetProp<ColorPickerProps, 'value'>, string | { cleared: unknown }>;

const ColorIcon: React.FC<{ color: string; borderColor?: string }> = ({ color, borderColor }) => {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                width: '0.72em',
                height: '0.72em',
                backgroundColor: color,
                borderRadius: token.borderRadiusSM,
                border: borderColor ? `1px solid ${borderColor}` : 'none',
            }}
        />
    );
};

const LineColorPickerComponent: React.FC<{
    value: LineColorPickerValue;
    setValue: React.Dispatch<React.SetStateAction<LineColorPickerValue>>;
}> = ({ value, setValue }) => {
    const color = value.color;
    const [tempColor, setTempColor] = useState(color);
    useEffect(() => {
        setTempColor(color);
    }, [color]);

    const setColor = useCallback(
        (newColor: Color, isComplete = false) => {
            const newColorValue = typeof newColor === 'string' ? newColor : newColor.toHexString();

            setTempColor(newColorValue);
            if (isComplete) {
                setValue({ color: newColorValue });
            }
        },
        [setValue],
    );
    return (
        <>
            <ColorPicker
                value={tempColor}
                onChange={(newColor) => {
                    setColor(newColor);
                }}
                onChangeComplete={(newColor) => {
                    setColor(newColor, true);
                }}
                format="hex"
                disabledFormat
            />
            <ToolbarTip title={<FormattedMessage id="draw.red" />}>
                <Button
                    onClick={() => {
                        setColor('#f5222d', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#f5222d" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.orange" />}>
                <Button
                    onClick={() => {
                        setColor('#faad14', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#faad14" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.green" />}>
                <Button
                    onClick={() => {
                        setColor('#52c41a', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#52c41a" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.blue" />}>
                <Button
                    onClick={() => {
                        setColor('#1677ff', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#1677ff" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.purple" />}>
                <Button
                    onClick={() => {
                        setColor('#722ed1', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#722ed1" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.black" />}>
                <Button
                    onClick={() => {
                        setColor('#141414', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#141414" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.gray" />}>
                <Button
                    onClick={() => {
                        setColor('#bfbfbf', true);
                    }}
                    type="text"
                    icon={<ColorIcon color="#bfbfbf" />}
                />
            </ToolbarTip>
            <ToolbarTip title={<FormattedMessage id="draw.white" />}>
                <Button
                    onClick={() => {
                        setColor('#ffffff', true);
                    }}
                    type="text"
                    icon={<ColorIcon borderColor="#bfbfbf" color="#ffffff" />}
                />
            </ToolbarTip>
        </>
    );
};

export const LineColorPicker = withPickerBase(
    LineColorPickerComponent,
    'lineColorPicker',
    defaultLineColorPickerValue,
);
