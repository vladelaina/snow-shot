import * as fabric from 'fabric';

export const ignoreHistory = (target: fabric.Object) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target as any).ignoreHistory = true;
};

/**
 * FabricJS 历史操作管理类
 * 支持对象的添加和删除操作的撤销（undo）和重做（redo），并触发自定义事件供其他组件监听。
 */
export class FabricHistory {
    private canvas: fabric.Canvas;
    private undoStack: HistoryAction[] = [];
    private redoStack: HistoryAction[] = [];
    private isExecutingAction: boolean = false;

    /**
     * 构造函数
     * @param canvas FabricJS 画布实例
     */
    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        this.initEvents();
    }

    /**
     * 初始化画布事件监听
     */
    private initEvents(): void {
        // 监听对象添加事件
        this.canvas.on('object:added', (e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (this.isExecutingAction || (e.target as any).ignoreHistory) return;

            const action: HistoryAction = {
                type: ActionType.ADD,
                target: e.target,
                state: null,
            };

            this.pushAction(action);
        });

        // 监听对象移除事件
        this.canvas.on('object:removed', (e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (this.isExecutingAction || (e.target as any).ignoreHistory) return;

            const action: HistoryAction = {
                type: ActionType.REMOVE,
                target: e.target,
                state: null,
            };

            this.pushAction(action);
        });
    }

    /**
     * 将操作添加到历史栈
     * @param action 历史操作对象
     */
    private pushAction(action: HistoryAction): void {
        this.undoStack.push(action);
        // 有新的操作，清空重做栈
        this.redoStack = [];
        // 触发事件通知其他组件
        this.canvas.fire('history:updated');
    }

    /**
     * 检查是否可以执行撤销操作
     * @returns {boolean} 如果有可撤销的操作返回 true，否则返回 false
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * 检查是否可以执行重做操作
     * @returns {boolean} 如果有可重做的操作返回 true，否则返回 false
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * 撤销操作
     */
    public undo(): void {
        if (!this.canUndo()) return;

        const action = this.undoStack.pop();
        if (!action) return;

        this.isExecutingAction = true;

        switch (action.type) {
            case ActionType.ADD:
                // 撤销添加 = 删除对象
                this.canvas.remove(action.target);
                break;
            case ActionType.REMOVE:
                // 撤销删除 = 重新添加对象
                this.canvas.add(action.target);
                break;
        }

        // 将操作推入重做栈
        this.redoStack.push(action);
        this.isExecutingAction = false;
        this.canvas.renderAll();

        // 触发自定义事件
        this.canvas.fire('history:undo');
    }

    /**
     * 重做操作
     */
    public redo(): void {
        if (!this.canRedo()) return;

        const action = this.redoStack.pop();
        if (!action) return;

        this.isExecutingAction = true;

        switch (action.type) {
            case ActionType.ADD:
                // 重做添加 = 添加对象
                this.canvas.add(action.target);
                break;
            case ActionType.REMOVE:
                // 重做删除 = 删除对象
                this.canvas.remove(action.target);
                break;
        }

        // 将操作推入撤销栈
        this.undoStack.push(action);
        this.isExecutingAction = false;
        this.canvas.renderAll();

        // 触发自定义事件
        this.canvas.fire('history:redo');
    }

    /**
     * 清空历史记录
     */
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        // 触发自定义事件
        this.canvas.fire('history:cleared');
    }

    /**
     * 获取可撤销操作数量
     */
    public get undoLength(): number {
        return this.undoStack.length;
    }

    /**
     * 获取可重做操作数量
     */
    public get redoLength(): number {
        return this.redoStack.length;
    }
}

/**
 * 操作类型枚举
 */
enum ActionType {
    ADD = 'add',
    REMOVE = 'remove',
}

/**
 * 历史操作接口
 */
interface HistoryAction {
    type: ActionType;
    target: fabric.Object;
    state: null;
}
