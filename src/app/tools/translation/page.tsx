'use client';

import { AppSettingsActionContext, AppSettingsGroup, AppSettingsLanguage } from '@/app/contextWrap';
import { ContentWrap } from '@/components/contentWrap';
import { HotkeysMenu } from '@/components/hotkeysMenu';
import { KeyEventKey, KeyEventValue } from '@/core/hotKeys';
import { finishScreenshot } from '@/functions/screenshot';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { useStateRef } from '@/hooks/useStateRef';
import {
    getTranslationTypes,
    translate,
    TranslationDomain,
    TranslationType,
    TranslationTypeOption,
} from '@/services/tools/translation';
import { copyText, copyTextAndHide, decodeParamsValue } from '@/utils';
import { SwapOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Form, InputRef, Row, Select, SelectProps, Spin, theme } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { debounce } from 'lodash';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, Suspense } from 'react';
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

const TranslationCore = () => {
    const intl = useIntl();

    const defaultTranslationTypes: TranslationTypeOption[] = useMemo(
        () => [
            {
                type: TranslationType.Youdao,
                name: intl.formatMessage({ id: 'tools.translation.type.youdao' }),
            },
            {
                type: TranslationType.DeepSeek,
                name: intl.formatMessage({ id: 'tools.translation.type.deepseek' }),
            },
        ],
        [intl],
    );

    const { token } = theme.useToken();

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
    const [translationType, setTranslationType] = useState<TranslationType>(TranslationType.Youdao);
    const [translationDomain, setTranslationDomain] = useState<TranslationDomain>(
        TranslationDomain.General,
    );

    const { updateAppSettings } = useContext(AppSettingsActionContext);
    useAppSettingsLoad(
        useCallback(
            (settings) => {
                setTranslationDomain(settings[AppSettingsGroup.Cache].translationDomain);
                setTranslationType(settings[AppSettingsGroup.Cache].translationType);
            },
            [setTranslationType, setTranslationDomain],
        ),
    );

    const [supportedTranslationTypes, setSupportedTranslationTypes] =
        useState<TranslationTypeOption[]>(defaultTranslationTypes);
    const [
        supportedTranslationTypesLoading,
        setSupportedTranslationTypesLoading,
        supportedTranslationTypesLoadingRef,
    ] = useStateRef(false);
    useEffect(() => {
        if (supportedTranslationTypesLoadingRef.current) {
            return;
        }

        setSupportedTranslationTypesLoading(true);
        getTranslationTypes().then((res) => {
            setSupportedTranslationTypesLoading(false);
            if (!res.success()) {
                return;
            }

            setSupportedTranslationTypes(res.data ?? []);
        });
    }, [setSupportedTranslationTypesLoading, supportedTranslationTypesLoadingRef]);

    const sourceContentRef = useRef<InputRef | null>(null);
    const [sourceContent, setSourceContent] = useState<string>('');
    const [translatedContent, setTranslatedContent, translatedContentRef] = useStateRef<string>('');
    const [autoLanguage, setAutoLanguage] = useState<string | undefined>(undefined);

    const searchParams = useSearchParams();
    const searchParamsSign = searchParams.get('t');
    const searchParamsSelectText = searchParams.get('selectText');
    const prevSearchParamsSign = useRef<string | null>(null);
    const ignoreDebounce = useRef<boolean>(false);
    const updateSourceContentBySelectedText = useCallback(async () => {
        if (prevSearchParamsSign.current === searchParamsSign) {
            return;
        }

        prevSearchParamsSign.current = searchParamsSign;

        if (searchParamsSelectText) {
            await finishScreenshot();

            setSourceContent(decodeParamsValue(searchParamsSelectText).substring(0, 5000));
            ignoreDebounce.current = true;
        }

        setTimeout(() => {
            sourceContentRef.current?.focus();
            prevSearchParamsSign.current = searchParamsSign;
        }, 64);
    }, [searchParamsSign, searchParamsSelectText]);

    useEffect(() => {
        updateSourceContentBySelectedText();
    }, [updateSourceContentBySelectedText]);

    const currentRequestSignRef = useRef<number>(0);
    const [loading, setLoading] = useState(false);
    const [startLoading, setStartLoading] = useState<boolean>(false);
    const requestTranslate = useCallback(
        async (params: {
            sourceContent: string;
            sourceLanguage: string;
            targetLanguage: string;
            translationType: TranslationType;
            translationDomain: TranslationDomain;
        }) => {
            setStartLoading(true);
            currentRequestSignRef.current++;
            const requestSign = currentRequestSignRef.current;
            await translate(
                {
                    isInvalid: () => currentRequestSignRef.current !== requestSign,
                    onStart: () => {
                        setStartLoading(false);
                        setLoading(true);
                        setTranslatedContent('');
                    },
                    onData: (response) => {
                        const data = response.success();
                        if (!data) {
                            return;
                        }

                        setTranslatedContent((prev) => `${prev}${data.delta_content}`);
                        if (
                            params.sourceLanguage === 'auto' &&
                            data.from &&
                            languageCodeLabelMap.has(data.from)
                        ) {
                            setAutoLanguage(data.from);
                        }
                    },
                    onComplete: () => {
                        setLoading(false);
                    },
                },
                {
                    content: params.sourceContent,
                    from: params.sourceLanguage,
                    to: params.targetLanguage,
                    domain: params.translationDomain,
                    type: params.translationType,
                },
            );
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
                translationType,
                translationDomain,
            });
        } else {
            requestTranslateDebounce({
                sourceContent: sourceContent,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                translationType,
                translationDomain,
            });
        }
    }, [
        sourceContent,
        sourceLanguage,
        targetLanguage,
        requestTranslateDebounce,
        requestTranslate,
        translationType,
        translationDomain,
    ]);

    useEffect(() => {
        setAutoLanguage(undefined);
    }, [sourceLanguage]);

    const [hotKeys, setHotKeys] = useState<Record<KeyEventKey, KeyEventValue>>();
    useAppSettingsLoad(
        useCallback((appSettings) => {
            setHotKeys(appSettings[AppSettingsGroup.KeyEvent]);

            const targetLanguage = appSettings[AppSettingsGroup.Cache].targetLanguage;
            if (targetLanguage) {
                setTargetLanguage(targetLanguage);
            } else if (
                appSettings[AppSettingsGroup.Common].language === AppSettingsLanguage.ZHHant
            ) {
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
        copyText(translatedContentRef.current);
    }, [translatedContentRef]);
    const onCopyAndHide = useCallback(() => {
        copyTextAndHide(translatedContentRef.current);
    }, [translatedContentRef]);

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
                    <Flex gap={0} justify="space-between">
                        <Flex gap={0} align="center">
                            <Form.Item
                                style={{ marginBottom: token.marginXS }}
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
                                    variant="underlined"
                                    dropdownStyle={{ minWidth: 200 }}
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
                                style={{ marginBottom: token.marginXS }}
                                label={<FormattedMessage id="tools.translation.targetLanguage" />}
                            >
                                <Select
                                    showSearch
                                    value={targetLanguage}
                                    onChange={(value) => {
                                        setTargetLanguage(value);
                                        updateAppSettings(
                                            AppSettingsGroup.Cache,
                                            { targetLanguage: value },
                                            true,
                                            true,
                                            false,
                                        );
                                    }}
                                    options={languageOptions}
                                    filterOption={selectFilterOption}
                                    dropdownStyle={{ minWidth: 200 }}
                                    variant="underlined"
                                />
                            </Form.Item>
                        </Flex>
                        <Flex gap={token.margin}>
                            <Form.Item
                                style={{ marginBottom: token.marginXS }}
                                label={<FormattedMessage id="tools.translation.type" />}
                            >
                                <Select
                                    showSearch
                                    value={translationType}
                                    onChange={(value) => {
                                        setTranslationType(value);
                                        setAutoLanguage(undefined);
                                        updateAppSettings(
                                            AppSettingsGroup.Cache,
                                            { translationType: value },
                                            true,
                                            true,
                                            false,
                                        );
                                    }}
                                    options={supportedTranslationTypes.map((item) => ({
                                        label: item.name,
                                        value: item.type,
                                    }))}
                                    loading={supportedTranslationTypesLoading}
                                    filterOption={selectFilterOption}
                                    dropdownStyle={{ minWidth: 200 }}
                                    variant="underlined"
                                />
                            </Form.Item>
                            <Form.Item
                                style={{ marginBottom: token.marginXS }}
                                label={<FormattedMessage id="tools.translation.domain" />}
                            >
                                <Select
                                    showSearch
                                    value={translationDomain}
                                    onChange={(value) => {
                                        setTranslationDomain(value);
                                        updateAppSettings(
                                            AppSettingsGroup.Cache,
                                            { translationDomain: value },
                                            true,
                                            true,
                                            false,
                                        );
                                    }}
                                    options={[
                                        {
                                            label: intl.formatMessage({
                                                id: 'tools.translation.domain.general',
                                            }),
                                            value: TranslationDomain.General,
                                        },
                                        {
                                            label: intl.formatMessage({
                                                id: 'tools.translation.domain.computers',
                                            }),
                                            value: TranslationDomain.Computers,
                                        },
                                        {
                                            label: intl.formatMessage({
                                                id: 'tools.translation.domain.medicine',
                                            }),
                                            value: TranslationDomain.Medicine,
                                        },
                                        {
                                            label: intl.formatMessage({
                                                id: 'tools.translation.domain.finance',
                                            }),
                                            value: TranslationDomain.Finance,
                                        },
                                        {
                                            label: intl.formatMessage({
                                                id: 'tools.translation.domain.game',
                                            }),
                                            value: TranslationDomain.Game,
                                        },
                                    ]}
                                    filterOption={selectFilterOption}
                                    dropdownStyle={{ minWidth: 200 }}
                                    variant="underlined"
                                />
                            </Form.Item>
                        </Flex>
                    </Flex>
                    <Row gutter={16} style={{ marginTop: token.marginXXS }}>
                        <Col span={12}>
                            <TextArea
                                ref={sourceContentRef}
                                rows={12}
                                maxLength={5000}
                                showCount
                                autoSize={{ minRows: 12 }}
                                placeholder={intl.formatMessage({
                                    id: 'tools.translation.placeholder',
                                })}
                                value={sourceContent}
                                style={{ flex: 1 }}
                                onChange={(e) => setSourceContent(e.target.value)}
                            />
                        </Col>
                        <Col span={12}>
                            <Spin spinning={startLoading}>
                                <div style={{ position: 'relative' }}>
                                    <Spin
                                        spinning={loading}
                                        style={{
                                            position: 'absolute',
                                            bottom: token.margin,
                                            right: token.marginLG,
                                        }}
                                    />
                                    <TextArea
                                        rows={12}
                                        variant="filled"
                                        style={{ flex: 1 }}
                                        autoSize={{ minRows: 12 }}
                                        readOnly
                                        value={translatedContent}
                                    />
                                </div>
                            </Spin>
                        </Col>
                    </Row>
                </Form>
            </ContentWrap>

            <HotkeysMenu
                className="translation-hotkeys-menu"
                menu={{
                    items: [
                        {
                            label: (
                                <FormattedMessage
                                    id="settings.hotKeySettings.keyEventTooltip"
                                    values={{
                                        message: <FormattedMessage id="tools.translation.copy" />,
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
            />

            <style jsx>{`
                :global(.ant-form-item-label) {
                    padding-bottom: ${token.paddingXXS}px !important;
                }

                :global(.ant-form-item-label label) {
                    font-size: 12px !important;
                    color: ${token.colorTextDescription} !important;
                }

                :global(.translation-hotkeys-menu) {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    padding: ${token.padding}px;
                }
            `}</style>
        </>
    );
};

export default function TranslationPage() {
    return (
        <Suspense>
            <TranslationCore />
        </Suspense>
    );
}
