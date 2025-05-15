export type ChatApiConfig = {
    api_uri: string;
    api_key: string;
    api_model: string;
    model_name: string;
    support_thinking: boolean;
};

export const fliterChatApiConfig = (configList: ChatApiConfig[]) => {
    return configList.filter(
        (item) => item.api_key && item.api_uri && item.api_model && item.model_name,
    );
};
