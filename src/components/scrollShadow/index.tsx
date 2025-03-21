'use client';

import React, { useRef, useEffect, useState } from 'react';

interface ScrollShadowProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ScrollShadow: React.FC<ScrollShadowProps> = ({ children, className, style }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const checkScroll = () => {
        console.log('checkScroll');

        const container = containerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftShadow(scrollLeft > 0);
        setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        checkScroll();
        window.addEventListener('resize', checkScroll);

        return () => {
            window.removeEventListener('resize', checkScroll);
        };
    }, []);

    return (
        <div className={`scroll-container ${className || ''}`}>
            {showLeftShadow && <div className="left-shadow" />}
            <div
                ref={containerRef}
                className="scroll-content"
                style={style}
                onScroll={checkScroll}
                onWheel={checkScroll}
            >
                {children}
            </div>
            {showRightShadow && <div className="right-shadow" />}

            <style jsx>{`
                .scroll-container {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                }

                .scroll-content {
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    &::-webkit-scrollbar {
                        display: none;
                    }
                }

                .left-shadow,
                .right-shadow {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 20px;
                    pointer-events: none;
                    z-index: 1;
                }

                .left-shadow {
                    left: 0;
                    background: linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent);
                }

                .right-shadow {
                    right: 0;
                    background: linear-gradient(to left, rgba(0, 0, 0, 0.1), transparent);
                }
            `}</style>
        </div>
    );
};

export default ScrollShadow;
