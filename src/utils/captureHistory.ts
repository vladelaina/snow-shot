import { AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import { CaptureHistoryItem, CaptureHistoryStore } from './appStore';
import { ElementRect, ImageBuffer, ImageEncoder } from '@/commands';
import { BaseDirectory, copyFile, mkdir, remove, writeFile } from '@tauri-apps/plugin-fs';
import { appConfigDir } from '@tauri-apps/api/path';
import { join as joinPath } from '@tauri-apps/api/path';
import path from 'path';
import { NonDeletedExcalidrawElement, Ordered } from '@mg-chao/excalidraw/element/types';
import { AppState } from '@mg-chao/excalidraw/types';

const captureHistoryImagesDir = 'captureHistoryImages';

const getCaptureImageFilePath = (fileName: string) => {
    return `${captureHistoryImagesDir}/${fileName}`;
};

export const getCaptureHistoryImageAbsPath = async (fileName: string) => {
    return joinPath(await appConfigDir(), getCaptureImageFilePath(fileName));
};

const dayDuration = 24 * 60 * 60 * 1000;
export enum HistoryValidDuration {
    /** 用于测试，不对外暴露 */
    Test = 1,
    Day = dayDuration,
    Week = 7 * dayDuration,
    Month = 30 * dayDuration,
    Forever = 0,
}

export class CaptureHistory {
    private store: CaptureHistoryStore;

    constructor() {
        this.store = new CaptureHistoryStore();
    }

    async init() {
        await this.store.init();
    }

    static generateCaptureHistoryItem(
        imageBuffer: ImageBuffer | CaptureHistoryItem,
        excalidrawElements: readonly Ordered<NonDeletedExcalidrawElement>[] | undefined,
        excalidrawAppState: Readonly<AppState> | undefined,
        selectedRect: ElementRect,
    ): CaptureHistoryItem {
        let fileExtension = '.webp';
        if ('encoder' in imageBuffer) {
            switch (imageBuffer.encoder) {
                case ImageEncoder.WebP:
                    fileExtension = '.webp';
                    break;
                case ImageEncoder.Png:
                    fileExtension = '.png';
                    break;
            }
        } else {
            fileExtension = path.extname(imageBuffer.file_name);
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}${fileExtension}`;

        return {
            id: timestamp.toString(),
            selected_rect: selectedRect,
            file_name: fileName,
            create_ts: timestamp,
            excalidraw_elements: excalidrawElements,
            excalidraw_app_state: excalidrawAppState
                ? ({
                      zoom: excalidrawAppState.zoom,
                      scrollX: excalidrawAppState.scrollX,
                      scrollY: excalidrawAppState.scrollY,
                  } as CaptureHistoryItem['excalidraw_app_state'])
                : undefined,
        };
    }

    async save(
        imageData: ImageBuffer | CaptureHistoryItem,
        excalidrawElements: readonly Ordered<NonDeletedExcalidrawElement>[] | undefined,
        excalidrawAppState: Readonly<AppState> | undefined,
        selectedRect: ElementRect,
    ): Promise<CaptureHistoryItem> {
        const captureHistoryItem = CaptureHistory.generateCaptureHistoryItem(
            imageData,
            excalidrawElements,
            excalidrawAppState,
            selectedRect,
        );

        try {
            await mkdir(captureHistoryImagesDir, {
                baseDir: BaseDirectory.AppConfig,
            });
        } catch (error) {
            console.warn('[CaptureHistory] mkdir failed', error);
        }

        if ('encoder' in imageData) {
            await writeFile(
                getCaptureImageFilePath(captureHistoryItem.file_name),
                new Uint8Array(imageData.buffer),
                {
                    baseDir: BaseDirectory.AppConfig,
                },
            );
        } else {
            await copyFile(
                getCaptureImageFilePath(imageData.file_name),
                getCaptureImageFilePath(captureHistoryItem.file_name),
                {
                    fromPathBaseDir: BaseDirectory.AppConfig,
                    toPathBaseDir: BaseDirectory.AppConfig,
                },
            );
        }

        await this.store.set(captureHistoryItem.id, captureHistoryItem);

        return captureHistoryItem;
    }

    async getList(appSettings: AppSettingsData): Promise<CaptureHistoryItem[]> {
        const now = Date.now();
        const validTime =
            appSettings[AppSettingsGroup.SystemScreenshot].historyValidDuration ===
            HistoryValidDuration.Forever
                ? 0
                : now - appSettings[AppSettingsGroup.SystemScreenshot].historyValidDuration;

        const historyList = await this.store.entries().then((entries) => {
            return entries.filter(([, item]) => {
                return item.create_ts > validTime;
            });
        });
        return historyList
            .map(([, item]) => {
                return item;
            })
            .sort((a, b) => {
                // 按创建时间正序
                return a.create_ts - b.create_ts;
            });
    }

    async clearExpired(appSettings: AppSettingsData) {
        if (
            appSettings[AppSettingsGroup.SystemScreenshot].historyValidDuration ===
            HistoryValidDuration.Forever
        ) {
            return;
        }

        const historyList = await this.store.entries();

        const now = Date.now();
        const validTime = now - appSettings[AppSettingsGroup.SystemScreenshot].historyValidDuration;

        await Promise.all(
            historyList.map(async ([id, item]) => {
                if (item.create_ts > validTime) {
                    return;
                }

                try {
                    await this.store.delete(id);
                } catch (error) {
                    console.warn('[CaptureHistory] delete captureHistoryItem failed', error);
                }
                try {
                    await remove(getCaptureImageFilePath(item.file_name), {
                        baseDir: BaseDirectory.AppConfig,
                    });
                } catch (error) {
                    console.warn('[CaptureHistory] remove captureHistoryItem image failed', error);
                }
            }),
        );
    }

    async clearAll() {
        await this.store.clear();
        try {
            await remove(captureHistoryImagesDir, {
                baseDir: BaseDirectory.AppConfig,
                recursive: true,
            });
        } catch (error) {
            console.warn('[CaptureHistory] remove captureHistoryImagesDir failed', error);
        }
    }
}
