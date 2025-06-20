import { DrawState } from '@/app/fullScreenDraw/components/drawCore/extra';
import { GlobalToken } from 'antd';
import { BaseButtonProps } from 'antd/es/button/button';
import React from 'react';

export const getButtonTypeByState = (active: boolean): BaseButtonProps['type'] => {
    return active ? 'primary' : 'text';
};

export const getButtonIconColorByState = (active: boolean, token: GlobalToken) => {
    return active ? token.colorSuccess : token.colorTextDisabled;
};

export type DrawToolbarContextType = {
    drawToolbarRef: React.RefObject<HTMLDivElement | null>;
    draggingRef: React.RefObject<boolean>;
    setDragging: (dragging: boolean) => void;
};

export const DrawToolbarContext = React.createContext<DrawToolbarContextType>({
    drawToolbarRef: { current: null },
    draggingRef: { current: false },
    setDragging: () => {},
});

export const isEnableSubToolbar = (drawState: DrawState) => {
    switch (drawState) {
        case DrawState.Idle:
            return false;
        default:
            return true;
    }
};
