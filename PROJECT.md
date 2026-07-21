# 谱友圈（puyouquan.com）· 项目交接文档

> **本文档是项目的唯一权威交接文档。** 任何团队/任何 Claude Code 账号接手时先读完本文；每次发版必须同步更新「进度」与相关章节（见文末维护规则）。
> 最后更新：2026-07-21 · 当前版本 **v39.7** · 分支 `claude/guitar-tab-software-analysis-zqm0ua`

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
.claude/agents/            ← 协作角色库（10个，选自 MIT 开源 agency-agents；新会话自动注册为 subagent，见该目录 README）
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
| 伴奏织体 | `PIANO_TEX`（11套·level分级）/ `genAccompaniment`（可选 chordVi/rhVi/lhVi 声部参数）/ `suggestChords` / `b-acctex` |
| 智能配谱 | `arrangeAccompaniment(melody,{texId,pure,suggest})`（纯函数开新窗口）/ `b-arrange`（vocal/teach/instr 可见） |
| 哼唱成谱 | `hmPitchTrack`（NSDF+首峰+中值）/ `hmDetectKey` / `hummingToSong`（quantizeToCols legato 参数）/ 向导 nw-hum |
| 分享卡（静态） | `buildShareCardSVG`（干净快照嵌套裁窗+二维码占位）/ `exportShareCard`（CSS变量解析→canvas 2x PNG）/ 弹窗 ex-card |
| 互动谱（动态分享） | `exportInteractiveCard`（fetch 自身源码→DOM 快照兜底；注入 `pyq-share-data` 脚本；**源码内严禁裸写 body 闭合标签字面量**）/ `enterShareViewer`（`window.PYQ_SHARE` 经 DOMContentLoaded 启动，body 类 viewer+share）/ 弹窗 ex-icard |
| 节拍器/倍速 | `metroClick`（正弦+噪声拍点，首拍重音）/ `metroOn`·`playRate`（play() 内 spb 缩放与逐拍布点）/ 播放条 `b-metro`·`mx-rate` |
| 左栏谱类感知 | `DOCK_PANELS`（类型→页面板集合与顺序，flex order 排序）/ `renderDock`（页签显隐/命名/标题/失效页回退，render() 首行调用）/ `setRibbon`（面板显隐+排序在此应用）/ 专属面板 panel-vox-acc·fn·arr·lyradd（按钮全部委托既有流程） |
| 纯和弦谱 | `song.chordOnly`（斜线绘制在 cols.forEach、拍宽拉平在 measureLayout） |
| 和弦引擎（v39.0） | `CHORD_TEMPLATES`（22类型×E/A把位模板）/ `movableShape`（未知类型返回null，绝不静默大三）/ `algoShape`（4品窗音程搜索，uku主用）/ `parseChordName` / `QUAL_INTERVALS`（与模板同口径音程表，chordTones/织体共用，1/3/5/8槽位恒在）/ `chordShape`（精修库→模板→algo 三级兜底，签名不变19处调用零改动）/ `auditionShape`（琶音试听）/ `diatonicChords` / `rebuildChordList`（动态候选） |
| 和音输入 | `b-addnote`（唱名串自动向上排列）/ 五线谱 Ctrl+点击（click handler `dataset.sbot` 分支） |
| 记谱法切换 | `setVoxNotation` / `toggleVoxDual` / 面板 `vn-jp/st/bs/al/dual` |
| 智能填词 | `smartTokenize`（跳休止/连音、标点旁挂） |
| 播放 | `sf-embed` 内嵌采样、`playInst`、let-ring、和音在延音链外独立发声 |
| 曲谱库/观看 | `PRESETS` / `viewerBuildSong` / `vwTranspose` / 谱架模式 `enterStand` |
| 打印预览 | `pvOpen` / `PV_GEO` |
| MusicXML 导出 | `exportMusicXML`（divisions=48，音高经 staffKeyInfo 拼写）/ `downloadMusicXML` / 打印弹窗 ex-mxl |
| MusicXML 导入 | `importMusicXML`（DOMParser；音高 midi−keyRef→SEMI_DEG；跳过计数）/ 向导 nw-import |
| MIDI 导入 | `parseSMF`（SMF 0/1+运行状态）/ `quantizeToCols`（16分网格量化，**通用模块**）/ `buildSongFromMIDI` / 向导 nw-midi |
| MIDI 导出 | `exportMIDI`（SMF format1；tie链合并长音/和音/TAB轨含capo）/ `downloadMIDI` / 弹窗 ex-mid |

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
| tv_acc | 织体生成音级断言/弹窗/换调联动/**配和弦建议(不覆盖)**/11套分级/新织体生成 |
| tv_arrange | 智能配谱：teach三声部产出/纯伴奏/换调联动/已填保留/入口显隐——5项 |
| tv_humming | 哼唱：页面内合成带颤/包络正弦旋律→音级与时值断言/定调G/无声降级——5项 |
| tv_card | 分享卡：三谱类出卡结构断言/光栅化冒烟(非空像素)/入口+编辑态还原——5项 |
| tv_chord2 | 和音：符头数/共用符干/二度错位/简谱叠置/柱式生成 |
| tv_trans | 换调移调 6 项（含还原逐字节一致） |
| tv_brace | 花括线跨度（两端落线） |
| tv_staff / tv_piano / tv_combo | 五线谱/钢琴/联排基础回归 |
| tv_viewer | 互动谱+节拍器：Node 侧打包注入→观看模式启动/移调不改原数据/倍速时长比/节拍器源增量/导出自打包完整性/双模式入口——6项 |
| tv_dock | 左栏谱类感知：8类型页签/面板集合与排序断言、＋歌词行流程、专属按钮真实生效、旧控件齐全——10项 |
| tv_tech | 揉弦/闷音：波峰数随时值、扩选范围几何断言（波浪/虚线末端落在末音列格）、单音兼容、滑弦成链兼容——5项 |
| tv_safety | 数据安全：迁移逐条容错/渲染异常不落盘自动撤销/配额失败提示/loadSong 防覆盖（另开窗口）/已入库兼容/谱架·0.25×·向导提权——6项 |
| tv_chordlib | 和弦引擎：468个模板指法逐音高纯净/吉他12×22全覆盖/未知类型明确失败/尤克里里12×8/斜杠低音/音程表/弹窗升级/功能谱预览/动态候选/和弦图式创建器/升降号左上角——12项 |
| tv_mxl | MusicXML 出+入：xmllint 校验/计数/时值和/音高拼写/**往返一致**/第三方 fixture |
| tv_midi | MIDI 出+入：SMF fixture/量化(附点·跨小节连音·adds)/running status/分手/**导出往返**(meta·tie合并·音高集合) |

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
| P0 互操作 | v37.7–v38.0 | **MusicXML 出/入 + MIDI 入/出 四件套**（往返一致；通用量化模块；P0 收官） |
| P1 垂类楔子 | v38.1–v38.2 | **织体库11套+分级**、**配和弦建议**、**智能配谱**（旋律→伴奏教学谱/纯伴奏，P1 收官） |
| P2 增长 | v38.3–v38.4 | **哼唱成谱**、**曲谱分享卡**（P2 收官） |
| P3 垂类文案 | — | 官网首页/制谱/功能/帮助按八场景+即兴伴奏/考编叙事重写（**优化指令全部完成**） |
| 分享升级+练习工具 | v38.5 | **动态互动谱**（自打包单文件 HTML，收谱即可播放/倍速/移调/谱架）+ 播放条**节拍器**与**倍速**（0.5×–1.5×） |
| 编辑器体验 | v38.6 | **左栏谱类感知布局**：页签/面板按八类型显隐排序，钢琴弹唱伴奏工作流置顶、功能谱级数置顶、纯和弦谱精简、＋歌词行入口 |
| TAB 技法刻版 | v38.7 | **揉弦波浪线随时值延长**（可扩选覆盖范围）+ **闷音 P.M. 范围标记**（虚线+末端竖钩，applyTech 范围语义） |
| 和弦引擎 | v39.0 | **可移调模板引擎**（22类型全根音+斜杠，修复把位错画大三 bug）+ **弹窗升级**（调内直达/搜索/试听/口径统一）+ 织体全类型音程表。遗留：同名多把位共存（col.voicing 可选字段方案已评审，见会话记录） |
| 和弦创建与显示 | v39.1 | **和弦图式创建器**（竖式点格/顶部×○/把位窗，替代横向指板矩阵；`data-cdc/cdt/cdb` + `ceState.cdBase`）+ **升降号主音左上角**（`chordSvgLabel`/`chordHtmlLabel`，数据格式不变仅显示层转换） |
| 和弦弹窗单页化 | v39.2 | 双栏无滚动布局：左列主音/性质/转位/保存/我的和弦，右列可编辑和弦图（兼预览）+把位/试听/把位方案；按产品要求移除搜索直达、调内常用条、自定义指法文本行，「根音」更名「主音」 |
| 专家评审第一批 | v38.8 | **数据安全加固**（迁移逐条容错/渲染异常不落盘/配额提示/loadSong 防覆盖）+ **快赢**（谱架直入/0.25×/向导提权/发布免责/WCAG AA 浅色对比度）。评审来源：.claude/agents 三角色（Code Reviewer/UX Researcher/UI Designer）；**未落地的第二、三批建议清单见会话记录与下方路线图** |

## 9. 路线图（v37.6 起按垂类战略重排，详见 CLAUDE.md 战略锚点）

**P0 互操作（接入 AI 转谱生态）**
1. ✅ ~~MusicXML 导出~~（v37.7，`exportMusicXML`）
2. ✅ ~~MusicXML 导入~~（v37.8，`importMusicXML`，往返一致性已验证）
3. ✅ ~~MIDI 导入~~（v37.9，`parseSMF`/`quantizeToCols`〔哼唱转谱复用此模块〕/`buildSongFromMIDI`）
4. ✅ ~~MIDI 导出~~（v38.0，`exportMIDI`：tie合并/和音/TAB轨+变调夹）

**P1 垂类楔子（即兴伴奏/考编）**
5. ✅ ~~织体深化~~（v38.1：11套+level分级；`suggestChords`/`applySuggestChords` 功能和声建议，不覆盖已填）
6. ✅ ~~智能配谱~~（v38.2，`arrangeAccompaniment`：teach 三声部/pure 纯伴奏两种产出；P1 收官）

**P2 增长（无需后端）**
7. ✅ ~~哼唱→简谱草稿~~（v38.3：NSDF 检测+自动定调+legato 量化；**麦克风链路待正式站点真机验证**）
8. ✅ ~~编辑器内「生成分享卡」~~（v38.4，`buildShareCardSVG`/`exportShareCard`；card.html 薄查看页待服务器）
9. ✅ ~~动态互动谱 + 播放条节拍器/倍速~~（v38.5，`exportInteractiveCard`/`enterShareViewer`/`metroClick`；**服务器上线后二期：互动谱转为链接+二维码分发**。注意：托管环境若禁 fetch 自身源码会走 DOM 快照兜底，需在正式站点验证一次导出文件可开）

**P3 垂类文案**：✅ ~~官网 make/features/help/首页按八场景+即兴伴奏/考编叙事重写~~（随 v38.4 完成）

**应用壳布局尝试（已回退，接手者注意）**：v38.9 曾按外部设计稿实现「顶栏收敛单行＋⋯更多下拉＋谱面上方同源互切切换条」（commit `3b21162`），产品负责人评审后认为效果不理想，已 revert 回 v38.8 布局（仅保留其中的文档标签页 TYPE_CN 修复）。如未来重启此方向：实现可从该 commit 找回；设计稿评估结论（三选一切换与联排渲染架构冲突、8 类功能在新壳无位置、品牌色保持蓝紫不换向）仍然有效。

**专家评审待办（v38.8 落地第一批后剩余）**
- 第二批·一致性：tv_migrate.js 迁移测试 + 函数重名自动查重脚本（tools/check_dup_fn.js 进测试流程）；选中态视觉语言收敛（5套→2档）；圆角/hover阴影令牌化（--radius-* / --shadow-hover）；导出弹窗按意图分组（打印存档/分享/专业格式）；persist 防抖 + pushUndo/persist 共用一次序列化
- 第三批·规划：移动端信息架构（触控≥40px、低频操作收「⋯更多」、editbar 折叠）；「我的曲谱」搜索分类（复用 cc-q/CC_CATS 组件）；钢琴弹唱空状态引导（无和弦时画布提示①标和弦→②织体）；互动谱导出裁剪未用乐器采样瘦身；深色按钮 SVG 化与官网图标体系统一

**暂缓（需产品负责人拍板）**：多声部音频转谱（不自研，MusicXML/MIDI 导入已吃下大部分价值）、真·微信小程序（等 ICP+服务器）、支付/会员（只留 isPro 判断位）、曲谱库版权策略、Web MIDI 电钢琴实时录入
**原路线图后段保留**：服务器上线+SF2 音色、民乐指法、小程序分享卡、鼓谱、同谱表双声部、8va、奏法记号、和弦谱播放、仓库迁移 veazen/puyouquan

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
