import { CanvasHistory } from '@/core/canvas/canvasHistory';
import { createContext, useContext, useMemo } from 'react';

type HistoryContextType = {
    history: CanvasHistory;
};

export const HistoryContext = createContext<HistoryContextType>({
    history: new CanvasHistory(),
});

export const useHistory = () => {
    const context = useContext(HistoryContext);

    return context;
};

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
    const history = useMemo(() => new CanvasHistory(), []);

    return <HistoryContext.Provider value={{ history }}>{children}</HistoryContext.Provider>;
};
