/**
 * fl.controls.CheckBox shim（按 fl 公开行为重建）。
 * configUI 置 toggle=true；图标/文本布局由 LabelButton 链承担。
 */
import { LabelButton } from './LabelButton';
export declare class CheckBox extends LabelButton {
    protected configUI(): void;
}
