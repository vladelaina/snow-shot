/* eslint-disable @typescript-eslint/no-explicit-any */

import { fetch } from '@tauri-apps/plugin-http';

export const getUrl = (url: string, params?: Record<string, any>) => {
    let baseUrl;
    if (process.env.NODE_ENV === 'development') {
        baseUrl = 'http://127.0.0.1:5101/';
    } else {
        // baseUrl = 'https://api.snowshot.top/';
        baseUrl = 'http://120.79.232.67/';
    }

    const urlObj = new URL(url, baseUrl);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            urlObj.searchParams.set(key, value);
        });
    }

    return urlObj.toString();
};

export interface ResponseData<T> {
    code: number;
    success: boolean;
    message: string;
    data: T;
}

export class ServiceResponse<T> {
    public readonly response: Response | undefined;
    public readonly code: number | undefined;
    public readonly message: string | undefined;
    public readonly data: T | undefined;

    private constructor(response: Response | undefined, code?: number, message?: string, data?: T) {
        this.response = response;
        this.code = code;
        this.message = message;
        this.data = data;
    }

    static success<T>(response: Response, message: string, data: T): ServiceResponse<T> {
        return new ServiceResponse(response, 0, message, data);
    }

    static requestError(error: Error): ServiceResponse<undefined> {
        return new ServiceResponse(undefined, -1, error.message, undefined);
    }

    static httpError(response: Response): ServiceResponse<undefined> {
        return new ServiceResponse(response, -1, response.statusText, undefined);
    }

    static serviceError(
        response: Response,
        code: number,
        message: string,
    ): ServiceResponse<undefined> {
        return new ServiceResponse(response, code, message, undefined);
    }

    public success(): T | undefined {
        if (!this.response) {
            try {
                window.__APP_HANDLE_REQUEST_ERROR__?.(this);
            } catch (error) {
                console.error(error);
            }
            return undefined;
        }

        if (this.response.status !== 200) {
            try {
                window.__APP_HANDLE_HTTP_ERROR__?.(this);
            } catch (error) {
                console.error(error);
            }
            return undefined;
        }

        if (this.code !== 0) {
            try {
                window.__APP_HANDLE_SERVICE_ERROR__?.(this);
            } catch (error) {
                console.error(error);
            }
            return undefined;
        }

        return this.data;
    }
}

export const serviceFetch = async <R>(
    url: string,
    options: {
        method: 'POST' | 'GET';
        params?: any | Record<string, any>;
        data?: any | Record<string, any>;
        headers?: Record<string, string>;
    },
): Promise<ServiceResponse<R | undefined>> => {
    let response: Response;
    try {
        response = await fetch(getUrl(url, options.params), {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': window.__APP_ACCEPT_LANGUAGE__,
                ...options.headers,
            },
            body: JSON.stringify(options.data),
        });
    } catch (e) {
        if (e instanceof Error) {
            return ServiceResponse.requestError(e);
        } else if (typeof e === 'string') {
            return ServiceResponse.requestError(new Error(e));
        }

        return ServiceResponse.requestError(new Error(`Unknown error: ${e}`));
    }

    if (response.status !== 200) {
        return ServiceResponse.httpError(response);
    }

    const data = (await response.json()) as ResponseData<R>;

    if (data.code !== 0) {
        return ServiceResponse.serviceError(response, data.code, data.message);
    }

    return ServiceResponse.success(response, data.message, data.data);
};

export const appFetch = (async (...params: Parameters<typeof fetch>) => {
    const response = await fetch(params[0], {
        ...params[1],
        headers: {
            'Accept-Language': window.__APP_ACCEPT_LANGUAGE__,
            ...params[1]?.headers,
        },
    });

    try {
        if (response.status !== 200) {
            const data = (await response.json()) as {
                error: {
                    message: string;
                };
            };

            if ('error' in data && typeof data.error === 'object') {
                ServiceResponse.serviceError(
                    { status: 200, statusText: response.statusText } as Response,
                    response.status,
                    data.error.message ? data.error.message : response.statusText,
                ).success();
            }
        }
    } catch {}

    return response;
}) as typeof fetch;

export type StreamFetchEventOptions<R> = {
    isInvalid?: () => boolean;
    onStart?: () => void;
    onData: (chunk: ServiceResponse<R | undefined>) => void;
    onComplete?: () => void;
};

export const streamFetch = async <R>(
    url: string,
    options: {
        method: 'POST' | 'GET';
        params?: Record<string, any>;
        data?: any;
        headers?: Record<string, string>;
    } & StreamFetchEventOptions<R>,
) => {
    try {
        const response = await fetch(getUrl(url, options.params), {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': window.__APP_ACCEPT_LANGUAGE__,
                ...options.headers,
            },
            body: options.data ? JSON.stringify(options.data) : undefined,
        });

        if (response.status !== 200) {
            ServiceResponse.httpError(response).success();
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
            ServiceResponse.requestError(new Error('Failed to get response body reader')).success();
            return;
        }

        if (!options.isInvalid?.()) {
            options.onStart?.();
        }

        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            if (options.isInvalid?.()) {
                break;
            }

            try {
                if (!chunk.startsWith('data: ')) {
                    const errorData = JSON.parse(chunk) as ResponseData<R>;
                    options.onData(
                        ServiceResponse.serviceError(response, errorData.code, errorData.message),
                    );
                    break;
                }

                const data = JSON.parse(chunk.substring(6)) as ResponseData<R>;
                options.onData(ServiceResponse.success(response, data.message, data.data));
            } catch {
                options.onData(
                    ServiceResponse.requestError(new Error('Failed to parse response data')),
                );
            }
        }

        if (!options.isInvalid?.()) {
            options.onComplete?.();
        }

        return;
    } catch {
        ServiceResponse.requestError(new Error('Stream request error')).success();
        return;
    }
};
