/**
 * fl.controls.RadioButtonGroup shim（按 fl 公开行为重建）。
 * 按 groupName 注册静态组；selection 切换时反选其他成员并派发 Event.CHANGE（bubbles）。
 */
import { EventDispatcher } from '../events/EventDispatcher';
import type { RadioButton } from './RadioButton';
export declare class RadioButtonGroup extends EventDispatcher {
    private static groups;
    static getGroup(name: string): RadioButtonGroup;
    private _name;
    private _radios;
    private _selection;
    constructor(name: string);
    get name(): string;
    get selection(): RadioButton | null;
    set selection(value: RadioButton | null);
    get selectedData(): unknown;
    get radioButtons(): RadioButton[];
    addInstance(instance: RadioButton): void;
    removeInstance(instance: RadioButton): void;
}
