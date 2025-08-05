import { Button } from 'antd';
import { SubTools } from '../../subTools';

import { useIntl } from 'react-intl';
import { ScanOutlined } from '@ant-design/icons';
import { useState, useCallback, useContext } from 'react';
import { DrawStatePublisher } from '@/app/fullScreenDraw/components/drawCore/extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawState } from '@/app/fullScreenDraw/components/drawCore/extra';
import { ScanQrcodeTool } from './components/scanQrcode';
import { getButtonTypeByState } from '../../../extra';
import { VideoRecordIcon } from '@/components/icons';
import { createVideoRecordWindow } from '@/commands/core';
import { DrawContext } from '@/app/draw/types';

export enum ExtraToolList {
    ScanQrcode = 0,
    VideoRecord = 1,
}

export const ExtraTool: React.FC<{
    finishCapture: () => void;
}> = ({ finishCapture }) => {
    const intl = useIntl();

    const { captureBoundingBoxInfoRef, selectLayerActionRef } = useContext(DrawContext);

    const [activeTool, setActiveTool] = useState<ExtraToolList | undefined>(undefined);
    const [enabled, setEnabled] = useState(false);
    const [, setDrawState] = useStateSubscriber(DrawStatePublisher, undefined);
    useStateSubscriber(
        DrawStatePublisher,
        useCallback((drawState: DrawState) => {
            if (drawState === DrawState.ExtraTools || drawState === DrawState.ScanQrcode) {
                if (drawState === DrawState.ScanQrcode) {
                    setActiveTool(ExtraToolList.ScanQrcode);
                }

                setEnabled(true);
            } else {
                setActiveTool(undefined);
                setEnabled(false);
            }
        }, []),
    );

    if (!enabled) {
        return null;
    }

    return (
        <>
            <SubTools
                buttons={[
                    <Button
                        icon={<ScanOutlined />}
                        title={intl.formatMessage({ id: 'draw.extraTool.scanQrcode' })}
                        type={getButtonTypeByState(activeTool === ExtraToolList.ScanQrcode)}
                        key="scanQrcode"
                        onClick={() => {
                            setDrawState(DrawState.ScanQrcode);
                        }}
                    />,
                    <Button
                        icon={<VideoRecordIcon />}
                        title={intl.formatMessage({ id: 'draw.extraTool.videoRecord' })}
                        type={getButtonTypeByState(activeTool === ExtraToolList.VideoRecord)}
                        key="videoRecord"
                        onClick={() => {
                            const captureBoundingBoxInfo = captureBoundingBoxInfoRef.current;
                            const selectRect = selectLayerActionRef.current?.getSelectRect();
                            if (!captureBoundingBoxInfo || !selectRect) {
                                return;
                            }

                            const monitorRect =
                                captureBoundingBoxInfo.transformWindowRect(selectRect);

                            createVideoRecordWindow(
                                monitorRect.min_x,
                                monitorRect.min_y,
                                monitorRect.max_x,
                                monitorRect.max_y,
                            );

                            finishCapture();
                        }}
                    />,
                ]}
            />

            <>
                {activeTool === ExtraToolList.ScanQrcode && (
                    <ScanQrcodeTool finishCapture={finishCapture} />
                )}
            </>
        </>
    );
};
