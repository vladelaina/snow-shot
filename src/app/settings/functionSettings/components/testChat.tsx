import { ModalForm } from '@ant-design/pro-form';
import { Alert, Spin, theme } from 'antd';
import React, { useCallback, useState } from 'react';
import { ChatApiConfig } from '../extra';
import OpenAI from 'openai';
import { FormattedMessage } from 'react-intl';
import { TestChatIcon } from '@/components/icons';
import { appFetch } from '@/services/tools';

export const TestChat: React.FC<{ config: ChatApiConfig }> = ({ config }) => {
    const { token } = theme.useToken();
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTest = useCallback(async () => {
        setLoading(true);
        setResult('');
        try {
            const client = new OpenAI({
                apiKey: config.api_key,
                baseURL: config.api_uri,
                dangerouslyAllowBrowser: true,
                fetch: appFetch,
            });

            const stream_response = await client.chat.completions.create({
                model: config.api_model,
                messages: [{ role: 'user', content: 'Say "Hello, world!"' }],
                stream: true,
                max_completion_tokens: 4096,
                temperature: 1,
            });

            for await (const event of stream_response) {
                if (event.choices.length > 0 && event.choices[0].delta.content) {
                    setResult((prev) => `${prev}${event.choices[0].delta.content}`);
                }
            }
        } catch (error) {
            console.error(error);
        }

        setLoading(false);
    }, [config]);

    return (
        <ModalForm
            title="Test Chat"
            trigger={
                <span onClick={handleTest} className="anticon ant-pro-form-list-action-icon">
                    <TestChatIcon />
                </span>
            }
            onFinish={async () => {
                return true;
            }}
        >
            <Alert
                type="info"
                message={
                    <FormattedMessage
                        id="settings.functionSettings.chatSettings.testPrompt"
                        values={{
                            prompt: '"Say "Hello, world!""',
                        }}
                    />
                }
                style={{ marginBottom: token.margin }}
            />
            <Spin spinning={loading}>
                <div style={{ display: 'inline-block' }}>{result}</div>
            </Spin>
        </ModalForm>
    );
};
