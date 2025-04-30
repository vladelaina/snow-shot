import { ButtonProps } from 'antd';
import { FormattedMessage } from 'react-intl';

export enum AppFunction {
    Screenshot = 'screenshot',
    ScreenshotFixed = 'screenshotFixed',
    ScreenshotOcr = 'screenshotOcr',
}

export type AppFunctionConfig = {
    shortcutKey: string;
};

export type AppFunctionComponentConfig = AppFunctionConfig & {
    title: React.ReactNode;
    icon?: React.ReactNode;
    onClick: () => Promise<void>;
    onKeyChange: (value: string, prevValue: string) => Promise<boolean>;
};

export const defaultAppFunctionConfigs: Record<AppFunction, AppFunctionConfig> = {
    [AppFunction.Screenshot]: {
        shortcutKey: 'F1',
    },
    [AppFunction.ScreenshotFixed]: {
        shortcutKey: 'Control+Alt+F',
    },
    [AppFunction.ScreenshotOcr]: {
        shortcutKey: 'Control+Alt+D',
    },
};

export enum ShortcutKeyStatus {
    Registered = 'registered',
    Unregistered = 'unregistered',
    Error = 'error',
}

export const convertShortcutKeyStatusToButtonColor = (
    status: ShortcutKeyStatus | undefined,
): ButtonProps['color'] => {
    if (status === undefined) {
        return 'danger';
    }

    switch (status) {
        case ShortcutKeyStatus.Registered:
            return 'green';
        case ShortcutKeyStatus.Unregistered:
            return 'orange';
        case ShortcutKeyStatus.Error:
            return 'danger';
        default:
            return 'default';
    }
};

export const convertShortcutKeyStatusToTip = (
    status: ShortcutKeyStatus | undefined,
): React.ReactNode | undefined => {
    if (status === undefined || status === ShortcutKeyStatus.Registered) {
        return undefined;
    }

    switch (status) {
        case ShortcutKeyStatus.Unregistered:
            return <FormattedMessage id="home.shortcut.unregistered" />;
        case ShortcutKeyStatus.Error:
            return <FormattedMessage id="home.shortcut.error" />;
        default:
            return undefined;
    }
};
