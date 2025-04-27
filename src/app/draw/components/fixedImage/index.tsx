import { useCallback, useEffect, useImperativeHandle, useRef, useState, useContext } from 'react';
import Image from 'next/image';
import { ElementRect, ImageBuffer, saveFile } from '@/commands';
import { Menu } from '@tauri-apps/api/menu';
import { Button, theme } from 'antd';
import { LogicalPosition, PhysicalSize } from '@tauri-apps/api/dpi';
import { useIntl } from 'react-intl';
import { getCurrentWindow } from '@tauri-apps/api/window';
import * as dialog from '@tauri-apps/plugin-dialog';
import { generateImageFileName } from '../../actions';
import { CloseOutlined } from '@ant-design/icons';
import { useStateRef } from '@/hooks/useStateRef';
import { useCallbackRender } from '@/hooks/useCallbackRender';
import { zIndexs } from '@/utils/zIndex';
import { DrawContext } from '../../types';

export type FixedImageActionType = {
    init: (
        selectRect: ElementRect,
        imageBuffer: ImageBuffer,
        canvas: HTMLCanvasElement,
    ) => Promise<void>;
    popupMenu: (position: LogicalPosition) => void;
};

export const FixedImage: React.FC<{
    actionRef: React.RefObject<FixedImageActionType | undefined>;
    onLoad: () => void;
}> = ({ actionRef, onLoad }) => {
    const intl = useIntl();
    const { token } = theme.useToken();

    const { ocrBlocksActionRef } = useContext(DrawContext);

    const [style, setStyle, styleRef] = useStateRef<React.CSSProperties>({});
    const canvasPropsRef = useRef<{
        width: number;
        height: number;
        scaleFactor: number;
    }>({
        width: 0,
        height: 0,
        scaleFactor: 1,
    });
    const blobRef = useRef<Blob | undefined>(undefined);
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

    useImperativeHandle(
        actionRef,
        () => ({
            init: async (
                selectRect: ElementRect,
                imageBuffer: ImageBuffer,
                canvas: HTMLCanvasElement,
            ) => {
                setStyle({
                    width: `${canvas.width / imageBuffer.monitorScaleFactor}px`,
                    height: `${canvas.height / imageBuffer.monitorScaleFactor}px`,
                    transform: `translate(${selectRect.min_x / imageBuffer.monitorScaleFactor}px, ${selectRect.min_y / imageBuffer.monitorScaleFactor}px)`,
                });
                canvasPropsRef.current = {
                    width: canvas.width,
                    height: canvas.height,
                    scaleFactor: imageBuffer.monitorScaleFactor,
                };
                setImageUrl(
                    await new Promise<string | undefined>((resolve) => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    resolve(undefined);
                                    return;
                                }
                                blobRef.current = blob;
                                resolve(URL.createObjectURL(blob));
                            },
                            'image/png',
                            1,
                        );
                    }),
                );
            },
            popupMenu: (position: LogicalPosition) => {
                menuRef.current?.popup(position);
            },
        }),
        [setStyle],
    );

    useEffect(() => {
        const url = imageUrl;

        return () => {
            if (!url) {
                return;
            }

            URL.revokeObjectURL(url);
        };
    }, [imageUrl]);

    const menuRef = useRef<Menu>(undefined);

    const initMenu = useCallback(async () => {
        const window = getCurrentWindow();
        const menu = await Menu.new({
            items: [
                {
                    id: `${window.label}-copyTool`,
                    text: intl.formatMessage({ id: 'draw.copyTool' }),
                    action: async () => {
                        if (!blobRef.current) {
                            return;
                        }

                        await navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': blobRef.current,
                            }),
                        ]);
                    },
                },
                {
                    id: `${window.label}-saveTool`,
                    text: intl.formatMessage({ id: 'draw.saveTool' }),
                    action: async () => {
                        if (!blobRef.current) {
                            return;
                        }

                        const filePath = await dialog.save({
                            filters: [
                                {
                                    name: 'PNG(*.png)',
                                    extensions: ['png'],
                                },
                            ],
                            defaultPath: generateImageFileName(),
                            canCreateDirectories: true,
                        });

                        if (!filePath) {
                            return;
                        }

                        await saveFile(filePath, await blobRef.current.arrayBuffer());
                    },
                },
                {
                    id: `${window.label}-ocrTool`,
                    text: intl.formatMessage({ id: 'draw.showOrHideOcrResult' }),
                    action: async () => {
                        ocrBlocksActionRef.current?.setEnable((enable) => !enable);
                    },
                },
                {
                    id: `${window.label}-closeTool`,
                    text: intl.formatMessage({ id: 'draw.close' }),
                    action: async () => {
                        await getCurrentWindow().close();
                    },
                },
            ],
        });
        menuRef.current = menu;
    }, [intl, ocrBlocksActionRef]);

    useEffect(() => {
        initMenu();

        return () => {
            menuRef.current?.close();
            menuRef.current = undefined;
        };
    }, [initMenu]);

    const [scale, setScale, scaleRef] = useStateRef(100);
    const [showScaleInfo, setShowScaleInfo] = useState(false);
    const scaleTimerRef = useRef<NodeJS.Timeout | null>(null);

    const showScaleInfoTemporary = useCallback(() => {
        setShowScaleInfo(true);

        if (scaleTimerRef.current) {
            clearTimeout(scaleTimerRef.current);
        }

        scaleTimerRef.current = setTimeout(() => {
            setShowScaleInfo(false);
            scaleTimerRef.current = null;
        }, 1000);
    }, []);

    const scaleWindow = useCallback(
        async (scaleDelta: number) => {
            if (!styleRef.current.width) {
                return;
            }

            const window = getCurrentWindow();

            let targetScale = scaleRef.current + scaleDelta;

            if (targetScale <= 20) {
                targetScale = 20;
            } else if (targetScale >= 500) {
                targetScale = 500;
            }

            if (targetScale === scaleRef.current) {
                return;
            }

            setScale(targetScale);
            showScaleInfoTemporary();

            window.setSize(
                new PhysicalSize(
                    Math.round((canvasPropsRef.current.width * scaleRef.current) / 100),
                    Math.round((canvasPropsRef.current.height * scaleRef.current) / 100),
                ),
            );
        },
        [scaleRef, setScale, styleRef, showScaleInfoTemporary],
    );
    const scaleWindowRender = useCallbackRender(scaleWindow);

    useEffect(() => {
        return () => {
            if (scaleTimerRef.current) {
                clearTimeout(scaleTimerRef.current);
            }
        };
    }, []);

    return (
        <div
            className="fixed-image-container"
            style={{
                position: 'absolute',
                ...style,
                zIndex: zIndexs.Draw_FixedImage,
                pointerEvents: imageUrl ? 'auto' : 'none',
            }}
        >
            {imageUrl && (
                <Image
                    src={imageUrl}
                    objectFit="contain"
                    fill
                    alt="fixed-image"
                    onLoad={async () => {
                        onLoad();
                    }}
                    style={{
                        transformOrigin: 'top left',
                        transform: `scale(${scale / 100})`,
                    }}
                />
            )}
            <div
                style={{
                    width: 'calc(100vw - 4px)',
                    height: 'calc(100vh - 4px)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    cursor: 'grab',
                    boxSizing: 'border-box',
                    boxShadow: `0 0 2px 2px ${token.colorBorder}`,
                    margin: 2,
                }}
                onContextMenu={async (e) => {
                    e.preventDefault();

                    menuRef.current?.popup(new LogicalPosition(e.clientX, e.clientY));
                }}
                onWheel={(event) => {
                    scaleWindowRender((event.deltaY > 0 ? 1 : -1) * 10);
                }}
                data-tauri-drag-region
            >
                <Button
                    className="fixed-image-close-button"
                    icon={<CloseOutlined />}
                    type="primary"
                    shape="circle"
                    variant="solid"
                    style={{
                        position: 'absolute',
                        top: token.margin,
                        right: token.margin,
                        opacity: 0,
                        transition: `all ${token.motionDurationFast} ${token.motionEaseInOut}`,
                        backgroundColor: token.colorBgMask,
                    }}
                    onClick={() => {
                        getCurrentWindow().close();
                    }}
                />

                <div
                    className="scale-info"
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        backgroundColor: token.colorBgMask,
                        color: token.colorWhite,
                        padding: `${token.paddingXXS}px ${token.paddingSM}px`,
                        borderTopRightRadius: token.borderRadius,
                        fontSize: token.fontSizeSM,
                        zIndex: 10,
                        opacity: showScaleInfo ? 1 : 0,
                        transition: `opacity ${token.motionDurationFast} ${token.motionEaseInOut}`,
                    }}
                >
                    {scale}%
                </div>
            </div>

            <style jsx>{`
                .fixed-image-container:hover :global(.ant-btn.fixed-image-close-button) {
                    opacity: 1 !important;
                }

                .fixed-image-container :global(.ant-btn.fixed-image-close-button):hover {
                    background-color: ${token.colorError} !important;
                }
            `}</style>
        </div>
    );
};
