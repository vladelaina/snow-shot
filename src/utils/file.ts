import dayjs from 'dayjs';
import * as dialog from '@tauri-apps/plugin-dialog';

export const generateImageFileName = () => {
    return `SnowShot_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`;
};

export enum ImageFormat {
    PNG = 'image/png',
    JPEG = 'image/jpeg',
    WEBP = 'image/webp',
}

export type ImagePath = {
    filePath: string;
    imageFormat: ImageFormat;
};

export const showImageDialog = async (): Promise<ImagePath | undefined> => {
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

    let imageFormat = ImageFormat.PNG;
    if (filePath.endsWith('.jpg')) {
        imageFormat = ImageFormat.JPEG;
    } else if (filePath.endsWith('.webp')) {
        imageFormat = ImageFormat.WEBP;
    }

    return {
        filePath,
        imageFormat,
    };
};
