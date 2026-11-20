import { DisplayObject } from '../display/DisplayObject';
import { BaseScrollPane } from '../controls/BaseScrollPane';
export declare class ScrollPane extends BaseScrollPane {
    protected _source: DisplayObject | null;
    get source(): DisplayObject | null;
    set source(value: DisplayObject | null);
    /** fl refreshPane：重载源内容（TS 侧无异步加载，等价为重测尺寸 + 重绘） */
    refreshPane(): void;
    /** fl update：立即重绘滚动度量 */
    update(): void;
    protected contentWidth(): number;
    protected contentHeight(): number;
}
