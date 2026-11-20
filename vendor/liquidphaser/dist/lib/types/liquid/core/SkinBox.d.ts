/**
 * com.liquid.core.SkinBox（逐行直译自 AS3 源码，Phaser 4 适配版）。
 * 渲染双路径：
 * - 标准 3×3 叶子网格（SkinAsset 产出的 grid 恒为此形态）→ 单个 Phaser NineSlice
 *   换 texture/frame 快路径（AS3 语义 → Phaser 等价物：pixi NineSliceSprite →
 *   Phaser.GameObjects.NineSlice + setOrigin(0,0) 左上角锚）；
 * - 非标准 grid（嵌套/非 3×3）→ LiquidMapper 逐 cell 渲染兜底。
 * 尺寸语义与 AS3 一致：实际渲染尺寸取 _grid 的（被 minSize 钳制后的）宽高。
 * TS 附加：debugDraw()（透传 LiquidGrid.debugDraw，demo 用；P5 接 Phaser Graphics）、
 * FORCE_FALLBACK（渲染路径对照开关）。
 */
import Phaser from 'phaser';
import { Sprite } from '../../fl/display/Sprite';
import { BitmapData } from '../../fl/display/BitmapData';
export declare class SkinBox extends Sprite {
    /** 对照开关：true 时强制走 LiquidMapper 兜底渲染（demo 验证用） */
    static FORCE_FALLBACK: boolean;
    private _grid;
    private _skin;
    private _state;
    private _skinReady;
    private _colors;
    private _width;
    private _height;
    private _plane;
    private _fallback;
    private _useFallback;
    constructor(pW: number, pH: number);
    get isReady(): boolean;
    get minWidth(): number;
    get minHeight(): number;
    setSize(pw: number, ph: number): this;
    get width(): number;
    set width(pw: number);
    get height(): number;
    set height(ph: number);
    /** AS3 state 语义（Phaser GameObject.state 同名，TS 要求 override）。
     * 注意：Phaser GameObject 基类构造器会写 this.state=0（引擎初始值），发生在
     * super() 期间、TS 字段初始化器之前——stomp 时 _state 尚未初始化，此处直接忽略；
     * fl 初始值由字段初始化器提供（同为 0，无语义差异） */
    set state(s: number);
    get state(): number;
    nbLayers(): number;
    setSkin(pBmp: BitmapData | null): void;
    getColor(): number;
    drawNow(): void;
    resetSize(): void;
    /** TS 附加：debug 透传（demo 叠加对照 cell 划分；P5 已接 Phaser Graphics） */
    debugDraw(g: Phaser.GameObjects.Graphics, addx?: number, addy?: number): void;
    private static isPlainScale9;
    private render;
}
