// import { StraightLineIcon } from '@/components/icons';
// import { Button } from 'antd';
// import { withPickerBase } from './pickerBase';
// import { KeyEventKey, KeyEventWrap } from '../keyEventWrap/index';
// import { getButtonTypeByState } from '../../extra';
// import { defaultEnableStraightLineValue, EnableStraightLineValue } from './defaultValues';

// const EnableStraightLinePickerComponent: React.FC<{
//     value: EnableStraightLineValue;
//     tempValue: EnableStraightLineValue | undefined;
//     setValue: React.Dispatch<React.SetStateAction<EnableStraightLineValue>>;
//     setTempValue: React.Dispatch<React.SetStateAction<EnableStraightLineValue | undefined>>;
// }> = ({ value, tempValue, setValue, setTempValue }) => {
//     const enableStraightLine = tempValue ? tempValue.enable : value.enable;

//     return (
//         <KeyEventWrap
//             onKeyDown={() => {
//                 setTempValue({ enable: !value.enable });
//             }}
//             onKeyUp={() => {
//                 setTempValue(undefined);
//             }}
//             componentKey={KeyEventKey.EnableStraightLinePicker}
//         >
//             <Button
//                 icon={<StraightLineIcon style={{ fontSize: '0.9em' }} />}
//                 type={getButtonTypeByState(enableStraightLine)}
//                 onClick={() => {
//                     setValue((prev) => ({ enable: !prev.enable }));
//                 }}
//             />
//         </KeyEventWrap>
//     );
// };

// export const EnableStraightLinePicker = withPickerBase(
//     EnableStraightLinePickerComponent,
//     'enableStraightLinePicker',
//     defaultEnableStraightLineValue,
// );
