import React from 'react';

export const getButtonTypeByState = (active: boolean) => {
    return active ? 'primary' : 'text';
};

export type DrawToolbarContextType = {
    drawToolbarRef: React.RefObject<HTMLDivElement | null>;
    drawSubToolbarRef: React.RefObject<HTMLDivElement | null>;
    draggingRef: React.RefObject<boolean>;
    setDragging: (dragging: boolean) => void;
};

export const DrawToolbarContext = React.createContext<DrawToolbarContextType>({
    drawToolbarRef: { current: null },
    drawSubToolbarRef: { current: null },
    draggingRef: { current: false },
    setDragging: () => {},
});
