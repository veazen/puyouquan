# 回归测试套件

Node + Playwright，无需构建，直接对 `../index.html`（file://）跑无头浏览器断言。

```bash
npm i playwright                  # 仅需一次；若全局已装：export NODE_PATH=$(npm root -g)
export CHROMIUM_PATH=/opt/pw-browsers/chromium   # 可选：自定义 Chromium 路径
export MUSETAB_URL=file:///path/to/index.html    # 可选：默认取 ../index.html
cd muse-tab/tests
node tv_matrix.js                 # 跨谱类冲突矩阵（改动后必跑）
node tv_head.js                   # 五线谱系统头部几何断言
# 其余套件见 PROJECT.md §7
```

输出约定：每项 ✅/❌，末尾 `NO ERRORS` 表示无页面报错。截图输出到当前目录（不入库）。

## CI 浏览器与本地二进制的差异（v60.26 教训）

CI（deploy.yml）按 lockfile 装 playwright 1.61.1，其配套浏览器是 **chromium-1228 = Chrome 149**；
而开发容器预装的 `/opt/pw-browsers/chromium` 是更旧的 chromium-1194。两者对「过渡何时启动」
行为不同：class/主题刚切换后立即读带 `transition` 属性的计算样式，Chrome 149 会返回**过渡起始值**
（tv_frame T16 曾因此只在 CI 红）。写计算样式断言前先注入 `transition:none!important` 并强制回流。

本地要用 CI 同款浏览器复核时（`cdn.playwright.dev` 若被网络策略拦截，走 Google 官方 CDN）：

```bash
curl -o /tmp/cft.zip https://storage.googleapis.com/chrome-for-testing-public/149.0.7827.55/linux64/chrome-linux64.zip
unzip /tmp/cft.zip -d /tmp && export CHROMIUM_PATH=/tmp/chrome-linux64/chrome
```

（版本号以 `node_modules/playwright-core/browsers.json` 里 chromium 的 `browserVersion` 为准。）

## 计算样式断言第二坑：读过一次的元素，类变更后同任务/下帧再读仍是陈旧值（v60.38 实测）

Chrome 149 下：对某元素调用过一次 `getComputedStyle(el).xxx` 后，再改它（或祖先）的
class，**同一任务里再读、甚至下一帧 rAF 里再读**（rAF 先于样式重算）拿到的仍是旧值——
实测约 300ms 后视觉与读数才恢复正确。tv_mviews T5b 曾因此假红：规则在场、类在场、
特异性更高，`getComputedStyle` 却坚持返回旧背景色。

**写法**：「变更前状态」与「变更后状态」拆成**两次 `pg.evaluate`，中间 `waitForTimeout`
跨一次真实 paint** 再读；不要在一次 evaluate 里「读→改类→再读」。与首坑（先掐过渡）
可能同时踩：跨 paint 后读到的还可能是过渡中间值，颜色断言尽量用「≠ 旧值」而非「== 目标值」。
