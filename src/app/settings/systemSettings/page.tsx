'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Form, Spin, Switch } from 'antd';
import { AppSettingsActionContext, AppSettingsData, AppSettingsGroup } from '../../contextWrap';
import { useCallback, useContext, useState } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { IconLabel } from '@/components/iconLable';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import ProForm from '@ant-design/pro-form';

export default function SystemSettings() {
    const { updateAppSettings } = useContext(AppSettingsActionContext);
    const [commonForm] = Form.useForm<AppSettingsData[AppSettingsGroup.SystemCommon]>();
    const [renderForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Render]>();

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    useAppSettingsLoad(
        useCallback(
            (settings: AppSettingsData, preSettings?: AppSettingsData) => {
                setAppSettingsLoading(false);

                if (
                    preSettings === undefined ||
                    preSettings[AppSettingsGroup.Render] !== settings[AppSettingsGroup.Render]
                ) {
                    renderForm.setFieldsValue(settings[AppSettingsGroup.Render]);
                }

                if (
                    preSettings === undefined ||
                    preSettings[AppSettingsGroup.SystemCommon] !==
                        settings[AppSettingsGroup.SystemCommon]
                ) {
                    commonForm.setFieldsValue(settings[AppSettingsGroup.SystemCommon]);
                }
            },
            [setAppSettingsLoading, renderForm, commonForm],
        ),
        true,
    );
    return (
        <ContentWrap>
            <GroupTitle
                id="commonSettings"
                extra={
                    <ResetSettingsButton
                        title={<FormattedMessage id="settings.systemSettings.commonSettings" />}
                        appSettingsGroup={AppSettingsGroup.SystemCommon}
                    />
                }
            >
                <FormattedMessage id="settings.systemSettings.commonSettings" />
            </GroupTitle>

            <Spin spinning={appSettingsLoading}>
                <ProForm
                    form={commonForm}
                    onValuesChange={(_, values) => {
                        updateAppSettings(AppSettingsGroup.SystemCommon, values, true, true, true);
                    }}
                    submitter={false}
                >
                    <ProForm.Item
                        label={
                            <IconLabel
                                label={
                                    <FormattedMessage id="settings.systemSettings.commonSettings.autoStart" />
                                }
                            />
                        }
                        name="autoStart"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>
                </ProForm>
            </Spin>

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
                <FormattedMessage id="settings.renderSettings" />
            </GroupTitle>

            <Spin spinning={appSettingsLoading}>
                <ProForm
                    form={renderForm}
                    onValuesChange={(_, values) => {
                        updateAppSettings(AppSettingsGroup.Render, values, true, true, true);
                    }}
                    submitter={false}
                >
                    <ProForm.Item
                        label={<IconLabel label={<FormattedMessage id="settings.antialias" />} />}
                        name="antialias"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>
                </ProForm>
            </Spin>
        </ContentWrap>
    );
}
