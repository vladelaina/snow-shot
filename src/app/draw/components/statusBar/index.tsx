import { Badge, Descriptions, theme } from 'antd';
import { CaptureStep, DrawState, getMaskBackgroundColor } from '../../types';
import Color from 'color';
import { FormattedMessage } from 'react-intl';
import { AppSettingsContext, AppSettingsGroup } from '@/app/contextWrap';
import { useContext } from 'react';

const StatusBar: React.FC<{
    loadingElements: boolean;
    captureStep: CaptureStep;
    drawState: DrawState;
}> = ({ loadingElements, captureStep }) => {
    const { token } = theme.useToken();
    const appSettings = useContext(AppSettingsContext);
    const { darkMode } = appSettings[AppSettingsGroup.Common];

    if (captureStep !== CaptureStep.Select) {
        return null;
    }
    return (
        <div className="status-bar">
            <Descriptions
                items={[
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
                ]}
            />

            <style jsx>{`
                .status-bar {
                    background-color: ${Color(getMaskBackgroundColor(darkMode))
                        .alpha(0.42)
                        .toString()};
                    position: fixed;
                    bottom: ${token.margin}px;
                    left: ${token.margin}px;
                    display: inline-block;
                    box-sizing: border-box;
                    padding: ${token.paddingXS}px;
                    border-radius: ${token.borderRadius}px;
                    width: 383px;
                }

                .status-bar :global(.ant-descriptions .ant-descriptions-item-label) {
                    color: rgba(255, 255, 255, 0.72) !important;
                }

                .status-bar
                    :global(
                        .ant-descriptions .ant-descriptions-item-content .ant-badge-status-text
                    ) {
                    color: white !important;
                }
            `}</style>
        </div>
    );
};

export default StatusBar;
