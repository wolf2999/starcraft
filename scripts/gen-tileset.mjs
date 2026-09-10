// 在 Node 里程序化生成 5 帧等距（2:1 菱形）tileset，写到 public/maps/terrain.png。
// 放在 maps/ 下是因为 .tmj（lost-temple.tmj）也在 maps/，二者同目录后
// tmj 才能用无 ../ 的 "terrain.png" 引用，Tiled 才能稳定加载到图。
// 不依赖第三方库：手写 PNG（zlib deflate，filter type 0）。
//
// 帧规格（与 src/tilemap.ts 的 ensureTerrainTileset / src/iso.ts 一致）：
//   单帧 64×64 = 菱形顶面 (64×32，中心在帧内 (32,16)) + 顶面下缘向下 16px 侧面带。
//   帧序：1=low(草地) 2=high(高地+侧带) 3=ramp(斜坡，上草下土) 4=water(水面+波纹) 5=bridge(桥+木板纹+侧带)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const TILE_W = 64;
const TILE_H = 32; // 菱形高
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const ELEV = 16;   // 每级高度侧带像素（= iso.ts 的 ELEV）
const FRAME_H = TILE_H + ELEV * 2; // 64

/** 调色板（5 种地形各自的"顶面/侧面/细节"色） */
const PALETTE = {
  low: { top: [94, 140, 78], side: [54, 90, 50], spec: [166, 200, 132] },   // 草地
  high: { top: [168, 142, 88], side: [98, 76, 48], spec: [220, 196, 138] },  // 高地
  ramp: { top: [136, 118, 90], side: [78, 64, 50], spec: [196, 174, 132] },  // 斜坡
  water: { top: [56, 110, 168], side: [30, 70, 116], spec: [200, 230, 255] }, // 水
  bridge: { top: [132, 92, 56], side: [76, 50, 30], spec: [196, 150, 96] },  // 桥
};

const ORDER = ["low", "high", "ramp", "water", "bridge"];

/** 简易确定性 LCG（同一地形每次结果一致） */
function lcg(seed) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; };
}

const COLS = ORDER.length;
const W = TILE_W * COLS; // 5 帧横排
const H = FRAME_H;
const rgba = Buffer.alloc(W * H * 4);

/** 帧内坐标 → 全图缓冲写入（alpha 混合）；局部坐标原点 = 帧左上角 */
function drawPx(frameIdx, lx, ly, c, a = 255) {
  const gx = frameIdx * TILE_W + lx;
  if (gx < 0 || gx >= W || ly < 0 || ly >= H) return;
  const k = (ly * W + gx) * 4;
  if (a >= 255) { rgba[k] = c[0]; rgba[k + 1] = c[1]; rgba[k + 2] = c[2]; rgba[k + 3] = 255; }
  else {
    const af = a / 255, inv = 1 - af;
    rgba[k] = (rgba[k] * inv + c[0] * af) | 0;
    rgba[k + 1] = (rgba[k + 1] * inv + c[1] * af) | 0;
    rgba[k + 2] = (rgba[k + 2] * inv + c[2] * af) | 0;
    rgba[k + 3] = 255;
  }
}

/** 点是否在菱形内（局部坐标，菱形中心 (32,16)） */
function inDia(lx, ly) {
  return Math.abs(lx - HALF_W) / HALF_W + Math.abs(ly - HALF_H) / HALF_H <= 1;
}

/** 画菱形顶面（含描边） */
function fillDiamond(fi, pal) {
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (inDia(x, y)) drawPx(fi, x, y, pal.top);
    }
  }
}

/** 画侧面带：菱形下两条边向下拉 sideH 像素 */
function fillSide(fi, pal, sideH) {
  for (let y = 0; y < sideH; y++) {
    // 第 y 行的可画水平区间 = 该行位于"下边缘以下 y 行"的菱形宽度
    // 菱形在高度 TILE_H + y 行处的半宽 = HALF_W * (1 - y / (sideH)) 近似于从底顶点向下收窄
    // 精确：侧面带第 y 行 = 底部两条边向下平移 y 行 → 宽度 = 底顶点处宽度(0) 两侧线性到左右顶点
    const half = Math.round(HALF_W * (1 - y / sideH));
    const cy = HALF_H;
    for (let x = HALF_W - half; x <= HALF_W + half; x++) {
      drawPx(fi, x, cy + y, pal.side);
    }
  }
}

for (let i = 0; i < ORDER.length; i++) {
  const type = ORDER[i];
  const pal = PALETTE[type];

  // 1) 侧面带（先画，会被顶面覆盖上缘）
  if (type === "high" || type === "bridge") fillSide(i, pal, ELEV);
  if (type === "ramp") fillSide(i, pal, ELEV / 2);

  // 2) 菱形顶面
  fillDiamond(i, pal);

  // 3) 顶面细节
  if (type === "low") {
    const rnd = lcg(11);
    const count = Math.floor(TILE_W * TILE_H * 0.5);
    for (let k = 0; k < count; k++) {
      const x = Math.floor(rnd() * TILE_W);
      const y = Math.floor(rnd() * TILE_H);
      if (inDia(x, y)) drawPx(i, x, y, pal.spec);
    }
  } else if (type === "high") {
    const rnd = lcg(22);
    const count = Math.floor(TILE_W * TILE_H * 0.35);
    for (let k = 0; k < count; k++) {
      const x = Math.floor(rnd() * TILE_W);
      const y = Math.floor(rnd() * TILE_H);
      if (inDia(x, y)) drawPx(i, x, y, pal.spec);
    }
  } else if (type === "ramp") {
    // 斜坡：沿水平对角线下半画土色（low→high 过渡）
    for (let y = HALF_H; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (inDia(x, y)) drawPx(i, x, y, PALETTE.high.top);
      }
    }
    for (let x = 0; x < TILE_W; x++) drawPx(i, x, HALF_H, pal.side);
  } else if (type === "water") {
    // 水面：两条白色波纹（限制在菱形内）
    for (const dy of [-4, 5]) {
      const y = HALF_H + dy;
      const half = Math.round(HALF_W * (1 - Math.abs(dy) / HALF_H)) - 6;
      for (let x = HALF_W - half; x <= HALF_W + half; x++) drawPx(i, x, y, pal.spec, 180);
    }
  } else if (type === "bridge") {
    // 桥：横向木板缝（限制在菱形内）
    for (const dy of [-6, 0, 6]) {
      const y = HALF_H + dy;
      const half = Math.round(HALF_W * (1 - Math.abs(dy) / HALF_H)) - 3;
      for (let x = HALF_W - half; x <= HALF_W + half; x++) drawPx(i, x, y, pal.side);
    }
  }

  // 4) 菱形描边（1px 深色，让格子可辨）
  // 上左边：x 0..32
  for (let x = 0; x <= HALF_W; x++) {
    const y = Math.round(HALF_H - (x / HALF_W) * HALF_H);
    drawPx(i, x, y, pal.side);
  }
  // 上右边：x 32..64
  for (let x = HALF_W; x < TILE_W; x++) {
    const y = Math.round(((x - HALF_W) / HALF_W) * HALF_H);
    drawPx(i, x, y, pal.side);
  }
  // 下两边：只画 1px 会与侧面带混色，补在顶面内一侧
  for (let x = 0; x <= HALF_W; x++) {
    const y = Math.round(HALF_H + (x / HALF_W) * HALF_H) - 1;
    drawPx(i, x, y, pal.side);
  }
  for (let x = HALF_W; x < TILE_W; x++) {
    const y = Math.round(HALF_H + ((TILE_W - 1 - x) / HALF_W) * HALF_H) - 1;
    drawPx(i, x, y, pal.side);
  }
}

/* ────── 写 PNG（PNG = signature + IHDR + IDAT + IEND，filter type 0） ────── */

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 8; j > 0; j--) crc = (crc & 1) ? ((crc >>> 1) ^ 0xedb88320) : (crc >>> 1);
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
