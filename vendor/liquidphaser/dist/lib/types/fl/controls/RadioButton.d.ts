import { CheckBox } from './CheckBox';
import { RadioButtonGroup } from './RadioButtonGroup';
export declare class RadioButton extends CheckBox {
    protected _value: unknown;
    protected _group: RadioButtonGroup | null;
    protected configUI(): void;
    get groupName(): string;
    set groupName(groupName: string);
    get group(): RadioButtonGroup | null;
    set group(group: RadioButtonGroup);
    get value(): unknown;
    set value(value: unknown);
    get selected(): boolean;
    set selected(value: boolean);
    /** 单选钮点击不可取消选中 */
    protected toggleSelected(): void;
}
