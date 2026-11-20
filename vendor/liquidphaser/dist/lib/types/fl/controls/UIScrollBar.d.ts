/**
 * fl.controls.UIScrollBar shim（按 fl 公开行为重建，fl 源码不在 pngas 内）。
 * 职责：把 ScrollBar 绑定到一个 TextField——
 * - scrollTarget 绑定/解绑（监听 Event.SCROLL 同步滚动条属性）；
 * - updateScrollTargetProperties：垂直 → setScrollProperties(height,1,maxScrollV)+
 *   scrollPosition=scrollV；水平 → setScrollProperties(width,0,maxScrollH)+
 *   scrollPosition=scrollH（fl 文档语义）；
 * - 位置变化（拖拽/箭头/轨道/程序设置）反向推给 target（scrollV/scrollH）。
 * 同步回路收敛性：推给 target 后 target 仅在值变化时再派发 SCROLL，二次同步值相同即停。
 */
import { Event } from '../events/Event';
import { TextField } from '../text/TextField';
import { ScrollBar } from './ScrollBar';
export declare class UIScrollBar extends ScrollBar {
    protected _scrollTarget: TextField | null;
    get scrollTarget(): TextField | null;
    set scrollTarget(value: TextField | null);
    /** 覆写访问器必须同时提供 getter：JS 子类 set-only accessor 读取会返回 undefined（不回落父类 getter） */
    get direction(): string;
    set direction(value: string);
    /** 同上：仅覆写 setter 时，本类实例读 scrollPosition 得 undefined → NaN → 同步死循环 */
    get scrollPosition(): number;
    set scrollPosition(value: number);
    /** 内部位置变更（拖拽/箭头/轨道）同样要推给 target */
    protected setScrollPosition(newScrollPosition: number, fireEvent: boolean): void;
    /** 把滚动条位置推给 target */
    protected updateScrollTarget(): void;
    /** target 滚动（文本变化/程序设置）→ 同步滚动条属性（fl updateScrollTargetProperties 重建） */
    protected handleTargetScroll: (_e: Event) => void;
    protected updateScrollTargetProperties(): void;
}
