'use client';

import React from 'react';
import { GroupTitle } from '@/components/groupTitle';
import { useIntl } from 'react-intl';
import { Space } from 'antd';
import { ContentWrap } from '@/components/contentWrap';
import { ScreenshotIcon } from '@/components/icons';
import { FunctionButton } from '@/components/functionButton';
import { executeScreenshot } from '@/functions/screenshot';

export default function Home() {
    const intl = useIntl();
    return (
        <ContentWrap className="home-wrap">
            <GroupTitle>{intl.formatMessage({ id: 'home.commonFunction' })}</GroupTitle>
            <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
                <FunctionButton
                    label={intl.formatMessage({ id: 'home.screenshot' })}
                    icon={<ScreenshotIcon />}
                    onClick={async () => {
                        await executeScreenshot();
                    }}
                />
            </Space>

            <style jsx>{`
                .home-wrap {
                }
            `}</style>
        </ContentWrap>
    );
}
