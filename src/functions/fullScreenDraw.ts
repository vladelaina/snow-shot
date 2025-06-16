import { emit } from '@tauri-apps/api/event';

export const fullScreenDrawChangeMouseThrough = async () => {
    await emit('full-screen-draw-change-mouse-through');
};

export const closeFullScreenDraw = async () => {
    await emit('close-full-screen-draw');
};
