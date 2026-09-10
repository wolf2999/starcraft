// 生成 Tiled 等距（2:1 菱形）地图 public/maps/lost-temple.tmj
// 地形布局与 src/maps/lostTemple.ts 的 generateTerrain() 保持一致。
// 运行：node scripts/gen-map.mjs
//
// 布局说明：数据网格 128×128，有效格排成一条对角带
// （u = x+y ∈ [64,194]，v = x-y ∈ [-32,32]，与 src/iso.ts 的 isPlayable 一致），
// 投影到屏幕后轮廓恰好是 2112×2112 的正方形；带外格子写 gid 0（虚空，
// 不渲染、不可通行），即地图四角的大片三角区。
//
// ⚠️ 关于 tileset 图片路径（这是之前 Tiled 打不开地图的根因）
// terrain.png 的真源放在 public/maps/terrain.png，与 .tmj **同目录**；
// tmj 内嵌 tileset 用 "terrain.png" 这种**无 ../ 的相对引用**。
// 之前写成 "terrain.png"（缺目录）/ "../tilesets/terrain.png"（跨目录），
// 在 Tiled 里都因相对路径解析基准问题链接不上图片（文件其实存在）。
// 改成同目录 + 无 ../ 之后 Tiled 100% 能解析，且你改 terrain.png / 加瓦片
// 都只需用图像软件或 Tiled 编辑 public/maps/terrain.png，无需重跑本脚本。
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const N = 128;
// 瓦片 gid ↔ 地形（与 src/terrain.ts 的 TERRAIN_GID 一致；0 = 虚空空格）
const TERRAIN_GID = { low: 1, high: 2, ramp: 3, water: 4, bridge: 5 };

// 有效区（对角带）判定，与 src/iso.ts 的 isPlayable() 保持一致
function isPlayable(x, y) {
  const u = x + y;
  const v = x - y;
  return u >= 64 && u <= 194 && v >= -32 && v <= 32;
}

// 复刻 src/maps/lostTemple.ts 的 generateTerrain()（null = 虚空）
function generateTerrain() {
  const t = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) row.push(isPlayable(x, y) ? "low" : null);
    t.push(row);
  }
  // 中央高地 plateau（16×16）
  for (let y = 56; y <= 71; y++)
    for (let x = 56; x <= 71; x++) t[y][x] = "high";
  // 纵向 water 沟（分割左右高地）
  for (let y = 56; y <= 71; y++) {
    t[y][63] = "water";
    t[y][64] = "water";
  }
  // 中央 bridge 连接左右高地
  for (let y = 60; y <= 67; y++) {
    t[y][63] = "bridge";
    t[y][64] = "bridge";
  }
  // 四条 ramp（plateau 边界外的过渡带）
  for (let x = 60; x <= 67; x++) {
    t[55][x] = "ramp";
    t[72][x] = "ramp";
  }
  for (let y = 60; y <= 67; y++) {
    t[y][55] = "ramp";
    t[y][72] = "ramp";
  }
  [
    [55, 55],
    [72, 55],
    [55, 72],
    [72, 72],
  ].forEach(([y, x]) => {
    t[y][x] = "ramp";
  });
  return t;
}

const terrain = generateTerrain();
// Tiled 数据：行主序（y 外层，x 内层）；虚空格写 0（无瓦片）
const data = [];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const type = terrain[y][x];
    data.push(type ? TERRAIN_GID[type] : 0);
  }

const map = {
  type: "map",
  version: 1.4,
  orientation: "isometric",
  renderorder: "right-down",
  width: N,
  height: N,
  tilewidth: 64,
  tileheight: 32,
  infinite: false,
  nextlayerid: 2,
  nextobjectid: 1,
  layers: [
    {
      id: 1,
      type: "tilelayer",
      name: "ground",
      width: N,
      height: N,
      x: 0,
      y: 0,
      data,
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "terrain",
      // 与 .tmj 同目录的 terrain.png，无 ../ 引用，Tiled 解析稳定。
      image: "terrain.png",
      imagewidth: 64 * 5,
      imageheight: 64,
      tilewidth: 64,
      tileheight: 64,
      margin: 0,
      spacing: 0,
      columns: 5,
      tilecount: 5,
    },
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "public", "maps");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "lost-temple.tmj");
writeFileSync(outFile, JSON.stringify(map, null, 2));
console.log("已生成", outFile, "（瓦片数：", data.length, "，虚空格：", data.filter((g) => g === 0).length, "）");
