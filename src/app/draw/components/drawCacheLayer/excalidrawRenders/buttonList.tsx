import { Flex, theme } from 'antd';

const ButtonList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = theme.useToken();
    return (
        <Flex gap={token.marginSM} wrap>
            {children}
        </Flex>
    );
};

export { ButtonList };
