# 出版级制谱软件界面惯例调研：左栏音轨与工具、顶栏主菜单、多文档页签、图标字形

**说明：`REPORT.md` 没有落盘。** 运行环境拦截了写报告文件（Write 返回“Subagents should return findings as text, not write report files”），所以报告全文在下面。需要落盘的话，由上层把本文原样存成 `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/REPORT.md`。

本轮没有修改 `/home/user/puyouquan` 下的任何文件。截图、测量脚本和原始数据都放在调研目录里：

- 现状截图：
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/shots/now-1440.png`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/shots/now-1280.png`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/shots/now-1024.png`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/shots/now-flyout-tv0.png`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/shots/now-flyout-vv0.png`
- 只读测量脚本：
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/measure.js`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/measure2.js`
  - `/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/measure3.js`
- 原始测量数据：`/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/lt/research/measure.json`

---

## 0. 结论先行

1. **把“音轨（谁在演奏）”和“记号（写什么）”分开放。**
   - MuseScore 4：左栏的 Instruments 页签和 Palettes 页签分开。
   - Dorico：演奏者列表在 Setup 模式，Notes/Notations 面板在 Write 模式。
   - GP8：音轨在底部的全曲总览（Global view），编辑调色板在左侧。
   - Flat 教育版：左侧竖轨分为 Notation / Instruments / Layout 三块。
   - 这四家都没有把“音轨按钮”和“工具页签”排在同一条竖轨上。我们现在的左轨恰好混在一起：「吉他1 / 旋律1 / ＋音轨 / 歌词 / 小节 / 段落」都是同样 56×46 的按钮。

2. **记号面板一律按乐理类别分组，并且有组标题。**
   - 例子：MuseScore 的多个 palette、Dorico 按类别分的 Notations 面板、Sibelius Keypad 的 6 套布局、GP8 调色板的节奏/效果/呈现/自动化/注释。
   - 我们的「记号」是 27 格平铺、没有组标题（见截图 12），升降号、八度、连音、奏法、装饰音、力度、和弦混在一起。

3. **“出版级”软件都把“排版”和“输出”做成独立的工作段，不和写谱按钮平铺在一起。**
   - 例子：Dorico 的 Engrave/Print 模式、Sibelius 的 Layout/Appearance/Parts 选项卡加 File 后台、MuseScore 4 的 Publish 页签。
   - 对教育用户最合适的是 MuseScore 式的三段：「写谱 / 排版 / 输出」。Dorico 的 5–6 个硬模式门槛太高。

4. **专家加速靠命令搜索，不靠堆按钮。**
   - 例子：Dorico 的跳转条（按 J）、Sibelius 的 Command Search（逗号键）、GP8 的命令面板（Ctrl+E），以及 Soundslice 搜索结果里附带的快捷键。
   - 一个 Ctrl+K「搜功能」（支持拼音首字母）就能同时照顾新手和专家。

5. **多文档页签只占谱面区的宽度、紧贴纸面；只有一份谱时不单独占一行。**
   - MuseScore 4 的部件页签在谱面上方。Dorico 的页签条在工具栏和乐谱区之间，并且可以隐藏。
   - 我们现在是一条横跨全宽的 41px 深色带。
   - 左侧浮层面板的 `top:150px` 写死在 `muse-tab/index.html` L560 和 L564：在 1280/1440 宽下压住页签条 12px，在 1024 宽下压住 46px，第一枚页签直接被盖住（见 `now-1024.png`）。

6. **乐谱符号按钮应该用刻版字形（SMuFL/Bravura，即本项目的 `smg()`），功能动作用线性图标（`pqIcon`），两套不混用。**
   - MuseScore 调色板直接用谱面字体渲染真实的谱面元素。
   - 我们现在的记号格混用了三种来源：SVG 细线、斜体拉丁字母（h、p、P.M.、b↑）、Unicode 字符（𝄴 ⊕ ┌1. |: :|）。字形只有 16×14px，约占 46px 格高的 30%，标签 10px。
   - 这就是“不精致”的直接成因。

7. **教育和中文用户需要“图标 + 小字”的默认档，外加“最近使用”和拼音搜索。**
   - Dorico 的 popover（Shift+字母弹出的文本输入框）语法、5 个模式、全参数的属性面板都不该照搬。
   - 只取“快速输入框”这个思路，做成中文提示版（`1=D`、`3/4`、`♩=72`、`mf`），作为可选的加速器。

---

## 1. 调研方法与可信度

**检索情况**
- WebSearch 可用，命中了各家的官方手册和权威评测：Steinberg Help、MuseScore Handbook、guitar-pro.com docs、Avid、Scoring Notes、Flat 官方博客、Soundslice 帮助等。
- WebFetch 和直连 curl 被出口代理拒绝，musescore.org、steinberg.help、guitar-pro.com 都返回 CONNECT 403，所以没能逐页打开原文。
- 下文的事实来自检索摘要（摘要里引的是官方原句），加上产品使用经验。

**标注规则**
- 【核实】：检索结果里有官方或权威来源的原句。
- 【部分】：来源只覆盖一部分，或者是旧版本。
- 【未核实】：凭产品使用经验，本轮没拿到来源。凡涉及竞品像素尺寸的，一律标【未核实】，因为无法安装竞品实测。

本项目自身的尺寸全部是 Playwright 实测，见第 2 节。

---

## 2. 本项目现状基线（实测）

测量条件：Playwright + chromium，用 `?new=gtr` 深链回车建一份吉他弹唱谱，再打开左侧面板。

| 项目 | 1440×900 | 1280×800 | 1024×768 | 备注 |
|---|---|---|---|---|
| 顶栏 `header` 高 | 121（主栏 45 + 编辑栏两行 75） | 121 | **155**（缩放控件掉到第 3 行） | 截图 13 |
| 页签条 `#doc-tabs` | y=121，高 41，横跨全宽 | 同左 | y=155，高 41 | 只开 1–2 份谱也占满一行 |
| 顶部框架合计 | 162px（占屏高 18%） | 162px（20%） | 196px（**26%**） | 底部播放条另占约 52px |
| 左浮层 `#left-flyout` | `position:fixed; top:150px`，宽 262 | 同左 | 同左 | **150px 写死在 L560、L564** |
| 浮层与页签条重叠 | 12px（162−150） | 12px | **46px**，第一枚页签被盖住 | `now-1024.png`、`now-flyout-vv0.png` |
| 浮层与谱面 | 盖在谱面上（谱面区从 x=73 起） | 同左 | 同左 | 1440 宽时谱面可见宽约 1075−262≈813 |
| 左轨 `#left-rail` | 宽 64，按钮 56×46，图标 18px | | | 音轨钮与工具层钮同形同大 |
| 右栏 | 约 292（x 1148→1440） | | | 「创作 / 信息」 |
| 记号格 | 50×46；字形 SVG 16×14（约为格高的 30%）；标签 **10px** | | | 4 列网格，无组标题 |
| 面板按钮数 | 吉他轨 39 个（要滚 1.12 屏）；旋律轨 33 个；歌词层 2 个；小节层 8 个；段落层 11 个 | | | 歌词层只有两个动作，却占一个一级入口 |
| 页签 `.dtab` | 高 32，字号 12.5，`max-width:200`，顶部圆角 9，间距 5；「＋」为 34×30 虚线框 | | | CSS 在 L1623–1650 |
| 保存状态标记 | 橙点＝未保存，**绿点＝已保存** | | | 不合惯例：业界只标未保存 |
| 「显示」行 | “键盘”按钮越出卡片右缘 | | | 截图 12 和 `now-flyout-vv0.png` 都能看到 |

**字形来源混杂（measure3 抓到的按钮文字）**
- 段落层：`|:` `:|` `┌1.` `┌2.` `⊕Coda`，用 Unicode 和制表符拼凑。
- 小节层：`𝄴`（U+1D134），依赖系统字体渲染。
- 吉他技巧：`h` `p` `b↑` `P.M.` `T` `S⟋`，用斜体拉丁字母。
- 其余：线宽 1.6 的 SVG。

同一个 4 列网格里有四种字形来源，大小和笔画粗细都不一致。

---

## 3. 竞品拆解

### 3.1 音轨/乐器管理

| 产品 | 音轨列表在哪 | 选中音轨与工具的关系 | 隐藏/静音 | 加轨 | 部件/多版面 | 可信度 |
|---|---|---|---|---|---|---|
| MuseScore 4 / Studio | 左侧栏页签之一，与 Palettes、Properties 并列 [S1][S3] | 无关；调色板始终相同，作用于选区 | 眼睛图标：隐藏后不打印、不发声，但不删除 [S3] | Add 按钮或按 `i`，打开乐器对话框 [S3] | 工具栏 Parts 按钮打开部件对话框，部件以页签形式开在谱面上方 [S5] | 【核实】 |
| Dorico 5 | Setup 模式：左区 Players、右区 Layouts、底区 Flows，三者联动勾选 [S14] | Write 模式不显示演奏者；左 Notes 面板、右 Notations 面板都作用于选区 [S11][S12] | Play 模式的 Mixer；Write 模式底区也能开 Mixer [S10] | Setup 模式加 Solo/Section/Ensemble 演奏者 | **Layouts＝同一份源数据的多种排版**，总谱和分谱自动生成 [S14] | 【核实】 |
| Sibelius | Home 选项卡的乐器组（加/减乐器对话框） | 无关；Ribbon 和 Keypad 作用于选区 | Play 选项卡 / Mixer | Add or Remove Instruments（Command Search 也能搜到这个对话框里的命令 [S21]） | Parts 选项卡（部件外观、打印部件）[S20][S23] | 【部分】 |
| Guitar Pro 8 | **底部 Global view**：一轨一行，同时充当混音器和全曲小节总览，带轨色和短名 [S24] | 左侧调色板（F2）与音轨无关；**右侧 Track Inspector** 管该轨的调弦、记谱显示（标准谱/TAB/斜线）和音色 [S24] | Global view 里有 mute/solo、音量、声像 [S24] | 加轨对话框 | 无独立部件概念 | 【核实】 |
| Finale（2024-08 已停止开发 [S25]） | Score Manager | 工具即“模式”：先选工具，再点谱面 | — | Setup Wizard | Linked Parts | 【部分】 |
| Flat 教育版 | 左侧竖轨三块之一（Notation / **Instruments** / Layout）[S26] | 写谱工具集中在 Notation 面板，与乐器面板分开 | — | Instruments 面板 | 版式在独立的 Layout 面板 | 【核实】 |
| Soundslice | 编辑时左侧出现编辑栏 [S28] | 声部切换按钮常驻，与“音乐会音高”按钮并排 [S28] | — | — | — | 【核实】 |
| StaffPad | 双工具栏，用箭头切换另一组 [S29] | 上下文敏感，需要时才出现 | — | — | — | 【部分】 |
| 国内（作曲大师/简谱大师 iPad、简而谱、来音制谱） | 单页工具条加菜单 | 作曲大师写明“合唱模式最多 4 声部”，声部是模式开关，不是轨列表 [S30] | — | — | 来音制谱称支持五线谱、简谱、六线谱、弹唱谱、四线谱 [S30] | 【部分】；界面细节【未核实】 |
| TuxGuitar | 底部轨道表（类似 GP5）；顶部工具栏可自定义 [S31] | 无关 | 轨道表里静音/独奏 | 菜单 | — | 【未核实】 |

**归纳**
- 绝大多数产品把音轨放在**列表型**区域：行矮，能同时显示多条。没有一家放在“工具页签”那条竖轨上。
- 选中音轨只决定“改的是谁”，几乎从不决定“工具面板长什么样”。工具跟随**选区或光标所在的谱行类型**变化。
- 每轨的显示设置都放在**音轨设置**里：GP8 的 Track Inspector、MuseScore Instruments 面板里的齿轮 [S3]。
  - 我们把「当前音轨 + 显示 简谱/五线/大谱表/MIDI/键盘」放在记号面板顶部，每次打开都占约 150px。
- 隐藏、静音、独奏是三种不同意图。MuseScore 把隐藏和静音合在一起 [S3]，GP8 把 mute 和 solo 分开 [S24]。教学里“只听伴奏”“只看旋律”这类需求，分开更合适。
- **Dorico 的 Layouts 和 MuseScore 的 Parts 都是“一份源数据、多种版面”**。这与本项目“三记谱法同源互切”的护城河是同一个结构。

### 3.2 工具面板（记号）

| 产品 | 分组 | 搜索 / 最近 / 收藏 | 快捷键提示 | 上下文浮条 / 属性 | 可信度 |
|---|---|---|---|---|---|
| MuseScore 4 | 多个 palette：谱号、调号、拍号、临时记号、奏法、装饰音、呼吸与停顿、力度、线条、小节线、反复与跳跃、布局、文字、速度、吉他、键盘……可增可隐，预设 palette 不能删 [S1] | 顶部 Add Palettes；自定义 palette 里的 More 按钮打开 Master palette（全部符号）；面板搜索框【未核实版本】 | tooltip 显示名称 | **Properties 面板**（原 Inspector；无选区时显示整谱属性）[S4]；**弹出面板（popup）**：Ctrl+D 打开力度面板，可点选也可键入 [S6]；变调夹、弦调也有弹出设置 [S7] | 【核实】/【部分】 |
| Dorico 5 | 左 **Notes 面板**：时值（默认只显示常用，可展开全部）、临时记号、连线、奏法 [S13]；右 **Notations 面板**按类别分 [S12]；Notations 工具箱可在 **Panels / Popovers** 两种按钮间切换 [S11][S12] | 跳转条（J）：命令模式和跳转模式，支持首字母和片段模糊匹配 [S17] | tooltip 括号内写快捷键 [S19] | 底区 **Properties**；**popover**（Shift+字母弹出的文本输入框）：Shift+D 力度；Shift+K 调号（大写＝大调、小写＝小调、`1s`＝一个升号）；Shift+M 拍号；Shift+T 速度；Shift+O 装饰音……[S16] | 【核实】 |
| Sibelius | Notations 选项卡；**Keypad 6 套布局**：常用音符、更多音符、符杠/震音、奏法、爵士奏法、变音记号 [S22] | 演进：Find in Ribbon（7.0，只高亮位置）→ 2018.1 起可直接执行 → 2021.2 更名 **Command Search**，覆盖 File 后台、Keypad 和加乐器对话框，逗号键聚焦 [S21] | KeyTips；tooltip【未核实】 | Inspector | 【核实】/【部分】 |
| Guitar Pro 8 | 左侧编辑调色板：节奏、演奏效果、呈现、自动化、注释；F2 显隐 [S24] | **命令面板 Ctrl+E** [S24] | 【未核实】 | 右侧 Song / Track Inspector（F5/F6）[S24] | 【核实】 |
| Flat | 原来是顶部多页签；教育版改成左侧竖轨三面板，官方说“一个工具都没删，只是重排”，并且可一键折叠成全屏谱面 [S26] | Alt+? 查看快捷键表 [S26] | — | — | 【核实】 |
| Noteflight | 2016 年 HTML5 改版主打**可自定义的记号调色板** [S27]；界面稀疏，靠右键菜单补足 [S27] | — | — | 右键菜单 | 【部分】 |
| Soundslice | 编辑栏在左侧 | **搜索结果显示快捷键**；内置**快捷键预设**：默认 / 像 Finale Simple Entry / 像 Guitar Pro / 像 Sibelius [S28] | 快捷键面板 | — | 【核实】 |
| StaffPad | 断音、重音用笔直接画；颤音、琶音、滑奏进菜单 [S29] | — | — | 上下文工具条 | 【部分】 |

**归纳**
1. 分组都按**乐理类别**，不按使用频率。“常用”由一个单独的常用区承担：Dorico 的 Notes 面板、Sibelius Keypad 的第 1 套布局。
2. 一屏只放 20–40 个常用项；全量符号要么另开窗口（Master palette），要么靠搜索。
3. 上下文入口有两种：
   - 常驻属性面板：信息全，但离操作点远。
   - 选中即弹的小面板（MuseScore popup、Ribbon 上下文选项卡 [S35]）：离操作点近，项目少。
4. 搜索的演进：从“只查位置”到“搜到即执行”，再到“结果附快捷键”。后两种已是主流。

### 3.3 顶部主菜单的信息架构

| 范式 | 代表 | 结构 | 出版级功能放在哪 | 新手 / 专家 | 可信度 |
|---|---|---|---|---|---|
| 按工作流分模式 | Dorico 5 | 顶部切换 Setup / Write / Engrave / Play / Print（另有 Library）；每个模式的左、右、底区内容都不同 [S10][S14] | Engrave 模式：左 Formatting，右 Pages（页面模板、flow 标题），底 Properties [S18]。Print 模式：左 Layouts，右 Print Options，中间打印预览 [S10] | 专家效率高；新手常犯“功能在另一个模式里”的错。早期 Elements/SE 没有 Engrave 模式，新版 Elements 6.1 已加入 [S18]，即分级产品逐级开放模式 | 【核实】 |
| Ribbon 选项卡 | Sibelius | File / Home / Note Input / Notations / Text / Play / Layout / Appearance / Parts / Review / View（Parts 与 Review 的先后各来源不一）[S20] | Layout（文档设置、分行分页、隐藏谱表）；Appearance（House Style、Engraving Rules、重置位置）；Parts（部件外观、打印部件）；File 后台（打印、导出 PDF）[S20][S23] | 11 个选项卡太多，靠 Command Search 补救 [S21]。微软 Ribbon 指南：多数时间停在 Home，常用任务很少切页签，上下文选项卡只在选中特定对象时出现 [S35] | 【核实】 |
| 三段页签 + 传统菜单 | MuseScore 4 | 菜单栏 + Home / Score / **Publish** [S2] | **Publish 页签**：隐藏输入工具栏和侧栏，只做打印、导出（图片/音频/文档）、发布到 musescore.com [S2]；页面与样式在 Format 菜单 | 新手门槛最低的“模式化” | 【核实】 |
| 传统菜单 + 工具条 | Finale、GP8、TuxGuitar | GP8 工具栏：缩放、显示、撤销、播放、循环、速度；窗口变窄时部分按钮隐藏，但菜单里仍能找到 [S24] | GP8：File › Export、Stylesheet | 靠菜单；GP8 用命令面板补救 [S24] | 【核实】/【部分】 |
| 极简 + 命令面板 | Flat、Noteflight、Figma、Notion | 薄顶栏（文件名下拉、分享、导出），工具在侧栏，命令面板用 Ctrl+/ 或 Ctrl+K | 导出在文件名菜单或分享里；版式在独立的 Layout 面板 [S26] | 新手友好；专家用命令面板 | 【部分】 |

**归纳**
- “出版级”软件的共性：**排版**（版式、页面、间距、字号、隐藏谱表）和**输出**（预览、打印、导出、部件）都是独立的工作段，进入后界面跟着切换。没有一家把「排版 / 预览 / 打印」做成三颗平铺按钮，和保存、谱库、智能挤在同一行。
- 兼顾新手和专家，有三种可以叠加的手段：
  - 少量工作段（MuseScore 是 3 段）；
  - 命令搜索；
  - 上下文选项卡或弹出面板。
- 我们现在的主栏是 `智能 | 新建▾ 打开 | 保存 存为文件 | 排版 预览 打印… | 预设 谱库`，混了四类东西：AI、文件操作、出版、内容来源。按竞品惯例应该这样归位：
  - 「排版 / 预览 / 打印」归入一个工作段；
  - 「预设 / 谱库」归入新建、打开的来源（启动台和新建面板已经覆盖）；
  - 「保存 / 存为文件 / 打开」归入文件菜单；
  - 「智能」归入命令面板和右栏「创作辅助」。

### 3.4 多文档页签

| 产品 | 位置 | 一枚页签代表什么 | 尺寸 / 溢出 | 未保存标记 | 分屏 / 多窗 | 可信度 |
|---|---|---|---|---|---|---|
| MuseScore 4 | 谱面上方 | **同一乐谱的总谱和各部件**。多份乐谱各开一个窗口，甚至各开一个进程；这是 4.0 起有意为之，让每份乐谱有独立音色 [S5][S8] | — | 标题栏 | 3.x 的“两份并排”在 4.0 被移除 [S8] | 【核实】 |
| Dorico | 工具栏与乐谱区之间；View › Show Tabs 可隐藏，默认值可在偏好里改 [S15] | **一个 Layout（总谱/分谱），或同一 layout 的另一个视图** [S15] | — | 窗口标题 | 乐谱区可分屏，每个分区一组页签；同一项目可开多个窗口 [S15] | 【核实】 |
| Sibelius | 7.0 起“Tabbed Document Interface”：新页签、新窗口、切换、关闭 [S20] | 总谱 / 部件视图 | — | — | 新窗口 | 【部分】 |
| Guitar Pro 8 | 工具栏下方的页签条，显示已打开的文件 [S24] | 一份文件 | — | **修改过的文件有标记** [S24] | — | 【核实】 |
| VS Code | 编辑区上方（每个编辑组一条） | 一个文件 | 默认高约 35px，另有 compact 档【未核实】；`tabSizing: fit/shrink`（另有 fixed 档，最小约 50、最大约 160【未核实】）；`wrapTabs` 自 1.53 起允许换行，空间不够时退回滚动条 [S32] | ● 圆点替换关闭钮，悬停变回 ×【未核实，常识】；预览页签斜体；可钉住 | 编辑组分屏 | 【部分】 |
| Chrome | 与标题栏合并 | 一个网页 | 先收缩到只剩图标；实验性的“Tab Scrolling”提供不收缩/中/大/收缩到钉住宽四档后横向滚动 [S33]；主要靠页签组和页签搜索治理 [S33] | 加载 / 音频图标 | 拖出成新窗口 | 【部分】 |
| Figma 桌面 | 与标题栏合并 | 一份文件 | 用户抱怨没有横向滚动，溢出的页签只能靠快捷键找 [S34]；每个文件类型图标加间距约 27px，15 个页签就占 405px [S34]；后来加了页签组 [S34] | 云端自动保存，无未保存标记 | — | 【部分】 |

**归纳**
- 制谱软件里的页签多半代表“**同一作品的不同版面**”（Dorico Layouts、MuseScore Parts、Sibelius 部件视图），“多份作品”反而常用独立窗口。我们的页签代表“多份作品”，更接近 GP8 和浏览器。
- 位置上，制谱软件把页签条放在“工具栏之下、谱面之上”，**只服务谱面区**；浏览器类则把页签并入标题栏来省高度。
- 惯例是**只标“未保存”**，已保存不加任何标记。
- 溢出治理有四种手段：收缩到最小宽、横向滚动、换行、页签组或列表搜索。Figma 的教训是：既不能滚动又没有列表时，溢出的页签就等于“消失”了。

### 3.5 图标与字形

| 产品 | 乐谱符号按钮 | 功能按钮 | 标签策略 | 可信度 |
|---|---|---|---|---|
| MuseScore 4 | **调色板直接用谱面字体渲染真实元素**（默认 Leland，3.6 起 [S36]）；每格可调内容缩放和偏移，整板可调格宽高和缩放，这些只影响面板显示，不影响谱面 [S9] | 界面图标字体【未核实】 | 调色板无标签，悬停显示名称 | 【核实】/【部分】 |
| Dorico | 按 Bravura 风格绘制的图标【未核实】 | 线性图标 | 无标签，tooltip 带快捷键 [S19] | 【部分】 |
| Sibelius | Ribbon 画廊用位图，风格近似刻版字形 | Ribbon 大/小按钮带文字 | 大按钮下方有字、小按钮右侧有字、画廊无字 | 【未核实】 |
| GP8 | 全部是技巧/节奏图形 | 图标 | 无标签 + tooltip | 【部分】 |
| Flat / Noteflight | 图标 + tooltip | — | 偏教育；侧栏面板有文字标题 [S26] | 【部分】 |

**补充规格**
- WCAG 2.2 SC 2.5.8 要求可点击目标不小于 24×24 CSS px [S37]。
- SMuFL 的字形以“一个谱线间距（staff-space）”为单位设计，光学大小一致 [S38]。只要按同一个谱线间距缩放，按钮里的升降号、奏法、装饰音就会自然对齐、大小一致。
- 本项目的 `SMUFL` 和 `smg()` 已具备这个条件（PROJECT.md §5，内嵌 47 枚 Bravura 轮廓）。

---

## 4. 设计模式清单（全量 24 条；每条：做法 / 适用条件 / 坑）

### A. 音轨与乐器

**A1 音轨是“上下文”，不是“工具页签”** [S1][S11][S24][S26]
- 做法：音轨列表放在独立区域；选中的音轨决定作用对象；工具跟随选区或谱行类型变化。
- 适用：音轨不少于 2 条、或工具集随记谱法变化的情况。
- 坑：列表离谱面太远时（例如 Dorico 放在另一个模式里），新手找不到在哪加乐器。写谱段要保留一个轻量的切换器。

**A2 每轨的显示设置放在“音轨设置”里，不放进工具面板** [S3][S24]
- 做法：标准谱/TAB/斜线、调弦、名称、变调夹，从齿轮或右侧 Inspector 进入。
- 适用：低频改动的设置。
- 坑：入口要能被发现；MuseScore 的齿轮就曾被认为太隐蔽。

**A3 列表式音轨行：行高 28–36，包含图标、名称、隐藏/静音/独奏、轨色** [S3][S24]
- 做法：支持拖动排序 [S3]；轨色与谱面高亮对应 [S24]。
- 适用：任意轨数。
- 坑：把隐藏和静音合在一起，会让只想静音伴奏的老师困惑。

**A4 加乐器对话框：分类 + 搜索 + 常用组合** [S3]
- 做法：按 `i` 或点 Add 打开。
- 适用：乐器种类多的产品。
- 坑：教育用户只用五六种乐器，全量列表反而是负担。

**A5 同源多版面（Layouts / Parts）** [S5][S14][S15]
- 做法：一份源数据生成多个版面，每个版面单独排版，以页签形式打开。
- 适用：出版、合奏教学。
- 坑：数据模型要支持“每个版面的覆盖设置”。本项目的红线是 song 字段只能新增可选字段，必须拍板后才能做。

### B. 记号工具

**B1 按乐理类别分组，有组标题，可折叠** [S1][S12][S22][S24]
- 做法：变音、八度、连线与连音、奏法、装饰音、力度与速度、呼吸与延长、反复、文字等。
- 适用：项目超过 12 个。
- 坑：组太多会拉出长滚动，要配合 B2、B3。

**B2 首屏放“常用区”** [S13][S22]
- 做法：参考 Dorico 的 Notes 面板、Sibelius Keypad 第 1 套；控制在 8–12 项。
- 坑：自动推断的“常用”会跳来跳去；教育场景宜固定，或只按谱行类型切换。

**B3 搜索 + 最近使用 + 收藏/自定义** [S1][S21][S27][S28]
- 做法：面板顶部放搜索框；“最近”一行 6 个；可以把项目钉到自定义组。
- 适用：项目超过 30 个。
- 坑：中文必须支持**拼音首字母**和同义词（延音线 / 连音线 / tie）。

**B4 tooltip 和面板角标显示快捷键** [S19][S28]
- 做法：tooltip 写“名称（快捷键）”；搜索结果也附快捷键。
- 坑：40px 的格子里放角标会显得挤，紧凑档只放在 tooltip 里。

**B5 选中即弹的上下文小面板** [S6][S7][S35]
- 做法：就近弹出，只放 4–8 个相关项。
- 坑：会遮挡谱面、滚动时位置漂移。MuseScore 的变调夹面板曾“单击就弹，选不中也删不掉” [S7]。应该在“选中后再点一次”或按 Enter 时才弹出。

**B6 popover 文本输入（专家加速）** [S16]
- 做法：Shift+字母打开输入框，按文本语法一次写入。
- 坑：要学语法；**不能是唯一入口**。Dorico 本身也保留了 Panels 模式 [S12]。

**B7 快捷键方案预设（“像 GP / 像 Sibelius”）** [S28]
- 做法：让从竞品迁移来的用户一键沿用习惯。
- 坑：维护成本随方案数增长，只做 1–2 套。

**B8 手写或直接操作优先，复杂的进菜单** [S29]
- 做法：参考 StaffPad。
- 坑：仅适合触屏或手写笔，桌面网页不适用。

### C. 顶栏与信息架构

**C1 工作段分离：写谱 / 排版 / 输出** [S2][S10][S18][S20]
- 做法：进入“排版”时，左右区换成版式内容；进入“输出”时隐藏输入工具，中间显示预览。
- 坑：超过 3 段就会出现“模式错误”；段内点谱面要能直接回到写谱。

**C2 文件命令收进“文件”菜单或“曲名 ▾”** [S2][S23]
- 坑：保存状态必须常驻可见（已保存/未保存胶囊），否则用户会焦虑。

**C3 命令搜索 / 跳转条** [S17][S21][S24]
- 做法：一个键打开；搜命令、跳小节；结果附快捷键和位置。
- 坑：覆盖不全就会失去信任（Dorico 论坛有人反映搜不到某些对话框选项 [S17]）。应以命令注册表的方式自动收录。

**C4 常用任务留在主页签（Home 驻留原则）** [S35]
- 坑：Sibelius 的 11 个选项卡是反例。

**C5 窄屏时按钮可以隐藏，但功能要能从菜单找到** [S24]
- 坑：我们在 1024 宽时顶栏折成 3 行（155px），比隐藏按钮更糟。

**C6 分级产品逐级开放工作段** [S18]
- 坑：核心功能藏到付费层后面，免费用户会误以为“做不到”。

### D. 多文档页签

**D1 页签条只占谱面区宽度，左右面板通到顶部** [S5][S15]
- 坑：页签多时宽度变小，要配合 D3。

**D2 只有一份文档时收起页签条，或把页签并入标题栏** [S15][S33][S34]
- 坑：并入标题栏时，要留出拖动和点击区。

**D3 溢出处理：收缩到最小宽 → 横向滚动 → “全部窗口 ▾”列表/搜索** [S32][S33][S34]
- 坑：Figma 两样都不给，溢出的页签就“消失”了。

**D4 只标“未保存”：圆点替换关闭钮，悬停变回 ×** [S24][S32]
- 坑：云同步状态放在保存胶囊里，不要放到页签上。

**D5 页签区分“作品”和“版面”** [S5][S15]
- 适用：做了 A5 之后。
- 坑：两级页签要在视觉上明显区分。

**D6 页签交互全套**【未核实，常识】
- 做法：拖动排序、中键关闭、右键菜单（关闭其他 / 关闭右侧 / 复制一份 / 新窗口打开）、Ctrl+Tab 切换、关闭前确认未保存。

### E. 图标与字形

**E1 乐谱符号用刻版字形，功能动作用线性图标，两套不混用** [S9][S36][S38]
- 坑：刻版字形笔画重、线性图标笔画轻，同一行出现时要用间距或分组隔开。

**E2 统一光学尺寸** [S9][S38]
- 做法：按谱线间距缩放，例如按钮里 1 个谱线间距 ≈ 6–7px，字形高度约为格高的 45–55%；同类字形用同一基线（变音记号统一以第 3 线居中）。
- 坑：`8va`、颤音线这类字形天生宽，要逐格设置内容缩放。

**E3 标签分档：“图标 + 下方小字”与“仅图标 + tooltip”可切换**
- 依据：专业产品默认无标签；教育产品有标题【部分】。
- 坑：中文 2–4 个字要 11–12px 才可读，10px 太小；加标签后格高约从 40 增到 52。

**E4 可点击区不小于 24×24（WCAG 2.2），常用按钮 32–40** [S37]
- 坑：视觉格子和可点击区要分开处理。

---

## 5. 对本项目最有借鉴价值的 15 条（按优先级）

前提：所有建议都在现有外壳和 C「极光靛紫」配色上演进，不换肤。不改名、不删除任何 song 字段或 `musetab-*` 键，新增本机键也以 `musetab-` 为前缀。下面的“落点”只指方向，具体方案由 DESIGN 环节出。

**1. 左轨改为“稳定的工具类别”，音轨降为“上下文切换器 + 列表”（A1/A3/B1）**
- 借鉴：MuseScore 的 Palettes 与 Instruments 分页签、GP8 底部 Global view、Flat 教育版的三面板竖轨。
- 落点：
  - 左轨固定为「记号 / 歌词·和弦 / 小节·反复 / 音轨」4–5 个类别；
  - 歌词层只有 2 个动作，不值一个一级入口；
  - 左轨顶部放一个“当前音轨”胶囊（图标 + 名称 + ▾），点开是音轨列表。
- 这与 v60.43“音轨是最上级上下文”的拍板仍然兼容，只是不再让每条轨各占一颗 56×46 的按钮。
- 教育适配：老师想的是“我在写哪一行”，轨数通常只有 1–4 条，一个下拉就够。
- 不照搬：Dorico 把演奏者管理放进另一个模式。

**2. 记号面板按“谱行类型”自动切换子集，组内按乐理类别分组（B1/B2）**
- 借鉴：Dorico 的 Notes + Notations 面板、Sibelius Keypad 的 6 套布局。
- 落点：
  - TAB 行：拨弦 / h·p·滑 / 推弦揉弦 / 闷音泛音 / 节奏型。
  - 简谱行：高低八度点 / 升降还原 / 连线连音 / 奏法 / 装饰音 / 力度速度 / 呼吸延长。
  - 五线谱行：用五线谱专用的分组。
  - 每组都有组标题，取代现在的 27 格平铺。
- 教育适配：简谱用户的默认项里不该出现 `8va`；简谱的“升八度”应画成高音点，与谱面一致。
- 不照搬：MuseScore 默认把二十多个 palette 全部展开。

**3. 首屏一行“常用 + 最近”，其余折叠，配拼音首字母搜索（B2/B3）**
- 借鉴：MuseScore 的面板管理、Sibelius Command Search、Soundslice 的搜索。
- 落点：吉他轨现在 39 个按钮、要滚 1.12 屏。目标是首屏不超过 20 项、不用滚动；搜索支持 `yc`→延长号、`lyx`→连音线。
- 教育适配：拼音首字母检索是国内用户的强习惯，竞品都没有，是一个差异点。

**4. 乐谱符号按钮统一用 `smg()` 刻版字形，并统一光学尺寸（E1/E2）**
- 借鉴：MuseScore 调色板渲染真实元素、每格可设内容缩放 [S9]。
- 落点：
  - 升降还原、延长、奏法、装饰音、力度、反复（repeatLeft/Right、segno、coda）、拍号都改用 Bravura。缺的字形按 PROJECT.md §5 的流程用 `gen_glyphs.py` 增补。
  - 吉他技巧（h、p、P.M.、let ring）用与谱面 TAB 刻版同款的文字样式。
  - 去掉 `|:`、`┌1.`、`⊕`、`𝄴` 这类 Unicode 拼凑。
  - 字形高度从约 30% 提到格高的 45–55%。
- 教育适配：按钮上看到的就是谱面上的样子，老师可以直接指着讲。
- 不照搬：Sibelius 的位图图标。

**5. 标签分两档：默认“图标 + 小字”，紧凑档“仅图标”，用本机键记住选择（E3/E4）**
- 落点：
  - 默认档：格子约 44×52，标签 11–12px（现在是 50×46、10px）。
  - 紧凑档：36×36，tooltip 写名称和快捷键。
  - 档位存在新增的 `musetab-` 本机键里。

**6. 每轨显示设置移出记号面板（A2）**
- 借鉴：GP8 Track Inspector、MuseScore 的齿轮。
- 落点：「当前音轨 · 显示 简谱/五线/大谱表 · MIDI · 键盘 · 变调夹」卡片约 150px，而且“键盘”按钮溢出卡片。把它移到音轨列表行里的齿轮，或右栏「信息」页。
- 教育适配：这些设置一份谱通常只设一次。

**7. 顶栏改为三段工作流：写谱 / 排版 / 输出（C1）**
- 借鉴：MuseScore 4 的 Home/Score/Publish、Dorico 的 Engrave/Print、Sibelius 的 Layout/Appearance 加 File 后台。
- 落点：
  - 现在的「排版 预览 打印…」拆进后两段。
  - 排版段：版式、页面、字号、谱行间距、分行分页。
  - 输出段：预览、打印、PDF、图片、MusicXML、MIDI、分享卡、互动谱。
  - 进入输出段时隐藏编辑行，像 MuseScore 的 Publish 页签那样，可以回收 75px 高度。
- 教育适配：三段一眼就懂，正好对应老师的“写好 → 排好 → 打印或发给学生”。
- 不照搬：Dorico 的 5–6 个硬模式。

**8. 文件命令收进“曲名 ▾ / 文件”菜单，主栏只留保存状态胶囊（C2）**
- 落点：
  - 「新建▾ 打开 保存 存为文件」约 250px，收进菜单；
  - 「预设 谱库」并入新建、打开的来源；
  - 「智能」进入命令面板和右栏「创作辅助」。
- 坑：Ctrl+S、Ctrl+O、Alt+N 不变；第一次改版时给一次引导气泡。

**9. Ctrl+K「搜功能」命令面板（C3/B4）**
- 借鉴：Dorico J、Sibelius 逗号键、GP8 Ctrl+E。
- 落点：
  - 以命令注册表的方式收录全部顶栏、左栏、右栏动作；
  - 每条结果显示快捷键和位置，例如“排版 › 页面”；
  - 支持“跳到第 12 小节”（对应 Dorico 的 Go To 模式 [S17]）；
  - 支持拼音检索。

**10. 多文档页签移进谱面区，只有一份谱时收起（D1/D2）**
- 落点：
  - 把 41px 的全宽深色带，改成贴在纸面上沿、约 32px 高的浅色条；左右栏从顶到底贯通。
  - 同时修掉 `#left-flyout{top:150px}` 写死造成的压页签问题（L560、L564；1280/1440 宽重叠 12px，1024 宽重叠 46px）。
  - 只有一份谱时不显示页签条，“＋新窗口”放进曲名菜单。
- 教育适配：多数老师一次只开 1–2 份。

**11. 页签样式规格（D3/D4/D6）**
- 尺寸：高 30–34；字号 12.5–13；中文最小宽约 112（4 个汉字 + 图标 + 关闭钮），最大约 220。
- 溢出：先收缩，再横向滚动，最后给“全部窗口 ▾”。
- 标记：**只标未保存**（圆点替换 ×，悬停变回 ×），去掉“绿点＝已保存”。
- 其他：当前页签与纸面同色连通；支持拖动排序、中键关闭、右键菜单。

**12. 选中即出的就近小浮条，只放 4–6 个最常用动作（B5）**
- 借鉴：MuseScore 的力度/变调夹弹出面板、Ribbon 上下文选项卡。
- 落点：
  - 选中 TAB 音时：`h p 滑 推 揉 …更多`。
  - 选中简谱音时：`高八度点 低八度点 升 降 延长 …更多`。
  - 选中和弦时：换把位、试听。
  - 浮条贴在当前谱行上方；“更多”打开左栏对应分组并高亮。
- 坑：不要单击就弹。选中后约 300ms 再出现，Esc 收起。

**13. “同源多版式”作为出版级定位的抓手（A5/D5；远期，需拍板）**
- 借鉴：Dorico 的 Layouts、MuseScore 的 Parts。
- 落点：同一首歌的「简谱版 / 五线谱版 / 弹唱谱版 / 教学对照版」作为同一作品下的版面页签。这直接强化“三记谱法同源互切”的护城河。
- 红线：只能新增可选字段；第一期只做视图切换，不做每个版面的独立覆盖设置。

**14. 音轨行的隐藏 / 静音 / 独奏三态分开，加轨色（A3）**
- 借鉴：GP8 的 mute/solo 和轨色、MuseScore 的眼睛图标。
- 教育适配：钢琴弹唱教学里“只听伴奏”“只看旋律”是高频需求。

**15. “快速输入框”：中文提示版 popover（B6；放在最后）**
- 落点：按 `/` 弹出输入框，可输入 `1=D`、`3/4`、`♩=72`、`mf`、`Am7`、`rit.`；下拉给出中文候选（例如“1=D 调号（D 大调）”）。
- 教育适配：`1=D`、`3/4` 本来就是简谱的书写习惯，比 Dorico 的 `D`、`1s` 更贴近中国老师。
- 不照搬：把 popover 做成唯一入口，或者要求用户记语法。

---

## 6. 适合与不适合“教育 + 中文简谱/六线谱”用户的模式

**适合**

| 模式 | 理由 |
|---|---|
| MuseScore 式三段工作流（C1） | 与“写 → 排 → 印/发”的教学路径一致，只有 3 个状态 |
| 按谱行类型切换记号子集 + 组标题（B1/B2） | 简谱用户不必看五线谱专属记号；吉他用户先看到技巧 |
| 默认“图标 + 小字”（E3） | 中文用户和初学者需要文字提示 |
| 拼音首字母搜索 + 最近使用（B3） | 符合国内输入习惯，竞品都没有 |
| 就近小浮条（B5） | 学生不用理解面板结构，点哪改哪 |
| 只标未保存、单份谱时收起页签条（D2/D4） | 少噪声；多数人只开 1–2 份 |
| 刻版字形按钮（E1） | 所见即所得，方便课堂讲解 |
| 隐藏 / 静音 / 独奏分开（A3） | 钢琴弹唱、合唱分声部练习都要用 |

**慎用或不照搬**

| 模式 | 风险 | 替代做法 |
|---|---|---|
| Dorico 的 5–6 个硬模式 | 模式错误：“这个功能在哪个模式里？” | 只分 3 段，段内点谱面就回到写谱 |
| Dorico popover 作为主入口 | 要记 `1s`、`p<f>p` 这类语法 | 只做可选加速器，用中文候选和 `1=D` |
| Sibelius 11 个 Ribbon 选项卡 | 找功能全靠记忆 | 3 段 + 命令搜索 |
| 全参数属性面板（MuseScore / Dorico） | 几百个参数，学生看不懂 | 右栏「信息」只放与选中对象相关的 5–8 项 |
| Master palette 默认全量可见 | 选项太多，无从下手 | 折叠 + 搜索 |
| Finale 式“先选工具、再点谱面” | 学习曲线陡（Finale 已于 2024-08 停止开发 [S25]） | 选中即操作 |
| 每份作品一个独立窗口（MuseScore 4） | 网页单文件产品不适用，MuseScore 用户自己也抱怨 [S8] | 维持页签多开（v60.99 拍板） |
| 纯图标无标签（Dorico / GP8 默认） | 中文初学者难辨认 | 只作为紧凑档 |

---

## 7. 负责人的不满 → 实测证据 → 对应模式

| 不满 | 实测证据 | 对应模式 |
|---|---|---|
| 左栏音轨逻辑 | 音轨按钮（吉他1 / 旋律1 / ＋音轨）和工具层按钮（歌词 / 小节 / 段落）同形同大、排在同一竖轨；选音轨就等于换工具面板；歌词层只有 2 个动作也占一级入口 | A1/A2/A3 → 第 5 节第 1、6、14 条 |
| 工具功能的设计和使用 | 记号 27 格平铺无组标题；吉他轨 39 个按钮要滚 1.12 屏；音轨设置卡每次占约 150px；“键盘”按钮溢出卡片 | B1/B2/B3/B5 → 第 5 节第 2、3、12 条 |
| 图标样式、大小、比例 | 格子 50×46，字形 16×14（约 30%），标签 10px；四种字形来源混用 | E1–E4 → 第 5 节第 4、5 条 |
| 顶栏主菜单 | 主栏把 AI、文件、出版、内容来源四类按钮平铺；1024 宽时折成 3 行（155px） | C1–C5 → 第 5 节第 7、8、9 条 |
| 多开窗口的样式和占位 | 41px 全宽深色带，1–2 份谱也占满；浮层 `top:150px` 写死（L560、L564），压住页签 12px（1280/1440 宽）或 46px（1024 宽）；“绿点＝已保存”不合惯例 | D1–D4/D6 → 第 5 节第 10、11 条 |

---

## 8. 来源

以下链接全部来自 WebSearch 命中。WebFetch 被代理拒绝，没有逐页打开。

- [S1] MuseScore 4 Handbook – Using the palettes：https://musescore.org/en/handbook/4/using-palettes
- [S2] MuseScore 4 Handbook – The user interface：https://musescore.org/en/handbook/4/user-interface ；Open/Save/Export/Print：https://musescore.org/en/handbook/opensaveexportprint
- [S3] MuseScore 4 – Working with instruments：https://musescore.org/node/329665
- [S4] MuseScore Studio – Properties panel：https://handbook.musescore.org/basics/properties-panel
- [S5] MuseScore Studio – Parts：https://handbook.musescore.org/basics/parts
- [S6] MuseScore Studio – Dynamics：https://handbook.musescore.org/notation/expressive-markings/dynamics
- [S7] MuseScore – Applying capos：https://handbook.musescore.org/idiomatic-notation/guitar/applying-capos ；https://musescore.org/en/node/359183 ；https://www.scoringnotes.com/reviews/musescore-4-1/ ；https://MuseScore.org/en/node/354177
- [S8] MuseScore 论坛（MS4 多份乐谱开新窗口）：https://musescore.org/en/node/338084?page=1 ；https://musescore.org/en/node/365828 ；https://musescore.org/en/node/339680 ；https://musescore.org/en/node/341524
- [S9] MuseScore 3 – Palettes：https://musescore.org/en/handbook/3/palettes
- [S10] Dorico Pro 5.1 – Zones and panels：https://www.steinberg.help/r/dorico-pro/5.1/en/dorico/topics/user_interface/user_interface_panels_r.html
- [S11] Dorico SE 5 – Write mode window：https://steinberg.help/dorico_se/v5/en/dorico/topics/write_mode/write_mode_window_r.html
- [S12] Dorico Pro 5.1 – Right zone：https://www.steinberg.help/r/dorico-pro/5.1/en/dorico/topics/write_mode/write_mode_panels/write_mode_right_zone_r.html
- [S13] Dorico 4 – Notes panel：https://steinberg.help/dorico/v4/en/dorico/topics/write_mode/write_mode_notes_panel_r.html
- [S14] Dorico – Setup mode：https://steinberg.help/dorico/v4/en/dorico/topics/setup_mode/setup_mode_project_window_r.html ；https://steinberg.help/dorico/v1/en/dorico/topics/user_interface/user_interface_panels_r.html ；https://steinberg.help/dorico/v2/en/dorico/topics/setup_mode/setup_mode_players_layouts_flows_c.html
- [S15] Dorico Elements 6.1 – Tab bar：https://www.steinberg.help/r/dorico-elements/6.1/en/dorico/topics/user_interface/user_interface_tab_bar_r.html ；Project window：https://www.steinberg.help/r/dorico-elements/6.1/en/dorico/topics/user_interface/user_interface_windows_c.html
- [S16] Dorico 5 popovers PDF：https://archive.steinberg.help/dorico/v5/extra/dorico_5_popovers_230524.pdf ；https://www.steinberg.help/r/dorico-elements/6.1/en/dorico/topics/write_mode/write_mode_notations_input/write_mode_dynamics_popover_r.html ；https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/write_mode/write_mode_notations_input/write_mode_key_signatures_inputting_popover_t.html
- [S17] Dorico Jump bar：https://www.scoringnotes.com/tips/jump-to-it-tips-for-using-doricos-jump-bar/ ；https://www.steinberg.help/r/dorico-pro/5.1/en/dorico/topics/user_interface/user_interface_jump_bar_going_to_locations_t.html ；https://www.scoringnotes.com/news/dorico-4-0-20/ ；https://forums.steinberg.net/t/more-thorough-search/892333
- [S18] Dorico Engrave mode：https://steinberg.help/dorico/v4/en/dorico/topics/engrave_mode/engrave_mode_left_zone_r.html ；https://www.steinberg.help/r/dorico-elements/6.1/en/dorico/topics/engrave_mode/engrave_mode_window_r.html ；https://steinberg.help/dorico_first_steps/v4/en/dorico_first_steps/topics/first_steps_intro/first_steps_quick_tour_user_interface_r.html
- [S19] Dorico – Key commands：https://steinberg.help/dorico/v4/en/dorico/topics/introduction/introduction_key_commands_in_dorico_r.html
- [S20] Sibelius 界面：https://www.educator.com/music-theory/sibelius/edler/sibelius-interface.php ；https://resources.avid.com/SupportFiles/Sibelius/2020.3/Sibelius_Reference.pdf ；https://dtf.ru/software/5080930-avid-sibelius-notnyy-redaktor
- [S21] Sibelius Command Search：https://www.scoringnotes.com/tips/comma-sense-command-search-in-sibelius/ ；https://www.avid.com/resource-center/whats-new-in-sibelius-february-2021
- [S22] Sibelius Keypad：https://origin-www.lynda.com/Sibelius-tutorials/Getting-familiar-keypad/2814065/2247897-4.html ；https://apps.apple.com/us/app/-/id1078098572
- [S23] Sibelius 导出与打印：https://www.scoringnotes.com/tips/creating-pdfs-from-sibelius-7/ ；https://cpdl.org/wiki/index.php/Help:How_do_I_create_PDF_files%3F ；https://mma.pages.tufts.edu/ctfm/SibeliusAdvice.pdf
- [S24] Guitar Pro 8：https://www.guitar-pro.com/docs/gp8/basics/first-steps/main-screen ；https://www.guitar-pro.com/docs/gp8/display-options/panels ；https://www.guitar-pro.com/docs/gp8/audio/mixtable ；https://www.guitar-pro.com/docs/gp8/basics/intro/whats-new ；https://www.guitar-pro.com/docs/gp8/score/track-settings/track-information
- [S25] Finale 停止开发：https://www.scoringnotes.com/news/makemusic-ends-development-and-availability-of-finale/ ；https://www.finalemusic.com/?p=23000
- [S26] Flat：https://blog.flat.io/new-flat-for-education-editor-sidebar/ ；https://help.flat.io/en/music-notation-software/articulation/ ；https://help.flat.io/en/music-notation-software/notation-features/
- [S27] Noteflight：https://notes.noteflight.com/noteflight-launches-new-interface-for-over-two-million-users/ ；https://labnol.org/internet/compose-music-notations-online/9457
- [S28] Soundslice：https://soundslice.com/help/en/creating/basics/62/keyboard-shortcuts ；https://www.soundslice.com/blog/100/new-customize-your-keyboard-shortcuts/ ；https://www.soundslice.com/help/notation-editor/ ；https://www.soundslice.com/blog/155/introducing-our-notation-editor-redesign/
- [S29] StaffPad：https://www.soundonsound.com/reviews/staffpad ；https://www.synthtopia.com/?p=63001 ；https://staffpad.net/staffpad-tips-n-tricks-part-1
- [S30] 国内同类：
  - 作曲大师：https://apps.apple.com/us/app/%E4%BD%9C%E6%9B%B2%E5%A4%A7%E5%B8%88-%E9%92%A2%E7%90%B4%E7%AE%80%E8%B0%B1-%E7%AE%80%E8%B0%B1-%E4%BD%9C%E6%9B%B2%E5%AE%B6-%E4%BD%9C%E8%AF%8D-%E4%BD%9C%E6%9B%B2-%E4%BD%9C%E6%9B%B2%E8%BD%AF%E4%BB%B6/id6504094515?l=vi
  - 简谱大师：https://apps.apple.com/app/id6451075613
  - 简而谱：https://apps.apple.com/cn/app/%E7%AE%80%E8%80%8C%E8%B0%B1lite-%E7%AE%80%E8%B0%B1%E5%88%B6%E4%BD%9C%E5%8F%8A%E6%89%93%E8%B0%B1%E4%BD%9C%E6%9B%B2%E8%BD%AF%E4%BB%B6/id1272559770
  - 来音制谱：https://apps.apple.com/cn/app/%E6%9D%A5%E9%9F%B3%E5%88%B6%E8%B0%B1-%E7%AE%80%E8%B0%B1%E4%BA%94%E7%BA%BF%E8%B0%B1%E6%89%93%E8%B0%B1%E6%89%92%E8%B0%B1%E7%BC%96%E8%BE%91%E5%88%B6%E4%BD%9C%E8%BD%AF%E4%BB%B6/id6450210894
  - 有谱么：https://apps.apple.com/app/id973743727
  - Guitar Notation：https://apps.apple.com/cn/app/guitar-notation-%E5%90%89%E4%BB%96%E8%B0%B1-%E5%B0%A4%E5%85%8B%E9%87%8C%E9%87%8C-%E5%85%AD%E7%BA%BF%E8%B0%B1%E4%BD%9C%E6%9B%B2/id1144464459
  - EOP 简谱大师视频：https://www.douyin.com/shipin/7449945219652470834
- [S31] TuxGuitar：https://flathub.org/apps/ar.com.tuxguitar.TuxGuitar
- [S32] VS Code 1.53 发行说明：https://github.com/microsoft/vscode-docs/blob/40e20706acf07af1a987f9185e5a5108cd050fdf/release-notes/v1_53.md ；https://bobbyhadz.com/blog/wrap-tabs-to-multiple-lines-vscode
- [S33] Chrome 页签：https://www.ghacks.net/?p=180494 ；https://mspoweruser.com/google-is-testing-new-tab-size-options-for-chrome/
- [S34] Figma 页签：https://forum.figma.com/archive-21/new-tab-bar-is-frustrating-when-you-have-multiple-files-open-11919 ；https://forum.figma.com/t/desktop-figma-app-too-many-tabs-open-cant-view-the-tabs-dont-fit-in-the-horizontal-view/59664 ；https://www.createwith.com/tool/figma/updates/figma-adds-tab-groups-to-desktop-app-to-reduce-designer-cognitive-load
- [S35] Microsoft Ribbon 指南：https://learn.microsoft.com/en-ie/Windows/Win32/uxguide/cmd-ribbons ；https://learn.microsoft.com/en-us/windows/desktop/windowsribbon/ribbon-contextualtabs
- [S36] MuseScore – Music fonts：https://handbook.musescore.org/appendix/music-fonts
- [S37] WCAG 2.2 SC 2.5.8：https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html（【未核实】本轮未检索，按规范常识引用）
- [S38] SMuFL 规范：https://w3c.github.io/smufl/latest/（【未核实】同上）