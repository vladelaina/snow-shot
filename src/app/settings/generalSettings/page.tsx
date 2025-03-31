'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Divider, Form, Select, Spin, Switch } from 'antd';
import {
    AppSettingsContext,
    AppSettingsControlNode,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsLanguage,
} from '../../contextWrap';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage, useIntl } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { DarkModeIcon, LanguageIcon } from '@/components/icons';
import { IconLabel } from '@/components/iconLable';
import { ResetSettingsButton } from '@/components/resetSettingsButton';

const { Option } = Select;

export default function GeneralSettings() {
    const intl = useIntl();

    const {
        updateAppSettings,
        common: commonAppSettings,
        screenshot: screenshotAppSettings,
    } = useContext(AppSettingsContext);
    const [commonForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Common]>();
    const [screenshotForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Screenshot]>();

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

        commonForm.setFieldsValue(commonAppSettings);
    }, [commonAppSettings, commonForm, appSettingsLoading]);
    useEffect(() => {
        if (appSettingsLoading) {
            return;
        }

        screenshotForm.setFieldsValue(screenshotAppSettings);
    }, [screenshotAppSettings, screenshotForm, appSettingsLoading]);

    return (
        <ContentWrap className="settings-wrap">
            <GroupTitle
                id="commonSettings"
                extra={
                    <ResetSettingsButton
                        title={intl.formatMessage({ id: 'settings.commonSettings' })}
                        appSettingsGroup={AppSettingsGroup.Common}
                    />
                }
            >
                {intl.formatMessage({ id: 'settings.commonSettings' })}
            </GroupTitle>

            <Spin spinning={appSettingsLoading}>
                <Form
                    className="settings-form common-settings-form"
                    form={commonForm}
                    onValuesChange={(_, values) => {
                        updateAppSettings(AppSettingsGroup.Common, values, true, true, true);
                    }}
                >
                    <Form.Item
                        label={
                            <IconLabel
                                icon={<DarkModeIcon />}
                                label={<FormattedMessage id="settings.darkMode" />}
                            />
                        }
                        name="darkMode"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        className="settings-wrap-language"
                        name="language"
                        label={
                            <IconLabel
                                icon={<LanguageIcon />}
                                label={<FormattedMessage id="settings.language" />}
                            />
                        }
                        required={false}
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value={AppSettingsLanguage.EN}>English</Option>
                            <Option value={AppSettingsLanguage.ZHHant}>繁体中文</Option>
                            <Option value={AppSettingsLanguage.ZHHans}>简体中文</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Spin>

            <Divider />

            <GroupTitle
                id="screenshotSettings"
                extra={
                    <ResetSettingsButton
                        title={intl.formatMessage({ id: 'settings.screenshotSettings' })}
                        appSettingsGroup={AppSettingsGroup.Screenshot}
                    />
                }
            >
                <FormattedMessage id="settings.screenshotSettings" />
            </GroupTitle>

            <Form
                className="settings-form screenshot-settings-form"
                form={screenshotForm}
                onValuesChange={(_, values) => {
                    updateAppSettings(AppSettingsGroup.Screenshot, values, true, true, true);
                }}
            >
                <Spin spinning={appSettingsLoading}>
                    <Form.Item
                        className="settings-wrap-language"
                        name="controlNode"
                        label={<IconLabel label={<FormattedMessage id="settings.controlNode" />} />}
                        required={false}
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value={AppSettingsControlNode.Circle}>
                                <FormattedMessage id="settings.controlNode.circle" />
                            </Option>
                            {/* <Option value={AppSettingsControlNode.Polyline}>
                                <FormattedMessage id="settings.controlNode.polyline" />
                            </Option> */}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="findChildrenElements"
                        label={
                            <IconLabel
                                label={<FormattedMessage id="settings.findChildrenElements" />}
                            />
                        }
                        valuePropName="checked"
                        required={false}
                        rules={[{ required: true }]}
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        name="performanceMode"
                        label={
                            <IconLabel
                                label={<FormattedMessage id="settings.performanceMode" />}
                                tooltipTitle={
                                    <FormattedMessage id="settings.performanceMode.tip1" />
                                }
                            />
                        }
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Spin>
            </Form>

            <style jsx>{`
                :global(.settings-form)
                    :global(.settings-wrap-language)
                    :global(.ant-form-item-control) {
                    flex-grow: unset !important;
                    min-width: 128px;
                }
            `}</style>
        </ContentWrap>
    );
}
