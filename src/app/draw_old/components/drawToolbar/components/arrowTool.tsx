import { useContext, useEffect, useRef } from 'react';
import {
    defaultLineWidthPickerValue,
    LineWidthPicker,
    LineWidthPickerValue,
} from './pickers/lineWidthPicker';
import {
    defaultLineColorPickerValue,
    LineColorPicker,
    LineColorPickerValue,
} from './pickers/lineColorPicker';
import * as fabric from 'fabric';
import { DrawContext } from '@/app/draw_old/context';
import { useStateRef } from '@/hooks/useStateRef';
import {
    ArrowConfigPicker,
    defaultArrowConfigValue,
    getArrowStyleConfig,
} from './pickers/arrowConfigPicker';
import { defaultFillShapePickerValue, FillShapePicker } from './pickers/fillShapePicker';
import { defaultEnableRadiusValue, EnableRadiusPicker } from './pickers/enableRadiusPicker';

export type ArrowStyleConfig = {
    headLength: number;
    bottomWidth: number;
    innerBottomWidth: number;
    bodyWidth: number;
};

export const ArrowTool: React.FC = () => {
    const { fabricRef } = useContext(DrawContext);
    const [, setWidth, widthRef] = useStateRef<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const [, setColor, colorRef] = useStateRef<LineColorPickerValue>(defaultLineColorPickerValue);
    const [, setArrowConfigId, arrowConfigIdRef] = useStateRef(defaultArrowConfigValue);
    const [, setFillShape, fillShapeRef] = useStateRef(defaultFillShapePickerValue);
    const [, setEnableRadius, enableRadiusRef] = useStateRef(defaultEnableRadiusValue);

    // 引入 raf 节流和缓存对象
    const rafRef = useRef<number | undefined>(undefined);
    const coordsRef = useRef({ startX: 0, startY: 0, endX: 0, endY: 0 });
    const mouseDownRef = useRef(false);
    const plineRef = useRef<fabric.Polyline | undefined>(undefined);

    // 预先计算箭头参数函数
    const calculateArrowParams = (width: number, configId: string) => {
        const config = getArrowStyleConfig(configId);
        const scale = width / config.headBottomWidth;
        return {
            headHeight: Math.ceil(config.headHeight * scale * 2),
            headBottomWidth: Math.ceil(config.headBottomWidth * scale),
            headBottomInnerWidth: Math.ceil(config.headBottomInnerWidth * scale),
            bodyBottomWidth: Math.ceil(config.bodyBottomWidth * scale),
            strokeWidth: Math.ceil((config.headBottomWidth * scale) / 5),
        };
    };

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // 绘制箭头的函数，优化计算逻辑
        const drawArrow = () => {
            const coords = coordsRef.current;
            const { startX, startY, endX, endY } = coords;

            // 如果起点和终点相同，不绘制
            if (startX === endX && startY === endY) {
                return;
            }

            const angle = Math.atan2(endY - startY, endX - startX);

            // 预计算三角函数值以减少重复计算
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            const cosAnglePlus90 = Math.cos(angle + Math.PI / 2);
            const sinAnglePlus90 = Math.sin(angle + Math.PI / 2);
            const cosAngleMinus90 = Math.cos(angle - Math.PI / 2);
            const sinAngleMinus90 = Math.sin(angle - Math.PI / 2);

            // 获取箭头参数
            const params = calculateArrowParams(
                widthRef.current.width,
                arrowConfigIdRef.current.configId,
            );

            // 调整线条终点，考虑箭头头部
            const adjustedEndX = endX - params.headHeight * cosAngle;
            const adjustedEndY = endY - params.headHeight * sinAngle;

            const adjustedStartX = startX;
            const adjustedStartY = startY;

            // 预计算点位置
            const points = [
                { x: adjustedStartX, y: adjustedStartY }, // 起点
                {
                    x: adjustedStartX - params.bodyBottomWidth * cosAngleMinus90,
                    y: adjustedStartY - params.bodyBottomWidth * sinAngleMinus90,
                }, // 箭身左侧
                {
                    x: adjustedEndX - params.headBottomInnerWidth * cosAngleMinus90,
                    y: adjustedEndY - params.headBottomInnerWidth * sinAngleMinus90,
                }, // 箭头内底部左侧
                {
                    x: adjustedEndX - params.headBottomWidth * cosAngleMinus90,
                    y: adjustedEndY - params.headBottomWidth * sinAngleMinus90,
                }, // 箭头外底部左侧
                { x: endX, y: endY }, // 箭头尖端
                {
                    x: adjustedEndX - params.headBottomWidth * cosAnglePlus90,
                    y: adjustedEndY - params.headBottomWidth * sinAnglePlus90,
                }, // 箭头外底部右侧
                {
                    x: adjustedEndX - params.headBottomInnerWidth * cosAnglePlus90,
                    y: adjustedEndY - params.headBottomInnerWidth * sinAnglePlus90,
                }, // 箭头内底部右侧
                {
                    x: adjustedStartX - params.bodyBottomWidth * cosAnglePlus90,
                    y: adjustedStartY - params.bodyBottomWidth * sinAnglePlus90,
                }, // 箭身右侧
                { x: adjustedStartX, y: adjustedStartY }, // 回到起点，闭合路径
            ];

            if (plineRef.current) {
                plineRef.current.set({
                    points,
                });
                plineRef.current.setBoundingBox(true);
            } else {
                plineRef.current = new fabric.Polyline(points, {
                    fill: fillShapeRef.current.fill ? colorRef.current.color : 'transparent',
                    stroke: colorRef.current.color,
                    opacity: 1,
                    strokeWidth: params.strokeWidth,
                    strokeUniform: true,
                    originX: 'left',
                    originY: 'top',
                    perPixelTargetFind: true,
                    selectable: true,
                    strokeLineJoin: enableRadiusRef.current.enable ? 'round' : 'miter',
                    strokeLineCap: enableRadiusRef.current.enable ? 'round' : 'square',
                });
                console.log(plineRef.current.toSVG());
                canvas.add(plineRef.current);
            }

            canvas.renderAll();
        };

        // 鼠标按下事件
        const handleMouseDown = (opts: fabric.TEvent<fabric.TPointerEvent>) => {
            canvas.discardActiveObject();

            mouseDownRef.current = true;
            const pointer = canvas.getScenePoint(opts.e);
            coordsRef.current.startX = pointer.x;
            coordsRef.current.startY = pointer.y;

            // 初始化终点坐标以避免移动前渲染
            coordsRef.current.endX = pointer.x;
            coordsRef.current.endY = pointer.y;
        };

        // 鼠标松开事件
        const handleMouseUp = () => {
            mouseDownRef.current = false;
            plineRef.current = undefined;

            // 如果有挂起的动画帧，取消它
            if (rafRef.current !== undefined) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = undefined;
            }
        };

        // 鼠标移动事件 - 通过 requestAnimationFrame 节流
        const handleMouseMove = (opts: fabric.TEvent<fabric.TPointerEvent>) => {
            if (!mouseDownRef.current) return;

            const pointer = canvas.getScenePoint(opts.e);
            coordsRef.current.endX = pointer.x;
            coordsRef.current.endY = pointer.y;

            // 如果已经有挂起的重绘请求，不再安排新的
            if (rafRef.current !== undefined) return;

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = undefined;

                drawArrow();
            });
        };

        const mouseDownUnlistener = canvas.on('mouse:down', handleMouseDown);
        const mouseUpUnlistener = canvas.on('mouse:up', handleMouseUp);
        const mouseMoveUnlistener = canvas.on('mouse:move', handleMouseMove);

        return () => {
            // 清理事件监听器和任何挂起的动画帧
            mouseDownUnlistener();
            mouseUpUnlistener();
            mouseMoveUnlistener();

            if (rafRef.current !== undefined) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [colorRef, fabricRef, widthRef, arrowConfigIdRef, fillShapeRef, enableRadiusRef]);

    return (
        <>
            <LineWidthPicker onChange={setWidth} toolbarLocation="arrow" />
            <ArrowConfigPicker onChange={setArrowConfigId} toolbarLocation="arrow" />
            <div className="draw-toolbar-splitter" />
            <LineColorPicker onChange={setColor} toolbarLocation="arrow" />
            <EnableRadiusPicker onChange={setEnableRadius} toolbarLocation="arrow" />
            <FillShapePicker onChange={setFillShape} toolbarLocation="arrow" />
        </>
    );
};
