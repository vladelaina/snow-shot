export interface Point {
    x: number;
    y: number;
}

type Shape = Point[];

const chaikin = (function () {
    // 线性插值函数
    function _lerp(start: number, end: number, t: number): number {
        return start * (1 - t) + end * t;
    }

    // 优化后的切割函数，直接返回计算好的点
    function _chaikinCut(a: Point, b: Point, ratio: number, result: Point[]): void {
        result[0] = {
            x: _lerp(a.x, b.x, ratio),
            y: _lerp(a.y, b.y, ratio),
        };
        result[1] = {
            x: _lerp(b.x, a.x, ratio),
            y: _lerp(b.y, a.y, ratio),
        };
    }

    // 预分配数组空间
    function _preallocateArray(size: number): Point[] {
        const arr: Point[] = new Array(size);
        for (let i = 0; i < size; i++) {
            arr[i] = { x: 0, y: 0 };
        }
        return arr;
    }

    // 计算最终数组大小
    function _calculateFinalSize(initialSize: number, iterations: number, close: boolean): number {
        let size = initialSize;
        for (let i = 0; i < iterations; i++) {
            size = close ? size * 2 : (size - 1) * 2 + 1;
        }
        return size;
    }

    return function (shape: Shape, ratio: number, iterations: number, close: boolean): Shape {
        if (iterations === 0) return shape;

        // 预计算最终数组大小
        const finalSize = _calculateFinalSize(shape.length, iterations, close);
        const result = _preallocateArray(finalSize);
        let resultIndex = 0;

        // 使用循环替代递归
        let currentShape = shape;
        let currentIterations = iterations;
        const tempPoints: Point[] = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];

        while (currentIterations > 0) {
            const numCorners = close ? currentShape.length : currentShape.length - 1;
            resultIndex = 0;

            for (let i = 0; i < numCorners; i++) {
                const a = currentShape[i];
                const b = currentShape[(i + 1) % currentShape.length];
                _chaikinCut(a, b, ratio, tempPoints);

                if (!close && i === 0) {
                    result[resultIndex++] = { x: a.x, y: a.y };
                    result[resultIndex++] = { x: tempPoints[1].x, y: tempPoints[1].y };
                } else if (!close && i === numCorners - 1) {
                    result[resultIndex++] = { x: tempPoints[0].x, y: tempPoints[0].y };
                    result[resultIndex++] = { x: b.x, y: b.y };
                } else {
                    result[resultIndex++] = { x: tempPoints[0].x, y: tempPoints[0].y };
                    result[resultIndex++] = { x: tempPoints[1].x, y: tempPoints[1].y };
                }
            }

            currentShape = result.slice(0, resultIndex);
            currentIterations--;
        }

        return result.slice(0, resultIndex);
    };
})();

export default chaikin;
