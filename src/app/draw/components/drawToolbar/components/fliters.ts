import { filters, type T2DPipelineState } from 'fabric';

type MosaicOwnProps = {
    blockSize: number;
};

/**
 * Fragment source for the Mosaic program (WebGL 1.0 Compatible)
 */
const fragmentSource = `
 precision highp float;
 uniform sampler2D uTexture;
 uniform float uBlockSize;
 uniform vec2 uTextureSize;
 varying vec2 vTexCoord;
 void main() {
   vec2 pixelCoord = vTexCoord * uTextureSize; // Convert UV to pixel coordinates
   vec2 blockSize = vec2(uBlockSize); // Define block size in pixels
   vec2 blockPos = floor(pixelCoord / blockSize) * blockSize; // Calculate top-left pixel of block
   vec2 normalizedBlockPos = blockPos / uTextureSize; // Convert back to UV
   gl_FragColor = texture2D(uTexture, normalizedBlockPos);
 }`;

/**
 * Mosaic filter class
 */
export class Mosaic extends filters.BaseFilter<'Mosaic', MosaicOwnProps> {
    static type = 'Mosaic';

    static defaults = {
        blockSize: 10,
    };

    declare blockSize: number;

    static uniformLocations = ['uBlockSize', 'uTextureSize'];

    protected getFragmentSource(): string {
        return fragmentSource;
    }

    /**
     * Apply the Mosaic effect to pixels (Canvas 2D)
     */
    applyTo2d({ imageData: { data, width, height } }: T2DPipelineState) {
        const blockSize = Math.floor(this.blockSize);
        const w4 = width * 4;

        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const blockWidth = Math.min(blockSize, width - x);
                const blockHeight = Math.min(blockSize, height - y);

                for (let by = 0; by < blockHeight; by++) {
                    let index = (y + by) * w4 + x * 4;
                    for (let bx = 0; bx < blockWidth; bx++) {
                        data[index++] = r;
                        data[index++] = g;
                        data[index++] = b;
                        index++;
                    }
                }
            }
        }
    }

    /**
     * Send uniform data for WebGL
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendUniformData(gl: any, uniformLocations: any) {
        gl.uniform1f(uniformLocations.uBlockSize, this.blockSize);
        gl.uniform2f(uniformLocations.uTextureSize, gl.canvas.width, gl.canvas.height);
    }

    isNeutralState(): boolean {
        return this.blockSize <= 1;
    }
}
