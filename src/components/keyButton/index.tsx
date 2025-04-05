import { Button, ButtonProps, Modal, Space, theme } from 'antd';
import { KeyboardGrayIcon } from '../icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { ToolbarTip } from '@/components/toolbarTip';

type KeyConfig = {
    anyKey: string;
    selectCtrl: boolean;
    selectShift: boolean;
    selectAlt: boolean;
    index: number;
};

const convertKeyConfigToString = (keyConfig: KeyConfig, defaultKey = '') => {
    const res = [
        keyConfig.selectCtrl ? 'Ctrl' : '',
        keyConfig.selectShift ? 'Shift' : '',
        keyConfig.selectAlt ? 'Alt' : '',
        keyConfig.anyKey.charAt(0).toUpperCase() + keyConfig.anyKey.slice(1).toLowerCase(),
    ]
        .filter(Boolean)
        .join('+');

    if (res === '') {
        return defaultKey;
    }

    return res;
};

export const KeyButton: React.FC<{
    title: React.ReactNode;
    keyValue: string;
    onKeyChange: (value: string) => Promise<void>;
    width?: number;
    maxWidth?: number;
    buttonProps?: ButtonProps;
    maxLength: number;
    onCancel?: () => void;
}> = ({ title, keyValue, onKeyChange, width, maxWidth, buttonProps, maxLength, onCancel }) => {
    const { token } = theme.useToken();

    const [open, setOpen] = useState(false);

    const keyConfigListRef = useRef<KeyConfig[]>([]);
    const [keyConfigList, _setKeyConfigList] = useState<KeyConfig[]>([]);
    const setKeyConfigList = useCallback(
        (value: KeyConfig[] | ((pre: KeyConfig[]) => KeyConfig[])) => {
            keyConfigListRef.current = Array.isArray(value)
                ? value
                : value(keyConfigListRef.current);
            _setKeyConfigList(keyConfigListRef.current);
        },
        [],
    );

    const inputAnyKeyConfigIndexRef = useRef<number | undefined>(undefined);
    const [inputAnyKeyConfigIndex, _setInputAnyKeyConfigIndex] = useState<number | undefined>();
    const setInputAnyKeyConfigIndex = useCallback((index: number | undefined) => {
        inputAnyKeyConfigIndexRef.current = index;
        _setInputAnyKeyConfigIndex(index);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const keyConfigValueList = keyValue.split(',').map(_.trim);

        const configList = keyConfigValueList.slice(0, maxLength).map((value, index) => {
            let selectCtrl = false;
            let selectShift = false;
            let selectAlt = false;
            let anyKey = '';

            value.split('+').forEach((key) => {
                if (key === 'Ctrl') {
                    selectCtrl = true;
                } else if (key === 'Shift') {
                    selectShift = true;
                } else if (key === 'Alt') {
                    selectAlt = true;
                } else {
                    anyKey = key;
                }
            });

            return {
                anyKey,
                selectCtrl,
                selectShift,
                selectAlt,
                index,
            };
        });
        setKeyConfigList(configList);
        if (
            configList.length === 1 &&
            configList[0].anyKey === '' &&
            configList[0].selectAlt === false &&
            configList[0].selectCtrl === false &&
            configList[0].selectShift === false
        ) {
            setTimeout(() => {
                setInputAnyKeyConfigIndex(0);
            }, 0);
        }
    }, [keyValue, maxLength, setInputAnyKeyConfigIndex, setKeyConfigList, open]);

    const updateKeyConfig = useCallback(() => {
        setKeyConfigList((pre) => {
            return [...pre];
        });
    }, [setKeyConfigList]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (inputAnyKeyConfigIndexRef.current === undefined) {
                return;
            }

            if (e.key === ' ') {
                return;
            }

            if (e.key === 'Control') {
                keyConfigListRef.current[inputAnyKeyConfigIndexRef.current].selectCtrl = true;
            } else if (e.key === 'Shift') {
                keyConfigListRef.current[inputAnyKeyConfigIndexRef.current].selectShift = true;
            } else if (e.key === 'Alt') {
                keyConfigListRef.current[inputAnyKeyConfigIndexRef.current].selectAlt = true;
            } else {
                keyConfigListRef.current[inputAnyKeyConfigIndexRef.current].anyKey =
                    e.key.charAt(0).toUpperCase() + e.key.slice(1).toLowerCase();
                setInputAnyKeyConfigIndex(undefined);
            }

            updateKeyConfig();
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setInputAnyKeyConfigIndex, updateKeyConfig]);

    useEffect(() => {
        setInputAnyKeyConfigIndex(undefined);
    }, [open, setInputAnyKeyConfigIndex]);

    const [confirmLoading, setConfirmLoading] = useState(false);

    return (
        <>
            <Modal
                title={<FormattedMessage id="settings.keyConfig" values={{ title }} />}
                open={open}
                onCancel={() => {
                    onCancel?.();
                    setOpen(false);
                }}
                confirmLoading={confirmLoading}
                onOk={() => {
                    setConfirmLoading(true);
                    onKeyChange(
                        keyConfigList
                            .map((item) => {
                                return convertKeyConfigToString(item);
                            })
                            .join(', '),
                    ).finally(() => {
                        setConfirmLoading(false);
                        setOpen(false);
                    });
                }}
            >
                {keyConfigList.map((keyConfig) => {
                    return (
                        <Space
                            align="center"
                            wrap
                            style={{ marginBottom: token.margin }}
                            key={keyConfig.index}
                        >
                            <Space>
                                <Button
                                    type={keyConfig.selectCtrl ? 'primary' : 'default'}
                                    onClick={() => {
                                        keyConfig.selectCtrl = !keyConfig.selectCtrl;
                                        updateKeyConfig();
                                    }}
                                >
                                    Ctrl
                                </Button>
                                +
                                <Button
                                    type={keyConfig.selectShift ? 'primary' : 'default'}
                                    onClick={() => {
                                        keyConfig.selectShift = !keyConfig.selectShift;
                                        updateKeyConfig();
                                    }}
                                >
                                    Shift
                                </Button>
                                +
                                <Button
                                    type={keyConfig.selectAlt ? 'primary' : 'default'}
                                    onClick={() => {
                                        keyConfig.selectAlt = !keyConfig.selectAlt;
                                        updateKeyConfig();
                                    }}
                                >
                                    Alt
                                </Button>
                                +
                            </Space>
                            <Space>
                                <Button
                                    type={'dashed'}
                                    onClick={() => {
                                        keyConfig.anyKey = '';
                                        setInputAnyKeyConfigIndex(keyConfig.index);
                                    }}
                                    loading={inputAnyKeyConfigIndex === keyConfig.index}
                                    style={{
                                        opacity:
                                            inputAnyKeyConfigIndex === keyConfig.index ? 0.42 : 1,
                                    }}
                                    icon={
                                        inputAnyKeyConfigIndex === keyConfig.index ? undefined : (
                                            <KeyboardGrayIcon />
                                        )
                                    }
                                >
                                    {inputAnyKeyConfigIndex === keyConfig.index ? (
                                        <FormattedMessage id="settings.pleasePressTheKey" />
                                    ) : (
                                        keyConfig.anyKey
                                    )}
                                </Button>
                                =
                                <Button color="primary" variant="outlined">
                                    {convertKeyConfigToString(keyConfig, ' ')}
                                </Button>
                                {inputAnyKeyConfigIndex !== keyConfig.index && (
                                    <Button
                                        danger
                                        onClick={() => {
                                            setKeyConfigList((pre) => {
                                                return pre.filter(
                                                    (item) => item.index !== keyConfig.index,
                                                );
                                            });
                                        }}
                                    >
                                        <DeleteOutlined />
                                    </Button>
                                )}
                            </Space>
                        </Space>
                    );
                })}
                {maxLength > 1 && (
                    <Button
                        block
                        icon={<PlusOutlined />}
                        type={'dashed'}
                        disabled={
                            inputAnyKeyConfigIndex !== undefined ||
                            keyConfigList.length >= maxLength
                        }
                        hidden={keyConfigList.length >= maxLength}
                        onClick={() => {
                            if (keyConfigList.length >= maxLength) {
                                return;
                            }

                            const index = keyConfigList.length;
                            setKeyConfigList((pre) => {
                                return [
                                    ...pre,
                                    {
                                        anyKey: '',
                                        selectCtrl: false,
                                        selectShift: false,
                                        selectAlt: false,
                                        index,
                                    },
                                ];
                            });
                            setInputAnyKeyConfigIndex(index);
                        }}
                    >
                        <FormattedMessage id="settings.addKeyConfig" />
                    </Button>
                )}
            </Modal>
            <ToolbarTip title={keyValue}>
                <Button
                    {...buttonProps}
                    icon={<KeyboardGrayIcon />}
                    danger={keyValue ? undefined : true}
                    onClick={(e) => {
                        buttonProps?.onClick?.(e);
                        setOpen(true);
                    }}
                >
                    <div
                        style={{
                            width,
                            maxWidth,
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                        }}
                    >
                        {keyValue}
                    </div>
                    {buttonProps?.children}
                </Button>
            </ToolbarTip>
        </>
    );
};
