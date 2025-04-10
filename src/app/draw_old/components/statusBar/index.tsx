import { Badge, Descriptions, theme } from 'antd';
import { CaptureStep, DrawState, getMaskBackgroundColor } from '../../types';
import Color from 'color';
import { FormattedMessage } from 'react-intl';
import { AppSettingsContext, AppSettingsGroup } from '@/app/contextWrap';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardIcon } from '@/components/icons';
import { DescriptionsItemType } from 'antd/es/descriptions';
import { zIndexs } from '@/utils/zIndex';
import { DrawContext } from '../../context';
import { isEnableColorPicker } from '../colorPicker';

const KeyLabel: React.FC<{
    messageId?: string;
    hotKey?: string;
}> = ({ messageId, hotKey }) => {
    return (
        <div className="descriptions-item-btn-label">
            <div className="descriptions-item-btn-label-icon">
                <KeyboardIcon />
            </div>
            {messageId && <FormattedMessage id={messageId} />}
            {hotKey}
        </div>
    );
};

const StatusBar: React.FC<{
    loadingElements: boolean;
    captureStep: CaptureStep;
    drawState: DrawState;
    enable: boolean;
}> = ({ loadingElements, captureStep, drawState, enable }) => {
    const enableRef = useRef(enable);
    useEffect(() => {
        enableRef.current = enable;
    }, [enable]);

    const { token } = theme.useToken();
    const appSettings = useContext(AppSettingsContext);
    const { darkMode } = appSettings[AppSettingsGroup.Common];
    const {
        colorPickerCopy: { hotKey: colorPickerCopyHotKey },
        colorPickerMoveUp: { hotKey: colorPickerMoveUpHotKey },
        colorPickerMoveDown: { hotKey: colorPickerMoveDownHotKey },
        colorPickerMoveLeft: { hotKey: colorPickerMoveLeftHotKey },
        colorPickerMoveRight: { hotKey: colorPickerMoveRightHotKey },
        lockWidthHeightPicker: { hotKey: lockWidthHeightPickerHotKey },
        lockAnglePicker: { hotKey: lockAnglePickerHotKey },
    } = appSettings[AppSettingsGroup.DrawToolbarKeyEvent];

    const { maskRectClipPathRef } = useContext(DrawContext);

    const [isHover, setIsHover] = useState(false);

    const descriptionsItems = useMemo(() => {
        const items: DescriptionsItemType[] = [];

        if (captureStep === CaptureStep.Select) {
            [
                {
                    key: 'autoSelectWindowElement',
                    label: <FormattedMessage id="draw.autoSelectWindowElement" />,
                    children: (
                        <Badge
                            status={loadingElements ? 'processing' : 'success'}
                            text={
                                loadingElements ? (
                                    <FormattedMessage id="draw.autoSelectWindowElement.loading" />
                                ) : (
                                    <FormattedMessage id="draw.autoSelectWindowElement.loaded" />
                                )
                            }
                        />
                    ),
                },
                {
                    key: 'selectWindowOrElement',
                    label: <FormattedMessage id="draw.selectWindowOrElement" />,
                    children: <KeyLabel messageId="draw.tabKey" />,
                },
                {
                    key: 'changeSelectLevel',
                    label: <FormattedMessage id="draw.changeSelectLevel" />,
                    children: <KeyLabel messageId="draw.mouseWheel" />,
                },
            ].forEach((item) => {
                items.push(item);
            });
        }

        if (isEnableColorPicker(captureStep, drawState)) {
            [
                {
                    key: 'colorPickerCopy',
                    label: <FormattedMessage id="draw.colorPickerCopy" />,
                    children: <KeyLabel hotKey={colorPickerCopyHotKey} />,
                },
                {
                    key: 'colorPickerMoveUp',
                    label: <FormattedMessage id="draw.colorPickerMoveUp" />,
                    children: <KeyLabel hotKey={colorPickerMoveUpHotKey} />,
                },
                {
                    key: 'colorPickerMoveDown',
                    label: <FormattedMessage id="draw.colorPickerMoveDown" />,
                    children: <KeyLabel hotKey={colorPickerMoveDownHotKey} />,
                },
                {
                    key: 'colorPickerMoveLeft',
                    label: <FormattedMessage id="draw.colorPickerMoveLeft" />,
                    children: <KeyLabel hotKey={colorPickerMoveLeftHotKey} />,
                },
                {
                    key: 'colorPickerMoveRight',
                    label: <FormattedMessage id="draw.colorPickerMoveRight" />,
                    children: <KeyLabel hotKey={colorPickerMoveRightHotKey} />,
                },
            ].forEach((item) => {
                items.push(item);
            });
        }

        if (drawState === DrawState.Rect || drawState === DrawState.Ellipse) {
            items.push({
                key: 'lockWidthHeightPicker',
                label: <FormattedMessage id="draw.lockWidthHeightPicker" />,
                children: <KeyLabel hotKey={lockWidthHeightPickerHotKey} />,
            });
        }

        if (drawState === DrawState.Arrow) {
            items.push({
                key: 'lockAnglePicker',
                label: <FormattedMessage id="draw.lockAnglePicker" />,
                children: <KeyLabel hotKey={lockAnglePickerHotKey} />,
            });
        }

        if (
            drawState === DrawState.Pen ||
            drawState === DrawState.Eraser ||
            drawState === DrawState.Highlight ||
            drawState === DrawState.Mosaic
        ) {
            items.push({
                key: 'penDrawLine',
                label: <FormattedMessage id="draw.penDrawLine" />,
                children: <KeyLabel messageId="draw.shiftKey" />,
            });
        }
        return items;
    }, [
        loadingElements,
        captureStep,
        drawState,
        colorPickerCopyHotKey,
        colorPickerMoveUpHotKey,
        colorPickerMoveDownHotKey,
        colorPickerMoveLeftHotKey,
        colorPickerMoveRightHotKey,
        lockWidthHeightPickerHotKey,
        lockAnglePickerHotKey,
    ]);

    const statusBarRef = useRef<HTMLDivElement>(null);
    const renderedRef = useRef(true);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!renderedRef.current) {
                return;
            }

            requestAnimationFrame(() => {
                renderedRef.current = true;

                if (!enableRef.current) {
                    return;
                }

                const statusBar = statusBarRef.current;
                if (!statusBar) {
                    return;
                }

                const { clientX, clientY } = e;

                const statusBarMaxX = statusBar.clientWidth + statusBar.offsetLeft;
                const statusBarMinY = statusBar.offsetTop;

                if (clientX < statusBarMaxX && clientY > statusBarMinY) {
                    setIsHover(true);
                    return;
                }

                const maskRect = maskRectClipPathRef.current;
                if (!maskRect) {
                    setIsHover(false);
                    return;
                }

                let maskRectLeft = maskRect.left;
                let maskRectTop = maskRect.top;
                let maskRectWidth = maskRect.width;
                let maskRectHeight = maskRect.height;

                // 可能是负宽度，这里转换下
                if (maskRectWidth < 0) {
                    maskRectLeft += maskRectWidth;
                    maskRectWidth = -maskRectWidth;
                }

                if (maskRectHeight < 0) {
                    maskRectTop += maskRectHeight;
                    maskRectHeight = -maskRectHeight;
                }

                // 矩形现在是正的了，只判断左下角即可
                if (maskRectLeft < statusBarMaxX && maskRectTop + maskRectHeight > statusBarMinY) {
                    setIsHover(true);
                    return;
                }

                setIsHover(false);
            });
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [maskRectClipPathRef]);

    return (
        <div
            className="status-bar"
            ref={statusBarRef}
            style={{ opacity: descriptionsItems.length === 0 || !enable || isHover ? 0 : 1 }}
        >
            <div className="status-bar-content">
                <Descriptions column={1} items={descriptionsItems} />
            </div>

            <style jsx>{`
                .status-bar {
                    position: fixed;
                    bottom: 0px;
                    left: 0px;
                    padding: ${token.paddingLG}px ${token.paddingLG}px ${token.padding}px
                        ${token.padding}px;
                    transition: opacity ${token.motionDurationMid} ${token.motionEaseInOut};
                    opacity: ${descriptionsItems.length > 0 ? 1 : 0};
                    pointer-events: none;
                    display: inline-block;
                    z-index: ${zIndexs.Draw_StatusBar};
                    min-width: 383px;
                    box-sizing: border-box;
                }

                .status-bar-content {
                    background-color: ${Color(getMaskBackgroundColor(darkMode))
                        .alpha(0.42)
                        .toString()};
                    display: inline-block;
                    box-sizing: border-box;
                    padding: ${token.padding}px ${token.padding}px;
                    border-radius: ${token.borderRadius}px;
                }

                .status-bar-content :global(.ant-descriptions .ant-descriptions-item-label) {
                    color: rgba(255, 255, 255, 0.72) !important;
                }

                .status-bar-content
                    :global(
                        .ant-descriptions .ant-descriptions-item-content .ant-badge-status-text
                    ),
                :global(.ant-descriptions-item-content) {
                    color: white !important;
                }

                .status-bar-content :global(.descriptions-item-btn-label) {
                    margin-left: ${token.padding}px;
                    margin-right: ${token.marginXS + token.padding}px;
                    display: flex;
                    align-items: center;
                    position: relative;
                }

                .status-bar-content :global(.descriptions-item-btn-label)::after {
                    content: '';
                    display: block;
                    position: absolute;
                    top: -${token.paddingXXS / 2}px;
                    left: -${token.padding}px;
                    width: 100%;
                    height: 100%;
                    padding: ${token.paddingXXS / 2}px ${token.padding}px;
                    border-radius: ${token.borderRadius}px;
                    border: 1px solid currentColor;
                }

                .status-bar-content
                    :global(.descriptions-item-btn-label .descriptions-item-btn-label-icon) {
                    margin-right: ${token.marginXS}px;
                }

                .status-bar-content :global(.ant-descriptions) {
                    display: inline-block;
                }

                .status-bar-content :global(.ant-descriptions-view) {
                    display: inline-block;
                }

                .status-bar-content :global(.ant-descriptions-view table) {
                    display: inline-block;
                }
            `}</style>
        </div>
    );
};

export default StatusBar;
