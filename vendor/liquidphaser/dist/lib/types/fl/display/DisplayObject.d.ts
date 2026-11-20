/**
 * flash.display.DisplayObject shim（Phaser 4 适配版）。
 * AS3 语义 → Phaser 等价物：
 * - pixi Container → Phaser.GameObjects.Container（position 即左上角锚，无 origin，
 *   与 pixi 左上角语义一致；直接 new 不会注册进场景 displayList，游离态安全）；
 * - 显示列表：addChild/removeChild/parent 映射 Phaser Container.add/remove/parentContainer；
 * - eventMode：'static' → setInteractive(hitArea, Rectangle.Contains)；
 *   'passive'/'none' → input.enabled=false（Phaser 命中测试跳过）；
 * - hitArea：组件局部坐标矩形，与 pixi 同语义。注意 Phaser 命中测试会把局部点加上
 *   displayOriginX/Y 再进 hitArea 回调，而 Container.displayOriginX = width*0.5 会污染
 *   坐标 → 此处覆写 displayOriginX/Y（与 originX/Y）恒 0，hitArea 保持纯局部矩形；
 * - position：Phaser Container.position 是子项迭代游标（数值），与 pixi 的点对象冲突 →
 *   构造器删除该实例属性后定义访问器，暴露 {x,y,set()} 门面（类型侧以 Omit 抹掉基类
 *   position 声明，运行时侧真正接管）；
 * - toLocal/toGlobal：经 getWorldTransformMatrix（沿 parentContainer 链合成）变换；
 *   假定 UI 挂默认相机（无滚动/缩放），world 坐标即屏坐标；
 * - AS3 三阶段事件模型不变：组合 _ed（EventDispatcher），冒泡沿本 shim 的 parent 链上行。
 */
import Phaser from 'phaser';
import { EventDispatcher } from '../events/EventDispatcher';
import type { Stage } from './Stage';
/** pixi ObservablePoint 门面：仅覆盖本库用到的 API（x/y/set） */
export interface PointFacade {
    x: number;
    y: number;
    set(x: number, y: number): void;
}
/** pixi v8 eventMode 子集 */
export type EventMode = 'static' | 'passive' | 'none';
/**
 * 类型桥：抹掉基类 position（数值游标）声明，让本类能用点对象访问器接管。
 * 同时抹掉与 fl 语义撞名的成员：
 * - scale（数值）→ pixi 点对象门面；
 * - setSize（返回 Container）→ fl 尺寸语义；
 * - data（Phaser Data Manager）→ fl CellRenderer.data（列表项数据，P3）；
 * - update（Phaser 场景步进钩子）→ fl ScrollPane.update（立即重绘，P3）。
 * 运行时行为不变（super 链仍是真 Phaser Container；被抹成员本库不依赖引擎侧调用）。
 */
type LooseContainer = Omit<Phaser.GameObjects.Container, 'position' | 'scale' | 'setSize' | 'data' | 'update'>;
declare const Base: new (scene: Phaser.Scene, x?: number, y?: number) => LooseContainer;
export declare class DisplayObject extends Base {
    /** AS3 风格事件派发器（三阶段） */
    readonly _ed: EventDispatcher;
    private _eventMode;
    private _hitArea;
    private _cursor;
    constructor();
    addEventListener(type: string, listener: unknown, useCapture?: unknown, priority?: number): void;
    removeEventListener(type: string, listener: unknown, useCapture?: unknown): void;
    dispatchEvent(event: unknown): boolean;
    hasEventListener(type: string): boolean;
    willTrigger(type: string): boolean;
    /** pixi addChild（支持多参，返回 this） */
    addChild(...children: (DisplayObject | Phaser.GameObjects.GameObject)[]): this;
    addChildAt(child: DisplayObject | Phaser.GameObjects.GameObject, index: number): this;
    removeChild(child: DisplayObject): this;
    removeChildAt(index: number): DisplayObject;
    /** pixi removeChildren：移除全部子级（不销毁），返回被移除列表 */
    removeChildren(): DisplayObject[];
    getChildAt(index: number): DisplayObject;
    getChildIndex(child: DisplayObject): number;
    /** Phaser Container 无 setIndex：先摘后插（exclusive 模式下 remove/addAt 语义等价） */
    setChildIndex(child: DisplayObject, index: number): void;
    /** pixi parent 语义 → Phaser parentContainer */
    get parent(): DisplayObject | null;
    /** pixi position 点对象门面（基类数值游标已在构造器中删除） */
    get position(): PointFacade;
    set position(v: {
        x: number;
        y: number;
    });
    /** pixi scale 点对象门面 → Phaser scaleX/scaleY */
    get scale(): PointFacade;
    /** pixi v8 默认 'passive'：自身不参与命中，祖先 interactive 仍可达 */
    get eventMode(): EventMode;
    set eventMode(mode: EventMode);
    /** 组件局部坐标命中区（与 pixi 同语义；UIComponent.setSize 就地改 width/height，
     * 同一对象引用会透传给 Phaser input.hitArea，命中测试每帧现值生效） */
    get hitArea(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    set hitArea(area: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null);
    /** pixi cursor 语义：'pointer' 时 Phaser 会在悬停时设置画布光标 */
    get cursor(): string;
    set cursor(value: string);
    /** eventMode/hitArea → Phaser setInteractive 同步（构造期懒激活：hitArea 未就绪先记账） */
    private _syncInput;
    private static _matA;
    private static _matB;
    toLocal(p: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    toGlobal(p: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    get originX(): number;
    get originY(): number;
    get displayOriginX(): number;
    get displayOriginY(): number;
    /** AS3 name 语义：Phaser GameObject 自带 name（字符串） */
    name: string;
    /** AS3 stage 语义：沿显示列表上行找 Stage shim（未挂到 Stage 下时为 null，同 Flash）。
     * 不用 instanceof Stage（会形成循环导入，见文件顶部注释），改用 Stage 标记字段判断 */
    get stage(): Stage | null;
    /** fl DisplayObjectContainer.contains：child 为自身或后代（沿 parent 链判定） */
    contains(child: DisplayObject): boolean;
}
export {};
