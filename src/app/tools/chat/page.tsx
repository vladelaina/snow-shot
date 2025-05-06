'use client';

import { AntdContext } from '@/app/layout';
import { BotIcon, SidebarIcon } from '@/components/icons';
import { useStateRef } from '@/hooks/useStateRef';
import { ChatHistoryStore } from '@/utils/appStore';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
    Bubble,
    Conversations,
    Sender,
    Suggestion,
    useXAgent,
    useXChat,
    Welcome,
    XRequest,
} from '@ant-design/x';
import type { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList';
import type { Conversation } from '@ant-design/x/es/conversations';
import { MessageInfo } from '@ant-design/x/es/use-x-chat';
import { Button, Drawer, Select, Space, Spin, Tag, theme, Typography } from 'antd';
import dayjs from 'dayjs';
import { debounce, last, throttle } from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import RSC, { Scrollbar } from 'react-scrollbars-custom';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { getUrl, ServiceResponse } from '@/services/tools';
import { ChatModel, getChatModels } from '@/services/tools/chat';
import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams } from 'next/navigation';
import { getSelectedText } from '@/commands/core';
import { finishScreenshot } from '@/functions/screenshot';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SenderRef } from '@ant-design/x/es/sender';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';

const MarkdownContent: React.FC<{
    content: string;
    clipboardContent: string;
}> = ({ content, clipboardContent }) => {
    const [darkMode, setDarkMode] = useState(false);
    useStateSubscriber(
        AppSettingsPublisher,
        useCallback((settings: AppSettingsData) => {
            setDarkMode(settings[AppSettingsGroup.Common].darkMode);
        }, []),
    );

    return (
        <Typography data-clipboard-content={clipboardContent}>
            <Markdown
                components={{
                    code(props) {
                        const { children, className, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                            <SyntaxHighlighter
                                {...rest}
                                ref={undefined}
                                PreTag="div"
                                language={match[1]}
                                style={darkMode ? oneDark : oneLight}
                                wrapLongLines
                                showLineNumbers
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code {...rest} className={className}>
                                {children}
                            </code>
                        );
                    },
                }}
                remarkPlugins={[remarkGfm]}
            >
                {content}
            </Markdown>

            <style jsx>{`
                :global(.ant-typography pre) {
                    background-color: transparent;
                    padding: 0;
                }

                :global(.ant-typography pre > div) {
                    margin: 0 !important;
                }
            `}</style>
        </Typography>
    );
};

const modelRequest = XRequest({
    baseURL: getUrl('/api/v1/chat/chat/completions'),
    fetch: tauriFetch,
});

type ChatMessage = {
    content:
        | {
              reasoning_content: string;
              content: string;
              response_error: boolean;
          }
        | string;
    role: 'user' | 'assistant';
};

const defaultModel = 'deepseek-reasoner';
const defaultModles: ChatModel[] = [
    {
        model: 'deepseek-chat',
        name: 'DeepSeek-V3',
        thinking: false,
    },
    {
        model: 'deepseek-reasoner',
        name: 'DeepSeek-R1',
        thinking: true,
    },
];

const ModelSelectLabel: React.FC<{
    model: ChatModel;
}> = ({ model }) => {
    return (
        <Space>
            <div>{model.name}</div>
            <div>
                {model.thinking && (
                    <Tag color="processing">
                        <FormattedMessage id="tools.chat.reasoner" />
                    </Tag>
                )}
            </div>
        </Space>
    );
};

const fliterErrorMessages = (messages: BubbleDataType[] | undefined) => {
    if (!messages) {
        return [];
    }

    const newMessages = [];
    for (let i = 0; i < messages.length; i += 2) {
        const userMessage = messages[i];
        const assistantMessage = messages[i + 1];

        if (!userMessage) {
            break;
        }

        if (!assistantMessage) {
            newMessages.push(userMessage);
            continue;
        }

        if (
            assistantMessage.content &&
            typeof assistantMessage.content === 'object' &&
            'response_error' in assistantMessage.content &&
            assistantMessage.content.response_error
        ) {
            continue;
        }

        newMessages.push(userMessage);
        newMessages.push(assistantMessage);
    }

    return newMessages;
};

const Copilot = () => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { message, modal } = useContext(AntdContext);
    const chatHistoryStoreRef = useRef<ChatHistoryStore | undefined>(undefined);
    const [sessionStoreLoading, setSessionStoreLoading] = useState(true);
    const [supportedModels, setSupportedModels] = useState<ChatModel[]>(defaultModles);
    const [selectedModel, setSelectedModel, selectedModelRef] = useStateRef<string>(defaultModel);

    const { updateAppSettings } = useContext(AppSettingsActionContext);
    const [getAppSettings] = useStateSubscriber(
        AppSettingsPublisher,
        useCallback(
            (settings: AppSettingsData) => {
                setSelectedModel(settings[AppSettingsGroup.Cache].chatModel);
            },
            [setSelectedModel],
        ),
    );

    const [supportedModelsLoading, setSupportedModelsLoading, supportedModelsLoadingRef] =
        useStateRef(false);
    useEffect(() => {
        if (supportedModelsLoadingRef.current) {
            return;
        }

        setSupportedModelsLoading(true);
        getChatModels().then((res) => {
            setSupportedModelsLoading(false);
            if (!res.success()) {
                return;
            }

            setSupportedModels(res.data ?? defaultModles);
        });
    }, [setSupportedModelsLoading, supportedModelsLoadingRef]);

    const abortController = useRef<AbortController>(null);

    const [messageHistory, setMessageHistory, messageHistoryRef] = useStateRef<
        Record<string, MessageInfo<BubbleDataType>[]>
    >({});

    const [sessionList, setSessionList, sessionListRef] = useStateRef<
        (Conversation & { isDefaultSession: boolean })[]
    >([]);
    const [curSession, setCurSession, curSessionRef] = useStateRef<string | undefined>(undefined);

    const [inputValue, setInputValue] = useState('');
    const senderRef = useRef<SenderRef>(null);

    // ==================== Runtime ====================
    const [agent] = useXAgent<BubbleDataType>(
        useMemo(() => {
            return {
                request: (input, callbacks) => {
                    const inputMessages = input.messages?.slice(-20);
                    const newInputMessages = fliterErrorMessages(inputMessages);

                    return modelRequest.create(
                        {
                            messages: newInputMessages?.map((i) => ({
                                role: i.role ?? '',
                                content:
                                    typeof i.content === 'string'
                                        ? i.content
                                        : (i.content as ChatMessage).content,
                            })),
                            model: selectedModelRef.current,
                            temperature: getAppSettings()[AppSettingsGroup.SystemChat].temperature,
                            max_tokens: getAppSettings()[AppSettingsGroup.SystemChat].maxTokens,
                            stream: true,
                        },
                        callbacks,
                    );
                },
            };
        }, [getAppSettings, selectedModelRef]),
    );
    const loading = agent.isRequesting();

    const { messages, onRequest, setMessages } = useXChat({
        agent,
        requestFallback: (_, { error }): ChatMessage => {
            if (error.name === 'AbortError') {
                return {
                    content: {
                        reasoning_content: '',
                        content: intl.formatMessage({ id: 'tools.chat.requestAborted' }),
                        response_error: true,
                    },
                    role: 'assistant',
                };
            }
            return {
                content: {
                    reasoning_content: '',
                    content: intl.formatMessage({ id: 'tools.chat.requestFailed' }),
                    response_error: true,
                },
                role: 'assistant',
            };
        },
        transformMessage: (info): ChatMessage => {
            const { originMessage, chunk } = info || {};

            if (chunk && 'code' in chunk && 'message' in chunk) {
                const chatResponse = ServiceResponse.serviceError(
                    { status: 200, statusText: 'Service Error' } as Response,
                    chunk.code as number,
                    chunk.message as string,
                );
                chatResponse.success();
                return {
                    content: {
                        reasoning_content: '',
                        content: chatResponse.message ?? 'Service Error',
                        response_error: true,
                    },
                    role: 'assistant',
                };
            }

            if (typeof originMessage?.content === 'string') {
                return {
                    content: {
                        reasoning_content: '',
                        content: originMessage.content,
                        response_error: false,
                    },
                    role: originMessage.role as ChatMessage['role'],
                };
            }

            const messageContent = (originMessage?.content ?? {
                reasoning_content: '',
                content: '',
                response_error: false,
            }) as ChatMessage['content'];
            if (typeof messageContent === 'string') {
                throw new Error('messageContent is string');
            }

            try {
                if (chunk?.data && !chunk?.data.includes('DONE')) {
                    const message = JSON.parse(chunk?.data);

                    if (message?.choices?.[0].delta?.reasoning_content) {
                        messageContent.reasoning_content =
                            messageContent.reasoning_content +
                            message?.choices?.[0].delta?.reasoning_content;
                    } else {
                        messageContent.content += message?.choices?.[0].delta?.content ?? '';
                    }
                }
            } catch (error) {
                console.error(error);
            }

            return {
                content: messageContent,
                role: 'assistant',
            };
        },
        resolveAbortController: (controller) => {
            abortController.current = controller;
        },
    });

    const createNewSession = useCallback(async () => {
        return new Promise<void>((resolve) => {
            const currentDate = dayjs().format('YYYY-MM-DD');
            const sessionKey = `${currentDate}-${new Date().valueOf()}`;
            abortController.current?.abort();
            setTimeout(() => {
                setSessionList((prev) => [
                    {
                        key: sessionKey,
                        label: intl.formatMessage({ id: 'tools.chat.newSession' }),
                        group: currentDate,
                        timestamp: new Date().valueOf(),
                        isDefaultSession: true,
                    },
                    ...prev,
                ]);
                setCurSession(sessionKey);
                setMessages([]);

                resolve();
            }, 100);
        });
    }, [intl, setCurSession, setMessages, setSessionList]);

    const [openSession, setOpenSession] = useState(false);
    const chatHeader = (
        <div className="chatHeader">
            <Drawer
                open={openSession}
                placement="left"
                title={<FormattedMessage id="tools.chat.sessions" />}
                onClose={() => setOpenSession(false)}
                maskClosable
                closeIcon={false}
                styles={{ body: { padding: `${token.paddingXS}px ${token.padding}px` } }}
                extra={
                    <Button
                        type="text"
                        icon={<DeleteOutlined style={{ color: token.colorError }} />}
                        onClick={() => {
                            modal.confirm({
                                title: intl.formatMessage({
                                    id: 'tools.chat.session.clear',
                                }),
                                content: intl.formatMessage({
                                    id: 'tools.chat.session.clear.tip',
                                }),
                                onOk: () => {
                                    setMessages([]);
                                    setCurSession(undefined);
                                    setSessionList([]);
                                    setMessageHistory({});
                                    setOpenSession(false);
                                    chatHistoryStoreRef.current?.clear();
                                    abortController.current?.abort();
                                },
                            });
                        }}
                    />
                }
            >
                <RSC>
                    <Conversations
                        items={sessionList?.map((i) =>
                            i.key === curSession
                                ? {
                                      ...i,
                                      label: `[${intl.formatMessage({ id: 'tools.chat.session.current' })}] ${i.label}`,
                                  }
                                : i,
                        )}
                        activeKey={curSession}
                        groupable
                        onActiveChange={async (val) => {
                            abortController.current?.abort();
                            // The abort execution will trigger an asynchronous requestFallback, which may lead to timing issues.
                            // In future versions, the sessionId capability will be added to resolve this problem.
                            setTimeout(() => {
                                setCurSession(val);
                                setMessages(
                                    (messageHistory?.[val] || []) as MessageInfo<ChatMessage>[],
                                );
                            }, 100);

                            autoScrollRef.current = true;
                        }}
                        styles={{ item: { padding: '0 8px' } }}
                        className="conversations"
                    />
                </RSC>
            </Drawer>

            <Space>
                <Button
                    type="text"
                    icon={<SidebarIcon />}
                    disabled={sessionList.length === 0}
                    className="chatHeaderHeaderButton"
                    onClick={() => setOpenSession(true)}
                />

                <Select
                    value={selectedModel}
                    options={supportedModels.map((item) => ({
                        label: <ModelSelectLabel model={item} />,
                        value: item.model,
                    }))}
                    variant="underlined"
                    disabled={loading}
                    onChange={(val) => {
                        setSelectedModel(val);
                        updateAppSettings(
                            AppSettingsGroup.Cache,
                            { chatModel: val },
                            true,
                            true,
                            false,
                        );
                    }}
                    dropdownStyle={{ minWidth: 256 }}
                    loading={supportedModelsLoading}
                />
            </Space>

            <div>
                <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        if (messages && messages.length > 0) {
                            createNewSession();
                        } else {
                            message.error(intl.formatMessage({ id: 'tools.chat.newSession.tip' }));
                        }
                    }}
                    disabled={!(messages && messages.length > 0)}
                >
                    <FormattedMessage id="tools.chat.newSession" />
                </Button>
            </div>
        </div>
    );

    const bubbleItems = useMemo((): BubbleDataType[] | undefined => {
        if (!messages || messages.length === 0) return undefined;

        const botAvatar = {
            icon: <BotIcon />,
            style: {
                color: token.colorPrimary,
                backgroundColor: 'transparent',
                fontSize: '2em',
            },
        };
        const list = messages.map((i): BubbleDataType => {
            const itemMessage = i.message as ChatMessage;

            const content =
                typeof itemMessage.content === 'string'
                    ? itemMessage.content
                    : `${
                          itemMessage.content.reasoning_content
                              ? `${itemMessage.content.reasoning_content
                                    .split('\n')
                                    .map((line) => {
                                        return `> ${line}`;
                                    })
                                    .join('\n')}\n\n`
                              : ''
                      }${itemMessage.content.content}`;

            return {
                role: i.message.role,
                placement: i.message.role === 'assistant' ? 'start' : 'end',
                content,
                classNames: {
                    content: i.status === 'loading' ? 'loadingMessage' : '',
                },
                variant: i.message.role === 'assistant' ? 'borderless' : 'filled',
                messageRender:
                    i.message.role === 'assistant'
                        ? () => {
                              return (
                                  <MarkdownContent content={content} clipboardContent={content} />
                              );
                          }
                        : undefined,
                avatar: i.message.role === 'assistant' ? botAvatar : undefined,
                // typing: i.status === 'loading' ? { step: 2, interval: 50 } : false,
            };
        });

        if (loading && last(list)?.role !== 'assistant') {
            list.push({
                loading: true,
                role: 'assistant',
                avatar: botAvatar,
                variant: 'borderless',
            });
        }

        return list;
    }, [loading, messages, token.colorPrimary]);

    useEffect(() => {
        if (chatHistoryStoreRef.current) {
            return;
        }

        chatHistoryStoreRef.current = new ChatHistoryStore();
        setSessionStoreLoading(true);
        chatHistoryStoreRef.current.init().then(async () => {
            setSessionStoreLoading(false);

            const chatHistory = (await chatHistoryStoreRef.current!.entries()).sort((a, b) => {
                return b[1].session.key.localeCompare(a[1].session.key);
            });
            const sessionList = [];
            const messageHistory = {} as Record<string, MessageInfo<BubbleDataType>[]>;
            for (const [key, value] of chatHistory) {
                sessionList.push({
                    ...value.session,
                    isDefaultSession: false,
                });
                messageHistory[key] = value.messages;
            }
            setSessionList(sessionList);
            setMessageHistory(messageHistory);
        });
    }, [setSessionList, setMessages, setMessageHistory]);

    const scrollbarRef = useRef<Scrollbar | null>(null);
    const autoScrollRef = useRef<boolean>(true);
    const chatList = (
        <div className="chatList">
            <RSC
                ref={scrollbarRef as never}
                onWheel={() => {
                    autoScrollRef.current = false;
                }}
            >
                {bubbleItems ? (
                    /** 消息列表 */
                    <Bubble.List
                        style={{ height: '100%', paddingInline: 16 }}
                        items={bubbleItems}
                        key={curSession}
                        roles={{
                            assistant: {
                                placement: 'start',
                                loadingRender: () => (
                                    <Space>
                                        <Spin size="small" />
                                        <FormattedMessage id="tools.chat.agentPlaceholder" />
                                    </Space>
                                ),
                                footer: (content) => (
                                    <div style={{ display: 'flex' }}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                                if (
                                                    !content ||
                                                    typeof content !== 'object' ||
                                                    !('props' in content)
                                                ) {
                                                    return;
                                                }

                                                navigator.clipboard.writeText(
                                                    content['props']['data-clipboard-content'],
                                                );
                                            }}
                                        />
                                    </div>
                                ),
                            },
                            user: { placement: 'end' },
                        }}
                    />
                ) : (
                    <div className="chatWelcomeWrap">
                        <Welcome
                            variant="borderless"
                            title={intl.formatMessage({ id: 'tools.chat.welcome.title' })}
                            description={intl.formatMessage({
                                id: 'tools.chat.welcome.description',
                            })}
                        />
                    </div>
                )}
            </RSC>
        </div>
    );

    const chatSender = (
        <div className="chatSend">
            {/** 输入框 */}
            <Suggestion items={[]} onSelect={(itemVal) => setInputValue(`[${itemVal}]:`)}>
                {({ onTrigger, onKeyDown }) => (
                    <Sender
                        ref={senderRef}
                        loading={loading}
                        value={inputValue}
                        onChange={(v) => {
                            onTrigger(v === '/');
                            setInputValue(v);
                        }}
                        disabled={sessionStoreLoading}
                        onSubmit={async () => {
                            if (!curSession) {
                                await createNewSession();
                            }

                            handleUserSubmit(inputValue);
                            setInputValue('');
                            autoScrollRef.current = true;
                        }}
                        onCancel={() => {
                            abortController.current?.abort();
                        }}
                        placeholder={intl.formatMessage({ id: 'tools.chat.placeholder' })}
                        onKeyDown={onKeyDown}
                        actions={(_, info) => {
                            const { SendButton, LoadingButton } = info.components;
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {loading ? (
                                        <LoadingButton type="default" />
                                    ) : (
                                        <SendButton type="primary" />
                                    )}
                                </div>
                            );
                        }}
                    />
                )}
            </Suggestion>
        </div>
    );

    const updateHistory = useCallback(
        (msgList: MessageInfo<BubbleDataType>[] | undefined) => {
            const currentSession = curSessionRef.current;
            if (msgList && msgList.length > 0 && currentSession) {
                setMessageHistory((prev) => ({
                    ...prev,
                    [currentSession]: msgList,
                }));
                chatHistoryStoreRef.current?.set(currentSession, {
                    session: sessionListRef.current.find((i) => i.key === currentSession)!,
                    messages: msgList,
                });
            }
        },
        [curSessionRef, sessionListRef, setMessageHistory],
    );
    const updateHistoryDebounce = useMemo(() => debounce(updateHistory, 1000), [updateHistory]);

    const scrollToBottom = useMemo(() => {
        return throttle(() => {
            if (!autoScrollRef.current || !scrollbarRef.current) {
                return;
            }
            scrollbarRef.current.scrollToBottom();
        }, 100);
    }, []);

    useEffect(() => {
        updateHistoryDebounce(messages);
        scrollToBottom();
    }, [messages, updateHistoryDebounce, scrollToBottom]);

    const handleUserSubmit = useCallback(
        (val: string) => {
            onRequest({
                stream: true,
                message: {
                    content: val,
                    role: 'user',
                },
            });

            if (
                sessionListRef.current.find((i) => i.key === curSessionRef.current)
                    ?.isDefaultSession
            ) {
                setSessionList((prev) =>
                    prev.map((i) =>
                        i.key !== curSessionRef.current
                            ? i
                            : { ...i, label: val?.slice(0, 20), isDefaultSession: false },
                    ),
                );
            }
        },
        [onRequest, sessionListRef, curSessionRef, setSessionList],
    );

    const searchParams = useSearchParams();
    const searchParamsSign = searchParams.get('t');
    const searchParamsType = searchParams.get('type');
    const prevSearchParamsSign = useRef<string | null>(null);
    const handleSelectedText = useCallback(async () => {
        if (prevSearchParamsSign.current === searchParamsSign) {
            return;
        }

        prevSearchParamsSign.current = searchParamsSign;

        if (searchParamsType === 'selectText') {
            let newSessionPromise: Promise<void> | undefined = undefined;
            if (
                messageHistoryRef.current &&
                curSessionRef.current &&
                messageHistoryRef.current[curSessionRef.current].length > 0
            ) {
                newSessionPromise = createNewSession();
            }

            const hideLoading = message.loading(
                intl.formatMessage({ id: 'tools.translation.getSelectText.loading' }),
            );
            const text = await getSelectedText();
            hideLoading();

            finishScreenshot();
            getCurrentWindow().setFocus();

            if (!text) {
                message.error(intl.formatMessage({ id: 'tools.translation.getSelectText.failed' }));
                return;
            }

            if (newSessionPromise) {
                await newSessionPromise;
            }
            setInputValue(text);
            senderRef.current?.focus();
        }
    }, [
        createNewSession,
        curSessionRef,
        intl,
        message,
        messageHistoryRef,
        searchParamsSign,
        searchParamsType,
    ]);
    useEffect(() => {
        handleSelectedText();
    }, [handleSelectedText]);

    return (
        <div className="copilotChat">
            {/** 对话区 - header */}
            {chatHeader}

            {/** 对话区 - 消息列表 */}
            {chatList}

            {/** 对话区 - 输入框 */}
            {chatSender}

            <style jsx>{`
                :global(.copilotChat) {
                    display: flex;
                    width: 100%;
                    flex-direction: column;
                    background: var(--antd-color-bg-container);
                    color: var(--antd-color-text);
                }
                :global(.chatHeader) {
                    height: 64px;
                    box-sizing: border-box;
                    border-bottom: 1px solid var(--antd-color-border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: ${token.padding}px ${token.padding}px;
                }
                :global(.headerTitle) {
                    font-weight: 600;
                    font-size: 15px;
                }
                :global(.chatHeaderHeaderButton) {
                    font-size: 18px !important;
                }
                :global(.conversations) {
                    box-sizing: border-box;
                    padding: 0 !important;
                }
                :global(.conversations .ant-conversations-list) {
                    padding-inline-start: 0;
                }
                :global(.chatList) {
                    overflow: auto;
                    height: 100%;
                    padding: 0 ${token.padding}px;
                }

                :global(.chatWelcomeWrap) {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding-bottom: 11.8%;
                }
                :global(.loadingMessage) {
                    background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);
                    background-size: 100% 2px;
                    background-repeat: no-repeat;
                    background-position: bottom;
                }
                :global(.chatSend) {
                    padding: 0px;
                    padding: ${token.padding}px;
                }
                :global(.sendAction) {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                    gap: 8px;
                }
                :global(.speechButton) {
                    font-size: 18px;
                    color: var(--antd-color-text) !important;
                }

                :global(.ant-bubble-content-wrapper .ant-bubble-footer) {
                    opacity: 0;
                    transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                }

                :global(.ant-bubble-content-wrapper:hover .ant-bubble-footer) {
                    opacity: 1;
                }

                :global(.ant-bubble-content .ant-typography > div > p):first-child {
                    margin-top: ${token.marginXXS}px;
                }
            `}</style>
        </div>
    );
};

const CopilotDemo = () => {
    return (
        <div className="copilotWrapper">
            <Copilot />

            <style jsx>{`
                :global(.copilotWrapper) {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }
                :global(.workarea) {
                    flex: 1;
                    background: var(--antd-color-bg-layout);
                    display: flex;
                    flex-direction: column;
                }
                :global(.workareaHeader) {
                    box-sizing: border-box;
                    height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 48px 0 28px;
                    border-bottom: 1px solid var(--antd-color-border);
                }
                :global(.headerTitle) {
                    font-weight: 600;
                    font-size: 15px;
                    color: var(--antd-color-text);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                :global(.headerButton) {
                    background-image: linear-gradient(78deg, #8054f2 7%, #3895da 95%);
                    border-radius: 12px;
                    height: 24px;
                    width: 93px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.3s;
                }
                :global(.headerButton:hover) {
                    opacity: 0.8;
                }
                :global(.workareaBody) {
                    flex: 1;
                    padding: 16px;
                    background: var(--antd-color-bg-container);
                    border-radius: 16px;
                    min-height: 0;
                }
                :global(.bodyContent) {
                    overflow: auto;
                    height: 100%;
                    padding-right: 10px;
                }
                :global(.bodyText) {
                    color: var(--antd-color-text);
                    padding: 8px;
                }
            `}</style>
        </div>
    );
};

export default CopilotDemo;
