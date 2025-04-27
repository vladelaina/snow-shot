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
    public getMaxDistance = (other: MousePosition) => {
        const width = Math.abs(this.mouseX - other.mouseX);
        const height = Math.abs(this.mouseY - other.mouseY);

        return Math.max(width, height);
    };

    public toElementRect = (other: MousePosition) => {
        let minX;
        let maxX;
        if (this.mouseX < other.mouseX) {
            minX = this.mouseX;
            maxX = other.mouseX;
        } else {
            minX = other.mouseX;
            maxX = this.mouseX;
        }

        let minY;
        let maxY;
        if (this.mouseY < other.mouseY) {
            minY = this.mouseY;
            maxY = other.mouseY;
        } else {
            minY = other.mouseY;
            maxY = this.mouseY;
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
}
