// 把 AI 出的 5 帧地形图（public/textures/maps/terrain_*.png，128×128）接入游戏 tileset：
// 缩放/几何矫正到 64×64 帧布局（2:1 菱形顶面 y0~32 + 侧面带到 y48，与 gen-tileset.mjs 一致），
// 横排合成 320×64 覆盖 public/maps/terrain.png（帧序 low/high/ramp/water/bridge，与 .tmj 引用一致）。
//
// 背景：AI 模型常把菱形画成 45° 等腰（宽高比≈1.0）而非 2:1，直接等比缩放会接缝错位。
// 故按"不透明包围盒 → 目标区域"做非均匀映射（最近邻采样），轮廓强制对齐网格。
// 可重复运行；程序化原版随时可用 node scripts/gen-tileset.mjs 重建。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const SRC = ["terrain_low", "terrain_high", "terrain_ramp", "terrain_water", "terrain_bridge"];
const FRAME_W = 64, FRAME_H = 64;
const DST_W = 64, DST_H = 48; // 菱形顶面 64×32 + 侧面带向下 16px 的整体区域
const OUT = "public/maps/terrain.png";

const out = new PNG({ width: FRAME_W * SRC.length, height: FRAME_H });

SRC.forEach((name, fi) => {
  const p = `public/textures/maps/${name}.png`;
  if (!existsSync(p)) {
    console.warn(`! 缺 ${p}，该帧留空（程序化原版可用 gen-tileset.mjs 重建）`);
    return;
  }
  const img = PNG.sync.read(readFileSync(p));
  const { width: w, height: h, data } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  if (x1 < 0) { console.warn(`! ${p} 全透明，该帧留空`); return; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const ox = fi * FRAME_W + Math.floor((FRAME_W - DST_W) / 2); // 目标区域在横条里的 x 起点
  for (let dy = 0; dy < DST_H; dy++) {
    const sy = Math.min(h - 1, Math.floor((y0 + (dy + 0.5) * bh / DST_H)));
    for (let dx = 0; dx < DST_W; dx++) {
      const sx = Math.min(w - 1, Math.floor((x0 + (dx + 0.5) * bw / DST_W)));
      const si = (sy * w + sx) * 4;
      const di = (dy * out.width + ox + dx) * 4;
      out.data[di] = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = data[si + 3];
    }
  }
  console.log(`✓ ${name}: 包围盒 ${bw}x${bh} → ${DST_W}x${DST_H} 帧@${fi}`);
});

writeFileSync(OUT, PNG.sync.write(out));
console.log(`\n合成 ${out.width}x${out.height} → ${OUT}（${SRC.length} 帧 × ${FRAME_W}×${FRAME_H}）`);
