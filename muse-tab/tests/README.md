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
