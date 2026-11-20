/**
 * 指针事件桥（TS 附加适配层，AS3 无对应物）。
 * AS3 语义 → Phaser 等价物：pixi EventSystem 的「命中最深 interactive 目标 + 沿祖先链
 * 冒泡」模型 → Phaser 场景级 POINTER_DOWN/UP/MOVE + 命中列表（已按渲染序排序，
 * renderList index = 渲染层级，最上层在前）。
 * 与 Phaser 原生 GAMEOBJECT_POINTER_* 事件的差异：Phaser 会把事件发给命中列表里的
 * 每个对象（含被覆盖的下层兄弟），而 Flash/pixi 只派发给最顶层目标及其祖先链 ——
 * 本桥取命中列表第一个 DisplayObject 作为 target，复用 _ed 三阶段派发，语义归位。
 * localX/localY 取 target 局部坐标（P1 组件自身监听场景下与 Flash listener 空间一致；
 * 跨层级监听需要 listener 空间时再扩展）。
 */
import Phaser from 'phaser';
import { DisplayObject } from '../display/DisplayObject';
/** 全局指针订阅（AS3 stage 监听 MOVE/UP 的桥等价物：ScrollBar thumb 拖拽用）。
 * 不依赖命中测试——指针经过空隙/离开组件也持续回调（对齐 pixi globalpointermove）。 */
type GlobalPointerListener = (x: number, y: number) => void;
/** 订阅全局指针移动与释放（画布内/外释放都回调 up）；返回解绑函数 */
export declare function addGlobalPointerListener(onMove: GlobalPointerListener | null, onUp: GlobalPointerListener | null): () => void;
/** 接入场景输入（initRuntime 后、组件挂载前调用一次） */
export declare function attachPointerBridge(scene: Phaser.Scene): void;
/** 指针当前是否悬停在 target 子树内（BaseButton 释放态判定用） */
export declare function isPointerOver(target: DisplayObject): boolean;
export {};
