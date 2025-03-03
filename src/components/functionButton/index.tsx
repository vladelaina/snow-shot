import { Button, Flex, Input, theme } from 'antd';
import React, { useState } from 'react';
import { IconLabel } from '../iconLable';
import { useIntl } from 'react-intl';
import { zIndexs } from '@/utils/zIndex';

export const FunctionButton: React.FC<{
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => Promise<void>;
}> = ({ label, icon, onClick }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <Button
                size="large"
                loading={loading}
                block
                style={{ paddingRight: 0 }}
                onClick={async () => {
                    setLoading(true);
                    await onClick?.();
                    setLoading(false);
                }}
            >
                <Flex justify="flex-start" align="center" style={{ width: '100%', height: '100%' }}>
                    <IconLabel icon={icon} label={label} />
                </Flex>
            </Button>
            <div
                style={{
                    position: 'absolute',
                    height: '100%',
                    zIndex: zIndexs.Main_FunctionButtonInput,
                    right: 0,
                    top: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingLeft: token.padding,
                    paddingRight: token.padding,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <Input
                    style={{ width: '128px' }}
                    variant="filled"
                    onClick={() => {}}
                    placeholder={intl.formatMessage({ id: 'home.shortcut' })}
                />
            </div>
        </div>
    );
};
