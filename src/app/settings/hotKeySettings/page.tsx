'use client';

import { AppSettingsActionContext, AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import {
    defaultKeyEventComponentConfig,
    defaultKeyEventSettings,
    KeyEventKey,
} from '@/app/draw/components/drawToolbar/components/keyEventWrap';
import { GroupTitle } from '@/components/groupTitle';
import { KeyButton } from '@/components/keyButton';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Col, Form, Row, Spin, theme } from 'antd';
import { useCallback, useContext, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';

export default function HotKeySettings() {
    const { token } = theme.useToken();

    const { updateAppSettings } = useContext(AppSettingsActionContext);

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);

    const [drawToolbarKeyEventForm] =
        Form.useForm<AppSettingsData[AppSettingsGroup.DrawToolbarKeyEvent]>();

    const [drawToolbarKeyEvent, setDrawToolbarKeyEvent] =
        useState<AppSettingsData[AppSettingsGroup.DrawToolbarKeyEvent]>(defaultKeyEventSettings);
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
            },
            [setAppSettingsLoading],
        ),
        true,
    );

    const drawToolbarKeyEventFormItemList = useMemo(() => {
        return Object.keys(defaultKeyEventSettings).map((key) => {
            const span = 12;
            const config = drawToolbarKeyEvent[key as KeyEventKey];
            const componentConfig = defaultKeyEventComponentConfig[key as KeyEventKey];
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
    return (
        <div className="settings-wrap">
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

            {/* 这里用 form 控制值的更新和保存的话反而很麻烦，所以 */}
            <Form className="settings-form common-settings-form" form={drawToolbarKeyEventForm}>
                <Spin spinning={appSettingsLoading}>
                    <Row gutter={token.margin}>{drawToolbarKeyEventFormItemList}</Row>
                </Spin>
            </Form>

            <div className="hot-key-settings-form"></div>
        </div>
    );
}
