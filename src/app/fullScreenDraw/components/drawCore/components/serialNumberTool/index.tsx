import {
    AppSettingsActionContext,
    AppSettingsData,
    AppSettingsGroup,
    AppSettingsPublisher,
} from '@/app/contextWrap';
import { CaptureEvent, CaptureEventParams, CaptureEventPublisher } from '@/app/draw/extra';
import {
    DrawCoreContext,
    DrawState,
    DrawStatePublisher,
    ExcalidrawEventParams,
    ExcalidrawEventPublisher,
} from '@/app/fullScreenDraw/components/drawCore/extra';
import { HotkeysScope } from '@/components/globalLayoutExtra';
import { useHotkeysApp } from '@/hooks/useHotkeysApp';
import { useStateRef } from '@/hooks/useStateRef';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { zIndexs } from '@/utils/zIndex';
import { AppState } from '@mg-chao/excalidraw/types';
import Color from 'color';
import React, {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    WheelEventHandler,
} from 'react';

const generateSerialNumber = (
    position: { x: number; y: number },
    number: number,
    appState: AppState,
) => {
    const id = new Date().valueOf();

    const ellipseBackgroundId = `snow-shot_serial-number_${id}-ellipse-background`;
    const ellipseId = `snow-shot_serial-number_${id}-ellipse`;
    const textId = `snow-shot_serial-number_${id}-text`;
    const serialNumberGroupNumber = `snow-shot_serial-number_${id}-group-number`;

    const sizeScale = appState.currentItemFontSize / 16;

    const ellipseWidth = 32 * sizeScale;
    const ellipseHeight = 32 * sizeScale;

    let textHeight = 20 * sizeScale;
    const fontSize = appState.currentItemFontSize;
    if (fontSize <= 16) {
        textHeight = 20;
    } else if (fontSize <= 20) {
        textHeight = 25;
    } else if (fontSize <= 28) {
        textHeight = 35;
    } else if (fontSize <= 36) {
        textHeight = 45;
    }

    const res = [];

    let ellipseBackgroundColor = appState.currentItemBackgroundColor;
    const ellipseBackgroundColorInstance = new Color(ellipseBackgroundColor);
    // 如果不存在背景色，或者背景色不是实心的，则进行填充
    if (ellipseBackgroundColorInstance.alpha() === 0 || appState.currentItemFillStyle !== 'solid') {
        const alpha = 0.08;
        let backgroundColor = new Color('#ffffff');
        const strokeColorInstance = new Color(appState.currentItemStrokeColor);
        // 如果文字颜色很亮的话，则背景色为灰色
        if (
            strokeColorInstance.red() + strokeColorInstance.green() + strokeColorInstance.blue() >
            680
        ) {
            backgroundColor = new Color('rgb(169,169,169)');
        }

        const fg = new Color(appState.currentItemStrokeColor).rgb();
        const bg = backgroundColor.rgb();

        const blendedR = Math.ceil(fg.red() * alpha + bg.red() * (1 - alpha));
        const blendedG = Math.ceil(fg.green() * alpha + bg.green() * (1 - alpha));
        const blendedB = Math.ceil(fg.blue() * alpha + bg.blue() * (1 - alpha));

        ellipseBackgroundColor = new Color({ r: blendedR, g: blendedG, b: blendedB }).hex();

        res.push({
            id: ellipseBackgroundId,
            type: 'ellipse',
            x: position.x - ellipseWidth / 2,
            y: position.y - ellipseHeight / 2,
            width: ellipseWidth,
            height: ellipseHeight,
            angle: 0,
            strokeColor: appState.currentItemStrokeColor,
            backgroundColor: ellipseBackgroundColor,
            fillStyle: 'solid',
            strokeWidth: appState.currentItemStrokeWidth,
            strokeStyle: appState.currentItemStrokeStyle,
            roughness: 0,
            opacity: appState.currentItemOpacity,
            groupIds: [serialNumberGroupNumber],
            frameId: null,
            roundness: null,
            version: 304,
            versionNonce: 1149037384,
            isDeleted: false,
            boundElements: [],
            fontSize: fontSize,
            fontFamily: appState.currentItemFontFamily,
            link: null,
            locked: false,
        });
    }

    res.push(
        {
            id: ellipseId,
            type: 'ellipse',
            x: position.x - ellipseWidth / 2,
            y: position.y - ellipseHeight / 2,
            width: ellipseWidth,
            height: ellipseHeight,
            angle: 0,
            strokeColor: appState.currentItemStrokeColor,
            backgroundColor: appState.currentItemBackgroundColor,
            fillStyle: appState.currentItemFillStyle,
            strokeWidth: appState.currentItemStrokeWidth,
            strokeStyle: appState.currentItemStrokeStyle,
            roughness: 0,
            opacity: appState.currentItemOpacity,
            groupIds: [serialNumberGroupNumber],
            frameId: null,
            roundness: null,
            version: 304,
            versionNonce: 1149037384,
            isDeleted: false,
            boundElements: [],
            fontSize: fontSize,
            fontFamily: appState.currentItemFontFamily,
            link: null,
            locked: false,
        },
        {
            id: textId,
            type: 'text',
            x: position.x - ellipseWidth / 2,
            y: position.y - textHeight / 2 + 2,
            width: 32 * sizeScale,
            height: textHeight,
            angle: 0,
            strokeColor: appState.currentItemStrokeColor,
            backgroundColor: appState.currentItemBackgroundColor,
            fillStyle: appState.currentItemFillStyle,
            strokeWidth: 1,
            strokeStyle: appState.currentItemStrokeStyle,
            roughness: 0,
            opacity: appState.currentItemOpacity,
            groupIds: [serialNumberGroupNumber],
            frameId: null,
            roundness: null,
            version: 1159,
            versionNonce: 2123386168,
            isDeleted: false,
            boundElements: [],
            link: null,
            locked: false,
            text: number.toString(),
            fontSize: fontSize,
            fontFamily: appState.currentItemFontFamily,
            textAlign: 'center',
            verticalAlign: 'center',
            containerId: null,
            originalText: number.toString(),
            autoResize: false,
            lineHeight: 1.25,
        },
    );

    return res;
};

export const SerialNumberTool: React.FC = () => {
    const { getLimitRect, getDevicePixelRatio, getAction, getMousePosition } =
        useContext(DrawCoreContext);

    const arrowElementIdsRef = useRef<Set<string>>(new Set());
    const [enable, setEnable, enableRef] = useStateRef(false);
    const [maskStyle, setMaskStyle] = useState<React.CSSProperties>({});

    useStateSubscriber(
        DrawStatePublisher,
        useCallback(
            (drawState: DrawState) => {
                const isEnable = drawState === DrawState.SerialNumber;
                setEnable(isEnable);

                const selectRect = getLimitRect();
                const monitorScaleFactor = getDevicePixelRatio();
                if (isEnable && selectRect && monitorScaleFactor) {
                    setMaskStyle({
                        left: selectRect.min_x / monitorScaleFactor,
                        top: selectRect.min_y / monitorScaleFactor,
                        width: (selectRect.max_x - selectRect.min_x) / monitorScaleFactor,
                        height: (selectRect.max_y - selectRect.min_y) / monitorScaleFactor,
                    });
                }
            },
            [getDevicePixelRatio, getLimitRect, setEnable],
        ),
    );
    useStateSubscriber(
        CaptureEventPublisher,
        useCallback(
            (event: CaptureEventParams | undefined) => {
                if (event?.event === CaptureEvent.onExecuteScreenshot) {
                    arrowElementIdsRef.current = new Set(
                        getAction()
                            ?.getExcalidrawAPI()
                            ?.getSceneElements()
                            .filter((item) => item.type === 'arrow')
                            .map((item) => item.id),
                    );
                }
            },
            [getAction],
        ),
    );

    const [disableArrow, setDisableArrow, disableArrowRef] = useStateRef(false);
    const onMouseDown = useCallback(() => {
        const mousePosition = getMousePosition();
        if (!mousePosition) {
            return;
        }

        const appState = getAction()?.getAppState();
        if (!appState) {
            return;
        }

        const sceneElements = getAction()?.getExcalidrawAPI()?.getSceneElements();
        if (!sceneElements) {
            return;
        }

        let currentNumber = 1;
        sceneElements.forEach((item) => {
            if (item.type === 'text' && item.id.startsWith('snow-shot_serial-number_')) {
                currentNumber = Math.max(currentNumber, parseInt(item.text) + 1);
            }
        });

        const serialNumberElement = generateSerialNumber(
            {
                x: mousePosition.mouseX,
                y: mousePosition.mouseY,
            },
            currentNumber,
            appState,
        );

        // 判断是否有新增的 arrow 元素
        const newArrowElement = sceneElements.find((item) => {
            return item.type === 'arrow' && !arrowElementIdsRef.current.has(item.id);
        });

        if (!newArrowElement && !disableArrowRef.current) {
            return;
        }

        if (newArrowElement) {
            arrowElementIdsRef.current.add(newArrowElement.id);

            sceneElements.forEach((item) => {
                if (item.id === newArrowElement.id) {
                    serialNumberElement[0].boundElements = [
                        {
                            id: newArrowElement.id,
                            type: 'arrow',
                        },
                    ] as never[];

                    item.startBinding = {
                        elementId: serialNumberElement[0].id,
                        focus: 0,
                        gap: 8,
                        fixedPoint: [1, 0.5],
                    };
                }
            });
        }

        getAction()?.updateScene({
            elements: [...sceneElements, ...serialNumberElement],
            captureUpdate: 'IMMEDIATELY',
        });
    }, [disableArrowRef, getAction, getMousePosition]);

    useStateSubscriber(
        ExcalidrawEventPublisher,
        useCallback(
            (params: ExcalidrawEventParams | undefined) => {
                if (!enableRef.current) {
                    return;
                }

                if (params?.event === 'onPointerDown') {
                    onMouseDown();
                }
            },
            [onMouseDown, enableRef],
        ),
    );

    const [disableArrowHotKey, setDisableArrowHotKey] = useState('');
    const { updateAppSettings } = useContext(AppSettingsActionContext);
    useStateSubscriber(
        AppSettingsPublisher,
        useCallback(
            (appSettings: AppSettingsData) => {
                setDisableArrow(appSettings[AppSettingsGroup.CacheV2].disableArrowPicker);
                setDisableArrowHotKey(
                    appSettings[AppSettingsGroup.DrawToolbarKeyEvent].serialNumberDisableArrow
                        .hotKey,
                );
            },
            [setDisableArrow],
        ),
    );

    useHotkeysApp(
        disableArrowHotKey,
        useCallback(() => {
            updateAppSettings(
                AppSettingsGroup.CacheV2,
                {
                    disableArrowPicker: !disableArrowRef.current,
                },
                true,
                true,
                false,
                true,
                false,
            );
        }, [disableArrowRef, updateAppSettings]),
        {
            preventDefault: true,
            keyup: true,
            keydown: false,
            scopes: HotkeysScope.DrawTool,
        },
    );

    const enableMask = disableArrow && enable;

    const updateActiveTool = useCallback(() => {
        if (!enableRef.current) {
            return;
        }

        if (disableArrowRef.current) {
            getAction()?.setActiveTool({
                type: 'ellipse',
                locked: true,
            });
        } else {
            getAction()?.setActiveTool({
                type: 'arrow',
                locked: true,
            });
        }
    }, [disableArrowRef, getAction, enableRef]);
    useEffect(() => {
        updateActiveTool();
    }, [updateActiveTool, enable, disableArrow]);

    const onMaskWheel = useCallback<WheelEventHandler<HTMLDivElement>>(
        (ev) => {
            getAction()?.handleWheel(ev);
        },
        [getAction],
    );

    return (
        <div
            className="serial-number-tool-mask"
            style={{ ...maskStyle, display: enableMask ? 'block' : 'none' }}
            onMouseDown={onMouseDown}
            onWheel={onMaskWheel}
        >
            <style jsx>{`
                .serial-number-tool-mask {
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: ${zIndexs.Draw_SerialNumberToolMask};
                    pointer-events: auto;
                    cursor: crosshair;
                }
            `}</style>
        </div>
    );
};
