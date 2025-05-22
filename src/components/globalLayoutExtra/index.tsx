import { message, Modal } from 'antd';
import { MessageInstance } from 'antd/es/message/interface';
import { HookAPI } from 'antd/es/modal/useModal';
import React, { useContext, useEffect } from 'react';

export type AntdContextType = {
    message: MessageInstance;
    modal: HookAPI;
};

export const AntdContext = React.createContext<AntdContextType>({
    message: {} as MessageInstance,
    modal: {} as HookAPI,
});

export const AntdContextWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [modalApi, modalContextHolder] = Modal.useModal();
    return (
        <AntdContext.Provider value={{ message: messageApi, modal: modalApi }}>
            {messageContextHolder}
            {modalContextHolder}
            {children}
        </AntdContext.Provider>
    );
};

export const FetchErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { message } = useContext(AntdContext);
    useEffect(() => {
        window.__APP_HANDLE_HTTP_ERROR__ = (error) => {
            message.error(`${error.response?.status}: ${error.response?.statusText}`);
        };
        window.__APP_HANDLE_SERVICE_ERROR__ = (error) => {
            message.error(`${error.code}: ${error.message}`);
        };
        window.__APP_HANDLE_REQUEST_ERROR__ = (error) => {
            message.error(`${error.code}: ${error.message}`);
        };
    }, [message]);
    return <>{children}</>;
};

export enum HotkeysScope {
    All = '*',
    DrawTool = 'draw_tool',
    None = 'none',
}
