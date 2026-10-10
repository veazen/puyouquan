# 编辑器色调盘点 + 骨架说明（EDITOR-MAP）

对象：`muse-tab/index.html`（v66.4，25160 行；CSS 在 L32–2149 主 `<style>`，另有 L4150–4216 `chordLabCSS()` 动态 `<style>`（全部读令牌，无写死色））。
骨架：`tc/skel/editor-skel.css`（追加在页面样式之后生效；本阶段只出方案，**仓库零改动**）。

## 0. 怎么用

| 步骤 | 做什么 |
|---|---|
| 换色 | 只改 §1 四态令牌块（`:root` / 系统深色且未选浅 / `data-theme="light"` / `data-theme="dark"`）+ §1b 主题无关常量 |
| 去钉 | 整段删除 §3「现色钉值」（`@@PINS-BEGIN`…`@@PINS-END`），§2 派生令牌随即跟随 §1 |
| 落地 | 按第 3 节行号把写死值就地改成 `var(--…)`，令牌块并入 L33–75；不用再“追加覆盖层”（追加层只是方案期的零侵入验证手段） |

结构约束（已在骨架里体现，改值时别破坏）：
- `--paper` 只出现在 `:root` 与 `data-theme="light"`，`--ink` 只在 `:root`。原文件就是这样，打印分支 `@media print{:root{--paper:#fff;--ink:#000}}` 只有 (0,1,0) 权重，深色块或 `[data-theme]` 块一旦写了这两个令牌，打印时就会盖掉白纸黑墨（验证时实测踩到过一次：`data-theme=light` 打印 `--ink` 变成 #141414）。
- 骨架末尾的 `@media print` 块必须放在 §1/§2 和 `#paper.score-invert` 之后，否则 §2 的 `--sc-*` 会盖掉打印钉值。
- 原文件 L51 的深色媒体查询没有 `:not([data-theme="light"])` 守卫，骨架四块都写全且排在后面，每种状态都是骨架胜出（已在 5 种主题状态实测）。

## 1. 验证结论

**零变化（令牌＝现色）**
- 官方 harness：E1–E7 七个场景（2x）与 `tc/base/` 同名 PNG 用 PIL `ImageChops` 逐张比，**平均像素差 0.00000、最大差 0、变化像素 0**（E1 E2 E3 E4 E5 E6 E7 全部为 0）。
- 计算样式全量比对（自写 `edtools/cdump.js`）：13 个场景 × 5 种主题状态＝65 态。场景有编辑器、浮层全开、播放带、反色纸、桌面观看页、手机观看页、手机编辑、启动台、新建向导、打印、谱架、谱库、个人中心；主题状态有浅、深、系统深、系统深+显式浅、系统浅+显式深。遍历全部 DOM 元素（含隐藏元素）及 ::before/::after 的 16 个颜色属性，再加 :root/#paper/#pv-pages/#print-pages 的 36 个令牌。**唯一差异**是 3 个元素的 box-shadow 计算值从 `none` 变成 `transparent inset 1px`，这是 `--glow` 的挂载位，肉眼与像素都看不出。
- 悬停态：18 个关键元素 × 浅深两套，悬停后 color/bg/border/shadow 全部与原文件一致。
- 教训：给按钮加 `box-shadow:0 0 12px transparent` 这种模糊外发光，即便颜色透明，也会让顶栏文字抗锯齿改变（E1 最大差 9、E7 最大差 43），所以已撤掉。`--glow` 现在只挂在框架的 1px inset 发丝线上。

**覆盖率（刺眼测试色板 `editor-probe.css`：--chrome #003366、--accent #0057ff、中性灰表面、深色 #101418 族，且删掉 §3 钉值）**
- 官方 harness 旧色残留：E1 137→**0**，E2 60→**0**，E3 127→**0**，E4 137→**0**，E5 168→**0**，E6 3→**0**，E7 58→**0**。截图在 `tc/skel/editor-probe/`，拼图 `tc/skel/editor-probe-grid.png`。播放带单独设成青色 #00c2ff，能看出 `--play-band` 与强调色已经解耦；深色测试板里 `--ed-on-accent` 设成深色字，左轨选中、播放、个人中心按钮的字都跟着变深，说明 40 处白字已全部接管。
- 65 态全量扫描（含隐藏元素）后残留只剩两类：① `--ok` 绿 #157a43（`#beat-status.good::before`、`.cc-price.free`），是语义色，探针按“深色、色相 150–180°”误判成墨绿；② `.dtab .dt-dot` 未保存琥珀点 #e8a13a，也是语义色。

## 2. 令牌表

### 2.1 §1 四态令牌（设计师改这些）

| 令牌 | 浅（现值） | 深（现值） | 用途 |
|---|---|---|---|
| `--bg` | #f3f0e8 | #181a17 | 画布、启动台、当前文档页签底、启动遮罩底（新接管） |
| `--toolbar` | #f7f4ec | #1e211d | 左/右栏底、手机顶栏 |
| `--panel` | #fefdf9 | #262924 | 卡片、按钮、输入框底 |
| `--paper` | #fbfaf5 | （不写，恒浅） | 谱纸；打印强制 #fff |
| `--ink` | #141414 | （不写） | 谱面墨色；打印强制 #000 |
| `--glass` | rgba(251,250,245,.82) | rgba(24,26,23,.78) | 毛玻璃顶栏、谱架条 |
| `--hover` | rgba(80,65,40,.06) | rgba(255,255,255,.06) | 中性悬停（浅色是暖棕叠层，换中性时改这里） |
| `--text` | #20211d | #edefe8 | 正文 |
| `--muted` | #6b6357 | #a89f90 | 次级文字 |
| `--faint` | #746c5e | #9a9284 | 三级文字（tv_b7a 要求在 bg/panel/toolbar 上 ≥4.5） |
| `--border` | #e4ddcd | #3b3e37 | 描边 |
| `--border-soft` | #ece6d8 | #33362f | 发丝分隔 |
| `--fill` | var(--toolbar) | var(--toolbar) | 中性填充：卡头 `.rc-h`、和弦预览 `.vc-prev`、填词预览 `.sf-prev`、协议提示 `.legal .note`、排版分段 `.lp-seg` |
| `--fill-2` | var(--bg) | var(--bg) | 面板内凹陷图标底 `.aitem .aic` |
| `--accent` | #c33a29 | #df5a45 | 强调（选中、激活、主行动；31 条规则以它为实底压白字） |
| `--accent-2` | #d24a37 | #e86a55 | 强调悬停、谱架卷谱钮悬停 |
| `--accent-soft` | rgba(195,58,41,.10) | rgba(223,90,69,.16) | 强调淡底 |
| `--accent-ink` | #b02f20 | #ef8471 | 强调色文字/链接 |
| `--btn-pri` | #c33a29 | #c33a29 | 主按钮实底（tv_b7a：不得用渐变，白字 ≥4.5） |
| `--btn-pri-h` | #b02f20 | #b02f20 | 主按钮悬停 |
| `--focus` | #c33a29 | #ef8471 | 焦点环（tv_b7a：必须不透明实色） |
| `--grad-2` / `--grad-3` | #d24a37 / #e2705d | #e86a55 / #f08874 | 品牌渐变中/尾段（Logo 方块、新建卡顶条） |
| `--grad` | linear-gradient(96deg, accent, grad-2 55%, grad-3 110%) | 同式 | 品牌渐变 |
| `--danger` | #b45309 | #ffa424 | 告警（琥珀，与强调错开色相） |
| `--ok` | #157a43 | #30d158 | 成功（绿） |
| `--ed-fav-star` | #c33a29 | #df5a45 | 观看页收藏星（**语义色，换品牌时保持红星**；原读 --accent） |
| `--ed-on-accent` | #fff | #fff | 压在 --accent / --btn-pri 实底上的字色（新增，接管 40 处 `color:#fff`（含 L962 的 75% 白）+ 2 处 SVG `fill="#fff"`） |
| `--chrome` | #1f3a34 | #1f3a34 | 深色框架底：主栏、文档页签条、播放坞（tv_frame T1 要求 RGB 均值 <80） |
| `--chrome-2` | rgba(255,255,255,.11) | 同 | 框架上按钮悬停/抬升 |
| `--chrome-line` | rgba(255,255,255,.11) | 同 | 框架上按钮/分段描边 |
| `--chrome-text` | #efe9d8 | 同 | 框架上主文字（观看页浮层、轨名、音色胶囊） |
| `--chrome-muted` | #c6bead | 同 | 框架上次级文字（Logo 副标、非当前页签、新窗口钮） |
| `--ed-chrome-ov` | 255,255,255 | 同 | 框架半透明叠层基色（RGB 三元组：`rgba(var(--ed-chrome-ov),.07)`），共 14 档透明度复用 |
| `--ed-chrome-edge` | rgba(0,0,0,.22) | 同 | 框架与内容交界描边 |
| `--play-band` | var(--sc-pen) | 同 | 谱面播放高亮带 `#playhead`（JS 以 opacity .12 画，**填不透明基色**；官网同名令牌是含透明度的成品色，统一时二选一） |
| `--glow` | transparent | 同 | 框架发丝线（主栏/页签条底边、播放坞顶边 inset 1px） |
| `--bar-bg` | var(--toolbar) | 同 | 手机底部时值条（原 L2050–2053 按主题写死 #f7f4ec/#1e211d） |

### 2.2 §1b 主题无关常量（＝浅色主题值，深色下也用这一组）

| 令牌 | 现值 | 用途 |
|---|---|---|
| `--ed-brand` / `-2` / `-3` | #c33a29 / #d24a37 / #e2705d | 打印笔色、预览纸笔色、启动遮罩三音符、音色加载均衡条、遮罩 Logo |
| `--ed-brand-ink` / `--ed-brand-soft` | #b02f20 / rgba(195,58,41,.10) | 打印 `--sc-pen-ink` / `--sc-pen-soft` |
| `--ed-print-muted` / `-faint` / `-border` | #6b6357 / #746c5e / #e4ddcd | 打印刻版灰（tv_v66a T7 断言 #6b6357） |
| `--ed-print-danger` | #b45309 | 打印/反色纸打印/预览纸 danger |

### 2.3 §2 派生令牌（§3 钉值＝现色；删钉后按公式跟随）

| 令牌 | 钉值（现色） | 删钉后公式 | 用途 |
|---|---|---|---|
| `--sc-pen*` / `--sc-muted` / `--sc-faint` / `--sc-border` / `--sc-danger` | （＝界面令牌） | var(--accent…)、var(--muted…) | 谱面隔离层；想让谱面笔与界面分家时改这里 |
| `--ed-chrome-title` | #f3efe4 | var(--chrome-text) | Logo 字、页签悬停字、手机观看页轨名 |
| `--ed-chrome-btn` | #e6dfd0 | var(--chrome-text) | 主栏按钮字 |
| `--ed-dock-btn` | #e0d9c9 | var(--chrome-text) | 播放坞按钮字、小节格编号、禁用态（40%） |
| `--ed-chrome-hi` | #fbf8f0 | var(--chrome-text) | 主栏调号读数 #k-val |
| `--ed-chrome-chip` | #e6e0d2 | var(--chrome-text) | 观看页变调夹位芯片 |
| `--ed-chrome-input` | #f0f0f2 | var(--chrome-text) | 播放坞速度/倍速/音色下拉 |
| `--ed-chrome-input-2` | #f0ece0 | var(--chrome-text) | 手机观看页音色下拉 |
| `--ed-chrome-muted-2` | #cfc8b8 | var(--chrome-muted) | 播放坞标签、轨道组标、音量读数 |
| `--ed-chrome-muted-3` | #d8d2c2 | var(--chrome-muted) | 轨道小节格编号 |
| `--ed-chrome-accent` | #ffcdbf | color-mix(accent 30%, #fff) | 框架上的强调字（预设/谱库、当前小节、循环格；循环格底取其 28%） |
| `--ed-chrome-pop` | rgba(17,40,34,.96) | chrome 压暗 28% 后 96% 不透明 | 观看页深色浮层（变调/节拍器/拍速）底 |
| `--ed-chrome-pill` | #20241f | var(--chrome) | 音色加载胶囊底 |
| `--ed-halo` | （公式即现色） | color-mix(accent 7%, transparent) | body / 个人中心顶部径向光晕 |
| `--ed-accent-tint` | rgba(195,58,41,.07)（深色下也是浅色朱砂） | color-mix(accent 7%, transparent) | 记谱法点亮钮、收纳弹窗当前项底 |
| `--ed-icon` | #7d7563 | var(--muted) | 观看页头部幽灵图标 |
| `--ed-pop-shadow` | rgba(40,32,18,.16)（暖棕投影） | rgba(0,0,0,.16) | 指板/键盘面板、编辑器变调浮层投影 |
| `--ed-veil-line` | rgba(107,99,87,.32) | color-mix(muted 32%, transparent) | 启动遮罩五线 |
| `--ed-play-line` | （＝play-band） | var(--play-band) | 播放竖线 #playline |
| `--ed-brand-grad` | （公式即现色） | 由 --ed-brand 三色组成 | 启动遮罩 Logo |
| `--ed-invert-pen` / `-ink` | #e2705d / #f08874 | var(--ed-brand-3) / 混白 28% | 反色谱纸上的编辑笔 |
| `--ed-pv-pen` / `-ink` / `--ed-pv-danger` | **#0071e3 / #0060c0 / #e8362b**（Apple 蓝遗留） | var(--ed-brand) / var(--ed-brand-ink) / var(--ed-print-danger) | 打印预览纸面（`#pv-pages`）——现值与打印分支不一致，属旧改版残留，删钉即修正 |

## 3. 热点清单（写死色 → 改读令牌）

行号＝`muse-tab/index.html` 现行 v66.4。“现值”为写死字面量。

### 3.1 深色框架
| 位置 | 选择器 | 现值 | 改读 |
|---|---|---|---|
| L1071–1072 | `#doc-tabs` 背景 / 下边框 | #1f3a34 / rgba(0,0,0,.22) | --chrome / --ed-chrome-edge（+ --glow 发丝线） |
| L1079–1080 | `.dtab` 底 / 字 | rgba(255,255,255,.07) / #c6bead | rgba(var(--ed-chrome-ov),.07) / --chrome-muted |
| L1081 | `.dtab:hover`（骨架写成 `.dtab:not(.on):hover`，见 3.6） | rgba(255,255,255,.14) / #f3efe4 | ov .14 / --ed-chrome-title |
| L1090–1092 | `#dt-add` 虚线框 / 字 / 悬停框 | rgba(255,255,255,.28) / #c6bead / .55 | ov .28 / --chrome-muted / ov .55 |
| L1237 | `body.shell #top .main-bar` 底 / 下边框 | #1f3a34 / rgba(0,0,0,.22) | --chrome / --ed-chrome-edge（+ --glow） |
| L1238–1239 | `.main-bar .logo` / `small` | #f3efe4 / #c6bead | --ed-chrome-title / --chrome-muted |
| L1240–1242 | `.main-bar button` 字/框、悬停底、`.seg` 底/框 | #e6dfd0、rgba(255,255,255,.11)、.06 | --ed-chrome-btn、--chrome-line、--chrome-2、ov .06 |
| L1243–1244 | `.main-bar .seg-accent` / `#k-val` | #ffcdbf / #fbf8f0 | --ed-chrome-accent / --ed-chrome-hi |
| L1250 | `body.shell #mixer-dock` 底 / 上边框 | #1f3a34 / rgba(0,0,0,.22) | --chrome / --ed-chrome-edge（+ --glow） |
| L1254–1256 | 播放坞按钮字/框、悬停、禁用 | #e0d9c9、.11、rgba(224,217,201,.4) | --ed-dock-btn、--chrome-line/--chrome-2、color-mix(dock-btn 40%) |
| L1260–1266 | `.mx-splabel`、`#mx-prog`、`.mxc`、`.mxc span`、`.mxc.cur span`、`.mxc .f`、`#i-tempo/#mx-rate` | #cfc8b8、.09/.12、.13、#e0d9c9、#ffcdbf、.22、.08/.12/#f0f0f2 | --ed-chrome-muted-2、ov、--ed-dock-btn、--ed-chrome-accent、--ed-chrome-input |
| L1356–1367 | 音轨排：`.mx-grp` `.mx-nm` `:hover` `select` `--mxtrk` `.vv` `.mx-cells` `.mxtc` `span` `.loop` | #cfc8b8 #efe9d8 .05 .08/.14/#f0f0f2 .22 #cfc8b8 .07/.12 .13 #d8d2c2 rgba(255,205,191,.28) #ffcdbf | 对应 --ed-chrome-* / ov / color-mix(chrome-accent 28%) |
| L2114（≤820） | 手机播放坞顶发丝线 | rgba(255,255,255,.09) | ov .09 |
| L1721–1728（≤640） | 手机观看页音轨面板 | .10/.07/.10、#cfc8b8、#f3efe4、.08/.14/#f0ece0 | ov、--ed-chrome-muted-2、--ed-chrome-title、--ed-chrome-input-2 |
| L1568–1571 | `.vh-pop` 观看页深色浮层底 / 框 | rgba(17,40,34,.96) / .14 | --ed-chrome-pop / ov .14 |
| L1576–1585 | `#key-pop` 各行字、小字、分隔、重置钮（**只改 #key-pop 半边**） | #efe9d8、rgba(239,233,216,.6/.66)、.12、.28 | --chrome-text、color-mix(chrome-text 60%/66%)、ov |
| L1588 | `.kp-chip` 框 / 字 | .16 / #e6e0d2 | ov .16 / --ed-chrome-chip |
| L1620–1636 | `#metro-pop` 小字、表头、`.mp-pill`、`.mp-sl` 轨道渐变、读数 | .66、#efe9d8、.28、rgba(255,255,255,.22) | 同上 + ov .22 |
| L1639–1642 | `.vh-pop .tp-nudge`、`:active`、`.vh-pop>b`、`small` | .2/.08/#efe9d8、.2、#efe9d8、.6 | ov、--chrome-text、color-mix 60% |
| L1683 / L1688 | `#tempo-sl-wrap input --mxtrk` / `b` | rgba(255,255,255,.22) / #efe9d8 | ov .22 / --chrome-text |
| L1963–1965 | `#audio-loading` 底 / 字 / 框 | #20241f / #efe9d8 / .07 | --ed-chrome-pill / --chrome-text / ov |

### 3.2 强调族字面量
| 位置 | 选择器 | 现值 | 改读 |
|---|---|---|---|
| L96–99、L1096–1098 | `body`、`#pcenter` 径向光晕 | color-mix(accent 7%) | --ed-halo（骨架里 body 包在 `@media screen` 内，避免盖掉打印 `body{background:#fff}`） |
| L1807 / L1819 | `.nlit.on`、`.popmenu .pickpop button.on` 底 | rgba(195,58,41,.07)（深色主题也不变） | --ed-accent-tint |
| L1968–1971 | `#audio-loading .eq i` 四根 | #e2705d #d24a37 #c33a29 #d24a37 | --ed-brand-3 / -2 / --ed-brand / -2 |
| L1945–1951 | `#boot-veil .bv-staff b` 及 `::after` | #c33a29 #d24a37 #e2705d | --ed-brand / -2 / -3 |
| L1943 | `#boot-veil .bv-staff i` 五线 | rgba(107,99,87,.32) | --ed-veil-line |
| L735–737 | `#paper.score-invert` 的 --accent / --accent-ink | #e2705d / #f08874 | --ed-invert-pen / -ink（骨架同时让播放带跟随反色笔） |
| L1759–1760 | `#pv-pages` 的 --accent / --accent-ink / --danger | #0071e3 / #0060c0 / #e8362b | --ed-pv-pen / -ink / --ed-pv-danger |
| L2038–2039（print） | `:root` 打印钉值 --sc-muted/faint/border/pen/pen-2/pen-soft/pen-ink/danger | #6b6357 #746c5e #e4ddcd #c33a29 #d24a37 rgba(195,58,41,.10) #b02f20 #b45309 | --ed-print-* / --ed-brand* |
| L2041（print） | `#paper.score-invert` 打印 --accent / --accent-ink / --danger | #c33a29 / #b02f20 / #b45309 | --ed-brand / --ed-brand-ink / --ed-print-danger |
| L9924 / L9926（JS 模板） | `#playhead fill="var(--accent)"`、`#playline stroke="var(--accent)"` | 跟强调色 | CSS `#playhead{fill:var(--play-band)}`、`#playline{stroke:var(--ed-play-line)}`（CSS 优先于 SVG 属性；opacity 仍由 JS 控制） |
| L1668–1669 | `#viewerbar .vh-icons #vw-fav.on` 字 / svg 填描 | var(--accent) | --ed-fav-star（语义收藏星，不随品牌） |
| 40 处（L108 165 172 174 294 359 444 587 603 667 789 805 810 931 935 961 962 971 993 1165 1177 1203 1228 1245 1257 1259 1385 1391 1403 1592 1593 1612 1613 1626 1679 1745 1752 1787 1797 1911） | 压在 --accent/--btn-pri 实底上的 `color:#fff`（L962 为 rgba(255,255,255,.75)） | #fff | --ed-on-accent（L962 取 75%） |
| L13718、L18459/18508（JS SVG） | 和弦图式指位数字、指板/键盘点亮音名 `fill="#fff"` | #fff | 属性选择器 `svg.cdg text[fill="#fff"]`、`#bp-body text[fill="#fff"]` → --ed-on-accent |

### 3.3 浅色表面上的暖色字面量
| 位置 | 选择器 | 现值 | 改读 |
|---|---|---|---|
| L1658 | `#viewerbar .vh-icons>*` | #7d7563 | --ed-icon |
| L1192 / L1598 | `#board-pane`、`#ekey-pop` 投影色 | rgba(40,32,18,.16) | --ed-pop-shadow（几何 0 10px 28px 不变） |
| L2050–2053 | `--bar-bg` 三态写死 | #f7f4ec / #1e211d | var(--toolbar) |
| L677 L634 L953 L1417 L762 L1784 | 原读 --toolbar / --bg 的填充 | — | --fill / --fill-2（值不变，只是解耦） |

### 3.4 内联与启动 JS（CSS 只能用 !important 兜底，落地建议改源码）
| 位置 | 内容 | 现值 | 骨架处理 |
|---|---|---|---|
| L2156 | `#boot-veil` 内联 background | #f3f0e8 | `background-color:var(--bg)!important` |
| L2157 | 遮罩 Logo 内联渐变 | #c33a29→#d24a37→#e2705d | `background-image:var(--ed-brand-grad)!important` |
| L2163 | `#bv-txt` 内联字色 | #20211d | `color:var(--text)!important` |
| L2168 | JS 按系统深色改内联 | '#181a17' / '#edefe8' | 同上两条 !important 盖过（var(--bg)/var(--text) 还顺带修正“系统深色 + 显式浅色”时遮罩仍为深色的小错位） |

### 3.5 编辑器没有的东西
编辑器里没有 `<meta name="theme-color">`，也没有 `<link rel="icon">` 或 favicon 生成代码。Logo 方块是纯 CSS（`.logo .mark` 读 `--grad`）。L71–75 的 `--grad-2/3` 在骨架四态里都写全了。

### 3.6 追加层的层叠陷阱（落地就地改值时不存在，追加验证时必须注意）
- 同一组选择器里有被后文同权重规则改回的半边，只能写另一半。例如 `#key-pop …,#ekey-pop …{color:#efe9d8}` 后面有 `#ekey-pop …{color:var(--text)}`（L1599–1607 编辑器浅色版），骨架只写 `#key-pop` / `#kp-*` 那半边。
- `.dtab:hover` 原本被后写的 `.dtab.on` 压住，追加层若照写会让当前页签悬停变暗底，所以骨架写成 `.dtab:not(.on):hover`。
- 手机断点（≤820、≤640）里同权重的观看页规则排在原文件后面，骨架按同断点、同顺序重申，否则 `body.shell .mx-row .mx-nm` 会盖掉 `body.viewer .mx-row .mx-nm`。

## 4. 够不着清单（CSS 改不到，落地需改 JS / 内联 / 图片）

| 位置 | 内容 | 原因 | 建议 |
|---|---|---|---|
| L22303–22310 `svgResolveVars()` | 导出 PNG、分享卡、谱库缩图的“印刷色表”：--accent→#c33a29、--accent-2→#d24a37、--accent-ink→#b02f20、--accent-soft→rgba(195,58,41,.10)、--text #20211d、--muted #6b6357、**--faint #a49c8d（v64 前旧值，与现 #746c5e 不一致）**、--border #e4ddcd、--border-soft #ece6d8、--danger #b45309、--ok #157a43 | SVG 序列化后离开页面，var() 失效，是 JS 字符串替换 | 改成运行时 `getComputedStyle(documentElement)` 读 `--ed-brand*` / `--ed-print-*`（取不到再回落常量） |
| L22251 分享卡 `cgrad` | stop：var(--accent)（经上表→#c33a29）、#d24a37、#e2705d | SVG→canvas | 改读 --ed-brand-2 / -3（同上取值法） |
| L22253 / L22261 / L22277 | 分享卡底与页脚底 #faf9f6；canvas `fillStyle='#faf9f6'` | canvas 栅格 | 改读 --paper 或新常量 |
| L22242 / L22258 / L22259 / L22262 | 分享卡分隔线、谱框、二维码框 #e5e2dc（暖） | 同上 | 改读 --ed-print-border |
| L22245 / L22255–22265 | 分享卡文字 #1c1c1c / #8a8a8a / #6a6a6a | 同上（中性灰，可不改） | 保留；**tv_print T6 正则依赖 `fill="#8a8a8a"`** |
| L875 `.cc-search::before` | data-URI SVG 放大镜 `stroke='%236b6357'` | data URI 里不能用 var() | 改 data URI 色值，或改成 `mask-image` + `background-color:var(--muted)`（需改属性结构） |
| `muse-tab/site/share-icon.png`（L28 og:image、微信分享缩略图 ≈L23695） | 512² 位图，主色朱砂 #d04835 | 位图 | 按新品牌重出 |
| `muse-tab/site/og.png` | 1200×630 旧蓝横幅（L23695 注释已标弃用） | 位图 | 一并重出或删除引用 |
| L23070 | `var(--accent-soft,rgba(58,92,224,.1))` 回退值是旧蓝 | 回退永不生效（--accent-soft 已定义） | 顺手清理 |
| L22451 | `var(--panel-2,rgba(0,0,0,.04))`，--panel-2 全项目未定义 | 实际恒走中性回退 | 可改读 --fill |

## 5. 语义色保留清单（不随品牌换）

| 颜色 | 位置 | 语义 |
|---|---|---|
| #07c160 | L24353 已绑定微信字、L24391 微信登录钮 | 微信品牌绿 |
| #e0395a | L879 `.cc-chip.fav.on`、L885 `.cc-fav.on`、L901–902 `#vw-fav` 悬停/点亮 | 收藏心 |
| --ed-fav-star（#c33a29 / #df5a45） | L1668–1669 观看页收藏星 | 产品拍板的红星（tv_vwmob T2 断言 rgb(195,58,41)） |
| --danger 琥珀 #b45309 / #ffa424；反色纸 #ffb340 | 全站告警、静音 M、页签关闭悬停 | 告警，须与强调色相分开 |
| --ok 绿 #157a43 / #30d158 | 时值正确点、修复建议框、免费价签 | 成功 |
| #f5b301 / #ffc21f / #3a2c00 | L1312 L1320 L1322 独奏 S | 独奏琥珀（tv_balance A1 断言 245,179,1） |
| #e2574a | L1323 静音 M 悬停 | 静音（危险）悬停；可改成 --danger 提亮，但不跟品牌 |
| #e8a13a / #2eaf64 | L1085–1086 页签未保存 / 已保存圆点 | 保存状态 |
| #9a6a00 | L1415 填词统计 warn | 警示 |
| #ffd76a | L1591 深色浮层 CAGED 推荐指法 | 推荐金（浅色版已改读 --danger） |
| #fff / #000 | 打印分支、`.sc-thumb` 缩图底、`.pv-paper`、二维码、钢琴白键（L18506）、导出画布 | 纸面与印刷 |
| 中性黑白叠层 rgba(0,0,0,.x)、rgba(255,255,255,.x) | 弹窗遮罩 .34、投影、`#patedit-bar` 等 | 中性，与品牌无关 |
| #1d1d1f | L1267 / L1360 原生下拉选项字 | 系统下拉列表（浅底），中性 |

## 6. 落地时要同步改的测试断言（muse-tab/tests）

| 文件:行 | 用例 | 依赖 | 换色影响 |
|---|---|---|---|
| tv_vwmob.js:38–48 | T2 红星点亮+回弹（朱砂 #c33a29） | `#vw-fav svg` fill === 'rgb(195, 58, 41)' | 保留红星（--ed-fav-star）则不变；若改星色须同步 |
| tv_frame.js:275–304 | T16 通栏框架+图标轨（`redOn`） | `.ltab.on` 背景 R>150 且 R 比 G、B 都大 60 以上（“朱砂选中”） | **非红强调必红**：改成“等于 --accent 计算值”之类的断言 |
| tv_frame.js:13–26 | T1 新版外壳默认态 | `.main-bar`、`#mixer-dock` 背景 RGB 均值 <80 | 新 --chrome 必须保持深色 |
| tv_v66a.js:66–70 | T7 深色主题打印：刻版灰字回浅色值 | 打印 #paper `--muted` === '#6b6357' | 改 --ed-print-muted 时同步期望值 |
| tv_v66a.js:60–64 | T6 谱面令牌隔离层 | #paper 与 #top 的 --accent/--muted/--border 相等，且深浅不同；改 --sc-pen 只动谱面 | 骨架结构满足；新色板深浅强调色须不同 |
| tv_b7a.js:28–40 | T1 浅/深主题 --faint、当前页签、主按钮均达 AA | --faint 在 bg/panel/toolbar 上 ≥4.5、`.dtab.on` ≥4.5、`button.primary` 背景图 none 且字/底 ≥4.5 | 主按钮不得用渐变；对比度达标 |
| tv_b7a.js:43–52 | T2 键盘焦点环 | outline 实色（不能是 rgba 半透明）、≥2px | --focus 必须是不透明色 |
| tv_mviews.js:97–126 | T5 谱架栏卷谱钮朱砂白字 | `#sb-go` color === 'rgb(255, 255, 255)' | 若 --ed-on-accent 改非白须同步 |
| tv_balance.js:126–130 | A1 独奏 S 点亮是琥珀色 | /245,179,1/ | 语义色保留则不变 |
| tv_edkey.js:170–188 | T8 变调弹窗浅色化 | `#ekey-pop` 底 === --panel 且亮度 >0.8；`#key-pop` 亮度 <0.3 | --panel 须浅；--ed-chrome-pop 须深 |
| tv_print.js:106–120 | T6 / T6c / T6d 分享卡 | 正则 `fill="#8a8a8a"` 定位二维码说明；`/人人都能做谱|#6d5cff/` 不得出现 | 改分享卡灰字色值须同步正则；新色勿用 #6d5cff |
| tv_card.js:32–35 | 卡片光栅化 | 测试自带替换表（--accent→#3a5ce0 等旧值） | 测试内部表，不读页面；可顺手更新 |
| tv_a0.js:27、tv_playline.js、tv_mix.js:92 | 播放头 / 编辑痕迹计数 | 只数 `opacity="0.12"` 与几何 | 不受影响（骨架不动 opacity） |

grep 结果：`muse-tab/tests` 里能直接搜到的旧品牌色字面量只有 tv_vwmob.js:48 的 `rgb(195, 58, 41)`；没有 #1f3a34、rgb(31, 58, 52)、#f3f0e8 等。其余影响都是上表这类“按色相或亮度判断”的断言。

## 7. 给设计师的现状提醒（现色板已有的问题，换色时一并解）

| 项 | 现值对比度 | 说明 |
|---|---|---|
| 深色主题白字压 --accent（左轨选中、个人中心、播放钮、步骤圆点等 31 处） | #fff / #df5a45 = **3.69（不达标）** | 深色强调要么压暗到白字 ≥4.5，要么提亮后把 --ed-on-accent 改成深色字（probe 已验证可行） |
| 深色主题 --accent 当文字（`.nlit.on`、`.modal .vlog .v`、`.cc-type`、`.pcx-side .on` 等） | #df5a45 / #262924 = 3.99 | 文字场景应读 --accent-ink；或让深色 --accent 本身 ≥4.5 |
| 深色主题谱纸上的刻版灰字（“作曲：”“儿歌”等，经 --sc-muted 读深色 --muted） | #a89f90 / #fbfaf5 = **2.50**；--sc-faint 2.95 | 谱纸恒浅，建议把 --sc-muted/--sc-faint/--sc-border 钉成纸面值（＝--ed-print-*），不随主题 |
| 浅色各项（正文 14.2、muted 5.2、faint 4.55、白字/btn-pri 5.31、accent-ink 5.63、焦点环 4.66、danger 4.93、ok 5.29） | 全部达标 | faint 只有 4.55，余量很小 |
| 框架文字（chrome-text 10.1、主栏钮 9.2、坞钮 8.7、chrome-muted 6.6、页签字 5.35、强调字 8.6） | 全部达标 | 新 --chrome 换色后要用 `editor-pairs.json` 复测 |

对比度清单：`tc/skel/editor-pairs.json`（现值，45 条，`node tc/contrast.js --pairs tc/skel/editor-pairs.json` 复测；换色后改 fg/bg 即可）。

## 8. 文件索引
- 骨架：`tc/skel/editor-skel.css`
- 测试色板版：`tc/skel/editor-probe.css`（由 `edtools/mkprobe.py` 从骨架生成：替换令牌块并删掉钉值）
- 零变化截图：`tc/skel/editor-zero/`；测试色板截图：`tc/skel/editor-probe/`，拼图 `tc/skel/editor-probe-grid.png`
- 自写验证工具（只读页面）：`edtools/cdump.js`（65 态计算样式转储）、`edtools/cdiff.py`（逐元素比对）、`edtools/pscan.py`（旧色扫描，含隐藏元素）、`edtools/hover.js`（悬停态比对）、`edtools/pxdiff.py`（PIL 像素差）、`edtools/xshot.js`（隐藏态补拍）
