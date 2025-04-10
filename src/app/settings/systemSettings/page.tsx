'use client';

import { GroupTitle } from '@/components/groupTitle';
import { Form, Spin, Switch, Divider, Row, Col, theme } from 'antd';
import { AppSettingsActionContext, AppSettingsData, AppSettingsGroup } from '../../contextWrap';
import { useCallback, useContext, useState } from 'react';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { FormattedMessage } from 'react-intl';
import { ContentWrap } from '@/components/contentWrap';
import { IconLabel } from '@/components/iconLable';
import { ResetSettingsButton } from '@/components/resetSettingsButton';
import ProForm, { ProFormDependency, ProFormDigit, ProFormSwitch } from '@ant-design/pro-form';

export default function SystemSettings() {
    const { token } = theme.useToken();

    const { updateAppSettings } = useContext(AppSettingsActionContext);
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
            },
            [setAppSettingsLoading, renderForm],
        ),
        true,
    );
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

                    <Divider orientation="left">
                        <FormattedMessage id="settings.drawLine" />
                    </Divider>

                    <ProForm.Item
                        label={
                            <IconLabel
                                label={<FormattedMessage id="settings.enableDrawLineSimplify" />}
                                tooltipTitle={
                                    <FormattedMessage id="settings.enableDrawLineSimplify.tip" />
                                }
                            />
                        }
                        name="enableDrawLineSimplify"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>

                    <Row gutter={token.margin}>
                        <ProFormDependency name={['enableDrawLineSimplify']}>
                            {({ enableDrawLineSimplify }) => {
                                return (
                                    <>
                                        <Col span={12}>
                                            <ProFormDigit
                                                label={
                                                    <IconLabel
                                                        label={
                                                            <FormattedMessage id="settings.drawLineSimplifyTolerance" />
                                                        }
                                                        tooltipTitle={
                                                            <FormattedMessage id="settings.drawLineSimplifyTolerance.tip" />
                                                        }
                                                    />
                                                }
                                                name="drawLineSimplifyTolerance"
                                                min={0.1}
                                                max={5}
                                                fieldProps={{ precision: 1, step: 0.1 }}
                                                disabled={!enableDrawLineSimplify}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <ProFormSwitch
                                                label={
                                                    <IconLabel
                                                        label={
                                                            <FormattedMessage id="settings.drawLineSimplifyHighQuality" />
                                                        }
                                                        tooltipTitle={
                                                            <FormattedMessage id="settings.drawLineSimplifyHighQuality.tip" />
                                                        }
                                                    />
                                                }
                                                name="drawLineSimplifyHighQuality"
                                            />
                                        </Col>
                                    </>
                                );
                            }}
                        </ProFormDependency>
                    </Row>

                    <ProForm.Item
                        label={
                            <IconLabel
                                label={<FormattedMessage id="settings.enableDrawLineSmooth" />}
                                tooltipTitle={
                                    <FormattedMessage id="settings.enableDrawLineSmooth.tip" />
                                }
                            />
                        }
                        name="enableDrawLineSmooth"
                        valuePropName="checked"
                    >
                        <Switch />
                    </ProForm.Item>

                    <Row gutter={token.margin}>
                        <ProFormDependency name={['enableDrawLineSmooth']}>
                            {({ enableDrawLineSmooth }) => {
                                return (
                                    <>
                                        <Col span={12}>
                                            <ProFormDigit
                                                label={
                                                    <IconLabel
                                                        label={
                                                            <FormattedMessage id="settings.drawLineSmoothRatio" />
                                                        }
                                                        tooltipTitle={
                                                            <FormattedMessage id="settings.drawLineSmoothRatio.tip" />
                                                        }
                                                    />
                                                }
                                                name="drawLineSmoothRatio"
                                                min={0.1}
                                                max={1}
                                                fieldProps={{ precision: 2, step: 0.05 }}
                                                disabled={!enableDrawLineSmooth}
                                            />
                                        </Col>

                                        <Col span={12}>
                                            <ProFormDigit
                                                label={
                                                    <IconLabel
                                                        label={
                                                            <FormattedMessage id="settings.drawLineSmoothIterations" />
                                                        }
                                                        tooltipTitle={
                                                            <FormattedMessage id="settings.drawLineSmoothIterations.tip" />
                                                        }
                                                    />
                                                }
                                                name="drawLineSmoothIterations"
                                                min={1}
                                                max={10}
                                                fieldProps={{ precision: 0, step: 1 }}
                                                disabled={!enableDrawLineSmooth}
                                            />
                                        </Col>
                                    </>
                                );
                            }}
                        </ProFormDependency>
                    </Row>
                </ProForm>
            </Spin>
        </ContentWrap>
    );
}
