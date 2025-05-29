import { useCallback, useState } from 'react';
import React from 'react';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { ExcalidrawKeyEvent, ExcalidrawKeyEventPublisher } from '../extra';
import { AppSettingsGroup } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { HotkeysScope } from '@/components/globalLayoutExtra';
import { useHotkeysApp } from '@/hooks/useHotkeysApp';
import {
    defaultDrawToolbarKeyEventSettings,
    KeyEventKey,
} from '@/app/draw/components/drawToolbar/components/keyEventWrap/extra';

type HotKeys = {
    [key in keyof ExcalidrawKeyEvent]: string;
};

const defaultHotKeys: HotKeys = {
    rotateWithDiscreteAngle:
        defaultDrawToolbarKeyEventSettings[KeyEventKey.RotateWithDiscreteAnglePicker].hotKey,
    resizeFromCenter: defaultDrawToolbarKeyEventSettings[KeyEventKey.ResizeFromCenterPicker].hotKey,
    maintainAspectRatio:
        defaultDrawToolbarKeyEventSettings[KeyEventKey.MaintainAspectRatioPicker].hotKey,
    autoAlign: defaultDrawToolbarKeyEventSettings[KeyEventKey.AutoAlignPicker].hotKey,
};

const ExcalidrawKeyEventHandlerCore = () => {
    const [getExcalidrawKeyEvent, setExcalidrawKeyEvent] = useStateSubscriber(
        ExcalidrawKeyEventPublisher,
        undefined,
    );
    const [hotKeys, setHotKeys] = useState<HotKeys>(defaultHotKeys);
    useAppSettingsLoad(
        useCallback((appSettings) => {
            setHotKeys({
                rotateWithDiscreteAngle:
                    appSettings[AppSettingsGroup.DrawToolbarKeyEvent].rotateWithDiscreteAnglePicker
                        .hotKey,
                resizeFromCenter:
                    appSettings[AppSettingsGroup.DrawToolbarKeyEvent].resizeFromCenterPicker.hotKey,
                maintainAspectRatio:
                    appSettings[AppSettingsGroup.DrawToolbarKeyEvent].maintainAspectRatioPicker
                        .hotKey,
                autoAlign: appSettings[AppSettingsGroup.DrawToolbarKeyEvent].autoAlignPicker.hotKey,
            });
        }, []),
        true,
    );

    const switchKeyEvent = useCallback(
        (field: keyof ExcalidrawKeyEvent, targetValue: boolean) => {
            return () => {
                if (getExcalidrawKeyEvent()[field] === targetValue) {
                    return;
                }
                setExcalidrawKeyEvent({
                    ...getExcalidrawKeyEvent(),
                    [field]: targetValue,
                });
            };
        },
        [getExcalidrawKeyEvent, setExcalidrawKeyEvent],
    );

    useHotkeysApp(
        hotKeys.rotateWithDiscreteAngle,
        switchKeyEvent('rotateWithDiscreteAngle', true),
        {
            preventDefault: true,
            keyup: false,
            keydown: true,
            scopes: HotkeysScope.DrawTool,
        },
    );
    useHotkeysApp(
        hotKeys.rotateWithDiscreteAngle,
        switchKeyEvent('rotateWithDiscreteAngle', false),
        {
            preventDefault: true,
            keyup: true,
            keydown: false,
            scopes: HotkeysScope.DrawTool,
        },
    );
    useHotkeysApp(hotKeys.maintainAspectRatio, switchKeyEvent('maintainAspectRatio', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
        scopes: HotkeysScope.DrawTool,
    });
    useHotkeysApp(hotKeys.maintainAspectRatio, switchKeyEvent('maintainAspectRatio', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
        scopes: HotkeysScope.DrawTool,
    });
    useHotkeysApp(hotKeys.resizeFromCenter, switchKeyEvent('resizeFromCenter', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
        scopes: HotkeysScope.DrawTool,
    });
    useHotkeysApp(hotKeys.resizeFromCenter, switchKeyEvent('resizeFromCenter', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
        scopes: HotkeysScope.DrawTool,
    });
    useHotkeysApp(hotKeys.autoAlign, switchKeyEvent('autoAlign', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
        scopes: HotkeysScope.DrawTool,
    });
    useHotkeysApp(hotKeys.autoAlign, switchKeyEvent('autoAlign', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
        scopes: HotkeysScope.DrawTool,
    });

    return <></>;
};

export const ExcalidrawKeyEventHandler = React.memo(ExcalidrawKeyEventHandlerCore);
