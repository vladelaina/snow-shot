import { useCallback, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import React from 'react';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { ExcalidrawKeyEvent, ExcalidrawKeyEventPublisher } from '../extra';
import { AppSettingsGroup } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { defaultDrawToolbarKeyEventSettings } from '../../drawToolbar/components/keyEventWrap/extra';
import { KeyEventKey } from '../../drawToolbar/components/keyEventWrap/extra';

type HotKeys = {
    [key in keyof ExcalidrawKeyEvent]: string;
};

const defaultHotKeys: HotKeys = {
    rotateWithDiscreteAngle:
        defaultDrawToolbarKeyEventSettings[KeyEventKey.RotateWithDiscreteAnglePicker].hotKey,
    resizeFromCenter: defaultDrawToolbarKeyEventSettings[KeyEventKey.ResizeFromCenterPicker].hotKey,
    maintainAspectRatio: defaultDrawToolbarKeyEventSettings[KeyEventKey.MaintainAspectRatioPicker].hotKey,
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

    useHotkeys(hotKeys.rotateWithDiscreteAngle, switchKeyEvent('rotateWithDiscreteAngle', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
    });
    useHotkeys(hotKeys.rotateWithDiscreteAngle, switchKeyEvent('rotateWithDiscreteAngle', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
    });
    useHotkeys(hotKeys.maintainAspectRatio, switchKeyEvent('maintainAspectRatio', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
    });
    useHotkeys(hotKeys.maintainAspectRatio, switchKeyEvent('maintainAspectRatio', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
    });
    useHotkeys(hotKeys.resizeFromCenter, switchKeyEvent('resizeFromCenter', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
    });
    useHotkeys(hotKeys.resizeFromCenter, switchKeyEvent('resizeFromCenter', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
    });
    useHotkeys(hotKeys.autoAlign, switchKeyEvent('autoAlign', true), {
        preventDefault: true,
        keyup: false,
        keydown: true,
    });
    useHotkeys(hotKeys.autoAlign, switchKeyEvent('autoAlign', false), {
        preventDefault: true,
        keyup: true,
        keydown: false,
    });

    return <></>;
};

export const ExcalidrawKeyEventHandler = React.memo(ExcalidrawKeyEventHandlerCore);
