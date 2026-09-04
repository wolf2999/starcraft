// panel.js —— DevTools 侧栏面板的逻辑（跑在扩展自己的 world，不在页面里）。
//
// 工作流程：
// 1. 通过 chrome.devtools.inspectedWindow.eval 把 AGENT_SOURCE 注入“被检查页面”，
//    eval 直接返回 agent 对象（含 listScenes / listObjects / highlight 等方法）。
//    —— eval 跑在被检查页面的主世界，所以能读到 window.__GAME__ 这个活着的 Phaser 游戏。
// 2. 之后所有查询都通过 eval 调用 agent 的方法，返回“可序列化”的快照
//    （GameObject 本身不能跨 world 传递，只能传纯数据）。
// 3. 面板把快照渲染成可点的树；点场景 → 列出对象；点对象 → 在游戏里短暂高亮。
//
// 注意：高亮是 1.5s 的临时描边（定位用），不是常驻叠加层——你之前说“游戏里不需要”，
// 若想彻底零绘制，把 highlight() 调用删掉即可。

// —— 注入到被检查页面的 agent（字符串，eval 执行后把 agent 对象返给扩展）——
// 用 IIFE 包起来，eval 直接返回 agent，省去 window.__PI_AGENT__ 这种全局污染，
// 也能避免页面里有同名的 window.__PI_AGENT__ 时被替换。
// 注意：不要在这里面写 TypeScript（'as'/'类型注解'），VM 里是纯 V8 JS。
const AGENT_SOURCE = `
// 注意：eval 跑在被检查页面的主世界，看不到扩展的局部变量，
// 所以把结果挂到 window.__PI_AGENT__ 上并直接返回，让 panel.js 也能拿到引用。
var agentLocal = (function () {
  function getGame() {
    // 仅支持 Phaser 4：游戏主动把 new Phaser.Game(config) 的返回值挂到 window.__GAME__。
    // Phaser 4 不提供全局实例数组，game 实例只活在模块闭包里，扩展只能从页面全局取得，
    // 所以游戏入口必须用 README 里那段代码暴露。不做任何 Phaser 3 兼容。
    if (window.__GAME__) return window.__GAME__;
    if (window.__PHASER_GAME__) return window.__PHASER_GAME__;
    return null;
  }
  // 注意：Phaser 4 里 Container.list 是 GameObject[]（数组），
  // 而 Scene.children 是 DisplayList（extends List<...>），其 .list 也是数组。
  // 两种情况统一通过 obj.list 取子数组——以前代码把"DisplayList.list"当子 DisplayList 再 .list，
  // 在 Container 上会拿到 undefined，导致"对象数=顶层数 / 子节点树为空 / path 步进失败"。
  function childrenArr(o) { return (o && o.list) ? o.list : null; }
  function countObjs(s) { try { return s.children ? s.children.list.length : 0; } catch (e) { return -1; } }
  function listScenes() {
    var g = getGame(); if (!g || !g.scene) return [];
    return g.scene.scenes.map(function (s) {
      return { key: s.scene.key, active: s.scene.isActive(), visible: s.scene.isVisible(), objects: countObjs(s) };
    });
  }
  // 轻量：只取对象数，不分配大对象树。供面板每 2 秒轮询更新场景行的"N"用。
  function sceneObjectCount(sceneKey) {
    var g = getGame(); if (!g) return 0;
    var s = g.scene.getScene(sceneKey); if (!s || !s.children) return 0;
    return (s.children.list || []).length;
  }
  // 递归把场景根 DisplayList 转成纯数据快照。
  // 限深 8 层防页面卡死；每层软上限 5000（够用且不会把 inspectedWindow 序列化爆掉）。
  function snapshotList(list, depth) {
    if (!list || depth > 8) return [];
    var out = [];
    var arr = list.list || [];
    var n = Math.min(arr.length, 5000);
    for (var i = 0; i < n; i++) {
      var o = arr[i];
      if (!o) continue;
      var kidArr = childrenArr(o);
      out.push({
        i: i,
        type: o.type || (o.constructor && o.constructor.name) || '?',
        name: o.name || '',
        x: Math.round(o.x || 0),
        y: Math.round(o.y || 0),
        visible: !!o.visible,
        alpha: o.alpha,
        depth: (typeof o.depth === 'number' ? o.depth : 0),
        w: Math.round((o.displayWidth || 0)),
        h: Math.round((o.displayHeight || 0)),
        children: (kidArr && kidArr.length) ? snapshotList({ list: kidArr }, depth + 1) : []
      });
    }
    return out;
  }
  function listObjects(sceneKey) {
    var g = getGame(); if (!g) return [];
    var s = g.scene.getScene(sceneKey); if (!s || !s.children) return [];
    return snapshotList(s.children, 0);
  }
  function highlight(sceneKey, path) {
    var g = getGame(); if (!g) return;
    var s = g.scene.getScene(sceneKey); if (!s || !s.children) return;
    var o = s.children.list[path[0]]; if (!o) return;
    for (var i = 1; i < path.length; i++) {
      var a = childrenArr(o); if (!a) return;
      o = a[path[i]]; if (!o) return;
    }
    if (typeof o.getBounds !== 'function') return;
    var b = o.getBounds();
    var gfx = s.add.graphics().setDepth(99999);
    gfx.lineStyle(2, 0xffe000, 1);
    gfx.strokeRectShape(b);
    s.time.delayedCall(1500, function () { gfx.destroy(); });
  }
  function setVisible(sceneKey, path, visible) {
    var g = getGame(); if (!g) return false;
    var s = g.scene.getScene(sceneKey); if (!s || !s.children) return false;
    var o = s.children.list[path[0]]; if (!o) return false;
    for (var i = 1; i < path.length; i++) {
      var a = childrenArr(o); if (!a) return false;
      o = a[path[i]]; if (!o) return false;
    }
    o.visible = visible;
    return true;
  }
  function setDepth(sceneKey, path, depth) {
    var g = getGame(); if (!g) return false;
    var s = g.scene.getScene(sceneKey); if (!s || !s.children) return false;
    var o = s.children.list[path[0]]; if (!o) return false;
    for (var i = 1; i < path.length; i++) {
      var a = childrenArr(o); if (!a) return false;
      o = a[path[i]]; if (!o) return false;
    }
    if (typeof o.setDepth === 'function') o.setDepth(depth);
    else o.depth = depth;
    return true;
  }
  return {
    listScenes: listScenes,
    listObjects: listObjects,
    sceneObjectCount: sceneObjectCount,
    highlight: highlight,
    setVisible: setVisible,
    setDepth: setDepth
  };
})();
// 注意：eval 跑在被检查页面的主世界，看不到扩展的局部变量，
// 所以把结果挂到 window.__PI_AGENT__ 上同时让 eval 直接返回。
window.__PI_AGENT__ = agentLocal;
agentLocal;
`;

let currentScene = null;
let agent = null;             // 注入是否成功的标记（true/false）。方法调用都走 window.__PI_AGENT__。
let selectedRows = new Set(); // 当前在面板选中的节点行集合（支持多选）
let sortByDepth = false;      // 勾选后按 depth 降序排列（层级高者在上，类似图层面板）
let groupByType = false;      // 勾选后把扁平列表按 type 分组（纯 UI 便利，非真实树）

// 在页面里 eval 一段表达式；回调拿到 (result, exceptionInfo)。
// 失败时把异常详情显示在面板顶部，方便排查（比如页面脚本写错导致整个 VM 都装不上）。
function evalExpr(expr, cb) {
  chrome.devtools.inspectedWindow.eval(expr, (result, err) => {
    if (err) {
      console.warn("[panel] eval error:", err);
      const msg = "[panel] eval error: " + (err && err.description ? err.description : JSON.stringify(err));
      setStatus(msg);
    }
    if (typeof cb === "function") cb(result);
  });
}

// 把 agent 函数体注入被检查页面。注入流程：
// 1. eval AGENT_SOURCE（IIFE）→ 返回 agent 对象（Chrome 会序列化一份快照）
// 2. 同时 IIFE 末尾把同一个对象挂到 window.__PI_AGENT__（让后续 eval 能直接调用，
//    因为 eval 字符串在被检查页面 VM 执行，看不到扩展的局部变量）
// 3. 把 eval 返回对象当 ready 标记（listScenes 是否为函数）；不靠它做实际调用。
function injectAgent(done) {
  evalExpr(AGENT_SOURCE, (result, err) => {
    if (err) {
      setStatus("[panel] agent 注入 SyntaxError：" + (err.description || JSON.stringify(err)));
      return;
    }
    if (result && typeof result === "object") {
      // Chrome 跨世界 eval 会把返回值序列化；只要 result 是非 null 对象，
      // 就说明 IIFE 已执行且 window.__PI_AGENT__ 也被挂上了（同一段代码末尾赋值）。
      agent = result;
      setStatus(""); // 清掉上一次可能留下的错误提示
      if (typeof done === "function") done();
    } else {
      setStatus(
        "agent 注入失败（被检查页面还没准备好或存在其它脚本错误）。" +
        "请确认：1) 控制台无红色 SyntaxError；2) 游戏入口已挂 window.__GAME__；3) 刷新后重试。"
      );
    }
  });
}

function setStatus(msg) {
  const el = document.getElementById("status");
  if (msg) {
    el.textContent = msg;
    el.classList.add("show");
  } else {
    el.textContent = "";
    el.classList.remove("show");
  }
}

function renderScenes(scenes) {
  const root = document.getElementById("scenes");
  root.innerHTML = "";
  if (!scenes || !scenes.length) {
    // 提示走 status 行，不进 scenes 容器
    // Phaser 4 + ESM 打包且无全局出口时必然走到这里：
    // 扩展只能访问页面全局，拿不到闭包里的 game 实例，需游戏入口挂 window.__GAME__。
    setStatus("未找到 Phaser 游戏实例。请在游戏入口把 new Phaser.Game(config) 的返回值挂到 window.__GAME__（Phaser 4 不提供全局实例数组，扩展无法从页面全局取得）。");
    return;
  }
  setStatus(""); // 找到游戏就清掉 status
  scenes.forEach((sc) => {
    const div = document.createElement("div");
    div.className = "scene";
    div.textContent =
      sc.key + (sc.active ? " [active]" : "") + " — 对象数 " + sc.objects;
    div.onclick = () => {
      currentScene = sc.key;
      loadObjects(sc.key);
      document.querySelectorAll(".scene").forEach((e) => e.classList.remove("selected"));
      div.classList.add("selected");
    };
    root.appendChild(div);
  });
}

function loadObjects(sceneKey) {
  evalExpr(
    "window.__PI_AGENT__.listObjects(" + JSON.stringify(sceneKey) + ")",
    (objs) => renderObjects(objs || [])
  );
}

// 根据 o 的当前 visible / depth 重新写一行节点文本 + 样式（toggle 后复用）
function updateRowText(row, o, hasKids) {
  row.className = "obj" + (o.visible ? "" : " hidden");
  if (selectedRows.has(row)) row.classList.add("selected");
  row.textContent =
    "#" + o.i + " " + o.type +
    (o.name ? ' "' + o.name + '"' : "") +
    " @(" + o.x + "," + o.y + ") d=" + o.depth +
    " a=" + o.alpha +
    " " + o.w + "x" + o.h +
    (o.visible ? "" : " [hidden]") +
    (hasKids ? (row.__collapsed ? "  ▸" : "  ▾") + o.children.length : "");
}

function buildNode(o, path) {
  const wrap = document.createElement("div");
  wrap.className = "obj-wrap";

  const hasKids = o.children && o.children.length;
  const row = document.createElement("div");
  row.__o = o;        // 挂原始数据，toggle 时就地改 visible 并重绘本行
  row.__path = path;  // 该节点在场景树中的索引路径
  updateRowText(row, o, hasKids);

  row.onclick = () => {
    // 点击整行：高亮 + 切换多选选中态；若有子节点则同时折叠/展开子树
    if (currentScene)
      evalExpr(
        "window.__PI_AGENT__.highlight(" +
          JSON.stringify(currentScene) + "," + JSON.stringify(path) + ")"
      );
    if (selectedRows.has(row)) {
      selectedRows.delete(row);
      row.classList.remove("selected");
    } else {
      selectedRows.add(row);
      row.classList.add("selected");
    }
    if (hasKids) {
      const collapsed = wrap.classList.toggle("collapsed");
      // 行尾用 ▸/▾ 提示当前展开/折叠态
      row.__collapsed = collapsed;
      updateRowText(row, o, hasKids);
    }
    const none = selectedRows.size === 0;
    document.getElementById("toggleVis").disabled = none;
    document.getElementById("setDepthBtn").disabled = none;
    document.getElementById("bringFwdBtn").disabled = none;
    document.getElementById("sendBackBtn").disabled = none;
  };
  wrap.appendChild(row);

  if (hasKids) {
    const kids = document.createElement("div");
    kids.className = "obj-children";
    o.children.forEach((c) => kids.appendChild(buildNode(c, path.concat(c.i))));
    wrap.appendChild(kids);
  }
  return wrap;
}

// 递归按 depth 降序排列（层级高者在上，类似图层面板）；子节点也一并排
function sortTreeByDepth(nodes) {
  nodes.sort((a, b) => (b.depth || 0) - (a.depth || 0));
  nodes.forEach((n) => {
    if (n.children && n.children.length) sortTreeByDepth(n.children);
  });
}

// 分组模式：把平级无子节点的根 list 按 type 折叠。返回的 details 元素可被回收。
function buildGroupedByType(objs) {
  const groups = new Map();
  objs.forEach((o) => {
    const t = o.type || "?";
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(o);
  });
  // type 按数量降序，最多的在最上
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

  const wrap = document.createElement("div");
  wrap.className = "grouped";
  for (const [type, arr] of sorted) {
    if (sortByDepth) arr.sort((a, b) => (b.depth || 0) - (a.depth || 0));
    const det = document.createElement("details");
    det.open = false; // 默认折叠，需要时点开
    const sum = document.createElement("summary");
    sum.className = "group-head";
    sum.textContent = type + "  ×" + arr.length;
    det.appendChild(sum);
    arr.forEach((o) => det.appendChild(buildNode(o, [o.i])));
    wrap.appendChild(det);
  }
  return wrap;
}

function renderObjects(objs) {
  const root = document.getElementById("objects");
  root.innerHTML = "";
  // 重新渲染会生成新行，旧选中引用失效，清空多选避免操作到已脱离 DOM 的行
  selectedRows.clear();
  document.getElementById("toggleVis").disabled = true;
  document.getElementById("setDepthBtn").disabled = true;
  document.getElementById("bringFwdBtn").disabled = true;
  document.getElementById("sendBackBtn").disabled = true;
  if (!objs || !objs.length) {
    root.textContent = "（空场景）";
    return;
  }
  // 按层级排序：整棵对象树（含子节点）按 depth 降序
  if (sortByDepth) sortTreeByDepth(objs);
  // 按类型分组是纯 UI 便利（把扁平列表收拢），明确不是真实树，单独开关控制
  if (groupByType) {
    root.appendChild(buildGroupedByType(objs));
    return;
  }
  // 真实场景图：Scene 的 DisplayList 是根，Container/Layer 是分支，其余为叶子。
  // 若没有 Container/Layer，就是扁平显示列表——老实显示，不伪装成树。
  const hasBranch = objs.some((o) => o.children && o.children.length);
  if (!hasBranch) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent =
      "场景未使用 Container/Layer，显示为扁平显示列表（Phaser 默认如此，非假树）";
    root.appendChild(note);
  }
  objs.forEach((o) => root.appendChild(buildNode(o, [o.i])));
}

function refresh() {
  refreshScenes();
}

// 重新拉 scenes 列表并重建 #scenes DOM（不刷新 #objects，避免闪烁）
function refreshScenes() {
  if (!agent) {
    setStatus("正在注入 agent…");
    return;
  }
  setStatus("");
  evalExpr("window.__PI_AGENT__.listScenes()", (scenes) => renderScenes(scenes));
}

// 轻量轮询：只更新当前选中 scene 的"对象数"行，不重建 DOM，避免每 2 秒全清空闪一下
function refreshCounts() {
  if (!agent || !currentScene) return;
  evalExpr(
    "window.__PI_AGENT__.sceneObjectCount(" + JSON.stringify(currentScene) + ")",
    (n) => {
      if (typeof n !== "number") return;
      // 找到当前选中 scene 的 div，更新尾部 "— 对象数 N"
      const sel = document.querySelector(".scene.selected");
      if (sel) {
        const k = currentScene;
        sel.textContent =
          k + " [active] — 对象数 " + n;
      }
    }
  );
}

document.getElementById("refresh").onclick = refreshScenes;
// 显示/隐藏选中节点：批量 toggle 所有选中行的 visible，回写游戏
document.getElementById("toggleVis").onclick = () => {
  if (selectedRows.size === 0 || !currentScene) return;
  selectedRows.forEach((row) => {
    const o = row.__o;
    const path = row.__path;
    const next = !o.visible;
    evalExpr(
      "window.__PI_AGENT__.setVisible(" +
        JSON.stringify(currentScene) + "," + JSON.stringify(path) + "," + next + ")"
    );
    // 本地同步：就地改数据并重绘本行（不重建整棵树，避免折叠状态丢失）
    o.visible = next;
    const hasKids = o.children && o.children.length;
    updateRowText(row, o, hasKids);
  });
};
// 设层级：对所有选中节点 setDepth 到输入框的值（大者渲染在上）
document.getElementById("setDepthBtn").onclick = () => {
  if (selectedRows.size === 0 || !currentScene) return;
  const val = parseInt(document.getElementById("depthInput").value, 10);
  if (isNaN(val)) return;
  selectedRows.forEach((row) => {
    const o = row.__o;
    const path = row.__path;
    evalExpr(
      "window.__PI_AGENT__.setDepth(" +
        JSON.stringify(currentScene) + "," + JSON.stringify(path) + "," + val + ")"
    );
    o.depth = val;
    const hasKids = o.children && o.children.length;
    updateRowText(row, o, hasKids);
  });
};
// 上移/下移一层：对选中节点 depth ±1（已在游戏里立即反映层级变化）
function adjustDepth(delta) {
  if (selectedRows.size === 0 || !currentScene) return;
  selectedRows.forEach((row) => {
    const o = row.__o;
    const path = row.__path;
    const next = (typeof o.depth === "number" ? o.depth : 0) + delta;
    evalExpr(
      "window.__PI_AGENT__.setDepth(" +
        JSON.stringify(currentScene) + "," + JSON.stringify(path) + "," + next + ")"
    );
    o.depth = next;
    const hasKids = o.children && o.children.length;
    updateRowText(row, o, hasKids);
  });
}
document.getElementById("bringFwdBtn").onclick = () => adjustDepth(1);
document.getElementById("sendBackBtn").onclick = () => adjustDepth(-1);
// 勾选按层级排序：重新拉取并渲染对象列表（renderObjects 内会做 depth 降序）
document.getElementById("sortDepth").onchange = (e) => {
  sortByDepth = e.target.checked;
  if (currentScene) loadObjects(currentScene);
};
// 勾选按类型分组：重新拉取并渲染（仅 UI 便利，不表示真实父子关系）
document.getElementById("groupType").onchange = (e) => {
  groupByType = e.target.checked;
  if (currentScene) loadObjects(currentScene);
};
// 先注入 agent，再启动首次刷新与轮询；避免抢跑返回"未找到"。
injectAgent(() => {
  refreshScenes();
  setInterval(refreshCounts, 2000);
});
