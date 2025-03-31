'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Form, Spin, Switch } from 'antd';
import { AppSettingsContext, AppSettingsData, AppSettingsGroup } from '../../contextWrap';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage, useIntl } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { IconLabel } from '@/components/iconLable';
import { ResetSettingsButton } from '@/components/resetSettingsButton';

export default function SystemSettings() {
    const intl = useIntl();

    const { updateAppSettings, render: renderAppSettings } = useContext(AppSettingsContext);
    const [renderForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Render]>();

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    useAppSettingsLoad(
        useCallback(() => {
            setAppSettingsLoading(false);
        }, []),
    );

    useEffect(() => {
        if (appSettingsLoading) {
            return;
        }

        renderForm.setFieldsValue(renderAppSettings);
    }, [renderAppSettings, renderForm, appSettingsLoading]);

    return (
        <ContentWrap>
            <GroupTitle
                id="renderSettings"
                extra={
                    <ResetSettingsButton
                        title={
                            <FormattedMessage id="settings.renderSettings" key="renderSettings" />
                        }
                        appSettingsGroup={AppSettingsGroup.Render}
                    />
                }
            >
                {intl.formatMessage({ id: 'settings.renderSettings' })}
            </GroupTitle>

            <Spin spinning={appSettingsLoading}>
                <Form
                    form={renderForm}
                    onValuesChange={(_, values) => {
                        updateAppSettings(AppSettingsGroup.Render, values, true, true, true);
                    }}
                >
                    <Form.Item
                        label={<IconLabel label={<FormattedMessage id="settings.antialias" />} />}
                        name="antialias"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Spin>
        </ContentWrap>
    );
}
