import { Radio } from 'antd';
import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';

export const buttonIconSelectRadioRender: NonNullable<
    NonNullable<ExcalidrawPropsCustomOptions['pickerRenders']>['buttonIconSelectRadioRender']
> = (props) => {
    return (
        <Radio.Button
            key={props.key}
            title={props.title}
            data-testid={props.dataTestid}
            onClick={props.onChange}
            name={props.name}
            value={props.value}
            checked={props.checked}
        >
            <div className="radio-button-icon">{props.children}</div>
        </Radio.Button>
    );
};
