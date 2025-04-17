import { Button } from 'antd';
import { ColorIcon } from '../../drawToolbar/components/pickers/lineColorPicker';
import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';

export const colorPickerTopPickesButtonRender: NonNullable<
    ExcalidrawPropsCustomOptions['pickerRenders']
>['colorPickerTopPickesButtonRender'] = (props) => {
    const { key, color, onClick, dataTestid, active } = props;

    return (
        <Button
            key={key}
            type={active ? 'default' : 'text'}
            variant={active ? 'outlined' : 'text'}
            title={color}
            size="small"
            onClick={onClick}
            data-testid={dataTestid}
            icon={<ColorIcon color={color} />}
            style={{ fontSize: 24 }}
        />
    );
};
