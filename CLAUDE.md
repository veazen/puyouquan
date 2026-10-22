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
3. 应用内更新日志加 `<li>`（搜 `b-changelog`，版本号递增）+ **同步递增 `APP_VER` 常量**（线上版本角标与冒烟落位都读它；语法闸会拦不一致——v59.2 教训）；内联日志超过 60 条时先跑 `node deploy/changelog-archive.js --keep=40`（更早的搬到 `muse-tab/site/log-full.html`，v65.6 起）
4. **更新 `PROJECT.md`**（版本号/进度表/受影响章节）
5. commit（中文、按版本号）+ push
6. 重发编辑器 artifact 预览 + 截图验证发给用户
7. **涉及 `miniprogram/` 的版本**：递增 `deploy/mp-release.json` 的 `version`（小程序自己的 1.1.x 线，对照表见 `miniprogram/README.md`）→ 推送后工作流 `mp-upload.yml` 自动上传为开发版本，告诉用户去 mp 后台「版本管理」点「提交审核」→「发布」（v66.7 起，需仓库 secret `MP_UPLOAD_KEY`）。**未配置密钥或上传失败时**照旧：把整个目录打成 `puyouquan-miniprogram-vXX.zip` 用文件直接发给用户（产品指示：不自己去仓库下载），注明「导入→上传→提审→发布」，zip 文件名用仓库 vXX

## 常用入口（grep）
`createSong` `NWB`（谱行引擎/谱名表）`NWP`（新建面板）`PQ_KIND`（统一谱名表，与 `api/kindname.js` 逐字节同一份，改规则两边一起改）`pqIcon` `renderOffscreen` `docType` `render(` `measureLayout` `layoutSystems` `sysMetrics` `staffHeadGeom` `SMUFL` `smg(` `accCarry` `transposeEditor` `PIANO_TEX` `genAccompaniment` `chNotes` `setVoxNotation` `FLOW`（新外壳：`flowOn` `setMode` `FLOW.tree/pal/mode/rd/cmd/mob/tour`）`EXPORT_ACT` `sysAct` `pgnoCfg`（v68.5 页码）`partsPlan` `partSong` `partRender` `partJobNow`（v68.6 分谱＝只读派生副本） `toastSay`（v68.7 新外壳短提示条：结果 + 动作 + data-k，旧外壳原文）`F.mi`（菜单统一模板） `showVoxChordMenu`（级数构建器）`showChordEditor`（GP 指法编辑器）`chordShapeStd` `keySpell`（v68.9 和弦引擎：新外壳全部入口按行分流到这两个完整引擎，**不要再把入口接到只有文本框的 showChordQuick**）

## 已知坑
- 单文件后声明函数覆盖前声明——新函数名先 grep（v37.2 教训）。
- SVG innerHTML 把 `/>` 序列化为 `></tag>`——测试断言别匹配 `/>`。
- `smg` 非均匀缩放：只有未传 sx/sy 才走均匀分支（v37.1 教训）。
- 位置/对齐问题用几何断言（数值坐标）验证，不要只看截图。
- **v68.2 起两套外壳并存**：默认新外壳 flow，旧外壳 `?shell=classic` 兜底——动外壳或共享函数要两种都跑（tv_shellflow/tv_trktree/tv_modes/tv_flowdef 对拍 `tests/shellflow_ref.json`）；新测试默认走新外壳入口（`#dt-add`、文件 ▾、右栏「智能」等），测旧布局结构的才钉 `?shell=classic`。
- **v68.7 起新外壳文案有字数预算**（方案 `docs/design-2026-10g` P1–P4：按钮 ≤4 字、菜单项 ≤6 字不带副标题、悬停 ≤12 字、不写「左栏 / 右栏 / 行 2」等位置词）：改界面文字跑 `node deploy/check-wording.js` 看「字数预算」报告与 `tv_textbudget`（37 屏只降不升，有意增加写 `tests/textbudget_ref.json` 的 allow 带上限）；新外壳提示条用 `toastSay`，旧外壳原文不动。
- **`showModal(\`…\`)`/更新日志等模板字符串里禁用裸反引号**——内联代码词用 `<code>` 包裹，裸反引号会提前闭合模板字面量→整段脚本解析失败→编辑器白屏（v43.6 教训；`smoke.sh` 只查字符串标记抓不到）。发版前跑 `node deploy/check-syntax.js muse-tab/index.html`，部署流水线 checkout 后同名语法闸会拦截。

## 战略优先级（v37.6 起）
- **北极星**：本项目定位为「AI 时代的智能制谱/配谱工具 + 教育场景」，占据「AI 生成音频 / AI 转谱 → 人类可弹可唱可教的干净谱面」这一端。当下主攻垂类：**即兴伴奏 / 教师考编 / 艺考 / 师范**。
- **优先级重排**：MusicXML/MIDI 互操作、织体生成深化、智能配谱、网页分享卡、垂类文案 **优先于** 鼓谱、8va 括线、同谱表双声部等原路线图后段项。
- **变现重心**：创作者/专业订阅 + 垂类内容包 + B 端授权，而非曲谱库库存本身（库存正被 AI 转谱贬值）。
- **护城河**：三记谱法同源互切 + 出版级刻版引擎 + 织体生成 + 八场景入口——所有新功能应强化这四样，不做削弱它们的取舍。
- 执行顺序：P0 互操作（MusicXML 出→入→MIDI 入→MIDI 出）→ P1 织体深化+智能配谱 → P2 哼唱转谱+H5分享卡 → P3 垂类文案。支付/小程序/多声部转谱/版权策略等需产品负责人拍板，不擅自开工。
- **2026-08-31 拍板**：对外定位话术＝**「专业曲谱平台」**（出版级·科教级制谱；勿再用「智能曲谱平台」）；平台计划书（`docs/plan-2026-09-platform.md`）的三层结构获认可，执行前提＝先完善曲谱制作；课程内容来源＝自制+签约+UGC 三轨（网站框架页 `site/kecheng.html` 已建，课程功能未开工）；四阶段工程动工前仍需逐项拍板。
- 注：2026-08 两份重定位提案均已作废勿执行——「双引擎」（`docs/strategy-2026-08-dual-engine.md`）与「五模块活曲谱」（`docs/strategy-2026-08-cn-five-modules.md`）仅存档备查。
