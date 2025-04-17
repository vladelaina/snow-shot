import { Slider, theme } from 'antd';
import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';

export const rangeRender: NonNullable<
    NonNullable<ExcalidrawPropsCustomOptions['pickerRenders']>['rangeRender']
> = (props) => {
    const { token } = theme.useToken();
    return (
        <Slider
            style={{ marginTop: token.marginSM, marginBottom: token.marginXXS }}
            min={props.min}
            max={props.max}
            step={props.step}
            value={props.value}
            onChange={props.onChange}
            tooltip={{ placement: 'bottom' }}
        />
    );
};
