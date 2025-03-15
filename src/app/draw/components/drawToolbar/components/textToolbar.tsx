import { useContext, useEffect } from 'react';
import {
    defaultLineColorPickerValue,
    LineColorPicker,
    LineColorPickerValue,
} from './pickers/lineColorPicker';
import * as fabric from 'fabric';
import { DrawContext } from '@/app/draw/page';
import { defaultFontSizePickerValue, FontSizePicker } from './pickers/fontSizePicker';
import { useStateRef } from '@/hooks/useStateRef';
import {
    defaultEnableBoldValue,
    EnableBoldPicker,
    EnableBoldValue,
} from './pickers/enableBoldPicker';
import {
    defaultEnableItalicValue,
    EnableItalicPicker,
    EnableItalicValue,
} from './pickers/enableItalicPicker';
import {
    defaultEnableStrikethroughValue,
    EnableStrikethroughPicker,
    EnableStrikethroughValue,
} from './pickers/enableStrikethroughPicker';
import {
    defaultEnableUnderlineValue,
    EnableUnderlinePicker,
    EnableUnderlineValue,
} from './pickers/enableUnderlinePicker';
import {
    defaultFontFamilyPickerValue,
    FontFamilyPicker,
    FontFamilyPickerValue,
} from './pickers/fontFamilyPicker';

export const TextToolbar: React.FC = () => {
    const { fabricRef } = useContext(DrawContext);
    const [, setColor, colorRef] = useStateRef<LineColorPickerValue>(defaultLineColorPickerValue);
    const [, setFontSize, fontSizeRef] = useStateRef(defaultFontSizePickerValue);
    const [, setEnableBold, enableBoldRef] = useStateRef<EnableBoldValue>(defaultEnableBoldValue);
    const [, setEnableItalic, enableItalicRef] =
        useStateRef<EnableItalicValue>(defaultEnableItalicValue);
    const [, setEnableStrikethrough, enableStrikethroughRef] =
        useStateRef<EnableStrikethroughValue>(defaultEnableStrikethroughValue);
    const [, setEnableUnderline, enableUnderlineRef] = useStateRef<EnableUnderlineValue>(
        defaultEnableUnderlineValue,
    );
    const [, setFontFamily, fontFamilyRef] = useStateRef<FontFamilyPickerValue>(
        defaultFontFamilyPickerValue,
    );

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        canvas.isDrawingMode = false;

        const handleCanvasClick = (event: fabric.TEvent<fabric.TPointerEvent>) => {
            if (!canvas) return;

            canvas.discardActiveObject();

            const pointer = canvas.getScenePoint(event.e);
            const newText = new fabric.IText('', {
                left: pointer.x,
                top: pointer.y,
                fill: colorRef.current.color,
                fontSize: fontSizeRef.current.size,
                selectable: true,
                editable: true,
                fontWeight: enableBoldRef.current.enable ? 'bold' : undefined,
                fontStyle: enableItalicRef.current.enable ? 'italic' : 'normal',
                underline: enableUnderlineRef.current.enable,
                linethrough: enableStrikethroughRef.current.enable,
                fontFamily: fontFamilyRef.current.value,
            });

            canvas.add(newText);
            canvas.setActiveObject(newText);
            newText.enterEditing();
        };

        canvas.on('mouse:down', handleCanvasClick);

        return () => {
            canvas.off('mouse:down', handleCanvasClick);
        };
    }, [
        fabricRef,
        colorRef,
        fontSizeRef,
        enableBoldRef,
        enableItalicRef,
        enableUnderlineRef,
        enableStrikethroughRef,
        fontFamilyRef,
    ]);

    return (
        <>
            <EnableBoldPicker onChange={setEnableBold} toolbarLocation="text" />
            <EnableItalicPicker onChange={setEnableItalic} toolbarLocation="text" />
            <EnableUnderlinePicker onChange={setEnableUnderline} toolbarLocation="text" />
            <EnableStrikethroughPicker onChange={setEnableStrikethrough} toolbarLocation="text" />

            <div className="draw-toolbar-splitter" />

            <FontFamilyPicker onChange={setFontFamily} toolbarLocation="text" />
            <FontSizePicker onChange={setFontSize} toolbarLocation="text" />

            <div className="draw-toolbar-splitter" />

            {/* 颜色选择器 */}
            <LineColorPicker onChange={setColor} toolbarLocation="text" />
        </>
    );
};
