# Phaser Inspector（DevTools 扩展）

Chrome DevTools 侧栏面板，用于审查 **Phaser 4** 游戏的场景树（节点类型 / 坐标 / depth / 显隐 / 缩放层级等），
并支持点击高亮、多选、显示/隐藏、上移/下移一层、设层级、按层级排序、按类型分组、折叠展开子树。

> 仅支持 **Phaser 4**。不做任何 Phaser 3 兼容（Phaser 3 的 `Phaser.GAMES` 全局数组在 Phaser 4 已移除，
> 且 ESM 打包下 game 实例只活在模块闭包里，扩展只能从页面全局取得）。

## 加载扩展

1. 打开 `chrome://extensions`，开启「开发者模式」。
2. 「加载已解压的扩展程序」→ 选择本目录（`debug/extension`）。
3. 打开目标游戏页面 → F12 打开 DevTools → 顶部出现 **Phaser Inspector** 标签页 → 点开即可。
4. 改过本目录文件后：回 `chrome://extensions` 点「重新加载」该扩展，并重新打开 DevTools / 刷新面板。

## 新游戏接入（必做）

Phaser 4 不会在全局暴露 Game 实例，因此**每个要被审查的游戏**，都需要在入口把
`new Phaser.Game(config)` 的返回值挂到 `window.__GAME__`。直接复制下面这段：

```ts
// 入口文件（如 src/main.ts）里，替换原来的 `new Phaser.Game(config);`
const game = new Phaser.Game(config);
// 仅开发期暴露，生产构建不留全局；如不需要区分环境，可去掉 if 直接赋值
if (import.meta.env.DEV) (window as any).__GAME__ = game;
```

如果使用 JS（非 TS）或不想带环境判断，可简化为：

```js
// 入口文件里
const game = new Phaser.Game(config);
window.__GAME__ = game;
```

> ⚠️ 别手抄错：示例里括号/分号必须完整。复制后贴回主入口，
> 立刻 `npm run dev` 重启 vite，硬刷新浏览器，并在 DevTools Console 验证
> `!!window.__GAME__` 为 `true`（必须 true，`false` 表示代码没执行到位）。
>
> 没有这行代码，面板会提示「未找到 Phaser 游戏实例」。扩展不修改游戏内部逻辑，只读取场景树快照。

## 面板操作速览

- 顶部场景列表：每个场景一行，右侧 `对象数` 为顶层根节点数（容器不计入其内层子节点）。
- 点任意行：场景内高亮该对象 + 切换多选（多选后可批量「显示/隐藏」「上移/下移一层」「设层级」）。
- 有子节点的行：点击整行即折叠/展开子树（行尾 `▾N` / `▸N` 表示展开/折叠）。
- 工具栏：`按层级排序`（按 depth 重排）、`按类型分组`、`设层级` 输入框 + 按钮、`上移/下移一层`（depth ±1）。
