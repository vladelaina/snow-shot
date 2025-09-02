import { FormattedMessage } from 'react-intl';
import { ExcalidrawPropsCustomOptions } from '@mg-chao/excalidraw/types';
import { useCallback, useContext, useMemo, useState } from 'react';
import { DrawState, DrawStatePublisher } from '../extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { Radio } from 'antd';
import { ArrowIcon, DiamondIcon, LineIcon, RectIcon } from '@/components/icons';
import { DrawContext } from '@/app/fullScreenDraw/extra';

const SubToolEditor: NonNullable<
    NonNullable<ExcalidrawPropsCustomOptions['pickerRenders']>['SubToolEditor']
> = () => {
    const { setTool } = useContext(DrawContext);
    const [drawState, setDrawState] = useState<DrawState | undefined>(undefined);

    useStateSubscriber(
        DrawStatePublisher,
        useCallback((drawState: DrawState) => {
            setDrawState(drawState);
        }, []),
    );
    const drawStyleSubTools = useMemo(() => {
        if (drawState === DrawState.Rect || drawState === DrawState.Diamond) {
            return (
                <Radio.Group value={drawState}>
                    <Radio.Button value={DrawState.Rect}>
                        <div
                            className="subtool-radio-button-icon"
                            onClick={() => {
                                setTool(DrawState.Rect);
                            }}
                        >
                            <RectIcon style={{ fontSize: '1em' }} />
                        </div>
                    </Radio.Button>
                    <Radio.Button value={DrawState.Diamond}>
                        <div
                            className="subtool-radio-button-icon"
                            onClick={() => {
                                setTool(DrawState.Diamond);
                            }}
                        >
                            <DiamondIcon style={{ fontSize: '1em' }} />
                        </div>
                    </Radio.Button>
                </Radio.Group>
            );
        }

        if (drawState === DrawState.Arrow || drawState === DrawState.Line) {
            return (
                <Radio.Group value={drawState} style={{ display: 'flex' }}>
                    <Radio.Button value={DrawState.Arrow}>
                        <div
                            className="subtool-radio-button-icon"
                            onClick={() => {
                                setTool(DrawState.Arrow);
                            }}
                        >
                            <ArrowIcon style={{ fontSize: '0.83em' }} />
                        </div>
                    </Radio.Button>
                    <Radio.Button value={DrawState.Line}>
                        <div
                            className="subtool-radio-button-icon"
                            onClick={() => {
                                setTool(DrawState.Line);
                            }}
                        >
                            <LineIcon style={{ fontSize: '1.16em' }} />
                        </div>
                    </Radio.Button>
                </Radio.Group>
            );
        }

        return undefined;
    }, [drawState, setTool]);

    if (drawStyleSubTools) {
        return (
            <fieldset>
                <legend>
                    <FormattedMessage id="draw.drawStyleTool" />
                </legend>
                <div>{drawStyleSubTools}</div>
            </fieldset>
        );
    }

    return <></>;
};

export default SubToolEditor;
