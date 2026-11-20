/**
 * flash.text.TextFormatAlign shim（常量与 AS3 一致）。
 * 注意：字符串值与 TextFieldAutoSize 同名常量相同（"left"/"center"/"right"），
 * LiquidLabel.drawLayout 里跨用 switch(tf.align) case TextFieldAutoSize.XXX 的
 * 原版代码正是依赖这一点才能工作（1:1 保留该行为）。
 */
export declare class TextFormatAlign {
    static readonly LEFT: string;
    static readonly CENTER: string;
    static readonly RIGHT: string;
    static readonly JUSTIFY: string;
    private constructor();
}
