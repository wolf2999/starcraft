// 生成 AI 出图占位骨架：public/textures/<race>/<tex>.png（91 实体，按种族分三子目录）
// + public/textures/maps/（地图占位：5 帧地形 + 矿 + 气泉，单独子目录）。
// 占位图 = 品红底 #FF00FF（与 doc/资源需求.md 第 3 节出图底色规范一致）+ 白色形状
// （建筑=矩形 / 单位=圆 / 矿=菱形晶簇 / 气泉=圆环 / 地形=菱形描边）。
// AI 出图 → 抠图 → **同名覆盖** public/textures/<race>/<tex>.png 即完成替换。
// 不依赖第三方库：手写 PNG（zlib deflate，filter type 0），encoder 与 gen-tileset.mjs 同源。
// 重跑幂等：先清理顶层旧版平铺 *.png（v1 遗留），再按子目录重建。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { deflateSync } from "node:zlib";

const OUT = "public/textures";

// 剥离 BOM（defs.json 可能由 PowerShell 重定向生成，带 \uFEFF 头）
const { defs } = JSON.parse(
  readFileSync(new URL("./defs.json", import.meta.url), "utf8").replace(/^\uFEFF/, "")
);

/* ───── 尺寸规则（对齐 doc/资源需求.md 第 2 节；出图尺寸 = 显示尺寸 ×2） ───── */

// 大建筑（主基地类）→ 256×256，其余建筑 128×128
const BIG_BUILDINGS = new Set(["cc", "nexus", "hatchery", "lair", "hive"]);
// 大型单位 → 96×96，其余单位 64×64
const BIG_UNITS = new Set([
  "tank", "goliath", "battlecruiser", "scienceVessel", "dropship", "valkyrie",
  "ultralisk", "guardian", "devourer", "carrier", "arbiter", "reaver",
  "dragoon", "archon", "darkArchon",
]);

function sizeFor(def) {
  if (def.id === "mineral") return { w: 96, h: 104 };
  if (def.id === "vespene") return { w: 104, h: 104 };
  if (def.kind === "building") return BIG_BUILDINGS.has(def.id) ? { w: 256, h: 256 } : { w: 128, h: 128 };
  return BIG_UNITS.has(def.id) ? { w: 96, h: 96 } : { w: 64, h: 64 };
}

/* ───── 子目录归属：矿/气泉/地形 5 帧是地图资源 → maps/；其余按种族 → <race>/ ───── */

function outDirFor(def) {
  if (def.id === "mineral" || def.id === "vespene") return "maps";
  return def.race; // terran / protoss / zerg
}

/* ───── 画布（RGBA，品红底） ───── */

const MAGENTA = [255, 0, 255, 255];
const WHITE = [255, 255, 255, 255];

function makeCanvas(w, h, base = MAGENTA) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) buf.set(base, i * 4);
  return { buf, w, h };
}

function px(c, x, y, col) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  c.buf.set(col, (y * c.w + x) * 4);
}

function fillRect(c, x0, y0, rw, rh) {
  for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) px(c, x, y, WHITE);
}

function fillCircle(c, cx, cy, r) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = cx - half; x <= cx + half; x++) px(c, x, cy + y, WHITE);
  }
}

function ringCircle(c, cx, cy, rOuter, rInner) {
  for (let y = -rOuter; y <= rOuter; y++) {
    const ho = Math.floor(Math.sqrt(rOuter * rOuter - y * y));
    const hi = Math.abs(y) <= rInner ? Math.floor(Math.sqrt(rInner * rInner - y * y)) : -1;
    for (let x = cx - ho; x <= cx + ho; x++) {
      if (Math.abs(x - cx) > hi) px(c, x, cy + y, WHITE);
    }
  }
}

function fillDiamond(c, cx, cy, hw, hh) {
  for (let y = -hh; y <= hh; y++) {
    const half = Math.floor(hw * (1 - Math.abs(y) / hh));
    for (let x = cx - half; x <= cx + half; x++) px(c, x, cy + y, WHITE);
  }
}

function drawPlaceholder(def, w, h) {
  const c = makeCanvas(w, h);
  const cx = w >> 1, cy = h >> 1;
  if (def.id === "mineral") {
    // 水晶占位：竖长菱形晶簇（主晶 + 两小晶）
    fillDiamond(c, cx, cy + 4, w * 0.28, h * 0.36);
    fillDiamond(c, cx - w * 0.22, cy + 8, w * 0.14, h * 0.2);
    fillDiamond(c, cx + w * 0.22, cy + 8, w * 0.14, h * 0.2);
  } else if (def.id === "vespene") {
    // 气泉占位：环形喷口
    ringCircle(c, cx, cy, Math.floor(h * 0.3), Math.floor(h * 0.16));
    fillCircle(c, cx, cy, Math.floor(h * 0.08));
  } else if (def.kind === "building") {
    // 建筑占位：居中实心矩形（60%），顶部再叠一条"屋顶"横带区分大小楼
    fillRect(c, Math.floor(w * 0.2), Math.floor(h * 0.2), Math.floor(w * 0.6), Math.floor(h * 0.6));
    fillRect(c, Math.floor(w * 0.3), Math.floor(h * 0.1), Math.floor(w * 0.4), Math.floor(h * 0.12));
  } else {
    // 单位占位：实心圆
    fillCircle(c, cx, cy, Math.floor(Math.min(w, h) * 0.32));
  }
  return c;
}

function drawTerrain(w, h) {
  // 地形帧占位：品红底 + 白菱形轮廓（对齐 2:1 菱形顶面语义）
  const c = makeCanvas(w, h);
  const cx = w >> 1, cy = h >> 1;
  const hw = w * 0.42, hh = w * 0.21; // 2:1 菱形
  for (let y = -hh; y <= hh; y++) {
    const half = Math.round(hw * (1 - Math.abs(y) / hh));
    px(c, cx - half, cy + y, WHITE);
    px(c, cx + half, cy + y, WHITE);
  }
  for (let x = -hw; x <= hw; x++) {
    px(c, cx + x, cy - Math.round(hh * (1 - Math.abs(x) / hw)), WHITE);
    px(c, cx + x, cy + Math.round(hh * (1 - Math.abs(x) / hw)), WHITE);
  }
  return c;
}

function drawFx(kind, w, h) {
  // 特效占位：**纯黑底**（接入用 ADD 混合，黑=透明，覆盖后免抠图）+ 白色形状
  const c = makeCanvas(w, h, [0, 0, 0, 255]);
  const cx = w >> 1, cy = h >> 1;
  const r = Math.min(w, h) * 0.36;
  if (kind === "hit") {
    // 命中火花：8 向星芒（长短交替）+ 中心亮点
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const len = i % 2 === 0 ? r : r * 0.6;
      for (let t = 0; t <= len; t += 0.5) {
        px(c, Math.round(cx + Math.cos(ang) * t), Math.round(cy + Math.sin(ang) * t), WHITE);
      }
    }
    fillCircle(c, cx, cy, Math.floor(r * 0.28));
  } else {
    // 爆炸云：中心团 + 环绕碎团 + 外圈火舌
    fillCircle(c, cx, cy, Math.floor(r * 0.5));
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + 0.4;
      const d = r * 0.62;
      fillCircle(c, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, Math.floor(r * 0.24));
    }
    ringCircle(c, cx, cy, Math.floor(r), Math.floor(r * 0.86));
  }
  return c;
}

/* ───── PNG 组装（signature + IHDR + IDAT + IEND，filter type 0） ───── */

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

function writePng(c, out) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0);
  ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const stride = c.w * 4;
  const filtered = Buffer.alloc((stride + 1) * c.h);
  for (let y = 0; y < c.h; y++) {
    filtered[y * (stride + 1)] = 0;
    c.buf.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(filtered, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(out, png);
}

/* ───── 生成 ───── */

// 清理旧版平铺占位（顶层 *.png），避免重组后双份遗留
for (const f of readdirSync(OUT)) {
  if (f.endsWith(".png")) rmSync(`${OUT}/${f}`);
}
for (const d of ["terran", "protoss", "zerg", "maps", "fx"]) {
  mkdirSync(`${OUT}/${d}`, { recursive: true });
}

let n = 0;
for (const def of defs) {
  const { w, h } = sizeFor(def);
  const dir = outDirFor(def);
  writePng(drawPlaceholder(def, w, h), `${OUT}/${dir}/${def.tex}.png`);
  n++;
}

// 地形 5 帧（low/high/ramp/water/bridge，与 terrain.png 帧序一致）→ maps/
const TERRAIN = ["low", "high", "ramp", "water", "bridge"];
for (const k of TERRAIN) {
  writePng(drawTerrain(128, 128), `${OUT}/maps/terrain_${k}.png`);
  n++;
}

// 特效 2 张（命中火花 / 爆炸云）→ fx/，黑底（ADD 混合免抠图）
const FX = [
  { key: "fx_hit", kind: "hit", w: 64, h: 64 },
  { key: "fx_explosion", kind: "explosion", w: 128, h: 128 },
];
for (const f of FX) {
  writePng(drawFx(f.kind, f.w, f.h), `${OUT}/fx/${f.key}.png`);
  n++;
}

console.log(`[gen-placeholders] wrote ${n} files under ${OUT}/{terran,protoss,zerg,maps,fx}/`);
// 清单（供文档/核对）：<race>/<tex>.png -> 尺寸
for (const def of defs) {
  const { w, h } = sizeFor(def);
  console.log(`${outDirFor(def)}/${def.tex}.png ${w}x${h} ${def.race} ${def.kind}`);
}
