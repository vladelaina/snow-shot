'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppstoreOutlined, CloseOutlined, MinusOutlined, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Layout, Menu, Space, theme } from 'antd';
import { useRouter } from 'next/navigation';
const { Content, Sider } = Layout;
import { usePathname } from 'next/navigation';
import RSC from 'react-scrollbars-custom';
import { AppSettingsContext, AppSettingsGroup, AppSettingsLanguage } from './contextWrap';
import { Header } from 'antd/es/layout/layout';
import { getCurrentWindow, Window as AppWindow } from '@tauri-apps/api/window';
import '@ant-design/v5-patch-for-react-19';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { zhHans } from '@/messages/zhHans';
import { useIntl } from 'react-intl';
import { TrayIconLoader } from './trayIcon';
import { EventListener } from '@/components/eventListener';

type MenuItem = Required<MenuProps>['items'][number];

export const MenuLayoutContext = createContext<{
    noLayout: boolean;
    pathname: string;
}>({
    noLayout: false,
    pathname: '/',
});

const MenuLayoutCore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        console.log('App zh-Hans messages: ', zhHans);
    }, []);

    const intl = useIntl();
    const appSettings = useContext(AppSettingsContext);
    const { updateAppSettings } = appSettings;
    const { darkMode } = appSettings[AppSettingsGroup.Common];

    const pathname = usePathname() || '/';
    const [collapsed, setCollapsed] = useState(false);
    useAppSettingsLoad(
        useCallback(
            (settings) => {
                setCollapsed(settings[AppSettingsGroup.Cache].menuCollapsed);

                // 获取浏览器语言，判断是否需要切换语言
                const settingBrowserLanguage = settings[AppSettingsGroup.Common].browserLanguage;
                const browserLanguage = navigator.language;
                if (settingBrowserLanguage !== browserLanguage) {
                    // 切换语言
                    let language = AppSettingsLanguage.EN;
                    if (browserLanguage.startsWith('zh')) {
                        if (browserLanguage.startsWith('zh-TW')) {
                            language = AppSettingsLanguage.ZHHant;
                        } else {
                            language = AppSettingsLanguage.ZHHans;
                        }
                    }

                    updateAppSettings(AppSettingsGroup.Common, {
                        browserLanguage: browserLanguage,
                        language,
                    });
                }
            },
            [updateAppSettings],
        ),
    );

    const { token } = theme.useToken();
    const router = useRouter();
    const { menuItems } = useMemo(() => {
        const routes = [
            {
                path: '/',
                label: intl.formatMessage({ id: 'menu.functions' }),
                icon: <AppstoreOutlined />,
            },
            {
                path: '/settings',
                label: intl.formatMessage({ id: 'menu.settings' }),
                icon: <SettingOutlined />,
            },
        ];

        const menuItems = routes.map(
            (route): MenuItem => ({
                key: route.path,
                label: route.label,
                icon: route.icon,
                onClick: () => {
                    router.push(route.path);
                },
            }),
        );

        return { menuItems, routes };
    }, [intl, router]);

    const appWindowRef = useRef<AppWindow | null>(null);
    useEffect(() => {
        appWindowRef.current = getCurrentWindow();
    }, []);

    return (
        <>
            <TrayIconLoader />
            <div className="menu-layout-wrap">
                <Layout>
                    <Sider
                        theme={darkMode ? 'dark' : 'light'}
                        collapsible
                        collapsed={collapsed}
                        onCollapse={(value) => {
                            setCollapsed(value);
                            updateAppSettings(
                                AppSettingsGroup.Cache,
                                { menuCollapsed: value },
                                true,
                            );
                        }}
                    >
                        <div className="logo-wrap">
                            <div className="logo-text">
                                {collapsed ? (
                                    <>
                                        <div className="logo-text-highlight">S</div>
                                        <div>NT</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="logo-text-highlight">Sonnet</div>
                                        <div>Shot</div>
                                    </>
                                )}
                            </div>
                        </div>
                        <Menu
                            defaultSelectedKeys={[menuItems[0]!.key?.toString() ?? '/']}
                            selectedKeys={[pathname]}
                            mode="inline"
                            items={menuItems}
                        />
                    </Sider>
                    <Layout>
                        <Header data-tauri-drag-region>
                            <Space>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<MinusOutlined />}
                                    onClick={() => {
                                        appWindowRef.current?.hide();
                                    }}
                                />
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={() => {
                                        appWindowRef.current?.close();
                                    }}
                                />
                            </Space>
                        </Header>
                        <Content>
                            <div className="content-wrap">
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                                <div className="center">
                                    <RSC>
                                        <div className="content-container">{children}</div>
                                    </RSC>
                                </div>
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                                <div data-tauri-drag-region></div>
                            </div>
                        </Content>
                    </Layout>
                </Layout>
                <style jsx>{`
                    .menu-layout-wrap {
                        box-shadow: 0 0 12px 0 rgba(0, 0, 0, 0.21);
                        overflow: hidden;
                        height: 100%;
                    }

                    .menu-layout-wrap :global(.ant-layout) {
                        height: 100% !important;
                    }

                    .menu-layout-wrap :global(.ant-layout-sider-trigger) {
                        position: absolute !important;
                    }

                    .menu-layout-wrap :global(.ant-layout-sider) {
                        box-shadow: ${token.boxShadowSecondary};
                    }

                    .menu-layout-wrap :global(.ant-layout-header) {
                        height: 32px !important;
                        background: ${token.colorBgContainer} !important;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        padding: 0 ${token.padding}px;
                    }

                    .menu-layout-wrap .logo-wrap {
                        margin-top: 16px;
                        margin-bottom: 10px;
                        font-weight: 600;
                        font-size: 21px;
                        text-align: center;
                        font-style: italic;
                    }

                    .menu-layout-wrap .logo-wrap .logo-text {
                        color: ${darkMode ? '#fff' : '#000'};
                        display: inline-block;
                        padding: 0px 12px;
                    }

                    .menu-layout-wrap .logo-wrap .logo-text .logo-text-highlight {
                        color: ${darkMode ? token['purple-7'] : token['purple-5']};
                    }

                    .menu-layout-wrap .logo-wrap .logo-text div {
                        display: inline;
                    }

                    .content-wrap {
                        display: grid;
                        grid-template-columns: ${token.padding}px auto ${token.padding}px;
                        grid-template-rows: ${token.padding}px auto ${token.padding}px;
                        height: 100%;
                    }

                    .center {
                        grid-column: 2;
                        grid-row: 2;
                        height: 100%;
                        overflow-y: scroll;
                        overflow-x: hidden;
                        border-radius: ${token.borderRadiusLG}px;
                        background-color: ${token.colorBgContainer} !important;
                        padding: ${token.padding}px ${token.borderRadiusLG}px;
                    }

                    .center::-webkit-scrollbar {
                        display: none;
                    }

                    {/* 重写滚动条样式 */}
                    .menu-layout-wrap .center>:global(.ScrollbarsCustom) :global(.ScrollbarsCustom-Track) {
                        background-color: rgba(0, 0, 0, 0.1) !important;
                        width: 3px !important;
                        border-radius: 1px !important;
                        height: 100% !important;
                        top: 0px !important;
                    }
                    .menu-layout-wrap .center>:global(.ScrollbarsCustom) :global(.ScrollbarsCustom-Thumb) {
                        background-color: rgba(0, 0, 0, 0.4) !important;
                        width: 100% !important;
                        border-radius: 1px !important;
                    }

                    .content-container {
                        padding: 0 ${token.padding}px;
                        width: 100%;
                        overflow-x: hidden;
                    }
                `}</style>
            </div>
        </>
    );
};

export const MenuLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const noLayout = pathname === '/draw';
    return (
        <MenuLayoutContext.Provider value={{ noLayout, pathname }}>
            <EventListener />
            {noLayout ? children : <MenuLayoutCore>{children}</MenuLayoutCore>}
        </MenuLayoutContext.Provider>
    );
};
