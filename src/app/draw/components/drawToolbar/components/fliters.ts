import { filters, type T2DPipelineState } from 'fabric';

type MosaicOwnProps = {
    blockSize: number;
};

/**
 * Fragment source for the Mosaic program (WebGL 1.0 Compatible)
 */
const mosaicFragmentSource = `
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
export class MosaicFilter extends filters.BaseFilter<'Mosaic', MosaicOwnProps> {
    static type = 'Mosaic';

    static defaults = {
        blockSize: 10,
    };

    declare blockSize: number;

    static uniformLocations = ['uBlockSize', 'uTextureSize'];

    protected getFragmentSource(): string {
        return mosaicFragmentSource;
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

type HighlightOwnProps = {
    highlightColor: [number, number, number]; // RGB 颜色
    threshold: number; // 颜色匹配的阈值（0 - 255）
};

/**
 * Fragment shader source for the Highlight program (WebGL 1.0 Compatible)
 */
const highlightFragmentSource = `
 precision highp float;
 uniform sampler2D uTexture;
 uniform vec3 uHighlightColor;
 uniform float uOpacity;
 varying vec2 vTexCoord;

 void main() {
   vec4 originalColor = texture2D(uTexture, vTexCoord);
   vec4 highlightOverlay = vec4(uHighlightColor / 255.0, uOpacity);
   
   // 进行颜色混合 (Multiply Blending)
   vec3 blendedColor = mix(originalColor.rgb, highlightOverlay.rgb, highlightOverlay.a);
   
   gl_FragColor = vec4(blendedColor, originalColor.a);
 }`;

/**
 * Highlight filter class (Mimics a highlighter effect)
 */
export class HighlightFilter extends filters.BaseFilter<'Highlight', HighlightOwnProps> {
    static type = 'Highlight';

    static defaults = {
        highlightColor: [255, 255, 0], // 默认是亮黄色（类似荧光笔颜色）
        opacity: 0.5, // 半透明
    };

    declare highlightColor: [number, number, number];
    declare opacity: number;

    static uniformLocations = ['uHighlightColor', 'uOpacity'];

    protected getFragmentSource(): string {
        return highlightFragmentSource;
    }

    /**
     * Apply the highlight effect (Canvas 2D)
     */
    applyTo2d({ imageData: { data } }: T2DPipelineState) {
        const [rHighlight, gHighlight, bHighlight] = this.highlightColor;
        const opacity = this.opacity;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 进行颜色叠加：新颜色 = 原色 * (1 - 透明度) + 高亮色 * 透明度
            data[i] = r * (1 - opacity) + rHighlight * opacity;
            data[i + 1] = g * (1 - opacity) + gHighlight * opacity;
            data[i + 2] = b * (1 - opacity) + bHighlight * opacity;
        }
    }

    /**
     * Send uniform data for WebGL
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendUniformData(gl: any, uniformLocations: any) {
        gl.uniform3fv(uniformLocations.uHighlightColor, this.highlightColor);
        gl.uniform1f(uniformLocations.uOpacity, this.opacity);
    }
}
