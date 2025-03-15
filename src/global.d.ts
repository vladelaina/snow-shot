// import { CanvasEvents } from 'fabric';

export {};

declare global {
    interface Window {}
}

declare module 'fabric' {
    interface CanvasEvents {
        'history:updated': undefined;
        'history:undo': undefined;
        'history:redo': undefined;
        'history:cleared': undefined;
    }
}
