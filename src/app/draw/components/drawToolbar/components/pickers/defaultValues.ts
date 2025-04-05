export type SliderPickerValue = {
    value: number;
};

export const defaultSliderPickerValue: SliderPickerValue = {
    value: 30,
};

export type RadiusPickerValue = {
    radius: number;
};

export const defaultRadiusPickerValue: RadiusPickerValue = {
    radius: 3,
};

export type LockWidthHeightValue = {
    lock: boolean;
};

export const defaultLockWidthHeightValue: LockWidthHeightValue = {
    lock: false,
};

export type LockAngleValue = {
    lock: boolean;
    angle: number;
};

export const defaultLockAngleValue: LockAngleValue = {
    lock: false,
    angle: 0,
};

export type ArrowConfigValue = {
    configId: string;
};

export const defaultArrowConfigValue: ArrowConfigValue = {
    configId: 'arrow-style-1',
};

export type DrawRectValue = {
    enable: boolean;
};

export const defaultDrawRectValue: DrawRectValue = {
    enable: false,
};

export type EnableBlurValue = {
    blur: boolean;
};

export const defaultEnableBlurValue: EnableBlurValue = {
    blur: false,
};

export type EnableBoldValue = {
    enable: boolean;
};

export const defaultEnableBoldValue: EnableBoldValue = {
    enable: false,
};

export type EnableItalicValue = {
    enable: boolean;
};

export const defaultEnableItalicValue: EnableItalicValue = {
    enable: false,
};

export type EnableRadiusValue = {
    enable: boolean;
};

export const defaultEnableRadiusValue: EnableRadiusValue = {
    enable: true,
};

export type EnableStrikethroughValue = {
    enable: boolean;
};

export const defaultEnableStrikethroughValue: EnableStrikethroughValue = {
    enable: false,
};

export type EnableUnderlineValue = {
    enable: boolean;
};

export const defaultEnableUnderlineValue: EnableUnderlineValue = {
    enable: false,
};

export type FillShapePickerValue = {
    fill: boolean;
};

export const defaultFillShapePickerValue: FillShapePickerValue = {
    fill: false,
};

export type FontFamilyPickerValue = {
    value: string;
};

export const defaultFontFamilyPickerValue: FontFamilyPickerValue = {
    value: '',
};

export type FontSizePickerValue = {
    size: number;
};

export const defaultFontSizePickerValue: FontSizePickerValue = {
    size: 14,
};

export type LineColorPickerValue = {
    color: string;
};

export const defaultLineColorPickerValue: LineColorPickerValue = {
    color: '#f5222d',
};

export type LineWidthPickerValue = {
    width: number;
};

export const defaultLineWidthPickerValue: LineWidthPickerValue = {
    width: 5,
};
