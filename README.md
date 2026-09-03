# StarCraft 1 风格 Demo (Phaser 4 + TypeScript)

一个用 **Phaser 4.0 + TypeScript + Vite** 搭建的星际争霸 1 风格即时战略小 Demo。

Phaser 4.0.0 已于 2024 年 11 月发布（稳定版）。星际争霸1 的资源涉及暴雪版权，直接下载完整游戏资产有版权风险。不过有开源社区资源可用（如 OpenGameArt 上有类似风格的像素资源，以及星际争霸开源复刻项目如 OpenBW、BWAPI 的数据提取方式）。

## 关于资源（重要说明）

星际争霸 1 的原版单位贴图、音效等素材受 **暴雪娱乐版权保护**，直接下载与分发存在版权风险，
因此本 Demo **不打包任何原版游戏素材**。所有单位/建筑/资源图形均通过 `Phaser.Graphics`
**程序化绘制**生成（像素风格），开箱即可运行，无任何版权问题。

如果你想用正版素材替换：把从自己合法拥有的游戏中提取的贴图放到 `public/assets/` 目录，
并在 `src/Textures.ts` 中改用 `scene.load.image()` 加载即可。
（注意：请确保你拥有该游戏的合法使用权。）

## 功能

- 程序化生成的星际风格单位：人族指挥中心、陆战兵、神族探机
- 水晶矿 / 瓦斯气泉资源点
- 左键框选单位、右键移动 / 采集资源
- 按 `B` 消耗矿物建造探机，按 `M` 消耗矿物建造陆战兵
- HUD 显示资源与单位数量

## 运行

```bash
npm install      # 安装依赖（需 Node 18+）
npm run dev      # 启动开发服务器，浏览器打开 http://localhost:5173
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览生产构建
```

## 操作

| 操作 | 说明 |
| --- | --- |
| 左键拖拽 | 框选单位 |
| 右键点击空地 | 移动选中单位 |
| 右键点击资源 | 派单位去采集 |
| 键盘 B | 建造一个探机（消耗 50 矿物） |
| 键盘 M | 建造一个陆战兵（消耗 50 矿物） |

## 项目结构

```
src/
  config.ts            # 全局常量与阵营配色
  Textures.ts          # 程序化生成所有精灵纹理
  entities.ts          # 单位/建筑与资源节点类
  scenes/GameScene.ts  # 主场景：地图、输入、玩法逻辑
  main.ts              # Phaser 4 游戏入口
```

## 注意

Phaser 4 的 ESM 构建**没有 default 导出**，因此代码中统一使用：
```ts
import * as Phaser from "phaser";
```
而不是 Phaser 3 常见的 `import Phaser from "phaser"`。
