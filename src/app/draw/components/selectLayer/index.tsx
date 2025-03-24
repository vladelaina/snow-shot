'use client';

import { useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import React from 'react';
import {
    BaseLayerEventActionType,
    withBaseLayer,
    BaseLayerActionType,
    BaseLayerContext,
} from '../baseLayer';
import { zIndexs } from '@/utils/zIndex';
import {
    ElementRect,
    getElementFromPosition,
    getWindowElements,
    ImageBuffer,
    initUiElements,
    initUiElementsCache,
} from '@/commands';
import { AppSettingsContext } from '@/app/contextWrap';
import { useHotkeys } from 'react-hotkeys-hook';
import * as PIXI from 'pixi.js';
import Flatbush from 'flatbush';
import { useCallbackRender } from '@/hooks/useCallbackRender';

export type SelectLayerActionType = BaseLayerActionType & {};

export type SelectLayerProps = {
    actionRef: React.RefObject<SelectLayerActionType | undefined>;
};

export const getMaskBackgroundColor = (darkMode: boolean) => {
    return darkMode ? '#434343' : '#000000';
};

const MASK_OPACITY = 0.5;
const SelectLayerCore: React.FC<SelectLayerProps> = ({ actionRef }) => {
    const imageBufferRef = useRef<ImageBuffer | undefined>(undefined);

    const { isEnable, addChildToTopContainer } = useContext(BaseLayerContext);

    const {
        screenshot: { findChildrenElements },
        common: { darkMode },
    } = useContext(AppSettingsContext);
    const tabFindChildrenElementsRef = useRef<boolean>(false); // 是否查找子元素
    const [tabFindChildrenElements, _setTabFindChildrenElements] = useState<boolean>(false); // Tab 键的切换查找子元素
    const setTabFindChildrenElements = useCallback(
        (value: boolean | ((prev: boolean) => boolean)) => {
            tabFindChildrenElementsRef.current =
                typeof value === 'function' ? value(tabFindChildrenElementsRef.current) : value;
            _setTabFindChildrenElements(value);
        },
        [],
    );
    const elementsListRef = useRef<ElementRect[]>([]); // 窗口元素的列表
    const elementsListRTreeRef = useRef<Flatbush | undefined>(undefined); // 窗口元素的 RTree
    const selectWindowElementLoadingRef = useRef(true); // 是否正在加载元素选择功能
    const overlayRectRef = useRef<PIXI.Graphics | undefined>(undefined); // 全屏遮罩
    const overlayMaskRectRef = useRef<PIXI.Graphics | undefined>(undefined); // 全屏遮罩的 mask
    const selectWindowFromMousePositionLevelRef = useRef(0);
    const lastMouseMovePositionRef = useRef({
        mouseX: 0,
        mouseY: 0,
    }); // 上一次鼠标移动事件触发的参数

    /**
     * 初始化元素选择功能
     */
    const initSelectWindowElement = useCallback(async (imageBuffer: ImageBuffer) => {
        selectWindowElementLoadingRef.current = true;

        const windowElements = await getWindowElements(imageBuffer.mouseX, imageBuffer.mouseY);
        const initUiElementsCachePromise = initUiElementsCache();

        const rTree = new Flatbush(windowElements.length);
        windowElements.forEach((rect) => {
            rTree.add(rect.min_x, rect.min_y, rect.max_x, rect.max_y);
        });
        rTree.finish();
        elementsListRTreeRef.current = rTree;
        elementsListRef.current = windowElements;

        await initUiElementsCachePromise;
        selectWindowElementLoadingRef.current = false;
    }, []);

    /**
     * 通过鼠标坐标获取候选框
     */
    const getElementRectFromMousePosition = useCallback(
        async (mouseX: number, mouseY: number): Promise<ElementRect[] | undefined> => {
            if (selectWindowElementLoadingRef.current) {
                return undefined;
            }

            const imageBuffer = imageBufferRef.current;
            if (!imageBuffer) {
                return undefined;
            }
            const elementsRTree = elementsListRTreeRef.current;
            if (!elementsRTree) {
                return undefined;
            }

            const { monitorScaleFactor, monitorX, monitorY } = imageBuffer;
            // 将坐标转换为物理坐标
            mouseX = Math.floor(mouseX * monitorScaleFactor) + monitorX;
            mouseY = Math.floor(mouseY * monitorScaleFactor) + monitorY;

            let elementRectList = undefined;
            if (tabFindChildrenElementsRef.current) {
                try {
                    elementRectList = await getElementFromPosition(mouseX, mouseY);
                } catch {
                    // 获取元素失败，忽略
                }
            }

            let result;
            if (elementRectList) {
                result = elementRectList;
            } else {
                const rectIndexs = elementsRTree.search(mouseX, mouseY, mouseX, mouseY);
                // 获取的是原始数据的索引，原始数据下标越小的，窗口层级越低，所以优先选择下标大的
                rectIndexs.sort((a, b) => b - a);

                result = rectIndexs.map((index) => {
                    return elementsListRef.current[index];
                });
            }

            return result;
        },
        [],
    );

    const onCaptureReady = useCallback<BaseLayerEventActionType['onCaptureReady']>(
        async (_texture, imageBuffer): Promise<void> => {
            const initSelectWindowElementPromise = initSelectWindowElement(imageBuffer);

            const { monitorWidth, monitorHeight, mouseX, mouseY, monitorScaleFactor } = imageBuffer;
            imageBufferRef.current = imageBuffer;
            // 初始化下坐标，用来在触发鼠标移动事件前选取坐标
            lastMouseMovePositionRef.current = {
                mouseX: Math.floor(mouseX / monitorScaleFactor),
                mouseY: Math.floor(mouseY / monitorScaleFactor),
            };
            // 创建一个全屏遮罩
            const overlayRect = new PIXI.Graphics().rect(0, 0, monitorWidth, monitorHeight).fill({
                color: getMaskBackgroundColor(darkMode),
                alpha: MASK_OPACITY,
            });
            // 创建遮罩的 mask，用来显示选择的范围
            // 开始选择全屏，这样过渡效果比较好
            const overlayMaskRect = new PIXI.Graphics()
                .rect(0, 0, monitorWidth, monitorHeight)
                .fill('#000000');
            overlayRect.setMask({
                mask: overlayMaskRect,
                inverse: true,
            });

            addChildToTopContainer(overlayRect);
            addChildToTopContainer(overlayMaskRect);

            overlayRectRef.current = overlayRect;
            overlayMaskRectRef.current = overlayMaskRect;

            await initSelectWindowElementPromise;
        },
        [darkMode, addChildToTopContainer, initSelectWindowElement],
    );

    const onCaptureFinish = useCallback<BaseLayerEventActionType['onCaptureFinish']>(() => {
        imageBufferRef.current = undefined;
        selectWindowElementLoadingRef.current = true;
        elementsListRTreeRef.current = undefined;
        elementsListRef.current = [];
    }, []);

    /** 更新选取的位置 */
    const updateSelectRect = useCallback((rect: ElementRect) => {
        const maskRect = overlayMaskRectRef.current;
        if (!maskRect) {
            return;
        }

        maskRect
            .clear()
            .rect(rect.min_x, rect.min_y, rect.max_x - rect.min_x, rect.max_y - rect.min_y)
            .fill('#000000');
    }, []);

    const onMouseMove = useCallback(
        async (mouseX: number, mouseY: number) => {
            lastMouseMovePositionRef.current = {
                mouseX,
                mouseY,
            };

            const elementRectList = await getElementRectFromMousePosition(
                lastMouseMovePositionRef.current.mouseX,
                lastMouseMovePositionRef.current.mouseY,
            );

            if (!elementRectList || elementRectList.length === 0) {
                return;
            }

            const minLevel = 0;
            const maxLevel = Math.max(elementRectList.length - 1, minLevel);
            let currentLevel = selectWindowFromMousePositionLevelRef.current;
            if (currentLevel < minLevel) {
                currentLevel = minLevel;
            } else if (currentLevel > maxLevel) {
                currentLevel = maxLevel;
                selectWindowFromMousePositionLevelRef.current = maxLevel;
            }

            // 更新选取位置
            updateSelectRect(elementRectList[currentLevel]);
        },
        [getElementRectFromMousePosition, updateSelectRect],
    );
    const onMouseMoveRenderCallback = useCallbackRender(onMouseMove);
    // 用上一次的鼠标移动事件触发 onMouseMove 来更新一些状态
    const refreshMouseMove = useCallback(() => {
        if (lastMouseMovePositionRef.current) {
            onMouseMove(
                lastMouseMovePositionRef.current.mouseX,
                lastMouseMovePositionRef.current.mouseY,
            );
        }
    }, [onMouseMove]);
    const onMouseWheel = useCallback(
        (e: WheelEvent) => {
            const deltaLevel = e.deltaY > 0 ? 1 : -1;
            selectWindowFromMousePositionLevelRef.current = Math.max(
                selectWindowFromMousePositionLevelRef.current + deltaLevel,
                0,
            );
            refreshMouseMove();
        },
        [refreshMouseMove],
    );
    const onMouseWheelRenderCallback = useCallbackRender(onMouseWheel);

    useEffect(() => {
        initUiElements();
    }, []);

    useEffect(() => {
        setTabFindChildrenElements(findChildrenElements);
    }, [findChildrenElements, setTabFindChildrenElements]);
    // 查找子元素切换时，刷新选取
    useEffect(() => {
        refreshMouseMove();
    }, [tabFindChildrenElements, refreshMouseMove]);

    useEffect(() => {
        if (!isEnable) {
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            onMouseMoveRenderCallback(e.clientX, e.clientY);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('wheel', onMouseWheelRenderCallback);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('wheel', onMouseWheelRenderCallback);
        };
    }, [isEnable, onMouseMoveRenderCallback, onMouseWheelRenderCallback]);

    useImperativeHandle(
        actionRef,
        () => ({
            onCaptureReady: async (texture, imageBuffer) => {
                await onCaptureReady(texture, imageBuffer);
                refreshMouseMove();
            },
            onCaptureFinish,
            disable: () => {},
            enable: () => {},
            onCanvasReady: () => {},
        }),
        [onCaptureFinish, onCaptureReady, refreshMouseMove],
    );

    useHotkeys(
        'Tab',
        () => {
            setTabFindChildrenElements((prev) => !prev);
        },
        {
            preventDefault: true,
            enabled: isEnable && findChildrenElements,
        },
    );

    return <></>;
};

export default withBaseLayer(SelectLayerCore, zIndexs.Draw_SelectLayer);
