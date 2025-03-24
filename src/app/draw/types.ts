export enum CaptureStep {
    // 选择阶段
    Select = 'select',
    // 绘制阶段
    Draw = 'draw',
    // 置顶阶段
    TopUp = 'topUp',
}

export enum DrawState {
    Move = 'move',
}

export enum CanvasLayer {
    CaptureImage = 'captureImage',
    BlurImage = 'blurImage',
    Draw = 'draw',
    Select = 'select',
}
