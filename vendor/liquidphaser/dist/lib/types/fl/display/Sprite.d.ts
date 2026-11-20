/**
 * flash.display.Sprite shim（最小子集，按需扩充）。
 */
import { DisplayObject } from './DisplayObject';
export declare class Sprite extends DisplayObject {
    /** buttonMode 便捷映射到 pixi cursor */
    get buttonMode(): boolean;
    set buttonMode(value: boolean);
}
