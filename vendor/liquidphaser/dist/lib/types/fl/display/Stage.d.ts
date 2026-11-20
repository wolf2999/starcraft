/**
 * flash.display.Stage shim（最小子集）。
 * - 全局顶层显示容器：LiquidComboBox 把下拉列表/遮罩挂到 stage（Flash 语义：
 *   脱离组件父级避免被裁剪，坐标用全局坐标）；
 * - stageWidth/stageHeight 由 main.ts 用 app.screen 尺寸维护。
 */
import { DisplayObject } from './DisplayObject';
import { Sprite } from './Sprite';
export declare class Stage extends Sprite {
    /** Stage 识别标记：DisplayObject.stage getter 沿显示列表上行时用它做 duck-typing
     * 判断（避免 import Stage 形成模块循环，见 DisplayObject.ts 顶部注释） */
    readonly isStage = true;
    private _stageWidth;
    private _stageHeight;
    constructor(stageWidth?: number, stageHeight?: number);
    get stageWidth(): number;
    get stageHeight(): number;
    setStageSize(w: number, h: number): void;
    /** fl DisplayObjectContainer.contains：child 为自身或后代 */
    contains(child: DisplayObject): boolean;
    /** fl removeChild：非直接子级时抛 ArgumentError；下拉动画收尾时序在 TS 下
     * 可能出现重复摘除，此处宽松化（不存在时静默返回）并注释差异。
     * 直接子级判定经 parentContainer（shim 的 parent 访问器即读它）——raw Phaser
     * GameObject（如下拉遮罩 Graphics）没有 shim parent 访问器，同样适用 */
    removeChildSafe(child: DisplayObject): void;
}
