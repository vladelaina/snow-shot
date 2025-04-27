import { KeyEventKey } from '../keyEventWrap/extra';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { useHistory } from '../../../historyContext';
import { useEffect, useState } from 'react';
import React from 'react';
import { DrawState } from '@/app/draw/types';
import { ToolButton } from '../toolButton';

const HistoryControlsCore = () => {
    const { history } = useHistory();
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        const unlisten = history.addOnUpdateListener(() => {
            setCanUndo(history.canUndo());
            setCanRedo(history.canRedo());
        });

        return () => {
            unlisten();
        };
    }, [history]);

    return (
        <>
            {/* 撤销 */}
            <ToolButton
                componentKey={KeyEventKey.UndoTool}
                icon={<UndoOutlined />}
                disableOnDrawing
                drawState={DrawState.Undo}
                disable={!canUndo}
                onClick={() => {
                    history.undo();
                }}
            />

            {/* 重做 */}
            <ToolButton
                componentKey={KeyEventKey.RedoTool}
                icon={<RedoOutlined />}
                disableOnDrawing
                drawState={DrawState.Redo}
                disable={!canRedo}
                onClick={() => {
                    history.redo();
                }}
            />
        </>
    );
};

export const HistoryControls = React.memo(HistoryControlsCore);
