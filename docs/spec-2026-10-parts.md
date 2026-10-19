# v68.6「按演奏者出分谱」可执行规格

> 基线：v68.5 `c923d00d36e9bed94a029ecf4af6d615245fa864`。产品文件 `muse-tab/index.html`（单文件，不引入打包器）。
> 主体沿用方案 A 的结构，嫁接方案 B 中改动小、对用户有用的部分。界面文案按 `docs/design-2026-10g` 的 P1–P11 硬指标写：按钮不超过 4 字，悬停提示不超过 12 字，不写位置词，只有空谱和出错时才出说明句。

---

## 0 评审结论：两份方案逐条取舍

| # | 议题 | A | B | **采纳** | 理由 |
|---|---|---|---|---|---|
| 1 | 分谱单位 | 每条 TAB 一份 | 同 | **每条 TAB 一份** | 一把吉他就是一位演奏者；两份方案一致 |
| 2 | 钢琴与别的演奏者同谱 | 只出大谱表 | 钢琴手用总谱 | **B 的变体：钢琴份＝总谱去掉全部 TAB 行**。没有 TAB 时它就是总谱（`scoreEq`，零排版） | 伴奏者要看声部，这是出版惯例。去掉 TAB 行是为了「吉他＋钢琴」时钢琴手不用看六线谱。「仅大谱表」不做 |
| 3 | 单 TAB 时无词无和弦的旋律行 | 并入吉他份 | 同 | **并入** | 指弹的简谱和 TAB 是同一个人看 |
| 4 | SATB 的 S＋A、T＋B 合并 | 可选，缺省不勾 | 同 | **可选，缺省不勾** | 出成两行谱表；同一谱表上的双声部不做 |
| 5 | 和弦随份 | 只在本份一个和弦都没有时搬 | 总是搬被删行上的和弦，有硬性不变量 | **B** | A 的做法遇到「部分和弦在 TAB、部分在旋律行」时，联排行数字和扫弦取形会变。B 保证每一列推导出的和弦与总谱相同 |
| 6 | 带夹谱拆出的无 TAB 份 | 手算 refOct | 调 `transposeSong` | **B** | `transposeSong`（38507）已经处理 refOct 的八度折叠、`keyTo` 和和弦名平移，不用再写一份 |
| 7 | 换行、换页 | 缺省跟随总谱，可切到自动 | 全部剥掉 | **`pgbrk`、`wf` 一律不沿用；`brk`、`pull` 缺省不沿用，提供一个开关「沿用总谱换行」** | 继承总谱的手动换行，最坏情况是每行只剩 2 小节、多出空白页；自动排版最坏也只是普通的自动断行。开关留给按乐句断行的简谱用户 |
| 8 | 页码 | 缺省 bc | 缺省 to，加页眉 | **谱上写了 `layout.pgno` 就照谱上的；没写时，只在副本里用 `{on:true,pos:'bc',start:1,first:false}`** | 与 v68.5 的缺省位置一致。`first:false` 让单页分谱不印页码 |
| 9 | 分谱名的位置 | 第 1 页左上角，与顶部页码同一条基线 | 让出曲名的宽度 | **A** | 不挤曲名，不重算长曲名的折行 |
| 10 | 续页眉 | 放在页码那条带上，与页码分处两侧 | 放顶部 | **A** | v68.5 的 `padBot`/`padTop` 已经留出这条带，版心不用改 |
| 11 | 行首小节号 | 不做 | 简谱份设 `barNums='row'` | **B** | 合唱排练要说「从第 17 小节起」；只在副本上设 |
| 12 | 翻页检查、Tacet、空闲时预排页数 | — | 做 | **不做** | 要写说明字，代价不小；记为后续 |
| 13 | `soloCtx` 保持源谱语境 | — | `keepSolo` | **B** | 不做的话，开了联排的弹唱谱拆出吉他份后 × 的解析会翻转 |
| 14 | 视图生命周期 | 按窗口记在 WeakMap 里 | 离开输出模式就回总谱 | **当前视图按 B**（离开输出模式、切窗口都回总谱）；**勾选状态按 A**（WeakMap，按窗口） | 书写态按 Ctrl+P 必定打总谱；勾选状态保留，免得重复勾 |
| 15 | 在输出模式按 Ctrl+P | 总是总谱 | 打当前看到的那一份 | **B（所见即所印）**，只限输出模式 | 在看女高音时按 Ctrl+P，期望的就是女高音 |
| 16 | PDF 文件名 | — | 打印期间临时改 `document.title` | **B** | 改动很小；编辑器本身不写 `document.title`（已 grep：只有观看页、互动谱写） |
| 17 | 分谱 PNG | 用现有「图片 PNG」键，作用于当前视图 | 右栏另加一个键 | **A** | 符合 P4（一个功能一个家） |
| 18 | 行 2「分谱」键 | 直接打印勾选的几份 | 弹出浮层清单 | **A** | 左栏本身就是清单，用不着第二份 |
| 19 | 旧外壳、手机 | ≥2 份时才出入口 | 不提供入口 | **A，并且再精简**：旧外壳只加一个下拉框加一个键；手机只加一行 | M23、M16 的场景《送别》只有一位演奏者，弹窗和抽屉都与基线逐字节相同 |
| 20 | 服务端事件 | 新增 `export_parts` | 不改 | **B**：服务端不改 | `window.print` 会自动记 `print_dialog`，北极星指标照算；用量看 `ui_cmd` 的 `out:parts`、`out:view`；分谱 PNG 记 `export_png` 并带 meta `part` |
| 21 | `tabJpVoices` 的纯函数 | 写在 partSong 里 | 新写 `tabJpSpliceS`，并把 `tabJpRemoveTrack` 改成调它 | **新写 `tabJpSpliceS`，但不动 `tabJpRemoveTrack`** | 不碰编辑路径；用一条测试对拍两者等价 |
| 22 | 新建谱写入 `pgno` | 待拍板 | 不写 | **不采纳**（见 §7） | — |
| 23 | 评审补充：合唱里没有歌词的声部 | 未提 | 未提 | **本版照原样出（不带词）；「借主旋律歌词」记为后续** | 预设《欢乐颂（四部合唱）》的内声部节奏与女高音不同（女低音第 1 小节 3 个起音，女高音 4 个字），按拍位借词对不上 |

---

## 1 用户能做什么

**一句话**：合唱、乐队、弹唱这类多人谱，在「输出」里点一份就看到这一份的分谱；勾选几份，一次打印就得到一个含全部分谱的 PDF；当前看到的这一份也能存成 PNG。

### 1.1 操作路径

| 外壳 | 看一份 | 打印或存 PDF 一份 | 一次打印多份 | PNG |
|---|---|---|---|---|
| **新外壳（默认，电脑）** | 输出步 → 在「输出内容」里点分谱名，主视图换成这一份；点「总谱」回来 | 看着这一份时点「打印 / 存 PDF」或按 Ctrl+P | 勾选框（标题行有全选框）→ 工具组「分谱」键（徽标显示已勾份数） | 看着这一份时点「图片 PNG」 |
| **旧外壳 `?shell=classic`** | 不提供 | 「打印…」弹窗 →「分谱」组下拉框选一份 →「打印分谱」 | 下拉框选「全部分谱（n 份）」→「打印分谱」 | 不提供 |
| **手机（≤820，FLOW.mob）** | 不提供 | 不提供 | 「⋯ 输出与分享」→「分谱」：打印全部缺省份数，纸张 A4 | 不提供 |

- 只有一位演奏者的谱（判定见 §3.2 的 R0）：工具组「分谱」键灰显，点了 toast「只有一位演奏者」；左栏显示一行灰字「〈谱名〉 · 一位演奏者」。旧外壳弹窗和手机抽屉与 v68.5 逐字节相同。
- 分享卡、互动谱、MusicXML、MIDI、曲谱文件始终导出总谱。

### 1.2 界面文案（全量；不在此表里的文字一律不加）

| 位置 | 文案 / 属性 |
|---|---|
| 工具组键 `#flw-out-parts` | 图标 `out-parts`，字「分谱」，后跟数字徽标 `<span class="flw-gbn">m</span>`；aria-label「打印分谱」；title「打印勾选的分谱」 |
| 灰显原因（`data-why`、命令面板 `ok()`、toast） | 单演奏者：「只有一位演奏者」；一份都没勾：「先勾选分谱」 |
| 左栏总谱行 | 「总谱 · 全部 N 轨」（原文案不变）；行首勾选框 aria-label「打印时包含总谱」 |
| 左栏分谱标题行 | 「分谱」＋灰色份数「n」＋全选框（三态，aria-label「全选分谱」）；**删掉**「即将推出」徽标、「按演奏者，不按谱行」、两段说明段落 |
| 左栏分谱行 | 勾选框（aria-label「打印时包含〈名称〉」）＋图标＋名称键（title「预览〈名称〉」，当前项 `aria-current="true"`）；钢琴份等于总谱时，名称后加灰字「· 总谱」；有和弦放不下时加 ⚠ 图标，title「k 个和弦名放不下」 |
| 左栏单演奏者行 | 「〈谱名〉 · 一位演奏者」（谱名取 `NWB.kindOfSong(song).name`，取不到用 `docTypeLabel`） |
| 右栏「打印与导出」 | 「页数」：看分谱时写「共 n 页」，看总谱时文案不变；新增勾选框「沿用总谱换行」，只在 ≥2 份**且**总谱里有 `brk` 或 `pull` 时出现 |
| 看分谱时其它工具组键的 title | 「打印 / 存 PDF」改为「打印〈名称〉」；分享卡、互动谱、MusicXML、MIDI、曲谱文件改为「〈键名〉 · 总谱」 |
| 旧外壳弹窗 | `<h4>分谱</h4>`；`#ex-part` 首项「全部分谱（n 份）」，其后逐份列名称；`#ex-part-print`「打印分谱」 |
| 手机抽屉行 | t「分谱」，d「全部 n 份 · A4」 |
| 命令面板 | `out:parts`「打印分谱」；新增 `out:score`「预览总谱」 |
| 预排提示（≥4 份或 ≥120 小节时） | toast「正在排 n 份分谱…」 |
| 打印文件名 | 单份「曲名-〈名称〉」；多份「曲名-分谱」 |
| PNG 文件名 | 「曲名-〈名称〉.png」 |

---

## 2 数据

### 2.1 新增可选字段：无

- **song 字段**：不新增，不改名，不删除。分谱是只读的派生副本，只用来渲染和导出，**绝不**经过 `mutate`、`persist`、`migrate`、撤销栈，也不调 `trackCfg`（它会补写 mixer 缺省条目）。
- **`musetab-*` 本机键**：不新增。tv_modes 的 `NEW_KEYS`、`PREV_FLOW_KEYS` 和 M23a 的「不写 flow 本机键」断言都不用动。
- **缺省口径**：没进分谱视图、也没发起分谱打印时，所有路径与 v68.5 逐字节相同（§6.4 的 PAZ 对拍）。
- **不涉及 `miniprogram/`**：`deploy/mp-release.json` 不递增。

### 2.2 只放在内存里的界面状态（与 `PSIZE`、`ARR` 同一做法）

| 名称 | 在哪 | 缺省 | 生命周期 |
|---|---|---|---|
| `FLOW.out.cur` | FLOW.out 闭包 | `'score'` | 离开输出模式、切换窗口（`docNow()` 变了）、当前 id 不在新计划里时，静默回 `'score'` |
| 勾选集 | `WeakMap(doc → Set<id>)` | 全部非可选份；总谱不勾 | 按窗口保留；计划里已不存在的 id 自动剔除 |
| 沿用总谱换行 `BRK` | FLOW.out 闭包 | `false` | 会话内保留 |
| `PART_JOB` | 顶层 `var`，放在 `PRINT_SNAP` 旁边 | `null` | 一次性：`afterprint` 时清掉，超过 5 秒作废 |
| `PART_CACHE` | 顶层 `var` | `{sig:'', map:new Map()}` | 签名一变整表清空；离开输出模式（`dropPages`）时清空；最多 8 项，LRU |

### 2.3 红线自检（写进测试，见 PA2、PU10）

跑完任何分谱操作（计划、派生、预览、打印、PNG、切换视图）之后，下列各项与操作前逐字节相同：`JSON.stringify(song)`、撤销栈和重做栈的长度、窗口脏标记、全部 `musetab-*` 键值、`#score.innerHTML`（书写态）。

---

## 3 引擎

### 3.1 函数和标识符清单

以下名字已在 `c923d00` 上 grep 过，出现次数都是 0。

| 名称 | 性质 | 归属 |
|---|---|---|
| `partsPlan(s)` | 纯函数：分谱计划 | 轨 A |
| `partSong(part, o)` | 派生副本 | 轨 A |
| `partCarry(c, part, src)` | partSong 内部用：和弦重现 | 轨 A |
| `tabJpSpliceS(s, vi)` | 纯函数：在 `s` 上删 `tabJpVoices[vi]` | 轨 A |
| `partRender(part, cal)` | 离屏排一份，带缓存 | 轨 A |
| `partReport(r)` | 一份分谱的页范围，形状与 `F.lay.report()` 的子集相同 | 轨 A |
| `partJobNow()` | 当前生效的分谱打印任务 | 轨 A |
| `buildPartPrintPages(list)` | 多来源打印切片 | 轨 A |
| `svgPngDownload(xml, vb, k, name)` | 从 `exportPNG` 尾段抽出 | 轨 A |
| `PART_JOB`、`PART_CACHE`、`PART_SVG` | 顶层 `var` | 轨 A |
| `EXPORT_ACT.parts(size, ids, before)`、`EXPORT_ACT.partPng(id)` | 新增键（原 7 个键不动；已 grep，没有测试数键数） | 轨 A |
| `.pgpart`、`.pgrun` | 分谱名、续页眉的类名（不含 `pageno`/`pagebg`，成品摘除时不会误删） | 轨 A |
| `FLOW.out.cur / view(id) / checked() / brk / plan()`、`FLOW.mode.reshoot()` | 界面接口 | 轨 B |
| `out:view`、`out:chk`、`out:chkall`、`out:brk`、`out:score` | 动作 id（符合 `UI_CMD_RE`） | 轨 B |
| `#ex-part`、`#ex-part-print`、`.flw-gbn` | DOM id、类 | 轨 B |

### 3.2 `partsPlan(s)`：分法

**输入**：任一 song（顶层纯函数，两套外壳都能用）。分组读 `PQ_KIND.groupsOf(s)`（显式或推断，下标是旋律轨下标），歌词读 `voxHasLyrics(s,i,i)`，不依赖 `FLOW.tree.model()`。

**输出**：

```
{ solo:boolean, kindName:string,
  parts:[{ id, kind:'tab'|'piano'|'voice'|'choir'|'merge'|'inst',
           name, tab:[vi…], vox:[vi…], opt:boolean, scoreEq:boolean, ord:number }] }
```

`solo` 为真时 `parts` 为空数组。

**规则按顺序执行，先执行的规则先认领谱行：**

| 规则 | 内容 | id |
|---|---|---|
| R1 TAB | 每条 TAB 轨各 1 份，`kind:'tab'`。简谱联排行（`tabJpOn`）和五线联排（`tabStaff`）由 TAB 数据派生，自动跟着走 | `t{vi}` |
| R2 方括号组 | 组内每行各 1 份，`kind:'choir'`。组内恰好 4 行时，追加两项可选份 `{kind:'merge', opt:true}`，分别是第 1–2 行和第 3–4 行 | `v{vi}`；`m{a}-{b}` |
| R3 组外、有歌词或有和弦的旋律行 | 每行各 1 份，`kind:'voice'`。「有和弦」指该行任一列有 `c.chord`，或 `c.chords` 里有带 chord 的项 | `v{vi}` |
| R4 剩下的组外旋律行 | 恰好 1 条 TAB 时并入 `t0` 的 `vox`；否则每行各 1 份，`kind:'inst'` | `v{vi}` |
| R5 花括号组（钢琴） | 计划里**还有别的非可选份**时，加 1 份 `{kind:'piano', vox:[全部旋律行], tab:[]}`，没有 TAB 时 `scoreEq:true`；只有钢琴自己时不出（交给 R0） | `p` |
| R0 单演奏者 | 非可选份少于 2 份时，`solo:true, parts:[]`，`kindName` 取谱名 | — |

**排序**：按每份第一行在谱面上的位置（TAB 行在上：`ord=vi`；旋律行：`ord=nT+vi`）。钢琴份的 `ord` 取第一条花括号行；合并份的 `ord` 取其末行 +0.5。

**命名**（只是渲染选项，不存进谱；用户改轨名就等于改分谱名）：

| 类型 | 规则 |
|---|---|
| tab | 只有 1 条 TAB：缺省名（`/^吉他\d*$/`）写成「吉他」，尤克里里谱写成「尤克里里」，自定义名照用。多条 TAB：缺省名写成「吉他 N」；自定义名里不含「吉他 / 尤克里里 / 贝斯」时写成「吉他 · 名」，例如「吉他 · 指弹」 |
| voice / inst / choir | 缺省名（`/^旋律\d*$/`）：voice 写「人声」，其余写「旋律」；自定义名照用 |
| piano | 有 `pianoAcc`，或行名是「…伴奏」时写「钢琴伴奏」，否则写「钢琴」 |
| merge | 两行名称用「＋」连接 |
| 重名 | 依次追加「 2」「 3」 |

**预设期望表**（PA1 的金标准，15 个预设）：

- 小星星（分解弹唱）、欢乐颂（扫弦弹唱）、小星星（尤克里里）：吉他（或尤克里里）＋人声，2 份。
- 两只老虎（双声部）：吉他 · 指弹、吉他 · 扫弦、人声，3 份。
- 欢乐颂（四部合唱）：4 份，另加 2 项可选。
- 其余 11 个预设：单演奏者。

### 3.3 `partSong(part, o={brk:false})`：派生副本

**前提**：源谱就是全局 `song`。`chordEvtsMea`、`capoOf`、`meaMeter` 读全局，所以第 0 步全部同步读完。

0. **从源谱读**：
   - 要删的 TAB 下标、旋律下标（各自降序）；
   - `capoT = part.tab.length ? capoOf(part.tab[0]) : 0`；
   - `srcCapo = song.tabVoices.length ? (song.capo|0) : 0`；
   - `keepSolo = !!song.tabStaff && song.voxVoices.length>0 && part.tab.length>0`；
   - 被删行的和弦事件，用与 `chordEvtsMea` 内层 `scan` 相同的口径逐小节收集，单位取 `meaMeter(mi).unit`，稳定排序（先旋律后 TAB，各自按下标升序）。
1. **深拷贝**：`c = JSON.parse(JSON.stringify(song))`。数组里的 `undefined` 变成 `null`，判定与原来相同。不调 `migrate`。
2. **删 TAB**（降序，次序同 `delVoiceAt`）：`tabJpSpliceS(c, vi)` → `tabMetaSplice(c, vi)`（提示文字丢弃）→ `c.tabVoices.splice(vi,1)` → 每小节 `tabs.splice(vi,1)`。
   - `tabJpSpliceS` 的语义与 `tabJpRemoveTrack` 相同，只是作用于 `s`：`s.tabJp` 为假或 `tabJpVoices` 不是数组时什么都不做；否则物化、splice，再按 `tabJpCommit` 的口径回写（至少一条亮时写 `tabJp:true` 和数组，全关时两个字段都删）。
3. **删旋律行**（降序）：`c.voxVoices.splice(vi,1)` → 每小节 `voxes.splice(vi,1)` → `voxMetaSplice(c, vi, 1, 0)`。
4. **分组**：
   - merge 份：`c.voxGroups=[{type:'bracket',from:0,to:1}]`。显式写出，防止 staff＋bass 无词被推断成钢琴。
   - 单行份：`delete c.voxGroups`。
   - piano 份：保持第 3 步重映射后的结果。
   - 花括号的两行没有都保留时：`delete c.pianoAcc`（否则 `stackOf` 会误判为 CG）。
5. **和弦重现**：`partCarry`，只对 `kind ∈ {tab, voice, piano}` 做，规则见 §3.4。必须在第 6 步之前做，这样搬过来的和弦名也会跟着移调。
6. **调与变调夹**：
   - 本份有 TAB：`c.capo = capoT`；`delete c.tabCapos`。
   - 本份没有 TAB：删 `tabCapos`、`tabJp`、`tabJpVoices`、`tabStaff`；若 `srcCapo>0`，先 `transposeSong(c, srcCapo)`，再 `c.capo = 0`。结果：页头的 1=X 是实际调，和弦名是实音，`keyTo` 同步平移，refOct 由 `transposeSong` 补偿。`transposeSong` 读的全局定弦只在副本有 TAB 时才会用到，这里不会碰到。
7. **歌词**：保留的行一个字都没有时，`c.lyricLines = 0`。否则会走 `!LYR_ANY` 分支，每行都留空歌词位。
8. **小节号**：`!c.barNums && !c.tabVoices.length` 且至少有一条简谱行时，`c.barNums = 'row'`。
9. **版面**：每小节 `delete pgbrk, wf`；`!o.brk` 时再删 `brk, pull`。`c.layout` 的其余项原样保留（纸张、疏密、`scale`、`fixed`）。
10. **页码**：`c.layout.pgno` 不是对象时，`c.layout = Object.assign({}, c.layout, {pgno:{on:true,pos:'bc',start:1,first:false}})`。谱上写了 `{on:false,…}` 的，照样不印。

**返回**：`{song:c, carry:{exact, moved, dropped}, keepSolo}`。

### 3.4 `partCarry`：和弦重现

- **落点行**：TAB 份落在副本的 TAB 第 0 行；voice、piano 份落在副本的旋律第 0 行。
- **事件**：第 0 步收集的「被删行」事件，按时间线顺序处理。
- **落在 TAB 行上**（列起拍为 b_k）：
  - 取本小节第一个满足 b_k ≥ β 的列。
  - 该列没有自带和弦：写 `col.chord`。b_k===β 记 `exact`，否则记 `moved`。同一列又来了后到的搬入事件时，后到的覆盖先到的，被覆盖的记 `dropped`。
  - 该列有自带和弦：丢弃，记 `dropped`。
  - 本小节后面没有列：挪到下一小节第 0 列，前提是它没有和弦、下一小节拍 0 也没有任何事件，记 `moved`；否则丢弃，记 `dropped`。
- **落在旋律行上**：
  - 恰好在列起拍：写 `col.chord`。
  - 落在列内，且 `q = (β−b_k)·4/mU` 是 ≥1 的整数、小于本列的四分拍数、`chords` 里没有相同的 q：`push({q, chord})`，记 `exact`。
  - 否则落到下一列起拍（规则同上），记 `moved` 或 `dropped`。
- **硬性不变量**（PA4）：
  - TAB 份里每一列的 `tabColChords` 与源谱对应轨逐列相同。因为每个事件只往后挪到「下一个列起拍」，不会越过别的列，所以「≤ 列起拍的最后一个事件」不变。
  - 唯一的例外：源谱同一拍上两条 TAB 列各有不同和弦。这种列测试里排除，并在注释里写明。
- **界面**：只有 `dropped>0` 时才显示 ⚠；`moved` 不提示。

### 3.5 `renderOffscreen` / `renderCore` 的改动

每一项都只在 `RENDER_OFF && RENDER_OFF.part` 存在时生效，所以正常 render 和 tv_offscreen T1 都逐字节不变。

- **E1 `renderOffscreen`（11254）**
  - 透传 `o.part = {name:string(≤40 字，已 trim), run:true, keepSolo:boolean}`。
  - K 表补上 `LYR_PNO`（原来漏还；不改排出的谱面）。
  - `OFF.out`（13932）**增加**字段（原有字段不动）：
    - `geo:{W, pgH, gap, n, nf?}`，取自同一处的 `PV_GEO`，在复原之前拷出；
    - `sysPg:[…]`；
    - `sysMea:[[m1, m2]…]`，取自 `systems[si].measures` 的首末 `mi`。
- **E2 分谱名 `.pgpart`**（第 0 页，写在段 0，与 `.pgfolio` 同段）
  - 14 号、粗体、`var(--ink)`。
  - 基线 `y = max(12, min(PN_T, topMargin−9))`，与 v68.5 第 1 页顶部页码同一条线。
  - `x = MARGIN`、`start` 对齐。若 `PN && PN.pos==='to' && PN.first && PN.start` 是双数（首页页码在左），改为 `x = PAGE_W−MARGIN`、`end` 对齐。
  - 宽度上限是 `0.4×(PAGE_W−2·MARGIN)`，超出时用 `hdTextW` 截断并加「…」。
- **E3 续页眉 `.pgrun`**（第 1 页起）
  - 只在 `PN` 存在、`pg≥1`、`!noFol.has(pg)` 时画，内容为「名称 · 《曲名》」（没有曲名时只写名称）。
  - 10.5 号、`var(--muted)`。
  - 位置：
    - `bc`：底边那条带上靠左（`x=MARGIN`），宽度上限 `PAGE_W/2−MARGIN−24`；
    - `bo`：底边那条带上靠内侧（单数页靠左、双数页靠右）；
    - `to`：顶部那条带上靠内侧；
    - `bo`、`to` 的宽度上限为 `PAGE_W−2·MARGIN−60`。
  - 不需要新增留白：`padTop`、`padBot`、`pgTop` 是 v68.5 已有的。
- **E4 `soloCtx`（12600）**：改为 `song.tabStaff && !(song.voxVoices||[]).length && !(OFF && OFF.part && OFF.part.keepSolo)`。
  - 实现时还要审计渲染路径里读 `voxVoices.length`、`tabVoices.length`、`docType`、`stackOf` 的其它判定，结果写进 PROJECT.md。
  - 以下属于**预期中的变化**，不保持源谱语境：`pureStaff` 和 `capoShift` 页头、`systemExtras` 和弦图带、`lyrRowsOf`、「转1=X」文字、轨名是否印在行首。

### 3.6 `partRender(part, cal={paperW, brk, sig})`

1. 断言 `!RENDER_OFF`（不可重入，否则 throw）。
2. `scoreEq` 份不走这里，调用方直接用总谱。
3. 缓存：`sig = cal.sig ?? JSON.stringify(song)+'|'+(document.fonts && document.fonts.status)`。与 `PART_CACHE.sig` 不同就清空整表。键为 `${id}|${fixedOn ? 'F' : paperW}|${brk?1:0}`；`fixedOn` 指谱上 `layout.fixed` 为真，此时版宽恒为 `FIXED_A4`，与 `paperW` 无关。
4. 未命中：`{song:c, carry, keepSolo} = partSong(part, {brk})`，然后调
   `renderOffscreen({song:c, target:PART_SVG, paperW, fixed:true, crop:false, invert:false, part:{name, run:true, keepSolo}})`。
   `PART_SVG` 是复用的游离 `<svg>`，第一次用时 `createElementNS` 建出来。
5. 取结果：`const k = PART_SVG.cloneNode(true); k.querySelectorAll(EXPORT_DROP_SEL).forEach(e=>e.remove());`，`html = k.innerHTML`。摘掉 `.pagebg`、`.pageno`、`.pgbrk-mk`，保留 `.pgfolio`、`.pgpart`、`.pgrun`。不搬走 `PART_SVG` 本身。
6. **返回**：`{id, name, html, vb:{w, h}, geo, sysGeo:[{y0,y1}], sysPg, sysMea, carry}`，存进缓存（LRU，8 项）。

**版宽校准**（`cal.paperW` 从哪来）：

- **预览**：取 `pvSnap` 那一次分页排版回调里的 `LAST_PAPER_W`。
- **打印**：取 `beforeprint` 里 `render()` 之后的 `LAST_PAPER_W`。`setPrintPage` 给 A4L、fit 切 `#paper.wide` 后宽度自然生效。
- **禁止**在书写态直接量 `#paper.clientWidth`：`body.nwrap` 时它会被撑大。

### 3.7 打印与 PDF

- `EXPORT_ACT.parts(size='A4', ids=null, before)` 的执行顺序：
  1. `ids` 缺省取当前窗口的勾选集；旧外壳和手机取全部非可选份。
  2. `setPrintPage(size)` → `before && before()`。
  3. 份数 ≥4 或小节数 ≥120 时，toast「正在排 n 份分谱…」。
  4. 预排：用 `LAST_PAPER_W` 逐份 `partRender`，顺序执行，只为暖缓存。
  5. `PART_JOB = {ids, brk, t:Date.now()}`。
  6. `setTimeout(()=>window.print(), 120)`。
- `partJobNow()`：
  - `PART_JOB` 存在且 `Date.now()−t < 5000` 时返回它；
  - 否则，若 `flowOn() && FLOW.mode.cur==='output' && FLOW.out.cur && FLOW.out.cur!=='score'`，返回 `{ids:[FLOW.out.cur], brk:FLOW.out.brk, view:true}`；
  - 其余情况返回 `null`。
- **`beforeprint`（37716）**：原有各行一字不改。只把最后一行 `try{ buildPrintPages(); }catch…` 换成：
  `const job = partJobNow(); if(!job){ 原 try/catch 原样 } else { try{ buildPartPrintPages(partListOf(job)); 记下并设置 document.title }catch(e){ console.error('分谱打印失败，回落总谱', e); removePrintPages(); 原 try/catch }}`。
  其中 `partListOf` 是 `buildPartPrintPages` 的内部逻辑：总谱（含 `scoreEq` 的钢琴份）去重后排在最前，其余按计划顺序；每份取 `partRender(part, {paperW:LAST_PAPER_W, brk:job.brk})`。
- **`afterprint`**：在原有各行之外，加 `PART_JOB = null`，并还原 `document.title`（只在改过时还原）。取消打印同样会触发 afterprint。
- **`buildPartPrintPages(list)`**：原 `buildPrintPages` 一字不改。
  - list 的每项是 `{score:true}` 或 `{html, geo}`。
  - 第 k 份输出 `<svg class="pp-defs" width="0" height="0"><defs><g id="pp-src-${k}">…</g></defs></svg>`。总谱项取 `#score.innerHTML` 加 `PV_GEO`。
  - 每页输出 `<div class="pp"><svg viewBox="0 ${i*(pgH+gap)} ${W} ${pgH}" preserveAspectRatio="xMidYMin meet"><use href="#pp-src-${k}"/></svg></div>`。
  - 再对整个盒子按 `EXPORT_DROP_SEL` 摘一遍，清掉 `.pp-defs` 内全部 id，给 body 加 `printing`。每份自然从新的一页开始。
- **结论**：
  - 书写态 Ctrl+P、旧外壳总谱打印、观看页打印：一律打总谱，代码路径逐字节不变。
  - 输出模式看着分谱时：打这一份。
  - 「分谱」键：打勾选的几份，得到一个 PDF。

### 3.8 PNG

- 从 `exportPNG`（34482）的 `const k = scale||2` 起到结尾，原样抽成 `svgPngDownload(xml, vb, k, name)`：`fillStyle '#fff'`、`toBlob`、下载、`toast('已导出 PNG 图片')`、`onerror` 都不变。`exportPNG` 改为调用它，传入的串逐字节不变。
- `EXPORT_ACT.partPng(id)`：
  1. `pyqEvent('export_png','part')`；
  2. 取 `partRender`，`paperW` 用预览时记下的那个；
  3. 包成 `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">${html}</svg>`，`vb.h = n·pgH+(n−1)·gap+6`；
  4. `svgResolveVars`；
  5. `svgPngDownload(xml, vb, 2, 曲名+'-'+名称)`。
- 行 2 的 `out:png`：看分谱时调 `EXPORT_ACT.partPng(cur)`，否则调 `EXPORT_ACT.png()`（不变，M8a 不受影响）。

### 3.9 预览接入（轨 B 实现，调用轨 A 的接口）

- **`pvSnap`（37594）**
  - 在 `withCleanSnap` 回调末尾（`also()` 之后）记下 `pw = LAST_PAPER_W`，放在局部变量里。
  - 在 `withCleanSnap` 返回之后、`finally` 之前：仅当 `keep && FLOW.mode.cur==='output' && FLOW.out.cur!=='score'` 时，执行
    `r = partRender(FLOW.out.partOf(cur), {paperW:pw, brk:FLOW.out.brk, sig})`，然后
    `PV.content = r.html; PV.cks = PV.src = PV.cksOf = PV.sys = null; PV.geo = {...r.geo}; FLOW.out.last = r`。
  - 抛错时：`console.error`，`FLOW.out.view('score')` 静默回到总谱。
  - 总谱视图下这段代码进不去。
- **`snapSig`（29055）**：只在 `cur!=='score'` 时追加 `'|part:'+cur+'|'+(brk?1:0)`。总谱视图下签名串不变。
- **`FLOW.mode.reshoot()`**：`SNAPSIG = ''; refreshNow()`。切视图、切 `BRK` 时调用。
- **懒填与 `pageKeep`**：`PV.cks===null` 时 `pageKeep` 返回 null，整份填页；页数变化走现有的页壳重建路径。
- **排版模式不接入**：`FLOW.lay.collect` 仍按总谱取样；旧外壳的 `#b-preview` 不接入。

### 3.10 全局状态的隔离与复原

| 风险点 | 处理 |
|---|---|
| `renderOffscreen` 借用的全局量 | 沿用 K 表逐项归还，加上 `LYR_PNO`；`RENDER_STAT` 照旧还原（tv_perf2 的计数不受影响） |
| 不可重入 | 多份只能顺序调用；`partRender` 不在任何 render 或 `prep` 内部调用；`pvSnap` 的钩子放在 `withCleanSnap` 外面 |
| 副本与编辑器共享对象 | 先 JSON 深拷贝；`renderOffscreen` 只做浅拷贝，所以副本不能省 |
| 读全局的推导 | `chordEvtsMea`、`capoOf`、`voxHasLyrics(song)` 只在 partSong 第 0 步读（此时全局就是源谱） |
| `beforeprint` 中途抛错 | 回落总谱切片；`RENDER_OFF===null`；`PART_JOB` 照样在 afterprint 时清掉 |
| `document.title` | 只在分谱任务里改，afterprint 时还原 |
| 新增顶层量 | `PART_JOB`、`PART_CACHE`、`PART_SVG` 不在 render 里写，tv_offscreen T2a 的快照不会变 |

### 3.11 性能预算

报中位数；CI 系数 ×2，与 tv_perf2 同口径。

| 项 | 预算 |
|---|---|
| `partsPlan`，200 小节 | ≤ 3ms |
| `partSong`，200 小节 | ≤ 20ms |
| 单份 `partRender`（未命中） | ≤ 同谱总谱 `renderOffscreen` 的 1.2 倍 |
| 预览切换到一份分谱（未命中） | ≤ `FLOW.mode.perf.refresh` 中位数 ＋ 单份 `partRender` |
| 预览切换（命中） | ≤ `FLOW.mode.perf.refresh` 中位数 × 1.1 |
| 总谱视图下的刷新 | 与 v68.5 相同，tv_perf2 原预算不变 |
| SATB 64 小节 4 份，`beforeprint` 装配（命中） | ≤ 150ms |
| 同上（未命中） | ≤ 800ms |
| SATB 200 小节 4 份，`beforeprint` 装配（未命中） | ≤ 2.5s |

---

## 4 成品

### 4.1 成品矩阵

| | 总谱 | 分谱 |
|---|---|---|
| 预览 | 不变 | 新外壳的输出模式（主视图） |
| 打印 / PDF | 不变（Ctrl+P、旧外壳、观看页都是总谱） | 新外壳：看着哪份打哪份（键或 Ctrl+P）、勾选批量（「分谱」键）；旧外壳：单份或全部；手机：全部（A4） |
| 批量 | — | 一次打印任务、一个 PDF。勾了总谱时总谱在最前；每份从新页起，页码各自从头计 |
| PNG | 不变 | 新外壳当前预览的那一份，多页长图（页缝为白） |
| 分享卡、互动谱、MusicXML、MIDI、曲谱文件 | 不变 | 不做，始终导出总谱 |

### 4.2 分谱的页头、页码、换页规则

| 项 | 规则 |
|---|---|
| 页头 | 完全由副本生成：曲名、演唱、词曲、1=X、拍号、变调夹、速度。纯五线谱的份不写 1=X。有 TAB 的份写本轨夹位（第 2 条吉他单出时也对）。无 TAB 的份按实际调写，和弦名是实音，不写变调夹 |
| 演奏者名 | 第 1 页左上角 `.pgpart`（E2） |
| 续页眉 | 第 2 页起「名称 · 《曲名》」`.pgrun`，与页码同一条带、分在两侧；不印页码的页（包括 `noFol`）不印（E3） |
| 页码 | **沿用 `song.layout.pgno`**：谱上有对象就照它（包括 `on:false`）。没有时，只在副本里用 `{on:true,pos:'bc',start:1,first:false}`。每份都从 `start` 重新计起。比一页还高的行，所在页不印（v68.5 规则） |
| **换页 `pgbrk`** | **分谱一律不沿用**，自动分页。总谱里的「本行换页」只作用于总谱，以及等于总谱的钢琴份 |
| 换行 `brk`/`pull` | 缺省不沿用（自动断行）；勾选「沿用总谱换行」后沿用 |
| 小节宽度 `wf` | 不沿用 |
| 小节号 | 简谱份（没有 TAB、谱上没设）在行首印；TAB 和五线谱照原样 |
| 全局记号 | 排练号、反复、房子、𝄋 和 ⊕、D.C./D.S./Fine、转调、变拍、弱起，都随 `measures[]` 和 song 顶层出现，每份齐全（PA8 断言） |
| 歌词 | 随所在行走，全部段数都在；无词的份不留歌词位 |

---

## 5 不做（写进 PROJECT.md §9.0 后续项）

| 优先级 | 项 | 说明 |
|---|---|---|
| P2 | 多小节休止合并 | 出版差距最大的一项，排第一候选。只在分谱渲染时合并，不存字段，约 3–5 人日。属于新记号，要拍板 |
| P2 | 合唱无词声部借主旋律歌词 | 按起音拍位对齐，覆盖率 <90% 时不借；需要先确定口径 |
| P3 | 分谱自己的换行、换页、内容大小 | 需要新增可选字段（候选 `song.partLay`，按分谱 id 存），要拍板 |
| P3 | 翻页检查（翻页处是否有音）、自动选翻页位置、V.S. | — |
| P3 | 提示音（cue notes）、Tacet 页、双面打印时给每份补空白页 | — |
| P3 | 同一谱表上的双声部（S＋A 合成一行） | 原路线图后段项 |
| P3 | 「钢琴（仅大谱表）」可选份 | — |
| P3 | 分谱 MusicXML / MIDI | `exportMusicXML(s)`、`exportMIDI(s)` 已经能吃副本，接上很便宜 |
| P3 | 分享卡、互动谱、观看页、小程序的分谱，以及 `?part=` | — |
| P3 | 逐轨移调乐器 | `transp` 目前是整曲值 |
| P3 | 每份单独一个 PDF、zip、批量 PNG | 仓库里没有 PDF 库和 zip 写入 |
| P3 | 旧外壳和手机的分谱预览、分谱 PNG | — |
| P3 | 勾选状态持久化、自定义分谱名 | 前者要新本机键，后者要新字段 |
| P3 | 隐藏轨字段 `voxHide` / `tabHide` | — |
| P3 | 列表里显示每份页数（空闲时预排） | — |
| P3 | 渲染路径审计（E4）报出的其它「源谱语境」差异 | — |

PROJECT.md §9.0 的 P3「按演奏者出分谱」那一行标「✅ v68.6」。v68.5 小结里的 ⑦ 改为「v68.6 定：不写，见分谱缺省页码」。

---

## 6 并行实现与测试

### 6.1 接口约定（第 0.5 天由轨 A 先提交桩函数，签名定死）

```
partsPlan(s) → {solo, kindName, parts:[{id,kind,name,tab,vox,opt,scoreEq,ord}]}
partRender(part, {paperW, brk, sig?}) → {id,name,html,vb:{w,h},geo:{W,pgH,gap,n,nf?},sysGeo,sysPg,sysMea,carry:{exact,moved,dropped}}
partReport(r) → {pages, pageRanges:[{pg,a,b,rows,si,pb:false}]}   // 供 F.lay.pagesHTML 直接用
EXPORT_ACT.parts(size='A4', ids=null, before) ; EXPORT_ACT.partPng(id)
partJobNow() 读 FLOW.out.cur（不存在或为 'score' 时视为总谱）、FLOW.out.brk
```

### 6.2 分轨（都在 `muse-tab/index.html` 里，按区域划分归属）

| 轨 | 负责 | 区域 |
|---|---|---|
| **A 引擎** | partsPlan、partSong、partCarry、tabJpSpliceS、partRender、partReport、E1–E4、EXPORT_ACT 新键、partJobNow、buildPartPrintPages、beforeprint/afterprint、svgPngDownload | 约 6960–17100（引擎、元数据）、34380–34520（导出）、37529–37540（EXPORT_ACT）、37690–37730（打印） |
| **B 界面** | FLOW.out（列表、工具组、右栏、act、cur/view/checked/brk）、FLOW.mode（snapSig、reshoot）、pvSnap 钩子、命令面板、FLOW.mob 行、旧外壳弹窗分组、CSS（3668–3760 的可点态）、帮助对照表 40323、`site/help.html` | 24400–30110、37538–37580、37594–37625、28441–28730、CSS、40323 |
| **合并人** | 更新日志 `<li>`、`APP_VER='v68.6'`、PROJECT.md、`deploy.yml` 的 REF3、`parts_ref.json` | 最后一个提交 |

- 新函数名在合并前再 grep 一次（v37.2 教训）。
- 旧外壳弹窗分组用 `insertAdjacentHTML` 加单引号字符串插入。模板字符串里禁止裸反引号，内联代码用 `<code>`（v43.6 教训）。

### 6.3 新套件

**`tests/tv_parts.js`**（轨 A，进 CORE；外壳无关，PA9 两套外壳都跑）

| 段 | 断言 |
|---|---|
| PA1 分法 | 15 个预设按 §3.2 的期望表逐个对 id、name、tab、vox、opt、scoreEq、顺序；另有构造夹具：JT 带夹 3 品、双 TAB 且 `tabCapos[1]=3`、JG/SG/SJG（NWB 建）、SATB＋钢琴、小提琴＋钢琴、两条有词旋律的二重唱、吉他＋钢琴＋人声、无词指弹 JT（单演奏者）、无显式分组的 SATB |
| PA2 派生与红线 | 跑完前后，§2.3 的各项逐字节相同；副本自洽：`measures[].voxes.length===voxVoices.length`（tabs 同理）、`voxNotations`/`voxDual` 不越界、`voxGroups` 合法、mixer 键在范围内、`tabJpVoices` 长度等于 TAB 数或已删除；小节级元数据（label、keyTo、repeat*、volta、segno、coda、dc、ds、fine、beats/unit、pickup、simile）逐小节相等；`pgbrk`/`wf` 全部剥掉，`brk`/`pull` 按 `o.brk` 处理；`tabJpSpliceS` 与「借用全局跑 `tabJpRemoveTrack`」结果逐字节相等 |
| PA3 调与夹位 | C 调夹 2 品拆出的人声份：页头「1=D」，没有「变调夹」；在 G、A、B 调下，`exportMIDI(副本)` 与 `exportMIDI(song)` 的人声发声音高逐音相同（覆盖八度折叠）；和弦名平移了 2 个半音；第 2 条吉他单出：`capo===3`，各品位发声逐音相同 |
| PA4 和弦重现 | 在 `renderOffscreen` 的 `prep` 借用期间取每列 `tabColChords`、`jpColOf`，与源谱逐列相等（排除同拍冲突列）；构造「和弦不在列起拍」「末列之后」「下一小节首列已有和弦」三种情况，计数正确；全部预设的 `dropped===0`；开了联排的吉他份，× 的显示与总谱相同（`keepSolo`） |
| PA5 恒等对拍 | 用打印口径（`PRINTING_NOW`＋`PRINT_PAGING`，render 后取 `LAST_PAPER_W`）离屏排「全部行、不剥版面、不带 part 选项」的副本，摘 `EXPORT_DROP_SEL` 后 `innerHTML` 与 `scoreExportClone().innerHTML` 逐字节相同，`geo` 与 `PV_GEO` 逐项相同（含 `nf`）。覆盖：固定版宽与非固定、A4L、fit、pgno 的 bc/bo/to、`pgbrk`、200 小节长谱 |
| PA6 页头几何 | `.pgpart` 与曲名、左信息块、署名、`.pgfolio` 的包围盒交集为 0；40 字长曲名 × 12 字长分谱名（截断）；`to` 加双数起始页码时分谱名在右上角；`.pgrun` 只在第 2 页起出现、每页 1 个，与页码不相交，与本页首行墨迹（行顶 −7）净距 ≥2mm |
| PA7 分页与切片 | `pgH===round(W·1.414)`、`gap===26`、`n===OFF.out.pages`；`.pp` 总数等于各份 n 之和；viewBox 的 y 序列正确；`pp-src-k` 唯一、`use` 引用都能对上；成品里没有 `.pagebg`/`.pageno`/`.pgbrk-mk`；每份的 `.pgfolio` 从 start 起，`first:false` 时首页不印；除超高行外，谱行不跨页 |
| PA8 记号、小节号、歌词 | 各份的排练号框、D.C./Fine、房子、𝄋/⊕ 数量与总谱一致；每个 `keyTo` 以「转1=X」文字或调号出现；简谱份的 `.jbarno` 数等于行数 −1；无词份的行高等于 `lyricLines=0` 的同谱；有词份各段歌词的字符集相等 |
| PA9 打印任务（两套外壳） | mock `window.print` 并派发 beforeprint/afterprint：批量结构正确，`document.title` 先改后还原，`PART_JOB===null`；紧接着模拟 Ctrl+P，`#print-pages` 与纯总谱运行逐字节相同；超过 5 秒的任务被忽略；给 `renderOffscreen` 注入抛错，回落总谱切片，`RENDER_OFF===null`；输出模式看分谱时 Ctrl+P 打分谱，书写态打总谱 |
| PA10 PNG | 分谱的 xml 宽高等于 `vb`、文件名正确、事件为 `export_png` 且 meta 为 `part`；总谱 `exportPNG` 交给 `svgPngDownload` 的串与基线逐字节相同（在画布之前截获） |
| PA11 隔离 | 当前谱为 JG，交替离屏排各份 3 轮：全部顶层 `let`/`var`（含 `LYR_PNO`、`DUAL_GAP` 内容）、`RENDER_STAT`、`#score`、`#paper` 的类与尺寸、`body` 的类前后都相同 |
| PA12 性能 | §3.11 各项，报实测值 |
| PAZ 缺省零差异 | 见 §6.4 |

**`tests/tv_parts_ui.js`**（轨 B，进 CORE）

| 段 | 断言 |
|---|---|
| PU1 单演奏者 | 钢琴独奏、《送别》、和弦谱：`#flw-out-parts` 的 `aria-disabled` 为真，点了 toast「只有一位演奏者」且 `role=status`；命令面板 `ok()` 给同样的原因；左栏有「〈谱名〉 · 一位演奏者」 |
| PU2 多演奏者 | 两只老虎、SATB＋钢琴：列表结构、原生 checkbox、全选三态、`aria-current`；缺省勾选（可选份不勾、总谱不勾）；徽标数字；一份都没勾时键灰显，`why` 为「先勾选分谱」 |
| PU3 切预览 | 点一份：`PV.geo.n` 等于该份页数、`PV.cks===null`、`.pv-cap` 正确、预览 svg 里有 `.pgpart`；「页面」区来自 `partReport`；右栏「页数」为「共 n 页」；`snapSig` 带后缀 |
| PU4 编辑 | 看分谱时删末尾空小节：预览仍是这份且已更新；撤销后同样 |
| PU5 回总谱 | `PV.content`、`PV.geo` 与切换前逐字节相同，`snapSig` 无后缀 |
| PU6 生命周期 | 回书写再进输出，视图是总谱、勾选还在；切窗口后视图回总谱；删轨导致当前 id 失效时静默回总谱 |
| PU7 打印对象 | 看分谱时点「打印 / 存 PDF」，`partJobNow().ids` 为当前那份；看总谱时调用序列与 M8a 相同；「分谱」键对应 `EXPORT_ACT.parts(PSIZE, 勾选集)` |
| PU8 沿用总谱换行 | 开关只在有 `brk`/`pull` 时出现；切换后重拍，结果保留了 `brk`；缓存键不同 |
| PU9 键盘与读屏 | Tab 顺序（勾选框在名称键之前）；空格切换勾选；Enter 预览；焦点不被抢 |
| PU10 无持久化 | 整套操作后，§2.3 的各项不变 |
| PU11 旧外壳 | 《送别》：弹窗 `innerHTML` 与基线逐字节相同；两只老虎：有 `[data-grp="parts"]`，下拉 4 项（全部＋3 份），选一份打印时 `PART_JOB.ids` 正确，选「全部」时取缺省集；没有任何 `flw-out` 的分谱 DOM |
| PU12 手机 390×844 | 《送别》：抽屉 4 项，与基线相同；两只老虎：5 项，点击后为 `setPrintPage(A4)` 加分谱任务 |
| PU13 文案预算 | 新增按钮 ≤4 字、悬停提示 ≤12 字；新文案里没有位置词（左栏、右栏、行 2、上方……）；全文件里与分谱相关的「即将推出」「下一批」为 0；跑 `deploy/check-wording.js` |
| PU14 埋点 | `out:parts`、`out:view`、`out:score` 通过 `FLOW.track` 的格式过滤，且不带分谱名 |
| PU15 截图 | 1440 宽，浅色和深色各一套：JT 带夹 3 品（人声份、吉他份）、SATB＋钢琴（女低音份）、旧外壳弹窗、手机抽屉；另加一张打印切片渲染图 |

### 6.4 缺省零差异基线

- **基线文件**：新建 `muse-tab/tests/parts_ref.json`，内容为 `{"commit":"c923d00d36e9bed94a029ecf4af6d615245fa864","version":"v68.5","note":"tv_parts PAZ 对拍基线；deploy.yml 按完整 SHA 单独补取，取不到时判红"}`。
- **CI**：`.github/workflows/deploy.yml` 在 `REF2` 之后加 `REF3`（`fetch` 加 `cat-file -e`）。
- **对拍范围**：两套外壳 × 16 个预设、200 小节长谱、§6.3 的多演奏者夹具。
- **逐字节对拍的项目**：
  - 书写态 `#score`；
  - `PV_GEO`、`SYS_GEO`；
  - `withCleanSnap({paging})` 加 `scoreExportClone`；
  - 不带任务时 beforeprint 生成的 `#print-pages`；
  - `exportPNG` 的 SVG 串；
  - MusicXML 串、MIDI 字节哈希、song JSON；
  - 不带 `part` 的 `renderOffscreen`（660 宽和打印口径各一次，只比原有字段）；
  - 输出模式总谱视图下的 `PV.content`、`PV.geo` 和 `snapSig` 串；
  - 单演奏者谱的旧外壳 `#b-print` 弹窗 `innerHTML`；
  - 单演奏者谱的 FLOW.mob 输出抽屉 HTML；
  - `musetab-*` 键集合。
- **有意改动例外（只有这几项）**：
  - 新外壳 `#flw-out`、`#flw-out-list`、`#flw-rp-pub` 的 HTML；
  - 多演奏者谱的旧外壳弹窗、手机抽屉；
  - `OFF.out` 新增的字段。
- **`pgbrk_ref.json`**：保持 v68.4 不变。本版不改总谱渲染，tv_pgbrk Z 段照常通过。

### 6.5 有意迁移

每条注释写明理由，并附「修前红、修后绿」的实证。

| 套件 | 改法 |
|---|---|
| tv_modes M8b | 《送别》仍灰显；`why` 从 `/即将推出/` 改为 `/只有一位演奏者/`，仍断言没有「下一批 / 拍板 / 负责人」；点击后不导出 |
| tv_modes M29a | 照旧点 `#flw-out-parts`；toast 正则改为 `/只有一位演奏者/`；`role=status` 的断言不变 |
| tv_modes M24m | 预计原样通过（左栏有「和弦谱 · 一位演奏者」、没有「人声」）；不通过时按新文案改 |
| tv_flowdef F8a | 场景为钢琴：`soon` 去掉「按演奏者出分谱：即将推出」这一要求，改为要求 toast 含「只有一位演奏者」，且全文不出现 `/分谱[^\n]{0,20}即将推出/`；「即将推出」只剩「锁定此轨」和「音轨排序」；`JARGON` 不变 |
| tv_shellflow | 新外壳输出区的结构登记为有意改动；旧外壳部分零差异 |
| tv_offscreen T2a | K 表加入 `LYR_PNO`；交替排的谱里加入一份分谱 |
| tv_uicmd | 新增 id：`out:view`、`out:score`（`out:parts` 已有，现在可执行） |
| tv_helpflow | 跟进帮助对照表的分谱文案 |
| 全部测试 | grep「即将推出」「分谱」「flw-out-parts」，逐条核对 |

### 6.6 突变实证

以下任意一处改回原样，都应让对应断言当场报红：

| 突变 | 应报红的断言 |
|---|---|
| 去掉 carry | PA4 |
| 去掉夹位换调 | PA3 |
| `lyricLines` 不归零 | PA8 |
| 不剥 `pgbrk` | PA2、PA7 |
| `brk` 不跟随开关 | PU8 |
| `PART_JOB` 不清 | PA9 |
| `buildPrintPages` 改用新 id | PAZ |
| `snapSig` 无条件加后缀 | PAZ、PU5 |
| K 表漏掉 `LYR_PNO` | PA11 |
| 去掉 `keepSolo` | PA4 |
| 合并份不写显式方括号组 | PA1、PA2 |
| `pianoAcc` 不删 | PA2 |

### 6.7 发版闸与回归

- `node deploy/check-syntax.js muse-tab/index.html`
- `node deploy/check-wording.js`
- `cd muse-tab/tests && node tv_matrix.js`
- tv_parts、tv_parts_ui
- tv_offscreen、tv_print、tv_pgbrk、tv_pgbrk_ui、tv_header、tv_shellflow、tv_trktree、tv_modes、tv_flowdef、tv_mobile、tv_perf2、tv_card、tv_mxl、tv_midi、tv_capo、tv_trkcapo、tv_tabjpvi、tv_kindsync、tv_uicmd、tv_helpflow、tv_fix683
- 最后跑 `run_all`

### 6.8 发版流水线（合并人）

1. 更新日志加 v68.6 的 `<li>`（超过 60 条时先跑 `changelog-archive.js --keep=40`），同步 `APP_VER='v68.6'`。
2. PROJECT.md：
   - §9.0 的 P3 行标 ✅，新增 §5 的后续项；
   - §3.1 写明「分谱＝派生副本，不落盘、不新增字段」；
   - v68.6 小结；
   - 测试表加两个新套件；
   - 写明 `parts_ref.json` 的约定。
3. `site/help.html`：导出表加一行「分谱（按演奏者）」，「打印预览」段补一句；应用内帮助对照表（40323）补上分谱。
4. commit（中文、按版本号）并 push 到 `claude/guitar-tab-software-analysis-zqm0ua`；重发编辑器 artifact 预览并附截图。

---

## 7 「v68.6 起新建谱显式写 `pgno {on:true,pos:'bc',start:1,first:false}`」：建议本版不采纳

理由：

1. **分谱需要的页码已经满足**：§3.3 第 10 步的「分谱渲染期缺省」只写在副本里，分谱自动有页码，不用把字段写进总谱数据。v68.5 留下的「待随分谱一起定」到这里结案。
2. **新旧谱会不一致**：新建谱多页时从第 2 页起印页码，老谱不印。同一位用户的两首谱表现不同，又没有界面解释，违背 P1 和 P10。
3. **会污染零差异基线**：`createSong` 的输出 JSON 一变，tv_newpanel、tv_newwiz、tv_kindsync、tv_landbar 的新建谱快照，以及本版 PAZ 对新建夹具的对拍，都要大面积登记例外。这会把「分谱零差异」的判红信号淹没在噪声里。
4. **影响面超出本版**：已发布谱、观看页、互动谱、小程序拿到带 `pgno` 的新谱后会开始印页码，需要分别回归，与「`miniprogram/` 不动」的范围冲突。
5. **更好的做法**：如果负责人要求总谱也默认印页码，应当改「缺省口径」（`pgnoCfg` 在字段缺省时返回默认值），新旧谱一致，也不写数据。作为单独一版拍板，同时检查观看页、互动谱、小程序的一致性。这条记进 §9.0 的待拍板项。

---

## 8 待拍板（按括号里的推荐值即可开工）

1. 每条 TAB 轨各一份。（是）
2. 有别的演奏者时，钢琴份＝总谱去掉 TAB 行。（是）
3. 无 TAB 的份按实际调印，和弦名写实音。（是）
4. 分谱不沿用 `pgbrk` 和 `wf`；`brk`/`pull` 缺省不沿用，开关「沿用总谱换行」只记在内存。（是）
5. 总谱没设页码时，分谱缺省印底部居中、首页不印；设了就照总谱。（是）
6. 在输出模式按 Ctrl+P 打当前看到的那一份；其余时候一律打总谱。（是）
7. 旧外壳和手机只给打印入口，而且只在 ≥2 份时出现。（是）
8. 服务端不新增事件名。（是）
9. 新建谱不写 `pgno`。（是，见 §7）