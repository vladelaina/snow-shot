'use client';

import { theme, Typography } from 'antd';

export const GroupTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = theme.useToken();
    return (
        <Typography.Title style={{ marginTop: token.marginXXS, marginBottom: token.marginLG }} level={4}>
            {children}
        </Typography.Title>
    );
};
