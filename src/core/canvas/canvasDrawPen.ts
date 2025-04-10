import { MousePosition } from '@/utils/mousePosition';
import * as PIXI from 'pixi.js';
import { CanvasHistory } from './canvasHistory';
import { CanvasDraw } from './canvasDraw';
import { DrawLayerActionType } from '@/app/draw/components/drawLayer';
import simplify from 'simplify-js';
import { Point } from '../chaikin';
import chaikin from '../chaikin';
import { AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';

export class CanvasDrawPen extends CanvasDraw {
    private graphics: PIXI.Graphics | undefined;
    private action: DrawLayerActionType;
    private lastPosition: MousePosition | undefined;
    private points: Point[] = [];
    private renderSettings: AppSettingsData[AppSettingsGroup.Render];

    private width: number;
    private color: string;

    constructor(
        history: CanvasHistory,
        scaleFactor: number,
        onDrawingChange: (drawing: boolean) => void,
        action: DrawLayerActionType,
        renderSettings: AppSettingsData[AppSettingsGroup.Render],
    ) {
        super(history, scaleFactor, onDrawingChange);
        this.action = action;

        this.width = 1;
        this.color = 'red';
        this.renderSettings = renderSettings;
    }

    public setStyle(width: number, color: string): void {
        this.width = width * this.scaleFactor;
        this.color = color;
    }

    public start(startPosition: MousePosition): void {
        super.start();

        this.lastPosition = new MousePosition(
            startPosition.mouseX * this.scaleFactor,
            startPosition.mouseY * this.scaleFactor,
        );
        this.points = [{ x: this.lastPosition.mouseX, y: this.lastPosition.mouseY }];
        this.graphics = new PIXI.Graphics();
        this.graphics.setStrokeStyle({
            width: this.width,
            color: this.color,
            join: 'round',
            cap: 'round',
        });

        this.action.addChildToTopContainer(this.graphics);
        this.graphics.moveTo(this.lastPosition.mouseX, this.lastPosition.mouseY);
    }

    public execute(stopPosition: MousePosition): void {
        super.execute();

        if (!this.graphics || !this.lastPosition) {
            return;
        }

        const currentPosition = new MousePosition(
            stopPosition.mouseX * this.scaleFactor,
            stopPosition.mouseY * this.scaleFactor,
        );
        this.points.push({
            x: currentPosition.mouseX,
            y: currentPosition.mouseY,
        });

        this.graphics.lineTo(currentPosition.mouseX, currentPosition.mouseY);
        this.graphics.stroke();

        this.lastPosition = currentPosition;
    }

    public finish(): void {
        super.finish();

        const graphics = this.graphics;
        if (!graphics) {
            return;
        }

        if (
            this.renderSettings.enableDrawLineSimplify ||
            this.renderSettings.enableDrawLineSmooth
        ) {
            requestAnimationFrame(() => {
                if (!graphics) {
                    return;
                }

                // 简化和平滑点集
                let smoothPoints = this.renderSettings.enableDrawLineSimplify
                    ? simplify(
                          this.points,
                          this.renderSettings.drawLineSimplifyTolerance * this.scaleFactor,
                          this.renderSettings.drawLineSimplifyHighQuality,
                      )
                    : this.points;
                smoothPoints = this.renderSettings.enableDrawLineSmooth
                    ? chaikin(
                          smoothPoints,
                          this.renderSettings.drawLineSmoothRatio,
                          this.renderSettings.drawLineSmoothIterations,
                          false,
                      )
                    : smoothPoints;

                graphics.setStrokeStyle({
                    width: this.width,
                    color: this.color,
                    join: 'round',
                    cap: 'round',
                });

                graphics.clear();
                if (smoothPoints.length > 0) {
                    graphics.moveTo(smoothPoints[0].x, smoothPoints[0].y);
                    for (let i = 1; i < smoothPoints.length; i++) {
                        graphics.lineTo(smoothPoints[i].x, smoothPoints[i].y);
                    }

                    graphics.stroke();
                }
            });
        }

        this.history.pushAddAction(graphics.parent, graphics);
    }
}
