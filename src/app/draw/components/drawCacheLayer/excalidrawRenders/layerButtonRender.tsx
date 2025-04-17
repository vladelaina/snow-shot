import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';
import React from 'react';
import { Button } from 'antd';

export const layerButtonRender: NonNullable<
    NonNullable<ExcalidrawPropsCustomOptions['pickerRenders']>['layerButtonRender']
> = (props) => {
    const { onClick, title, children } = props;
    return (
        <Button
            key={title}
            title={title}
            onClick={onClick}
            style={{ margin: '0.25rem 0' }}
            icon={<div className="radio-button-icon">{children}</div>}
        />
    );
};
