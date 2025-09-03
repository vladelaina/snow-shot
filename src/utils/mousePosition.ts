export class MousePosition {
    mouseX: number;
    mouseY: number;

    constructor(mouseX: number, mouseY: number) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
    }

    /**
     * 获取两个位置之间最长的一条边
     * @param other
     * @returns
     */
    public getMaxSide = (other: MousePosition) => {
        const width = Math.abs(this.mouseX - other.mouseX);
        const height = Math.abs(this.mouseY - other.mouseY);

        return Math.max(width, height);
    };

    public getDistance = (other: MousePosition) => {
        const width = Math.abs(this.mouseX - other.mouseX);
        const height = Math.abs(this.mouseY - other.mouseY);
        return Math.sqrt(width * width + height * height);
    };

    /**
     * 计算两个鼠标位置之间的矩形区域
     * @param other 另一个鼠标位置
     * @param lockWidthHeight 是否锁定宽高比
     * @returns 包含最小和最大坐标值的对象
     */
    public toElementRect = (other: MousePosition, lockWidthHeight: boolean = false) => {
        let minX: number;
        let maxX: number;
        let minY: number;
        let maxY: number;

        if (lockWidthHeight) {
            // 锁定宽高比且保持起始点不变
            const width = Math.abs(this.mouseX - other.mouseX);
            const height = Math.abs(this.mouseY - other.mouseY);
            const maxSide = Math.max(width, height);

            minX = this.mouseX;
            maxX = this.mouseX + (this.mouseX < other.mouseX ? maxSide : -maxSide);
            minY = this.mouseY;
            maxY = this.mouseY + (this.mouseY < other.mouseY ? maxSide : -maxSide);

            if (maxX < minX) {
                const temp = minX;
                minX = maxX;
                maxX = temp;
            }
            if (maxY < minY) {
                const temp = minY;
                minY = maxY;
                maxY = temp;
            }
        } else {
            if (this.mouseX < other.mouseX) {
                minX = this.mouseX;
                maxX = other.mouseX;
            } else {
                minX = other.mouseX;
                maxX = this.mouseX;
            }

            if (this.mouseY < other.mouseY) {
                minY = this.mouseY;
                maxY = other.mouseY;
            } else {
                minY = other.mouseY;
                maxY = this.mouseY;
            }
        }

        return {
            min_x: minX,
            min_y: minY,
            max_x: maxX,
            max_y: maxY,
        };
    };

    public scale = (scale: number) => {
        return new MousePosition(Math.floor(this.mouseX * scale), Math.floor(this.mouseY * scale));
    };

    public offset = (mousePosition: MousePosition) => {
        return new MousePosition(
            this.mouseX - mousePosition.mouseX,
            this.mouseY - mousePosition.mouseY,
        );
    };

    public add = (mousePosition: MousePosition) => {
        this.mouseX += mousePosition.mouseX;
        this.mouseY += mousePosition.mouseY;
    };

    public equals = (other: MousePosition) => {
        return this.mouseX === other.mouseX && this.mouseY === other.mouseY;
    };
}
