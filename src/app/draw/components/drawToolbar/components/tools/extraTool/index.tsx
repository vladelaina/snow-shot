import { Button, message } from 'antd';
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
import { getPlatform } from '@/utils';

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

    const executeScanQrcode = useCallback(() => {
        setActiveTool(ExtraToolList.ScanQrcode);
    }, []);

    const executeVideoRecord = useCallback(() => {
        const captureBoundingBoxInfo = captureBoundingBoxInfoRef.current;
        const selectRect = selectLayerActionRef.current?.getSelectRect();
        if (!captureBoundingBoxInfo || !selectRect) {
            return;
        }

        const monitorRect = captureBoundingBoxInfo.transformWindowRect(selectRect);

        if (
            getPlatform() === 'macos' &&
            captureBoundingBoxInfo.getActiveMonitorRectList(monitorRect).length > 1
        ) {
            message.warning(
                intl.formatMessage({
                    id: 'draw.extraTool.videoRecord.multiMonitor',
                }),
            );
            return;
        }

        createVideoRecordWindow(
            monitorRect.min_x,
            monitorRect.min_y,
            monitorRect.max_x,
            monitorRect.max_y,
        );

        finishCapture();
    }, [captureBoundingBoxInfoRef, finishCapture, intl, selectLayerActionRef]);

    useStateSubscriber(
        DrawStatePublisher,
        useCallback(
            (drawState: DrawState) => {
                if (
                    drawState === DrawState.ExtraTools ||
                    drawState === DrawState.ScanQrcode ||
                    drawState === DrawState.VideoRecord
                ) {
                    if (drawState === DrawState.ScanQrcode) {
                        executeScanQrcode();
                    } else if (drawState === DrawState.VideoRecord) {
                        executeVideoRecord();
                    }

                    setEnabled(true);
                } else {
                    setActiveTool(undefined);
                    setEnabled(false);
                }
            },
            [executeScanQrcode, executeVideoRecord],
        ),
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
                            setDrawState(DrawState.VideoRecord);
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
