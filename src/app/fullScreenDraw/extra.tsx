import { createContext, useContext } from 'react';
import { DrawCoreActionType, DrawState } from './components/drawCore/extra';

export type DrawContextType = {
    getDrawCoreAction: () => DrawCoreActionType | undefined;
    setTool: (tool: DrawState) => void;
};

export const DrawContext = createContext<DrawContextType>({
    getDrawCoreAction: () => undefined,
    setTool: () => {},
});

export const useDrawContext = () => {
    const context = useContext(DrawContext);
    return context;
};
