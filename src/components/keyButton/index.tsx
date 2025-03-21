import { Button, Modal, Space, theme } from 'antd';
import { KeyboardGrayIcon } from '../icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { ToolbarTip } from '@/app/draw/components/toolbarTip';

type KeyConfig = {
    anyKey: string;
    selectCtrl: boolean;
    selectShift: boolean;
    selectAlt: boolean;
    index: number;
};

const convertKeyConfigToString = (keyConfig: KeyConfig) => {
    return [
        keyConfig.selectCtrl ? 'Ctrl' : '',
        keyConfig.selectShift ? 'Shift' : '',
        keyConfig.selectAlt ? 'Alt' : '',
        keyConfig.anyKey.toUpperCase(),
    ]
        .filter(Boolean)
        .join('+');
};

export const KeyButton: React.FC<{
    title: React.ReactNode;
    keyValue: string;
    onKeyChange: (value: string) => void;
    width?: number;
    maxWidth?: number;
}> = ({ title, keyValue, onKeyChange, width, maxWidth }) => {
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
        const keyConfigValueList = keyValue.split(',').map(_.trim);

        const configList = keyConfigValueList.map((value, index) => {
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
        if (configList.length === 1 && configList[0].anyKey === '') {
            setTimeout(() => {
                setInputAnyKeyConfigIndex(0);
            }, 0);
        }
    }, [keyValue, setInputAnyKeyConfigIndex, setKeyConfigList]);

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

            keyConfigListRef.current[inputAnyKeyConfigIndexRef.current].anyKey =
                e.key.toUpperCase();
            updateKeyConfig();
            setInputAnyKeyConfigIndex(undefined);
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setInputAnyKeyConfigIndex, updateKeyConfig]);

    useEffect(() => {
        setInputAnyKeyConfigIndex(undefined);
    }, [open, setInputAnyKeyConfigIndex]);

    return (
        <>
            <Modal
                title={<FormattedMessage id="settings.keyConfig" values={{ title }} />}
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => {
                    onKeyChange(keyConfigList.map(convertKeyConfigToString).join(', '));
                    setOpen(false);
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
                                    {convertKeyConfigToString(keyConfig)}
                                </Button>
                                {keyConfig.index !== 0 &&
                                    inputAnyKeyConfigIndex !== keyConfig.index && (
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
                <Button
                    block
                    icon={<PlusOutlined />}
                    type={'dashed'}
                    disabled={inputAnyKeyConfigIndex !== undefined || keyConfigList.length > 1}
                    hidden={keyConfigList.length > 1}
                    onClick={() => {
                        if (keyConfigList.length > 1) {
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
            </Modal>
            <ToolbarTip title={keyValue}>
                <Button
                    icon={<KeyboardGrayIcon />}
                    danger={keyValue ? false : true}
                    onClick={() => setOpen(true)}
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
                </Button>
            </ToolbarTip>
        </>
    );
};
