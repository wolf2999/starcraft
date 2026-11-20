/**
 * com.liquid.listClasses.LiquidListData（直译自 AS3 源码）。
 * 实现差异：AS3 源码构造函数体内为 `super(); { }`（嵌套花括号、未向 super 传参，
 * 疑似反编译产物/原版笔误）——若按字面移植，listData.label 恒为 null，
 * LiquidListCellRenderer 的 label 注入将失效、所有单元格无文字（与发布 SWF 的
 * 实际行为矛盾）。此处按行为直译：参数透传给 ListData。
 */
import { ListData } from '../../fl/controls/listClasses/ListData';
import type { UIComponent } from '../../fl/core/UIComponent';
export declare class LiquidListData extends ListData {
    constructor(label: string, icon: unknown, owner: UIComponent, index: number, row: number, col?: number);
}
