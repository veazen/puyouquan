# 谱友圈（puyouquan.com）· 项目交接文档

> **本文档是项目的唯一权威交接文档。** 任何团队/任何 Claude Code 账号接手时先读完本文；每次发版必须同步更新「进度」与相关章节（见文末维护规则）。
> 最后更新：2026-07-20 · 当前版本 **v37.6** · 分支 `claude/guitar-tab-software-analysis-zqm0ua`

---

## 1. 项目定位（宏观）

**谱友圈** = 面向中国用户的**全民曲谱平台**：制谱（创作者工具）+ 找谱（曲谱库）+ 分享（曲谱卡/小程序，规划中）。

- 从"吉他谱编辑器"起步，已升级为覆盖简谱/五线谱/六线谱三大记谱法的完整制谱平台
- **核心差异化**：三种记谱法**同源数据互切**（Guitar Pro/MuseScore 不做简谱，国内简谱工具不做出版级五线谱）+ **八场景入口**（用户按"我要干什么"选类型，不需要懂记谱法）
- 商业方向：曲谱库付费/赞助/会员（官网已有赞助页框架），面向即兴伴奏考试人群的钢琴弹唱织体是重点卖点

### 八场景曲谱类型（v37.3 定型）

| 类型 | docType | 谱面组成 | 目标人群 |
|---|---|---|---|
| 🎸 弹唱谱 | `guitar`/`uku` | TAB+简谱+歌词+和弦图 | 弹唱自学者（最大盘） |
| 🎸 独奏谱 | `solo` | TAB+五线谱联排，无歌词 | 指弹/电吉他 |
| 🎹 钢琴弹唱谱 | `pianoacc` | 和弦+伴奏织体生成（纯伴奏，无主旋律）+歌词提示 | 即兴伴奏/幼师考编 |
| 🎹 钢琴独奏谱 | `piano` | 大谱表双手 | 琴童/古典 |
| 🎤 歌谱 | `vocal` | 简谱1–4声部+多段歌词 | 声乐/合唱/民乐（合并入口） |
| 📖 教学对照谱 | `teach` | 五线谱+简谱行+歌词 | 教师/课堂 |
| 🎻 器乐五线谱 | `instr` | 单谱表（高/中/低音谱号） | 器乐独奏/艺考 |
| 🎼 功能谱 | `func`/`chord` | 简谱+级数和弦 / 纯和弦谱（小节格+节奏斜线） | 乐队排练 |

旧类型自动归类：`vox→vocal`、`staff→instr`（见 `TYPE_NORM`）。

---

## 2. 仓库结构与环境

```
muse-tab/index.html        ← 全部产品（单文件 HTML+CSS+JS，~1.7MB，无构建）
muse-tab/site/             ← 官网多页站（index/make/view/features/help/log/sponsors + pyq.css/pyq.js）
muse-tab/tests/            ← Playwright 回归测试套件（11 个，见 §7）
muse-tab/tools/gen_glyphs.py ← SMuFL 字形提取脚本（fontTools，可复现）
deploy/deploy.sh           ← 服务器部署脚本（rsync 编辑器 + site/）
PROJECT.md                 ← 本文档
CLAUDE.md                  ← Claude Code 会话自动加载的约束入口
```

- **单文件架构是刻意选择**：零构建、零依赖、离线可用、artifact 可直接预览。不要引入打包器。
- 预览 artifact（Claude Code 内）：编辑器 `0209fdbe-14d8-448f-b088-d31be4405d17`（favicon 🎸）、官网 `dd24f67d-d137-43a4-89b6-dbe17f3fdf4d`（favicon 🎼）。
- 生产部署：`deploy/deploy.sh` rsync 到服务器 `/var/www/puyouquan/`（ICP 备案中，网站名称「谱友圈」）。

---

## 3. 数据模型（localStorage 持久化，**字段/键名是兼容性红线**）

### 3.1 song 对象（v3）

```js
{
  v:3, title, singer, lyricist, composer, maker,
  key:'C',          // 1=X（可动 do）；换调走 transposeEditor 自动移调
  beats:4, unit:4, tempo:90, capo:0,
  inst:'guitar'|'uku',
  func:true?,       // 功能谱（级数和弦）
  chordOnly:true?,  // 纯和弦谱（小节格渲染模式，v37.4）
  funcNames:true?,  // 和弦显示 音名（否则级数）
  pianoAcc:true?,   // 钢琴弹唱谱标志（v37.5，启用织体按钮+和弦标注）
  tabStaff:true?,   // TAB+五线谱联排（独奏谱）
  texId:'slow'?,    // 上次使用的伴奏织体
  tabVoices:[名字], voxVoices:[名字], lyricLines:N,
  voxNotations:[per-voice: undefined(简谱)|'staff'|'bass'|'alto'],
  voxDual:[per-voice bool],   // 谱表下附加简谱行（教学对照）
  customChords:{名->指法}, layout:{page,preset,density,scale,noteGap,rowGap},
  measures:[{ tabs:[[tabCol]], voxes:[[voxCol]],
    repeatStart, repeatEnd, sectionBar, finalBar, segno, coda, dc, ds, fine, volta }]
}
```

- **voxCol**：`{dur:1|2|4|8|16|32, dotted, deg:0-7(0=休止), acc:'#'|'b'|'', oct, lyrics:[段], tie, chord, dyn, grace, graceA, tup, orn:'up'|'down'|'tr'|'turn', adds:[{deg,acc,oct}]≤3}`
  - `adds` = 同列多音/和音（v37.6），主音字段不变保证向后兼容
- **tabCol**：`{dur, dotted, chord, notes:[{s:弦, f:品, x:闷音, tech, tk}], strum}`
- **localStorage 键全部 `musetab-*` 前缀，永远不改名**（改名=用户丢谱）。读取入口 `migrate()` 做版本兼容。

### 3.2 乐理核心

- 简谱是主数据（可动 do）；五线谱/TAB 都是**视图**。
- 绝对音级 step = 八度序×7+字母序（C4=35）。高音谱底线 E4=37 中线 B4=41；低音谱 G2=25/D3=29；中音谱 F3=31/C4=35。
- `staffKeyInfo()` → {step0, Li, sig, alt}；`midiToStaff(midi,K)` 按调性拼写（升调系用♯/降调系用♭）；`accCarry(accSt,step,target,keyAlt)` 小节内临时记号进位（重复省略/回调内补还原号），**按线/间（含八度）独立**。
- 移调：编辑器 `transposeEditor(delta)`（和弦名换根音+斜杠低音、TAB 品位**整体统一平移**优先）；曲谱库观看模式另有 `transposeSong(s,delta)`（逐音回折）——**两函数不能合并/改名冲突**（历史教训 v37.2）。

---

## 4. 渲染引擎（render() 管线）

`render()` 每次全量重建 `#score` SVG 字符串（p.push 拼接 → innerHTML）。

1. **measureLayout(mea)**：逐拍内容驱动宽度。`MIN_W` 对数时值间距（时值减半×0.72，Gourlay 惯例）+ **弹簧-刚杆**拍内映射（LilyPond spring-rod：evts→nodes→water-fill→warpX），跨声部严格对齐；首小节 `tsLead` 预留拍号空间；`chordOnly` 拍宽拉平。
2. **layoutSystems()**：自由换行（无每行小节数限制）+ 按内容量两端对齐；可用宽度扣除 `STAFF_HEAD_W`（系统头部）。
3. **sysMetrics()**：行高。五线谱行 48px 基础 + **按整曲音域自动扩加线区**（含 adds）+ dual 简谱行 +26。
4. **系统头部（严格出版标准，v36.9）**：`staffHeadGeom()` → 谱线自 `oxH=MARGIN` 起 → 谱号画在线上（G→G4线/F→F3线/C→中线）→ 调号逐个按字形宽度全尺寸排列（三谱号各自标准音位数组 SH_STEP/FL_STEP）→ 拍号（首行，timeSig 字形组字）。钢琴大谱表上下谱表严格纵向对齐 + SMuFL brace 花括线（非均匀缩放跨接）。
5. **五线谱音符**：SMuFL/Bravura 真字形（§5）；同列多音 `chNotes()` 升序、二度翻转+6.6、共用符干贯穿；符杠**随旋律倾斜**（坡度=首末符头连线之半、限幅±0.8线距，截距保证符干≥2.9线距）；加线音符干延伸至中线；空小节=居中整全休止；连音线贴符头弯向符干反侧；三连音括线随最高音抬升；小节号非首行行首。
6. **联排（tabStaff）**：TAB 上方标准谱表，品位→MIDI→`midiToStaff` 拼写，逐列左→右绘制（保证 accCarry 次序）。
7. 多页 A4 分页、打印预览（PV 对象 viewBox 开窗）、排版面板（基准纸张/智能疏密/手动微调）、反色模式、PNG 导出。

## 5. SMuFL 字形子系统（v36.7）

- `SMUFL` 常量内嵌 **47 枚 Bravura 轮廓**（Steinberg，SIL OFL 1.1，代码内已附署名注释）。单位=1谱线距、y 向下、y=0 为 SMuFL 注册线。
- `smg(name,x,y,SG,opts)` 绘制（opts.scale/sx/sy；**注意 v37.1 教训**：sx/sy 判断必须 `sx===s&&sy===s` 才走均匀分支）；`smw(name)` 宽度；`accG()` 变音记号右缘对齐；`tsigStr()` 拍号组字。
- 增补字形：改 `muse-tab/tools/gen_glyphs.py` 的 WANT 列表 → 下载 Bravura.otf + glyphnames.json（脚本内有 URL）→ 运行生成 glyphs.js → 用 python 正则整体替换 index.html 中 `const SMUFL = {...};` 一行。

## 6. 特色功能实现索引（grep 关键词 → 位置）

| 功能 | 入口/关键词 |
|---|---|
| 新建向导八卡 | `showNewWizard` / `showNewForm` / `createSong`（场景→基础形态映射） |
| 类型归类 | `docType` / `TYPE_CN` / `CC_CATS` / `TYPE_NORM` |
| 换调自动移调 | `transposeEditor` / `transChordName`（mm-ok 内触发） |
| 伴奏织体 | `PIANO_TEX`（8套）/ `genAccompaniment`（和弦时间线逐拍生效、柱式走 ev.s→adds、标注回填）/ `b-acctex` |
| 纯和弦谱 | `song.chordOnly`（斜线绘制在 cols.forEach、拍宽拉平在 measureLayout） |
| 和音输入 | `b-addnote`（唱名串自动向上排列）/ 五线谱 Ctrl+点击（click handler `dataset.sbot` 分支） |
| 记谱法切换 | `setVoxNotation` / `toggleVoxDual` / 面板 `vn-jp/st/bs/al/dual` |
| 智能填词 | `smartTokenize`（跳休止/连音、标点旁挂） |
| 播放 | `sf-embed` 内嵌采样、`playInst`、let-ring、和音在延音链外独立发声 |
| 曲谱库/观看 | `PRESETS` / `viewerBuildSong` / `vwTranspose` / 谱架模式 `enterStand` |
| 打印预览 | `pvOpen` / `PV_GEO` |

## 7. 测试体系（**每次改动必须跑**）

`muse-tab/tests/`，Node + Playwright（Chromium 路径 env `CHROMIUM_PATH`，默认 `/opt/pw-browsers/chromium`；被测页面 env `MUSETAB_URL`，默认仓库内 `../index.html`）：

```bash
cd muse-tab/tests && node tv_matrix.js   # 逐个跑，输出 ✅/❌ + NO ERRORS
```

| 套件 | 覆盖 |
|---|---|
| tv_matrix | **跨谱类冲突矩阵 12 组合**（各类型+Eb/B调+反色+A5/A3+预览），SVG 无 NaN/undefined |
| tv_head | 系统头部几何断言（谱线起点/谱号锚线/逐个调号精确坐标/双谱表对齐/联排） |
| tv_audit | 临时记号进位/拍号/连音线贴符头/左栏标签/字形库健全 |
| tv_types | 八类型创建+特性+旧类型兼容 13 项 |
| tv_acc | 织体生成音级断言/弹窗/换调联动 |
| tv_chord2 | 和音：符头数/共用符干/二度错位/简谱叠置/柱式生成 |
| tv_trans | 换调移调 6 项（含还原逐字节一致） |
| tv_brace | 花括线跨度（两端落线） |
| tv_staff / tv_piano / tv_combo | 五线谱/钢琴/联排基础回归 |

注意：SVG innerHTML 会把 `/>` 序列化为 `></tag>`，断言不要匹配 `/>`（历史坑）。

**发版流水线**：改 index.html → 跑相关套件+矩阵 → 更新日志 `<li>`（b-changelog 弹窗内，版本号递增）→ **更新本文档** → commit+push → 重发 artifact → 截图验证发给产品负责人。

## 8. 进度（版本履历摘要）

| 阶段 | 版本 | 内容 |
|---|---|---|
| 弹唱谱编辑器成熟期 | ~v34.92 | TAB+简谱+歌词、和弦图、技法、播放（let-ring）、曲谱库、智能填词 |
| 排版引擎 | v34.93–v35.8 | 打印预览、排版面板、Gourlay 内容驱动宽度、弹簧-刚杆、出版级字号 |
| 官网+视觉 | v35.9–v36.0 | 多页官网、编辑器视觉对齐、顶栏改名（预设/曲谱库） |
| 五线谱一期二期 | v36.1–v36.4 | staff MVP、联排、点击定音高、大谱表钢琴谱 |
| 五线谱深度打磨 | v36.5–v37.1 | 审计修正、**SMuFL/Bravura 字形引擎**、刻版规则（斜杠/整小节休止/小节号）、**系统头部出版标准**+中音谱表、行距音域扩展、五线谱+简谱行联排、标准花括线 |
| 换调移调 | v37.2 | 和弦+品位自动移调 |
| 八场景重构 | v37.3–v37.6 | 八类型体系、纯和弦谱、**钢琴弹唱织体生成（8套）**、**同列多音** |

## 9. 路线图（按优先级）

1. **三期（已规划未做）**：MusicXML 导入/导出；官网「制谱/功能/帮助」按八类型重写文案；曲谱库补五线谱/钢琴/和弦谱预设示例与封面适配
2. **服务器上线**：ICP 备案完成后 deploy.sh 部署；SF2 全量音色包升级（等可部署试听）
3. **民乐指法记号**（歌谱类型内：二胡弓指法/古筝指法层）
4. **小程序曲谱分享卡**（精致单页卡+链接）
5. 鼓谱、同谱表双声部（符干反向）、8va 括线、奏法记号（字形已提取：跳音/重音/保持/延长号）、和弦谱播放
6. 可能的仓库迁移：veazen/puyouquan（新会话操作）

## 10. 红线与约定（接手必读）

1. **localStorage `musetab-*` 键名与 song 字段永不改名删除**；新字段一律可选+默认兼容。
2. **简谱/TAB 分支行为不得回归**——五线谱相关改动必须跑 tv_matrix 全组合。
3. 开发分支 `claude/guitar-tab-software-analysis-zqm0ua`，**不开 PR 除非明确要求**；commit 信息中文、按版本号。
4. 不把模型标识写进推送产物；服务器凭据/SSH 私钥绝不进对话与仓库。
5. Bravura 字形保留 OFL 署名注释；新增字形走 gen_glyphs.py 保证可复现。
6. 函数命名冲突检查：单文件后声明覆盖前声明（grep 再命名，v37.2 教训）。
7. 视觉验证不能只看截图小图——用几何断言（数值坐标）下结论（v37.0 教训）。

## 11. 本文档维护规则

- **每次发版**（版本号递增）：更新顶部版本号/日期、§8 进度表；涉及架构/数据模型/红线的改动同步到对应章节。
- 新增测试套件登记到 §7；新决策（定位/取舍）写进 §1 或 §9。
- 文档随代码同 commit 提交，保持 git 历史可追溯。
