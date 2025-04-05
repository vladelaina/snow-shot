import { Select } from 'antd';
import { withPickerBase } from './pickerBase';
import { DefaultOptionType } from 'antd/es/select';
import { DrawArrowIcon, DrawLineIcon } from '@/components/icons';
import { ArrowStyleConfig } from '@/core/canvas/canvasDrawArrow';
import { vec2, Vec2 } from 'gl-matrix';
import { ArrowConfigValue, defaultArrowConfigValue } from './defaultValues';

const configMap: Map<string, ArrowStyleConfig> = new Map();

configMap.set(defaultArrowConfigValue.configId, {
    id: defaultArrowConfigValue.configId,
    icon: <DrawArrowIcon style={{ fontSize: '32px' }} />,
    calculatePath: (() => {
        const direction = vec2.create();
        const perpendicular = vec2.create();
        const headBase = vec2.create();
        const headBaseLeft = vec2.create();
        const headBaseRight = vec2.create();
        const leftPoint = vec2.create();
        const rightPoint = vec2.create();
        const quantizedStop = vec2.create();

        return (start: Vec2, stop: Vec2, width: number, minAngle?: number): Vec2[] => {
            vec2.subtract(direction, stop, start);
            const magnitude = vec2.magnitude(direction);
            vec2.normalize(direction, direction);

            // 如果指定了最小角度，计算量化后的方向
            if (minAngle && minAngle > 0) {
                // 计算当前角度（弧度）
                const currentAngle = Math.atan2(direction[1], direction[0]);
                // 转换为度数并量化到最近的 minAngle 倍数
                const degrees = currentAngle * 180 / Math.PI;
                const quantizedDegrees = Math.round(degrees / minAngle) * minAngle;
                // 转回弧度
                const quantizedAngle = quantizedDegrees * Math.PI / 180;
                
                // 使用量化后的角度更新方向向量
                direction[0] = Math.cos(quantizedAngle);
                direction[1] = Math.sin(quantizedAngle);

                // 计算量化后的终点
                vec2.scale(direction, direction, magnitude);
                vec2.add(quantizedStop, start, direction);
                vec2.normalize(direction, direction);
                stop = quantizedStop;
            }
            
            perpendicular[0] = -direction[1];
            perpendicular[1] = direction[0];

            const headHeight = width * 2.4;
            const headWidth = width;
            const shaftWidth = width * 0.42;

            vec2.scaleAndAdd(headBase, stop, direction, -headHeight);
            vec2.scaleAndAdd(headBaseLeft, headBase, perpendicular, shaftWidth);
            vec2.scaleAndAdd(headBaseRight, headBase, perpendicular, -shaftWidth);
            vec2.scaleAndAdd(leftPoint, headBase, perpendicular, headWidth);
            vec2.scaleAndAdd(rightPoint, headBase, perpendicular, -headWidth);

            return [start, headBaseLeft, leftPoint, stop, rightPoint, headBaseRight, start];
        };
    })(),
});
configMap.set('arrow-style-2', {
    id: 'arrow-style-2',
    icon: <DrawLineIcon style={{ fontSize: '32px' }} />,
    calculatePath: (() => {
        const direction = vec2.create();
        const perpendicular = vec2.create();
        const startLeft = vec2.create();
        const startRight = vec2.create();
        const stopLeft = vec2.create();
        const stopRight = vec2.create();
        const quantizedStop = vec2.create();

        return (start: Vec2, stop: Vec2, width: number, minAngle?: number): Vec2[] => {
            vec2.subtract(direction, stop, start);
            const magnitude = vec2.magnitude(direction);
            vec2.normalize(direction, direction);

            // 如果指定了最小角度，计算量化后的方向
            if (minAngle && minAngle > 0) {
                const currentAngle = Math.atan2(direction[1], direction[0]);
                const degrees = currentAngle * 180 / Math.PI;
                const quantizedDegrees = Math.round(degrees / minAngle) * minAngle;
                const quantizedAngle = quantizedDegrees * Math.PI / 180;
                
                direction[0] = Math.cos(quantizedAngle);
                direction[1] = Math.sin(quantizedAngle);

                vec2.scale(direction, direction, magnitude);
                vec2.add(quantizedStop, start, direction);
                vec2.normalize(direction, direction);
                stop = quantizedStop;
            }

            perpendicular[0] = -direction[1];
            perpendicular[1] = direction[0];

            const halfWidth = width * 0.5;
            vec2.scaleAndAdd(startLeft, start, perpendicular, halfWidth);
            vec2.scaleAndAdd(startRight, start, perpendicular, -halfWidth);
            vec2.scaleAndAdd(stopLeft, stop, perpendicular, halfWidth);
            vec2.scaleAndAdd(stopRight, stop, perpendicular, -halfWidth);

            return [startLeft, stopLeft, stopRight, startRight, startLeft];
        };
    })(),
});

export const getArrowStyleConfig = (configId: string) => {
    return configMap.get(configId) ?? configMap.get(defaultArrowConfigValue.configId)!;
};

const ArrowConfigPickerComponent: React.FC<{
    value: ArrowConfigValue;
    setValue: React.Dispatch<React.SetStateAction<ArrowConfigValue>>;
}> = ({ value, setValue }) => {
    return (
        <>
            <Select
                size="small"
                value={value.configId}
                popupClassName="toolbar_arrow-config-picker_select-popup"
                style={{ width: 64 }}
                onChange={(value) => {
                    setValue({ configId: value });
                }}
                options={configMap
                    .values()
                    .toArray()
                    .map((config): DefaultOptionType => {
                        return {
                            value: config.id,
                            label: (
                                <div style={{ display: 'flex', alignItems: 'center', height: 21 }}>
                                    {config.icon}
                                </div>
                            ),
                        };
                    })}
            />
            <style jsx global>
                {`
                    .toolbar_font-family-picker_select-popup {
                        width: 200px !important;
                    }
                `}
            </style>
        </>
    );
};

export const ArrowConfigPicker = withPickerBase(
    ArrowConfigPickerComponent,
    'arrowConfigPicker',
    defaultArrowConfigValue,
);
