import { DrawState } from '@/app/draw/types';
import { KeyEventWrap } from '@/app/draw/components/drawToolbar/components/keyEventWrap';
import React, { useCallback, useState } from 'react';
import { Button } from 'antd';
import { DrawStatePublisher } from '@/app/draw/extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { getButtonTypeByState } from '../../extra';
import { KeyEventKey } from '../keyEventWrap/extra';

const ToolButtonCore: React.FC<{
    componentKey: KeyEventKey;
    disableOnDrawing?: boolean;
    icon: React.ReactNode;
    onClick: () => void;
    drawState: DrawState;
    disable?: boolean;
    confirmTip?: React.ReactNode;
}> = ({
    componentKey,
    disableOnDrawing,
    icon,
    onClick,
    drawState: propDrawState,
    disable,
    confirmTip,
}) => {
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
            onKeyUpEventPropName="onClick"
            componentKey={componentKey}
            disableOnDrawing={disableOnDrawing}
            confirmTip={confirmTip}
            enable={disable ? false : undefined}
        >
            <Button icon={icon} type={buttonType} onClick={onClick} disabled={disable} />
        </KeyEventWrap>
    );
};

export const ToolButton = React.memo(ToolButtonCore);
