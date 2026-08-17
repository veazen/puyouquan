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

## 战略优先级（2026-08-16 产品负责人亲定五模块定位；执行方案见 `docs/strategy-2026-08-cn-five-modules.md`）
- **定位**：中国人的「活曲谱」平台——主打国内用户中文曲谱习惯（**简谱是主干**），**暂避 GuitarPro/MuseScore 专业制谱竞争**（上下游关系：吃它们的文件，不追深水刻版）。主攻垂类不变：**即兴伴奏 / 教师考编 / 艺考 / 师范**。
- **五核心模块**：①智能曲谱制作（MIDI 转谱转得好/配和弦补小调五声/三线节奏型库/专业简谱=电子琴·葫芦丝先行）②动态曲谱浏览跟弹（逐音点亮/点谱起播/跟练模式）③简谱制作·练习（视唱评分=考编硬考项）④乐器学习（尤克+吉他/键盘课表制）⑤智能工具（调音器/节拍器→乐器品牌捆绑供应商，品牌谱页 ?brand= 托管 H5）。
- **护城河**：三记谱法同源互切 + 结构化活谱 + 织体生成/智能配谱 + 八场景入口。简谱做到出版社考级谱 1:1 复刻；五线谱保持现状不再加深。
- **执行批次（提案待拍板）**：A 定位落地+动态谱地基 → B 制谱智能线（MIDI/调式/arrangeTabSong/节奏型库）→ C 简谱品类+简单模式+工具三件+学习 MVP → D 评分线+品牌首单。界面=简单/专业双模式（存量默认专业），移动端制谱=快改+管理。
- **变现纪律**：¥15/¥98 主线不动；付费只对新增量，**已免费一寸不退**；工具永久免费；ICP 经营许可前不启分账；小程序不碰支付。B 端敲门砖 Q2 末、同期对话 ≤2 家。
- **不做**：复音识别自研 / 瀑布视图 / 真人陪练 / 五线谱深水刻版（鼓谱/cross-staff/嵌套连音）/ 私有部署白标 / 原生 SDK / 社区论坛 / 移动端完整制谱。评分进会员权益的时点、B 端名单报价、批次开工序需产品负责人拍板，不擅自开工。
