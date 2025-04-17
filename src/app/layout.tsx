'use client';

import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledJsxRegistry from './registry';
import { ContextWrap } from './contextWrap';
import { MenuLayout } from './menuLayout';
import Script from 'next/dist/client/script';

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
                <StyledJsxRegistry>
                    <AntdRegistry>
                        <ContextWrap>
                            <MenuLayout>{children}</MenuLayout>
                        </ContextWrap>
                    </AntdRegistry>
                </StyledJsxRegistry>
            </body>
        </html>
    );
}
