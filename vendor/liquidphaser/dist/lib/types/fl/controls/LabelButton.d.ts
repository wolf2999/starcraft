import { DisplayObject } from '../display/DisplayObject';
import { TextField } from '../text/TextField';
import { BaseButton } from './BaseButton';
export declare class LabelButton extends BaseButton {
    protected static defaultStyles: Record<string, unknown>;
    textField: TextField | null;
    protected icon: DisplayObject | null;
    private _label;
    private _labelPlacement;
    protected configUI(): void;
    /** AS3 label 语义（Phaser 无同名成员，独立声明） */
    get label(): string;
    set label(value: string);
    get labelPlacement(): string;
    set labelPlacement(value: string);
    protected drawIcon(): void;
    protected drawTextFormat(): void;
    protected drawLayout(): void;
}
