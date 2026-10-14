# 「新建乐谱 / 新建文档」竞品与惯例调研报告

谱友圈 · 新建流程与图标方案 · 调研轮（2026-10-14）

**REPORT.md 没有写成。** 子代理禁止写报告类 .md 文件，`/tmp/claude-0/-home-user-puyouquan/c5c19e8e-d3d1-572e-9787-3dc37b4d5300/scratchpad/nf/research/REPORT.md` 不存在。本回复全文就是报告正文，由调用方另存。

截图已存在同一目录：
- `cur-startpad-desk.png`、`cur-startpad-mob.png`：启动台
- `cur-wizard-desk.png`、`cur-wizard-mob.png`：新建向导
- `cur-wizard-inst-desk.png`、`cur-wizard-inst-mob.png`：向导里的乐器下拉

`/home/user/puyouquan` 下的文件一个都没改。

---

## 0. 结论先行

1. **业界新建流程分三派，没有一家先问「记谱分类」。**
   - 「先选编制」：MuseScore、Sibelius、StaffPad、Flat。
   - 「先选模板/类型」：Dorico Hub、Guitar Pro 模板页、Canva、Hookpad。
   - 「先交素材」：Soundslice、Klangio、Songscription、AnthemScore。
   - 我们的三张意图卡（声乐 / 器乐 / 功能）问的是记谱分类学，用户得先懂分类才能下手。
2. **调 / 拍 / 速度普遍放到后面。** Dorico 和 Flat 新建时根本不问。Guitar Pro 新建空文件后只弹「音轨向导」。MuseScore 和 Sibelius 也只放在第二页或底栏，并且有默认值（C、4/4、♩=120）。关键在第一步问对问题。
3. **「怎么表示一个选项」，业界分工一致。**
   - 类型和模板用**真实缩略图**：Sibelius 的稿纸缩略图、Canva/Figma 的模板卡、MuseScore Home 的乐谱首页缩略图。
   - 乐器用**小图形符号**，只出现在音轨列表（如 Guitar Pro 的轨图标）。
   - 动作和格式用线性 UI 图标。
   - 我们三类全用同一套线性图标：`SVGI` 共 78 枚，24 视口、描边 1.8，13–32px 混用。这是图标「不高级」的结构性原因。
4. **导入和新建是平级入口**：Noteflight「Start by importing」、Sibelius Quick Start 的 Import 页、Flat 手机端都这样做。我们有三处导入入口，给的格式各不一样（见 §2.3）。
5. **「三记谱法同源互切」已不是独家。** Guitar Pro 8 的音轨记谱类型里有「Numbered（简谱）」，MuTone 作曲家支持「简谱/五线/吉他/鼓 + 简五互译」。护城河要靠场景化产出（即兴伴奏织体、教学对照、考编版式）和刻版质量来体现，新建页正是展示它们的地方。
6. **核心主张（12 条细节见 §7）：** 新建页做成「场景缩略图画廊 + 从已有音乐开始 + 空白」一屏三栏。
   - 按产出物提问，用真实谱面缩略图代替乐器插画。
   - 「我会哪种谱」做成一个会记住的开关。
   - 基础信息给默认值、折叠起来；双击场景卡直接建谱。
   - 全部映射到现有 `createSong(type,o)`，不新增必需字段。

---

## 1. 方法与可信度

- **联网情况。** 能用 WebSearch，检索约 35 次。WebFetch 和 curl 访问目标站点全部失败：musescore.org、handbook.musescore.org、steinberg.help 返回 `ENOTFOUND`，代理对 CONNECT 返回 403。所以**没有直接读到任何原始页面**。下文的「核实」只是对搜索引擎返回的官方文档摘要做了核对。
- **可信度标注：**
  - **✔**：官方文档或商店页的摘要直接支持。
  - **◐**：部分核实，来源是第三方、旧版本或用户评论。
  - **✱**：未核实，基于既有知识，**评审时不要当定论引用**。
- 「酷音小伟」「吉他世界」的制谱流程本轮检索零命中，相关内容全部标 ✱。
- **本项目现状**用 Playwright 实测：chromium，打开 `file:///home/user/puyouquan/muse-tab/index.html`，桌面视口 1440×900，手机视口 390×844 @2x。

---

## 2. 本项目现状（对照基线）

### 2.1 入口与代码位置（`muse-tab/index.html`）

| 入口 | 位置 | 行为 |
|---|---|---|
| 启动台四卡：新建 / 打开 / 导入 / 我的 | L2706–2718 `#start-pad`，分派逻辑约在 L14155 | 「导入」小菜单只有 MusicXML 和 MIDI |
| 顶栏「新建」 | L2339 `#b-new` → L21893 | 调 `showNewWizard` |
| 标签条「＋ 新窗口」 | L21135 `#dt-add` → L21174 | 调 `showNewWizard` |
| 顶栏「预设」 | L2350 → L21337 `showLibrary` | 16 个 `PRESETS`（L5859）。**已有真实谱面缩略图管线**：`buildThumbCanvas`（L24833）加 `PRESET_THUMB` 缓存（320×160 JPEG，L21319） |
| 右栏「导入 MIDI…」 | L2859 `#rt-midi` | MIDI 独立界面（L24224） |
| 新建向导 | L21466 `showNewWizard` → L21400 `createSong` | 3 张意图卡 + 次级下拉 + 曲名/调/拍/速 + 导入两卡（MusicXML / Guitar Pro） |
| 谱类派生 | L21099 `docType`、L21112 `docIcon` | — |

### 2.2 实测数据（1440×900）

- **向导弹窗** 720×505，三张意图卡各 217×118，图标 32px。
  - 可见控件：3 个下拉（乐器 / 形态 / 我会）、3 个原生 select、2 个输入框、10 个按钮。
  - 乐器菜单共 28 项。
- **默认路径**是「器乐 · 吉他 · 伴奏 · 会六线谱」，点 1 次「创建，进入编辑」就建出弹唱谱，已经够快。
- **启动台**四张卡各 132×105，**图标只有 13×13px**（`svgi` 默认尺寸）。卡大、图标小，看上去空，是「图标不满意」最直接的视觉来源。
- **手机端（390 宽）**是一列长表单，意图卡 342×58，整窗高 743。「形态」「我会」两个标签被挤到行尾，和各自的下拉不在一行（见 `cur-wizard-mob.png`）。

### 2.3 一致性问题

1. **三处导入，格式各不相同：**
   - 启动台：MusicXML + MIDI
   - 向导：MusicXML + Guitar Pro
   - 右栏：单独 MIDI
2. **同一谱类，不同位置图标不同：**
   - 声乐谱：向导用 `mic`，`docIcon` 用 `note`。
   - 功能谱：向导用 `chordgrid`，`docIcon` 却用 **`piano`**。
   - 「器乐谱」卡和「Guitar Pro 导入」卡**都用 `guitar` 图标**，一个是类别，一个是文件格式，语义撞车。
3. **一套线性图标通吃所有尺寸。** `svgi()`（L20332）统一 `viewBox 24`、`stroke-width 1.8`。13px 时笔画约 0.98px，32px 时约 2.4px，没有按尺寸补偿；乐器图形和 UI 动作图形也是同一种笔触。
4. **定位和入口错位。** PROJECT.md §1 定型的是「八场景入口（按『我要干什么』选，不需要懂记谱法）」，但 v60.41 起向导收敛成「声乐 / 器乐 / 功能」，问的是记谱分类学。16 个带缩略图的预设覆盖了全部 docType，却和新建流程是断开的。

---

## 3. 逐产品卡片

### 3.1 MuseScore Studio 4

- **入口：** 顶部三页签 Home / Score / Publish ✔。Home 下有 Scores / Plugins / Learn / My account ✔。Scores 页以网格显示最近乐谱的首页缩略图，第一格是「New score」◐。
- **第一步：** New Score 对话框分「Choose instruments」和「Create from template」两个页签 ✔。
  - 乐器可按 Family 下拉分组浏览，也可以搜索；双击或点 → 添加 ✔。
  - 「Your score」面板有 Order 下拉，默认 Orchestral，独奏者排在弦乐之上 ✔。
- **第二页：** 调号（大调在前、小调另起页签）、拍号（含 C、¢）、速度（勾选「Show tempo marking on my score」后才显示）、弱起、小节数 ✔。标题/作曲等字段也在这一页 ✱。
- **默认值：** C 大调、4/4、♩=120（不显示）、**32 小节**、无弱起 ✔。
- **模板：** 先在 Category 面板选组，每个模板预置「这类乐谱最常用的乐器，按惯例排序」✔。MS4 的确切分类名未核实 ✱，旧版有 Jazz Lead Sheet、Guitar + Tablature、Rock/Pop band 等 ◐。模板列表是纯文字 ✱。
- **导入：** 走 File > Open，没有独立入口 ✱。
- **图标：** 乐器选择器是纯文字 ✱；Home 页用首页缩略图 ◐。
- **移动端：** 手机 App 只能看谱和播放，不能新建 ✱。
- **启示：** 调拍速可以有默认值、可以放后面。但 32 小节、♩=120 是西方作曲的口径，我们的 8 小节、♩=90 更贴合弹唱和教学。
- **来源：** [Handbook 4 Setting up your score](https://musescore.org/en/handbook/4/setting-your-score)、[handbook.musescore.org](https://handbook.musescore.org/basics/setting-up-your-score)、[The user interface](https://handbook.musescore.org/navigation/the-user-interface)、[3.6 新特性](https://musescore.org/ja/%E3%83%8F%E3%83%B3%E3%83%89%E3%83%96%E3%83%83%E3%82%AF/new-features-musescore-36)、[中文手册 创建新乐谱](https://musescore.org/zh-hans/handbook/2/chuangjianxinlepu)

### 3.2 Dorico 5/6（含 iPad）

- **入口：** 启动进 Hub，Hub 汇集最近项目、新建、学习资料 ✔。
- **第一步，两条路：**
  - Create New 选模板类别：Band / Chamber / Choral / **Empty** / Jazz / Orchestral / Solo ✔。
  - 或者 Ctrl/Cmd-N 新建空项目，直接进 Setup 模式加 player ✔。乐器选择器可以加单人、声部组或整个合奏（弦乐组、四部合唱）✔。
- **默认值：** 新建时**不问调拍速**，在 Write 模式用 popover 输入（Shift+K / Shift+M）；空项目默认无拍号 ✱。创建前可改 Project Options，Empty 模板除外 ✔。
- **模板：** 按编制/体裁组织 ✔。**可见范围随版本分层**：SE 只显示 ≤2 人的模板，Elements 只显示 ≤12 人的，iPad 版看是否订阅 ✔。
- **图标：** Hub 类别是大图块，player 卡是文字加分组色 ✱。
- **iPad：** 同一套 Hub 和模板 ✔；不能自建项目模板 ◐。
- **启示：** 「Empty」和模板类别放在同一层，空白就是其中一个选项。
- **来源：** [Dorico 4 Starting new projects](https://steinberg.help/dorico/v4/en/dorico/topics/project_file_handling/project_file_handling_projects_new_starting_templates_t.html)、[Dorico 1](https://steinberg.help/dorico/v1/en/dorico/topics/user_interface/user_interface_new_projects_from_templates_starting_t.html)、[SE 4](https://steinberg.help/dorico_se/v4/en/dorico/topics/project_file_handling/project_file_handling_projects_new_starting_templates_t.html)、[Elements 6.1](https://www.steinberg.help/r/dorico-elements/6.1/en/dorico/topics/project_file_handling/project_file_handling_projects_new_starting_templates_t.html)、[First Steps 5](https://steinberg.help/dorico_first_steps/v5/en/dorico_first_steps/topics/first_steps_setup/first_steps_project_starting_new_t.html)、[iPad 新建](https://steinberg.help/dorico_ipad/v1/en/dorico/topics/project_file_handling/project_file_handling_projects_new_starting_templates_t.html)、[iPad 加 player](https://steinberg.help/dorico_ipad/v1/en/dorico/topics/setup_mode/setup_mode_players_adding_t.html)、[iPad 加合奏](https://steinberg.help/dorico_ipad/v1/en/dorico/topics/setup_mode/setup_mode_ensembles_adding_t.html)、[论坛](https://forums.steinberg.net/t/common-templates-for-osx-and-ipad-apps/1032009)

### 3.3 Sibelius

- **入口：** 启动弹 Quick Start，含 Recent / New Score / Import / Learn / Latest News 页签 ✱；只核实到 New Score 页签 ◐。
- **第一步：** 选一张预制「稿纸」，或选 Blank ✔。同一屏底部可以 Change Instruments（也可以以后再改）、选 House Style、定拍号，然后点 Create ◐。**2022.3 起加了「Score Information」区**，可填标题和作曲 ✔。
- **默认值：** House Style 默认「(Unchanged)」◐；调号和速度怎么设未核实 ✱。
- **模板：** 稿纸按体裁/编制分类 ✱，Blank 归在「no category」◐。可以把 House Style 导入稿纸，做成机构模板 ✔。
- **图标：** **每张稿纸是一张小谱页缩略图** ✱，属于「记谱缩略图」流派。
- **启示：** 用版面直接告诉用户会得到什么，和我们「同源不同版面」的卖点天然契合。House Style 相当于我们的 `layout.preset`。
- **来源：** [Avid 2022.3](https://www.avid.com/es/resource-center/whats-new-in-sibelius-march-2022)、[thewritescore](https://thewritescore.com/twsdocs/sib-vdl-readme-20-c-export-manuscript-paper)、[Midnight Music PDF](https://midnightmusic.com.au/wp-content/uploads/2013/07/Sibelius-Basics-Tips-and-Tricks-2013.pdf)、[Tufts PDF](https://mma.pages.tufts.edu/ctfm/SibeliusAdvice.pdf)、[RPM Seattle](https://www.rpmseattle.com/of_note/?p=7228)、[LinkedIn Learning](https://origin-www.lynda.com/Sibelius-tutorials/Creating-adjusting-new-score/2812530/2251110-4.html)

### 3.4 Guitar Pro 8

- **入口：** File > New、Home 页 New、标签条「+」、Ctrl/⌘N 四处 ✔。Home 页有 **Templates 页签**，也可走 File > New from Template ✔。
- **第一步：** 新建出空文件后，**自动弹出「Track Creation Assistant」**加第一条轨 ✔。向导依次问：
  1. 乐器类型：Stringed / Orchestra / Drums / MIDI
  2. 具体乐器
  3. 名称、颜色、**图标**
  4. **记谱类型：Standard / Tablature / Slash / Numbered（简谱），可多选组合**
  5. 谱表：单谱表或大谱表
  6. 定弦（3–10 弦）
  7. 音色
  8. 创建 ✔
  - 双击乐器可以直接建轨 ✔。
- **默认值：** 调拍速不在新建流程里问 ✱。定弦可以存为用户预设 ✔。
- **模板：** 按乐队编制，例如 rock trio、jazz quintet、solo acoustic guitar，音轨/定弦/音色都预配好 ✔；有「Manage My Templates」✔。
- **图标：** 音轨有乐器图标和颜色，颜色会显示在全局视图和工具栏 ✔；图形是单色扁平风格 ✱。
- **移动端：** 以看谱为主 ✱。
- **启示：** 「乐器」和「记谱类型」是两个独立维度，而且记谱可以多选，和我们 v60.65「我会」的解耦思路同构。另外，GP 已经能出简谱。
- **来源：** [GP8 New file](https://www.guitar-pro.com/docs/gp8/score/project/new-file)、[New track](https://www.guitar-pro.com/docs/gp8/score/project/new-track)、[Track Information](https://www.guitar-pro.com/docs/gp8/score/track-settings/track-information)、[Tuning](https://www.guitar-pro.com/docs/gp8/score/track-settings/track-tuning)、[Quick Start](https://www.guitar-pro.com/docs/gp8/basics/intro/quick-start)、[KVR](https://kvraudio.com/product/guitar-pro-8-by-arobas-music)

### 3.5 Flat.io（Web + 手机）

- **第一步：** 点「New score」，**先填标题，再选乐器**（可自定义乐器，也可用编制模板）✔。**创建过程中能实时预览谱面布局** ✔。
- **默认值：** **不问调和拍**，默认 C 大调、4/4。之后点谱表开头灰色的调号占位，或点拍号来改 ✔。**选弹拨乐器（吉他、尤克里里、班卓、曼陀林）会默认加一行 TAB** ✔。
- **模板：** 按体裁组织（jazz / pop / rock / choirs…），一次新增过 20 个 ✔。
- **导入：** 手机端和新建平级，可导入 MusicXML / MIDI / PDF / 照片 ✔。
- **移动端：** 填标题、选乐器两步；选钢琴自动给大谱表；iOS 创建时就能加自定义乐器 ✔。
- **启示：** 「灰色调号占位、点一下就改」是很好的后置手法；「按乐器自动带出对应记谱」是好的智能默认。「先问标题」是反面例子。
- **来源：** [Help 新建](https://help.flat.io/en/music-notation-software/create-your-first-music-score/)、[Step by step](https://help.flat.io/en/music-notation-software/step-by-step-tutorial/)、[Tabs](https://help.flat.io/en/music-notation-software/tabs/)、[新模板](https://blog.flat.io/flat-spotlight-new-instrument-templates-editor-hacks/)、[2024-03](https://blog.flat.io/flat-spotlight-march-2024-speeding-up-your-composition-process/)、[2023-06](https://blog.flat.io/flat-updates-june-2023/)、[手机写谱](https://blog.flat.io/how-to-write-sheet-music-on-your-phone/)、[App Store](https://apps.apple.com/app/id1177592149)

### 3.6 Noteflight / Noteflight Learn

- **第一步：** 点「+ Create」，二选一：「Start from a blank score sheet」或「Start by importing XML or MIDI files」，**导入和空白平级** ✔。
- **默认值：** **注册时选的乐器偏好决定新谱默认谱表** ✔，这是「用户画像预填」。
- **Learn（教育版）：** 老师用「Share → Create an activity template」分享给全站、群组或个人；**学生第一次打开时自动生成自己的副本** ✔；可以嵌进学校的学习管理系统 ✔。
- **启示：** 画像预填可以用「记住上次选择」来近似。「教师模板 → 学生副本」可作为师范垂类的远期储备。
- **来源：** [Guide](https://noteflight.com/guide)、[学生指南](https://fueledbylaunch.atlassian.net/wiki/spaces/LVL/pages/473890825/Student+Instructions+-+Noteflight)、[Assignments](https://support.noteflight.com/hc/en-us/articles/360020579032-Creating-Assignments-in-a-Standalone-Site)、[LTI](https://support.noteflight.com/hc/en-us/articles/360043847731-Creating-Assignments-with-LTI-Integration)、[Export for Learn](https://support.noteflight.com/hc/en-us/articles/360040361432-Exporting-Scores-for-Noteflight-Learn-Assignments)

### 3.7 Soundslice

- **流程：** New slice → 先「Add a recording」（YouTube、URL、MP3 或视频）◐ → 再给记谱。记谱有三种来源：
  - 导入 MusicXML / GP / PowerTab / TuxGuitar ✔
  - **扫描 PDF 或照片（光学识谱，beta）** ✔
  - 从头写 ✔
  - 最后打拍点，和录音同步 ◐。
- **启示：** 「素材优先」的新建方式，最贴合我们的北极星（AI 音频/转谱 → 干净谱面）。
- **来源：** [PDF 导入](https://www.soundslice.com/help/en/creating/pdf-import/)、[Scanner](https://soundslice.com/sheet-music-scanner)、[Transcribe](https://soundslice.com/transcribe)、[Editor](https://soundslice.com/blog/55/introducing-the-soundslice-notationtab-editor)、[论坛实操](https://www.djangobooks.com/forum/discussion/16270/)

### 3.8 Hookpad

- **2024 年新增 quickstart 屏 ✔**，五个选项：空项目 / Templates / **Sparks** / 最近 / demo。
- **设置：** 调、速度、和弦进行「随时可以改」✔；拍号在编辑器右上角改 ✔；支持多种调式 ✔。
- **Sparks** 预选好乐器、速度和拍号；Templates 附带关键和弦建议 ✔。
- **启示：** 「能直接开写的风格起点」正适合即兴伴奏和功能谱，例如「卡农 4536 · 慢板分解」。
- **来源：** [Hookpad 2](https://www.hooktheory.com/blog/introducing-hookpad-2-a-musical-sketchpad-with-music-theory-built-in/)、[Release notes](https://forum.hooktheory.com/t/hookpad-release-notes/93)、[调式/拍号](https://www.hooktheory.com/blog/updates-mode-support-time-signatures-and-looping/index.html)、[FAQ](https://www.hooktheory.com/faq)

### 3.9 StaffPad（补充）

- 新谱打开后提示「add an instrument」，Staffs 面板分 Category / Staff / 已有乐器三列；Templates 里有常见合奏 ◐。
- **启示：** 先开谱、后加乐器，空状态本身就在引导。
- **来源：** [Sound On Sound](https://www.soundonsound.com/reviews/staffpad)

### 3.10 Canva / Figma / Notion

- **Canva：** 首页写着「What will you design today?」，下面一排设计类型：Docs / Whiteboards / Presentations / Social media / Videos / Print / Websites / More ✔。每个类型点进去，要么是空白设计，要么是该类模板 ✔；另有 Custom size ✔。类型图标是彩色圆底 ✱，模板卡是真实缩略图 ✱。**按产出物组织。**
- **Figma：** 「+ Create」下分 Design / FigJam / Slides / Buzz，每个有专属彩色图标 ✱。FigJam 和 Slides 的模板可发布给团队、组织或社区 ✔，对应我们 B 端和学校的模板复用。
- **Notion：** 新页面的空状态同时给出 Empty page ✔、「Start writing with AI」✔、模板/视图快捷项 ◐。空白、AI 起稿、模板三者同屏，没有哪个被藏到第二步。
- **来源：** [Canva design from scratch](https://www.canva.com/help/design-from-scratch/)、[Canva 入门](https://www.canva.com/design-school/resources/how-to-start-creating-with-canva-guide)、[首页导览](https://brendacadman.com/how-to-navigate-the-canva-homepage/)、[NSW T4L](https://t4l.schools.nsw.gov.au/resources/professional-learning-resources/canva-for-education/canva-foundations/finding-the-right-design.html)、[Figma boards](https://help.figma.com/hc/en-us/sections/15329445881111-Work-on-boards)、[Figma tips](https://help.figma.com/hc/en-us/categories/360002051633-Tips-and-more)、[Notion AI 模板](https://www.notion.com/templates/collections/9-templates-to-supercharge-your-workflows-with-notion-ai)、[Notion 新建页](https://superhq.notion.site/How-to-Create-a-New-Page-on-Notion-43e5ba913fff41289e2dc43cf696ed66)

### 3.11 国内同类

| 产品 | 要点 | 可信度 | 启示 |
|---|---|---|---|
| 简谱大师（iOS） | 简谱高级符号、移调转调；**订阅才解锁「节拍调整、弱起小节」** | ◐ | 基础参数收费会招差评。「调拍速、弱起全免费」可以作为我们的卖点 |
| 作曲大师 / 简谱Pro（id6504094515） | 合唱最多 4 声部，20+ 乐器 | ◐ | 「合唱 N 声部」是主流需求，和我们的 `vocalN` 一致 |
| 五线谱Pro | 8 声部、100+ 乐器；用户评论说**免费版锁死 4/4、速度 120** | ◐ | 反面例子 |
| 简而谱 | 新建时就要填标题、副标题、调式、节拍、作者 | ◐ | 国内常见的表单式向导 |
| **MuTone 作曲家** | **简谱/五线/吉他/鼓谱 + 简五互译 + MIDI 转谱 + MusicXML 导入** | ◐ | 三记谱同源的直接竞品 |
| 虫虫钢琴 | 5 万首简谱曲库；制谱者上传；五线转简谱；指法标注 | ◐ | 制谱入口是「上传」，不是「新建」 |
| 靠谱弹唱 | 快速写弹唱谱、变调、导出 PDF | ◐ | 轻流程 |
| Guitar Notation | 吉他谱编辑器，最多 8 行，可导出 MusicXML | ◐ | — |
| 有谱么 | 「网页和弦编辑器，分分钟出谱」 | ◐ | 对应我们的 `chord` 和弦格 |
| MuseScore 中文 | 新建向导默认显示「常用乐器」，可从模板建谱（中文版手册）；不原生支持简谱 | ✔ / ✱ | — |
| 酷音小伟 | 零命中；据既有了解是 Windows 简谱打谱软件 | ✱ | — |
| 吉他世界 | 零命中；据既有了解以 GTP/图片谱上传曲库为主 | ✱ | — |

**来源：** [简谱大师](https://apps.apple.com/app/id6451075613)、[简谱Pro](https://apps.apple.com/us/app/%E4%BD%9C%E6%9B%B2%E5%A4%A7%E5%B8%88-%E9%92%A2%E7%90%B4%E7%AE%80%E8%B0%B1-%E7%AE%80%E8%B0%B1-%E4%BD%9C%E6%9B%B2%E5%AE%B6-%E4%BD%9C%E8%AF%8D-%E4%BD%9C%E6%9B%B2-%E4%BD%9C%E6%9B%B2%E8%BD%AF%E4%BB%B6/id6504094515?l=pt-BR)、[五线谱Pro](https://apps.apple.com/cn/app/%E4%BA%94%E7%BA%BF%E8%B0%B1pro-%E4%BD%9C%E6%9B%B2%E5%A4%A7%E5%B8%88%E7%9A%84%E6%89%93%E8%B0%B1%E8%BD%AF%E4%BB%B6/id1551925812)、[简而谱](https://apps.apple.com/cn/app/%E7%AE%80%E8%80%8C%E8%B0%B1lite-%E7%AE%80%E8%B0%B1%E5%88%B6%E4%BD%9C%E5%8F%8A%E6%89%93%E8%B0%B1%E4%BD%9C%E6%9B%B2%E8%BD%AF%E4%BB%B6/id1272559770)、[MuTone](https://apps.apple.com/cn/app/id1548411923)、[虫虫钢琴](https://apps.apple.com/us/app/%E8%99%AB%E8%99%AB%E9%92%A2%E7%90%B4%E7%AE%80%E8%B0%B1-%E5%AE%8C%E7%BE%8E%E9%92%A2%E7%90%B4%E8%B0%B1%E5%A4%A7%E5%85%A8/id1544924081)、[靠谱弹唱](https://apps.apple.com/us/app/%E9%9D%A0%E8%B0%B1%E5%BC%B9%E5%94%B1-%E5%90%89%E4%BB%96-%E9%92%A2%E7%90%B4-%E5%92%8C%E5%BC%A6%E8%B0%B1%E7%BC%96%E8%BE%91/id6499522493?l=es-MX)、[Guitar Notation](https://apps.apple.com/cn/app/guitar-notation-%E5%90%89%E4%BB%96%E8%B0%B1-%E5%B0%A4%E5%85%8B%E9%87%8C%E9%87%8C-%E5%85%AD%E7%BA%BF%E8%B0%B1%E4%BD%9C%E6%9B%B2/id1144464459)、[有谱么](https://apps.apple.com/us/app/%E6%9C%89%E8%B0%B1%E4%B9%88-%E9%92%A2%E7%90%B4-%E5%90%89%E4%BB%96%E7%AD%89%E5%90%84%E7%B1%BB%E6%9B%B2%E8%B0%B1/id973743727?uo=4)、[MuseScore 中文手册](https://musescore.org/zh-hans/handbook/2/chuangjianxinlepu)

### 3.12 AI 转谱产品的导入入口

| 产品 | 第一步 | 输出 | 可信度 |
|---|---|---|---|
| Klangio（Piano2Notes / Guitar2Tabs / Sing2Notes / Drum2Notes / Melody Scanner） | **按乐器拆成独立 App**（也在 MuseHub 上架）。先选 App，等于先选乐器；再上传 MP3/WAV、贴 YouTube 或现场录音 | PDF（五线/TAB）、MIDI、MusicXML、GP | ◐ |
| Songscription | 上传、YouTube 或麦克风 → **选乐器** → 出谱 | 可编辑、可分左右手；导出 MusicXML / MIDI / PDF / GP。钢琴最可靠；吉他只支持标准调弦 | ◐ |
| AnthemScore | **打开音频就自动开始转谱** → 在频谱图上校对 → 修音符和拍点 | PDF、MusicXML | ✔ |
| Soundslice 扫描 | New slice → 扫描 → 选 PDF 页 | 可编辑记谱 | ✔ |

**启示：** 这类产品的第一步一律是「交素材」，然后只问一个问题：乐器。它们的终点是 MusicXML / MIDI / GP，**正好是我们的入口格式**。我们承接的是「AI 粗稿 → 出版级净谱」这一段。

**来源：** [MuseHub × Klangio](https://www.musehub.com/partner/klangio)、[Piano2Notes](https://musehub.com/app/piano2notes)、[Guitar2Tabs](https://www-cf.musehub.com/app/guitar2tabs)、[theaireport](https://www.theaireport.ai/tooldatabase/klangio)、[Songscription](https://songscription.ai/music-transcriber)、[audio-to-sheet](https://www.songscription.ai/audio-to-sheet-music)、[MIDI Association](https://midi.org/innovation-award/songscription-ai)、[AnthemScore Getting Started](https://www.lunaverus.com/gettingStarted)、[Documentation](https://lunaverus.com/documentation)、[Editions](https://www.lunaverus.com/compareEditions)

---

## 4. 横向对照表

| 产品 | 第一步问 | 调 / 拍 / 速 | 默认篇幅 | 模板按什么分 | 导入位置 | 选项怎么呈现 |
|---|---|---|---|---|---|---|
| MuseScore 4 | 乐器（或模板页签） | 第二页，有默认值 | 32 小节 | 体裁/编制（纯文字） | File > Open | 文字；Home 页用首页缩略图 |
| Dorico | 模板类别 / 空项目 | **不问** | 无拍号 | 编制 | Import | 类别图块 ✱ |
| Sibelius | 稿纸 | 底栏 | — | 体裁/编制 | 平级 Import 页 ✱ | **稿纸缩略图** ✱ |
| Guitar Pro 8 | 空文件 → 音轨向导 | **不问** | — | 乐队编制 | Open | **轨图标 + 颜色** |
| Flat | 标题 → 乐器 | **不问**（谱上占位可点改） | — | 体裁 | 手机端平级 | 实时预览 |
| Noteflight | 空白 / 导入 | 编辑器里改 | — | 活动模板 | **平级** | ✱ |
| Soundslice / AI 转谱 | 素材 → 乐器 | 自动 | 跟随音频 | 按乐器 | **就是主流程** | — |
| Hookpad | 空白 / 模板 / Sparks / demo | 随时可改 | — | 风格起点 | — | ✱ |
| Canva | 产出物类型 | n/a | n/a | **产出物** | 上传 | 彩色类型图标 + 模板缩略图 |
| 国内简谱 App | 表单 | 新建时一次填完，部分收费 | — | 很少 | 很少 | ✱ |
| **谱友圈现状** | **记谱分类（声乐/器乐/功能）** | 一屏，有默认值 | 8 小节 | 预设与新建分离 | 三处不一致 | 一套线性图标通吃 13–32px |

---

## 5. 新建流程设计模式清单

| # | 模式 | 代表 | 适用条件 | 坑 |
|---|---|---|---|---|
| NP-01 | 空白优先，设置放后 | Dorico、Flat、GP、StaffPad | 参数都能无损后改（我们满足） | 空白页要能自己说明怎么改（灰色占位、提示语）。考编/艺考用户常常已经知道目标调，完全不问反而多一步 |
| NP-02 | 两步向导：编制 → 元信息 | MuseScore、Sibelius | 多乐器、排序有讲究 | 单旋律谱也被迫走两步。NN/g 的标准：后续步骤要依赖前面的选择才值得分步，否则只是把长表单拆了页 |
| NP-03 | 模板按编制/体裁分类 | Dorico、MuseScore、GP、Flat | 组合多，用户懂术语 | Band/Jazz/Chamber 这类西方体裁分类，在中文教育垂类里用不上 |
| NP-04 | **按产出物/场景提问** | Canva、Hookpad Sparks、Noteflight 活动模板、我们 v37.3 的八场景 | 用户按任务思考，不懂记谱 | 一屏控制在 6–9 个；用用户的话命名，不用 `pianoacc` 这种内部名；允许多个场景卡指向同一类型 |
| NP-05 | **真实缩略图代替抽象图标** | Sibelius 稿纸、Canva、MuseScore Home、Flat 预览 | 选项之间的差别就在版面（我们正是如此） | 要真实渲染、风格统一；只截 1–2 行保证小图可读；懒加载并缓存 |
| NP-06 | 导入与新建平级，格式口径统一 | Noteflight、Sibelius、Flat 手机端 | 有大量存量文件和 AI 产物 | 藏在第二层等于没有；多个入口口径不一会伤信任 |
| NP-07 | 素材优先 | Soundslice、Klangio、Songscription、AnthemScore | 已经有音乐、想要谱 | 要写清能处理的边界（标准调弦、单乐器等） |
| NP-08 | 乐器与记谱类型分开，记谱可多选 | GP（含简谱）、Flat（弹拨乐器默认加 TAB） | 同一份数据出多种谱面 | 新手不该自己挑记谱组合，应按场景自动带出，只把「我会哪种谱」作为输入偏好 |
| NP-09 | 画像/记忆预填 | Noteflight、Canva「For you」 | 回访用户多 | 默认值要可见可改；只能新增 `musetab-*` 键，不能改旧键 |
| NP-10 | 双击即建 | GP、Dorico | 高频用户、默认值可靠 | 双击只是加速，主按钮必须保留；手机没有双击 |
| NP-11 | 按付费层级过滤 | Dorico SE/Elements；简谱大师；五线谱Pro | 付费分层 | **锁基础参数是国内评论区重灾区**；应该锁内容包，不锁参数 |
| NP-12 | 教师/组织分发模板，自动生成副本 | Noteflight Learn、Figma 团队模板 | 教育、B 端 | 需要账号和班级体系，工程量大 |
| NP-13 | AI 起稿并列为入口 | Notion AI、Hookpad Sparks、Songscription | 生成能力可靠 | 质量不稳时会毁掉第一印象；文案要写「起稿」，别写「生成成品」 |
| NP-14 | 首页即新建台 | Canva、MuseScore Home、Hookpad quickstart | 首次打开 | 首页和新建弹窗做成两套 UI，就会重复、口径不一（我们现在就是） |

### 5.1 图标惯例（回应「icon 不满意」）

| 用途 | 业界惯例 | 谱友圈现状 |
|---|---|---|
| 类型 / 场景 / 模板 | **真实缩略图**为主，图标只当角标 | 32px 线性图标，看不出版面差别 |
| 产品级大入口 | 每类一种颜色的专属图形（Figma、Canva ✱） | 启动台四卡用 13px 单色线图标 |
| 乐器 | 单色扁平小图形，只在轨/列表行首出现，配轨颜色（GP ✔） | `INST_ICON` 22 种，方向是对的，但和 UI 图标用的是同一种笔触 |
| 动作 / 文件格式 | 线性图标；格式用「文档 + 扩展名」样式 | GP 导入用的是 `guitar`，和「器乐谱」卡撞车 |
| 多尺寸 | 按尺寸补偿：小尺寸笔画加粗、图形简化（行业通识 ✱） | 13–32px 一律描边 1.8 |

---

## 6. 不建议照搬

1. **先问标题（Flat）**：标题不约束任何东西，放第一步纯属成本。
2. **默认 32 小节（MuseScore）**：弹唱和考编片段一般 8–16 小节。
3. **西方体裁分类**：和即兴伴奏、考编、艺考、师范没有对应关系。
4. **基础参数收费（简谱大师、五线谱Pro）**。
5. **乐器插画当场景主视觉**：一把吉他图标，可能是弹唱谱、指弹独奏，也可能是 GP 导入。
6. **已否决的三个方向**不得回头：「老师的谱本」、Tesla 展厅、Apple 画廊。本报告只涉及信息架构和图标语义，不涉及风格隐喻。

---

## 7. 对本项目最有借鉴价值的 12 条

> 全部只用现有 `createSong(type,o)` 参数、可选字段或新增 `musetab-*` 键，不改任何旧键和旧字段。

**R1 · 第一步问「做什么谱」，取代「声乐 / 器乐 / 功能」**（NP-04）

建议场景卡与映射：

| 场景卡 | createSong 调用 | docType |
|---|---|---|
| 吉他弹唱谱 | `('tanchang',{inst:'guitar',nTab:1,nVox:1,lyr:1})` | guitar |
| 尤克里里弹唱 | `('tanchang',{inst:'uku',…})` | uku |
| **钢琴即兴伴奏（考编 / 幼师）** | `('pianoacc',{lyr:1})` | pianoacc |
| 钢琴独奏 | `('piano',{lyr:0})` | piano |
| 歌谱 · 合唱 | `('vocal',{nVox:1–4,lyr:1})`，加 `voxGroups` | vocal |
| **教学对照谱（师范 / 课堂）** | `('teach',{nVox:1})`（会设 `voxDual`） | teach |
| **器乐独奏（艺考）** | `('instr',{clef,nVox:1,lyr:0})`，加 `instKey` | instr |
| 指弹 / 电吉他独奏 | `('solo',{gtype:'finger'或'lead'})` | solo |
| 功能谱 / 和弦格 | `('func',{ftype:'func'或'chord'})` | func / chord |

教学对照谱从 v60.41 起没有自己的卡，但它是师范垂类的门面，应该重新放到第一屏。

**R2 · 场景卡主视觉用真实谱面缩略图，图标降为角标**（NP-05）

现成资源都在：16 个 `PRESETS`（L5859）覆盖全部 docType，`buildThumbCanvas`（L24833）和 `PRESET_THUMB`（L21319）已经能生成并缓存缩略图。每张场景卡截对应预设的首行或两行。这条直接回应「icon 不满意」，同时把「出版级刻版」这条护城河放到了用户眼前。

**R3 · 一屏三栏：从场景开始 / 从已有音乐开始 / 从空白开始**（NP-14、NP-06、NP-07）

启动台（L2706）和向导（L21466）合成一个组件：启动台用整页形态，「新建」和「＋ 新窗口」打开弹窗形态。这样同时解决 §2.3-1 的口径分裂。

**R4 · 导入统一成一处、一份格式清单**（NP-06、NP-07）

- 格式统一为 MusicXML · MIDI · Guitar Pro（.gp / .gpx / .gp3–5）。
- 文案写明「Klangio / Songscription / AnthemScore / MuseScore 导出的文件直接拖进来」，新建页支持拖放。
- MIDI 要补进向导。

**R5 · 「我会」提升为全局记谱偏好**（NP-08、NP-09）

做成新建页顶部的分段开关「我用 简谱 / 五线谱 / 六线谱 写」，记在新键（如 `musetab-nw-know`）里。落位逻辑全部复用 v60.65 已有代码（`voxNotations[0]`、光标落到旋律轨、`mapVoxToTab` 引导），不新增 song 字段。

**R6 · 基础信息折叠成一行摘要，缩略图跟着变**（NP-01、NP-02）

- 摘要形如「1=C · 4/4 · ♩=90 · 8 小节 ✎」，点开才出选择器，复用 v67.3 的速度单位和校验。
- 缩略图页头实时跟着摘要变（学 Flat 的实时预览）。
- 调保持一级可见：考编和艺考用户常有目标调。

**R7 · 双击场景卡即建，并记住上次选择**（NP-10、NP-09）

上次的场景和基础信息存在新键 `musetab-nw-last`。主按钮「创建，进入编辑」保留。

**R8 · 图标分三层**（§5.1）

- 场景层：缩略图加 20px 角标。
- 乐器层：`INST_ICON` 的 22 种单独做成一个子集，用统一网格和轮廓，只用在轨行首、乐器下拉和缩略图角标。
- UI 层：继续用线性图标。
- 做 2–3 档视觉尺寸，例如 16px 用描边 2.0、24px 用 1.75、32px 以上用 1.5 并补细节。
- 修正 §2.3-2 的撞车：功能谱统一用 `chordgrid`；声乐统一一个图标；GP 导入改用文件格式图标。
- 启动台图标从 13px 加大到 28–32px，或者直接换成缩略图。

**R9 · 「从示例开始」并入新建，并给内容包留位**（NP-03、NP-04、NP-11）

- 每张场景卡下附 1–3 个示例，例如 `presetPianoAcc`、`presetTeach`、`presetVocalFolk`。点开以副本打开，现有 `s.id=undefined` 逻辑已经支持。
- 远期在这里挂「考编曲目包 / 艺考视唱包」，对应 CLAUDE.md 定的变现重心。
- **锁内容包，不锁参数。**

**R10 · 「智能起稿」作为第四个入口，能力成熟后再开**（NP-13）

串起来就是：和弦进行或旋律 → 配和弦工作台 / 智能配谱 / 织体生成 → 落到 pianoacc 或 teach。v1 可以先作为「从示例开始」里的一个选项。文案写「起稿」。

**R11 · 手机端：单列场景列表 +「发到电脑」**

- 手机端只显示场景缩略图列表和导入。
- 用户选好场景后，用 `copyLinkForPc` 把场景写进链接（如 `?new=pianoacc`，可选参数）。
- 修掉 390 宽下标签和下拉错行的问题（`cur-wizard-mob.png`）。

**R12 · 埋点加「来源」维度**

- 在 `pyqEvent('create_song', type)`（L21663、L21848）上补一个来源：scene / blank / example / import-mxl / import-midi / import-gp / ai。
- 用两个指标验收改版：「新建到第一个音符的时间」和「建好后 5 分钟内放弃率」。
- 「教师模板 → 学生副本」（NP-12）列为远期，需要负责人拍板。

---

## 8. 待人工核实

- **MuseScore 4：** 模板分类名、模板是否带缩略图、「Make soloist」按钮名。
- **Dorico：** Hub 类别是否为插画图块、空项目是否默认无拍号。
- **Sibelius：** Quick Start 的页签组成、稿纸缩略图样式、调号和速度怎么设。
- **Guitar Pro 8：** 轨图标的风格和数量、默认速度。
- **Flat / Canva / Figma：** 图标风格。
- **酷音小伟、吉他世界：** 新建流程（本轮检索零命中）。

---

## 9. 补充来源（向导通用原则）

- [LogRocket（转引 NN/g 对向导的定义）](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [PatternFly 向导设计指南](https://patternfly.org/components/wizard/design-guidelines)
- [Trimble Modus 向导组件](https://modus.trimble.com/components/web/wizard)