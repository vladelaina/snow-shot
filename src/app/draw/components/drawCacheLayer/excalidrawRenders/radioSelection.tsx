import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';
import { Radio } from 'antd';

export const RadioSelection = ((props) => {
    if (props.type === 'button') {
        return (
            <Radio.Group value={props.value}>
                {props.options.map((option) => (
                    <Radio.Button
                        key={option.text}
                        title={option.text}
                        value={option.value}
                        checked={option.active ?? props.value === option.value}
                        onClick={(event) =>
                            props.onClick(
                                option.value,
                                event as React.MouseEvent<HTMLButtonElement>,
                            )
                        }
                    >
                        <div className="radio-button-icon">{option.icon}</div>
                    </Radio.Button>
                ))}
            </Radio.Group>
        );
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
