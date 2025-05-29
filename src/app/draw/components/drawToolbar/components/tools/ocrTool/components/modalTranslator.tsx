import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import { TranslationApiType } from '@/app/settings/functionSettings/extra';
import { OcrDetectResult } from '@/commands/ocr';
import { AntdContext, HotkeysScope } from '@/components/globalLayoutExtra';
import { Translator, TranslatorActionType } from '@/components/translator';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { Form, Modal, Switch, theme } from 'antd';
import { trim } from 'es-toolkit';
import React, {
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { FormattedMessage, useIntl } from 'react-intl';

export type ModalTranslatorActionType = {
    startTranslate: () => void;
};

export const ModalTranslator: React.FC<{
    ocrResult: OcrDetectResult | undefined;
    actionRef: React.RefObject<ModalTranslatorActionType | undefined>;
    onReplace: (result: OcrDetectResult) => void;
}> = ({ ocrResult, actionRef, onReplace: onReplaceCallback }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { message } = useContext(AntdContext);

    const translatorActionRef = useRef<TranslatorActionType>(undefined);
    const { disableScope, enableScope } = useHotkeysContext();

    const [autoReplace, setAutoReplace] = useState(false);
    useStateSubscriber(
        AppSettingsPublisher,
        useCallback((appSettings: AppSettingsData) => {
            setAutoReplace(appSettings[AppSettingsGroup.Cache].ocrTranslateAutoReplace);
        }, []),
    );
    const { updateAppSettings } = useContext(AppSettingsActionContext);

    const [open, setOpen] = useState(false);

    const startTranslate = useCallback(() => {
        setOpen(true);

        // 将 Ocr 结果转为 json 格式进行翻译
        const textLines: Record<string, string> = {};
        ocrResult?.text_blocks.forEach((block, index) => {
            textLines[`line${index + 1}`] = block.text;
        });

        translatorActionRef.current?.setSourceContent(JSON.stringify(textLines, undefined, 1));
    }, [ocrResult]);

    useImperativeHandle(
        actionRef,
        useCallback(
            () => ({
                startTranslate,
            }),
            [startTranslate],
        ),
    );

    const translateResult = useRef<string>(undefined);
    const replaceOcrResult = useCallback(() => {
        if (!translateResult.current || !ocrResult) {
            return;
        }

        if (translatorActionRef.current?.getTranslationType() === TranslationApiType.DeepL) {
            // DeepL 支持批量翻译
            const values = translateResult.current.split('\n').map((line) => trim(line));
            if (values.length === ocrResult.text_blocks.length) {
                const result: OcrDetectResult = {
                    ...ocrResult,
                    text_blocks: ocrResult.text_blocks.map((block, index) => ({
                        ...block,
                        text: values[index],
                    })),
                };

                onReplaceCallback(result);
                return;
            }
        }

        try {
            const jsonResult = JSON.parse(translateResult.current);

            const keys = Object.keys(jsonResult);
            if (keys.length !== ocrResult.text_blocks.length) {
                message.warning(intl.formatMessage({ id: 'draw.ocrDetect.translate.error2' }));
                throw new Error();
            }

            const result: OcrDetectResult = {
                ...ocrResult,
                text_blocks: ocrResult.text_blocks.map((block, index) => ({
                    ...block,
                    text: keys[index] ? jsonResult[keys[index]] : block.text,
                })),
            };

            onReplaceCallback(result);
            return;
        } catch {}

        // 如果 json 解析失败，则按行解析
        const resultLines = translateResult.current.split('\n').map((line) => trim(line));

        if (resultLines.length < ocrResult.text_blocks.length) {
            message.warning(intl.formatMessage({ id: 'draw.ocrDetect.translate.error3' }));
        }

        const result: OcrDetectResult = {
            ...ocrResult,
            text_blocks: ocrResult.text_blocks.map((block, index) => {
                let text = block.text;

                const line = resultLines[index + 1];
                const linePrefixLength = 4 + index.toString().length + 5;
                const lineSuffixLength = 2;
                if (line && line.length > linePrefixLength + lineSuffixLength) {
                    text = line.slice(linePrefixLength, line.length - lineSuffixLength);
                }

                return {
                    ...block,
                    text,
                };
            }),
        };

        onReplaceCallback(result);
    }, [intl, message, ocrResult, onReplaceCallback]);

    useEffect(() => {
        if (open) {
            disableScope(HotkeysScope.DrawTool);
        } else {
            enableScope(HotkeysScope.DrawTool);
        }

        return () => {
            enableScope(HotkeysScope.DrawTool);
        };
    }, [open, disableScope, enableScope]);

    const onTranslateComplete = useCallback(
        (result: string) => {
            translateResult.current = result;
            if (autoReplace) {
                replaceOcrResult();
                setOpen(false);
            }
        },
        [autoReplace, replaceOcrResult],
    );

    useEffect(() => {
        const getTranslatorAction = () => {
            return translatorActionRef.current;
        };

        return () => {
            getTranslatorAction()?.stopTranslate();
        };
    }, []);

    return (
        <Modal
            width={800}
            open={open}
            onCancel={() => setOpen(false)}
            onOk={() => {
                replaceOcrResult();
                setOpen(false);
                translatorActionRef.current?.stopTranslate();
            }}
            centered
            forceRender={!!ocrResult}
        >
            {ocrResult && (
                <Translator
                    disableInput
                    actionRef={translatorActionRef}
                    onTranslateComplete={onTranslateComplete}
                    tryCatchTranslation
                />
            )}

            <Form style={{ margin: token.margin }}>
                <Form.Item
                    label={<FormattedMessage id="draw.ocrDetect.translate.autoReplace" />}
                    name="result"
                    layout="horizontal"
                >
                    <Switch
                        checked={autoReplace}
                        onChange={(checked) => {
                            updateAppSettings(
                                AppSettingsGroup.Cache,
                                { ocrTranslateAutoReplace: checked },
                                true,
                                true,
                                false,
                                true,
                                true,
                            );
                            setAutoReplace(checked);
                        }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};
