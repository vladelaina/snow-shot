import { decode, initSync } from 'turbo-webp';

self.onmessage = async (
    event: MessageEvent<{
        wasmModuleArrayBuffer: ArrayBuffer;
        imageBuffer: ArrayBuffer;
        width: number;
        height: number;
    }>,
) => {
    const { imageBuffer, width, height, wasmModuleArrayBuffer } = event.data;

    initSync({
        module: wasmModuleArrayBuffer,
    });

    const imageData = decode(new Uint8Array(imageBuffer));

    self.postMessage(new ImageData(new Uint8ClampedArray(imageData), width, height));
};
