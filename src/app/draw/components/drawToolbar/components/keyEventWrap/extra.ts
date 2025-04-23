import { createPublisher } from '@/hooks/useStatePublisher';

export const EnableKeyEventPublisher = createPublisher<boolean>(false);

export type KeyEventValue = {
    hotKey: string;
    unique?: boolean;
};

export type KeyEventComponentValue = KeyEventValue & {
    messageId: string;
};

export enum KeyEventKey {
    MoveTool = 'moveTool',
    SelectTool = 'selectTool',
    RectTool = 'rectTool',
    DiamondTool = 'diamondTool',
    EllipseTool = 'ellipseTool',
    ArrowTool = 'arrowTool',
    LineTool = 'lineTool',
    PenTool = 'penTool',
    // HighlightTool = 'highlightTool',
    BlurTool = 'blurTool',
    TextTool = 'textTool',
    EraserTool = 'eraserTool',
    UndoTool = 'undoTool',
    RedoTool = 'redoTool',
    CancelTool = 'cancelTool',
    RemoveTool = 'removeTool',
    ColorPickerCopy = 'colorPickerCopy',
    ColorPickerMoveUp = 'colorPickerMoveUp',
    ColorPickerMoveDown = 'colorPickerMoveDown',
    ColorPickerMoveLeft = 'colorPickerMoveLeft',
    ColorPickerMoveRight = 'colorPickerMoveRight',
    ResizeFromCenterPicker = 'resizeFromCenterPicker',
    MaintainAspectRatioPicker = 'maintainAspectRatioPicker',
    RotateWithDiscreteAnglePicker = 'rotateWithDiscreteAnglePicker',
    AutoAlignPicker = 'autoAlignPicker',
}

export const defaultKeyEventSettings: Record<KeyEventKey, KeyEventValue> = {
    [KeyEventKey.MoveTool]: {
        hotKey: 'M',
        unique: true,
    },
    [KeyEventKey.SelectTool]: {
        hotKey: 'S',
        unique: true,
    },
    [KeyEventKey.RectTool]: {
        hotKey: '1',
        unique: true,
    },
    [KeyEventKey.EllipseTool]: {
        hotKey: '2',
        unique: true,
    },
    [KeyEventKey.DiamondTool]: {
        hotKey: '3',
        unique: true,
    },
    [KeyEventKey.ArrowTool]: {
        hotKey: '4',
        unique: true,
    },
    [KeyEventKey.LineTool]: {
        hotKey: '5',
        unique: true,
    },
    [KeyEventKey.PenTool]: {
        hotKey: '6',
        unique: true,
    },
    [KeyEventKey.TextTool]: {
        hotKey: '7, T',
        unique: true,
    },
    [KeyEventKey.BlurTool]: {
        hotKey: '8',
        unique: true,
    },
    [KeyEventKey.EraserTool]: {
        hotKey: '9, E',
        unique: true,
    },
    [KeyEventKey.UndoTool]: {
        hotKey: 'Control+Z',
        unique: true,
    },
    [KeyEventKey.RedoTool]: {
        hotKey: 'Control+Y',
        unique: true,
    },
    [KeyEventKey.CancelTool]: {
        hotKey: 'Escape',
        unique: true,
    },
    [KeyEventKey.ResizeFromCenterPicker]: {
        hotKey: 'Alt',
    },
    [KeyEventKey.MaintainAspectRatioPicker]: {
        hotKey: 'Shift',
    },
    [KeyEventKey.RotateWithDiscreteAnglePicker]: {
        hotKey: 'Shift',
    },
    [KeyEventKey.AutoAlignPicker]: {
        hotKey: 'Control',
        unique: true,
    },
    [KeyEventKey.RemoveTool]: {
        hotKey: 'Delete',
        unique: true,
    },
    [KeyEventKey.ColorPickerCopy]: {
        hotKey: 'Control+C',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveUp]: {
        hotKey: 'Control+W, ArrowUp',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveDown]: {
        hotKey: 'Control+S, ArrowDown',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveLeft]: {
        hotKey: 'Control+A, ArrowLeft',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveRight]: {
        hotKey: 'Control+D, ArrowRight',
        unique: true,
    },
};

export const keyEventSettingsKeys = Object.keys(defaultKeyEventSettings);
export const defaultKeyEventComponentConfig: Record<KeyEventKey, KeyEventComponentValue> =
    keyEventSettingsKeys.reduce(
        (acc, key) => {
            acc[key as KeyEventKey] = {
                ...defaultKeyEventSettings[key as KeyEventKey],
                messageId: `draw.${key}`,
            };
            return acc;
        },
        {} as Record<KeyEventKey, KeyEventComponentValue>,
    );
