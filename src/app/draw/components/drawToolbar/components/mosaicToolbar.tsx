import React, { useCallback, useContext, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import {
    defaultLineWidthPickerValue,
    LineWidthPicker,
    LineWidthPickerValue,
} from './pickers/lineWidthPicker';
import { DrawContext } from '@/app/draw/page';
import { useStateRef } from '@/hooks/useStateRef';
import { CircleCursor } from './pickers/components/circleCursor';
import { defaultSliderPickerValue, SliderPicker, SliderPickerValue } from './pickers/sliderPicker';
import { useAppSettingsLoad } from '@/hooks/useAppSettingsLoad';
import { Mosaic } from './fliters';
import { defaultEnableBlurValue, EnableBlur, EnableBlurValue } from './pickers/enableBlur';

const blurImageMultiplier = 1.25;
export const MosaicToolbar: React.FC = () => {
    const { fabricRef, maskRectRef, maskRectObjectListRef, imageBufferRef } =
        useContext(DrawContext);

    const [width, setWidth] = useStateRef<LineWidthPickerValue>(defaultLineWidthPickerValue);
    const [blur, setBlur, blurRef] = useStateRef<SliderPickerValue>(defaultSliderPickerValue);
    const [enableBlur, setEnableBlur, enableBlurRef] =
        useStateRef<EnableBlurValue>(defaultEnableBlurValue);

    const mosaicBrushRef = useRef<fabric.PatternBrush | null>(null);

    const maskOpacityMapRef = useRef(new Map<fabric.Object, number>());
    useEffect(() => {
        const maskRect = maskRectRef.current;
        if (!maskRect) {
            return;
        }

        maskOpacityMapRef.current.set(maskRect, maskRect.get('opacity'));
        maskRectObjectListRef.current.forEach((object) => {
            maskOpacityMapRef.current.set(object, object.get('opacity'));
        });
    }, [maskRectObjectListRef, maskRectRef]);

    const setMaskVisible = useCallback(
        (visible: boolean) => {
            const maskRect = maskRectRef.current;
            const maskRectObjectList = maskRectObjectListRef.current;
            if (!maskRect || !maskRectObjectList) {
                return;
            }

            maskRect.set({
                opacity: visible ? maskOpacityMapRef.current.get(maskRect) : 0,
            });
            maskRectObjectList.forEach((object) => {
                object.set({
                    opacity: visible ? maskOpacityMapRef.current.get(object) : 0,
                });
            });
        },
        [maskRectObjectListRef, maskRectRef],
    );

    const imgRef = useRef<fabric.Image | null>(null);
    const lastBlurRef = useRef<{
        blur: number;
        enableBlur: boolean;
    } | null>(null);
    const updateFilter = useCallback(() => {
        const img = imgRef.current;
        if (!img) {
            return;
        }

        const mosaicBrush = mosaicBrushRef.current;
        if (!mosaicBrush) {
            return;
        }

        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        if (
            lastBlurRef.current?.blur === blurRef.current.value &&
            lastBlurRef.current?.enableBlur === enableBlurRef.current.blur
        ) {
            return;
        }
        lastBlurRef.current = {
            blur: blurRef.current.value,
            enableBlur: enableBlurRef.current.blur,
        };

        // 创建一个模糊滤镜
        if (enableBlurRef.current.blur) {
            img.filters = [
                new fabric.filters.Blur({
                    blur: blurRef.current.value / 500,
                }),
            ];
        } else {
            img.filters = [
                new Mosaic({
                    blockSize: (blurRef.current.value / 100) * 24,
                }),
            ];
        }
        console.log(lastBlurRef.current);
        img.applyFilters();

        // 使用处理后的图像作为画笔源
        mosaicBrush.source = img.toCanvasElement({
            multiplier: blurImageMultiplier,
        });
        canvas.freeDrawingBrush = mosaicBrush;
    }, [blurRef, enableBlurRef, fabricRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            return;
        }

        canvas.isDrawingMode = true;
        const mosaicBrush = new fabric.PatternBrush(canvas);
        mosaicBrushRef.current = mosaicBrush;

        return () => {
            canvas.freeDrawingBrush = undefined;
            canvas.isDrawingMode = false;
        };
    }, [blurRef, fabricRef]);

    useEffect(() => {
        const canvas = fabricRef.current;
        const mosaicBrush = mosaicBrushRef.current;
        if (!canvas || !mosaicBrush) {
            return;
        }

        mosaicBrush.width = width.width;
    }, [fabricRef, width]);

    useAppSettingsLoad(
        useCallback(() => {
            const canvas = fabricRef.current;
            if (!canvas) {
                return;
            }

            const imageBuffer = imageBufferRef.current;
            if (!imageBuffer) {
                return;
            }

            setMaskVisible(false);
            fabric.FabricImage.fromURL(
                canvas.toDataURL({
                    multiplier: 1 / blurImageMultiplier,
                    format: 'jpeg',
                    quality: 75,
                    left: 0,
                    top: 0,
                    width: imageBuffer.monitorWidth / imageBuffer.monitorScaleFactor,
                    height: imageBuffer.monitorHeight / imageBuffer.monitorScaleFactor,
                }),
            ).then((img) => {
                imgRef.current = img;

                updateFilter();
            });
            setMaskVisible(true);
        }, [fabricRef, imageBufferRef, setMaskVisible, updateFilter]),
    );

    useEffect(() => {
        // 因为初始化时会自动调用一次更新，所以可以用是否有上一个记录判断是否是初始化
        if (lastBlurRef.current === null) {
            return;
        }

        updateFilter();
    }, [blur.value, enableBlur.blur, updateFilter]);

    return (
        <>
            <CircleCursor radius={width.width / 2} />
            <LineWidthPicker onChange={setWidth} toolbarLocation="mosaic" />

            <div className="draw-toolbar-splitter" />

            <SliderPicker onChange={setBlur} toolbarLocation="mosaic" />

            <EnableBlur onChange={setEnableBlur} toolbarLocation="mosaic" />
        </>
    );
};
