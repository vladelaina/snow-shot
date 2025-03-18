import type { Metadata } from 'next';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledJsxRegistry from './registry';
import { MenuLayout } from './menuLayout';
import { ContextWrap } from './contextWrap';

export const metadata: Metadata = {
    title: 'SnowShot',
    description: '简洁、优雅，Snow Shot',
};

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
