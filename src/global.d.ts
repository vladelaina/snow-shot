/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceResponse } from './services/tools';

export {};

declare global {
    interface Window {
        __APP_AUTO_START_HIDE_WINDOW__: boolean;
        __APP_HANDLE_HTTP_ERROR__: ((response: ServiceResponse<any>) => void) | undefined;
        __APP_HANDLE_SERVICE_ERROR__: ((response: ServiceResponse<any>) => void) | undefined;
        __APP_HANDLE_REQUEST_ERROR__: ((response: ServiceResponse<any>) => void) | undefined;
    }
}
