import { DrawState } from '@/app/draw/types';
import { useCallback, useState } from 'react';
import { SubTools } from '../../subTools';
import { ToolButton } from '../../toolButton';
import { Button } from 'antd';
import { ArrowIcon, DiamondIcon, LineIcon, RectIcon } from '@/components/icons';
import { getButtonTypeByState } from '../../../extra';
import { KeyEventKey } from '../../keyEventWrap/extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawStatePublisher } from '@/app/draw/extra';

export const DrawSubTools: React.FC<{ onToolClick: (drawState: DrawState) => void }> = ({
    onToolClick,
}) => {
    const [drawState, setDrawState] = useState<DrawState | undefined>(undefined);

    useStateSubscriber(
        DrawStatePublisher,
        useCallback((drawState: DrawState) => {
            setDrawState(drawState);
        }, []),
    );

    if (drawState === DrawState.Rect || drawState === DrawState.Diamond) {
        return (
            <SubTools
                key={`draw-sub-tool-${DrawState.Rect}`}
                buttons={[
                    <ToolButton
                        key={`sub-tool-${DrawState.Rect}`}
                        componentKey={KeyEventKey.RectTool}
                        icon={<RectIcon style={{ fontSize: '1em' }} />}
                        drawState={DrawState.Rect}
                        onClick={() => {
                            onToolClick(DrawState.Rect);
                        }}
                    />,
                    <Button
                        key={`sub-tool-${DrawState.Diamond}`}
                        icon={<DiamondIcon style={{ fontSize: '1em' }} />}
                        type={getButtonTypeByState(drawState === DrawState.Diamond)}
                        onClick={() => {
                            onToolClick(DrawState.Diamond);
                        }}
                        disabled={false}
                    />,
                ]}
            />
        );
    }

    if (drawState === DrawState.Arrow || drawState === DrawState.Line) {
        return (
            <SubTools
                key={`draw-sub-tool-${DrawState.Arrow}`}
                buttons={[
                    <ToolButton
                        key={`sub-tool-${DrawState.Arrow}`}
                        componentKey={KeyEventKey.ArrowTool}
                        icon={<ArrowIcon style={{ fontSize: '0.83em' }} />}
                        drawState={DrawState.Arrow}
                        onClick={() => {
                            onToolClick(DrawState.Arrow);
                        }}
                    />,
                    <Button
                        key={`sub-tool-${DrawState.Line}`}
                        icon={<LineIcon style={{ fontSize: '1.16em' }} />}
                        type={getButtonTypeByState(drawState === DrawState.Line)}
                        onClick={() => {
                            onToolClick(DrawState.Line);
                        }}
                        disabled={false}
                    />,
                ]}
            />
        );
    }

    return <></>;
};
