import { Button, Popconfirm } from 'antd';
import { ResetIcon } from '../icons';
import { FormattedMessage } from 'react-intl';
import {
    AppSettingsActionContext,
    AppSettingsGroup,
    defaultAppSettingsData,
} from '@/app/contextWrap';
import { useContext } from 'react';

export const ResetSettingsButton: React.FC<{
    onReset?: () => void;
    appSettingsGroup?: AppSettingsGroup;
    title: React.ReactNode;
    filter?: (groupSettings: Record<string, unknown>) => Record<string, unknown>;
}> = ({ onReset, title, appSettingsGroup, filter }) => {
    const { updateAppSettings } = useContext(AppSettingsActionContext);
    return (
        <Popconfirm
            title={<FormattedMessage id="settings.resetSettings" values={{ title }} />}
            onConfirm={() => {
                onReset?.();

                if (appSettingsGroup) {
                    updateAppSettings(
                        appSettingsGroup,
                        filter
                            ? filter(defaultAppSettingsData[appSettingsGroup])
                            : defaultAppSettingsData[appSettingsGroup],
                        false,
                        true,
                        true,
                        false,
                    );
                }
            }}
        >
            <Button type="text">
                <ResetIcon />
            </Button>
        </Popconfirm>
    );
};
