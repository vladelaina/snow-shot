import { MousePosition } from '@/utils/mousePosition';
import * as PIXI from 'pixi.js';
import { CanvasHistory } from './canvasHistory';
import { CanvasDraw } from './canvasDraw';
import { DrawLayerActionType } from '@/app/draw/components/drawLayer';
import { vec2, Vec2 } from 'gl-matrix';

export type ArrowStyleConfig = {
    id: string;
    icon: React.ReactNode;
    calculatePath: (start: Vec2, stop: Vec2, width: number, minAngle?: number) => Vec2[];
};

export class CanvasDrawArrow extends CanvasDraw {
    private startPosition: MousePosition | undefined;
    private graphics: PIXI.Graphics | undefined;
    private action: DrawLayerActionType;

    private width: number;
    private color: string;
    private config: ArrowStyleConfig;
    private fill: boolean;

    constructor(
        history: CanvasHistory,
        scaleFactor: number,
        onDrawingChange: (drawing: boolean) => void,
        action: DrawLayerActionType,
    ) {
        super(history, scaleFactor, onDrawingChange);
        this.action = action;

        this.width = 1;
        this.color = 'red';
        this.fill = false;
        this.config = {
            id: 'arrow-style-1',
            icon: null,
            calculatePath: () => {
                return [];
            },
        };
    }

    public setStyle(width: number, color: string, config: ArrowStyleConfig, fill: boolean): void {
        this.width = width * this.scaleFactor;
        this.color = color;
        this.config = config;
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
            join: 'round',
            cap: 'round',
            width: Math.floor(this.width / 3),
            color: this.color,
        });

        this.action.addChildToTopContainer(this.graphics);
    }

    public execute(_stopPosition: MousePosition): void {
        super.execute();

        const stopPosition = new MousePosition(
            _stopPosition.mouseX * this.scaleFactor,
            _stopPosition.mouseY * this.scaleFactor,
        );

        if (!this.graphics || !this.startPosition) {
            return;
        }

        this.graphics.clear();

        const paths = this.config.calculatePath(
            vec2.fromValues(this.startPosition.mouseX, this.startPosition.mouseY),
            vec2.fromValues(stopPosition.mouseX, stopPosition.mouseY),
            this.width,
            30
        );
        const firstPoint = paths[0];
        this.graphics.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < paths.length; i++) {
            const point = paths[i];
            this.graphics.lineTo(point.x, point.y);
        }

        this.graphics.stroke();

        if (this.fill) {
            this.graphics.fill();
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
