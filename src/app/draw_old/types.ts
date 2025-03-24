export enum CaptureStep {
    Select = 'select',
    Draw = 'draw',
}

export enum DrawState {
    Idle = 'idle',
    Resize = 'resize',
    Select = 'select',
    Pen = 'pen',
    Arrow = 'arrow',
    Rect = 'rect',
    Ellipse = 'ellipse',
    Mosaic = 'mosaic',
    Eraser = 'eraser',
    Highlight = 'highlight',
    Text = 'text',
}

export const getMaskBackgroundColor = (darkMode: boolean) => {
    return darkMode ? '#434343' : '#000000';
};
