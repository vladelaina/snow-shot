import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { useCallback } from 'react';
import * as dialog from '@tauri-apps/plugin-dialog';

export const PathInput: React.FC<{
    value?: string;
    onChange?: (value: string) => void;
    filters: dialog.DialogFilter[];
}> = ({ value, onChange, filters }) => {
    const selectPath = useCallback(async () => {
        const filePath = await dialog.open({
            filters,
            defaultPath: value,
        });

        if (filePath) {
            onChange?.(filePath);
        }
    }, [value, onChange, filters]);

    return (
        <Input.Search
            enterButton={
                <Button
                    onClick={() => {
                        selectPath();
                    }}
                    type="default"
                    icon={<EllipsisOutlined />}
                />
            }
            allowClear
            value={value}
            onChange={(e) => {
                onChange?.(e.target.value);
            }}
        />
    );
};
