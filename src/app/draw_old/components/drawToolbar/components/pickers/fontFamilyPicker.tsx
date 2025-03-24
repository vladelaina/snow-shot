import { Select } from 'antd';
import { withPickerBase } from './pickerBase';
import { platform } from 'os';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export type FontFamilyPickerValue = {
    value: string;
};

export const defaultFontFamilyPickerValue: FontFamilyPickerValue = {
    value: '',
};

const windowsFontFamilies = [
    'Arial',
    'Arial Black',
    'Bahnschrift',
    'Calibri',
    'Cambria',
    'Cambria Math',
    'Candara',
    'Comic Sans MS',
    'Consolas',
    'Constantia',
    'Corbel',
    'Courier New',
    'Ebrima',
    'Franklin Gothic Medium',
    'Gabriola',
    'Gadugi',
    'Georgia',
    'HoloLens MDL2 Assets',
    'Impact',
    'Ink Free',
    'Javanese Text',
    'Leelawadee UI',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Malgun Gothic',
    'Marlett',
    'Microsoft Himalaya',
    'Microsoft JhengHei',
    'Microsoft New Tai Lue',
    'Microsoft PhagsPa',
    'Microsoft Sans Serif',
    'Microsoft Tai Le',
    'Microsoft YaHei',
    'Microsoft Yi Baiti',
    'MingLiU-ExtB',
    'Mongolian Baiti',
    'MS Gothic',
    'MV Boli',
    'Myanmar Text',
    'Nirmala UI',
    'Palatino Linotype',
    'Segoe MDL2 Assets',
    'Segoe Print',
    'Segoe Script',
    'Segoe UI',
    'Segoe UI Historic',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'SimSun',
    'Sitka',
    'Sylfaen',
    'Symbol',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Webdings',
    'Wingdings',
    'Yu Gothic',
];

const macOsFontFamilies = [
    'American Typewriter',
    'Andale Mono',
    'Arial',
    'Arial Black',
    'Arial Narrow',
    'Arial Rounded MT Bold',
    'Arial Unicode MS',
    'Avenir',
    'Avenir Next',
    'Avenir Next Condensed',
    'Baskerville',
    'Big Caslon',
    'Bodoni 72',
    'Bodoni 72 Oldstyle',
    'Bodoni 72 Smallcaps',
    'Bradley Hand',
    'Brush Script MT',
    'Chalkboard',
    'Chalkboard SE',
    'Chalkduster',
    'Charter',
    'Cochin',
    'Comic Sans MS',
    'Copperplate',
    'Courier',
    'Courier New',
    'Didot',
    'DIN Alternate',
    'DIN Condensed',
    'Futura',
    'Geneva',
    'Georgia',
    'Gill Sans',
    'Helvetica',
    'Helvetica Neue',
    'Herculanum',
    'Hoefler Text',
    'Impact',
    'Lucida Grande',
    'Luminari',
    'Marker Felt',
    'Menlo',
    'Microsoft Sans Serif',
    'Monaco',
    'Noteworthy',
    'Optima',
    'Palatino',
    'Papyrus',
    'Phosphate',
    'Rockwell',
    'Savoye LET',
    'SignPainter',
    'Skia',
    'Snell Roundhand',
    'Tahoma',
    'Times',
    'Times New Roman',
    'Trattatello',
    'Trebuchet MS',
    'Verdana',
    'Zapfino',
];

const FontFamilyPickerComponent: React.FC<{
    value: FontFamilyPickerValue;
    setValue: React.Dispatch<React.SetStateAction<FontFamilyPickerValue>>;
}> = ({ value, setValue }) => {
    const intl = useIntl();
    const fontFamiliesOptions = useMemo(() => {
        const list = platform.name === 'Safari' ? macOsFontFamilies : windowsFontFamilies;
        const options = list.map((value) => {
            return {
                value,
                label: value,
                style: {
                    fontFamily: value,
                },
            };
        });

        options.push({
            value: '',
            label: intl.formatMessage({ id: 'draw.fontFamily.default' }),
            style: {
                fontFamily: 'default',
            },
        });

        return options;
    }, [intl]);
    return (
        <>
            <Select
                size="small"
                value={value.value}
                popupClassName="toolbar_font-family-picker_select-popup"
                style={{ width: 108, fontFamily: value.value ? value.value : undefined }}
                onChange={(value) => {
                    setValue({ value });
                }}
                options={fontFamiliesOptions}
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

export const FontFamilyPicker = withPickerBase(
    FontFamilyPickerComponent,
    'fontFamilyPicker',
    defaultFontFamilyPickerValue,
);
