// 生成 Tiled 等距地图 public/maps/lost-temple.tmj
// 地形布局与 src/maps/lostTemple.ts 的 generateTerrain() 保持一致。
// 运行：node scripts/gen-map.mjs
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

const N = 32;
// 瓦片 gid ↔ 地形（与 src/terrain.ts 的 TERRAIN_GID 一致）
const TERRAIN_GID = { low: 1, high: 2, ramp: 3, water: 4, bridge: 5 };

// 复刻 src/maps/lostTemple.ts 的 generateTerrain()
function generateTerrain() {
  const t = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) row.push("low");
    t.push(row);
  }
  for (let y = 12; y <= 19; y++)
    for (let x = 12; x <= 19; x++) t[y][x] = "high";
  for (let y = 12; y <= 19; y++) {
    t[y][15] = "water";
    t[y][16] = "water";
  }
  for (let y = 14; y <= 17; y++) {
    t[y][15] = "bridge";
    t[y][16] = "bridge";
  }
  for (let x = 14; x <= 17; x++) {
    t[11][x] = "ramp";
    t[20][x] = "ramp";
  }
  for (let y = 14; y <= 17; y++) {
    t[y][11] = "ramp";
    t[y][20] = "ramp";
  }
  [
    [11, 11],
    [20, 11],
    [11, 20],
    [20, 20],
  ].forEach(([y, x]) => {
    t[y][x] = "ramp";
  });
  return t;
}

const terrain = generateTerrain();
// Tiled 数据：行主序（y 外层，x 内层）
const data = [];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) data.push(TERRAIN_GID[terrain[y][x]]);

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
      imageheight: 32,
      tilewidth: 64,
      tileheight: 32,
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
console.log("已生成", outFile, "（瓦片数：", data.length, "）");
