import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// phaser 模块解析说明：
// phaser 官方包的 import 条件指向 dist/phaser.esm.js（Phaser 4 只有命名导出，
// 无 default），而 liquidphaser 的 dist 以 ESM 默认导入引用 phaser
// （import Phaser from "phaser"），Vite dev 预打包后运行时报
// "does not provide an export named 'default'"。
// 因此把 phaser alias 到 UMD 构建 dist/phaser.js：esbuild 预打包做 CJS 互操作
// 自动合成 default 导出，默认导入（liquidphaser）与命名空间导入（本项目
// import * as Phaser）两种写法都能正常工作。tsc 类型解析不受影响。
export default defineConfig({
  resolve: {
    alias: {
      phaser: fileURLToPath(
        new URL("./node_modules/phaser/dist/phaser.js", import.meta.url)
      ),
    },
  },
  server: {
    host: true,
    port: 5273
  },
  build: {
    target: "es2020",
    sourcemap: true
  }
});
