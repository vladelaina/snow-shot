import { DrawState } from '@/app/draw/types';
import {
    KeyEventKey,
    KeyEventWrap,
} from '@/app/draw/components/drawToolbar/components/keyEventWrap';
import React, { useCallback, useState } from 'react';
import { Button } from 'antd';
import { DrawStatePublisher } from '@/app/draw/page';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { getButtonTypeByState } from '../../extra';

const ToolButtonCore: React.FC<{
    componentKey: KeyEventKey;
    disableOnDrawing?: boolean;
    icon: React.ReactNode;
    onClick: () => void;
    drawState: DrawState;
    disable?: boolean;
}> = ({ componentKey, disableOnDrawing, icon, onClick, drawState: propDrawState, disable }) => {
    const [buttonType, setButtonType] = useState(getButtonTypeByState(false));
    const updateButtonType = useCallback(
        (drawState: DrawState) => {
            setButtonType(getButtonTypeByState(drawState === propDrawState));
        },
        [propDrawState],
    );

    useStateSubscriber(DrawStatePublisher, updateButtonType);
    return (
        <KeyEventWrap
            onKeyDownEventPropName="onClick"
            componentKey={componentKey}
            disableOnDrawing={disableOnDrawing}
        >
            <Button icon={icon} type={buttonType} onClick={onClick} disabled={disable} />
        </KeyEventWrap>
    );
};

export const ToolButton = React.memo(ToolButtonCore);
