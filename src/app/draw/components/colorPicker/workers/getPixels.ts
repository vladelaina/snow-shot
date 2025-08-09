let wasmModuleArrayBuffer: ArrayBuffer;

export async function getPixels(
    imageBuffer: ArrayBuffer,
    width: number,
    height: number,
): Promise<ImageData> {
    return new Promise(async (resolve, reject) => {
        const worker = new Worker(new URL('./getPixelsWorker.ts', import.meta.url));

        worker.onmessage = async (event) => {
            resolve(event.data);
            worker.terminate();
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };

        if (!wasmModuleArrayBuffer) {
            const wasmModuleResponse = await fetch(
                new URL('turbo-webp/turbo_webp_bg.wasm', import.meta.url),
            );
            wasmModuleArrayBuffer = await wasmModuleResponse.arrayBuffer();
        }
        worker.postMessage({ imageBuffer, width, height, wasmModuleArrayBuffer });
    });
}
