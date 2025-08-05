'use client';

import { ElementRect } from '@/commands';
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getVideoRecordParams, VideoRecordState } from './extra';
import { EventListenerContext } from '@/components/eventListener';
import { VideoRecordWindowInfo } from '@/functions/videoRecord';

const PENDING_STROKE_COLOR = '#4096ff';
const RECORDING_STROKE_COLOR = '#f5222d';
const PAUSED_STROKE_COLOR = '#faad14';
const BORDER_WIDTH = 2;
const BORDER_OFFSET = BORDER_WIDTH / 2;

export default function VideoRecordPage() {
    const selectCanvasRef = useRef<HTMLCanvasElement>(null);

    const selectRectRef = useRef<ElementRect | undefined>(undefined);

    const { addListener, removeListener } = useContext(EventListenerContext);

    const [videoRecordState, setVideoRecordState] = useState(VideoRecordState.Idle);

    const drawSelectRect = useCallback((videoRecordState: VideoRecordState) => {
        const canvas = selectCanvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        // 绘制选择区域的矩形边框
        const rect = selectRectRef.current;
        if (rect) {
            let strokeColor = PENDING_STROKE_COLOR;
            if (videoRecordState === VideoRecordState.Recording) {
                strokeColor = RECORDING_STROKE_COLOR;
            } else if (videoRecordState === VideoRecordState.Paused) {
                strokeColor = PAUSED_STROKE_COLOR;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = BORDER_WIDTH;

            // 计算矩形位置和大小，边框位于选择区域外部
            const x = BORDER_OFFSET;
            const y = BORDER_OFFSET;
            const width = rect.max_x - rect.min_x + BORDER_WIDTH * 2 + BORDER_OFFSET;
            const height = rect.max_y - rect.min_y + BORDER_WIDTH * 2 + BORDER_OFFSET;

            ctx.strokeRect(x, y, width, height);
        }
    }, []);

    const init = useCallback(
        async (selectRect: ElementRect) => {
            selectRectRef.current = selectRect;

            const appWindow = getCurrentWindow();

            await Promise.all([
                appWindow.setSize(
                    new PhysicalSize(
                        selectRect.max_x - selectRect.min_x + BORDER_WIDTH * 2 + BORDER_OFFSET * 2,
                        selectRect.max_y - selectRect.min_y + BORDER_WIDTH * 2 + BORDER_OFFSET * 2,
                    ),
                ),
                appWindow.setPosition(
                    new PhysicalPosition(
                        selectRect.min_x - BORDER_WIDTH * 2 - BORDER_OFFSET,
                        selectRect.min_y - BORDER_WIDTH * 2 - BORDER_OFFSET,
                    ),
                ),
            ]);

            await appWindow.show();

            const canvas = selectCanvasRef.current;
            if (!canvas) {
                return;
            }

            canvas.width = selectRect.max_x - selectRect.min_x + BORDER_WIDTH * 4;
            canvas.height = selectRect.max_y - selectRect.min_y + BORDER_WIDTH * 4;

            setVideoRecordState(VideoRecordState.Idle);
            drawSelectRect(VideoRecordState.Idle);

            appWindow.setIgnoreCursorEvents(true);
        },
        [drawSelectRect],
    );

    useEffect(() => {
        drawSelectRect(videoRecordState);
    }, [drawSelectRect, videoRecordState]);

    useEffect(() => {
        const { selectRect } = getVideoRecordParams();
        init(selectRect);

        const listenerId = addListener('reload-video-record', (params) => {
            const windowInfo = (params as { payload: VideoRecordWindowInfo }).payload;

            init({
                min_x: windowInfo.select_rect_min_x,
                min_y: windowInfo.select_rect_min_y,
                max_x: windowInfo.select_rect_max_x,
                max_y: windowInfo.select_rect_max_y,
            });
        });

        const closeVideoRecordWindowListenerId = addListener('close-video-record-window', () => {
            getCurrentWindow().close();
        });

        const changeVideoRecordStateListenerId = addListener(
            'change-video-record-state',
            (params) => {
                const { state } = (params as { payload: { state: VideoRecordState } }).payload;

                setVideoRecordState(state);
            },
        );

        return () => {
            removeListener(listenerId);
            removeListener(closeVideoRecordWindowListenerId);
            removeListener(changeVideoRecordStateListenerId);
        };
    }, [addListener, init, removeListener]);

    return (
        <div className="container" onContextMenu={(e) => e.preventDefault()}>
            <canvas ref={selectCanvasRef} className="select-canvas" />

            <style jsx>{`
                .container {
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                }

                .select-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
            `}</style>
        </div>
    );
}
