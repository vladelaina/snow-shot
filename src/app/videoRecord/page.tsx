'use client';

import { ElementRect } from '@/commands';
import { MonitorInfo } from '@/commands/core';
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getVideoRecordParams, VideoRecordState } from './extra';
import { EventListenerContext } from '@/components/eventListener';
import { VideoRecordWindowInfo } from '@/functions/videoRecord';

const PENDING_STROKE_COLOR = '#4096ff';
const RECORDING_STROKE_COLOR = '#f5222d';

export default function VideoRecordPage() {
    const selectCanvasRef = useRef<HTMLCanvasElement>(null);

    const monitorInfoRef = useRef<MonitorInfo | undefined>(undefined);
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
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;

            // 计算矩形位置和大小，边框位于选择区域外部
            const borderOffset = ctx.lineWidth / 2;
            const x = rect.min_x - borderOffset;
            const y = rect.min_y - borderOffset;
            const width = rect.max_x - rect.min_x + ctx.lineWidth;
            const height = rect.max_y - rect.min_y + ctx.lineWidth;

            ctx.strokeRect(x, y, width, height);
        }
    }, []);

    const init = useCallback(
        async (monitorInfo: MonitorInfo, selectRect: ElementRect) => {
            monitorInfoRef.current = monitorInfo;
            selectRectRef.current = selectRect;

            const appWindow = getCurrentWindow();

            await Promise.all([
                appWindow.setSize(
                    new PhysicalSize(
                        monitorInfoRef.current.monitor_width,
                        monitorInfoRef.current.monitor_height,
                    ),
                ),
                appWindow.setPosition(
                    new PhysicalPosition(
                        monitorInfoRef.current.monitor_x,
                        monitorInfoRef.current.monitor_y,
                    ),
                ),
            ]);

            const canvas = selectCanvasRef.current;
            if (!canvas) {
                return;
            }

            canvas.width = monitorInfoRef.current.monitor_width;
            canvas.height = monitorInfoRef.current.monitor_height;

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
        const { monitorInfo, selectRect } = getVideoRecordParams();
        init(monitorInfo, selectRect);

        const listenerId = addListener('video-record-reload', (params) => {
            const windowInfo = (params as { payload: VideoRecordWindowInfo }).payload;

            init(
                {
                    monitor_x: windowInfo.monitor_x,
                    monitor_y: windowInfo.monitor_y,
                    monitor_width: windowInfo.monitor_width,
                    monitor_height: windowInfo.monitor_height,
                    monitor_scale_factor: windowInfo.monitor_scale_factor,
                    mouse_x: 0,
                    mouse_y: 0,
                },
                {
                    min_x: windowInfo.select_rect_min_x,
                    min_y: windowInfo.select_rect_min_y,
                    max_x: windowInfo.select_rect_max_x,
                    max_y: windowInfo.select_rect_max_y,
                },
            );
        });

        return () => {
            removeListener(listenerId);
        };
    }, [addListener, init, removeListener]);

    return (
        <div className="container">
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
