'use client';

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GroupTitle } from '@/components/groupTitle';
import { FormattedMessage } from 'react-intl';
import { Space, Spin, Tooltip } from 'antd';
import { ContentWrap } from '@/components/contentWrap';
import { ScreenshotIcon } from '@/components/icons';
import { FunctionButton } from '@/components/functionButton';
import { executeScreenshot } from '@/functions/screenshot';
import {
    isRegistered,
    register,
    unregister,
    unregisterAll,
} from '@tauri-apps/plugin-global-shortcut';
import { KeyButton } from '@/components/keyButton';
import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from './contextWrap';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import {
    AppFunction,
    AppFunctionComponentConfig,
    AppFunctionConfig,
    convertShortcutKeyStatusToButtonColor,
    convertShortcutKeyStatusToTip,
    defaultAppFunctionConfigs,
    ShortcutKeyStatus,
} from './extra';

export default function Home() {
    const disableShortcutKeyRef = useRef(false);
    const defaultAppFunctionComponentConfigs: Record<AppFunction, AppFunctionComponentConfig> =
        useMemo(
            () =>
                Object.keys(defaultAppFunctionConfigs).reduce(
                    (configs, key) => {
                        if (key === AppFunction.Screenshot) {
                            const onClick = async () => {
                                if (disableShortcutKeyRef.current) {
                                    return;
                                }

                                await executeScreenshot();
                            };
                            configs[key as AppFunction] = {
                                ...defaultAppFunctionConfigs[key as AppFunction],
                                messageId: 'home.screenshot',
                                onClick,
                                onKeyChange: async (value: string, prevValue: string) => {
                                    if (!value) {
                                        return false;
                                    }

                                    if (prevValue) {
                                        if (await isRegistered(prevValue)) {
                                            await unregister(prevValue);
                                        }
                                    }

                                    if (await isRegistered(value)) {
                                        return false;
                                    }

                                    try {
                                        await register(value, (event) => {
                                            if (event.state !== 'Pressed') {
                                                return;
                                            }

                                            onClick();
                                        });
                                    } catch (error) {
                                        // 将错误传给组件，组件捕获错误来判断快捷键状态
                                        throw error;
                                    }

                                    return true;
                                },
                            };
                        }

                        return configs;
                    },
                    {} as Record<AppFunction, AppFunctionComponentConfig>,
                ),
            [],
        );

    const appFunctionComponentConfigsKeys = useMemo(() => {
        return Object.keys(defaultAppFunctionComponentConfigs) as AppFunction[];
    }, [defaultAppFunctionComponentConfigs]);

    const [shortcutKeyStatus, setShortcutKeyStatus] =
        useState<Record<AppFunction, ShortcutKeyStatus>>();

    const [updateShortcutKeyStatusLoading, setUpdateShortcutKeyStatusLoading] = useState(true);
    const previousAppFunctionSettingsRef =
        useRef<AppSettingsData[AppSettingsGroup.AppFunction]>(undefined);
    const updateShortcutKeyStatus = useCallback(
        async (settings: Record<AppFunction, AppFunctionConfig>) => {
            setUpdateShortcutKeyStatusLoading(true);
            const keyStatus: Record<AppFunction, ShortcutKeyStatus> = {} as Record<
                AppFunction,
                ShortcutKeyStatus
            >;
            await Promise.all(
                appFunctionComponentConfigsKeys.map(async (key) => {
                    const config = defaultAppFunctionComponentConfigs[key as AppFunction];
                    try {
                        const isSuccess = await config.onKeyChange(
                            settings[key as AppFunction].shortcutKey,
                            (previousAppFunctionSettingsRef.current ?? settings)[key as AppFunction]
                                .shortcutKey,
                        );
                        keyStatus[key as AppFunction] = isSuccess
                            ? ShortcutKeyStatus.Registered
                            : ShortcutKeyStatus.Unregistered;
                    } catch {
                        keyStatus[key as AppFunction] = ShortcutKeyStatus.Error;
                    }
                }),
            );

            setShortcutKeyStatus(keyStatus);
            previousAppFunctionSettingsRef.current = settings;
            setUpdateShortcutKeyStatusLoading(false);
        },
        [appFunctionComponentConfigsKeys, defaultAppFunctionComponentConfigs],
    );

    const [appSettingsLoading, setAppSettingsLoading] = useState(true);
    const { updateAppSettings } = useContext(AppSettingsActionContext);
    const [appFunctionSettings, setAppFunctionSettings] =
        useState<AppSettingsData[AppSettingsGroup.AppFunction]>();
    useAppSettingsLoad(
        useCallback(() => {
            unregisterAll().then(() => {
                setAppSettingsLoading(false);
            });
        }, []),
    );

    useStateSubscriber(
        AppSettingsPublisher,
        useCallback((settings: AppSettingsData) => {
            setAppFunctionSettings(settings[AppSettingsGroup.AppFunction]);
        }, []),
    );

    useEffect(() => {
        if (appSettingsLoading) {
            return;
        }

        if (!appFunctionSettings) {
            return;
        }

        updateShortcutKeyStatus(appFunctionSettings);
    }, [appFunctionSettings, appSettingsLoading, updateShortcutKeyStatus]);

    return (
        <ContentWrap className="home-wrap">
            <GroupTitle id="commonFunction">
                <FormattedMessage id="home.commonFunction" key="commonFunction" />
            </GroupTitle>
            <Spin spinning={updateShortcutKeyStatusLoading || appSettingsLoading}>
                <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
                    {appFunctionComponentConfigsKeys.map((key) => {
                        const config = defaultAppFunctionComponentConfigs[key as AppFunction];
                        const statusColor = appSettingsLoading
                            ? undefined
                            : convertShortcutKeyStatusToButtonColor(
                                  shortcutKeyStatus?.[key as AppFunction],
                              );
                        const statusTip = appSettingsLoading
                            ? undefined
                            : convertShortcutKeyStatusToTip(
                                  shortcutKeyStatus?.[key as AppFunction],
                              );
                        const currentShortcutKey =
                            appFunctionSettings?.[key as AppFunction]?.shortcutKey;

                        return (
                            <FunctionButton
                                key={`${config.messageId}-${key}`}
                                label={<FormattedMessage id={config.messageId} />}
                                icon={<ScreenshotIcon />}
                                onClick={config.onClick}
                            >
                                {currentShortcutKey && (
                                    <KeyButton
                                        title={
                                            <FormattedMessage
                                                id={config.messageId}
                                                key={`${config.messageId}-${key}`}
                                            />
                                        }
                                        maxWidth={128}
                                        keyValue={currentShortcutKey}
                                        buttonProps={{
                                            variant: 'outlined',
                                            color: statusColor,
                                            children: statusTip ? (
                                                <Tooltip
                                                    title={convertShortcutKeyStatusToTip(
                                                        shortcutKeyStatus?.[key as AppFunction],
                                                    )}
                                                >
                                                    <InfoCircleOutlined />
                                                </Tooltip>
                                            ) : (
                                                <></>
                                            ),
                                            onClick: () => {
                                                disableShortcutKeyRef.current = true;
                                            },
                                        }}
                                        onCancel={() => {
                                            disableShortcutKeyRef.current = false;
                                        }}
                                        onKeyChange={async (value) => {
                                            disableShortcutKeyRef.current = false;
                                            updateAppSettings(
                                                AppSettingsGroup.AppFunction,
                                                {
                                                    [key as AppFunction]: {
                                                        ...appFunctionSettings,
                                                        shortcutKey: value,
                                                    },
                                                },
                                                false,
                                                true,
                                                false,
                                                false,
                                            );
                                        }}
                                        maxLength={1}
                                    />
                                )}
                            </FunctionButton>
                        );
                    })}
                </Space>
            </Spin>

            <style jsx>{`
                .home-wrap {
                }
            `}</style>
        </ContentWrap>
    );
}
