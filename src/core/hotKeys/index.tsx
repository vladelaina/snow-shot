export enum KeyEventGroup {
    Translation = 'translation',
    Chat = 'chat',
}

export type KeyEventValue = {
    hotKey: string;
    unique?: boolean;
    group: KeyEventGroup;
};

export type KeyEventComponentValue = KeyEventValue & {
    messageId: string;
};

export enum KeyEventKey {
    CopyAndHide = 'copyAndHide',
    Copy = 'copy',
    ChatCopyAndHide = 'chatCopyAndHide',
    ChatCopy = 'chatCopy',
    ChatNewSession = 'chatNewSession',
}

export const defaultKeyEventSettings: Record<KeyEventKey, KeyEventValue> = {
    [KeyEventKey.CopyAndHide]: {
        hotKey: 'Ctrl+Q',
        group: KeyEventGroup.Translation,
    },
    [KeyEventKey.Copy]: {
        hotKey: 'Ctrl+C',
        group: KeyEventGroup.Translation,
    },
    [KeyEventKey.ChatCopyAndHide]: {
        hotKey: 'Ctrl+Q',
        group: KeyEventGroup.Chat,
    },
    [KeyEventKey.ChatCopy]: {
        hotKey: 'Ctrl+C',
        group: KeyEventGroup.Chat,
    },
    [KeyEventKey.ChatNewSession]: {
        hotKey: 'Ctrl+N',
        group: KeyEventGroup.Chat,
    },
};

const keyEventSettingsKeys = Object.keys(defaultKeyEventSettings);
export const defaultKeyEventComponentConfig: Record<KeyEventKey, KeyEventComponentValue> =
    keyEventSettingsKeys.reduce(
        (acc, key) => {
            let baseMessageId = '';
            if (defaultKeyEventSettings[key as KeyEventKey].group === KeyEventGroup.Translation) {
                baseMessageId = 'tools.translation';
            } else if (defaultKeyEventSettings[key as KeyEventKey].group === KeyEventGroup.Chat) {
                baseMessageId = 'tools.chat';
            }

            acc[key as KeyEventKey] = {
                ...defaultKeyEventSettings[key as KeyEventKey],
                messageId: `${baseMessageId}.${key}`,
            };
            return acc;
        },
        {} as Record<KeyEventKey, KeyEventComponentValue>,
    );
