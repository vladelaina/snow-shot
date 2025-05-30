'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Divider, Tag, Typography, Space, Button, theme } from 'antd';
import { GithubOutlined, MessageOutlined, MailOutlined } from '@ant-design/icons';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useIntl } from 'react-intl';

const { Title, Paragraph, Text } = Typography;

const About = () => {
    const { token } = theme.useToken();
    const intl = useIntl();
    const [version, setVersion] = useState('0.1.3');

    const init = useCallback(async () => {
        const version = await getVersion();
        setVersion(version);
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    return (
        <div
            style={{
                margin: `${token.marginLG}px 0`,
                minHeight: '100vh',
            }}
        >
            {/* 头部信息 */}
            <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
                <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={'/images/snow_shot_logo.png'}
                        alt="Snow Shot"
                        width={83}
                        height={83}
                    />
                </div>
                <Title level={2} style={{ marginTop: token.marginSM }}>
                    <span style={{ color: 'var(--snow-shot-purple-color)' }}>Snow </span>
                    <span>Shot</span>
                </Title>
                <Text type="secondary">{intl.formatMessage({ id: 'about.subtitle' })}</Text>
                <div style={{ marginTop: token.margin }}>
                    <Tag color="blue">
                        {intl.formatMessage({ id: 'about.version' })} {version}
                    </Tag>
                    <Tag color="green">
                        <a
                            style={{ color: token.colorLink }}
                            onClick={() => openUrl('https://github.com/mg-chao')}
                        >
                            {intl.formatMessage({ id: 'about.author' })}
                        </a>
                    </Tag>
                </div>
            </div>

            <Divider />

            {/* 开源协议 */}
            <div style={{ marginBottom: token.marginLG }}>
                <Title level={3}>{intl.formatMessage({ id: 'about.license.title' })}</Title>
                <Paragraph>{intl.formatMessage({ id: 'about.license.description' })}</Paragraph>
                <ul>
                    <li>
                        <strong>{intl.formatMessage({ id: 'about.license.nonCommercial' })}</strong>
                        <a onClick={() => openUrl('https://www.apache.org/licenses/LICENSE-2.0')}>
                            {intl.formatMessage({ id: 'about.license.nonCommercialType' })}
                        </a>
                    </li>
                    <li>
                        <strong>{intl.formatMessage({ id: 'about.license.commercial' })}</strong>
                        <a onClick={() => openUrl('https://www.gnu.org/licenses/gpl-3.0.html')}>
                            {intl.formatMessage({ id: 'about.license.commercialType' })}
                        </a>
                    </li>
                </ul>
            </div>

            {/* 联系方式 */}
            <div style={{ marginBottom: token.marginLG }}>
                <Title level={3}>{intl.formatMessage({ id: 'about.contact.title' })}</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        icon={<GithubOutlined />}
                        onClick={() => openUrl('https://github.com/mg-chao/snow-shot/issues')}
                        block
                    >
                        {intl.formatMessage({ id: 'about.contact.github' })}
                    </Button>
                    <Button
                        icon={<MessageOutlined />}
                        onClick={() => openUrl('https://space.bilibili.com/3546897042114689')}
                        block
                    >
                        {intl.formatMessage({ id: 'about.contact.bilibili' })}
                    </Button>
                    <Button
                        icon={<MailOutlined />}
                        onClick={() => openUrl('mailto:chao@mgchao.top')}
                        block
                    >
                        {intl.formatMessage({ id: 'about.contact.email' })}
                    </Button>
                    <Text style={{ textAlign: 'center', display: 'block' }}>
                        {intl.formatMessage({ id: 'about.contact.qqGroup' })}
                        <Text copyable>974311403</Text>
                    </Text>
                </Space>
            </div>
        </div>
    );
};

export default About;
