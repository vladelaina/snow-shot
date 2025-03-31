import { CanvasHistory } from './canvasHistory';

export abstract class CanvasDraw {
    protected history: CanvasHistory;
    protected _drawing: boolean;
    protected scaleFactor: number;
    protected onDrawingChange: (drawing: boolean) => void;

    public get drawing(): boolean {
        return this._drawing;
    }

    constructor(
        history: CanvasHistory,
        scaleFactor: number,
        onDrawingChange: (drawing: boolean) => void,
    ) {
        this.history = history;
        this._drawing = false;
        this.scaleFactor = scaleFactor;
        this.onDrawingChange = onDrawingChange;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected start(...args: unknown[]): void {
        this._drawing = true;
        this.onDrawingChange(true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected execute(...args: unknown[]): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected finish(...args: unknown[]): void {
        this._drawing = false;
        this.onDrawingChange(false);
    }
}
