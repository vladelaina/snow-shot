import { useContext } from 'react';
import { DrawContext } from '@/app/draw_old/context';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { KeyEventKey, KeyEventWrap } from './keyEventWrap';

export const SelectTool: React.FC = () => {
    const { fabricRef } = useContext(DrawContext);
    return (
        <KeyEventWrap onKeyDownEventPropName="onClick" componentKey={KeyEventKey.RemoveTool} enable>
            <Button
                icon={<DeleteOutlined style={{ fontSize: '0.83em' }} />}
                type="text"
                onClick={() => {
                    const activeObject = fabricRef.current?.getActiveObject();
                    if (!activeObject) {
                        return;
                    }

                    fabricRef.current?.remove(activeObject);
                }}
            />
        </KeyEventWrap>
    );
};
