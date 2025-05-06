import { serviceFetch } from '.';

export enum TranslationType {
    Youdao = 0,
    DeepSeek = 1,
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
    content: string;
    /**
     * 源语言
     */
    from: string;
    /**
     * 目标语言
     */
    to: string;
}

export const translate = async (params: TranslateParams) => {
    return serviceFetch<TranslateData>('/api/v1/translation/translate', {
        method: 'POST',
        data: params,
    });
};
