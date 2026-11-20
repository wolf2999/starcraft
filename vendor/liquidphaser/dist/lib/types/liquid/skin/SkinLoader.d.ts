/**
 * com.liquid.skin.SkinLoader（逐行直译自 AS3 源码）。
 * TS 实现差异：AS3 继承 Loader 用 URLLoader 机制；本移植用 Image + onload/onerror。
 * 原版 load() 中 `_state == STATE_LOADING`（比较而非赋值）的瑕疵不移植（构造后 state 本为 INIT，无行为影响）。
 * onerror 时保持原版的抛错行为（LiquidError.IO_ERROR）。
 */
import { EventDispatcher } from '../../fl/events/EventDispatcher';
import { BitmapData } from '../../fl/display/BitmapData';
export declare class SkinLoader extends EventDispatcher {
    static readonly STATE_INIT: number;
    static readonly STATE_LOADING: number;
    static readonly STATE_LOADED: number;
    static readonly STATE_ERROR: number;
    private _state;
    private _bmp;
    private _url;
    private _img;
    load(url: string): void;
    getState(): number;
    getBitmap(): BitmapData | null;
    private completeHandler;
    private errorHandler;
}
