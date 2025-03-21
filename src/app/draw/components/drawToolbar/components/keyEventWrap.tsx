import { AppSettingsContext } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Modal } from 'antd';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { JSX } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FormattedMessage } from 'react-intl';
import { ToolbarTip } from '../../toolbarTip';

export type KeyEventValue = {
    messageId: string;
    key: KeyboardEvent['key'];
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
}

export const defaultKeyEventSettings: Record<KeyEventKey, KeyEventValue> = {
    [KeyEventKey.MoveTool]: {
        messageId: 'draw.move',
        key: 'M',
    },
    [KeyEventKey.SelectTool]: {
        messageId: 'draw.select',
        key: 'S',
    },
    [KeyEventKey.RectTool]: {
        messageId: 'draw.rect',
        key: '1',
    },
    [KeyEventKey.EllipseTool]: {
        messageId: 'draw.ellipse',
        key: '2',
    },
    [KeyEventKey.ArrowTool]: {
        messageId: 'draw.arrow',
        key: '3',
    },
    [KeyEventKey.PenTool]: {
        messageId: 'draw.pen',
        key: '4',
    },
    [KeyEventKey.HighlightTool]: {
        messageId: 'draw.highlight',
        key: '5',
    },
    [KeyEventKey.TextTool]: {
        messageId: 'draw.text',
        key: '6, T',
    },
    [KeyEventKey.MosaicTool]: {
        messageId: 'draw.mosaic',
        key: '7',
    },
    [KeyEventKey.EraserTool]: {
        messageId: 'draw.eraser',
        key: '8, E',
    },
    [KeyEventKey.UndoTool]: {
        messageId: 'draw.undo',
        key: 'Ctrl+Z',
    },
    [KeyEventKey.RedoTool]: {
        messageId: 'draw.redo',
        key: 'Ctrl+Y',
    },
    [KeyEventKey.CancelTool]: {
        messageId: 'draw.cancel',
        key: 'Escape',
    },
    [KeyEventKey.LockWidthHeightPicker]: {
        messageId: 'draw.lockWidthHeight',
        key: 'Shift',
    },
};

export const KeyEventWrap: React.FC<{
    onKeyDownEventPropName?: string;
    onKeyUpEventPropName?: string;
    onKeyDown?: () => void;
    onKeyUp?: () => void;
    children: JSX.Element;
    componentKey: KeyEventKey;
    confirmTip?: React.ReactNode;
    enable?: boolean;
}> = ({
    onKeyDownEventPropName,
    onKeyUpEventPropName,
    onKeyDown,
    onKeyUp,
    children,
    componentKey,
    confirmTip,
    enable,
}) => {
    const [modal, contextHolder] = Modal.useModal();

    const appSettings = useContext(AppSettingsContext);
    const [keyEventValue, setKeyEventValue] = useState(
        appSettings?.drawToolbarKeyEvent?.[componentKey] ?? defaultKeyEventSettings[componentKey],
    );
    const appSettingsLoading = useRef(true);
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
        keyEvent(children, onKeyDownEventPropName, onKeyDown);
    }, [children, keyEvent, onKeyDown, onKeyDownEventPropName]);
    const onKeyUpChildren = useCallback(() => {
        keyEvent(children, onKeyUpEventPropName, onKeyUp);
    }, [children, keyEvent, onKeyUp, onKeyUpEventPropName]);

    useHotkeys(keyEventValue.key, onKeyDownChildren, {
        keydown: true,
        keyup: false,
        preventDefault: false,
        enabled: enable,
    });
    useHotkeys(keyEventValue.key, onKeyUpChildren, {
        keydown: false,
        keyup: true,
        preventDefault: false,
        enabled: enable,
    });
    return (
        <>
            <ToolbarTip
                destroyTooltipOnHide
                title={
                    enable ? (
                        <FormattedMessage
                            id="draw.keyEventTooltip"
                            values={{
                                message: (
                                    <FormattedMessage
                                        key={componentKey + keyEventValue.messageId}
                                        id={keyEventValue.messageId}
                                    />
                                ),
                                key: keyEventValue.key,
                            }}
                        />
                    ) : null
                }
            >
                {React.cloneElement(children, {
                    disabled: !enable || children.props.disabled,
                })}
            </ToolbarTip>
            {contextHolder}
        </>
    );
};
