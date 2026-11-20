interface Invalidatable {
    validateNow(): void;
}
export declare function invalidateComponent(c: Invalidatable): void;
export declare function flushInvalidations(): void;
/** 在 initRuntime 之后调用一次：挂到 Phaser 主循环 POST_STEP（每帧） */
export declare function attachInvalidationTicker(): void;
export {};
