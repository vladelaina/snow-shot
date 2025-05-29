import { emit } from '@tauri-apps/api/event';

export const fullScreenDrawChangeMouseThrough = () => {
    emit('full-screen-draw-change-mouse-through');
};
