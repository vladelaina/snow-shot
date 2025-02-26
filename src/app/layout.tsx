import type { Metadata } from 'next';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledJsxRegistry from './registry';
import { MenuLayout } from './menuLayout';
import { ContextWrap } from './contextWrap';
import { TrayIconLoader } from './trayIcon';

export const metadata: Metadata = {
    title: 'SonnetShot',
    description: '一款设计优良的截图软件，供优雅的你优雅地使用。',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
            <body>
                <TrayIconLoader />
                <StyledJsxRegistry>
                    <AntdRegistry>
                        <ContextWrap>
                            <MenuLayout>{children}</MenuLayout>\
                        </ContextWrap>
                    </AntdRegistry>
                </StyledJsxRegistry>
            </body>
        </html>
    );
}
