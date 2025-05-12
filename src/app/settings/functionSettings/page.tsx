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
    const [functionForm] = Form.useForm<AppSettingsData[AppSettingsGroup.FunctionChat]>();

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    useAppSettingsLoad(
        useCallback(
            (settings: AppSettingsData, preSettings?: AppSettingsData) => {
                setAppSettingsLoading(false);

                if (
                    preSettings === undefined ||
                    preSettings[AppSettingsGroup.FunctionChat] !==
                        settings[AppSettingsGroup.FunctionChat]
                ) {
                    functionForm.setFieldsValue(settings[AppSettingsGroup.FunctionChat]);
                }
            },
            [functionForm],
        ),
        true,
    );
    return (
        <ContentWrap>
            <GroupTitle
                id="functionSettings"
                extra={
                    <ResetSettingsButton
                        title={<FormattedMessage id="settings.functionSettings.chatSettings" />}
                        appSettingsGroup={AppSettingsGroup.FunctionChat}
                    />
                }
            >
                <FormattedMessage id="settings.functionSettings.chatSettings" />
            </GroupTitle>

            <Spin spinning={appSettingsLoading}>
                <ProForm
                    form={functionForm}
                    onValuesChange={(_, values) => {
                        updateAppSettings(AppSettingsGroup.FunctionChat, values, true, true, false);
                    }}
                    submitter={false}
                    layout="horizontal"
                >
                    <ProForm.Item
                        label={
                            <IconLabel
                                label={
                                    <FormattedMessage id="settings.functionSettings.chatSettings.autoCreateNewSession" />
                                }
                            />
                        }
                        name="autoCreateNewSession"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>
                </ProForm>
            </Spin>
        </ContentWrap>
    );
}
