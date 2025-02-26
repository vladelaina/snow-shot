'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Form, Select, Switch } from 'antd';
import { AppSettingsContext, AppSettingsGroup, AppSettingsLanguage } from '../contextWrap';
import { useCallback, useContext } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { useIntl } from 'react-intl';

const { Option } = Select;

export default function Settings() {
    const intl = useIntl();
    const { updateAppSettings, ...appSettings } = useContext(AppSettingsContext);
    const [form] = Form.useForm<{ language: AppSettingsLanguage; darkMode: boolean }>();

    useAppSettingsLoad(
        useCallback(
            (settings) => {
                form.setFieldsValue(settings[AppSettingsGroup.Common]);
            },
            [form],
        ),
    );

    return (
        <div className="settings-wrap">
            <GroupTitle>{intl.formatMessage({ id: 'settings.commonSettings' })}</GroupTitle>

            <Form
                form={form}
                initialValues={
                    appSettings.isDefaultData ? undefined : appSettings[AppSettingsGroup.Common]
                }
                onValuesChange={(_, values) => {
                    updateAppSettings(AppSettingsGroup.Common, values, true);
                }}
            >
                <Form.Item
                    label={intl.formatMessage({ id: 'settings.darkMode' })}
                    name="darkMode"
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>
                <Form.Item
                    className="settings-wrap-language"
                    name="language"
                    label={intl.formatMessage({ id: 'settings.language' })}
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

            <style jsx>{`
                .settings-wrap :global(.settings-wrap-language) :global(.ant-form-item-control) {
                    flex-grow: unset !important;
                    min-width: 128px;
                }
            `}</style>
        </div>
    );
}
