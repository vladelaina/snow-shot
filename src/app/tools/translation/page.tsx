'use client';

import { AppSettingsGroup, AppSettingsLanguage } from '@/app/contextWrap';
import { AntdContext } from '@/app/layout';
import { getSelectedText } from '@/commands/core';
import { ContentWrap } from '@/components/contentWrap';
import { KeyboardIcon } from '@/components/icons';
import { KeyEventKey, KeyEventValue } from '@/core/hotKeys';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { useStateRef } from '@/hooks/useStateRef';
import translate from '@/services/tools/translation';
import { SwapOutlined } from '@ant-design/icons';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Button, Dropdown, Flex, Form, Select, SelectProps, Spin, theme } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { debounce } from 'lodash';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FormattedMessage, useIntl } from 'react-intl';

const SelectLabel: React.FC<{
    label: React.ReactNode;
    code: React.ReactNode;
}> = ({ label, code }) => {
    const { token } = theme.useToken();
    return (
        <div className="language-item">
            <div className="language-item-label">{label}</div>
            <div className="language-item-code">{code}</div>

            <style jsx>{`
                .language-item {
                    position: relative;
                }

                .language-item-label {
                    display: inline;
                }

                .language-item-code {
                    display: inline;
                    color: ${token.colorTextDescription};
                    margin-left: ${token.marginXS}px;
                    font-size: 0.7em;
                    position: relative;
                    bottom: 0.15em;
                }
            `}</style>
        </div>
    );
};

type LanguageItem = {
    code: string;
    label: string;
};

const convertLanguageListToOptions = (list: LanguageItem[]): SelectProps['options'] => {
    // 按首字母分组
    const groupedLanguages = list.reduce(
        (acc, lang) => {
            const firstChar = lang.code.charAt(0).toUpperCase();
            if (!acc[firstChar]) {
                acc[firstChar] = [];
            }
            acc[firstChar].push(lang);
            return acc;
        },
        {} as Record<string, LanguageItem[]>,
    );

    // 转换为 Select 选项格式
    return Object.entries(groupedLanguages).map(([key, languages]) => ({
        label: <span>{key}</span>,
        title: key,
        options: languages.map((lang) => ({
            label: <SelectLabel label={lang.label} code={lang.code.toUpperCase()} />,
            title: `${lang.label}(${lang.code.toLowerCase()})`,
            value: lang.code,
        })),
    }));
};

const selectFilterOption: SelectProps['filterOption'] = (input, option) => {
    if (!input || !option?.title) return false;
    const pattern = input.toLowerCase().split('').join('.*');
    const regex = new RegExp(pattern, 'i');
    return regex.test(option.title.toString().toLowerCase());
};

export default function Translation() {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { message } = useContext(AntdContext);

    const [languageOptions, languageCodeLabelMap] = useMemo(() => {
        const languageCodeLabelMap = new Map<string, string>();
        const languageList = [
            {
                code: 'en',
                label: intl.formatMessage({ id: 'tools.translation.language.english' }),
            },
            {
                code: 'zh-CHS',
                label: intl.formatMessage({ id: 'tools.translation.language.simplifiedChinese' }),
            },
            {
                code: 'zh-CHT',
                label: intl.formatMessage({ id: 'tools.translation.language.traditionalChinese' }),
            },
            {
                code: 'es',
                label: intl.formatMessage({ id: 'tools.translation.language.spanish' }),
            },
            {
                code: 'fr',
                label: intl.formatMessage({ id: 'tools.translation.language.french' }),
            },
            {
                code: 'ar',
                label: intl.formatMessage({ id: 'tools.translation.language.arabic' }),
            },
            {
                code: 'de',
                label: intl.formatMessage({ id: 'tools.translation.language.german' }),
            },
            {
                code: 'it',
                label: intl.formatMessage({ id: 'tools.translation.language.italian' }),
            },
            {
                code: 'ja',
                label: intl.formatMessage({ id: 'tools.translation.language.japanese' }),
            },
            {
                code: 'pt',
                label: intl.formatMessage({ id: 'tools.translation.language.portuguese' }),
            },
            {
                code: 'ru',
                label: intl.formatMessage({ id: 'tools.translation.language.russian' }),
            },
            {
                code: 'tr',
                label: intl.formatMessage({ id: 'tools.translation.language.turkish' }),
            },
        ].sort((a, b) => {
            if (a.code === 'auto') {
                return -1;
            }
            if (b.code === 'auto') {
                return 1;
            }
            return a.code.localeCompare(b.code);
        });

        languageList.forEach((lang) => {
            languageCodeLabelMap.set(lang.code, lang.label);
        });

        return [convertLanguageListToOptions(languageList), languageCodeLabelMap];
    }, [intl]);

    const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
    const [targetLanguage, setTargetLanguage] = useState<string>('zh-CHS');
    const [sourceContent, setSourceContent] = useState<string>('');
    const [translatedContent, setTranslatedContent, translatedContentRef] = useStateRef<string>('');
    const [autoLanguage, setAutoLanguage] = useState<string | undefined>(undefined);

    const searchParams = useSearchParams();
    const searchParamsSign = searchParams.get('t');
    const prevSearchParamsSign = useRef<string | null>(null);
    const ignoreDebounce = useRef<boolean>(false);
    const searchParamsType = searchParams.get('type');
    const updateSourceContentBySelectedText = useCallback(async () => {
        if (prevSearchParamsSign.current === searchParamsSign) {
            return;
        }

        prevSearchParamsSign.current = searchParamsSign;

        if (searchParamsType === 'selectText') {
            const hideLoading = message.loading(
                intl.formatMessage({ id: 'tools.translation.getSelectText.loading' }),
            );
            const text = await getSelectedText();
            hideLoading();

            getCurrentWindow().setFocus();

            if (!text) {
                message.error(intl.formatMessage({ id: 'tools.translation.getSelectText.failed' }));
                return;
            }

            setSourceContent(text);
            ignoreDebounce.current = true;
        }
    }, [intl, message, searchParamsSign, searchParamsType]);

    useEffect(() => {
        updateSourceContentBySelectedText();
    }, [updateSourceContentBySelectedText]);

    const currentRequestSignRef = useRef<number>(0);
    const [loading, setLoading] = useState(false);
    const requestTranslate = useCallback(
        async (params: {
            sourceContent: string;
            sourceLanguage: string;
            targetLanguage: string;
        }) => {
            setLoading(true);
            currentRequestSignRef.current++;
            const requestSign = currentRequestSignRef.current;
            const response = await translate({
                content: params.sourceContent,
                from: params.sourceLanguage,
                to: params.targetLanguage,
                domain: 'general',
            });

            if (currentRequestSignRef.current !== requestSign) {
                return;
            }

            setLoading(false);

            const data = response.success();
            if (!data) {
                return;
            }

            setTranslatedContent(data.content);
            if (params.sourceLanguage === 'auto' && languageCodeLabelMap.has(data.from)) {
                setAutoLanguage(data.from);
            }
        },
        [languageCodeLabelMap, setTranslatedContent],
    );
    const requestTranslateDebounce = useMemo(
        () => debounce(requestTranslate, 1000),
        [requestTranslate],
    );

    useEffect(() => {
        if (sourceContent.trim() === '') {
            return;
        }

        if (ignoreDebounce.current) {
            ignoreDebounce.current = false;
            requestTranslate({
                sourceContent: sourceContent,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
            });
        } else {
            requestTranslateDebounce({
                sourceContent: sourceContent,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
            });
        }
    }, [sourceContent, sourceLanguage, targetLanguage, requestTranslateDebounce, requestTranslate]);

    useEffect(() => {
        setAutoLanguage(undefined);
    }, [sourceLanguage]);

    const [hotKeys, setHotKeys] = useState<Record<KeyEventKey, KeyEventValue>>();
    useAppSettingsLoad(
        useCallback((appSettings) => {
            setHotKeys(appSettings[AppSettingsGroup.KeyEvent]);

            if (appSettings[AppSettingsGroup.Common].language === AppSettingsLanguage.ZHHant) {
                setTargetLanguage('zh-CHT');
            } else if (
                appSettings[AppSettingsGroup.Common].language === AppSettingsLanguage.ZHHans
            ) {
                setTargetLanguage('zh-CHS');
            } else {
                setTargetLanguage('en');
            }
        }, []),
        true,
    );

    const onCopy = useCallback(() => {
        const selected = window.getSelection();
        if (selected && selected.toString()) {
            window.navigator.clipboard.writeText(selected.toString());
            selected.removeAllRanges();
        } else {
            window.navigator.clipboard.writeText(translatedContentRef.current);
        }
    }, [translatedContentRef]);
    const onCopyAndHide = useCallback(() => {
        onCopy();
        getCurrentWindow().hide();
    }, [onCopy]);

    useHotkeys(hotKeys?.[KeyEventKey.CopyAndHide]?.hotKey ?? '', onCopyAndHide, {
        keyup: false,
        keydown: true,
        enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    });
    useHotkeys(hotKeys?.[KeyEventKey.Copy]?.hotKey ?? '', onCopy, {
        keyup: false,
        keydown: true,
        enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    });

    return (
        <>
            <ContentWrap className="settings-wrap">
                {/* 用表单处理下样式，但不用表单处理数据验证 */}
                <Form layout="vertical">
                    <Flex gap={8} align="center">
                        <Form.Item
                            style={{ flex: 1, marginBottom: token.marginXS }}
                            label={<FormattedMessage id="tools.translation.sourceLanguage" />}
                        >
                            <Select
                                value={sourceLanguage}
                                showSearch
                                onChange={setSourceLanguage}
                                options={[
                                    {
                                        label:
                                            intl.formatMessage({
                                                id: 'tools.translation.language.auto',
                                            }) +
                                            (autoLanguage
                                                ? ` (${languageCodeLabelMap.get(autoLanguage)})`
                                                : ''),
                                        title: intl.formatMessage({
                                            id: 'tools.translation.language.auto',
                                        }),
                                        value: 'auto',
                                    },
                                    ...(languageOptions ?? []),
                                ]}
                                filterOption={selectFilterOption}
                            />
                        </Form.Item>
                        <Button
                            type="link"
                            disabled={
                                (sourceLanguage === 'auto' && !autoLanguage) ||
                                autoLanguage === targetLanguage ||
                                sourceLanguage === targetLanguage
                            }
                            icon={<SwapOutlined />}
                            style={{ marginTop: token.margin }}
                            onClick={() => {
                                let sourceValue = sourceLanguage;
                                if (sourceLanguage === 'auto') {
                                    if (!autoLanguage) {
                                        return;
                                    }
                                    sourceValue = autoLanguage;
                                }

                                setSourceLanguage(targetLanguage);
                                setTargetLanguage(sourceValue);
                            }}
                        />
                        <Form.Item
                            style={{ flex: 1, marginBottom: token.marginXS }}
                            label={<FormattedMessage id="tools.translation.targetLanguage" />}
                        >
                            <Select
                                showSearch
                                value={targetLanguage}
                                onChange={setTargetLanguage}
                                options={languageOptions}
                                filterOption={selectFilterOption}
                            />
                        </Form.Item>
                    </Flex>
                    <TextArea
                        maxLength={10000}
                        showCount
                        autoSize={{ minRows: 1, maxRows: 6 }}
                        placeholder={intl.formatMessage({ id: 'tools.translation.placeholder' })}
                        value={sourceContent}
                        onChange={(e) => setSourceContent(e.target.value)}
                    />
                    <Spin spinning={loading}>
                        <TextArea
                            style={{ marginTop: token.marginLG }}
                            rows={6}
                            variant="filled"
                            autoSize={{ minRows: 6 }}
                            readOnly
                            value={translatedContent}
                        />
                    </Spin>
                </Form>
            </ContentWrap>

            <div className="translation-footer">
                <Dropdown
                    menu={{
                        items: [
                            {
                                label: (
                                    <FormattedMessage
                                        id="settings.hotKeySettings.keyEventTooltip"
                                        values={{
                                            message: (
                                                <FormattedMessage id="tools.translation.copy" />
                                            ),
                                            key: hotKeys?.[KeyEventKey.Copy]?.hotKey,
                                        }}
                                    />
                                ),
                                key: 'copy',
                                onClick: onCopy,
                            },
                            {
                                label: (
                                    <FormattedMessage
                                        id="settings.hotKeySettings.keyEventTooltip"
                                        values={{
                                            message: (
                                                <FormattedMessage id="tools.translation.copyAndHide" />
                                            ),
                                            key: hotKeys?.[KeyEventKey.CopyAndHide]?.hotKey,
                                        }}
                                    />
                                ),
                                key: 'copyAndHide',
                                onClick: onCopyAndHide,
                            },
                        ],
                    }}
                    arrow={{
                        pointAtCenter: true,
                    }}
                    placement="topRight"
                >
                    <Button icon={<KeyboardIcon />} shape="circle" />
                </Dropdown>
            </div>

            <style jsx>{`
                :global(.ant-form-item-label) {
                    padding-bottom: ${token.paddingXXS}px !important;
                }

                :global(.ant-form-item-label label) {
                    font-size: 12px !important;
                    color: ${token.colorTextDescription} !important;
                }

                .translation-footer {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    padding: ${token.padding + token.padding}px;
                    transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                }
            `}</style>
        </>
    );
}
