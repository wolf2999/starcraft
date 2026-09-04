// 在 Node 里程序化生成 5×64×32 等距 tileset，写到 public/maps/terrain.png。
// 放在 maps/ 下是因为 .tmj（lost-temple.tmj）也在 maps/，二者同目录后
// tmj 才能用无 ../ 的 "terrain.png" 引用，Tiled 才能稳定加载到图。
// 不依赖第三方库：手写 PNG（zlib deflate，filter type 0）。
// 顺序严格对应 src/terrain.ts 的 TERRAIN_GID：
//   1=low(草地)  2=high(高地，带抬升侧面)  3=ramp(斜坡，左低右高过渡)
//   4=water(水面+波纹)  5=bridge(桥面+木板纹理，跨在 water 上)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2; // 32
const HALF_H = TILE_H / 2; // 16

/** 调色板（5 种地形各自的"顶面/侧面/细节"色） */
const PALETTE = {
  low:    { top: [94, 140, 78], side: [54, 90, 50], spec: [166, 200, 132] },   // 草地：浅绿顶面，深绿侧面，浅色高光草簇
  high:   { top: [168, 142, 88], side: [98, 76, 48], spec: [220, 196, 138] },  // 高地：土黄顶，深棕侧，亮黄高光（暗示抬升）
  ramp:   { top: [136, 118, 90], side: [78, 64, 50], spec: [196, 174, 132] },  // 斜坡：渐变混色土
  water:  { top: [56, 110, 168], side: [30, 70, 116], spec: [200, 230, 255] }, // 水：蓝色顶，深蓝侧，白色波纹
  bridge: { top: [132, 92, 56],  side: [76, 50, 30], spec: [196, 150, 96] },  // 桥：木板纹，深棕侧
};

const ORDER = ["low", "high", "ramp", "water", "bridge"];

/** 把 RGB 数组画到 RGBA 缓冲的指定位置（覆盖/混合） */
function px(rgba, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= TILE_W || y >= TILE_H) return;
  const i = (y * TILE_W + x) * 4;
  if (a >= 255) { rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; }
  else {
    // alpha blend：让波纹等半透明元素不糊掉底色
    const af = a / 255;
    const inv = 1 - af;
    rgba[i] = (rgba[i] * inv + r * af) | 0;
    rgba[i + 1] = (rgba[i + 1] * inv + g * af) | 0;
    rgba[i + 2] = (rgba[i + 2] * inv + b * af) | 0;
    rgba[i + 3] = 255;
  }
}

/** 检查 (x, y) 是否在"等距菱形"内（中心 32,16，半轴 32,16） */
function inDiamond(x, y) {
  const dx = x - HALF_W + 0.5;
  const dy = y - HALF_H + 0.5;
  return Math.abs(dx) / HALF_W + Math.abs(dy) / HALF_H <= 1;
}

/** 画底色 + 顶/底边描边，等距菱形可见区域（每格画两个菱形堆叠：顶面 + 侧面） */
function drawBaseTop(rgba, baseColor, edgeColor) {
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      px(rgba, x, y, baseColor);
      // 描深色边线让菱形边界明显
      if (!inDiamond(x + 1, y) || !inDiamond(x - 1, y) || !inDiamond(x, y + 1) || !inDiamond(x, y - 1)) {
        px(rgba, x, y, edgeColor);
      }
    }
  }
}

/** 在草地/高地/桥面上撒零散装饰点（让"贴了图"vs"没贴图"有视觉区别） */
function speckle(rgba, color, seed, density = 0.12) {
  // 简易确定性 LCG（同一地形每次结果一致），避开菱形外
  let s = seed | 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; };
  const count = Math.floor(TILE_W * TILE_H * density);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * TILE_W);
    const y = Math.floor(rnd() * TILE_H);
    if (!inDiamond(x, y)) continue;
    px(rgba, x, y, color);
  }
}

/** 在水面画 3 条高光波纹（半透明白色短横线） */
function waterRipples(rgba, spec) {
  const lines = [HALF_H - 4, HALF_H, HALF_H + 4];
  for (const ly of lines) {
    const w = HALF_W - 8 - Math.abs(ly - HALF_H) * 2; // 越靠近中心越长
    const x0 = Math.floor(HALF_W - w);
    const x1 = Math.floor(HALF_W + w);
    for (let x = x0; x <= x1; x++) {
      if (!inDiamond(x, ly)) continue;
      px(rgba, x, ly, spec, 180);
    }
  }
}

/** 高地：在菱形下方再画一个"抬升侧面"——比 low 高 12px 的小菱形（深度感） */
function highLift(rgba, sideColor) {
  // 侧面：在底边再增加一条 ~6px 厚的深色带
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      // 菱形底部 y>=HALF_H+8 区域里再叠一层更暗（视觉上像抬高了一层）
      if (y >= HALF_H + 4) {
        px(rgba, x, y, sideColor);
      }
    }
  }
}

/** 斜坡：在菱形内画左低右高的"阶梯"过渡带，左半用 low 色、右半用 high 色 */
function rampGradient(rgba, lowCol, highCol, edge) {
  // 先画 high 色顶面
  drawBaseTop(rgba, highCol, edge);
  // 左半覆盖 low 色（小三角形）
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      // 三角形斜边：x = HALF_W - (y - HALF_H)*0.5 + HALF_W
      // 简单起见用线性："上半 low，下半 high"——视觉上就是从低到高的过渡面
      if (y < HALF_H + 2) {
        px(rgba, x, y, lowCol);
      }
    }
  }
  // 中线描深色边
  for (let x = 0; x < TILE_W; x++) {
    if (inDiamond(x, HALF_H + 1)) px(rgba, x, HALF_H + 1, edge);
  }
}

/** 桥：在菱形内画横向木板条带 */
function bridgePlanks(rgba, top, side, spec) {
  drawBaseTop(rgba, top, side);
  // 5 条横向木板（每 5px 一条）
  for (let i = 1; i < 5; i++) {
    const y = Math.floor((HALF_H * 2 / 5) * i);
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      px(rgba, x, y, side);
    }
  }
  // 中线亮色边
  for (let x = 0; x < TILE_W; x++) {
    if (inDiamond(x, HALF_H - 1)) px(rgba, x, HALF_H - 1, spec, 200);
  }
}

const ROWS = ORDER.length;
const W = TILE_W * ROWS; // 5 个格子横排
const H = TILE_H;
const rgba = Buffer.alloc(W * H * 4);
// 菱形外区域保持 alpha=0（完全透明）。这是 PNG 的正确外观：
// 菱形外本来就不属于瓦片，不该有底色。Tiled 那边若看不到图，
// 通过在 gen-map.mjs 的 tileset JSON 里加 `transparentcolor` 字段补偿，
// 或者用 Tiled 自带的"图像为瓦片集"编辑器先配好透明键。
for (let i = 3; i < rgba.length; i += 4) rgba[i] = 0;

for (let i = 0; i < ORDER.length; i++) {
  const type = ORDER[i];
  const pal = PALETTE[type];
  const xOff = i * TILE_W;
  // 每个格子的"本地坐标"
  const local = (xi, yi) => rgba[(yi * W + (xOff + xi)) * 4 + 0] !== undefined ? true : true; // 占位
  // 直接操作大缓冲时按全局坐标
  const drawPx = (xi, yi, c, a = 255) => {
    const gx = xOff + xi;
    if (gx < 0 || gx >= W || yi < 0 || yi >= H) return;
    const k = (yi * W + gx) * 4;
    if (a >= 255) { rgba[k] = c[0]; rgba[k + 1] = c[1]; rgba[k + 2] = c[2]; rgba[k + 3] = 255; }
    else {
      const af = a / 255, inv = 1 - af;
      rgba[k] = (rgba[k] * inv + c[0] * af) | 0;
      rgba[k + 1] = (rgba[k + 1] * inv + c[1] * af) | 0;
      rgba[k + 2] = (rgba[k + 2] * inv + c[2] * af) | 0;
      rgba[k + 3] = 255;
    }
  };
  const inDiaLocal = (xi, yi) => {
    const dx = xi - HALF_W + 0.5;
    const dy = yi - HALF_H + 0.5;
    return Math.abs(dx) / HALF_W + Math.abs(dy) / HALF_H <= 1;
  };

  if (type === "low") {
    // 草地：顶面 + 草簇
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      if (!inDiaLocal(x, y)) continue;
      drawPx(x, y, pal.top);
      if (!inDiaLocal(x + 1, y) || !inDiaLocal(x - 1, y) || !inDiaLocal(x, y + 1) || !inDiaLocal(x, y - 1)) {
        drawPx(x, y, pal.side);
      }
    }
    // 草簇（确定性散点）
    let s = 11;
    const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; };
    const count = Math.floor(TILE_W * TILE_H * 0.08);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rnd() * TILE_W);
      const y = Math.floor(rnd() * TILE_H);
      if (!inDiaLocal(x, y)) continue;
      drawPx(x, y, pal.spec);
    }
  } else if (type === "high") {
    // 高地：先画 low 底色，再叠一层抬升土黄色"顶面"在小菱形里（上半），下半留侧面深色
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      if (!inDiaLocal(x, y)) {
        // 透明
        continue;
      }
      // 下半（y>=HALF_H+4）画侧面深色，否则画土黄顶面
      const c = (y >= HALF_H + 4) ? pal.side : pal.top;
      drawPx(x, y, c);
      if (!inDiaLocal(x + 1, y) || !inDiaLocal(x - 1, y) || !inDiaLocal(x, y + 1) || !inDiaLocal(x, y - 1)) {
        drawPx(x, y, pal.side);
      }
    }
    // 顶部亮色高光
    for (let x = HALF_W - 8; x <= HALF_W + 8; x++) {
      if (inDiaLocal(x, HALF_H - 6)) drawPx(x, HALF_H - 6, pal.spec);
    }
  } else if (type === "ramp") {
    // 斜坡：上半 low 色，下半 high 色，中线分隔
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      if (!inDiaLocal(x, y)) continue;
      const c = (y < HALF_H) ? PALETTE.low.top : pal.top;
      drawPx(x, y, c);
      if (!inDiaLocal(x + 1, y) || !inDiaLocal(x - 1, y) || !inDiaLocal(x, y + 1) || !inDiaLocal(x, y - 1)) {
        drawPx(x, y, pal.side);
      }
    }
    // 中线分隔（深色）
    for (let x = 0; x < TILE_W; x++) if (inDiaLocal(x, HALF_H)) drawPx(x, HALF_H, pal.side);
  } else if (type === "water") {
    // 水面：蓝色 + 3 条波纹
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      if (!inDiaLocal(x, y)) continue;
      drawPx(x, y, pal.top);
      if (!inDiaLocal(x + 1, y) || !inDiaLocal(x - 1, y) || !inDiaLocal(x, y + 1) || !inDiaLocal(x, y - 1)) {
        drawPx(x, y, pal.side);
      }
    }
    const lines = [HALF_H - 4, HALF_H, HALF_H + 4];
    for (const ly of lines) {
      const w = HALF_W - 6 - Math.abs(ly - HALF_H) * 1.5;
      const x0 = Math.floor(HALF_W - w);
      const x1 = Math.floor(HALF_W + w);
      for (let x = x0; x <= x1; x++) {
        if (!inDiaLocal(x, ly)) continue;
        drawPx(x, ly, pal.spec, 180);
      }
    }
  } else if (type === "bridge") {
    // 桥：木板纹
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      if (!inDiaLocal(x, y)) continue;
      drawPx(x, y, pal.top);
      if (!inDiaLocal(x + 1, y) || !inDiaLocal(x - 1, y) || !inDiaLocal(x, y + 1) || !inDiaLocal(x, y - 1)) {
        drawPx(x, y, pal.side);
      }
    }
    // 5 条横向木板缝
    for (let i = 1; i < 5; i++) {
      const y = Math.floor((HALF_H * 2 / 5) * i);
      for (let x = 0; x < TILE_W; x++) if (inDiaLocal(x, y)) drawPx(x, y, pal.side);
    }
    // 顶部亮色亮边
    for (let x = 0; x < TILE_W; x++) if (inDiaLocal(x, HALF_H - 2)) drawPx(x, HALF_H - 2, pal.spec, 180);
  }
}

/* ────── 写 PNG（PNG = signature + IHDR + IDAT + IEND，filter type 0） ────── */

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;     // bit depth
ihdr[9] = 6;     // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// 过滤字节：每行前置一个 0（filter type 0 = None），便于 deflate
const stride = W * 4;
const filtered = Buffer.alloc((stride + 1) * H);
for (let y = 0; y < H; y++) {
  filtered[y * (stride + 1)] = 0;
  rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
}

const idat = deflateSync(filtered, { level: 9 });

const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

// 输出到 maps/ 与 .tmj 同目录（见文件顶部说明）；若想换回 tilesets/ 约定，
// 同步改 gen-map.mjs 里的 image 字段与 GameScene.preload 的 load.image 路径。
const out = "public/maps/terrain.png";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log("[gen-tileset] wrote", out, "size=", png.length, "bytes", `${W}x${H}`);
