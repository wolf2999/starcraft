/**
 * fl.controls.Label shim（按 fl 公开行为重建）。
 * - text/autoSize/wordWrap 属性；textField 在 configUI 创建；
 * - drawLayout 声明于此（LiquidLabel 覆写它）；
 * - actualWidth 为 fl Label 内部测量宽度字段（LiquidLabel.drawLayout 引用），
 *   autoSize=NONE 时等于组件宽（重建假设，LiquidLabel 默认场景即此）。
 */
import { UIComponent } from '../core/UIComponent';
import { TextField } from '../text/TextField';
export declare class Label extends UIComponent {
    protected static defaultStyles: Record<string, unknown>;
    textField: TextField | null;
    protected actualWidth: number;
    private _text;
    private _autoSize;
    private _wordWrap;
    protected configUI(): void;
    get text(): string;
    set text(value: string);
    get autoSize(): string;
    set autoSize(value: string);
    get wordWrap(): boolean;
    set wordWrap(value: boolean);
    protected draw(): void;
    protected drawTextFormat(): void;
    protected drawLayout(): void;
}
