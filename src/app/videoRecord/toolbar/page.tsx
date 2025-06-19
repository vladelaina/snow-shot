'use client';

import {
    HolderOutlined,
    PauseOutlined,
    PlayCircleFilled,
    PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Flex, theme } from 'antd';
import { useIntl } from 'react-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { zIndexs } from '@/utils/zIndex';
import {
    MicrophoneIcon,
    ResumeRecordIcon,
    StartRecordIcon,
    StopRecordIcon,
} from '@/components/icons';
import { getButtonIconColorByState } from '@/app/draw/components/drawToolbar/extra';
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { MonitorInfo } from '@/commands/core';
import { ElementRect } from '@/commands';
import { getVideoRecordParams, VideoRecordState } from '../extra';
import {
    VideoFormat,
    videoRecordPause,
    videoRecordResume,
    videoRecordStart,
    videoRecordStop,
} from '@/commands/videoRecord';
import { VideoRecordWindowInfo } from '@/functions/videoRecord';
import { EventListenerContext } from '@/components/eventListener';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export default function VideoRecordToolbar() {
    const { token } = theme.useToken();
    const intl = useIntl();

    const monitorInfoRef = useRef<MonitorInfo | undefined>(undefined);
    const selectRectRef = useRef<ElementRect | undefined>(undefined);

    const { addListener, removeListener } = useContext(EventListenerContext);

    const toolbarRef = useRef<HTMLDivElement>(null);
    const durationFormatRef = useRef<HTMLDivElement>(null);

    const init = useCallback((monitorInfo: MonitorInfo, selectRect: ElementRect) => {
        monitorInfoRef.current = monitorInfo;
        selectRectRef.current = selectRect;

        const appWindow = getCurrentWindow();
        const scaleFactor = window.devicePixelRatio;

        const toolbarWidth = (toolbarRef.current?.clientWidth ?? 0) + 3 * 2;
        const toolbarHeight = (toolbarRef.current?.clientHeight ?? 0) + 3 * 2;

        const physicalWidth = Math.round(toolbarWidth * scaleFactor);
        const physicalHeight = Math.round(toolbarHeight * scaleFactor);

        const screenWidth = window.screen.width * scaleFactor;

        const centerX = (screenWidth - physicalWidth) / 2;

        appWindow.setSize(new PhysicalSize(physicalWidth, physicalHeight));
        appWindow.setPosition(
            new PhysicalPosition(
                Math.round(monitorInfo.monitor_x + centerX),
                Math.round(monitorInfo.monitor_y + monitorInfo.monitor_height * 0.9),
            ),
        );
    }, []);

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

        videoRecordStop();

        const stopVideoRecord = () => {
            videoRecordStop();
        };

        window.addEventListener('beforeunload', stopVideoRecord);

        return () => {
            videoRecordStop();
            window.removeEventListener('beforeunload', stopVideoRecord);
            removeListener(listenerId);
        };
    }, [addListener, init, removeListener]);

    const dragTitle = useMemo(() => {
        return intl.formatMessage({ id: 'draw.drag' });
    }, [intl]);

    const [enableMicrophone, setEnableMicrophone] = useState(false);
    // const [enableSystemAudio, setEnableSystemAudio] = useState(true);
    const durationRef = useRef(0);
    const [videoRecordState, setVideoRecordState] = useState(VideoRecordState.Idle);

    const durationTimer = useRef<NodeJS.Timeout | null>(null);

    const updateDurationFormat = useCallback(() => {
        durationFormatRef.current!.innerText = dayjs
            .duration(durationRef.current, 'seconds')
            .format('HH:mm:ss');
    }, []);

    useEffect(() => {
        updateDurationFormat();

        return () => {
            if (durationTimer.current) {
                clearInterval(durationTimer.current);
            }
        };
    }, [updateDurationFormat]);

    const [recordLoading, setRecordLoading] = useState(false);

    return (
        <div className="video-record-toolbar-container" data-tauri-drag-region>
            <div className="video-record-toolbar" ref={toolbarRef}>
                <Flex align="center" gap={token.paddingXS}>
                    <div data-tauri-drag-region className="drag-button" title={dragTitle}>
                        <HolderOutlined data-tauri-drag-region />
                    </div>

                    {videoRecordState === VideoRecordState.Idle && (
                        <Button
                            loading={recordLoading}
                            disabled={videoRecordState !== VideoRecordState.Idle}
                            onClick={() => {
                                setRecordLoading(true);
                                videoRecordStart(
                                    selectRectRef.current?.min_x ?? 0,
                                    selectRectRef.current?.min_y ?? 0,
                                    selectRectRef.current?.max_x ?? 0,
                                    selectRectRef.current?.max_y ?? 0,
                                    'C:/Users/Magic/Videos/Snow Shot Videos/test3',
                                    VideoFormat.Mp4,
                                    30,
                                    enableMicrophone,
                                    false,
                                    '',
                                    true,
                                    'libx264',
                                    'ultrafast',
                                )
                                    .then(() => {
                                        setVideoRecordState(VideoRecordState.Recording);

                                        if (durationTimer.current) {
                                            clearInterval(durationTimer.current);
                                            durationTimer.current = null;
                                        }

                                        durationRef.current = 0;
                                        updateDurationFormat();

                                        durationTimer.current = setInterval(() => {
                                            durationRef.current++;
                                            updateDurationFormat();
                                        }, 1000);
                                    })
                                    .finally(() => {
                                        setRecordLoading(false);
                                    });
                            }}
                            icon={
                                <StartRecordIcon
                                    style={{
                                        color: token.colorError,
                                        position: 'relative',
                                    }}
                                />
                            }
                            title={intl.formatMessage({ id: 'videoRecord.startRecord' })}
                            type={'text'}
                            key="start-record"
                        />
                    )}

                    {(videoRecordState === VideoRecordState.Recording ||
                        videoRecordState === VideoRecordState.Paused) && (
                        <Button
                            onClick={() => {
                                videoRecordStop().then(() => {
                                    setVideoRecordState(VideoRecordState.Idle);

                                    if (durationTimer.current) {
                                        clearInterval(durationTimer.current);
                                        durationTimer.current = null;
                                    }

                                    durationRef.current = 0;
                                    updateDurationFormat();
                                });
                            }}
                            icon={
                                <StopRecordIcon
                                    style={{
                                        color: token.colorError,
                                        position: 'relative',
                                    }}
                                />
                            }
                            title={intl.formatMessage({ id: 'videoRecord.stopRecord' })}
                            type={'text'}
                            key="stop-record"
                        />
                    )}

                    {videoRecordState !== VideoRecordState.Paused && (
                        <Button
                            disabled={videoRecordState !== VideoRecordState.Recording}
                            onClick={() => {
                                videoRecordPause().then(() => {
                                    setVideoRecordState(VideoRecordState.Paused);
                                });
                            }}
                            icon={
                                <PauseOutlined
                                    style={{
                                        color:
                                            videoRecordState !== VideoRecordState.Recording
                                                ? token.colorTextDisabled
                                                : token.colorWarning,
                                        position: 'relative',
                                    }}
                                />
                            }
                            title={intl.formatMessage({ id: 'videoRecord.pauseRecord' })}
                            type={'text'}
                            key="pause-record"
                        />
                    )}

                    {videoRecordState === VideoRecordState.Paused && (
                        <Button
                            disabled={videoRecordState !== VideoRecordState.Paused}
                            onClick={() => {
                                videoRecordResume().then(() => {
                                    setVideoRecordState(VideoRecordState.Recording);
                                });
                            }}
                            icon={
                                <ResumeRecordIcon
                                    style={{
                                        color: token.colorSuccess,
                                        position: 'relative',
                                    }}
                                />
                            }
                            title={intl.formatMessage({ id: 'videoRecord.resumeRecord' })}
                            type={'text'}
                            key="resume-record"
                        />
                    )}

                    <div className="video-record-toolbar-time" ref={durationFormatRef} />

                    <Button
                        onClick={() => {
                            setEnableMicrophone((prev) => !prev);
                        }}
                        icon={
                            <MicrophoneIcon
                                style={{
                                    color: getButtonIconColorByState(enableMicrophone, token),
                                }}
                            />
                        }
                        title={intl.formatMessage({ id: 'videoRecord.microphone' })}
                        type={'text'}
                        key="microphone"
                    />

                    {/* <Button
                        onClick={() => {
                            setEnableSystemAudio((prev) => !prev);
                        }}
                        icon={
                            <SystemAudioIcon
                                style={{
                                    color: getButtonIconColorByState(enableSystemAudio, token),
                                }}
                            />
                        }
                        title={intl.formatMessage({ id: 'videoRecord.systemAudio' })}
                        type={'text'}
                        key="system-audio"
                    /> */}

                    <div data-tauri-drag-region className="drag-button" title={dragTitle}>
                        <HolderOutlined data-tauri-drag-region />
                    </div>
                </Flex>
            </div>

            <style jsx>{`
                .video-record-toolbar-container {
                    position: fixed;
                    z-index: ${zIndexs.VideoRecord_Toolbar};
                    padding: 3px;
                    user-select: none;
                }

                .video-record-toolbar {
                    pointer-events: auto;
                    padding: ${token.paddingXXS}px ${token.paddingSM}px;
                    box-sizing: border-box;
                    background-color: ${token.colorBgContainer};
                    border-radius: ${token.borderRadiusLG}px;
                    cursor: default; /* 防止非拖动区域也变成可拖动状态 */
                    color: ${token.colorText};
                    box-shadow: 0 0 3px 0px ${token.colorPrimaryHover};
                    transition: opacity ${token.motionDurationMid} ${token.motionEaseInOut};
                }

                .drag-button {
                    font-size: 18px;
                    color: ${token.colorTextQuaternary};
                    cursor: grab;
                }

                .video-record-toolbar-time {
                    width: 54px;
                    font-size: 14px;
                    text-align: center;
                    color: ${token.colorTextSecondary};
                }

                .drag-button:active {
                    cursor: grabbing;
                }

                .video-record-toolbar :global(.ant-btn) :global(.ant-btn-icon) {
                    font-size: 24px;
                }
            `}</style>
        </div>
    );
}
