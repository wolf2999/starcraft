/**
 * fl.controls.BaseScrollPane shim（按 fl 公开行为重建，fl 源码不在 pngas 内）。
 * 滚动容器基类（SelectableList/ScrollPane 的公共层）：
 * - content 容器 + 像素级滚动：fl 用 content.scrollRect 承载视口裁剪与滚动偏移；
 *   TS 侧等价实现为固定位置裁剪 mask + content 平移（视觉语义一致）；
 * - 垂直/水平 ScrollBar（fl ScrollBar，Liquid 子类会整体替换），SCROLL_BAR_STYLES
 *   拷贝样式，handleScroll 回写滚动位置；
 * - drawLayout：计算可用区域（contentPadding + 滚动条占位）、摆放 content/裁剪/
 *   滚动条，并经 updateScrollProperties 钩子设置滚动度量（SelectableList 覆写为
 *   行单位滚动，ScrollPane 保持像素单位）；
 * - drawBackground：upSkin/disabledSkin 按 enabled 切换（LiquidScrollPane/List
 *   直接以 SkinBox 充当这两个样式值）。
 * 与 Flash 的差异（注释标注）：滚动度量钳制为 max(0, content - available)（fl
 * 精确源码不可得，取文档语义）；视口裁剪为 Phaser 4 WebGL FilterList Mask
 *（filters 为 WebGL 专属，Canvas 渲染器下无裁剪——demo 跑 AUTO→WebGL）。
 */
import Phaser from 'phaser';
import { UIComponent } from '../core/UIComponent';
import { DisplayObject } from '../display/DisplayObject';
import { Sprite } from '../display/Sprite';
import { Rectangle } from '../geom/Rectangle';
import { ScrollEvent } from '../events/ScrollEvent';
import { ScrollBar } from './ScrollBar';
export declare class BaseScrollPane extends UIComponent {
    protected static defaultStyles: Record<string, unknown>;
    /** 子部件样式映射：键=子组件样式名，值=BaseScrollPane 样式名（fl 语义） */
    protected static SCROLL_BAR_STYLES: Record<string, string>;
    protected background: DisplayObject | null;
    protected _horizontalScrollBar: ScrollBar;
    protected _verticalScrollBar: ScrollBar;
    /** 滚动内容容器（fl 的 content，子类把单元格/源对象放入此处） */
    protected content: Sprite;
    /** fl content.scrollRect 的对应物：视口尺寸（滚动偏移由 content 平移承载） */
    protected contentScrollRect: Rectangle;
    /** 视口裁剪用 Graphics（AS3 语义 → Phaser 等价物：pixi Graphics mask →
     * Phaser 4 FilterList Mask 的 mask 源对象；visible=false 时 Container 正常
     * 渲染会跳过它，而 FilterList capture 直渲不受 visible 影响，两不误） */
    protected _contentMask: Phaser.GameObjects.Graphics;
    private _contentMaskFilter;
    protected defaultLineScrollSize: number;
    protected _verticalScrollPolicy: string;
    protected _horizontalScrollPolicy: string;
    protected _verticalScrollPosition: number;
    protected _horizontalScrollPosition: number;
    protected _scrollDrag: boolean;
    protected _useFixedHorizontalScrollPosition: boolean;
    protected _availableWidth: number;
    protected _availableHeight: number;
    protected configUI(): void;
    get verticalScrollPosition(): number;
    set verticalScrollPosition(value: number);
    get horizontalScrollPosition(): number;
    set horizontalScrollPosition(value: number);
    /** fl 未文档化公开访问器（LiquidComboBox 经 list.verticalScrollBar 监听 SCROLL） */
    get verticalScrollBar(): ScrollBar;
    get horizontalScrollBar(): ScrollBar;
    get maxVerticalScrollPosition(): number;
    get maxHorizontalScrollPosition(): number;
    get verticalScrollPolicy(): string;
    set verticalScrollPolicy(value: string);
    get horizontalScrollPolicy(): string;
    set horizontalScrollPolicy(value: string);
    get scrollDrag(): boolean;
    set scrollDrag(value: boolean);
    get useFixedHorizontalScrollPosition(): boolean;
    set useFixedHorizontalScrollPosition(value: boolean);
    get contentPadding(): number;
    set contentPadding(value: number);
    protected handleScroll: (e: ScrollEvent) => void;
    protected draw(): void;
    /** 内容绘制钩子（fl 中由 SelectableList.drawList/ScrollPane 内联；拆出保证布局先行） */
    protected drawScrollContent(): void;
    protected drawBackground(): void;
    protected drawLayout(): void;
    /** 滚动度量钩子（fl 在 drawLayout 内联设置；拆出供 SelectableList 覆写行单位语义） */
    protected updateScrollProperties(): void;
    /** content 内容尺寸（未滚动时的包围盒） */
    protected contentWidth(): number;
    protected contentHeight(): number;
    /** fl scrollRect 偏移的等价物：content 平移 = (pad - hpos, pad - vpos) */
    protected applyContentOffset(): void;
}
