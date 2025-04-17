import { Radio } from 'antd';
import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';

export const buttonIconSelectRender: NonNullable<
    ExcalidrawPropsCustomOptions['pickerRenders']
>['buttonIconSelectRender'] = (props) => {
    return (
        <Radio.Group value={props.value} style={{ padding: '.25rem 0' }}>
            {props.options.map((option) => (
                <Radio.Button
                    key={option.text}
                    title={option.text}
                    data-testid={option.testId}
                    name={props.type === 'button' ? '' : props.group}
                    onClick={(e) => {
                        if (props.type === 'button') {
                            props.onClick(option.value, e as React.MouseEvent<HTMLButtonElement>);
                        } else {
                            props.onChange(option.value);
                        }
                    }}
                    value={option.value}
                    checked={props.value === option.value}
                >
                    <div className="radio-button-icon">{option.icon}</div>
                </Radio.Button>
            ))}
        </Radio.Group>
    );
};
