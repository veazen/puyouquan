# 谱友圈（puyouquan.com）· 项目交接文档

> **本文档是项目的唯一权威交接文档。** 任何团队/任何 Claude Code 账号接手时先读完本文；每次发版必须同步更新「进度」与相关章节（见文末维护规则）。
> 最后更新：2026-07-22 · 当前版本 **v41.3** · 分支 `claude/guitar-tab-software-analysis-zqm0ua`

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
    repeatStart, repeatEnd, sectionBar, finalBar, segno, coda, dc, ds, fine, volta,
    label:'前奏'?,     // label=v41.2 排练/段落文字标记（小节头上方方框粗体，MusicXML rehearsal 出/入同步）
    keyTo:'G'?,        // v41.3 中途转调标记：小节头上方「转1=G」（一期标注式——五线谱调号/拼写保持谱首调；transposeEditor/transposeSong 同步平移；MusicXML key 变更出/入同步）
    simile:1|2? }]     // v41.3 小节反复 𝄎：数据保留、渲染省写（simileSrc 解析源小节，连续同号组内轮转），播放展开、节拍校验豁免；MusicXML measure-style measure-repeat 出/入同步
}
```

- **voxCol**：`{dur:1|2|4|8|16|32, dotted, deg:0-7(0=休止), acc:'#'|'b'|'', oct, lyrics:[段], tie, chord, dyn, grace, graceA, tup, orn:'up'|'down'|'tr'|'turn', adds:[{deg,acc,oct}]≤3, ferm:true?, artic:'stacc'|'staccatissimo'|'tenuto'|'accent'?, breath:true?}`
  - `adds` = 同列多音/和音（v37.6），主音字段不变保证向后兼容
  - `ferm`（延长号 𝄐，休止上也可标）/ `artic`（演奏法四件套：跳音·/顿音▼/保持音−/重音>，互斥单值）/ `breath`（换气 v，语义=本音之后换气）= v41.1 新增可选字段，MusicXML 出/入已同步（fermata/articulations/breath-mark）
  - `dynTo:{mi,ci}`（v41.2 渐强渐弱范围括线终点列；与 `dyn:'<'|'>'|'cresc.'|'dim.'` 组合生效——起列至终列开口楔形/文字+虚线延长，跨行断线续画；入口=力度菜单+Ctrl 选首末两音，与揉弦/闷音 `tk` 扩选同构；MusicXML wedge crescendo/diminuendo 出/入已同步）
  - `ped:'on'|'off'`（v41.3 钢琴踏板，点式成对渲染为 Ped.____*：'on' 起文字+延续线、至下一 ped 列收（'off' 画 * / 'on' 换踏断线），跨行断线续画；入口=「记号」面板两枚按钮，仅五线谱记谱声部显示；MusicXML pedal start/stop 出/入已同步）
  - `fing:'1'-'5'` 及 `adds[i].fing`（v41.3 指法数字：五线谱符头上方小数字（低音谱表下方、和音按音高纵向堆叠），简谱行不渲染；入口=「记号」面板「指法」按钮进入直录（`fingMode`），数字键 1–5 写入、0/退格清除、Esc 退出（adds 指法仅经 MusicXML 出/入）；MusicXML technical fingering 出/入已同步）
- **tabCol**：`{dur, dotted, chord, notes:[{s:弦, f:品, x:闷音, tech, tk, bAmt:'1/4'|'1/2'|'full'|'1.5'?}], strum, ferm:true?}`（`ferm`=v41.1 列级延长号；`bAmt`=v41.2 推弦幅度，挂在 tech:'b'|'bd' 音符上、弧上文字替换 b↑/b↓，清除技法时一并删除；TAB part 尚未导出 MusicXML，ferm 与 bAmt→bend-alter 随 TAB 导出一并登记）
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
| tv_frame | 新版外壳：深色顶栏/通栏播放条、经典切换持久化、音符组前置、快速换调、谱架兼容、六图层轨、和弦层谱类感知、小节/段落层、右栏四页签（排版停靠/库智能感知）、工具行单行化（技法/记号入图层且生效）、窄屏浮层、通栏贴边框架（贴边/内滚/轨新建/还原）、经典版完整还原——16项 |
| tv_chordlib | 和弦引擎：468个模板指法逐音高纯净/吉他12×22全覆盖/未知类型明确失败/尤克里里12×8/斜杠低音/音程表/弹窗升级/功能谱预览/动态候选/和弦图式创建器/升降号左上角——12项 |
| tv_sign | v41.1–v41.3 记号十件：延长号/演奏法四件套/换气 + 渐强渐弱范围括线/推弦幅度/排练标记 + 中途转调/钢琴踏板/指法数字/小节反复——入口写入·互斥·取消、几何断言（𝄐 位置、artic 贴符头反侧、楔形开口 0→7 与跨行断线衔接、bAmt 弧上文字、label 方框包含文字、转1=G 在数字行上方、Ped.____* 起止 x 对应两列、指法在符头上方、𝄎 省写无数字+源小节轮转+节拍豁免）、MusicXML 往返（fermata/articulations/breath-mark/wedge/rehearsal/key 变更/pedal/fingering/measure-repeat）——13项 |
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

**新版界面（v5 设计稿）实施路线（v40.0 起，产品已拍板）**
- 已定决策：配色=现有蓝紫基础上扁平化+护眼（不采纳朱砂）；图标沿用现有设计；工具行音符组前置；新版为默认、顶栏「经典版」可切回（localStorage musetab-shell）
- 阶段1 ✅ v40.0：深色扁平顶栏（含快速换调 k-dn/k-up→transposeEditor）+ 通栏播放条 + 护眼扁平令牌
- 阶段2 ✅ v40.1：左轨六图层（吉他谱/简谱/歌词/和弦/小节/段落，图标经 data-ic+CSS ::before 呈现、textContent 语义不变以兼容 renderDock/tv_dock）；和弦/小节/段落为虚拟图层页（setRibbon 内 `virt` 显式面板清单，不走 panel-前缀匹配）：和弦层谱类感知复用 panel-tab-chord / panel-vox-fn（tab/vox 页原面板保留不动，tv_dock 零改动）；小节/段落层内容 = 右栏「小节与段落」原 DOM 节点搬移（applyShellDock，id 与事件保持，经典版按 musetab-sp-open 状态还原）
- 阶段3 ✅ v40.2：右栏四页签（#rtabs + rcard[data-rt] 分组，setRTab 控显隐；经典版页签条与 .rt-new 卡片 CSS 隐藏、卡片全显）：信息=原卡片；排版=#layout-pop 整体停靠 #layout-host（applyShellDock 搬移，经典版回 body 恢复浮层，b-layout 按外壳分流）；库/智能=直达入口全部委托既有按钮（eb-lib/b-chord-edit/b-acctex/va-sug/b-arrange/b-fill；哼唱与 MusicXML/MIDI 导入 = b-new.click()+nw-*.click() 链），入口显隐在 renderDock 与 b-acctex/b-arrange 同口径
- 阶段4 ✅ v40.3：工具行单行化——setRibbon 在 uiShell 下向 tab/vox spec 注入 'tech'/'orn' 面板（panel-tab-tech/#tech-host、panel-vox-orn/#orn-host），eb-ctx 构建分流（新版写入左栏 host、经典写回编辑栏二行，applyShell 置 ebCtxFor=null 强制重建），ebHandler 额外绑定两个面板；body.shell #editbar2 隐藏；窄屏(≤1180px) fly 转 fixed 浮层；doc-tabs 扁平微调。**注意：tv_dock 断言经典布局语义，已在套件内 addInitScript 固定 musetab-shell=classic**
- v5 缺口清单核查（均已有，无需新做）：导出六出口=打印弹窗（PNG/MusicXML/MIDI/分享卡/互动谱/打印PDF）；循环选区=mx-prog 点击/拖动；无头无尾滑音4键=EB_TECHS su/sd/ou/od；倍速六档含 0.25×
- 记号补充第一批 ✅ v41.1（notation-audit-v41 前 3 项落地）：**延长号** `voxCol.ferm`/`tabCol.ferm`（SMuFL fermataAbove，简谱避让八度点/波音/演奏法、TAB 让位和弦名、休止可标）+ **演奏法四件套** `voxCol.artic`（stacc/staccatissimo/tenuto/accent 互斥；五线谱贴符头反符干侧，staccatissimo 楔形为几何绘制——字形库无此枚；简谱 GB 形态 ·▼−>）+ **换气记号** `voxCol.breath`（列右上角小 v，挂列右缘不占对齐宽度）；入口=简谱/吉他层「记号」面板按钮（再点取消）；systemExtras 按需预留行高；**exportMusicXML/importMusicXML 同步 fermata/articulations/breath-mark（往返一致）**；新增 tv_sign 套件（5项）。审计报告第 4 项起（渐强渐弱范围括线/推弦幅度/排练标记/中途转调/踏板/指法/小节反复）仍按 docs/notation-audit-v41.md 排期
- 记号补充第二批 ✅ v41.2（notation-audit-v41 第 4–6 项落地）：**渐强渐弱范围括线** `voxCol.dynTo:{mi,ci}`（力度菜单 + Ctrl 选首末两音；同行开口楔形、跨行到行末断开续行起继续、开口度沿总长线性过渡，cresc./dim. 为文字+虚线延长；渲染定位靠新增 `voxPos` 预计算——与 tabPos 同源）+ **推弦幅度** `note.bAmt`（已推弦音符再点推弦按钮 → `showBendAmtMenu` 四选一小菜单；弧上文字 full/½/¼/1½ 替换 b↑/b↓，无 bAmt 维持现状；清除技法/连音线时一并删）+ **排练/段落标记** `mea.label`（小节层「段落标记…」askText 按钮，留空清除；navMarkSVG 方框粗体、与 𝄋/⊕ 右移避让、systemExtras 预留行高）；**exportMusicXML/importMusicXML 同步 wedge crescendo/diminuendo（含 stop 定位 dynTo）与 rehearsal（往返一致）**；bend-alter 待 TAB part 导出（TODO 已登记）；tv_sign 扩至 9 项（T6/T6b/T7/T8）
- 记号补充第三批·收官 ✅ v41.3（notation-audit-v41 第 7–10 项落地，审计前 10 项全部完成）：**中途转调标记** `mea.keyTo`（小节层「转调标记…」KEY_LIST 弹单选/清除；navMarkSVG 画「转1=X」粗体、与 label/𝄋 右移避让；一期标注式——五线谱调号/拼写保持谱首调；transposeEditor/transposeSong 同步平移）+ **钢琴踏板** `voxCol.ped:'on'|'off'`（「记号」面板两键成对，五线谱下方 Ped. 文字+延续线+*收尾、换踏断线不画 *、跨行断线续画（仿 wedge），仅五线谱记谱声部显示入口）+ **指法数字** `voxCol.fing`/`adds[i].fing`（「指法」按钮进入 `fingMode` 直录：数字 1–5 写入、0/退格清除、Esc 退出；符头上/下方 8.5px 小数字，chNotes 携带 fing 排堆叠）+ **小节反复** `mea.simile:1|2`（`simileSrc` 源小节解析（连续同号组内轮转）、`simileSignSVG` 手绘 𝄎（斜杠+两点、双小节加数字2）、三处渲染循环（TAB/联排/简谱·五线谱）省写并保留整小节点击热区与 colBoxes（播放头按源列数均分）、播放 play()/measureSeconds 展开为源小节、beatErrors 豁免）；**exportMusicXML/importMusicXML 同步 key 变更 / pedal start·stop / technical fingering（含 chord 和音）/ measure-style measure-repeat（往返一致）**；tv_sign 扩至 13 项（T9–T12）。审计榜下备选（A.H. 泛音细分/简谱滑腔/TAB 装饰音/let-ring 虚线/N.C./sfz/表情术语等）仍按 docs/notation-audit-v41.md §榜下备选 排期
- 风格撤销+左栏优化 ✅ v41.0：右栏 style 页签删除（notation 面板回 ribbon/spec 不再过滤 notation；st-* 按钮与委托删除；b-notation 取消隐藏）；左栏卡片节奏统一 CSS（body.shell #left-flyout 272px/8px gap/28px 控件）；**制谱专家 agent 已建（.claude/agents/notation-expert.md）并已启动记号审计 → docs/notation-audit-v41.md（接手者：若报告已生成，按前10项排期落地）**
- 图层重梳理 ✅ v40.9：左轨 .ltab 结构改 `<span.lic data-lic>`(SVG 图形，renderDock 按 instOf/anyStaff 切 tab4/tab6/staff5/jianpu) + `<span.lb>`(小字；新版命名六线谱/四线谱/五线谱/简谱，经典版保留场景名——tv_dock probe 已改读 .lb)；「记号」合并=strum-body/mark-body/tech-host（vox: vmark-body/orn-host）在 applyShellDock 搬入 #sign-host-tab/vox（panel-tab-sign/panel-vox-sign，ebHandler 需绑 sign 面板），shell spec 过滤 strum/mark/chord/notation/col/pat/acc 并在 voice 后插 'sign'；notation 面板搬入 #style-host（风格页签），b-notation shell 下隐藏（st-notation 接管）
- 图标轨与归纳 ✅ v40.8：左轨纯图标（font-size:0 + ::before data-ic 17px，title 由 renderDock 同步），选中 `body.shell .ltab.on` 朱砂底；轨上新建按钮删除；**panel-tab-pat/panel-vox-pat/panel-vox-acc 三面板在 shell 下由 applyShellDock 搬入 #lib-host（右栏库页签），setRibbon 的 .panel-p 循环对 `el.closest('#right-dock')` 直接 return（显隐交 renderDock/setRTab），经典版 appendChild 回 #ribbon（顺序由 flex order 决定）**；rt-patlib/rt-tex 委托入口删除（面板即入口）；右栏 layout 页签改 style（st-notation/st-diag/st-fn 委托 b-notation/b-diag/vf-names，b-layout 恢复 layToggle 浮层，laySync 特例移除）
- 字体与图标 ✅ v40.7：--font-ui 中文前置（PingFang/雅黑优先，中西文同源渲染=素材清晰感的来源）+ text-rendering/grayscale 平滑；**SVGI 图标注册表**（36 枚线性图标 + `svgi(name,size)` + 静态 HTML 用 `data-svgi` 占位注入器）替换全部 emoji——textContent 赋值点已改 innerHTML（beat-status/hifi/mx-expand/播放键/sb-go），docIcon 返回 svgi，帮助/特色弹窗 sec()/fx() 头、曲谱库状态/眼睛/锁、cc-search CSS 图标（data URI）；toast 纯文本场景直接删 emoji；历史更新日志文案已清理。音乐字形 ♭♯♮♩✓♥✦ 属文字符号保留
- 素材配色 ✅ v40.6（产品拍板「配色使用素材配色」，推翻 v40.0 的保蓝决策）：--accent 朱砂 #c33a29（dark #df5a45）、chrome 墨绿 #1f3a34、暖米表面按素材 :root 映射（bg #f3f0e8/toolbar #f7f4ec/panel #fefdf9/paper #fbfaf5）；**--danger 改琥珀 #b45309（dark #ffa424）**避免与朱砂强调混淆（专家预警的语义冲突已消化）；--grad 转朱砂族（应用内；**官网 site/pyq.css 仍蓝紫，是否跟进另行拍板**）；score-invert 与 print 分支强调色同步。个人中心 shell 下与右端图标同排（tprimary 紧凑样式）；b-restart→⏮；**修露白**：`body.shell #mixer-dock button` 此前只覆写 color 未覆写 background，浅色面板底在深色栏发白——现透明底+暖米字；注意 `body.shell #mixer-dock button` (1,1,2) 会盖过 `body.shell #b-play` (1,1,1)，播放/节拍器选中态选择器需用 `body.shell #mixer-dock #b-play` 双 id 提权
- 视觉舒适度 ✅ v40.5（产品反馈素材 85e56eb2「视觉更舒适」→ UI/UX 两 Agent 归因：约七成来自与色相无关的系统性因素）：浅色令牌升温（--bg #f2efe7 / --toolbar #f4f1e9 / --panel #fdfcf6 / --paper #fdfcf7、--border 染色实线 #ddd6c8、新增 --faint #a59d8e、阴影转暖；@media print 已强制 --paper #fff，score-invert 自含不受影响）；chrome #1c1d20→#262b40 靛墨；强调纪律（#cursor-info b 回墨色仅 .z 活值蓝、shell eb.on 降为 accent-soft）；左栏 rg-title order:0 置顶左对齐 faint；工具行字形化（.dg/.dn 双渲染按外壳切换——经典版仍中文；DUR_GLYPH 音符字形、OPS/连音线/更多字形、.eb.ico span 隐藏、eb-lib shell 隐藏因库页签重复）；beat-box 移入 #editbar 右端（applyShellDock 搬移，err-drop shell 下 position:fixed 避 overflow 裁剪）；帮助/特色/更新日志降为轻文字链（:has 选择器）。**未做（后续可选）**：底栏 15 小节号→时间线（UX #7，需专项测试）；朱砂+墨绿整体换向已给利弊分析未采纳（与 --danger 语义冲突 + 小型 rebrand）
- 贴边通栏框架 ✅ v40.4（产品指示按 3628b133 素材「左右贴边」）：`body.shell:not(.stand):not(.viewer)` 全屏网格——body overflow hidden + flex column（**padding-bottom 必须清零**，v40.0 为悬浮播放条预留的 78px 会挤掉列高）；#stage flex:1、margin-bottom 52px 让位固定播放条；左右 dock position:static + align-self:stretch + 内部 overflow-y；#score-wrap 内部滚动。**滚动模型**：`scoreScroller()` 返回 shell 框架下的 #score-wrap 或 null（窗口滚动）——播放跟随、节拍错误跳转两处已适配；stand（window.scrollBy 自动卷谱）/viewer/print 均排除在框架外。左轨新增 data-act=new/help 动作按钮（.ltab 点击处理内委托 b-new/b-help）
- v5 设计稿评估全文见会话记录（2026-07-21）

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
