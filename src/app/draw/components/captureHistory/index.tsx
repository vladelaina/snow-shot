import { useCallback, useContext, useImperativeHandle, useRef } from 'react';
import { DrawContext } from '../../types';
import { CaptureHistory } from '@/utils/captureHistory';
import { CaptureHistoryItem } from '@/utils/appStore';
import { AppSettingsData } from '@/app/contextWrap';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { KeyEventWrap } from '../drawToolbar/components/keyEventWrap';
import { KeyEventKey } from '../drawToolbar/components/keyEventWrap/extra';
import React from 'react';
import { withStatePublisher } from '@/hooks/useStatePublisher';
import { EnableKeyEventPublisher } from '../drawToolbar/components/keyEventWrap/extra';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawState, DrawStatePublisher } from '@/app/fullScreenDraw/components/drawCore/extra';
import { CaptureEvent, CaptureEventParams, CaptureEventPublisher } from '../../extra';
import { Ordered } from '@mg-chao/excalidraw/element/types';
import { NonDeletedExcalidrawElement } from '@mg-chao/excalidraw/element/types';

export type CaptureHistoryActionType = {
    saveCurrentCapture: () => Promise<void>;
};

const CaptureHistoryControllerCore: React.FC<{
    actionRef: React.RefObject<CaptureHistoryActionType | undefined>;
}> = ({ actionRef }) => {
    const captureHistoryListRef = useRef<CaptureHistoryItem[]>([]);
    const currentIndexRef = useRef<number>(0);
    const captureHistoryRef = useRef<CaptureHistory | undefined>(undefined);
    const isImageLoadingRef = useRef<boolean>(false);
    const [, setEnableKeyEvent] = useStateSubscriber(EnableKeyEventPublisher, undefined);
    const { imageBufferRef, selectLayerActionRef, drawLayerActionRef, drawCacheLayerActionRef } =
        useContext(DrawContext);

    const resetCurrentIndex = useCallback(() => {
        currentIndexRef.current = captureHistoryListRef.current.length;
    }, [captureHistoryListRef]);

    const init = useCallback(
        async (appSettings: AppSettingsData) => {
            captureHistoryRef.current = new CaptureHistory();
            await captureHistoryRef.current.init();

            captureHistoryListRef.current = await captureHistoryRef.current.getList(appSettings);
            resetCurrentIndex();
        },
        [resetCurrentIndex],
    );

    useStateSubscriber(
        CaptureEventPublisher,
        useCallback(
            (captureEvent: CaptureEventParams | undefined) => {
                if (captureEvent?.event === CaptureEvent.onExecuteScreenshot) {
                    isImageLoadingRef.current = true;
                } else if (captureEvent?.event === CaptureEvent.onCaptureReady) {
                    resetCurrentIndex();
                } else if (captureEvent?.event === CaptureEvent.onCaptureLoad) {
                    isImageLoadingRef.current = false;
                }
            },
            [resetCurrentIndex],
        ),
    );
    useStateSubscriber(
        DrawStatePublisher,
        useCallback(
            (drawState: DrawState) => {
                setEnableKeyEvent(drawState === DrawState.Idle);
            },
            [setEnableKeyEvent],
        ),
    );

    useAppSettingsLoad(
        useCallback(
            (appSettings) => {
                init(appSettings);
            },
            [init],
        ),
        true,
    );

    const changeCurrentIndex = useCallback(
        async (delta: number) => {
            if (captureHistoryListRef.current.length === 0) {
                return;
            }

            if (isImageLoadingRef.current) {
                return;
            }

            isImageLoadingRef.current = true;

            currentIndexRef.current = Math.max(
                0,
                Math.min(currentIndexRef.current + delta, captureHistoryListRef.current.length),
            );

            if (currentIndexRef.current === captureHistoryListRef.current.length) {
                selectLayerActionRef.current?.setSelectRect(undefined);
                drawLayerActionRef.current?.switchCaptureHistory(undefined);
            } else {
                selectLayerActionRef.current?.setSelectRect(
                    captureHistoryListRef.current[currentIndexRef.current].selected_rect,
                );
                drawCacheLayerActionRef.current?.updateScene({
                    elements:
                        captureHistoryListRef.current[currentIndexRef.current]
                            .excalidraw_elements ?? [],
                    captureUpdate: 'NEVER',
                });
                await drawLayerActionRef.current?.switchCaptureHistory(
                    captureHistoryListRef.current[currentIndexRef.current],
                );
            }

            isImageLoadingRef.current = false;
        },
        [drawCacheLayerActionRef, drawLayerActionRef, selectLayerActionRef],
    );

    const saveCurrentCapture = useCallback(async () => {
        if (!imageBufferRef.current || !captureHistoryRef.current) {
            console.error('[CaptureHistoryController] saveCurrentCapture error, invalid state', {
                imageBufferRef: imageBufferRef.current,
                captureHistoryRef: captureHistoryRef.current,
            });
            return;
        }

        const selectRect = selectLayerActionRef.current?.getSelectRect();
        if (!selectRect) {
            console.error(
                '[CaptureHistoryController] saveCurrentCapture error, invalid selectRect',
                {
                    selectRect: selectRect,
                },
            );
            return;
        }

        const captureHistoryItem = await captureHistoryRef.current.save(
            captureHistoryListRef.current[currentIndexRef.current] ?? imageBufferRef.current,
            drawCacheLayerActionRef.current?.getExcalidrawAPI()?.getSceneElements(),
            selectRect,
        );
        captureHistoryListRef.current.push(captureHistoryItem);
        resetCurrentIndex();
    }, [drawCacheLayerActionRef, imageBufferRef, resetCurrentIndex, selectLayerActionRef]);

    useImperativeHandle(actionRef, () => {
        return {
            saveCurrentCapture,
        };
    }, [saveCurrentCapture]);

    return (
        <>
            <KeyEventWrap
                componentKey={KeyEventKey.PreviousCapture}
                onKeyDown={() => {
                    console.log(
                        '[CaptureHistoryController] onKeyDown',
                        KeyEventKey.PreviousCapture,
                    );
                    changeCurrentIndex(-1);
                }}
            >
                <div />
            </KeyEventWrap>
            <KeyEventWrap
                componentKey={KeyEventKey.NextCapture}
                onKeyDown={() => {
                    changeCurrentIndex(1);
                }}
            >
                <div />
            </KeyEventWrap>
        </>
    );
};

export const CaptureHistoryController = React.memo(
    withStatePublisher(CaptureHistoryControllerCore, EnableKeyEventPublisher),
);
