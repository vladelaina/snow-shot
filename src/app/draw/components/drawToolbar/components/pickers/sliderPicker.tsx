import { Slider, theme } from 'antd';
import { withPickerBase } from './pickerBase';
import { useEffect, useState } from 'react';
import { defaultSliderPickerValue, SliderPickerValue } from './defaultValues';  

const SliderPickerComponent: React.FC<{
    value: SliderPickerValue;
    setValue: React.Dispatch<React.SetStateAction<SliderPickerValue>>;
}> = ({ value, setValue }) => {
    const { token } = theme.useToken();
    const [tempValue, setTempValue] = useState(value.value);
    useEffect(() => {
        setTempValue(value.value);
    }, [value.value]);
    return (
        <>
            <Slider
                min={0}
                max={100}
                onChange={(value) => setTempValue(value)}
                onChangeComplete={(value) => setValue({ value })}
                value={tempValue}
                step={1}
                style={{ width: '100px', margin: `0 ${token.marginXXS}px` }}
            />
        </>
    );
};

export const SliderPicker = withPickerBase(
    SliderPickerComponent,
    'sliderPicker',
    defaultSliderPickerValue,
);
