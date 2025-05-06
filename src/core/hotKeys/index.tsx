export enum KeyEventGroup {
    Translation = 'translation',
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
}

export const defaultKeyEventSettings: Record<KeyEventKey, KeyEventValue> = {
    [KeyEventKey.CopyAndHide]: {
        hotKey: 'Control+Q',
        group: KeyEventGroup.Translation,
    },
    [KeyEventKey.Copy]: {
        hotKey: 'Control+C',
        group: KeyEventGroup.Translation,
    },
};

const keyEventSettingsKeys = Object.keys(defaultKeyEventSettings);
export const defaultKeyEventComponentConfig: Record<KeyEventKey, KeyEventComponentValue> =
    keyEventSettingsKeys.reduce(
        (acc, key) => {
            let baseMessageId = '';
            if (defaultKeyEventSettings[key as KeyEventKey].group === KeyEventGroup.Translation) {
                baseMessageId = 'tools.translation';
            }

            acc[key as KeyEventKey] = {
                ...defaultKeyEventSettings[key as KeyEventKey],
                messageId: `${baseMessageId}.${key}`,
            };
            return acc;
        },
        {} as Record<KeyEventKey, KeyEventComponentValue>,
    );
