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
2. `node deploy/check-syntax.js muse-tab/index.html`（语法闸）→ `cd muse-tab/tests && node tv_matrix.js`（+ 涉及功能的专项套件；Playwright chromium 路径 env `CHROMIUM_PATH`）
3. 应用内更新日志加 `<li>`（搜 `b-changelog`，版本号递增）+ **同步递增 `APP_VER` 常量**（线上版本角标与冒烟落位都读它；语法闸会拦不一致——v59.2 教训）
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
- **`showModal(\`…\`)`/更新日志等模板字符串里禁用裸反引号**——内联代码词用 `<code>` 包裹，裸反引号会提前闭合模板字面量→整段脚本解析失败→编辑器白屏（v43.6 教训；`smoke.sh` 只查字符串标记抓不到）。发版前跑 `node deploy/check-syntax.js muse-tab/index.html`，部署流水线 checkout 后同名语法闸会拦截。

## 战略优先级（v37.6 起）
- **北极星**：本项目定位为「AI 时代的智能制谱/配谱工具 + 教育场景」，占据「AI 生成音频 / AI 转谱 → 人类可弹可唱可教的干净谱面」这一端。当下主攻垂类：**即兴伴奏 / 教师考编 / 艺考 / 师范**。
- **优先级重排**：MusicXML/MIDI 互操作、织体生成深化、智能配谱、网页分享卡、垂类文案 **优先于** 鼓谱、8va 括线、同谱表双声部等原路线图后段项。
- **变现重心**：创作者/专业订阅 + 垂类内容包 + B 端授权，而非曲谱库库存本身（库存正被 AI 转谱贬值）。
- **护城河**：三记谱法同源互切 + 出版级刻版引擎 + 织体生成 + 八场景入口——所有新功能应强化这四样，不做削弱它们的取舍。
- 执行顺序：P0 互操作（MusicXML 出→入→MIDI 入→MIDI 出）→ P1 织体深化+智能配谱 → P2 哼唱转谱+H5分享卡 → P3 垂类文案。支付/小程序/多声部转谱/版权策略等需产品负责人拍板，不擅自开工。
- 注：2026-08 两份重定位提案均已作废勿执行——「双引擎」（`docs/strategy-2026-08-dual-engine.md`）与「五模块活曲谱」（`docs/strategy-2026-08-cn-five-modules.md`）仅存档备查。
