# 谱友圈（puyouquan.com）— Claude Code 会话须知

**先读 `PROJECT.md`**（项目唯一权威交接文档：定位/数据模型/渲染引擎/测试/进度/路线图）。

## 硬约束
- 产品 = `muse-tab/index.html` 单文件（无构建，勿引入打包器）；官网 = `muse-tab/site/`。
- localStorage `musetab-*` 键名与 song 数据字段**永不改名删除**（用户数据红线）。
- 开发/推送分支：`claude/guitar-tab-software-analysis-zqm0ua`；**不开 PR 除非用户明确要求**。
- 不把模型标识写入 commit/代码/推送产物；服务器凭据绝不进对话与仓库。
- 简谱/TAB 行为不得回归：任何改动跑 `muse-tab/tests/` 相关套件 + `tv_matrix.js`。

## 发版流水线（每个版本）
1. 改 `muse-tab/index.html`
2. `cd muse-tab/tests && node tv_matrix.js`（+ 涉及功能的专项套件；Playwright chromium 路径 env `CHROMIUM_PATH`）
3. 应用内更新日志加 `<li>`（搜 `b-changelog`，版本号递增）
4. **更新 `PROJECT.md`**（版本号/进度表/受影响章节）
5. commit（中文、按版本号）+ push
6. 重发编辑器 artifact 预览 + 截图验证发给用户

## 常用入口（grep）
`createSong` `docType` `render(` `measureLayout` `layoutSystems` `sysMetrics` `staffHeadGeom` `SMUFL` `smg(` `accCarry` `transposeEditor` `PIANO_TEX` `genAccompaniment` `chNotes` `setVoxNotation`

## 已知坑
- 单文件后声明函数覆盖前声明——新函数名先 grep（v37.2 教训）。
- SVG innerHTML 把 `/>` 序列化为 `></tag>`——测试断言别匹配 `/>`。
- `smg` 非均匀缩放：只有未传 sx/sy 才走均匀分支（v37.1 教训）。
- 位置/对齐问题用几何断言（数值坐标）验证，不要只看截图。
