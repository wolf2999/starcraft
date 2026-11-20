/**
 * fl.managers.FocusManager 行为级最小重建（fl 源码不在 pngas 内）。
 * - window keydown 监听 Tab/Shift+Tab：DFS 遍历 root 下
 *   focusEnabled && enabled && visible 的 UIComponent 构成 Tab 序，循环移动焦点
 *   （fl KEY_FOCUS_CHANGE 的最小语义，不派发 keyFocusChange 事件）；
 * - 共享 focusRect：直接使用 LiquidManager 的单例 SkinBox（getFocusSkinBox()），
 *   聚焦时移动到目标组件顶部（外扩 focusRectPadding），失焦/置空时摘除；
 * - TS 附加：collectFocusables 顺带把自身赋给发现的组件（fl 中组件经 stage
 *   机制取得 focusManager，此处 DFS 自动接线，晚添加组件在下次 Tab 时补接）。
 */
import { UIComponent } from '../core/UIComponent';
import { DisplayObject } from '../display/DisplayObject';
export declare class FocusManager {
    private _root;
    private _focused;
    constructor(root: DisplayObject);
    /** fl FocusManager.getFocus：当前焦点组件 */
    getFocus(): UIComponent | null;
    /** fl FocusManager.setFocus：程序化设焦点；置空则摘除焦点框 */
    setFocus(component: UIComponent | null): void;
    /** 组件自行获得焦点（点击输入框/按钮）时由组件回调：同步状态并显示焦点框 */
    notifyFocus(component: UIComponent): void;
    /** fl UIComponent.drawFocus 落点 */
    drawFocusFor(component: UIComponent, on: boolean): void;
    destroy(): void;
    /** Tab/Shift+Tab → 焦点循环移动（preventDefault 拦截浏览器原生 Tab 焦点）；
     *  其余按键 → 以 KEY_DOWN 转发到焦点组件（fl：Player 经 display list 路由键盘事件） */
    private keyDownHandler;
    /** DFS 收集 root 下可聚焦组件（顺带自动接线 focusManager） */
    private collectFocusables;
    /** 把共享 focusRect SkinBox 移动到组件顶部（外扩 focusRectPadding 包围组件） */
    private showFocusRect;
    private hideFocusRect;
}
