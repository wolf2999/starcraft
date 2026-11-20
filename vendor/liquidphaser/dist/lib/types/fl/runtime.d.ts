/**
 * Phaser 运行时注册表（TS 附加适配层，AS3 无对应物）。
 * pixi 版组件可脱离 App 单独 new；Phaser 的 GameObject 构造必须持有 scene 引用。
 * 本移植约定：main.ts 在 scene.create() 开头调用 initRuntime()，
 * 之后任何时机（含动态 import、下拉弹层等运行期构造）的组件都能取到活动 scene。
 */
import Phaser from 'phaser';
/** Phaser.Game 就绪后调用一次（scene.create 内） */
export declare function initRuntime(game: Phaser.Game, scene: Phaser.Scene): void;
export declare function getActiveGame(): Phaser.Game;
export declare function getActiveScene(): Phaser.Scene;
export declare function nextUid(): string;
/**
 * 把 canvas 注册为 Phaser 纹理（同源复用已注册的 key）。
 * BitmapData.source 懒创建走这里；SkinAsset 缓存保证同一 BitmapData 只建一次。
 */
export declare function addCanvasTexture(canvas: HTMLCanvasElement): Phaser.Textures.Texture;
