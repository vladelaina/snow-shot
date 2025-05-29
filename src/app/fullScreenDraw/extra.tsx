import { createContext, useContext } from 'react';
import { DrawCoreActionType } from './components/drawCore/extra';

export type FullScreenDrawContextType = {
    getDrawCoreAction: () => DrawCoreActionType | undefined;
};

export const FullScreenDrawContext = createContext<FullScreenDrawContextType>({
    getDrawCoreAction: () => undefined,
});

export const useFullScreenDrawContext = () => {
    const context = useContext(FullScreenDrawContext);
    return context;
};
