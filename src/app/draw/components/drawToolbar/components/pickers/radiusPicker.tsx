import { RadiusIcon } from '@/components/icons';
import { Button, Tooltip } from 'antd';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { withPickerBase } from './pickerBase';

const WidthIcon: React.FC<{ width: number }> = ({ width }) => {
    const maxShapeWidth = 0;
    const showWidth = width > maxShapeWidth ? 0 : width;
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

export type RadiusPickerValue = {
    radius: number;
};

export const defaultRadiusPickerValue: RadiusPickerValue = {
    radius: 3,
};

const minRadius = 1;
const maxRadius = 83;
const defaultRadius = 3;

const RadiusPickerComponent: React.FC<{
    value: RadiusPickerValue;
    setValue: React.Dispatch<React.SetStateAction<RadiusPickerValue>>;
}> = ({ value, setValue }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <>
            <Tooltip
                title={<FormattedMessage id="draw.radiusDesc" values={{ radius: value.radius }} />}
            >
                <Button
                    icon={isHovered ? <WidthIcon width={value.radius} /> : <RadiusIcon />}
                    type="dashed"
                    onClick={() => setValue({ radius: defaultRadius })}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onWheel={(e) => {
                        if (!isHovered) {
                            return;
                        }

                        let newRadius = value.radius + (e.deltaY > 0 ? -1 : 1);
                        if (newRadius < minRadius) {
                            newRadius = minRadius;
                        } else if (newRadius > maxRadius) {
                            newRadius = maxRadius;
                        }

                        setValue({ radius: newRadius });
                    }}
                />
            </Tooltip>
        </>
    );
};

export const RadiusPicker = withPickerBase(
    RadiusPickerComponent,
    'radiusPicker',
    defaultRadiusPickerValue,
);
