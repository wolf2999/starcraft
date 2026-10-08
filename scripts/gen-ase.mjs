/**
 * gen-ase.mjs v2 —— 把 public/textures/{terran,protoss,zerg} 的占位 PNG
 * 生成为 LibreSprite(.ase) 多动作序列帧工程（星际式命令集）：
 * - 单位 u_*：idle(6) / walk(8) / attack(6) / death(6) = 26 帧
 * - 建筑 b_*：idle(8) / build(6) / death(6) = 20 帧
 * 动作区间用 .ase frame tags（0x2018 块）命名。布局按 LibreSprite 源码
 * （src/app/file/ase_format.cpp 读写两端）：count 是 WORD、每 tag 固定头 17 字节
 * （dir 后 reserved 8 字节）——与 Aseprite 1.2.9+ 规范（DWORD count + 16 字节头）
 * 不兼容，目标工具是 LibreSprite 故按其布局（见 Lessons Learned）。
 * 注意：占位图为单张正面图，8 朝向需真实美术，不在程序化范围；此处动作是程序化近似。
 *
 * 动作近似（确定性；占位图 ~80% 像素近纯白 ≥250，明暗只能用 ≤1 暗化因子，
 * 提亮会被 Math.min(255) 钳平不可见——实测踩坑）：
 * - idle：种族效果（人族建筑灯光脉冲 / 神族扫光 / 虫族呼吸；单位浮动）
 * - walk：大幅起伏(±3px) + 水平摇摆(±1px)
 * - attack：0-1 前摇暗化 → 2 上冲 3px → 3-5 回位
 * - death：整体淡出(alpha→0.17) + 轻微垮塌(scaleY -25%)
 * - build(建筑)：0.35 强度施工闪烁
 *
 * .ase 二进制按 ase-file-specs 子集手写：128B 文件头 / 16B 帧头 /
 * 0x2004 图层块 + 0x2018 动作标签块 + 0x2005 压缩 cel 块（RGBA32, zlib），
 * 全部小端；写出后 verify() 重新解析自校验（含标签边界与解压尺寸）。
 *
 * 用法: node scripts/gen-ase.mjs
 * 输出: art-src/libresprite/<种族>/<同名>.ase（美术工程）
 *       public/textures/<种族>/<同名>.png（横条序列帧 spritesheet，游戏运行时加载）
 *       src/animDefs.json（动作帧区间元数据，游戏侧注册 Phaser anims 用）
 * 依赖: pngjs（devDependencies）
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "art-src", "base"); // 源占位图（已从 public/textures 迁出，防横条回写后被二次加工）
const OUT = path.join(ROOT, "art-src", "libresprite");
const OUT_PNG = path.join(ROOT, "public", "textures"); // 横条序列帧输出（游戏运行时资源）
const COLS = 8; // 横条网格列数（Phaser spritesheet 按 8 列行优先切帧；建筑 8×272=2176px < 4096 纹理上限）

const PAD = 8; // 平面工作画布四周余量（浮动/前冲不裁边）
const UNIT_Y = 0.75; // 单位立面压扁系数（略带俯视角）；建筑走体块 extrusion（屋顶菱形+双墙）

/** 单位动作表（星际式命令集；dur=每帧毫秒） */
const ACTIONS_UNIT = [
  { name: "idle", frames: 6, dur: 160 },
  { name: "walk", frames: 8, dur: 100 },
  { name: "attack", frames: 6, dur: 80 },
  { name: "death", frames: 6, dur: 120 },
];
/** 建筑动作表 */
const ACTIONS_BUILDING = [
  { name: "idle", frames: 8, dur: 160 },
  { name: "build", frames: 6, dur: 140 },
  { name: "death", frames: 6, dur: 120 },
];
/** 动作标签在时间线上的颜色（RGB） */
const TAG_COLORS = {
  idle: [143, 174, 150],
  walk: [126, 166, 255],
  attack: [255, 120, 100],
  death: [120, 120, 120],
  build: [255, 200, 80],
};

/* ---------- .ase 写出 ---------- */
const u16 = (v) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v & 0xffff);
  return b;
};
const s16 = (v) => {
  const b = Buffer.alloc(2);
  b.writeInt16LE(v | 0);
  return b;
};
const u32 = (v) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v >>> 0);
  return b;
};
const str = (s) => {
  const b = Buffer.from(s, "utf8");
  return Buffer.concat([u16(b.length), b]);
};
const chunk = (type, payload) =>
  Buffer.concat([u32(6 + payload.length), u16(type), payload]);

/** 0x2004 图层块：单普通图层，可见，不透明度 255 */
function layerChunk() {
  return chunk(
    0x2004,
    Buffer.concat([
      u16(1), // flags: visible
      u16(0), // type: normal
      u16(0), // child level
      u16(0), // default width
      u16(0), // default height
      u16(0), // blend mode: normal
      Buffer.from([255, 0, 0, 0]), // opacity + future
      str("art"),
    ])
  );
}

/** 0x2018 动作标签块：每个动作 = [from,to] 帧区间，正向循环。
 *  布局按 LibreSprite 源码（src/app/file/ase_format.cpp 写入端）：
 *  count 是 WORD、每条 tag 固定头 17 字节（dir 后 reserved 8 字节）——
 *  与 Aseprite 1.2.9+ 规范（DWORD count + 16 字节头）不兼容，二者取一。 */
function tagsChunk(tags) {
  const parts = [u16(tags.length), Buffer.alloc(8)]; // LibreSprite: fputw(count) + 8B reserved
  for (const t of tags) {
    parts.push(
      u16(t.from),
      u16(t.to),
      Buffer.from([0]), // 方向 0=forward
      Buffer.alloc(8), // reserved（LibreSprite 读取端 fgetl×2 跳 8 字节）
      Buffer.from(t.rgb), // 标签颜色（UI 显示用）
      Buffer.from([0]), // extra
      str(t.name)
    );
  }
  return chunk(0x2018, Buffer.concat(parts));
}

/** 0x2005 cel 块：type 2 = zlib 压缩整帧 RGBA */
function celChunk(rgba, w, h) {
  const z = zlib.deflateSync(rgba, { level: 9 });
  return chunk(
    0x2005,
    Buffer.concat([
      u16(0), // layer index 0
      s16(0),
      s16(0), // cel 位置 (0,0)
      Buffer.from([255]), // opacity
      u16(2), // compressed cel
      Buffer.alloc(7), // future
      u16(w),
      u16(h),
      z,
    ])
  );
}

/** frames: [{rgba, dur}]；tags: [{name,from,to,rgb}]（标签块放第 0 帧） */
function buildAse(w, h, frames, tags) {
  const frameBufs = frames.map((fr, i) => {
    const extra = i === 0 ? [layerChunk(), tagsChunk(tags)] : [];
    const body = Buffer.concat([...extra, celChunk(fr.rgba, w, h)]);
    const head = Buffer.alloc(16);
    head.writeUInt16LE(0xf1fa, 4); // 帧 magic
    head.writeUInt16LE(extra.length + 1, 6); // old chunk count
    head.writeUInt16LE(fr.dur, 8); // 每帧时长（动作各自不同）
    head.writeUInt32LE(0, 12); // new chunk count
    head.writeUInt32LE(16 + body.length, 0); // 帧字节数（含帧头）
    return Buffer.concat([head, body]);
  });
  const body = Buffer.concat(frameBufs);
  const head = Buffer.alloc(128); // 全零保留区
  head.writeUInt16LE(0xa5e0, 4); // magic
  head.writeUInt16LE(frames.length, 6);
  head.writeUInt16LE(w, 8);
  head.writeUInt16LE(h, 10);
  head.writeUInt16LE(32, 12); // RGBA
  head.writeUInt32LE(1, 14); // flags: 图层不透明度有效
  head.writeUInt16LE(frames[0].dur, 18); // 兼容旧版 speed
  head.writeUInt8(0, 28); // 透明索引
  head.writeUInt16LE(256, 32); // 调色板条目数（RGBA 下仅占位）
  head.writeUInt8(1, 34);
  head.writeUInt8(1, 35); // pixel 尺寸
  head.writeUInt16LE(16, 40);
  head.writeUInt16LE(16, 42); // 网格
  head.writeUInt32LE(128 + body.length, 0); // 文件总字节数
  return Buffer.concat([head, body]);
}

/* ---------- 自校验解析（含 0x2018 标签回读） ---------- */
function verify(buf, expFrames, expW, expH) {
  if (buf.readUInt16LE(4) !== 0xa5e0) throw new Error("bad magic");
  if (buf.readUInt16LE(6) !== expFrames) throw new Error("bad frame count");
  if (buf.readUInt16LE(8) !== expW || buf.readUInt16LE(10) !== expH)
    throw new Error("bad canvas size");
  if (buf.readUInt32LE(0) !== buf.length) throw new Error("bad file size");
  let off = 128;
  let cels = 0;
  const tagNames = [];
  for (let f = 0; f < expFrames; f++) {
    const fsize = buf.readUInt32LE(off);
    if (buf.readUInt16LE(off + 4) !== 0xf1fa) throw new Error("bad frame magic @f" + f);
    const n = buf.readUInt16LE(off + 6) + buf.readUInt32LE(off + 12);
    let coff = off + 16;
    for (let c = 0; c < n; c++) {
      const csize = buf.readUInt32LE(coff);
      const ctype = buf.readUInt16LE(coff + 4);
      if (ctype === 0x2005) {
        const cw = buf.readUInt16LE(coff + 22); // cel payload +16
        const ch = buf.readUInt16LE(coff + 24);
        const raw = zlib.inflateSync(buf.subarray(coff + 26, coff + csize));
        if (raw.length !== cw * ch * 4) throw new Error("bad cel inflate @f" + f);
        cels++;
      } else if (ctype === 0x2018) {
        const pl = buf.subarray(coff + 6, coff + csize);
        const nt = pl.readUInt16LE(0); // LibreSprite: WORD count
        let p = 10; // 2 + reserved 8
        for (let k = 0; k < nt; k++) {
          const from = pl.readUInt16LE(p);
          const to = pl.readUInt16LE(p + 2);
          if (from > to || to >= expFrames) throw new Error("bad tag bounds");
          const nl = pl.readUInt16LE(p + 17); // 2+2+1+8+3+1 = 17 字节固定头后是名字
          tagNames.push(pl.toString("utf8", p + 19, p + 19 + nl));
          p += 19 + nl;
        }
        if (p !== pl.length) throw new Error("tag chunk size mismatch");
      } else if (ctype !== 0x2004) {
        throw new Error("unexpected chunk 0x" + ctype.toString(16));
      }
      coff += csize;
    }
    if (coff !== off + fsize) throw new Error("bad frame bytes @f" + f);
    off += fsize;
  }
  if (off !== buf.length) throw new Error("bad total bytes");
  return { cels, tagNames };
}

/* ---------- 像素变换（动作近似） ---------- */
function decode(p) {
  const png = PNG.sync.read(fs.readFileSync(p));
  return { data: png.data, w: png.width, h: png.height };
}

/* ---------- 动作帧 v3：真 iso 投影 ----------
 * iso 不等于把整图压扁：
 * - 建筑 = 体块 extrusion：平面图先在平面空间做动作（flatFrame），再采样成
 *   2:1 屋顶菱形（逆 iso 映射回平面图）+ 菱形下缘挂左右立面双墙，
 *   假光源（右墙 0.8 / 顶面 0.92）区分受光面，形成体积感；
 * - 单位 = 平面动作帧整体 0.75 纵向压扁（略带俯视角，非 0.5 纯压扁），
 *   位移（bob/sway）只发生在单位屏幕空间、底边锚定。
 * 三步管线：flatFrame（平面动作帧）→ extrudeBuilding / squashUnit（iso 投影）。 */

/** 第 1 步：源图 → 平面动作帧（PAD 余量画布；几何缩放底边锚定，种族/动作颜色效果） */
function flatFrame(base, faction, isB, act, i) {
  const PW = base.w + PAD * 2;
  const PH = base.h + PAD * 2;
  const out = Buffer.alloc(PW * PH * 4); // 全 0 = 全透明
  const n = act.frames;
  const t = (i / n) * Math.PI * 2;
  const cx = (base.w - 1) / 2;
  const bot = base.h - 1;

  // 默认种族效果（idle 基线）
  let sx = 1,
    sy = 1,
    dim = 0,
    alpha = 1,
    shimmer = false;
  if (faction === "terran") {
    if (isB) dim = 0.1 * (0.5 + 0.5 * Math.sin(t)); // 灯光闪烁（暗脉冲）
  } else if (faction === "protoss") {
    shimmer = true; // 灵能扫光
  } else if (!isB) {
    sx = 1 + 0.04 * Math.sin(t); // 虫族呼吸
    sy = 1 - 0.04 * Math.sin(t);
  } else {
    dim = 0.15 * (0.5 + 0.5 * Math.sin(t));
  }

  // 动作覆盖（星际式动作语义的程序化近似）
  if (act.name === "attack") {
    if (i < 2) dim = 0.18; // 前摇（压暗蓄力）
  } else if (act.name === "death") {
    alpha = 1 - i / n; // 淡出
    sy = 1 - 0.25 * (i / (n - 1)); // 轻微垮塌（底边锚定，脚不离地）
  } else if (act.name === "build") {
    dim = 0.35 * (0.3 + 0.7 * Math.abs(Math.sin(t))); // 施工闪烁
    shimmer = false;
  }

  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      // 平面逆缩放：x 中心锚定、y 底边锚定（呼吸/垮塌时贴地不悬空）
      const px = Math.round(cx + (x - PAD - cx) / sx);
      const py = Math.round(bot - (bot - (y - PAD)) / sy);
      if (px < 0 || py < 0 || px >= base.w || py >= base.h) continue;
      const si = (py * base.w + px) * 4;
      if (base.data[si + 3] === 0) continue;
      const di = (y * PW + x) * 4;
      const f = shimmer ? 1 - 0.25 * (0.5 + 0.5 * Math.sin(t - (x + y) * 0.3)) : 1 - dim;
      out[di] = Math.min(255, Math.round(base.data[si] * f));
      out[di + 1] = Math.min(255, Math.round(base.data[si + 1] * f));
      out[di + 2] = Math.min(255, Math.round(base.data[si + 2] * f));
      out[di + 3] = Math.round(base.data[si + 3] * alpha);
    }
  }
  return { rgba: out, w: PW, h: PH };
}

/** 第 2 步（建筑）：平面动作帧 → 体块。屋顶 = 2:1 菱形（逆 iso 采样平面图），
 *  立面 = 菱形下缘往下 Hw 像素的双墙（该列 yTop = 菱形下缘，纵向拉伸采样平面图）。 */
function extrudeBuilding(flat, w, h) {
  const Dw = w; // 屋顶菱形宽 = 占地宽
  const Hw = Math.round(h * 0.5); // 墙高 = 源图高一半
  const OW = w + PAD * 2;
  const OH = PAD * 2 + Math.round(Dw / 2) + Hw;
  const out = Buffer.alloc(OW * OH * 4);
  const cx = PAD + w / 2;
  const cyD = PAD + Dw / 4; // 屋顶菱形中心
  const halfW = Dw / 2;
  const halfH = Dw / 4;
  for (let y = 0; y < OH; y++) {
    for (let x = 0; x < OW; x++) {
      const dx = x - cx;
      const di = (y * OW + x) * 4;
      // —— 屋顶：|dx|/halfW + |dy|/halfH ≤ 1 菱形，逆 iso 回平面图 ——
      const dy = y - cyD;
      if (Math.abs(dx) / halfW + Math.abs(dy) / halfH <= 1) {
        const u = dy / halfH + dx / halfW;
        const v = dy / halfH - dx / halfW;
        const px = Math.round(((u + 1) / 2) * (w - 1));
        const py = Math.round(((v + 1) / 2) * (h - 1));
        const si = ((py + PAD) * flat.w + (px + PAD)) * 4;
        if (flat.rgba[si + 3] === 0) continue;
        const f = 0.92; // 顶面假光源
        out[di] = Math.min(255, Math.round(flat.rgba[si] * f));
        out[di + 1] = Math.min(255, Math.round(flat.rgba[si + 1] * f));
        out[di + 2] = Math.min(255, Math.round(flat.rgba[si + 2] * f));
        out[di + 3] = flat.rgba[si + 3];
        continue;
      }
      // —— 立面：横向限制在菱形宽度内，从该列菱形下缘往下挂 Hw 像素墙 ——
      if (Math.abs(dx) > halfW) continue;
      const yTop = PAD + Dw / 2 - Math.abs(dx) * 0.5; // 该列菱形下缘
      const wy = y - yTop;
      if (wy < 0 || wy >= Hw) continue;
      const ty = Math.round((wy / Hw) * (h - 1)); // 墙面纵向拉伸采样平面图
      const si = ((ty + PAD) * flat.w + x) * 4;
      if (flat.rgba[si + 3] === 0) continue;
      const f = dx > 0 ? 0.8 : 1; // 右墙背光
      out[di] = Math.min(255, Math.round(flat.rgba[si] * f));
      out[di + 1] = Math.min(255, Math.round(flat.rgba[si + 1] * f));
      out[di + 2] = Math.min(255, Math.round(flat.rgba[si + 2] * f));
      out[di + 3] = flat.rgba[si + 3];
    }
  }
  return { rgba: out, w: OW, h: OH };
}

/** 第 2 步（单位）：平面动作帧 → UNIT_Y 纵向压扁（俯视角）+ 屏幕位移，底边锚定 */
function squashUnit(flat, bob, sway) {
  const OW = flat.w;
  const OH = Math.round(flat.h * UNIT_Y);
  const out = Buffer.alloc(OW * OH * 4);
  const bot = flat.h - 1;
  for (let y = 0; y < OH; y++) {
    for (let x = 0; x < OW; x++) {
      const sx2 = x - sway;
      if (sx2 < 0 || sx2 >= OW) continue;
      // bob 是屏幕像素，除以 UNIT_Y 换算回平面行
      const sy2 = Math.round((y - bob - (OH - 1)) / UNIT_Y) + bot;
      if (sy2 < 0 || sy2 >= flat.h) continue;
      const si = (sy2 * OW + sx2) * 4;
      if (flat.rgba[si + 3] === 0) continue;
      const di = (y * OW + x) * 4;
      out[di] = flat.rgba[si];
      out[di + 1] = flat.rgba[si + 1];
      out[di + 2] = flat.rgba[si + 2];
      out[di + 3] = flat.rgba[si + 3];
    }
  }
  return { rgba: out, w: OW, h: OH };
}

/** 第 0 步调度：平面动作帧 → 建筑 extrusion / 单位压扁。bob/sway 只属单位屏幕空间 */
function frameOf(base, faction, isB, act, i) {
  const flat = flatFrame(base, faction, isB, act, i);
  if (isB) return extrudeBuilding(flat, base.w, base.h);
  const n = act.frames;
  const t = (i / n) * Math.PI * 2;
  let bob = 0,
    sway = 0;
  if (act.name === "walk") {
    bob = Math.round(3 * Math.sin(t)); // 跑动起伏
    sway = Math.round(Math.sin(t)); // ±1 水平摇摆
  } else if (act.name === "attack") {
    bob = i === 2 ? -3 : i > 2 ? -1 : 0; // 上冲/回位（朝向目标简化）
  } else if (act.name !== "death" && faction !== "zerg") {
    bob = Math.round(2 * Math.sin(t)); // idle 浮动（虫族贴地）
  }
  return squashUnit(flat, bob, sway);
}

/* ---------- 主流程 ---------- */
const FACTIONS = ["terran", "protoss", "zerg"];
let made = 0;
const failed = [];
const animDefs = {}; // tex key → 帧区间元数据（写入 src/animDefs.json）
for (const faction of FACTIONS) {
  const dir = path.join(SRC, faction);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
  const outDir = path.join(OUT, faction);
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of files) {
    try {
      const base = decode(path.join(dir, f));
      const isB = /^b_/.test(f);
      const acts = isB ? ACTIONS_BUILDING : ACTIONS_UNIT;
      const frames = [];
      const tags = [];
      let fi = 0;
      let ow = 0,
        oh = 0;
      for (const act of acts) {
        const from = fi;
        for (let i = 0; i < act.frames; i++) {
          const fr = frameOf(base, faction, isB, act, i);
          ow = fr.w;
          oh = fr.h;
          frames.push({ rgba: fr.rgba, dur: act.dur });
          fi++;
        }
        tags.push({ name: act.name, from, to: fi - 1, rgb: TAG_COLORS[act.name] });
      }
      const buf = buildAse(ow, oh, frames, tags);
      const v = verify(buf, frames.length, ow, oh);
      if (v.cels !== frames.length) throw new Error("cel count " + v.cels);
      if (v.tagNames.join(",") !== tags.map((t) => t.name).join(","))
        throw new Error("tag names mismatch: " + v.tagNames.join(","));
      // 自检：idle 最大偏移帧 vs 第 0 帧（idle 是第一段；正弦零点帧 0/中点相同属正常）
      if (frames[0].rgba.equals(frames[2].rgba))
        console.warn(`  ! ${faction}/${f} idle 第 0/2 帧相同（动画不可见，查亮度钳制）`);
      fs.writeFileSync(path.join(outDir, f.replace(/\.png$/i, ".ase")), buf);

      // —— 导出横条 spritesheet（与 .ase 同一帧数据源，游戏运行时资源）——
      fs.mkdirSync(path.join(OUT_PNG, faction), { recursive: true });
      const rows = Math.ceil(frames.length / COLS);
      const strip = new PNG({ width: COLS * ow, height: rows * oh });
      frames.forEach((fr, i) => {
        const x0 = (i % COLS) * ow;
        const y0 = Math.floor(i / COLS) * oh;
        for (let y = 0; y < oh; y++) {
          fr.rgba.copy(
            strip.data,
            ((y0 + y) * strip.width + x0) * 4, // 目标行首
            y * ow * 4, // 源行首
            (y + 1) * ow * 4 // 源行尾
          );
        }
      });
      fs.writeFileSync(path.join(OUT_PNG, faction, f), PNG.sync.write(strip));

      // —— 动作帧区间元数据（游戏侧注册 Phaser anims 用）——
      const actions = {};
      for (const t of tags) {
        const dur = acts.find((a) => a.name === t.name).dur;
        actions[t.name] = {
          from: t.from,
          to: t.to,
          fps: Math.round((1000 / dur) * 100) / 100,
          // idle/walk/build 循环；attack/death 只播一次
          repeat: t.name === "attack" || t.name === "death" ? 0 : -1,
        };
      }
      animDefs[f.replace(/\.png$/i, "")] = {
        race: faction,
        kind: isB ? "building" : "unit",
        frameWidth: ow,
        frameHeight: oh,
        cols: COLS,
        frameCount: frames.length,
        actions,
      };
      made++;
    } catch (e) {
      failed.push(`${faction}/${f}: ${e.message}`);
    }
  }
  console.log(`${faction}: ${files.length} png 已处理`);
}
console.log(
  `完成 ${made} 个（.ase → art-src/libresprite/，横条 → public/textures/，自校验全部通过）`
);
fs.writeFileSync(
  path.join(ROOT, "src", "animDefs.json"),
  JSON.stringify(animDefs, null, 2)
);
console.log(
  `动作布局 — 单位: ${ACTIONS_UNIT.map((a) => `${a.name}×${a.frames}`).join(" / ")}；建筑: ${ACTIONS_BUILDING.map(
    (a) => `${a.name}×${a.frames}`
  ).join(" / ")}；横条网格 ${COLS} 列行优先（animDefs → src/animDefs.json）`
);
if (failed.length) {
  console.log("失败清单:");
  failed.forEach((s) => console.log(" -", s));
  process.exit(1);
}
