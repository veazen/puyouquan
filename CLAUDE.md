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
- **`showModal(\`…\`)`/更新日志等模板字符串里禁用裸反引号**——内联代码词用 `<code>` 包裹，裸反引号会提前闭合模板字面量→整段脚本解析失败→编辑器白屏（v43.6 教训；`smoke.sh` 只查字符串标记抓不到）。发版前跑 `node deploy/check-syntax.js muse-tab/index.html`，部署流水线 checkout 后同名语法闸会拦截。

## 战略优先级（2026-08-16 双引擎重定位，取代 v37.6 执行序；全文见 `docs/strategy-2026-08-dual-engine.md`）
- **北极星（承接扩展）**：双引擎 = **智能看谱**（看谱→学习→跟弹→连接乐器）+ **智能制谱**（一键弹唱伴奏/制谱体检/AI 转谱承接）——同一个刻版引擎的两扇门，占据「AI 生成音频/转谱 → 人类可弹可唱可教」的生产端与消费端。主攻垂类不变：**即兴伴奏 / 教师考编 / 艺考 / 师范**。
- **护城河**：三记谱法同源互切 + 出版级刻版引擎 + 看谱学习闭环 + 织体生成/智能配谱——新功能只做强化这四样的事；**不和库存竞赛，和形态竞赛**。
- **执行序**：S0 定位落旗（三域品牌词/双引擎卡）→ S1 双引擎 P0（练习模式 HUD+调音器+打卡｜智能配谱 2.0 四步+制谱体检｜考编包+存证+机构包+供给 200 首）→ S2 反馈闭环（跟弹评分/视唱/Web MIDI/周报/打赏）→ S3 杠杆（专业版 SKU/教学后台/弹奏转谱服务端）。
- **变现纪律**：一条会员主线（¥15/¥98 不动价）；付费只对新增量，**已免费的一寸不退**；创作者经济只开打赏+存证（只称「创作时间存证」不称确权）；ICP 经营许可前不启用分账；小程序不碰支付。
- **不做**：复音识别自研 / 瀑布视图 / 约稿市场 / 白标 / 社区论坛 / 两条会员线 / 多声部转谱自研。弹奏转谱 GPU 预算、专业版定价、小程序提审等仍需产品负责人拍板，不擅自开工。
