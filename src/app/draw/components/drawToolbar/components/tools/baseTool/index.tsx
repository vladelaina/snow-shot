'use client';

import React, { useCallback, useRef } from 'react';
import { ComponentType } from 'react';
import { Flex, theme } from 'antd';
import { DrawState } from '@/app/draw/types';
import { useStateSubscriber } from '@/hooks/useStateSubscriber';
import { DrawStatePublisher } from '@/app/draw/page';
import { createPublisher, withStatePublisher } from '@/hooks/useStatePublisher';
import { EnableKeyEventPublisher } from '@/app/draw/components/drawToolbar/components/keyEventWrap/extra';

export const BaseToolVisiblePublisher = createPublisher<boolean>(false);
export const BaseToolEnablePublisher = createPublisher<boolean>(false);

/**
 * BaseTool 高阶组件
 * @param WrappedComponent 需要包装的基础组件
 */
export function withBaseTool<Props extends object>(
    WrappedComponent: ComponentType<Props>,
    drawState: DrawState,
) {
    function BaseTool(props: Props) {
        const { token } = theme.useToken();
        const containerRef = useRef<HTMLDivElement>(null);

        const updateVisible = useCallback((ds: DrawState) => {
            if (!containerRef.current) {
                return;
            }

            if (ds === drawState) {
                containerRef.current.style.opacity = '1';
                containerRef.current.style.display = 'block';
            } else {
                containerRef.current.style.opacity = '0';
                containerRef.current.style.display = 'none';
            }
        }, []);

        const [getDrawState] = useStateSubscriber(DrawStatePublisher, updateVisible);
        const [getEnableKeyEvent] = useStateSubscriber(EnableKeyEventPublisher, undefined);

        const [, setEnable] = useStateSubscriber(BaseToolEnablePublisher, undefined);
        const updateEnable = useCallback(() => {
            const visible = getDrawState() === drawState && getEnableKeyEvent();
            setEnable(visible);
        }, [setEnable, getDrawState, getEnableKeyEvent]);

        useStateSubscriber(DrawStatePublisher, updateEnable);
        useStateSubscriber(EnableKeyEventPublisher, updateEnable);

        return (
            <div className={`base-tool-container`} ref={containerRef}>
                <Flex align="center" gap={token.paddingXS}>
                    <WrappedComponent {...props} />
                </Flex>

                <style jsx>{`
                    .base-tool-container {
                        position: relative;
                        right: 0;
                        top: 0;
                        transition: opacity ${token.motionDurationFast} ${token.motionEaseInOut};
                    }
                `}</style>
            </div>
        );
    }

    return withStatePublisher(BaseTool, BaseToolVisiblePublisher, BaseToolEnablePublisher);
}
