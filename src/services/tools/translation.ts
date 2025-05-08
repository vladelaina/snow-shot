import { serviceFetch, streamFetch, StreamFetchEventOptions } from '.';

export enum TranslationType {
    Youdao = 0,
    DeepSeek = 1,
    QwenTurbo = 2,
    QwenPlus = 3,
    QwenMax = 4,
}

export enum TranslationDomain {
    General = 'general',
    Computers = 'computers',
    Medicine = 'medicine',
    Finance = 'finance',
    Game = 'game',
}

export interface TranslateParams {
    /**
     * 需要翻译的内容
     */
    content: string;
    /**
     * 源语言
     */
    from: string;
    /**
     * 目标语言
     */
    to: string;
    /**
     * 领域
     */
    domain: TranslationDomain;
    /**
     * 翻译类型
     */
    type: TranslationType;
}

export interface TranslateData {
    /**
     * 翻译后的内容
     */
    delta_content: string;
    /**
     * 源语言
     */
    from?: string;
    /**
     * 目标语言
     */
    to?: string;
}

export const translate = async (
    options: StreamFetchEventOptions<TranslateData>,
    params: TranslateParams,
) => {
    return streamFetch<TranslateData>('/api/v1/translation/translate', {
        method: 'POST',
        data: params,
        ...options,
    });
};

export type TranslationTypeOption = {
    type: TranslationType;
    name: string;
};

export const getTranslationTypes = async () => {
    return serviceFetch<TranslationTypeOption[]>('/api/v1/translation/types', {
        method: 'GET',
    });
};
