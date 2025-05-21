import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import { OcrDetectResult } from '@/commands/ocr';
import { AntdContext, HotkeysScope } from '@/components/globalLayoutExtra';
import { Translator, TranslatorActionType } from '@/components/translator';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { Form, Modal, Switch, theme } from 'antd';
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

        translatorActionRef.current?.setSourceContent(JSON.stringify(textLines, undefined, 2));
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

        let jsonResult: Record<string, string> = {};
        try {
            jsonResult = JSON.parse(translateResult.current);
        } catch {
            message.error(intl.formatMessage({ id: 'draw.ocrDetect.translate.error' }));
            return;
        }

        const keys = Object.keys(jsonResult);
        if (keys.length !== ocrResult.text_blocks.length) {
            message.warning(intl.formatMessage({ id: 'draw.ocrDetect.translate.error2' }));
        }

        const result: OcrDetectResult = {
            ...ocrResult,
            text_blocks: ocrResult.text_blocks.map((block, index) => ({
                ...block,
                text: keys[index] ? jsonResult[keys[index]] : block.text,
            })),
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

    return (
        <Modal
            width={800}
            open={open}
            onCancel={() => setOpen(false)}
            onOk={() => {
                replaceOcrResult();
                setOpen(false);
            }}
            centered
            forceRender={!!ocrResult}
        >
            {ocrResult && (
                <Translator
                    disableInput
                    actionRef={translatorActionRef}
                    onTranslateComplete={onTranslateComplete}
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
