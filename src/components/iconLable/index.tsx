import { theme } from 'antd';

export const IconLabel: React.FC<{ icon?: React.ReactNode; label: React.ReactNode }> = ({
    icon,
    label,
}) => {
    const { token } = theme.useToken();
    return (
        <div className="icon-label">
            <div className="icon-label-label">{label}</div>
            {icon && <div className="icon-label-icon">{icon}</div>}

            <style jsx>{`
                .icon-label {
                    display: flex;
                    align-items: center;
                }

                .icon-label .icon-label-icon {
                    margin-left: ${token.marginXXS}px;
                    height: 100%;
                }
            `}</style>
        </div>
    );
};
