import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Modal } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JSX } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawingPublisher } from '../..';
import {
    defaultKeyEventComponentConfig,
    defaultKeyEventSettings,
    EnableKeyEventPublisher,
    KeyEventKey,
    KeyEventValue,
} from './extra';
import { AppSettingsData } from '@/app/contextWrap';

const KeyEventHandleCore: React.FC<{
    keyEventValue: KeyEventValue;
    onKeyDownChildren: () => void;
    onKeyUpChildren: () => void;
    componentKey: KeyEventKey;
    children: JSX.Element;
}> = ({ keyEventValue, onKeyDownChildren, onKeyUpChildren, componentKey, children }) => {
    const intl = useIntl();
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

    const buttonTitle = useMemo(() => {
        return intl.formatMessage(
            {
                id: 'draw.keyEventTooltip',
            },
            {
                message: intl.formatMessage({
                    id: defaultKeyEventComponentConfig[componentKey].messageId,
                }),
                key: keyEventValue.hotKey,
            },
        );
    }, [componentKey, intl, keyEventValue.hotKey]);

    return (
        <>
            {React.cloneElement(children, {
                disabled: children.props.disabled,
                title: buttonTitle,
            })}
        </>
    );
};

const KeyEventHandle = React.memo(KeyEventHandleCore);

const KeyEventWrapCore: React.FC<{
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

    const [keyEventValue, setKeyEventValue] = useState<KeyEventValue | undefined>(undefined);
    const [getEnableKeyEvent] = useStateSubscriber(EnableKeyEventPublisher, () => {});
    const [getDrawing] = useStateSubscriber(DrawingPublisher, () => {});
    const isEnable = useCallback(() => {
        if (enableRef.current !== undefined) {
            return enableRef.current;
        }

        return getEnableKeyEvent() && (disableOnDrawing ? !getDrawing() : true);
    }, [disableOnDrawing, getEnableKeyEvent, getDrawing]);
    useAppSettingsLoad(
        useCallback(
            (appSettings: AppSettingsData) => {
                setKeyEventValue(
                    appSettings?.drawToolbarKeyEvent?.[componentKey] ??
                        defaultKeyEventSettings[componentKey],
                );
            },
            [componentKey],
        ),
        true,
    );

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

    if (!keyEventValue) {
        return null;
    }

    return (
        <>
            <KeyEventHandle
                keyEventValue={keyEventValue}
                onKeyDownChildren={onKeyDownChildren}
                onKeyUpChildren={onKeyUpChildren}
                componentKey={componentKey}
            >
                {children}
            </KeyEventHandle>
            {contextHolder}
        </>
    );
};

export const KeyEventWrap = React.memo(KeyEventWrapCore);
