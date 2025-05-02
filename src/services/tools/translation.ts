import { serviceFetch } from '.';

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
    domain: string;
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

const translate = async (params: TranslateParams) => {
    return serviceFetch<TranslateData>('/api/v1/translation/translate', {
        method: 'POST',
        data: params,
    });
};

export default translate;
