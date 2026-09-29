// 一次性提取 config.ts 全部实体定义的 id/name/kind/race/tex → stdout JSON。
// 用途：占位图生成（gen-placeholders.mjs）与后续出图清点。
// 解析方式：按 id 出现位置向后 500 字符窗口内找 kind/race/tex 字段（容忍注释与字段间隔行）。
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8");

const idRe = /\bid:\s*"([^"]+)"/g;
const defs = [];
let m;
while ((m = idRe.exec(src))) {
  const id = m[1];
  // 跳过 RESOURCE_DEFS / 其它非实体块：实体块内必有 tex 字段
  const win = src.slice(m.index, m.index + 500);
  const tex = win.match(/\btex:\s*"([^"]+)"/);
  if (!tex) continue;
  const kind = win.match(/\bkind:\s*"(\w+)"/)?.[1] ?? "?";
  const race = win.match(/\brace:\s*"(\w*)"/)?.[1] ?? "";
  defs.push({ id, kind, race, tex: tex[1] });
}

// 去重（同一 id 多处引用时保留首个）
const seen = new Set();
const uniq = defs.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));

console.log(JSON.stringify({ total: uniq.length, defs: uniq }, null, 2));
