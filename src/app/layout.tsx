'use client';

import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledJsxRegistry from './registry';
import { ContextWrap } from './contextWrap';
import { MenuLayout } from './menuLayout';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
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
