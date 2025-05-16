import { DrawLayerActionType } from './components/drawLayer';
import { SelectLayerActionType } from './components/selectLayer';
import { DrawCacheLayerActionType } from './components/drawCacheLayer/extra';
import { createDrawWindow, ElementRect, ImageBuffer, saveFile } from '@/commands';
import dayjs from 'dayjs';
import * as dialog from '@tauri-apps/plugin-dialog';
import { Window as AppWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { CaptureStep } from './types';
import { FixedImageActionType } from './components/fixedImage';
import { OcrBlocksActionType } from './components/ocrBlocks';
import { hideWindow, showWindow } from '@/utils/window';
export const generateImageFileName = () => {
    return `SnowShot_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`;
};

export const getCanvas = async (
    selectRect: ElementRect,
    drawLayerAction: DrawLayerActionType,
    drawCacheLayerAction: DrawCacheLayerActionType,
): Promise<HTMLCanvasElement | undefined> => {
    // 获取图像数据
    const drawLayerImageData = await drawLayerAction.getImageData(selectRect);
    const drawCacheLayerCanvas = drawCacheLayerAction.getCanvas();

    if (!drawLayerImageData || !drawCacheLayerCanvas) {
        return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = selectRect.max_x - selectRect.min_x;
    tempCanvas.height = selectRect.max_y - selectRect.min_y;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
        return;
    }

    tempCtx.putImageData(drawLayerImageData, 0, 0);
    tempCtx.drawImage(drawCacheLayerCanvas, -selectRect.min_x, -selectRect.min_y);

    return tempCanvas;
};

/**
 * 保存截图到指定文件
 */
export const saveToFile = async (
    selectLayerAction: SelectLayerActionType,
    drawLayerAction: DrawLayerActionType,
    drawCacheLayerAction: DrawCacheLayerActionType,
    beforeSaveFile?: (filePath: string) => Promise<void>,
) => {
    const selectRect = selectLayerAction.getSelectRect();
    if (!selectRect) {
        return;
    }

    const canvasPromise = getCanvas(selectRect, drawLayerAction, drawCacheLayerAction);

    const filePath = await dialog.save({
        filters: [
            {
                name: 'PNG(*.png)',
                extensions: ['png'],
            },
            {
                name: 'JPEG(*.jpg)',
                extensions: ['jpg'],
            },
            {
                name: 'WebP(*.webp)',
                extensions: ['webp'],
            },
        ],
        defaultPath: generateImageFileName(),
        canCreateDirectories: true,
    });

    if (!filePath) {
        return;
    }

    const imageDataPromise = canvasPromise
        .then((canvas) => {
            if (!canvas) {
                return;
            }

            let imageType = 'image/png';
            if (filePath.endsWith('.jpg')) {
                imageType = 'image/jpeg';
            } else if (filePath.endsWith('.webp')) {
                imageType = 'image/webp';
            }

            return new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, imageType, 1);
            });
        })
        .then((blob) => {
            if (!blob) {
                return;
            }

            return blob.arrayBuffer();
        });

    if (beforeSaveFile) {
        await beforeSaveFile(filePath);
    }

    const imageData = await imageDataPromise;

    if (!imageData) {
        return;
    }

    await saveFile(filePath, imageData);
};

export const fixedToScreen = async (
    imageBuffer: ImageBuffer,
    appWindow: AppWindow,
    layerContainerElement: HTMLDivElement,
    selectLayerAction: SelectLayerActionType,
    drawLayerAction: DrawLayerActionType,
    drawCacheLayerAction: DrawCacheLayerActionType,
    fixedImageAction: FixedImageActionType,
    ocrBlocksAction: OcrBlocksActionType,
    setCaptureStep: (step: CaptureStep) => void,
) => {
    const selectRect = selectLayerAction.getSelectRect();
    if (!selectRect) {
        return;
    }

    setCaptureStep(CaptureStep.Fixed);
    createDrawWindow();

    await hideWindow();
    layerContainerElement.style.transform = `translate(-${selectRect.min_x / imageBuffer.monitorScaleFactor}px, -${selectRect.min_y / imageBuffer.monitorScaleFactor}px)`;
    await Promise.all([
        appWindow.setPosition(new PhysicalPosition(selectRect.min_x, selectRect.min_y)),
        appWindow.setSize(
            new PhysicalSize(
                selectRect.max_x - selectRect.min_x,
                selectRect.max_y - selectRect.min_y,
            ),
        ),
        appWindow.setAlwaysOnTop(true),
    ]);
    await new Promise((resolve) => {
        setTimeout(resolve, 42);
    });
    await showWindow();

    layerContainerElement.style.opacity = '1';
    // 创建一个固定的图片
    const imageCanvas = await getCanvas(selectRect, drawLayerAction, drawCacheLayerAction);
    if (!imageCanvas) {
        return;
    }

    await Promise.all([
        fixedImageAction.init(selectRect, imageBuffer, imageCanvas),
        ocrBlocksAction.init(selectRect, imageBuffer, imageCanvas),
    ]);
};

export const copyToClipboard = async (
    selectLayerAction: SelectLayerActionType,
    drawLayerAction: DrawLayerActionType,
    drawCacheLayerAction: DrawCacheLayerActionType,
    beforeCopy?: (imageData: Blob) => Promise<void>,
) => {
    const selectRect = selectLayerAction.getSelectRect();
    if (!selectRect) {
        return;
    }

    const imageCanvas = await getCanvas(selectRect, drawLayerAction, drawCacheLayerAction);
    if (!imageCanvas) {
        return;
    }

    const imageData = await new Promise<Blob | null>((resolve) => {
        imageCanvas.toBlob(
            (blob) => {
                resolve(blob);
            },
            'image/png',
            1,
        );
    });

    if (!imageData) {
        return;
    }

    if (beforeCopy) {
        await beforeCopy(imageData);
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageData })]);
};

export const handleOcrDetect = async (
    imageBuffer: ImageBuffer,
    selectLayerAction: SelectLayerActionType,
    drawLayerAction: DrawLayerActionType,
    drawCacheLayerAction: DrawCacheLayerActionType,
    ocrBlocksAction: OcrBlocksActionType,
) => {
    const selectRect = selectLayerAction.getSelectRect();
    if (!selectRect) {
        return;
    }

    const imageCanvas = await getCanvas(selectRect, drawLayerAction, drawCacheLayerAction);
    if (!imageCanvas) {
        return;
    }

    await ocrBlocksAction.init(selectRect, imageBuffer, imageCanvas);
};
