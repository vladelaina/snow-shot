'use client';

import { AppSettingsActionContext, AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import {
    defaultDrawToolbarKeyEventComponentConfig,
    defaultDrawToolbarKeyEventSettings,
    KeyEventKey as DrawToolbarKeyEventKey,
} from '@/app/draw/components/drawToolbar/components/keyEventWrap/extra';
import { GroupTitle } from '@/components/groupTitle';
import { KeyButton } from '@/components/keyButton';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import {
    defaultKeyEventComponentConfig,
    defaultKeyEventSettings,
    KeyEventKey,
} from '@/core/hotKeys';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Col, Divider, Form, Row, Spin, theme } from 'antd';
import { useCallback, useContext, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';

export default function HotKeySettings() {
    const { token } = theme.useToken();

    const { updateAppSettings } = useContext(AppSettingsActionContext);

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);

    const [drawToolbarKeyEventForm] =
        Form.useForm<AppSettingsData[AppSettingsGroup.DrawToolbarKeyEvent]>();
    const [keyEventForm] = Form.useForm<AppSettingsData[AppSettingsGroup.KeyEvent]>();

    const [drawToolbarKeyEvent, setDrawToolbarKeyEvent] = useState<
        AppSettingsData[AppSettingsGroup.DrawToolbarKeyEvent]
    >(defaultDrawToolbarKeyEventSettings);
    const [keyEvent, setKeyEvent] =
        useState<AppSettingsData[AppSettingsGroup.KeyEvent]>(defaultKeyEventSettings);
    useAppSettingsLoad(
        useCallback(
            (settings: AppSettingsData, preSettings?: AppSettingsData) => {
                setAppSettingsLoading(false);

                if (
                    preSettings === undefined ||
                    preSettings[AppSettingsGroup.DrawToolbarKeyEvent] !==
                        settings[AppSettingsGroup.DrawToolbarKeyEvent]
                ) {
                    setDrawToolbarKeyEvent(settings[AppSettingsGroup.DrawToolbarKeyEvent]);
                }

                if (
                    preSettings === undefined ||
                    preSettings[AppSettingsGroup.KeyEvent] !== settings[AppSettingsGroup.KeyEvent]
                ) {
                    setKeyEvent(settings[AppSettingsGroup.KeyEvent]);
                }
            },
            [setAppSettingsLoading],
        ),
        true,
    );

    const drawToolbarKeyEventFormItemList = useMemo(() => {
        return Object.keys(defaultDrawToolbarKeyEventSettings).map((key) => {
            const span = 12;
            const config = drawToolbarKeyEvent[key as DrawToolbarKeyEventKey];
            const componentConfig =
                defaultDrawToolbarKeyEventComponentConfig[key as DrawToolbarKeyEventKey];
            return (
                <Col key={`draw-toolbar-key-event_col-${key}`} span={span}>
                    <Form.Item
                        label={<FormattedMessage id={componentConfig.messageId} />}
                        name={key}
                    >
                        <KeyButton
                            title={<FormattedMessage key={key} id={componentConfig.messageId} />}
                            keyValue={config.hotKey}
                            maxWidth={100}
                            onKeyChange={async (value) => {
                                updateAppSettings(
                                    AppSettingsGroup.DrawToolbarKeyEvent,
                                    {
                                        [key]: {
                                            ...config,
                                            hotKey: value,
                                        },
                                    },
                                    false,
                                    true,
                                    true,
                                );
                            }}
                            maxLength={2}
                        />
                    </Form.Item>
                </Col>
            );
        });
    }, [drawToolbarKeyEvent, updateAppSettings]);

    const keyEventFormItemList = useMemo(() => {
        const groupFormItemMap: Record<string, React.ReactNode[]> = {};

        Object.keys(defaultKeyEventSettings).forEach((key) => {
            const span = 12;
            const config = keyEvent[key as KeyEventKey];
            const componentConfig = defaultKeyEventComponentConfig[key as KeyEventKey];

            if (!groupFormItemMap[config.group]) {
                groupFormItemMap[config.group] = [];
            }

            groupFormItemMap[config.group].push(
                <Col key={`key-event_col-${key}`} span={span}>
                    <Form.Item
                        label={<FormattedMessage id={componentConfig.messageId} />}
                        name={key}
                    >
                        <KeyButton
                            title={<FormattedMessage key={key} id={componentConfig.messageId} />}
                            keyValue={config.hotKey}
                            maxWidth={100}
                            onKeyChange={async (value) => {
                                updateAppSettings(
                                    AppSettingsGroup.KeyEvent,
                                    {
                                        [key]: {
                                            ...config,
                                            hotKey: value,
                                        },
                                    },
                                    false,
                                    true,
                                    true,
                                );
                            }}
                            maxLength={2}
                        />
                    </Form.Item>
                </Col>,
            );
        });

        return groupFormItemMap;
    }, [keyEvent, updateAppSettings]);

    const keyEventFormItemListKeys = Object.keys(keyEventFormItemList);
    return (
        <div className="settings-wrap">
            {/* 这里用 form 控制值的更新和保存的话反而很麻烦，所以 */}
            <Form className="settings-form common-settings-form" form={keyEventForm}>
                {keyEventFormItemListKeys.map((key, index) => {
                    return (
                        <div key={key}>
                            <GroupTitle
                                id={key}
                                extra={
                                    <ResetSettingsButton
                                        title={
                                            <FormattedMessage
                                                id={`settings.hotKeySettings.${key}`}
                                                key={key}
                                            />
                                        }
                                        appSettingsGroup={AppSettingsGroup.KeyEvent}
                                    />
                                }
                            >
                                <FormattedMessage id={`settings.hotKeySettings.${key}`} />
                            </GroupTitle>
                            <Spin spinning={appSettingsLoading}>
                                <Row gutter={token.margin}>{keyEventFormItemList[key]}</Row>
                            </Spin>

                            {index !== keyEventFormItemListKeys.length - 1 && <Divider />}
                        </div>
                    );
                })}
            </Form>

            <Divider />

            <GroupTitle
                id="drawingHotKey"
                extra={
                    <ResetSettingsButton
                        title={<FormattedMessage id="settings.drawingHotKey" key="drawingHotKey" />}
                        appSettingsGroup={AppSettingsGroup.DrawToolbarKeyEvent}
                    />
                }
            >
                <FormattedMessage id="settings.drawingHotKey" />
            </GroupTitle>

            <Form className="settings-form common-settings-form" form={drawToolbarKeyEventForm}>
                <Spin spinning={appSettingsLoading}>
                    <Row gutter={token.margin}>{drawToolbarKeyEventFormItemList}</Row>
                </Spin>
            </Form>

            <div className="hot-key-settings-form"></div>
        </div>
    );
}
