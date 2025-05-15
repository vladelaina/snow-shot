'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Col, Flex, Form, Row, Spin, Switch, theme } from 'antd';
import { AppSettingsActionContext, AppSettingsData, AppSettingsGroup } from '../../contextWrap';
import { useCallback, useContext, useState } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage, useIntl } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { IconLabel } from '@/components/iconLable';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import ProForm, { ProFormList, ProFormSwitch, ProFormText } from '@ant-design/pro-form';

export default function SystemSettings() {
    const intl = useIntl();
    const { token } = theme.useToken();

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
                        updateAppSettings(
                            AppSettingsGroup.FunctionChat,
                            values,
                            true,
                            true,
                            true,
                            true,
                            false,
                        );
                    }}
                    submitter={false}
                >
                    <ProForm.Item
                        label={
                            <IconLabel
                                label={
                                    <FormattedMessage id="settings.functionSettings.chatSettings.autoCreateNewSession" />
                                }
                            />
                        }
                        layout="horizontal"
                        name="autoCreateNewSession"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>

                    <ProFormList
                        name="chatApiConfigList"
                        label={
                            <IconLabel
                                label={
                                    <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig" />
                                }
                                tooltipTitle={
                                    <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.tip" />
                                }
                            />
                        }
                        creatorButtonProps={{
                            creatorButtonText: intl.formatMessage({
                                id: 'settings.functionSettings.chatSettings.apiConfig.add',
                            }),
                        }}
                        className="api-config-list"
                        min={0}
                        itemRender={({ listDom, action }) => (
                            <Flex align="end" justify="space-between">
                                {listDom}
                                <div>{action}</div>
                            </Flex>
                        )}
                        creatorRecord={() => ({
                            api_uri: '',
                            api_key: '',
                            api_model: '',
                            model_name: '',
                        })}
                    >
                        <Row gutter={token.padding} style={{ width: '100%' }}>
                            <Col span={12}>
                                <ProFormText
                                    name="model_name"
                                    label={
                                        <IconLabel
                                            label={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.modelName" />
                                            }
                                            tooltipTitle={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.modelName.tip" />
                                            }
                                        />
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'settings.functionSettings.chatSettings.apiConfig.modelName.required',
                                            }),
                                        },
                                    ]}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormSwitch
                                    name="support_thinking"
                                    label={
                                        <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.supportThinking" />
                                    }
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormText
                                    name="api_uri"
                                    label={
                                        <IconLabel
                                            label={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiUri" />
                                            }
                                            tooltipTitle={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiUri.tip" />
                                            }
                                        />
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'settings.functionSettings.chatSettings.apiConfig.apiUri.required',
                                            }),
                                        },
                                    ]}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormText.Password
                                    name="api_key"
                                    label={
                                        <IconLabel
                                            label={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiKey" />
                                            }
                                            tooltipTitle={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiKey.tip" />
                                            }
                                        />
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'settings.functionSettings.chatSettings.apiConfig.apiKey.required',
                                            }),
                                        },
                                    ]}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormText
                                    name="api_model"
                                    label={
                                        <IconLabel
                                            label={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiModel" />
                                            }
                                            tooltipTitle={
                                                <FormattedMessage id="settings.functionSettings.chatSettings.apiConfig.apiModel.tip" />
                                            }
                                        />
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'settings.functionSettings.chatSettings.apiConfig.apiModel.required',
                                            }),
                                        },
                                    ]}
                                />
                            </Col>
                        </Row>
                    </ProFormList>
                </ProForm>
            </Spin>

            <style jsx>{`
                :global(.api-config-list .ant-pro-form-list-container) {
                    width: 100%;
                }
            `}</style>
        </ContentWrap>
    );
}
