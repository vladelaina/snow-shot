// import { LockWidthHeightIcon } from '@/components/icons';
// import { Button } from 'antd';
// import { withPickerBase } from './pickerBase';
// import { KeyEventKey, KeyEventWrap } from '../keyEventWrap/index';
// import { getButtonTypeByState } from '../../extra';
// import { defaultLockWidthHeightValue, LockWidthHeightValue } from './defaultValues';

// const LockWidthHeightPickerComponent: React.FC<{
//     value: LockWidthHeightValue;
//     tempValue: LockWidthHeightValue | undefined;
//     setValue: React.Dispatch<React.SetStateAction<LockWidthHeightValue>>;
//     setTempValue: React.Dispatch<React.SetStateAction<LockWidthHeightValue | undefined>>;
// }> = ({ value, tempValue, setValue, setTempValue }) => {
//     const enableLockWidthHeight = tempValue ? tempValue.lock : value.lock;

//     return (
//         <KeyEventWrap
//             onKeyDown={() => {
//                 setTempValue({ lock: !value.lock });
//             }}
//             onKeyUp={() => {
//                 setTempValue(undefined);
//             }}
//             componentKey={KeyEventKey.LockWidthHeightPicker}
//         >
//             <Button
//                 icon={<LockWidthHeightIcon style={{ fontSize: '0.9em' }} />}
//                 type={getButtonTypeByState(enableLockWidthHeight)}
//                 onClick={() => {
//                     setValue((prev) => ({ lock: !prev.lock }));
//                 }}
//             />
//         </KeyEventWrap>
//     );
// };

// export const LockWidthHeightPicker = withPickerBase(
//     LockWidthHeightPickerComponent,
//     'lockWidthHeightPicker',
//     defaultLockWidthHeightValue,
// );
