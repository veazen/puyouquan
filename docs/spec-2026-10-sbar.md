<!-- 入库说明（v68.3 收尾 ENG-7）：本规格原只在会话临时目录（f83spec/SPEC.md），tv_sbar.js 的 SB1–SB21 断言表出处查不到。原样入库，下面先列 v68.3 收尾对它的改动；正文行号指基线 b938819。 -->

## v68.3 收尾对本规格的改动（验收 SBAR / ENG 两镜头，tv_sbar SB22 对应断言）

| 条目 | 改成什么 | 规格原文位置 |
|---|---|---|
| SBAR-1 | 鼠标点「更多」后同其他按钮一样交还谱面焦点（空格照常播放） | §3.2 |
| SBAR-2 / SBAR-5 | 「键盘 / 指板」「指法」带 `aria-pressed`，开关后当场重画（renderBoard / 指法直录开关都触发 `FLOW.sbar.sync`） | §2.5 工具目录 |
| SBAR-3 / SBAR-11 | 收纳多一档「宽松」：全档先试谱名不限宽、做完 / 没轮到的步骤带步名；放不下才加 `.sb-x`（谱名限 200px、只留编号，仍算全档），再按 n1…n5 收；n2 起强调项的箭头与步号让位 | §1.4 |
| SBAR-4 / SBAR-6 | 强调工具的 title 以条上名字开头「织体（下一步）：…」；步骤播报「可点「X」」在工具阶段说条上按钮名；钢琴独奏谱 G 第 4 个工具「节奏型」改「织体」（判据加 `accTexRows`，同 openRhyLib） | §2.3、§2.5 |
| SBAR-7 | 提示与步骤 `data-fa="sbar:say"`：点一下提示条给全文（触屏平板没有悬停 title） | §2.3 |
| SBAR-9 | Alt+B 先收起 flow 菜单（文件 ▾ 等）再切换 | §3.2 |
| SBAR-10 | 主按钮 / 强调工具＝浅主色底 + 描边 + 末尾「→」（「已选」的记谱法只描边、开关按下只浅底）；最后一步的强调工具前画步号（`data-n`，CSS ::before） | §1.2 样式 |
| ENG-1 | 记谱法组判据 `melWhy`：去掉「1–4 条旋律轨」上限；音轨区 ⋯ `tree:mel`（加第三项「五线谱＋简谱对照」）与命令面板 `trk:allj / alls / alld` 一律走 `FLOW.sbar.melWhy / mel` | §2.2 |
| ENG-5 | 工具阶段里当前步是最后一步且没有按钮（吉他弹唱 ③、导入谱伴奏来自文件的 ③）时，SB_HINT 短句照出（全文进 title），优先于空谱提示 | §2.3、§2.4 |
| SBAR-8 | 不改：1280 / 1366 钉住右栏时按收纳档先收空谱提示、再收记谱法字（最多 n2），SB22o 钉住 | §1.4 |
| SBAR-12 / SBAR-13 | 不改（产品取舍）：1280 浮出的右栏盖住条右段（SB12 原口径，键盘仍可切换）；工具表不放「生成六线谱」「移调」（见 §2.5 说明） | §2.5、§2.6 |

---

# v68.3 悬浮条 `#flw-sbar` 实现规格（新外壳 flow · 书写模式）

基线：`tmp/f83-base` b938819（＝线上 v68.2）。下文行号都指这一版的 `muse-tab/index.html`。
依据：负责人 2026-10-18 原话（保留吸顶悬浮条、默认展开、可收起、放常用功能；界面要少字）；主会话已定口径 ①–⑥。
实测：原型注入真实编辑器量出来的几何与宽度（原型脚本与截图在当时的会话临时目录，未入库）。

---

## 0. 一页结论

- **一个条、一行、固定高度**：谱纸正上方的吸顶条，展开时条高 40、连衬底 46，收起时条高 28、连衬底 34，绝不换行。吸住时上缘贴着行 2 底边（y＝84）。宽度等于谱纸可见宽度，最窄 560。
- **内容只有四样，从左到右排**：谱类 ▾ ｜ 记谱法「简谱 · 五线 · 对照」（只有旋律类谱有）｜ 起步步骤 + 主按钮 + 一句短提示，**或者** 3–4 个常用工具（图标 + 2–3 字）｜（右端）「更多」、收起 ⌃。
- **起步什么时候结束**：「当前步已经是最后一步」或「全部完成」就换成常用工具，最后一步的主按钮变成工具里的强调项。不能照字面等 `lbCur` 走完：钢琴伴奏歌谱的 ③（选织体）、吉他弹唱的 ③（调把位与扫弦）、钢琴弹唱谱的 ②（选织体）在 `lbSteps` 里永远不打勾（L32672 打勾只看本窗口内存里的 `texDone`，L32688、L32694 直接写死 `ok:false`）。照字面等，打开的已有谱会永远停在起步。
- **去重**：删掉行 2 的「起步」组 `#flw-start` 和 ⓘ（连同起步说明浮层），删掉右栏「智能」页的「下一步」卡 `#flw-next`，删掉「属性」页「整谱」区的「起步 · 换谱类…」按钮，新建落地时右栏不再自动切到「智能」页。左栏谱类芯片 `#flw-kchip` 保留，和条上的谱类 ▾ 共用 `lbMenuOpen`、同一张菜单。行 2 不再为起步组收键。
- **代价**：吸住时谱面可见高少 46（展开）或 34（收起）。1280×800 是 684 → 638 / 650，1440×900 是 784 → 738 / 750（v68.2 README 的 684 / 784 是去掉旧谱型条换来的）。旧外壳谱型条连衬底是 74，新条少 28。
- **新本机键只有 `musetab-sbar`**：收起时写 `'0'`，展开时删键（默认＝展开，键集合不变）。存储不可用时只记在内存里。不新增 song 字段。
- **旧外壳零差异**：`?shell=classic` 下不建节点；CSS 全挂在 `body.flow` 下；`lbSync` 的旧外壳分支、`LBAR.show`、`lbHide`、`tv_landbar` L1–L27 都不动。

---

## 1. DOM、挂载与几何

### 1.1 节点（运行时由 `FLOW.sbar.mount()` 建，`FLOW.mount` 的 `F.each('mount')` 调用）

```
#score-wrap
  #start-pad
  div#flw-sbar.flw-x[data-sb="exp"|"col"][data-ph="steps"|"tools"]      ← 吸顶外框（含下方 6px 衬底），插在 #paper 之前
    div#flw-sb-bar.flw-sb-bar[role=toolbar][aria-label="悬浮条：常用工具"]
      ── 展开态 ──
      button#flw-sb-kind.flw-sb-kind[data-fa="sbar:kind"][aria-haspopup=menu][aria-expanded]   谱类图标20 + span.flw-sb-kn 谱名 + ▾12
      span.flw-sb-sep[aria-hidden]
      span.flw-sb-seg[role=group][aria-label="旋律记谱法"]                 （只在 §2.2 判据为真时出）
        button[data-fa="sbar:mel"][data-v="J"|"S"|"D"][aria-pressed]      图标16 + span 字
      span.flw-sb-sep[aria-hidden]
      ── 起步阶段 data-ph="steps" ──
      ol.flw-sb-steps[aria-label="起步"] > li.done|now|todo[aria-current="step"(now)][title]  span.flw-sb-n（数字 / ✓）+ span.flw-sb-t 步名
      button.flw-sb-go[data-fa="sbar:go"][data-act="arrange"|"tex"|"tabgen"]   图标16 + span 字（当前步有主按钮时才出）
      span#flw-sb-hint.flw-sb-hint[title=全文]                             （当前步没有主按钮时才出，≤20 字）
      ── 常用工具阶段 data-ph="tools" ──
      button.flw-sb-tool[.pri][data-fa="sbar:tool"][data-v=<工具 id>][data-act=<同 lbGo 的 act，仅 pri>]   图标18 + span 字
      span.flw-sb-hint                                                    （仅空谱时出：§2.4 SB_TIP）
      ── 右端 ──
      span.flw-sb-grow
      button.flw-sb-more[data-fa="sbar:more"]                             ui-smart 18 + span「更多」
      button#flw-sb-tg.flw-sb-tg[data-fa="sbar:tg"][aria-expanded="true"]   ⌃（act-chevron 旋转 180°）
      ── 收起态（data-sb="col"，条里只剩这一枚）──
      button#flw-sb-tg.flw-sb-tg.flw-sb-tgw[data-fa="sbar:tg"][aria-expanded="false"]   谱类图标16 + span.flw-sb-sum 摘要 + span.flw-sb-grow + ⌄14
```

- 动作前缀用 `sbar:`（骨架 `F.act` L23745 按 `a.split(':')[0]` 转给 `FLOW[前缀].act`，所以块名必须是 `FLOW.sbar`）。
- 挂载：`FLOW.sbar.mount()` 用 `sw.insertBefore(el, paper)` 插在 `#paper` 之前（与旧谱型条同一处，L32775），并且 `F.bind(el)`，挂 `keydown`（§3.3）。挂一个 `ResizeObserver` 观察 `#paper` 和 `#score`，回调里 `F.raf('sbfit', fit)`（与 `lbSync.ro` 同口径，L32776）。
- `F.PARTS` 里用 `'sbar'` 顶替 `'start'`，位置不变：`['r1','r2','st','rd','tree','pal','sbar','mode',…]`（L23482）。
- `F.CONT` 加 `'flw-sbar'`（L23526）：外壳离开 flow（≤820、谱架、观看页、旧版）时 `hidden=true`。`STARTPAD_INERT` 也加 `'flw-sbar'`（L16439）。
- `F.KEYS` 加 `sbar:'musetab-sbar'`（L23467）。
- 新名字都先 grep 过：`FLOW.sbar`、`flw-sbar`、`flw-sb-*`、`musetab-sbar`、`SB_TOOLS`、`SB_KIND`、`SB_HINT`、`SB_TIP` 在基线里都不存在。
- 页面快照：`FLOW.snapHTML` 会删掉 `[id^="flw-"]`、`.flw-x`（L23651），条自动摘掉，不用另写。

### 1.2 几何（原型实测，1280×800 新建钢琴伴奏歌谱）

| 项 | 展开 | 收起 | 现状 v68.2（无条） |
|---|---|---|---|
| 条 `.flw-sb-bar` 高 | **40** | **28** | — |
| 外框 `#flw-sbar` 高（含 6px 衬底） | **46** | **34** | — |
| 文档流中占位（margin-top −4） | 42 | 30 | 0 |
| 未吸住（scrollTop＝0）条顶 y | 92（`#score-wrap` 顶 84 + 内距 12 − 4） | 92 | — |
| 吸住时条顶 y | **84**（`position:sticky; top:-12px`，抵掉 12px 内距，同 L3066 口径） | 84 | — |
| `#paper` 顶 y（scrollTop＝0） | **138** | **126** | 96 |
| 吸住时谱面可见高（外框底 → 状态栏顶） | 1280×800 **638** · 1366×768 **606** · 1440×900 **738** · 1920×1080 **918** | 650 · 618 · 750 · 930 | 684 · 652 · 784 · 964 |

CSS（都挂在 flow 那组样式里，前缀 `body.flow:not(.stand):not(.viewer)`；没有新令牌）：

```
#flw-sbar{position:sticky;top:-12px;z-index:3;margin:-4px 0 0;padding:0 0 6px;background:var(--bg);box-sizing:border-box}
#flw-sbar .flw-sb-bar{display:flex;align-items:center;gap:2px;height:40px;padding:0 4px;border-radius:10px;background:var(--panel);
  box-shadow:inset 0 0 0 1px var(--border),0 1px 2px rgba(18,16,52,.06);overflow:hidden;white-space:nowrap;font:13px/1 var(--font-ui);color:var(--text)}
#flw-sbar button{height:32px;min-height:32px;min-width:32px;padding:0 8px;gap:5px;border:0;border-radius:8px;background:transparent;box-shadow:none;flex:none}
#flw-sbar button:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
.flw-sb-kind{font-weight:600;max-width:200px;flex:0 1 auto;min-width:0}  .flw-sb-kn{overflow:hidden;text-overflow:ellipsis}
.flw-sb-sep{width:1px;height:20px;margin:0 4px;background:var(--border)}
.flw-sb-seg{display:inline-flex;padding:2px;gap:2px;border-radius:9px;background:var(--bg)}  .flw-sb-seg button{height:28px;min-height:28px;font-size:12px;color:var(--muted)}
.flw-sb-seg button[aria-pressed=true]{background:var(--panel);color:var(--accent-ink);font-weight:600;box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent)}
.flw-sb-steps li：18 圆号；.done color:var(--ok)；.now 胶囊 background:var(--accent-soft);color:var(--accent-ink)；非当前步只显示编号（.flw-sb-t 隐藏，读屏名在 title / 隐藏文字）
.flw-sb-go{color:var(--accent-ink);font-weight:700;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 55%,transparent)}   （主色实底仍只留给「发布」）
.flw-sb-tool{font-size:12px}  .flw-sb-tool.pri 同 .flw-sb-go 的描边强调
.flw-sb-hint{flex:0 1 auto;min-width:0;max-width:21em;overflow:hidden;text-overflow:ellipsis;margin:0 6px;font-size:12px;color:var(--muted)}
#flw-sbar[data-sb=col] .flw-sb-bar{height:28px;padding:0}   .flw-sb-tgw{flex:1 1 auto;height:28px;min-height:28px;justify-content:flex-start;font-size:12px;color:var(--muted)}
body.flow[data-mode="engrave"] #flw-sbar, body.flow[data-mode="output"] #flw-sbar{visibility:hidden}   （留占位：切模式时滚动位置不变，见 §5）
body.startpad #flw-sbar, #start-pad:not(.hidden)~#flw-sbar, body.printing #flw-sbar{display:none!important}
@media print{ #flw-sbar{display:none!important} }
body.nwrap #flw-sbar{left:0}   （不换行长带：横向也吸住，同 L1537）
```

层级：外框 `z-index:3`，与旧谱型条相同。它低于窄档左栏浮层（`#flw-left` 19、子面板 4，L1293–1301）、右栏浮出（30，L529 一带）、换谱类菜单 `.lb-menu`（74）、`#popmenu`、提示条、导览。

### 1.3 宽度与对齐（`fit()`，在 `F.raf('sbfit')` 里算；同 `lbFit` L32801 的取法）

1. 取 `L = max(#paper.left, #score.left)`、`R = min(#paper.right, #score.right)`。不换行长带（`noWrapOn()`）时改取 `#score-wrap` 内容盒的左右边。
2. 如果 `R − L < SB_MIN`（**560**），宽度取 `min(560, #score-wrap 内容宽)`，以谱纸中线居中，再夹回内容盒里。这种情况只在用户把谱面缩小时出现（`viewZoom` 最小 0.5，L7124）。
3. 写 `width`，再按实测左缘补 `margin-left`，和 `lbFit` 一样。缓存 `_w / _l / _nw`，不变就不写。

实测条宽（`#score` 与 `#paper` 的交集，新建谱铺满）：

| 视口 | 左栏 | 右栏 | 条左缘 x | **条宽** |
|---|---|---|---|---|
| 821×760（窄档） | 56 | 竖条 40 | 66 | 705 |
| 900×800（窄档） | 56 | 竖条 40 | 66 | 784 |
| **1180×800**（窄档） | 56 | 竖条 40 | 66 | **1064** |
| **1280×800** | 248 | 竖条 40 | 258 | **972** |
| **1440×900** | 248 | 停靠 264 | 258 | **908** |
| **1920×1080** | 248 | 停靠 264 | 408 | **1088** |

### 1.4 收纳（放不下才收，按实测逐级加类，任何时候都不换行、不溢出）

| 档 | 类 | 做法 |
|---|---|---|
| 全 | — | 全部显示 |
| n1 | `sb-n1` | **先收提示文字**（`.flw-sb-hint` 隐藏；全文仍在 `title` 和 `aria-describedby`） |
| n2 | `+sb-n2` | 记谱法三钮**只留图标**（字进 `aria-label`） |
| n3 | `+sb-n3` | 工具、「更多」、当前步名**只留图标** |
| n4 | `+sb-n4` | 谱名隐藏（只留谱类图标 + ▾），主按钮只留图标 |
| n5 | `+sb-n5` | **收进「更多」**：从最后一个工具往前逐个加 `.flw-off`，「更多」改成菜单（`aria-haspopup=menu`），列出收起的工具，最后一项「全部智能工具」打开右栏「智能」页 |

算法同 `lbFit`：依次试 `''` → `sb-n1` → … → `sb-n5`，直到 `bar.scrollWidth ≤ bar.clientWidth + 1`。只在宽度或内容签名变了时重算。

各档所需宽度（原型实测，单位 px，「全 / n1 / n2 / n3 / n4」）。注意：当前步有主按钮时不显示提示（§2.3）。

| 谱类 · 阶段 | 全 | n1 | n2 | n3 | n4 |
|---|---|---|---|---|---|
| 简谱歌谱 · 工具（空谱带提示） | 846 | 712 | 613 | 438 | 381 |
| 简谱歌谱 / 五线谱 / 教学对照谱 · 工具 | 712–725 | 同左 | 613–626 | 438–451 | 381 |
| 吉他谱 · 工具 | 560 | 560 | 560 | 385 | 276 |
| 吉他弹唱谱 · 起步 ② | 728 | 728 | 629 | 531 | 385 |
| 钢琴独奏谱 · 工具 | 509 | 509 | 509 | 346 | 276 |
| 钢琴弹唱谱 · 起步 ①（带提示） | 571 | 417 | 417 | 343 | 208 |
| 钢琴伴奏歌谱 · 起步 ①（带提示） | 749 | 603 | 504 | 430 | 347 |
| 钢琴伴奏歌谱 · 起步 ②「补配 12 小节」 | 768 | 768 | 669 | 559 | 385 |
| 钢琴伴奏歌谱（五线谱）· 工具 | 790 | 790 | 691 | 528 | 381 |
| 和弦谱 · 工具 | 407 | 407 | 407 | 286 | 242 |

结论，可以直接写成断言：
- **≥1180 的四档宽度（条宽 908–1088）**：14 种谱类都是全档。最宽的是「钢琴伴奏歌谱（五线谱）· 工具」790、「简谱歌谱 · 空谱提示」846，都小于 908。
- **900**（784）：只有「钢琴伴奏歌谱（五线谱）」收到 n2，空谱提示收到 n1。
- **821**（705）：旋律类、钢琴伴奏类收到 n1 / n2，吉他、钢琴、和弦谱仍是全档。**不会到 n3。**
- **缩小谱面 → 条宽 560**：最坏情况是「补配 12 小节」那一档要 n3（559），n4 最多要 385，比 560 少 175。**n5 在真实界面里到不了**。代码照样写，测试用 `FLOW.sbar.fit({w:360})` 强制触发。

### 1.5 跟滚让位（必须改，否则光标会被条盖住）

`lbStickBottom()`（L32833）现在只认 `#lb-wrap`。改成：flow 下只要 `#flw-sbar` 可见、`position:sticky`，就返回它外框的 `getBoundingClientRect().bottom`，否则按原逻辑。用到它的三处（光标跟滚 `selFollow` L11227、报错跳转 L20490、播放跟随 L22620）不用改。

---

## 2. 内容：每种谱类显示什么

### 2.1 数据来源（不另立判据）

- 谱类：`NWB.kindOfSong(song)` → `{name, ic}`；谱行代码：`NWB.stackOf(song)`。
- 起步：`f = lbInfo(song, lbMeta())`，`c = lbCur(f)`。`meta` 可以是 null（打开的已有谱），`lbSteps` 已经兼容。**不要为打开的谱新建 LB_META 条目**：否则手机 ≤820（旧外壳那条 `lbSync` 分支）会给打开的谱挂上 `#lb-wrap`。播报用的步骤签名放在本块自己的 `WeakMap`（键是 `docs[curDocI]`）。
- 工具能不能用：与右栏「智能 / 文字」页、命令面板**同一判据**（`shown(id)` 读 `renderDock` 写的内联 display，L10784–10806；`FLOW.rdp.chordAvail()`，L25343）。

### 2.2 记谱法切换（简谱 · 五线 · 对照）

**哪些谱有（`sbMelOk`）**：谱行代码属于 `J / S / SJ / JG / SG / SJG / CJ / CS / JT`，并且同时满足：
- 不是视唱练耳（`meta.scene !== 'sight'`）；
- 不是固定记五线谱的器乐身份（`J / S / SJ` 的 `instKey` 所属乐器族不是 jianpu 时不出，同 `lbMelOk` L32632）；
- `1 ≤ lbMelVoices(song).length ≤ 4`。超过 4 条旋律轨（例如导入的多轨重奏）不出，避免一下改掉整份总谱；逐轨改在音轨树里做。

所以吉他谱、吉他独奏谱、钢琴独奏谱、钢琴弹唱谱、和弦谱都**没有**这一组。

**作用于哪几条轨**：`lbMelVoices(song)`，也就是所有不在钢琴花括号里的旋律轨。钢琴伴奏歌谱只动第 0 行，右手、左手两行不动。合唱谱动全部声部。吉他弹唱谱只动旋律行，六线谱轨不动。

**当前状态**：所有作用轨都是五线谱、并且都开了简谱对照 → 「对照」；都是五线谱、都没开对照 → 「五线」；都不是五线谱 → 「简谱」；混着的 → 三个都不按下。

**写入（`FLOW.sbar.mel(want)`）**：
- 一次 `mutate`，也就是一步撤销。
- 只写 `setVoxNotation` / `toggleVoxDual`（L19886–19899）会写的两个字段：`voxNotations[vi]` 取 `undefined | 'staff' | 'bass' | 'alto'`，`voxDual[vi]` 取布尔值。
  - 「简谱」：`voxNotations[vi] = undefined`，`voxDual[vi] = false`。
  - 「五线」：已经是五线谱的保留原谱号，否则用音轨树记住的谱号（`FLOW.tree` 的 `CLEF_MEM`，L25724–25728，需要导出 `clefKeep(i, nv)` / `clefFor(i)`），没有记录就用 `'staff'`；`voxDual[vi] = false`。
  - 「对照」：谱号同「五线」，`voxDual[vi] = true`。
  - 写完如果整组都是空值，就删掉 `voxNotations` / `voxDual`。
- **来回切逐字节还原**：同 `lbMelSet` 的 `melUndo` 做法（L32956–32967）。记下切换前的 JSON；切回去时，如果谱上这两个字段没被别处改过，就原样还原。记录放本块的 `WeakMap`，不放 LB_META。
- 不弹提示条，用 `lbSay('旋律改用五线谱')` 这类一句话给读屏播报。谱名会跟着变（简谱歌谱 → 五线谱歌谱 → 教学对照谱，与换谱类「直接换」同结果），条和芯片下一帧重画。
- 旧外壳的 `lbMelSet` 和音轨区 ⋯ 的 `tree:mel` 都**不改**。

### 2.3 起步阶段与常用工具阶段

```
phase(f, c) = 'tools'  当 !f.steps
                       或 c.fin（全部完成）
                       或 c.cur 是 f.steps 的最后一步（前面各步都已完成）
            = 'steps'  其余情况（第 ①、② 步还没做完）
```

- **起步阶段**显示：
  - 步骤编号：做完的显示 ✓，当前步是胶囊并带步名，没轮到的只显示编号（步名在 `title`）。
  - 当前步有按钮（`c.nxt`）时出主按钮：字和 `data-act` 都来自 `lbSteps`，点了调 `lbGo(act, kb, '#flw-sbar')`。**这时不显示提示**：「补配 12 小节」「补齐六线谱」按钮上已经写了缺口，说明进 `title`（`say：sayT`）。
  - 当前步没有按钮时出一句短提示（SB_HINT，≤20 字），全文（`c.hint`）进 `title`：

| 步 | SB_HINT（可见） | title（`c.hint` 全文，同旧谱型条 `.lb-hint`） |
|---|---|---|
| 写旋律（简谱旋律） | 点旋律行，按数字键写音 | 点旋律行：数字 1–7 写音、0 休止，+ / − 八度；Enter 填歌词 |
| 写旋律（五线谱旋律） | 点旋律行，按数字键写音 | 点旋律行：数字 1–7 按调写音（五线谱自动落位）、0 休止，+ / − 八度 |
| 标和弦（钢琴弹唱谱 ①） | 选中右手的音，按 Ctrl+K | 选中右手的音，按 Ctrl+K 输入和弦（如 Am7），或点右栏「和弦」 |
| 选织体（导入谱伴奏来自文件） | 伴奏来自文件，已保留 | `lbSteps` L32671 原文（在工具阶段只进织体工具的 title） |
| 调把位与扫弦 | 点六线谱的音改品位 | `lbSteps` L32688 原文（同上，最后一步，实际在工具阶段） |

- **常用工具阶段**：按 §2.5 的表显示 3–4 个工具。
  - **强调项**：当 `c.cur` 是最后一步并且有按钮（钢琴伴奏歌谱 ③「换织体」、钢琴弹唱谱 ②「生成伴奏 / 换织体」）时，对应工具加 `.pri`、`aria-label` 写「织体（下一步）」，`title` 是 `c.nxt.btn`（加 `：sayT`）。`c.fin` 时不加强调。如果那个工具不在本谱类的工具表里，就插到最前面。
  - 映射：`act 'tex' → 工具 tex`，`'arrange' → arr`，`'tabgen' → gen`。
  - 导入谱伴奏来自文件（`fileAcc`）时没有 `c.nxt`，所以不强调；织体工具的 `title` 加「会覆盖文件里的伴奏，Ctrl+Z 撤销」。
- 推进：每次 `render` 末尾 `FLOW.sync → FLOW.sbar.sync()` 现算，HTML 签名去重。重写前后按 `data-fa + data-v` 放回键盘焦点（同 `FLOW.start` 的 `put`，L27252）。
- 播报：步骤变了用 `lbSay` 播报，措辞同 `lbStepSay`（L32790–32796），签名记在本块的 `WeakMap`。

### 2.4 空谱一句提示（SB_TIP，只在工具阶段、`lbAllBare(song)` 为真时出；落下第一个音就消失；全文 `LB_TIP[k]` 进 title）

| 谱行 | 可见（≤20 字） |
|---|---|
| J | 点谱面，按数字键写音 |
| S | 点谱面，按数字键按调写音 |
| SJ | 两行任选一行输入，另一行同步 |
| T、JT（从六线谱写起） | ↑↓ 选弦，数字键写品位 |
| ST | 在六线谱输入，五线谱自动同步 |
| G | 数字键写音，↑↓ 换右手 / 左手 |
| CJ、CS | 先写旋律，再按 Ctrl+K 标和弦 |
| C | 选中一拍，按 Ctrl+K 写和弦 |

### 2.5 常用工具表

**工具目录**（委托现有入口，不复制业务逻辑；能不能用与右栏同一判据）：

| id | 图标（现有） | 可见字 | aria-label / title | 委托（与谁同一调用） | 能用的判据 |
|---|---|---|---|---|---|
| `lyr` | `nota-lyrics` | 填词 | 填词 / 逐字填词（Enter） | 当前不在旋律轨就先选中第一条旋律轨（同 `FLOW.rdp` 的 `lyrGo`，L25332）；窄档先 `F.nar.open('trk', false)`（同命令面板 `lyr()`，L26165）；然后 `FLOW.tree.lyrEdit()`。`FLOW.rdp` 需要导出 `lyrGo` | `voxVoices.length>0 && lyricLines>0`（同 `#rt-fill` 显隐，L10799） |
| `chord` | `nota-chord` | 和弦 | 和弦 / 输入和弦（Ctrl+K） | `showChordQuick()`（同右栏「文字」页、Ctrl+K） | 总是可用 |
| `lab` | `ai-workbench` | 配和弦 | 配和弦 / 配和弦工作台：逐小节候选 | `$('rt-lab').click()` | `shown('rt-lab')` |
| `arr` | `src-arrange` | 配伴奏 | 配伴奏 / 一键配伴奏：旋律 → 和弦 → 双手伴奏 | `$('rt-arr').click()`（→ `#b-arrange`，同 `lbGo('arrange')`） | `shown('rt-arr') && lbMelVoices.length===1` |
| `tex` | `nota-texture` | 织体 | 织体 / 伴奏织体：按和弦生成双手伴奏 | `$('b-acctex').click()`（同 `lbGo('tex')`） | `shown('b-acctex')` |
| `rhy` | `nota-slash` | 节奏型 | 节奏型 / 节奏型库 | `openRhyLib()` | `shown('panel-tab-pat') \|\| shown('panel-vox-pat')` |
| `gen` | `ai-gentab` | 六线谱（尤克里里谱写「四线谱」） | 由旋律生成六线谱；title 取 `#nl-voxtab.title`（含「写进空吉他轨，轨数不变」） | `showVoxTabMenu(lbMelVoices(song)[0])`（同 `lbGo('tabgen')`） | `shown('nl-voxtab') && voxVoices.length>0` |
| `deg` | `nota-degree` | 级数（`aria-pressed`＝`!song.funcNames`） | 和弦写法：级数（再点改音名）/ 音名（点一下改级数） | `$('vf-names').click()`（同右栏 `rdp:names`） | `FLOW.rdp.chordAvail().fn` |
| `diag` | `nota-chordbox` | 和弦图 | 和弦图：随行 / 曲首 / 不显示（当前：X） | `$('b-diag').click()`（循环一档，同 `#b-diag`） | `FLOW.rdp.chordAvail().dg` |
| `board` | `act-keyboard`；六线谱语境用 `inst-guitar` / `inst-ukulele` | 键盘 / 指板 | 键盘输入 / 指板输入 | `$('rt-board').click()`（同命令面板 `r2:board`） | 总是可用 |
| `fing` | `sg-fingering`（`pqSign`） | 指法 | 指法（钢琴） | `FLOW.pal.act('pal:sign', 格子或 {dataset:{v:'fingering'}}, null)`（同记号格、命令面板 `sign:fingering`） | `FLOW.pal.ok('fingering', FLOW.ctx())` |
| `mea` | `sg-rehearsal`（`pqSign`） | 段落 | 段落 / 段落标记（前奏 · A · 副歌） | `$('b-mealabel').click()` | 总是可用 |

**每种谱类**（表里的工具按判据过滤后依次显示，最多 4 个；「—」表示没有）。可用性已按新建空谱逐项实测（`avail.js`）。

| # | 谱行 · 典型谱名 | 记谱法切换（作用轨） | 起步（`lbSteps`） | 常用工具（顺序） | 空谱提示 |
|---|---|---|---|---|---|
| 1 | J 简谱歌谱 / 简谱合唱谱 / 民乐谱（简谱） | 有（全部旋律轨；民乐身份也有） | 无 | 填词 · 和弦 · 配和弦 · 配伴奏（合唱谱有 ≥2 条旋律轨，没有配伴奏 → 3 个；民乐无词 → 和弦 · 配和弦 · 配伴奏） | 点谱面，按数字键写音 |
| 2 | S 五线谱旋律 / 五线谱歌谱 / 五线谱合唱谱 / 重奏谱 | 有（视唱练耳、管弦键盘身份没有） | 无 | 填词 · 和弦 · 配和弦 · 配伴奏（无词的旋律谱没有填词、合唱 / 重奏没有配伴奏 → 3 个） | 点谱面，按数字键按调写音 |
| 3 | SJ 教学对照谱 | 有（「对照」按下） | 无 | 填词 · 和弦 · 配和弦 · 配伴奏 | 两行任选一行输入，另一行同步 |
| 4 | T 吉他谱（六线谱）/ 尤克里里谱（四线谱） | 无 | 无 | 和弦 · 节奏型 · 和弦图 · 指板 | ↑↓ 选弦，数字键写品位 |
| 5 | JT 吉他弹唱谱 / 尤克里里弹唱谱 | 有（旋律行） | 「从简谱写起」或旋律已有音时：①写旋律 → ②生成六线谱（补齐六线谱）→ ③调把位与扫弦。③ 是最后一步，所以 ② 做完就换工具阶段 | 填词 · 和弦 · 节奏型 · 和弦图 | ↑↓ 选弦，数字键写品位 |
| 6 | ST 吉他独奏谱 / 尤克里里独奏谱 | 无 | 无 | 指板 · 和弦 · 节奏型 · 和弦图 | 在六线谱输入，五线谱自动同步 |
| 7 | G 钢琴独奏谱 / 电钢琴等独奏谱 | 无（两行各自的简谱对照在音轨树里开） | 无 | 键盘 · 指法 · 和弦 · 节奏型 | 数字键写音，↑↓ 换右手 / 左手 |
| 8 | CG 钢琴弹唱谱（纯伴奏） | 无 | ①标和弦（提示「选中右手的音，按 Ctrl+K」）→ ②选织体（最后一步） | **织体（② 时强调，title「生成伴奏 / 换织体」）** · 和弦 · 级数 · 键盘 | — |
| 9 | JG 钢琴伴奏歌谱 | 有（只动旋律行） | ①写旋律 → ②配和弦与伴奏（一键配伴奏 / 补配 N 小节）→ ③选织体（最后一步） | **织体（③ 时强调）** · 填词 · 配和弦 · 级数 | — |
| 10 | SG 钢琴伴奏歌谱（五线谱）/ 旋律＋钢琴伴奏谱（五线谱） | 有（「五线」按下） | 同 JG | 同 JG | — |
| 11 | SJG 教学对照谱（含伴奏） | 有（「对照」按下） | 同 JG | 同 JG | — |
| 12 | CJ 功能谱 | 有 | 无 | 和弦 · 配和弦 · 级数 · 填词 | 先写旋律，再按 Ctrl+K 标和弦 |
| 13 | CS 五线谱和弦谱 | 有 | 无 | 和弦 · 配和弦 · 级数 · 填词 | 先写旋律，再按 Ctrl+K 标和弦 |
| 14 | C 和弦谱 | 无 | 无 | 和弦 · 级数 · 段落 | 选中一拍，按 Ctrl+K 写和弦 |
| 15 | **导入 MIDI 多轨**（谱类按 `stackOf` 判） | 旋律轨 ≤4 才有；>4 不出 | 按所判谱类。如判成钢琴伴奏歌谱，伴奏来自文件时 ①② 已完成、③ 只有提示 → 工具阶段，织体不强调 | 按所判谱类的表；旋律轨 ≥2 时去掉「配伴奏」（判据第二条）；如果过滤后不到 3 个，补「键盘」 | 按所判谱类 |
| 16 | **打开已有谱**（`meta` 为 null：示例曲谱、我的曲谱、打开文件） | 同所属谱类 | 只有前几步（钢琴伴奏歌谱 ①②、吉他弹唱 ①②、钢琴弹唱谱 ①）还没做完时才是起步阶段。例如打开一份只有旋律的钢琴伴奏歌谱会出「② 一键配伴奏」 | 同所属谱类 | 同所属谱类 |

说明：
- 级数、和弦图要先有和弦才出（`chordAvail`）。所以新建钢琴伴奏歌谱在配伴奏之前，工具阶段只有「织体 · 填词 · 配和弦」3 个。
- **不放「移调」**。v60.55 的产品指示是「换调只此一个入口」：点谱面页头的 1=X（`showHeadMenu('key')`，L18606–18611，顶栏变调组已撤）。命令面板 `r2:keypop` 照旧。以后要放进条里，需要负责人再定。
- 每个工具点了都记一次 `F.track('sbar:'+id)`（ui_cmd，id 合 `FLOW.track` 的正则，服务端不用加白名单）。展开 / 收起分别记 `sbar:exp` / `sbar:col`，用于两周后看使用率。

### 2.6 谱类 ▾、主按钮、「更多」

- **谱类 ▾**：`lbMenuOpen(#flw-sb-kind, kb)`，与 `#flw-kchip` 用同一函数、同一张菜单（L32870）。需要改三处：
  - `lbKindBtn()`（L32843）：flow 下 `#flw-sb-kind` 可见时优先返回它，否则返回 `.flw-kchip`。窄档（<1280）芯片不可见（实测 1180 宽 `#flw-kchip` 是 0×0），这时条上的 ▾ 是唯一入口。
  - `lbMenuOut`（L32853）：放行选择器加 `#flw-sb-kind`，否则会先关后开。
  - `lbBlur`（L32840）：选择器加 `#flw-sbar`。
- **主按钮**：`lbGo(act, kb, '#flw-sbar')`。`lbModalFocus`（L32997）关闭弹窗后找回焦点时，选择器改成通用的 `root+' [data-act="'+act+'"]'`，再退到 `root+' .flw-sb-go'`、`[aria-current="step"]`、第一枚按钮。
- **「更多」**：右栏「智能」页（`FLOW.rd.open('smart', el, kb)`）。如果右栏已经浮出、并且停在「智能」页，就 `FLOW.rd.close(true)`。n5 档时改成菜单（§1.4）。

---

## 3. 收起态、键盘、焦点、读屏、本机键

### 3.1 收起态

- 整条只有一枚按钮 `#flw-sb-tg.flw-sb-tgw`，高 28，占满条宽，内容是谱类图标 + 摘要 + 右端 ⌄。点任何地方都展开。
- 摘要：
  - 起步阶段：`{谱名} · {①②③} {步名}`，例如「钢琴伴奏歌谱 · ② 配和弦与伴奏」。
  - 工具阶段：`{谱名}`。
  - 放不下就省略，全文在 `aria-label`。
- 收起后，谱面在文档流里少占 12（42 → 30）。

### 3.2 展开 / 收起

- 状态是**用户级偏好**，不分窗口、不分谱。
  - 启动时（`mount`）读一次 `F.ls.get('musetab-sbar')`：`'0'` 是收起，其他值（包括读不到）都是展开。
  - 收起时 `F.ls.set('musetab-sbar','0')`，展开时 `F.ls.set('musetab-sbar', null)`（删键）。
  - `set` 返回 false（存储被禁用，见 D1）时记在模块内存变量 `MEM` 里，本次会话有效，不弹提示。
- 条已吸住（`#score-wrap.scrollTop > 0`）时切换，不能让谱面跳：切换前记下 `#paper` 的屏幕 y，切换后把差值补到 `scrollTop`（夹在合法范围内）。scrollTop＝0 时谱面上下移动 12px，属于预期。
- 鼠标点（`detail>0`）完成后把焦点交还谱面（同 `lbBlur`）。键盘按（Enter / 空格，`detail===0`）后焦点落点见 §3.3。

### 3.3 键盘与焦点

- **Alt+B**（L16857）：
  - flow 下改调 `FLOW.sbar.alt()`；旧外壳照旧 `LBAR.show()`。
  - `alt()`：如果当前不在书写模式（排版 / 输出），先 `setMode('write')`，再展开并聚焦；否则切换展开 / 收起并聚焦。
  - 聚焦目标：展开时按 `.flw-sb-go` → `.flw-sb-tool.pri` → 第一个 `.flw-sb-tool` → `#flw-sb-kind` 的顺序取第一个；收起时是 `#flw-sb-tg`。
  - 输入框里不响应：全局 keydown 前面已经对输入框 return。
- **`LBAR.show(o)` 的 flow 分支**（L33036–33041）改成 `FLOW.sbar.show(o)`：先展开（并持久化）再聚焦；`o.menu` 为真时直接打开谱类菜单，锚在条上的 ▾。`#ri-lbar` 被程序化点击（L33053）时就走这里。**不再切换**，只有 Alt+B 切换。
- **工具条模式**（`role=toolbar`，roving tabindex）：
  - 只有一个 Tab 停点：上次聚焦过的那枚，否则是上面的聚焦目标。
  - ← → 在可见按钮之间移动，到头回绕；Home / End 到首 / 尾。条的 keydown 监听里 `stopPropagation()`，方向键不移动谱面光标。
  - 记谱法三钮是 `aria-pressed` 的切换钮，**←→ 只移焦点、不改记谱法**（修掉旧谱型条 ←→ 来回翻记谱法的问题）。Enter / 空格才切换。
  - Esc：焦点交还谱面（blur），展开状态不变。
  - 其他键照常落到谱面，与行 2 相同。
- 全局「点内容区外熄光标」的 pointerdown 名单（L17578）加 `#flw-sbar`，否则点条上的空白或提示文字会熄掉光标、触发重排。

### 3.4 读屏

| 元素 | 角色 / 属性 | 读屏名 |
|---|---|---|
| `#flw-sb-bar` | `role=toolbar`、`aria-orientation=horizontal` | 悬浮条：常用工具（收起时：悬浮条，已收起） |
| `#flw-sb-kind` | `aria-haspopup=menu`、`aria-expanded` | 谱类：{谱名}。换谱类 |
| 记谱法三钮 | 外层 `role=group`；按钮 `aria-pressed` | 组：旋律记谱法（作用轨 ≥2 时：旋律记谱法（全部旋律轨））；钮：旋律用简谱 / 旋律用五线谱 / 五线谱加简谱对照 |
| `ol.flw-sb-steps` | 当前项 `aria-current="step"`、`aria-describedby="flw-sb-hint"`（有提示时）；做完的项前面加隐藏文字「已完成：」 | 起步 |
| 主按钮 / 工具 / 「更多」 | `aria-label`＝可见字（收到只剩图标时字不丢）；强调的工具：「织体（下一步）」 | 见 §6 |
| `#flw-sb-tg` | `aria-expanded` true / false、`aria-controls="flw-sb-bar"` | 收起悬浮条 / 展开悬浮条：{摘要} |
| 播报 | 沿用 `#lb-live`（`role=status`） | 步骤变了：同 `lbStepSay` 措辞；记谱法切换后：「旋律改用五线谱」等 |

---

## 4. 去重：撤掉什么、改什么、测试怎么迁

### 4.1 代码

| 撤 / 改 | 位置（基线行号） | 做法 |
|---|---|---|
| 行 2「起步」组 `#flw-start` 和 ⓘ、起步说明浮层 `stpTip` | `FLOW.start` 整块 L27159–27395；CSS L3011–3015、L3070–3096、L3939–3950、L4024–4046；行 2 收键留存表里的 `#flw-start`（L24529） | **整块删除**，换成 `FLOW.sbar`。悬浮条收起时也**不**在行 2 留极简版：收起的条已经显示谱类和当前步，同一信息只出现一处。行 2 不再为起步组收键（v68.0 的「新谱 1280 收 5 个低频键」随之取消） |
| 右栏「智能」页的「下一步」卡 `#flw-next` | CSS L3098–3123、L3343；`FLOW.rd` 的 PN-1 钩子 L24937–24938；页说明 `PAGES.smart.d` L24909 | 删除；页说明改成「一键配伴奏 · 配和弦 · 织体 · 填词」。「智能」页只留工具清单 |
| 新建落地自动把右栏切到「智能」页（PN-1，`meta.flwLand`） | L27291–27294 | 删除。条就在屏上，右栏留在默认的「属性」页 |
| 「属性」页「整谱」区的「起步 · 换谱类…」按钮 | `FLOW.rdp` `songHTML` L25230–25232、`FN.kind` L25341、块头注释 | 删除按钮。「谱类」那一行文字保留（`tv_kindsync` 读它） |
| `#ri-lbar` 在 flow 下改名（`riSet`） | 随 `FLOW.start` 删除；快照里还原它的那一行 L23657 | 一并删。flow 下 `#ri-lbar` 保持原字，它本来就隐藏；程序化点击走 `LBAR.show({menu:true})` → `FLOW.sbar.show` |
| `lbSync` 的 flow 分支 | L32762–32772 | 改成：移除残留的 `#lb-wrap` 然后 return。条由 `FLOW.sync` 里的 `sbar.sync` 画。`lbSync.hold` 期间（曲谱库缩略图借谱渲染）`sbar.sync` 也直接 return（对应 L22 的口径） |
| 落地提示 `FLOW.start.retext` / `.shown` | L31237、L31256、L31278、L31668、L31672 | 改成 `FLOW.sbar.shown()` 和 `FLOW.sbar.guide(s)`。**展开时 guide 返回 ''**：条已经在屏上，提示不再写「下一步见…」，少字。收起时返回把「谱型条」替换成「悬浮条」的原句 |
| `lbWhere()` 的 flow 分支 | L32742–32744 | 改成「谱面上方的悬浮条」（只在旧路径兜底时用得到） |
| 命令面板 `r2:start`「起步（下一步）」 | L26299 | 换成 `sbar:toggle`「悬浮条：展开 / 收起」，关键字含 `xfl qb xyb alt+b 悬浮条 工具条 起步 下一步 谱型条`，位置写「谱面上方 · Alt+B」 |
| 首次导览 `stageBox()` | L27857–27862 | 上缘 `t` 改成 `max(#top.bottom, 可见 #flw-sbar 外框底)`。第 1、2 步的气泡放在谱面区左上角，原来会压住条。**导览不加步、不改文案**；第 3 步的锚点 `#flw-left` 和圈 `#flw-left + #mixer-dock` 不变 |

### 4.2 测试迁移（不动的：旧外壳 `tv_landbar` L1–L27、`tv_shellflow` S0 / S0b、`tv_modes` M23）

| 套件 · 条目 | 现在断言 | 迁移成 |
|---|---|---|
| `tv_trktree` T24 | `#flw-start` 步骤＝`lbCur`；主按钮＝`#b-arrange`；× 收起、Alt+B 恢复并聚焦 | 读 `#flw-sbar ol.flw-sb-steps li` 的 done / now / todo＝`lbCur(lbInfo(song, LBAR.meta()))`；`#flw-sbar [data-fa="sbar:go"]` 打开的弹窗与 `#b-arrange` 相同；收起 `#flw-sb-tg` → `data-sb=col`、键值 `'0'`；Alt+B → 展开、焦点在 `.flw-sb-go`；全程没有 `#lb-wrap`、`#flw-start`；song 不变 |
| `tv_trktree` T25 | 芯片菜单的位置、再点即关 | 不变，另在 SB5 对 `#flw-sb-kind` 做同样断言 |
| `tv_trktree` T30b / T30c | 821–1179、1600 出现起步组时行 2 怎么收 | 场景名改成「新建钢琴伴奏歌谱」，断言保留（行 2 不裁、「更多 ▾」点得中；1600 收起的键不多于 1536），另断言 `#editbar` 里没有 `#flw-start` |
| `tv_trktree` T30d | Tab 顺序 模式条 → 撤销 → 起步 | 模式条 → 撤销 / 重做 → 行 2 第一个工具；行 2 没有起步组 |
| `tv_trktree` T30e | flow 下 `#ri-lbar` 叫「起步 · 换谱类…」 | flow 下 `#ri-lbar` 保持原字；程序化点击 → 条展开、`#lb-menu` 锚在 `#flw-sb-kind` 下方；快照和退出 flow 后与旧外壳相同 |
| `tv_trktree` T30f | <1440 改写落地提示；Alt+B 浮出「智能」页的「下一步」卡 | <1440 Alt+B 切换条；`FLOW.sbar.guide()` 展开时为 ''、收起时含「悬浮条」；右栏不浮出 |
| `tv_modes` M20 | 竖条 / 窄档 ⓘ 起步说明＝`lbInfo / lbCur`；1440 落地停「智能」页 | 1280 / 1180 / 1440：条上步骤名＝`lbInfo` 的步名；提示可见字＝SB_HINT，`title`＝经典谱型条 `.lb-hint` 原文（同源）；1440 落地右栏页＝`'prop'`，没有 `#flw-next` |
| `tv_modes` M21 | 撤销段 DOM 在起步之前 | 模式条 < 撤销 < 第一个工具段；真实 Tab：模式条 → 撤销 / 重做 → 第一个工具 |
| `tv_modes` M25a | 只有一句提示的谱类出 ⓘ / 落地停「智能」页 | 吉他弹唱、简谱歌谱、和弦谱新建 → 条在工具阶段，空谱提示＝SB_TIP、`title`＝`LB_TIP[k]`；右栏停在「属性」页 |
| `tv_modes` M25b | 821–861 起步组在行 2 时不遮挡 | 去掉起步组的措辞，断言保留 |
| `tv_flowdef` F8c2 | 落地提示写「行 2 的「起步」」 | 展开时：新建钢琴伴奏歌谱的落地提示里没有「谱型条 / 起步 / 下一步见」；收起时含「谱面上方的悬浮条」 |
| `tv_landbar` 末尾 flow 段 L1f / L2f / L3f（L939–1052） | `#flw-start` / `#flw-next` / `FLOW.start` | **移到 `tv_sbar`**（SB3、SB4），`tv_landbar` 只剩旧外壳。如果主会话要求 `tv_landbar` 一行不动，就原地把选择器换成 `#flw-sbar`、主按钮换成 `[data-fa="sbar:go"]`；`plain`（打开的谱）由「不出现」改成「出现、工具阶段、没有步骤」 |
| `tv_nfimport` I29 / I34 / I35 | `FLOW.start.shown()` / `#flw-next` / `retext` | 「落地即有」改判 `FLOW.sbar.model().phase` 和 `LBAR.meta().from==='import'`；「只看示例」改判 `!LBAR.meta()`（条照常出）；步骤读 `#flw-sbar li`；提示：展开时没有「谱型条」 |
| `tv_newpanel` T19、L1189 | 「先写旋律」提示写「起步 / 下一步卡」；`FLOW.start.shown()` | 提示里没有「谱型条 / 起步」；「空吉他轨 / 轨数不变」的说明移到条上「② 生成六线谱」主按钮的 `title`；L1189 用 `FLOW.sbar.shown()` |
| `tv_shellflow` S3 | 可见高 ≥684 / 652 / 784（`visH` 只扣 `#lb-wrap`） | `visH` 再扣可见的 `#flw-sbar` 外框底边，在吸住状态（scrollTop≥50）下量：展开 ≥**638 / 606 / 738**，收起 ≥**650 / 618 / 750**。代价写进更新日志和 PROJECT.md |
| `tv_kindsync`、`tv_icons` | 芯片的谱名 / 图标 | 不变；SB3 另断言条上谱名＝芯片谱名＝`docTypeLabel` |

---

## 5. 与其他界面的关系

| 场景 | 悬浮条 |
|---|---|
| 书写模式（桌面 flow） | 显示，**所有谱都有** |
| 排版 / 输出模式 | `visibility:hidden`，占位不变；嵌入预览 `#preview-ov` 本来就盖住谱面区。书写 → 排版 → 书写，`#score-wrap.scrollTop` 和 `#paper` 的 y 不变 |
| 窄档 <1280（左栏 56 竖条） | 显示；左栏芯片不可见，条上的 ▾ 是唯一的换谱类入口。左栏浮出面板（z 4 / 19）压在条上面 |
| 右栏竖条 / 浮出 288（1280–1439） | 浮出面板（z 30）盖住条的右段；条上的「更多」打开的就是它 |
| 右栏停靠（≥1440） | 条宽 908，全档 |
| 首次导览 | 气泡不压条（`stageBox` 上缘），不加步 |
| 启动台 | `display:none`，并加入 `STARTPAD_INERT` |
| 观看页、谱架、手机 ≤820（`body.flw-m`）、旧外壳 | FLOW 不活动 → `F.CONT` 设 `hidden`，加上 `body:not(.flow) .flw-x` 兜底，不显示；手机仍按原逻辑走旧谱型条 |
| 打印 / 存 PDF / PNG | `@media print`、`body.printing` 下 `display:none`；条在 `#paper` 外，`#score` 和打印页逐字节不变 |
| 互动谱快照 | `snapHTML` 删 `[id^="flw-"]`，不带条 |
| 不换行长带 | 宽度＝`#score-wrap` 内容宽，`left:0` 横向也吸住 |
| 弹窗 / 菜单 / 提示条 | 都在条上面（z 74 以上） |

---

## 6. 文案清单（少字；措辞闸 `deploy/check-wording.js` 的规则逐条核过：不含「拍板 / 智能曲谱平台 / 单窗口 / 四步」等禁词）

**可见字**（全部 ≤6 字，提示 ≤20 字）
- 谱类：统一谱名表原名（`NWB.kindOfSong(song).name`，最宽 200px 省略）
- 记谱法：简谱 · 五线 · 对照
- 起步步名：写旋律 · 配和弦与伴奏 · 选织体 · 生成六线谱 · 调把位与扫弦 · 标和弦（`lbSteps` 原字）
- 主按钮：一键配伴奏 · 补配 N 小节 · 换织体 · 生成伴奏 · 生成六线谱 · 补齐六线谱（`lbSteps` 原字）
- 工具：填词 · 和弦 · 配和弦 · 配伴奏 · 织体 · 节奏型 · 六线谱 / 四线谱 · 级数 · 和弦图 · 键盘 / 指板 · 指法 · 段落
- 右端：更多
- 起步提示（SB_HINT）：点旋律行，按数字键写音 ／ 选中右手的音，按 Ctrl+K ／ 伴奏来自文件，已保留 ／ 点六线谱的音改品位
- 空谱提示（SB_TIP）：见 §2.4 的 8 句
- 收起态摘要：`{谱名}` 或 `{谱名} · ② {步名}`

**只在 title / aria-label**
- 条：悬浮条：常用工具 ／ 悬浮条，已收起
- 谱类钮：谱类：{谱名}。换谱类 ／ title：换谱类（当前：{谱名}）
- 记谱法：旋律记谱法（全部旋律轨）／ 旋律用简谱 ／ 旋律用五线谱 ／ 五线谱加简谱对照
- 步骤 li：第 N 步：{步名}（已完成 / 当前 / 未到）
- 工具 title：逐字填词（Enter）／ 输入和弦（Ctrl+K）／ 配和弦工作台：逐小节候选 ／ 一键配伴奏：旋律 → 和弦 → 双手伴奏 ／ 伴奏织体：按和弦生成双手伴奏 ／ 节奏型库 ／ `#nl-voxtab.title` 原文 ／ 和弦写法：级数（再点改音名）／ 和弦图：随行 / 曲首 / 不显示（当前：X）／ 键盘输入 ／ 指板输入 ／ 指法 ／ 段落标记（前奏 · A · 副歌）
- 「更多」：更多：右栏「智能」 ／ title：全部智能工具（右栏「智能」）
- 收起钮：收起悬浮条 ／ title：收起（Alt+B）；展开钮：展开悬浮条：{摘要} ／ title：展开（Alt+B）
- 强调的工具：织体（下一步）
- 命令面板：悬浮条：展开 / 收起 ／ 谱面上方 · Alt+B

**播报**：沿用 `lbStepSay` 原句；记谱法切换：旋律改用简谱 / 五线谱 / 五线谱加简谱对照

**落地提示**：展开时去掉「——下一步见…」整段；收起时原句里的「谱型条」改成「悬浮条」

**撤掉的字**：行 2 的「起步」、ⓘ「起步说明」、「收起起步」、右栏「下一步」卡全部文字、「起步 · 换谱类…」、`X_TIP`、PN-1 的落地切页

---

## 7. 新套件 `tv_sbar.js` 断言表

运行：`cd muse-tab/tests && NODE_PATH=… CHROMIUM_PATH=/opt/pw-browsers/chromium node tv_sbar.js`。

约定：
- 被测页是默认外壳（flow），SB15 另开 `?shell=classic`。
- 优先用几何断言，优先真实点击。
- **对基线 b938819 跑必须全红**：每条断言都以「`#flw-sbar` 存在且可见」或新 API 为前提，基线上没有它。
- 截图存到 `scratchpad/f83shots/<轨名>/`。

| # | 断言 | 场景 / 数值 |
|---|---|---|
| SB1 几何 | 条存在且可见；展开时条高 40±0.5、外框 46±0.5；条左缘＝`max(#paper.left, #score.left)` ±1，右缘＝`min(…right)` ±1；scrollTop＝0 时条顶 92±1、`#paper` 顶 138±1；`sw.scrollTop=400` 后条顶＝`#score-wrap` 顶（84）±1、条底 124±1；条内每个可见按钮都在条框里，按钮中心 `elementFromPoint` 命中自己；`bar.scrollWidth ≤ clientWidth+1`；页面没有横向滚动 | 1180×800 / 1280×800 / 1440×900 / 1920×1080 × 浅 / 深 × {新建钢琴伴奏歌谱、示例《送别》、新建吉他弹唱}；新建钢琴伴奏歌谱的条宽依次为 1064 / 972 / 908 / 1088（其余谱按同一公式现算） |
| SB2 收纳 | 「≥1180 时 14 种谱类都是全档」；821×760 下所有谱类不超过 n2，并且先收提示（n1）再收标签；缩小到 `viewZoom=0.5` 时条宽＝560±1，以谱纸中线居中，不超过 n3；强制 `FLOW.sbar.fit({w:360})` 时到 n5，「更多」变成菜单、列出被收起的工具，点其中一项与条上点同效；各档条高都是 40（不换行） | 14 种谱行 × 起步 / 工具阶段 |
| SB3 每谱类内容 | 谱名、图标＝`NWB.kindOfSong`＝芯片；记谱法组出不出＝§2.2 判据，按下项＝当前状态；阶段＝§2.3 规则；工具 id 和顺序＝§2.5 表按判据过滤后的结果；空谱提示＝SB_TIP、`title`＝`LB_TIP`；界面上不出现内部代码（JG / CS 等） | `NWB.build` 14 种 + `NWP.quickCreate` 10 个用途 + 示例谱 + 导入 MIDI 多轨（8 轨）+ `createSong` 打开的谱 |
| SB4 起步推进（真实点击） | 钢琴伴奏歌谱：①（提示可见）→ 键入 1235 → ②「一键配伴奏」→ 点 → 智能配谱弹窗默认「填进当前谱」→ 生成 → 进工具阶段，「织体」强调 → 点 → 伴奏织体弹窗 → 生成 → 强调消失；吉他弹唱「从简谱写起」：① → ②「生成六线谱」→ 低把位 → 进工具阶段，仍 1 条吉他轨；钢琴弹唱谱：①标和弦 → `mutate` 加一个和弦 → 工具阶段，织体强调、`title` 是「生成伴奏」；续写旋律后 ② 回来「补配 N 小节」；阶段切换前后 `#paper` 的 y 不变 | 1280×800 |
| SB5 委托同效 | 12 个工具 + 谱类 ▾ + 主按钮 + 「更多」逐个真实点击，与对应的旧入口（表里的委托目标）在同一份新谱上比：弹窗 / 菜单 DOM 签名、确认后的 song JSON、`sel` 逐字节相同。`deg`、`diag` 各一步撤销；`lyr` 后焦点在 `#i-lyric`、`activeTab==='lyr'`（窄档会先展开音轨面板）；谱类 ▾：`#lb-menu` 在钮下方（间距 0–12，左缘差 ±12），`innerHTML` 与从芯片打开的相同，再点即关；「更多」：1440 右栏页＝`smart`，1280 是 `flw-ro` 加 `smart` | 每个工具在它可用的谱类上测 |
| SB6 记谱法 | 简谱歌谱：简谱 → 五线 → 对照，谱名依次是 简谱歌谱 → 五线谱歌谱 → 教学对照谱；每次 `undoStack` +1，Ctrl+Z 逐字节回原；简谱 → 五线 → 简谱 song 逐字节相同；结果与音轨树 `tree:only` / `tree:eye` 的语义相同（每轨 `isStaffNota`、`!!voxDual`、`stackOf` 一致）；钢琴伴奏歌谱的 1、2 行逐字节不动；三声部合唱三轨一起变；低音谱号声部 五线 → 简谱 → 五线 仍是 `'bass'`；视唱练耳谱、小提琴谱、8 轨导入没有这一组；焦点在组内时 ←→ 不改记谱法、不加撤销步 | — |
| SB7 收起 / 展开 + 本机键 | 点收起 → `data-sb=col`、条高 28、外框 34、`#paper` 顶 126、`musetab-sbar==='0'`；刷新后仍收起；点展开 → 删键；收起摘要含谱名和「② 配和弦与伴奏」；scrollTop＝600 时切换，参考音的屏幕 y 差 ≤1；存储被禁用（`addInitScript` 让 `localStorage` 访问器抛错）时编辑器能启动、条可以切换（只在内存）、没有 PAGEERR、没有写键 | 1280×800 |
| SB8 Alt+B 与键盘 | 展开时 Alt+B → 收起、焦点在 `#flw-sb-tg`；再按 → 展开、焦点在 `.flw-sb-go`（钢琴伴奏歌谱 ②）或第一个工具；排版模式下 Alt+B → 回书写、展开、聚焦；焦点在 `#i-lyric` 时 Alt+B 不响应；Tab 从谱面进条只有一个停点；←/→/Home/End 回绕，谱面光标 `sel` 不变；Esc → 焦点离开条、状态不变；鼠标点工具后焦点不留在条上（空格播放） | — |
| SB9 读屏 | `role=toolbar` 和 `aria-label`；收起钮 `aria-expanded` 随状态变；条内每个按钮的读屏名非空，n3 / n4 档只剩图标时读屏名不变；当前步 `aria-current=step`；步骤从 ① 推进到 ② 时 `#lb-live` 播报「第 2 步：配和弦与伴奏，可点「一键配伴奏」」 | — |
| SB10 去重 | 书写模式下：没有 `#flw-start`、`#flw-next`、`.flw-stp-i`、`#popmenu.flw-stp-pop`；`#editbar` 文字里没有「起步」；`#flw-rp-smart` 文字里没有「下一步」；「属性」页没有「起步 · 换谱类」；没有 `#lb-wrap`；能打开 `#lb-menu` 的可见入口：≥1280 恰好 2 个（`#flw-sb-kind`、`#flw-kchip`），<1280 恰好 1 个；1280 宽新建钢琴伴奏歌谱时行 2 没有 `.flw-off` | 1180 / 1280 / 1440 |
| SB11 模式与场景 | 书写 → 排版 → 输出 → 书写：排版 / 输出时条 `visibility:hidden`，`scrollTop` 和 `#paper` y 不变；启动台 `display:none`；观看页（`openPubViewer`、`?pub=`）和谱架看不到条；`emulateMedia print` 和 `beforeprint` 时 `display:none`；`FLOW.snapHTML()` 里没有 `flw-sb`；390 和 820 宽看不到条；1180 宽芯片不可见、条上的 ▾ 可见 | — |
| SB12 层级 | 1280 右栏浮出时，条右段（`right−20`）的 `elementFromPoint` 命中右栏；1180 左栏音轨浮出时，条左段命中浮层；`#lb-menu` 盖在条上；导览（`?tour=1`）三步的气泡矩形都不与条相交，第 3 步的圈仍是 `#flw-left` 和 `#mixer-dock` | — |
| SB13 跟滚让位 | 条吸住后，用方向键把光标移到会被条盖住的位置：`selFollow` 之后光标框顶 ≥ 条外框底 + 8；播放跟随、报错跳转同样不落在条下；`lbStickBottom()`＝条外框底 | 1280×800 长谱 |
| SB14 谱面与打印零变化 | 16 份示例谱的 `#score.outerHTML` 在条展开、收起、旧外壳下逐字节相同；`renderOffscreen` 相同；打印页 `#print-pages` 相同 | — |
| SB15 旧外壳零差异 | `?shell=classic`：没有 `#flw-sbar` 和 `.flw-sb-*`；新建钢琴伴奏歌谱仍出 `#lb-wrap`（`lbHTML` 逐字节同基线）；Alt+B 走 `LBAR.show()`；`musetab-sbar` 不写 | 对拍基线提交 |
| SB16 数据红线 | 只做界面操作（切换、开关菜单、悬停、roving、「更多」、改窗口大小、切模式）前后 song JSON 逐字节相同；`musetab-*` 键差集只可能是 `{musetab-sbar}`；记谱法切换后 song 的键集合不超出基线键加上 `voxNotations` / `voxDual` | — |
| SB17 性能与抖动 | 200 小节钢琴伴奏歌谱 `FLOW.sbar.sync()` 中位耗时 ≤2ms；静置 1.5 秒 `render` 增量 ≤1；1280 → 1440 → 1280 每步 `render` ≤3（`ResizeObserver` 只重新对齐，不重排） | — |
| SB18 命令面板 | 搜「悬浮条」「qb」「起步」第一条都是 `sbar:toggle`，执行后切换；没有 `r2:start` | — |
| SB19 落地提示 | 展开时：新建钢琴伴奏歌谱、导入《送别》、示例做同款的提示里没有「谱型条 / 起步 / 下一步见」；收起时含「谱面上方的悬浮条」 | — |
| SB20 右栏不再被拉走 | 1440 新建钢琴伴奏歌谱、吉他弹唱、和弦谱：`FLOW.rd.page()==='prop'` | — |
| SB21 命中区与对比度 | 条内可见按钮最小边 ≥28（展开 32、记谱法 28、收起钮 28）；提示字 `--muted` 对 `--panel`、强调的工具 `--accent-ink` 对 `--panel` 在浅色、深色下对比度都 ≥4.5 | — |

另跑回归：`tv_shellflow`、`tv_trktree`、`tv_modes`、`tv_flowdef`（迁移后）、`tv_landbar`（旧外壳段）、`tv_nfimport`、`tv_newpanel`、`tv_kindsync`、`tv_icons`、`tv_layout`、`tv_deskscale`、`tv_fixdensity`、`tv_matrix`。还有语法闸 `node deploy/check-syntax.js muse-tab/index.html` 和措辞闸 `node deploy/check-wording.js`。

---

## 8. 实现清单（按改动位置）

1. **新块 `FLOW.sbar`**：放在原 `FLOW.start` 的位置（L27159）。导出：
   - 钩子：`mount / on / off / layout / sync / act`
   - 操作：`show(o) / alt() / toggle(o) / expanded() / shown() / guide(s) / mel(want) / melOk(s, k, meta) / fit(o)`
   - 测试用：`model()`，返回 `{shown, exp, phase, kind, seg, steps, go, hint, tools:[{id, pri}], tier, w}`
   - 只读表：`TOOLS`、`KIND`
2. **骨架**：`F.KEYS.sbar`、`F.PARTS` 用 `'sbar'` 顶替 `'start'`、`F.CONT` 加 `'flw-sbar'`；`STARTPAD_INERT` 加 `'flw-sbar'`。
3. **导出两处现有逻辑，不改行为**：`FLOW.rdp.lyrGo`；`FLOW.tree.clefKeep / clefFor`（读写 `CLEF_MEM`）。
4. **谱型条共用函数的 flow 分支**：`lbSync`、`lbStickBottom`、`lbBlur`、`lbKindBtn`、`lbMenuOut`、`lbModalFocus`、`LBAR.show`、`lbWhere`；Alt+B（L16857）；pointerdown 名单（L17578）。
5. **落地提示三处**：`landed`、导入、示例做同款、`realCreate`，按 §4.1 改调 `FLOW.sbar.guide`。
6. **删除**：`FLOW.rd` 的 PN-1、`PAGES.smart.d`、`FLOW.rdp` 的「起步 · 换谱类…」按钮和 `FN.kind`、命令面板 `r2:start`；`stageBox` 改上缘。
7. **CSS**：新增 §1.2 一组；删除 §4.1 列出的四段起步 / 下一步 / ⓘ 样式。

### 风险

- **可见高减少**（§0）：这是负责人要求的取舍。实测数字写进更新日志和 PROJECT.md 的 `tv_shellflow` S3 条目。
- **所有谱都要现算 `lbInfo`**：原来只有新建 / 导入的窗口才算，现在每次渲染都算。HTML 签名去重，量宽放在 `F.raf` 里；用 SB17 卡 2ms。长谱性能另见 §9.0 P2。
- **起步结束口径与字面不同**（§0、§2.3）：理由是三个最后一步在 `lbSteps` 里永远不打勾，需要主会话知悉。
- **`tv_landbar` 末尾的 flow 段必须动**：要么移到 `tv_sbar`，要么原地换选择器，二选一，由主会话定。
