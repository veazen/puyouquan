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

**省资源模式（负责人 2026-10-24：「速度太慢，消耗 Token 太多」→ 按此执行）**：多代理工作流里小版本验收派 1 人（功能保全 + 制谱 / 排版视角走一遍）；L 版（改引擎、数据形态或跨版本基线）另派 2 名专项审核（数据兼容与旧版回落 / 刻版几何与快照迁移），版面组常设并行（负责人 2026-11-06「适当加代理」）；每个环节只跑本次改动直接影响的套件（grep 改动的 id / 文案 / 函数），红了只重跑红的；小版本发版前本地不跑全量 run_all.js；L 版推送前本机跑一次全量（JOBS=3），全量回归交给推送后的 CI（CI 红了再修）；截图 2–3 张关键前后对照；代理报告 ≤1200 字。保留不变：功能保全（被挪 / 撤入口先断言新位置可见再点，v68.9 教训）、旧外壳与 ?next=0 零差异、快捷键不变、语法闸 + 措辞闸 + tv_matrix。

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

## 战略优先级（2026-11-06 起，取代 v37.6 版）
- **北极星（负责人 2026-11-06 定位纠正）**：谱友圈＝**出版级专业曲谱平台**。出版级制谱是基石，基石先要牢固；下一阶段在这块基石上深度绑定 **AI 智能制谱与 AI 音乐工具**（AI 生成 / 转谱产物 → 可直接付印的干净谱面）。**考编 / 艺考 / 师范 / 课堂等教育用途不是核心**：只作谱库里可筛选的用途标签（`song.intent`、`?zt=`、搜索词），不主导功能与页面设计，不进首屏、主导航、新建主入口与卖点文案。对外话术＝「专业曲谱平台」（出版级·科教级制谱；勿用「智能曲谱平台」）。
- **基石七项**：刻版 · 记谱完整度 · 互通（MusicXML / MIDI 出入）· 编辑可靠 · 输出（打印 / 分谱 / 页码）· 性能 · 数据安全；各项的数值验收口径与版本序见 `docs/plan-2026-11-foundation.md`（§1.1、§3）。新功能先问：让谱更对、更全、更稳了吗？
- **优先级**：基石欠账（导入真实谱子会丢东西 ＞ 编辑会出错 / 丢数据 ＞ 刻版看起来不专业）**优先于**新入口、新场景、营销文案与平台层功能。主线（记谱 / 互通）按此排；版面组（刻版 / 输出）常设并行，落地版与主线的引擎大改错开。同谱表双声部是记谱完整度最大欠账（2026-10-27 已拍板），不再被其他工作插队。8va 括线 v42.8 已完成；鼓谱 / 贝斯谱整类待拍板。
- **量尺先于修补**：导入报告要「读不了的都计数点名」才算量尺（v70.3 起），skip=0 之前不作质量结论；互通以第三方文件与独立读取器（music21）验证，不以自家往返自证；刻版以几何 / 竖向数值断言验证，不只看截图；改谱面的版本按规程逐项签字前移跨版本基线。
- **护城河**：出版级刻版引擎 ＋ 三记谱法同源互切 ＋ 互操作保真 ＋ 可验证的质量门（导入报告 ＋ 谱面质量门，同样用于 AI 产物）——所有新功能应强化这四样，不做削弱它们的取舍。织体生成 / 智能配谱是 AI 制谱方向的已有资产：维护不退化，深化排在基石之后。
- **变现重心**：专业制谱订阅 ＋ 出版级输出 ＋ B 端授权；不以垂类内容包为重心（曲谱库存正被 AI 转谱贬值）。
- **分类（2026-10-31 拍板，2026-11-06 修订）**：谱库与新建一级按**谱种**（简谱 · 五线谱 · 钢琴谱 · 吉他谱 · 尤克里里 · 合唱谱 · 功能谱；和弦谱＝功能谱，不设「器乐」一级）；用途（考编 / 艺考 / 师范 / 课堂）降为可筛选标签与长尾专题——搜索、`?zt=` 深链、条件块可达，不在首屏 / 首页 / 新建主入口露出；方案 §十四 P3 的专题页搁置，谱种页 SEO 排在基石之后。方案与 30 项拍板见 `docs/design-2026-11-taxonomy/README.md`，修订见 `docs/plan-2026-11-foundation.md` §2、§5。
- **执行顺序**：自家 MusicXML / MIDI 往返（原 P0 互操作）已完成，第三方保真未达标。现按 `docs/plan-2026-11-foundation.md` §3：v70.3 定位纠偏＋导入如实＋编辑纠错 → v70.4 双音震音＋批量改时值＋倚音加线＋`song.src` → v70.5 / v70.6 同谱表双声部（a 读得进·听得到·导得出 → b 印得对·写得出）→ v70.7 版面①确定性（SMuFL 字形 / 字体内嵌 / 版宽）→ v70.8 第二批记谱字段 a → v70.9 版面②竖向排版 → v71.0 独立圆滑线 / 手动符杠 → v71.1 第二批字段 b＋曲库第二批 → 长谱性能 → 分谱补全 → 互通长尾；MIDI 连音识别由互通组并行。AI 方向（智能制谱 / AI 音乐工具）在基石达标后逐项拍板立项。支付 / 小程序 / 多声部转谱 / 版权策略 / 评审团 C·D 段 / 离线 PWA 动工等需产品负责人拍板，不擅自开工。
- **兼容不变**：用途相关的深链与数据（`?new=`、`?zt=`（含 jixing 别名）、`song.intent`、`SC.*.tag`、`pack_kaobian`、垂类落地页 URL 与 sitemap 条目、埋点白名单）只增不改；编辑器内的措辞调整只做在新外壳（启动台共用静态 HTML 用 JS 注入，不改静态 HTML），旧外壳与 `?next=0` 零差异。
- **2026-08-31 拍板**：平台计划书（`docs/plan-2026-09-platform.md`）的三层结构获认可，执行前提＝先完善曲谱制作；课程内容来源＝自制+签约+UGC 三轨（网站框架页 `site/kecheng.html` 已建，课程功能未开工）；四阶段工程动工前仍需逐项拍板。
- 注：2026-08 两份重定位提案均已作废勿执行——「双引擎」（`docs/strategy-2026-08-dual-engine.md`）与「五模块活曲谱」（`docs/strategy-2026-08-cn-five-modules.md`）仅存档备查。v37.6 的「智能制谱 / 配谱 ＋ 教育场景」北极星与「八场景入口」护城河已由 2026-11-06 纠正取代，勿再据以设计功能或页面。
