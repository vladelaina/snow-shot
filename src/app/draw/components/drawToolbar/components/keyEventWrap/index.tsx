import { AppSettingsContext } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Modal } from 'antd';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { JSX } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FormattedMessage } from 'react-intl';
import { ToolbarTip } from '../../../../../../components/toolbarTip';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawingPublisher } from '../..';
import { EnableKeyEventPublisher } from './extra';

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
    EllipseTool = 'ellipseTool',
    ArrowTool = 'arrowTool',
    PenTool = 'penTool',
    HighlightTool = 'highlightTool',
    MosaicTool = 'mosaicTool',
    TextTool = 'textTool',
    EraserTool = 'eraserTool',
    UndoTool = 'undoTool',
    RedoTool = 'redoTool',
    CancelTool = 'cancelTool',
    LockWidthHeightPicker = 'lockWidthHeightPicker',
    LockAnglePicker = 'lockAnglePicker',
    RemoveTool = 'removeTool',
    ColorPickerCopy = 'colorPickerCopy',
    ColorPickerMoveUp = 'colorPickerMoveUp',
    ColorPickerMoveDown = 'colorPickerMoveDown',
    ColorPickerMoveLeft = 'colorPickerMoveLeft',
    ColorPickerMoveRight = 'colorPickerMoveRight',
    // PenDrawLine = 'penDrawLine',
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
    [KeyEventKey.ArrowTool]: {
        hotKey: '3',
        unique: true,
    },
    [KeyEventKey.PenTool]: {
        hotKey: '4',
        unique: true,
    },
    [KeyEventKey.HighlightTool]: {
        hotKey: '5',
        unique: true,
    },
    [KeyEventKey.TextTool]: {
        hotKey: '6, T',
        unique: true,
    },
    [KeyEventKey.MosaicTool]: {
        hotKey: '7',
        unique: true,
    },
    [KeyEventKey.EraserTool]: {
        hotKey: '8, E',
        unique: true,
    },
    [KeyEventKey.UndoTool]: {
        hotKey: 'Ctrl+Z',
        unique: true,
    },
    [KeyEventKey.RedoTool]: {
        hotKey: 'Ctrl+Y',
        unique: true,
    },
    [KeyEventKey.CancelTool]: {
        hotKey: 'Escape',
        unique: true,
    },
    [KeyEventKey.LockWidthHeightPicker]: {
        hotKey: 'Shift',
    },
    [KeyEventKey.LockAnglePicker]: {
        hotKey: 'Shift',
    },
    [KeyEventKey.RemoveTool]: {
        hotKey: 'Delete',
        unique: true,
    },
    [KeyEventKey.ColorPickerCopy]: {
        hotKey: 'Ctrl+C',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveUp]: {
        hotKey: 'Ctrl+W, ArrowUp',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveDown]: {
        hotKey: 'Ctrl+S, ArrowDown',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveLeft]: {
        hotKey: 'Ctrl+A, ArrowLeft',
        unique: true,
    },
    [KeyEventKey.ColorPickerMoveRight]: {
        hotKey: 'Ctrl+D, ArrowRight',
        unique: true,
    },
    // [KeyEventKey.PenDrawLine]: {
    //     hotKey: 'Shift',
    // },
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

export const KeyEventWrap: React.FC<{
    onKeyDownEventPropName?: string;
    onKeyUpEventPropName?: string;
    onKeyDown?: () => void;
    onKeyUp?: () => void;
    children: JSX.Element;
    componentKey: KeyEventKey;
    confirmTip?: React.ReactNode;
    disableOnDrawing?: boolean;
    enable?: boolean;
}> = ({
    onKeyDownEventPropName,
    onKeyUpEventPropName,
    onKeyDown,
    onKeyUp,
    children,
    componentKey,
    confirmTip,
    disableOnDrawing = false,
    enable,
}) => {
    const enableRef = useRef<boolean | undefined>(enable);
    useEffect(() => {
        enableRef.current = enable;
    }, [enable]);

    const [modal, contextHolder] = Modal.useModal();

    const appSettings = useContext(AppSettingsContext);
    const [keyEventValue, setKeyEventValue] = useState(
        appSettings?.drawToolbarKeyEvent?.[componentKey] ?? defaultKeyEventSettings[componentKey],
    );
    const appSettingsLoading = useRef(true);
    const [getEnableKeyEvent] = useStateSubscriber(EnableKeyEventPublisher, () => {});
    const [getDrawing] = useStateSubscriber(DrawingPublisher, () => {});
    const isEnable = useCallback(() => {
        if (enableRef.current !== undefined) {
            return enableRef.current;
        }

        return getEnableKeyEvent() && (disableOnDrawing ? !getDrawing() : true);
    }, [disableOnDrawing, getEnableKeyEvent, getDrawing]);
    useAppSettingsLoad(() => {
        appSettingsLoading.current = false;
    });
    useEffect(() => {
        if (appSettingsLoading.current) {
            return;
        }

        setKeyEventValue(
            appSettings?.drawToolbarKeyEvent?.[componentKey] ??
                defaultKeyEventSettings[componentKey],
        );
    }, [appSettings, componentKey]);

    const confirming = useRef(false);
    const keyEvent = useCallback(
        async (
            element: JSX.Element,
            eventName: string | undefined,
            event: (() => void) | undefined,
        ) => {
            if (confirmTip) {
                if (confirming.current) {
                    return;
                }

                confirming.current = true;
                const confirm = await modal.confirm({
                    content: confirmTip,
                    centered: true,
                });
                confirming.current = false;

                if (!confirm) {
                    return;
                }
            }

            if (event) {
                event();
                return;
            }

            if (!eventName) {
                return;
            }

            event = element.props[eventName];
            if (typeof event !== 'function') {
                return;
            }

            return event();
        },
        [confirmTip, modal],
    );
    const onKeyDownChildren = useCallback(() => {
        if (!isEnable()) {
            return;
        }

        keyEvent(children, onKeyDownEventPropName, onKeyDown);
    }, [children, isEnable, keyEvent, onKeyDown, onKeyDownEventPropName]);
    const onKeyUpChildren = useCallback(() => {
        if (!isEnable()) {
            return;
        }

        keyEvent(children, onKeyUpEventPropName, onKeyUp);
    }, [children, isEnable, keyEvent, onKeyUp, onKeyUpEventPropName]);

    useHotkeys(keyEventValue.hotKey, onKeyDownChildren, {
        keydown: true,
        keyup: false,
        preventDefault: true,
    });
    useHotkeys(keyEventValue.hotKey, onKeyUpChildren, {
        keydown: false,
        keyup: true,
        preventDefault: true,
    });
    return (
        <>
            <ToolbarTip
                destroyTooltipOnHide
                title={
                    <FormattedMessage
                        id="draw.keyEventTooltip"
                        values={{
                            message: (
                                <FormattedMessage
                                    key={componentKey + keyEventValue.hotKey}
                                    id={defaultKeyEventComponentConfig[componentKey].messageId}
                                />
                            ),
                            key: keyEventValue.hotKey,
                        }}
                    />
                }
            >
                {React.cloneElement(children, {
                    disabled: children.props.disabled,
                })}
            </ToolbarTip>
            {contextHolder}
        </>
    );
};
