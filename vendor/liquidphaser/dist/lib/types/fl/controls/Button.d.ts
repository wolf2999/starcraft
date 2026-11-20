import { DisplayObject } from '../display/DisplayObject';
import { LabelButton } from './LabelButton';
export declare class Button extends LabelButton {
    protected static defaultStyles: Record<string, unknown>;
    protected _emphasized: boolean;
    protected emphasizedBorder: DisplayObject | null;
    get emphasized(): boolean;
    set emphasized(value: boolean);
    protected draw(): void;
    protected drawEmphasized(): void;
    protected drawLayout(): void;
}
