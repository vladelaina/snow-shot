import { Button } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';
import { RadiusSettingOutlined } from '@ant-design/icons';
import { WidthIcon } from './lineWidthPicker';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { defaultRadiusPickerValue, RadiusPickerValue } from './defaultValues';

const minRadius = 1;
const maxRadius = 83;
const defaultRadius = 3;

const RadiusPickerComponent: React.FC<{
    value: RadiusPickerValue;
    setValue: React.Dispatch<React.SetStateAction<RadiusPickerValue>>;
}> = ({ value, setValue }) => {
    const isHoveredRef = useRef(false);
    const [isHovered, _setIsHovered] = useState(false);
    const setIsHovered = useCallback(
        (isHovered: boolean) => {
            isHoveredRef.current = isHovered;
            _setIsHovered(isHovered);
        },
        [_setIsHovered],
    );

    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const onWheel = useCallback(
        (e: React.WheelEvent<HTMLButtonElement>) => {
            if (!isHoveredRef.current) {
                return;
            }

            let newRadius = valueRef.current.radius + (e.deltaY > 0 ? -1 : 1);
            if (newRadius < minRadius) {
                newRadius = minRadius;
            } else if (newRadius > maxRadius) {
                newRadius = maxRadius;
            }

            setValue({ radius: newRadius });
        },
        [setValue],
    );
    const onWheelRender = useCallbackRender(onWheel);

    return (
        <>
            <ToolbarTip
                title={<FormattedMessage id="draw.radiusDesc" values={{ radius: value.radius }} />}
            >
                <Button
                    icon={
                        isHovered ? (
                            <WidthIcon width={value.radius} maxWidth={0} />
                        ) : (
                            <RadiusSettingOutlined style={{ fontSize: '0.83em' }} />
                        )
                    }
                    type="dashed"
                    onClick={() => setValue({ radius: defaultRadius })}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onWheel={onWheelRender}
                />
            </ToolbarTip>
        </>
    );
};

export const RadiusPicker = withPickerBase(
    RadiusPickerComponent,
    'radiusPicker',
    defaultRadiusPickerValue,
    1000,
);
