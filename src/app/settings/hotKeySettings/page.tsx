'use client';

import { AppSettingsContext, AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import {
    defaultKeyEventSettings,
    KeyEventKey,
} from '@/app/draw/components/drawToolbar/components/keyEventWrap';
import { GroupTitle } from '@/components/groupTitle';
import { KeyButton } from '@/components/keyButton';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Col, Form, Row, Spin, theme } from 'antd';
import { useCallback, useContext, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

export default function Settings() {
    const { token } = theme.useToken();
    const intl = useIntl();

    const appSettings = useContext(AppSettingsContext);
    const { drawToolbarKeyEvent, updateAppSettings } = appSettings;

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    useAppSettingsLoad(
        useCallback(() => {
            setAppSettingsLoading(false);
        }, []),
    );

    const [drawToolbarKeyEventForm] =
        Form.useForm<AppSettingsData[AppSettingsGroup.DrawToolbarKeyEvent]>();

    const drawToolbarKeyEventFormItemList = useMemo(() => {
        return Object.keys(defaultKeyEventSettings).map((key) => {
            const span = 12;
            const config = drawToolbarKeyEvent[key as KeyEventKey];
            return (
                <Col key={`draw-toolbar-key-event_col-${key}`} span={span}>
                    <Form.Item label={<FormattedMessage id={config.messageId} />} name={key}>
                        <KeyButton
                            title={<FormattedMessage key={key} id={config.messageId} />}
                            keyValue={config.key}
                            maxWidth={100}
                            onKeyChange={(value) => {
                                updateAppSettings(
                                    AppSettingsGroup.DrawToolbarKeyEvent,
                                    {
                                        [key]: {
                                            ...config,
                                            key: value,
                                        },
                                    },
                                    false,
                                    true,
                                    true,
                                );
                            }}
                        />
                    </Form.Item>
                </Col>
            );
        });
    }, [updateAppSettings, drawToolbarKeyEvent]);
    return (
        <div className="settings-wrap">
            <GroupTitle
                id="drawingHotKey"
                extra={
                    <ResetSettingsButton
                        title={intl.formatMessage({ id: 'settings.drawingHotKey' })}
                        appSettingsGroup={AppSettingsGroup.DrawToolbarKeyEvent}
                    />
                }
            >
                {intl.formatMessage({ id: 'settings.drawingHotKey' })}
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
