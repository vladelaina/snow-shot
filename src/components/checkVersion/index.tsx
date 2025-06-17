import { useCallback, useEffect, useRef } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { useIntl } from 'react-intl';
import { sendNewVersionNotification } from '@/commands/core';

const WEBSITE_URL = 'https://snowshot.top/';

export const getLatestVersion = async () => {
    const response = await fetch(`${WEBSITE_URL}latest-version.txt`);
    if (!response.ok) {
        console.error('Failed to get latest version:', response.statusText);
        return;
    }

    return (await response.text()).trim();
};

export const CheckVersion: React.FC = () => {
    const intl = useIntl();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const checkVersion = useCallback(async () => {
        try {
            const currentVersion = await getVersion();

            const latestVersion = await getLatestVersion();

            if (currentVersion === latestVersion) {
                return;
            }

            let permissionGranted = await isPermissionGranted();

            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
            }

            if (permissionGranted) {
                sendNewVersionNotification(
                    intl.formatMessage(
                        { id: 'common.newVersion.title' },
                        {
                            latestVersion,
                        },
                    ),
                    intl.formatMessage(
                        { id: 'common.newVersion' },
                        {
                            latestVersion,
                            currentVersion,
                        },
                    ),
                );
            }
        } catch (error) {
            console.error('Failed to check version:', error);
        }
    }, [intl]);

    useEffect(() => {
        checkVersion();

        intervalRef.current = setInterval(checkVersion, 1000 * 60 * 60);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [checkVersion]);

    return <></>;
};
