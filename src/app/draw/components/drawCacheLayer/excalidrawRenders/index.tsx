import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';
import { layoutMenuRender } from './layoutMenuRender';
import { colorPickerTopPickesButtonRender } from './colorPickerTopPickesButtonRender';
import { colorPickerPopoverRender } from './colorPickerPopoverRender';
import { ButtonIcon } from './buttonIcon';
import { buttonIconSelectRadioRender } from './buttonIconSelectRadioRender';
import { rangeRender } from './rangeRender';
import { layerButtonRender } from './layerButtonRender';
import { ButtonList } from './buttonList';
import { RadioSelection } from './radioSelection';

export const pickerRenders: ExcalidrawPropsCustomOptions['pickerRenders'] = {
    colorPickerTopPickesButtonRender,
    colorPickerPopoverRender,
    buttonIconSelectRadioRender,
    CustomButtonIcon: ButtonIcon,
    RadioSelection,
    rangeRender,
    layerButtonRender,
    elementStrokeColors: ['#1e1e1e', '#f5222d', '#52c41a', '#1677ff', '#faad14'],
    elementBackgroundColors: ['transparent', '#ffccc7', '#d9f7be', '#bae0ff', '#fff1b8'],
    ButtonList: ButtonList,
};

export const layoutRenders: ExcalidrawPropsCustomOptions['layoutRenders'] = {
    menuRender: layoutMenuRender,
};
