/**
 * flash.text.TextFormat shim（纯数据类，字段与 AS3 同名同序）。
 * 未用到的低频字段（bullet/kerning/tabStops 等）省略；Liquid 组件仅依赖
 * font/size/color/bold/italic/align/leading/letterSpacing。
 * 各字段默认 null（同 AS3 的 Object 默认），表示"未指定、沿用上次设置"。
 */
export declare class TextFormat {
    font: string | null;
    size: number | null;
    color: number | null;
    bold: boolean | null;
    italic: boolean | null;
    underline: boolean | null;
    url: string | null;
    target: string | null;
    align: string | null;
    leftMargin: number | null;
    rightMargin: number | null;
    indent: number | null;
    leading: number | null;
    letterSpacing: number | null;
    constructor(font?: string | null, size?: number | null, color?: number | null, bold?: boolean | null, italic?: boolean | null, underline?: boolean | null, url?: string | null, target?: string | null, align?: string | null, leftMargin?: number | null, rightMargin?: number | null, indent?: number | null, leading?: number | null);
}
