import { decode, initSync } from 'turbo-webp';

self.onmessage = async (
    event: MessageEvent<{
        wasmModuleArrayBuffer: ArrayBuffer;
        imageBuffer: ArrayBuffer;
    }>,
) => {
    const { imageBuffer, wasmModuleArrayBuffer } = event.data;

    initSync({
        module: wasmModuleArrayBuffer,
    });

    // 后 8 位包含图像的宽高
    const imageData = decode(new Uint8Array(imageBuffer));

    const dataView = new DataView(imageData.buffer, imageData.byteLength - 8);
    const imageWidth = dataView.getUint32(0, true);
    const imageHeight = dataView.getUint32(4, true);

    self.postMessage({
        data: new ImageData(
            imageData.subarray(0, imageWidth * imageHeight * 4),
            imageWidth,
            imageHeight,
        ),
        width: imageWidth,
        height: imageHeight,
    });
};
