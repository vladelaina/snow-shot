import { ElementRect } from '@/commands';
import { MousePosition } from '@/utils/mousePosition';

export const dragRect = (
    rect: ElementRect,
    originMousePosition: MousePosition,
    currentMousePosition: MousePosition,
    previousRect: ElementRect | undefined,
    boundaryRect: ElementRect,
) => {
    const offsetX = currentMousePosition.mouseX - originMousePosition.mouseX;
    const offsetY = currentMousePosition.mouseY - originMousePosition.mouseY;

    const baseRect = previousRect || rect;

    let minX = baseRect.min_x + offsetX;
    let minY = baseRect.min_y + offsetY;
    let maxX = baseRect.max_x + offsetX;
    let maxY = baseRect.max_y + offsetY;

    const width = maxX - minX;
    const height = maxY - minY;

    // 检测是否触碰边界
    const adjustedOriginPosition = new MousePosition(
        originMousePosition.mouseX,
        originMousePosition.mouseY,
    );
    let boundaryHit = false;

    if (minX < boundaryRect.min_x) {
        minX = boundaryRect.min_x;
        maxX = minX + width;
        // 调整原点X坐标，消除回弹效应
        adjustedOriginPosition.mouseX = currentMousePosition.mouseX - (minX - baseRect.min_x);
        boundaryHit = true;
    } else if (maxX > boundaryRect.max_x) {
        maxX = boundaryRect.max_x;
        minX = maxX - width;
        // 调整原点X坐标
        adjustedOriginPosition.mouseX = currentMousePosition.mouseX - (minX - baseRect.min_x);
        boundaryHit = true;
    }

    if (minY < boundaryRect.min_y) {
        minY = boundaryRect.min_y;
        maxY = minY + height;
        // 调整原点Y坐标
        adjustedOriginPosition.mouseY = currentMousePosition.mouseY - (minY - baseRect.min_y);
        boundaryHit = true;
    } else if (maxY > boundaryRect.max_y) {
        maxY = boundaryRect.max_y;
        minY = maxY - height;
        // 调整原点Y坐标
        adjustedOriginPosition.mouseY = currentMousePosition.mouseY - (minY - baseRect.min_y);
        boundaryHit = true;
    }

    return {
        rect: {
            min_x: minX,
            min_y: minY,
            max_x: maxX,
            max_y: maxY,
        },
        newOriginPosition: boundaryHit ? adjustedOriginPosition : originMousePosition,
    };
};
