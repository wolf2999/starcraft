import * as Phaser from "phaser";
import {
    TILE_W,
    TILE_H,
    HALF_W,
    HALF_H,
    FRAME_H,
    MAP_COLS,
    MAP_ROWS,
    worldToScreen,
} from "./iso";
import { setTerrain, TerrainType, GID_TERRAIN, HEIGHT } from "./terrain";

/**
 * 地形渲染方案说明：
 * 数据来源是 Tiled 导出的 public/maps/lost-temple.tmj（单一数据源，改图即生效），
 * 但**渲染**采用逐格 add.image 铺贴 + 自身等距投影，而非 Phaser 4 的 Tilemap 渲染管线。
 *
 * 原因：本项目实测 Phaser 4 的 Tilemap 渲染层（createLayer 返回的 GPULayer）在本机
 * 环境下瓦片完全不显示（纹理已确认有效、gid 映射正确，问题出在渲染管线本身）。
 * add.image 是 Phaser 最基础、最稳定的对象，逐格铺贴 100% 可控、对齐精确。
 *
 * tileset 规格（等距 2:1 菱形）：
 * - 单帧 TILE_W × FRAME_H（64×64）：菱形顶面画在帧内顶部（中心 y=HALF_H），
 *   顶面下缘向下延伸 ELEV 像素的“侧面带”（high/bridge/ramp 用，表现抬升）。
 * - 绘制锚点 = 菱形中心（origin 0.5 / HALF_H/FRAME_H），对齐 worldToScreen(格中心, h)，
 *   高地顶面由 h*ELEV 自动抬高，侧面带正好垂到地面格位置。
 * - 真美术资源按同样规格出图放到 public/maps/terrain.png 即可替换（帧序 low/high/ramp/water/bridge）。
 * - 注：.tmj 声明 tileheight=32（菱形高），本图集帧高 64 含侧带——Tiled 打开时帧对位
 *   会偏，但不影响本项目（渲染不经过 Tiled 的帧切割）。
 *
 * 瓦片顺序固定：第 1 格=low, 2=high, 3=ramp, 4=water, 5=bridge
 * （与 terrain.ts 的 TERRAIN_GID / GID_TERRAIN 一致）。
 */

// 地形在 tileset 中的绘制顺序 = gid 1..5，也对应子帧 terrain-0..4
const TERRAIN_ORDER: TerrainType[] = ["low", "high", "ramp", "water", "bridge"];

/** 每级高度侧带像素（与 iso.ts 的 ELEV 一致；此处独立声明避免循环依赖） */
const ELEV_PX = 16;

// 占位贴图配色（偏亮，确保在深色背景下可辨识），仅作临时观感
const TILE_COLOR: Record<TerrainType, { top: string; side: string; spec: string }> = {
    low: { top: "#4e8a3f", side: "#2f5a2c", spec: "#8fce6f" }, // 草地：亮绿
    high: { top: "#b59a5c", side: "#7a6533", spec: "#e6cf94" }, // 高地：土黄
    ramp: { top: "#7e9a5e", side: "#4f6b3c", spec: "#b6cf94" }, // 斜坡：草黄过渡
    water: { top: "#3a83b8", side: "#1f5a82", spec: "#bfe6ff" }, // 水：蓝
    bridge: { top: "#a07a4a", side: "#6f5230", spec: "#d6b07a" }, // 桥：木色
    void: { top: "#000000", side: "#000000", spec: "#000000" }, // 虚空：不渲染，仅占位
};

/** 简单确定性随机（不同地形用不同种子，纹理细节稳定不抖动） */
function seeded(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 菱形路径（中心 cx,cy）：上(cx,cy-16) 右(cx+32,cy) 下(cx,cy+16) 左(cx-32,cy) */
function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - HALF_H);
    ctx.lineTo(cx + HALF_W, cy);
    ctx.lineTo(cx, cy + HALF_H);
    ctx.lineTo(cx - HALF_W, cy);
    ctx.closePath();
}

/** 侧面带路径：菱形下两条边（左→下→右）向下拉高 ELEV 形成的“正面” */
function sideBandPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(cx - HALF_W, cy);
    ctx.lineTo(cx, cy + HALF_H);
    ctx.lineTo(cx + HALF_W, cy);
    ctx.lineTo(cx + HALF_W, cy + h);
    ctx.lineTo(cx, cy + HALF_H + h);
    ctx.lineTo(cx - HALF_W, cy + h);
    ctx.closePath();
}

/** 点是否在菱形内（用于散点装饰限制在顶面范围） */
function inDiamond(cx: number, cy: number, x: number, y: number): boolean {
    return Math.abs(x - cx) / HALF_W + Math.abs(y - cy) / HALF_H <= 1;
}

/** 在 2D 画布上下文里画一个等距菱形瓦片，顶面菱形中心 (cx,cy)，带地形细节与侧面带 */
function drawTerrainTile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    type: TerrainType
): void {
    const c = TILE_COLOR[type];

    // 侧面带（先画，在顶面下方；只有抬升类地形有）
    if (type === "high" || type === "bridge") {
        ctx.fillStyle = c.side;
        sideBandPath(ctx, cx, cy, ELEV_PX);
        ctx.fill();
    } else if (type === "ramp") {
        // 斜坡半高侧面
        ctx.fillStyle = c.side;
        sideBandPath(ctx, cx, cy, ELEV_PX / 2);
        ctx.fill();
    }

    // 顶面菱形
    diamondPath(ctx, cx, cy);
    ctx.fillStyle = c.top;
    ctx.fill();

    // 顶面装饰细节（确定性，散点限制在菱形内）
    const rnd = seeded(TERRAIN_ORDER.indexOf(type) * 9999 + 1);
    if (type === "low" || type === "ramp" || type === "high") {
        ctx.fillStyle = c.spec;
        for (let i = 0; i < 10; i++) {
            const px = cx + (rnd() * 2 - 1) * HALF_W;
            const py = cy + (rnd() * 2 - 1) * HALF_H;
            if (inDiamond(cx, cy, px, py)) ctx.fillRect(px, py, 1.5, 1.5);
        }
    }
    // 斜坡：沿水平对角线上半草地 / 下半土色（low→high 过渡）
    if (type === "ramp") {
        ctx.beginPath();
        ctx.moveTo(cx - HALF_W, cy);
        ctx.lineTo(cx + HALF_W, cy);
        ctx.lineTo(cx, cy + HALF_H);
        ctx.closePath();
        ctx.fillStyle = TILE_COLOR.high.top;
        ctx.fill();
    }
    // 水面：两道白色波纹（限制在菱形内）
    if (type === "water") {
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        for (const dy of [-3, 4]) {
            const yy = cy + dy;
            const halfSpan = HALF_W * (1 - Math.abs(yy - cy) / HALF_H) - 6;
            if (halfSpan <= 0) continue;
            ctx.beginPath();
            ctx.moveTo(cx - halfSpan, yy);
            ctx.lineTo(cx + halfSpan, yy);
            ctx.stroke();
        }
    }
    // 桥：横向木板缝（限制在菱形内） + 顶面前缘亮边
    if (type === "bridge") {
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const yy = cy - HALF_H + (TILE_H / 4) * i;
            const halfSpan = HALF_W * (1 - Math.abs(yy - cy) / HALF_H) - 3;
            ctx.beginPath();
            ctx.moveTo(cx - halfSpan, yy);
            ctx.lineTo(cx + halfSpan, yy);
            ctx.stroke();
        }
    }

    // 顶面菱形描边（高地/桥叠深色边强调“抬升”）
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.side;
    diamondPath(ctx, cx, cy);
    ctx.stroke();
}

/**
 * 确保地形纹理 "terrain" 存在并切分为 5 个子帧（terrain-0..4，对应 low..bridge）。
 * - 若 preload 已成功加载 public/maps/terrain.png，直接用（宽 > 0 即视为就绪）。
 * - 否则程序化生成占位纹理（canvas），再切子帧。
 * 子帧名固定为 terrain-{i}，渲染时按地形类型索引取对应帧。
 */
export function ensureTerrainTileset(scene: Phaser.Scene): void {
    const texMgr = scene.textures;
    const existing = texMgr.exists("terrain") ? texMgr.get("terrain") : null;
    const ready = !!existing && existing.getSourceImage().width > 0;

    if (!ready) {
        // 兜底：程序化生成占位地形纹理（5 格横排 64×64：菱形顶面 + 侧面带）
        const canvasTex = texMgr.createCanvas(
            "terrain",
            TILE_W * TERRAIN_ORDER.length,
            FRAME_H
        );
        if (!canvasTex) return;
        const ctx = canvasTex.getContext();
        TERRAIN_ORDER.forEach((type, i) => {
            drawTerrainTile(ctx, i * TILE_W + TILE_W / 2, HALF_H, type);
        });
        canvasTex.refresh();
    }

    // 把 320×64 的整图切成 5 个 64×64 子帧，命名为 terrain-0..4
    const tex = texMgr.get("terrain");
    for (let i = 0; i < TERRAIN_ORDER.length; i++) {
        const fk = "terrain-" + i;
        if (!tex.has(fk)) {
            tex.add(fk, 0, i * TILE_W, 0, TILE_W, FRAME_H);
        }
    }
}

/**
 * 构建地形：从 Tiled 地图（maps/lost-temple.tmj）读取 gid 网格，
 * 逐格铺贴 add.image 渲染，并反推地形网格写入 terrain 模块（单一数据源）。
 * @param parent 地图层容器（Container），瓦片会 add 进它而不是根显示列表，
 *               这样 DevTools inspector 能按“地图层”归类全部地形瓦片。
 */
export function buildTerrainTilemap(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container
): void {
    ensureTerrainTileset(scene);

    const map = scene.make.tilemap({ key: "lost-temple" });
    const grid: TerrainType[][] = [];

    for (let y = 0; y < MAP_ROWS; y++) {
        const row: TerrainType[] = [];
        for (let x = 0; x < MAP_COLS; x++) {
            const tile = map.getTileAt(x, y, false, "ground");
            const gid = tile ? tile.index : 0;
            const type: TerrainType = GID_TERRAIN[gid] || "low";
            row.push(type);

            // 虚空格（对角带外）：不渲染，也不参与瓦片计数——
            // 相机边界贴地形包围盒，视口内永远不会出现虚空。
            if (type === "void") continue;

            // 逐格铺贴：菱形中心（origin 0.5 / HALF_H/FRAME_H）对齐
            // worldToScreen(gx+0.5, gy+0.5, h)；高地/斜坡顶面按 h*ELEV 抬升，
            // 帧内侧面带正好垂回地面格位置，形成“台阶”立体感。
            const frameIdx = TERRAIN_ORDER.indexOf(type);
            const h = HEIGHT[type];
            const { sx, sy } = worldToScreen(x + 0.5, y + 0.5, h);
            const img = scene.add.image(sx, sy, "terrain", "terrain-" + frameIdx);
            img.setOrigin(0.5, HALF_H / FRAME_H); // 锚点 = 帧内菱形中心
            img.setDepth(-1000); // 地形层最底，单位/建筑/特效覆于其上
            parent.add(img);     // 进地图层容器（容器在 (0,0)，世界坐标直接定位）
        }
        grid.push(row);
    }

    setTerrain(grid);
}
