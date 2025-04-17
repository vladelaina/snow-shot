import { MousePosition } from '@/utils/mousePosition';
import * as PIXI from 'pixi.js';
import { CanvasHistory } from './canvasHistory';
import { CanvasDraw } from './canvasDraw';
import { DrawLayerActionType } from '@/app/draw/components/drawLayer';
import simplify from 'simplify-js';
import { Point } from '../chaikin';
import chaikin from '../chaikin';
import { AppSettingsData, AppSettingsGroup } from '@/app/contextWrap';
import { BLEND_MODES } from 'pixi.js';

export class CanvasDrawPen extends CanvasDraw {
    private graphicsContainer: PIXI.Container | undefined;
    private graphics: PIXI.Graphics | undefined;
    private action: DrawLayerActionType;
    private paths: {
        enableStraightLine: boolean;
        points: Point[];
    }[] = [];
    private renderSettings: AppSettingsData[AppSettingsGroup.Render];
    private straightLineStartPosition: MousePosition | undefined;

    private width: number;
    private color: string;
    private blendMode: BLEND_MODES;

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
        this.blendMode = 'normal';
    }

    public setStyle(width: number, color: string, blendMode: string = 'normal'): void {
        this.width = width * this.scaleFactor;
        this.color = color;
        this.blendMode = blendMode as BLEND_MODES;
    }

    private isHighlight(): boolean {
        return this.blendMode === 'multiply';
    }

    private startNewLine(startPosition: MousePosition, enableStraightLine: boolean): void {
        this.graphics?.lineTo(startPosition.mouseX, startPosition.mouseY);
        this.graphics?.stroke();

        this.graphics = new PIXI.Graphics({
            blendMode: this.isHighlight() ? 'normal' : this.blendMode,
        });
        this.graphics.setStrokeStyle({
            width: this.width,
            color: this.color,
            cap: 'round',
            join: 'bevel',
        });

        this.graphicsContainer!.addChild(this.graphics);
        this.graphics.moveTo(startPosition.mouseX, startPosition.mouseY);
        this.paths.push({
            enableStraightLine,
            points: [],
        });
    }

    public start(startPosition: MousePosition, enableStraightLine: boolean): void {
        super.start();

        const point = {
            x: startPosition.mouseX * this.scaleFactor,
            y: startPosition.mouseY * this.scaleFactor,
        };
        this.paths = [];
        this.graphicsContainer = new PIXI.Container({
            filters: [new PIXI.AlphaFilter({ alpha: 0.5 })],
        });
        this.action.addChildToTopContainer(this.graphicsContainer);
        const currentPosition = new MousePosition(point.x, point.y);
        this.startNewLine(currentPosition, enableStraightLine);
        if (enableStraightLine) {
            this.straightLineStartPosition = currentPosition;
        }
        this.pushPoint(point);
    }

    private pushPoint(point: Point): void {
        this.paths[this.paths.length - 1].points.push(point);
    }

    private popPoint(): void {
        if (this.paths[this.paths.length - 1].points.length > 1) {
            this.paths[this.paths.length - 1].points.pop();
        }
    }

    public execute(stopPosition: MousePosition, enableStraightLine: boolean): void {
        super.execute();

        if (!this.graphics) {
            return;
        }

        const currentPosition = new MousePosition(
            stopPosition.mouseX * this.scaleFactor,
            stopPosition.mouseY * this.scaleFactor,
        );

        if (enableStraightLine) {
            if (!this.straightLineStartPosition) {
                this.straightLineStartPosition = currentPosition;
                this.startNewLine(currentPosition, true);
            } else {
                this.popPoint();
                this.graphics.clear();
                this.graphics.moveTo(
                    this.straightLineStartPosition.mouseX,
                    this.straightLineStartPosition.mouseY,
                );
            }
        } else {
            if (this.straightLineStartPosition) {
                this.popPoint();
                this.graphics.clear();
                this.graphics.moveTo(
                    this.straightLineStartPosition.mouseX,
                    this.straightLineStartPosition.mouseY,
                );
                this.straightLineStartPosition = undefined;
            }

            // 大量的点绘制会卡顿，分段绘制
            if (this.paths[this.paths.length - 1].points.length > 512) {
                this.startNewLine(currentPosition, false);
            }
        }

        this.graphics.lineTo(currentPosition.mouseX, currentPosition.mouseY);
        this.graphics.stroke();
        this.pushPoint({
            x: currentPosition.mouseX,
            y: currentPosition.mouseY,
        });
    }

    public finish(): void {
        super.finish();

        const container = this.graphicsContainer;
        if (!container) {
            return;
        }

        const graphics = new PIXI.Graphics({
            blendMode: this.blendMode,
        });

        graphics.setStrokeStyle({
            width: this.width,
            color: this.color,
            cap: 'round',
            join: 'round',
        });

        graphics.moveTo(this.paths[0].points[0].x, this.paths[0].points[0].y);
        for (const path of this.paths) {
            const pathPoints = path.points;
            if (!path.enableStraightLine) {
                // 简化和平滑点集
                let smoothPoints = this.renderSettings.enableDrawLineSimplify
                    ? simplify(
                          pathPoints,
                          this.renderSettings.drawLineSimplifyTolerance * this.scaleFactor,
                          this.renderSettings.drawLineSimplifyHighQuality,
                      )
                    : pathPoints;
                smoothPoints = this.renderSettings.enableDrawLineSmooth
                    ? chaikin(
                          smoothPoints,
                          this.renderSettings.drawLineSmoothRatio,
                          this.renderSettings.drawLineSmoothIterations,
                          false,
                      )
                    : smoothPoints;

                path.points = smoothPoints;
            }

            for (const point of path.points) {
                graphics.lineTo(point.x, point.y);
            }
        }
        graphics.stroke();

        requestAnimationFrame(() => {
            container.removeChildren();
            container.addChild(graphics);

            this.history.pushAddAction(graphics.parent, graphics);
        });

        this.graphics = undefined;
        this.graphicsContainer = undefined;
        this.straightLineStartPosition = undefined;
    }
}
