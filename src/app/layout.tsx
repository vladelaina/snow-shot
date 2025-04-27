'use client';

import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledJsxRegistry from './registry';
import { ContextWrap } from './contextWrap';
import { MenuLayout } from './menuLayout';
import Script from 'next/dist/client/script';
import { App as AntdApp, message, Modal } from 'antd';
import React from 'react';
import { MessageInstance } from 'antd/es/message/interface';
import { HookAPI } from 'antd/es/modal/useModal';

export type AntdContextType = {
    message: MessageInstance;
    modal: HookAPI;
};

export const AntdContext = React.createContext<AntdContextType>({
    message: {} as MessageInstance,
    modal: {} as HookAPI,
});

export const AntdContextWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [modalApi, modalContextHolder] = Modal.useModal();
    return (
        <AntdContext.Provider value={{ message: messageApi, modal: modalApi }}>
            {messageContextHolder}
            {modalContextHolder}
            {children}
        </AntdContext.Provider>
    );
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
            <head>
                <Script id="load-env-variables" strategy="beforeInteractive">
                    {`window["EXCALIDRAW_ASSET_PATH"] = location.origin;`}
                </Script>
            </head>
            <body>
                <AntdApp>
                    <StyledJsxRegistry>
                        <AntdRegistry>
                            <ContextWrap>
                                <AntdContextWrap>
                                    <MenuLayout>{children}</MenuLayout>
                                </AntdContextWrap>
                            </ContextWrap>
                        </AntdRegistry>
                    </StyledJsxRegistry>
                </AntdApp>
            </body>
        </html>
    );
}
