// import { FillShapePicker } from '../pickers/fillShapePicker';
// import { LineColorPicker } from '../pickers/lineColorPicker';
// import { LineWidthPicker } from '../pickers/lineWidthPicker';
// import { useCallback, useContext, useRef } from 'react';
// import { BaseToolEnablePublisher, withBaseTool } from './baseTool';
// import { DrawContext, DrawState } from '@/app/draw/types';
// import { MousePosition } from '@/utils/mousePosition';
// import { useCallbackRender } from '@/hooks/useCallbackRender';
// import { useHistory } from '../../../historyContext';
// import { useStateSubscriber } from '@/hooks/useStateSubscriber';
// import { ArrowConfigPicker, getArrowStyleConfig } from '../pickers/arrowConfigPicker';
// import { DrawingPublisher } from '../..';
// import { CanvasDrawArrow } from '@/core/canvas/canvasDrawArrow';
// import {
//     defaultArrowConfigValue,
//     defaultFillShapePickerValue,
//     defaultLineColorPickerValue,
//     defaultLineWidthPickerValue,
//     defaultLockAngleValue,
//     LineColorPickerValue,
//     LineWidthPickerValue,
// } from '../pickers/defaultValues';

// const ArrowToolCore: React.FC = () => {
//     const { history } = useHistory();

//     const { drawLayerActionRef, imageBufferRef } = useContext(DrawContext);

//     const widthRef = useRef<LineWidthPickerValue>(defaultLineWidthPickerValue);
//     const colorRef = useRef<LineColorPickerValue>(defaultLineColorPickerValue);
//     const arrowConfigIdRef = useRef(defaultArrowConfigValue);
//     const fillShapeRef = useRef(defaultFillShapePickerValue);
//     const lockAngleRef = useRef(defaultLockAngleValue);

//     const [, setDrawing] = useStateSubscriber(DrawingPublisher, undefined);
//     const [getEnable] = useStateSubscriber(BaseToolEnablePublisher, undefined);

//     const canvasDrawRef = useRef<CanvasDrawArrow | undefined>(undefined);

//     const onMouseDown = useCallback(
//         (mousePosition: MousePosition) => {
//             if (!getEnable()) {
//                 return;
//             }
//             if (!canvasDrawRef.current) {
//                 return;
//             }

//             canvasDrawRef.current.setStyle(
//                 widthRef.current.width,
//                 colorRef.current.color,
//                 getArrowStyleConfig(arrowConfigIdRef.current.configId),
//                 fillShapeRef.current.fill,
//             );
//             canvasDrawRef.current.start(mousePosition);
//         },
//         [arrowConfigIdRef, colorRef, fillShapeRef, getEnable, widthRef],
//     );

//     const onMouseMove = useCallback(
//         (mousePosition: MousePosition) => {
//             if (!canvasDrawRef.current) {
//                 return;
//             }
//             if (!canvasDrawRef.current.drawing) {
//                 return;
//             }
//             canvasDrawRef.current.execute(mousePosition, lockAngleRef.current);
//         },
//         [lockAngleRef],
//     );
//     const onMouseMoveRender = useCallbackRender(onMouseMove);

//     const onMouseUp = useCallback(() => {
//         if (!canvasDrawRef.current) {
//             return;
//         }
//         if (!canvasDrawRef.current.drawing) {
//             return;
//         }
//         canvasDrawRef.current.finish();
//     }, []);

//     const initEvents = useCallback(
//         (enable: boolean) => {
//             if (!enable) {
//                 return;
//             }

//             const layerContainerElement = drawLayerActionRef.current?.getLayerContainerElement();
//             if (!layerContainerElement) {
//                 return;
//             }

//             const handleMouseDown = (e: MouseEvent) => {
//                 const mousePosition = new MousePosition(e.clientX, e.clientY);
//                 onMouseDown(mousePosition);
//             };

//             const handleMouseMove = (e: MouseEvent) => {
//                 const mousePosition = new MousePosition(e.clientX, e.clientY);
//                 onMouseMoveRender(mousePosition);
//             };

//             const handleMouseUp = () => {
//                 onMouseUp();
//             };

//             layerContainerElement.addEventListener('mousemove', handleMouseMove);
//             layerContainerElement.addEventListener('mouseup', handleMouseUp);
//             layerContainerElement.addEventListener('mousedown', handleMouseDown);

//             return () => {
//                 layerContainerElement.removeEventListener('mousemove', handleMouseMove);
//                 layerContainerElement.removeEventListener('mouseup', handleMouseUp);
//                 layerContainerElement.removeEventListener('mousedown', handleMouseDown);
//             };
//         },
//         [drawLayerActionRef, onMouseUp, onMouseDown, onMouseMoveRender],
//     );

//     const initDraw = useCallback(
//         (enable: boolean) => {
//             if (!enable) {
//                 return;
//             }

//             if (!drawLayerActionRef.current) {
//                 return;
//             }

//             canvasDrawRef.current = new CanvasDrawArrow(
//                 history,
//                 imageBufferRef.current?.monitorScaleFactor ?? 1,
//                 setDrawing,
//                 drawLayerActionRef.current,
//             );
//         },
//         [drawLayerActionRef, history, imageBufferRef, setDrawing],
//     );
//     const onEnableChange = useCallback(
//         (enable: boolean) => {
//             initEvents(enable);
//             initDraw(enable);
//             drawLayerActionRef.current?.changeCursor('crosshair');
//         },
//         [initEvents, initDraw, drawLayerActionRef],
//     );
//     useStateSubscriber(BaseToolEnablePublisher, onEnableChange);

//     return (
//         <>
//             <LineWidthPicker
//                 onChange={(value) => {
//                     widthRef.current = value;
//                 }}
//                 toolbarLocation="arrow"
//             />
//             <ArrowConfigPicker
//                 onChange={(value) => {
//                     arrowConfigIdRef.current = value;
//                 }}
//                 toolbarLocation="arrow"
//             />
//             <div className="draw-toolbar-splitter" />
//             <LineColorPicker
//                 onChange={(value) => {
//                     colorRef.current = value;
//                 }}
//                 toolbarLocation="arrow"
//             />
//             <div className="draw-toolbar-splitter" />
//             <FillShapePicker
//                 onChange={(value) => {
//                     fillShapeRef.current = value;
//                 }}
//                 toolbarLocation="arrow"
//             />
//         </>
//     );
// };

// export const ArrowTool = withBaseTool(ArrowToolCore, DrawState.Arrow);
