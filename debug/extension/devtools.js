// DevTools 入口：注册一个侧边栏面板。
// 关键点：devtools 上下文里 chrome.devtools.* 自动可用，无需在 manifest 声明权限；
// 面板通过 chrome.devtools.inspectedWindow.eval 在“被检查页面”里执行代码，
// 因此能读到页面里的 Phaser 游戏实例，且【不需要 host_permissions】——
// 这对后续上架 Chrome Web Store 很友好（不申请广泛的主机权限，审核更顺）。
chrome.devtools.panels.create(
  "Phaser Inspector", // 面板标题
  "", // 图标留空，Chrome 用默认图标（上架时需补 128 图标）
  "panel.html"
);
