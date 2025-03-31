import { AppSettingsContext } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Modal } from 'antd';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { JSX } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FormattedMessage } from 'react-intl';
import { ToolbarTip } from '../../../../../components/toolbarTip';
import { createPublisher } from '@/hooks/useStatePublisher';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawingPublisher } from '..';

export type KeyEventValue = {
    hotKey: string;
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
    },
    [KeyEventKey.SelectTool]: {
        hotKey: 'S',
    },
    [KeyEventKey.RectTool]: {
        hotKey: '1',
    },
    [KeyEventKey.EllipseTool]: {
        hotKey: '2',
    },
    [KeyEventKey.ArrowTool]: {
        hotKey: '3',
    },
    [KeyEventKey.PenTool]: {
        hotKey: '4',
    },
    [KeyEventKey.HighlightTool]: {
        hotKey: '5',
    },
    [KeyEventKey.TextTool]: {
        hotKey: '6, T',
    },
    [KeyEventKey.MosaicTool]: {
        hotKey: '7',
    },
    [KeyEventKey.EraserTool]: {
        hotKey: '8, E',
    },
    [KeyEventKey.UndoTool]: {
        hotKey: 'Ctrl+Z',
    },
    [KeyEventKey.RedoTool]: {
        hotKey: 'Ctrl+Y',
    },
    [KeyEventKey.CancelTool]: {
        hotKey: 'Escape',
    },
    [KeyEventKey.LockWidthHeightPicker]: {
        hotKey: 'Shift',
    },
    [KeyEventKey.RemoveTool]: {
        hotKey: 'Delete',
    },
    [KeyEventKey.ColorPickerCopy]: {
        hotKey: 'Ctrl+C',
    },
    [KeyEventKey.ColorPickerMoveUp]: {
        hotKey: 'Ctrl+W, ArrowUp',
    },
    [KeyEventKey.ColorPickerMoveDown]: {
        hotKey: 'Ctrl+S, ArrowDown',
    },
    [KeyEventKey.ColorPickerMoveLeft]: {
        hotKey: 'Ctrl+A, ArrowLeft',
    },
    [KeyEventKey.ColorPickerMoveRight]: {
        hotKey: 'Ctrl+D, ArrowRight',
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

export const EnableKeyEventPublisher = createPublisher<boolean>(false);

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
