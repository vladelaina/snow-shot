'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Divider, Form, Select, Switch } from 'antd';
import {
    AppSettingsContext,
    AppSettingsControlNode,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsLanguage,
} from '../contextWrap';
import { useCallback, useContext } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage, useIntl } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { DarkModeIcon, LanguageIcon } from '@/components/icons';
import { IconLabel } from '@/components/iconLable';

const { Option } = Select;

export default function Settings() {
    const intl = useIntl();

    const { updateAppSettings } = useContext(AppSettingsContext);
    const [commonForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Common]>();
    const [screenshotForm] = Form.useForm<AppSettingsData[AppSettingsGroup.Screenshot]>();

    useAppSettingsLoad(
        useCallback(
            (settings) => {
                commonForm.setFieldsValue(settings[AppSettingsGroup.Common]);
                screenshotForm.setFieldsValue(settings[AppSettingsGroup.Screenshot]);
            },
            [commonForm, screenshotForm],
        ),
    );

    return (
        <ContentWrap className="settings-wrap">
            <GroupTitle>{intl.formatMessage({ id: 'settings.commonSettings' })}</GroupTitle>

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

            <Divider />

            <GroupTitle>
                <FormattedMessage id="settings.screenshotSettings" />
            </GroupTitle>

            <Form
                className="settings-form screenshot-settings-form"
                form={screenshotForm}
                onValuesChange={(_, values) => {
                    updateAppSettings(AppSettingsGroup.Screenshot, values, true, true, true);
                }}
            >
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
                        <Option value={AppSettingsControlNode.Polyline}>
                            <FormattedMessage id="settings.controlNode.polyline" />
                        </Option>
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
                    label={<IconLabel label={<FormattedMessage id="settings.performanceMode" />} />}
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>
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
