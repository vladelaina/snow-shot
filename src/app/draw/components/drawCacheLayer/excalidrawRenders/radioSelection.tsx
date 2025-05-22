import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';
import { ButtonIcon } from './buttonIcon';
import { Radio } from 'antd';

export const RadioSelection = ((props) => {
    if (props.type === 'button') {
        return props.options.map((option) => (
            <ButtonIcon
                key={option.text}
                icon={option.icon}
                title={option.text}
                testId={option.testId}
                active={option.active ?? props.value === option.value}
                onClick={(event) => props.onClick(option.value, event)}
            />
        ));
    }

    return (
        <Radio.Group value={props.value}>
            {props.options.map((option) => (
                <Radio.Button
                    name={props.group}
                    key={option.text}
                    title={option.text}
                    value={option.value}
                    checked={props.value === option.value}
                    onChange={() => props.onChange(option.value)}
                    data-testid={option.testId}
                >
                    <div className="radio-button-icon">{option.icon}</div>
                </Radio.Button>
            ))}
        </Radio.Group>
    );
}) as NonNullable<ExcalidrawPropsCustomOptions['pickerRenders']>['RadioSelection'];
