import { Button, ColorPicker, ColorPickerProps, GetProp, theme } from 'antd';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import Color from 'color';
import { useCallback, useEffect, useState } from 'react';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { defaultLineColorPickerValue, LineColorPickerValue } from './defaultValues';

type Color = Extract<GetProp<ColorPickerProps, 'value'>, string | { cleared: unknown }>;

export const ColorIcon: React.FC<{ color: string }> = ({ color }) => {
    const { token } = theme.useToken();
    return (
        <div className="color-icon">
            <div className="color-icon-transparent" />
            <div className="color-icon-color" />
            <style jsx>
                {`
                    .color-icon {
                        width: 0.72em;
                        height: 0.72em;
                        position: relative;
                    }
                    .color-icon-color {
                        width: 100%;
                        height: 100%;
                        position: absolute;
                        background-color: ${color};
                        border-radius: ${token.borderRadiusXS}px;
                        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
                    }
                    .color-icon-transparent {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        background-image: conic-gradient(
                            rgba(0, 0, 0, 0.06) 25%,
                            transparent 25% 50%,
                            rgba(0, 0, 0, 0.06) 50% 75%,
                            transparent 75% 100%
                        );
                        border-radius: ${token.borderRadiusXS}px;
                    }
                `}
            </style>
        </div>
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
            {/* <ToolbarTip title={<FormattedMessage id="draw.white" />}>
                <Button
                    onClick={() => {
                        setColor('#ffffff', true);
                    }}
                    type="text"
                    icon={<ColorIcon borderColor="#bfbfbf" color="#ffffff" />}
                />
            </ToolbarTip> */}
        </>
    );
};

export const LineColorPicker = withPickerBase(
    LineColorPickerComponent,
    'lineColorPicker',
    defaultLineColorPickerValue,
);
