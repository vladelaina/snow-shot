import { MousePosition } from '@/utils/mousePosition';
import * as PIXI from 'pixi.js';
import { CanvasHistory } from './canvasHistory';
import { CanvasDraw } from './canvasDraw';
import { DrawLayerActionType } from '@/app/draw/components/drawLayer';

export enum CanvasDrawShapeType {
    Rect,
    Ellipse,
}

export class CanvasDrawShape extends CanvasDraw {
    private startPosition: MousePosition | undefined;
    private graphics: PIXI.Graphics | undefined;
    private action: DrawLayerActionType;

    private strokeWidth: number;
    private radius: number;
    private color: string;
    private fill: boolean;

    private shapeType: CanvasDrawShapeType;

    constructor(
        history: CanvasHistory,
        scaleFactor: number,
        onDrawingChange: (drawing: boolean) => void,
        action: DrawLayerActionType,
        shapeType: CanvasDrawShapeType,
    ) {
        super(history, scaleFactor, onDrawingChange);
        this.action = action;

        this.strokeWidth = 1;
        this.radius = 0;
        this.color = 'red';
        this.fill = false;

        this.shapeType = shapeType;
    }

    public setStyle(strokeWidth: number, radius: number, color: string, fill: boolean): void {
        this.strokeWidth = strokeWidth * this.scaleFactor;
        this.radius = radius * this.scaleFactor;
        this.color = color;
        this.fill = fill;
    }

    public start(startPosition: MousePosition): void {
        super.start();

        this.startPosition = new MousePosition(
            startPosition.mouseX * this.scaleFactor,
            startPosition.mouseY * this.scaleFactor,
        );
        this.graphics = new PIXI.Graphics();
        this.graphics.setStrokeStyle({
            color: this.color,
            width: this.strokeWidth,
            join: 'round',
        });

        this.action.addChildToTopContainer(this.graphics);
    }

    public execute(_stopPosition: MousePosition, lockWidthHeight: boolean): void {
        super.execute();

        const stopPosition = new MousePosition(
            _stopPosition.mouseX * this.scaleFactor,
            _stopPosition.mouseY * this.scaleFactor,
        );

        if (!this.graphics || !this.startPosition) {
            return;
        }

        let width = stopPosition.mouseX - this.startPosition.mouseX;
        let height = stopPosition.mouseY - this.startPosition.mouseY;

        if (lockWidthHeight) {
            const size = Math.max(Math.abs(width), Math.abs(height));
            width = width >= 0 ? size : -size;
            height = height >= 0 ? size : -size;
        }

        const x = Math.min(this.startPosition.mouseX, this.startPosition.mouseX + width);
        const y = Math.min(this.startPosition.mouseY, this.startPosition.mouseY + height);
        const finalWidth = Math.max(Math.abs(width), 1);
        const finalHeight = Math.max(Math.abs(height), 1);

        this.graphics.clear();

        if (this.shapeType === CanvasDrawShapeType.Rect) {
            this.graphics.roundRect(x, y, finalWidth, finalHeight, this.radius);
        } else if (this.shapeType === CanvasDrawShapeType.Ellipse) {
            const halfWidth = Math.max(finalWidth * 0.5, 1);
            const halfHeight = Math.max(finalHeight * 0.5, 1);
            this.graphics.ellipse(x + halfWidth, y + halfHeight, halfWidth, halfHeight);
        }

        this.graphics.stroke();

        if (this.fill) {
            this.graphics.fill({
                color: this.color,
            });
        }
    }

    public finish(): void {
        super.finish();

        if (!this.graphics) {
            return;
        }

        this.history.pushAddAction(this.graphics.parent, this.graphics);
    }
}
