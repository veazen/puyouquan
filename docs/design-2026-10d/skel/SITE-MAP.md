# 官网色调骨架 · 盘点与落地图（muse-tab/site/）

> 方案阶段产物，仓库未改动。骨架＝`skel/site-skel.css`；令牌值＝现行「素材配色」现色，套上后零视觉变化。
> 设计师换色：只改 `site-skel.css` 头部 `@@TOKENS-BEGIN … @@TOKENS-END` 之间的令牌值（浅色一块、深色两块内容保持一致）。

## 0. 文件与用法

| 文件 | 作用 |
|---|---|
| `skel/site-skel.css` | 骨架：四态令牌块（`:root,:root[data-theme="light"]` ／ `@media dark` + `:root:not([data-theme="light"])` ／ `:root[data-theme="dark"]`）+ 11 组覆盖规则 H1–H11 |
| `skel/site-probe.css` | 同骨架，令牌头换成刺眼测试色板（`mkprobe.py` 由 `probe-tokens.css` + `probe-dark.txt` 生成） |
| `skel/xsite.js` | 扩展验证：17 个页面/状态 × 明暗两主题，整页截图 + 全元素（含 ::before/::after）颜色类计算值 + 7 类 hover 态；`probe` 参数再出全页旧色 hits |
| `skel/xdiff.py` / `skel/diff.py` | 像素差 + 计算样式差 + hover 差 |
| `skel/unchanged.py` | 「换了测试色板仍不变的彩色值」清单（找出不走令牌的颜色） |
| `skel/site-pairs.json` | 现色板对比度对照（`node ../contrast.js --pairs site-pairs.json`），换色后把值替换再跑 |

骨架覆盖规则里，页面内联 `<style>`（make.html / log-full.html）的覆盖都加了 `body` 前缀：即使并进 `pyq.css`（加载早于内联块），特异性也压得过。

## 1. 令牌表

### 1.1 与编辑器同名的通用令牌

| 令牌 | 浅 | 深 | 用途 |
|---|---|---|---|
| `--bg` | `#f3f0e8` | `#181a17` | 页面画布（body 底） |
| `--panel` | `#fefdf9` | `#262924` | 卡片 / 弹窗 / .sec.alt 区块底 |
| `--toolbar` | `#f7f4ec` | `#1e211d` | 次级栏底（课程工作台大纲树、内容体检表头） |
| `--paper` | `#fbfaf5` | `#fbfaf5` | 谱纸（演示窗 .window/.shot .body；两主题都亮） |
| `--ink` | `#141414` | `#141414` | 谱纸上的记谱墨色（make.html 演示 SVG）；保持黑/近黑 |
| `--glass` | `rgba(251,250,245,.82)` | `rgba(24,26,23,.78)` | 顶部导航毛玻璃底、课程页手机端吸顶条 |
| `--hover` | `rgba(80,65,40,.06)` | `rgba(255,255,255,.06)` | 行/钮 hover 洗色（浅色版带暖调） |
| `--text` | `#20211d` | `#edefe8` | 正文 |
| `--muted` | `#6b6357` | `#a89f90` | 次级文字 |
| `--faint` | `#746c5e` | `#9a9284` | 三级文字（tv_b7a 要求对 bg/panel ≥4.5） |
| `--border` | `#e4ddcd` | `#3b3e37` | 主描边（输入框、按钮描边） |
| `--border-soft` | `#ece6d8` | `#33362f` | 弱描边（卡片、分隔线、导航底线） |
| `--fill` | `color-mix(--text 5%, transparent)` | 同式 | 中性静底（谱种 chip `.fchip`） |
| `--fill-2` | `var(--border-soft)` | `var(--border-soft)` | 轨道/格子底（课程进度条、进度环底、打卡周格、章进度条） |
| `--accent` | `#c33a29` | `#df5a45` | 强调色（文字链接、选中、图标、描边强调） |
| `--accent-2` | `#d24a37` | `#e86a55` | 强调辅色（toast 按钮字） |
| `--accent-3` | `#e2705d` | `#f08874` | 强调三色（更新日志时间线渐变） |
| `--accent-soft` | `rgba(195,58,41,.10)` | `rgba(223,90,69,.16)` | 强调淡底（菜单当前项、标签、提示条） |
| `--accent-ink` | `#b02f20` | `#ef8471` | 强调深字（淡底上的强调文字） |
| `--btn-pri` | `#c33a29` | `#c33a29` | 主按钮实底（白字 ≥4.5；深色主题与浅色同值） |
| `--btn-pri-h` | `#b02f20` | `#b02f20` | 主按钮 hover |
| `--focus` | `#c33a29` | `#ef8471` | 焦点环（全站 `:focus-visible` 2px 实线） |
| `--grad-2` | `#d24a37` | `#e86a55` | 品牌渐变中段 |
| `--grad-3` | `#e2705d` | `#f08874` | 品牌渐变尾段 |
| `--grad` | `linear-gradient(96deg, --accent, --grad-2 55%, --grad-3 110%)` | 同式 | Logo 方块、标题渐变字、kicker 横杠、步骤序号、头像底、赞助档位边 |
| `--chrome` | `#1f3a34` | `#16281f` | 深色框架底（CTA 横幅、课程工作台 toast） |
| `--chrome-2` | `rgba(246,243,234,.12)` | 同 | 框架上的抬升/悬停（CTA 幽灵钮 hover） |
| `--chrome-line` | `color-mix(--chrome 70%, --border-soft)` | 同式 | 框架描边（CTA 横幅外缘） |
| `--chrome-text` | `#f6f3ea` | `#f6f3ea` | 框架上的主文字 |
| `--chrome-muted` | `rgba(246,243,234,.72)` | 同 | 框架上的次级文字 |
| `--glow` | `transparent` | `transparent` | 可选微光：CTA 横幅右上角新增一层 radial 渐变读它（默认透明＝零变化）；不得用 box-shadow 实现（tv_site T11） |
| `--play-band` | `color-mix(--accent 12%, transparent)` | 同式 | 播放高亮带：官网暂未使用（课程谱例跟读高亮走 `--fam`），保留同名供以后看谱组件 |
| `--danger` | `#c0392b` | `#ef7060` | 危险/驳回（注：官网现为红，编辑器为琥珀 `#b45309/#ffa424`） |
| `--ok` | `#1d7a40` | `#6fc98d` | 对/通过 |

### 1.2 状态与分类（语义令牌，默认不随品牌换）

| 令牌 | 浅 | 深 | 用途 |
|---|---|---|---|
| `--warn` | `#b7791f` | `#e5b45a` | 待审（.k-wait、课程工作台警示） |
| `--ok-soft` | `rgba(29,122,64,.10)` | `rgba(111,201,141,.14)` | 答对淡底 |
| `--bad` | `#b02f20` | `#ef8471` | 答错 / 录音中红点（值恰为旧朱砂深字，语义是「错」，换品牌色后仍应是红） |
| `--bad-soft` | `rgba(176,47,32,.09)` | `rgba(239,132,113,.15)` | 答错淡底 |
| `--star` / `--star-off` | `#8f6a1e` / `#c4b9a0` | `#e5b45a` / `#565a50` | 星级 |
| `--fam-g` | `var(--accent)` | `var(--accent)` | 吉他族（弹唱/独奏/尤克里里/和弦）＝**跟随强调色** |
| `--fam-p` / `--fam-v` / `--fam-f` | `#33587a` / `#2f6d4f` / `#a8762a` | `#7ea6c9` / `#6fae8b` / `#cfa05a` | 钢琴族墨蓝 / 人声族墨绿 / 功能族赭金（封面洗色、类型标签、印章、课程卡） |
| `--fam-on` | `#fff` | `#181a17` | 族色实心块上的字 |
| `--fam-g-ink` | `var(--btn-pri)`（原写死 `#c33a29`） | `var(--fam-g)` | 吉他族实心块底 |
| `--fam-p/v/f-ink` | `#33587a` / `#2f6d4f` / `#8a6410` | `var(--fam-p/v/f)` | 其它族实心块底 |

> 注意：强调色若换成蓝，`--fam-g`（跟随强调）会与 `--fam-p` 墨蓝撞色，谱库里「弹唱谱」「钢琴谱」两族分不开。设计师二选一：把 `--fam-g` 改成独立定值（如保留一支暖色作「吉他族」分类色），或把 `--fam-p` 换一个色相。

### 1.3 官网独有令牌（`--site-` 前缀）

| 令牌 | 浅 | 深 | 用途 |
|---|---|---|---|
| `--site-halo` | `color-mix(--accent 7%, transparent)` | 同式 | body 顶部径向光晕 |
| `--site-cta-end` | `color-mix(--chrome 82%, --accent)` | 同式 | CTA 横幅渐变尾色 |
| `--site-on-chrome-line` | `rgba(246,243,234,.4)` | 同 | 框架上的描边（CTA 幽灵钮边框） |
| `--site-toast-text` | `#f2efe6` | 同 | 课程工作台 toast 文字（与 --chrome-text 差 4 级，落地可并入） |
| `--site-code-bg` / `-text` / `-muted` | `#20241f` / `#e8e4d8` / `#9aa08f` | 同 | 课程内容「代码块」深底 / 代码字 / 标题条字 |
| `--site-scrim` | `rgba(20,18,15,.42)` | 同 | 登录/个人中心弹窗遮罩（暖黑） |
| `--site-free` | `#2f9e57` | 同 | 谱卡「免费」价签（语义绿；现对比度不达标，见 §8） |
| `--site-paper-muted` | `#6b6357` | 同 | 谱纸上的次级字（make.html 演示窗标题；纸两主题都亮，故不随主题） |
| `--site-paper-fill` / `-line` | `rgba(20,20,20,.05)` / `rgba(20,20,20,.1)` | 同 | 谱纸上的分段控件底 / 描边 |
| `--site-paper-raise` | `#fff` | 同 | 谱纸上分段控件选中块 |
| `--site-log-line` | `#e6e2d8` | 同 | 完整更新日志分隔线（原 `var(--line,#e6e2d8)`，`--line` 官网未定义，一直走暖米兜底；深色主题下是一条亮线，落地建议直接改 `var(--border-soft)`） |

## 2. 热点清单（写死 / 按主题写死 → 改读令牌）

行号按当前 HEAD 的 `muse-tab/site/`。「骨架」列＝`site-skel.css` 中对应规则编号。

### 2.1 令牌块本身（落地时整块替换成骨架令牌头）

| 位置 | 现值 | 处理 |
|---|---|---|
| pyq.css:6–20 `:root` | 表面/文字/描边/朱砂族/`--chrome:#1f3a34`/`--glass`/`--grad`（读 --accent-2/-3）/`--btn-pri`/`--focus` | 骨架头接管；`--grad` 改读 `--grad-2/--grad-3`（与编辑器同名） |
| pyq.css:21–30 dark media、31–40 `[data-theme=dark]` | 深色表面、`--chrome:#16281f` | 骨架头接管 |
| pyq.css:513–533 v58.8 `:root` | `--fam-*`、`--faint`、`--hover`（暖调 `rgba(80,65,40,.06)`）、`--accent-ink`、`--star*`、`--ok*`、`--bad*`、`--fam-on`、**`--fam-g-ink:#c33a29`（写死朱砂）** | 骨架头接管；`--fam-g-ink` 改 `var(--btn-pri)` |
| pyq.css:534–548 两块深色 | 同上深色值、`--focus:#ef8471` | 骨架头接管 |
| pyq.css:692–694 | `--danger:#c0392b/#ef7060`、`--warn` | 骨架头接管 |
| pyq.css:913–932 | 少儿课程章色 `--kh0…kh5`、`--kh*i` | **保留不动**（语义，见 §4） |

> 落地注意：pyq.css 里这些令牌块分散在三处，后面的块会覆盖前面的；整合时把 513–548、692–694 两处删掉并入文件头，否则骨架头若放在文件开头会被它们压回旧值。

### 2.2 写死字面量

| 骨架 | 位置 | 选择器 | 现值 | 改读 |
|---|---|---|---|---|
| H1 | pyq.css:50 | `body` background-image | `color-mix(--accent 7%)` 径向光晕 | `--site-halo` |
| H2 | pyq.css:237 | `.cta-band` 底 | `linear-gradient(120deg, --chrome, color-mix(--chrome 82%, --accent))` | `--chrome` + `--site-cta-end`；新增透明 `--glow` 层 |
| H2 | pyq.css:238 | `.cta-band` 边 | `color-mix(--chrome 70%, --border-soft)` | `--chrome-line` |
| H2 | pyq.css:239 | `.cta-band h2` | `#f6f3ea` | `--chrome-text` |
| H2 | pyq.css:240 | `.cta-band p` | `rgba(246,243,234,.72)` | `--chrome-muted` |
| H2 | pyq.css:241 | `.cta-band .btn.ghost` | `#f6f3ea` / 边 `rgba(246,243,234,.4)` | `--chrome-text` / `--site-on-chrome-line` |
| H2 | pyq.css:242 | `.cta-band .btn.ghost:hover` | `rgba(246,243,234,.12)` | `--chrome-2` |
| H3 | pyq.css:1678 | `.crs-toast` | `var(--chrome,#20241f)` / `#f2efe6` | `--chrome` / `--site-toast-text` |
| H3 | pyq.css:1680 | `.crs-toast button` | `var(--accent-2,#d24a37)` | `--accent-2`（去掉朱砂兜底） |
| H4 | pyq.css:650 | `.cr-badge:hover` | `rgba(195,58,41,.09)`（两主题同值） | `color-mix(--btn-pri 9%, transparent)` |
| H4 | pyq.css:666 / 698 | `.me-gocr:hover` / `.me-goad:hover` | `rgba(195,58,41,.08)` | `color-mix(--btn-pri 8%, transparent)` |
| H5 | pyq.css:669–674 | `@keyframes crFlash` | `rgba(195,58,41,.42)` → `rgba(195,58,41,0)` | `color-mix(--btn-pri 42%/0%, transparent)` |
| H6 | pyq.css:308 | `.pyq-mask` | `rgba(20,18,15,.42)` | `--site-scrim` |
| H7 | pyq.css:286 | `.cc-price.free` | `#2f9e57` | `--site-free` |
| H8 | pyq.css:1447 | `.lb-code` | `#20241f` | `--site-code-bg` |
| H8 | pyq.css:1448 | `.lb-code figcaption` | `#9aa08f` | `--site-code-muted` |
| H8 | pyq.css:1450 | `.lb-code code` | `#e8e4d8` | `--site-code-text` |
| H9 | pyq.css:591 | `.fchip` 静底 | `color-mix(--text 5%)` | `--fill` |
| H9 | pyq.css:846 | `.kc-bar` | `var(--border-soft)` | `--fill-2` |
| H9 | pyq.css:958 | `.kcp-ring .kcr-bg` stroke | `var(--border-soft)` | `--fill-2` |
| H9 | pyq.css:1039 | `.kcp-chbar` | `color-mix(--fam 14%, --border-soft)` | `color-mix(--fam 14%, --fill-2)` |
| H9 | pyq.css:1166 | `.kcp-wd` | `var(--border-soft)` | `--fill-2` |
| H10 | make.html:31 | `.demo-head .cap` | `#6b6357` | `--site-paper-muted` |
| H10 | make.html:32 | `.seg` | 底 `rgba(20,20,20,.05)` / 边 `rgba(20,20,20,.1)` | `--site-paper-fill` / `--site-paper-line` |
| H10 | make.html:33 | `.seg button` | `#6b6357` | `--site-paper-muted` |
| H10 | make.html:34 | `.seg button.on` | 底 `#fff` | `--site-paper-raise` |
| H11 | log-full.html:14 | `.logfull li` 下边线 | `var(--line,#e6e2d8)` | `--site-log-line` |

已走令牌、无需改但「品牌感最重」的位置（换令牌即跟着变，供设计师预判观感）：`.brand .mark`（pyq.css:62，--grad）、`.btn`（78，--btn-pri）、`#menu a.on`（73）、`.kicker` 与横杠（98–99）、`.tile`（111–112）、`.card:hover` 顶部渐变条（108–110）、`.lib-search input:focus`（361）、`.cc-type`/`.cc-cover` 封面洗色（559–562，--fam）、谱卡封面 SVG（pyq.js:142 `S='var(--fam)'`，属性里的 var() 生效）、`.tier.hot` 渐变边（204）、`.stat b`/`.tier .pr` 渐变字（210/224）、`.timeline`（159–166）、`.acct-av`（300，--grad）、`.ad-tab.on`/`.ad-b.ok`（711/729）。

不需要动的兜底写法：log-full.html:15 `var(--accent-ink,#6b4a1a)`（--accent-ink 已定义，兜底从不生效）；pyq.css:1713 `.mp-note` `var(--ink,#222)`/`var(--paper,#fff)`（同理）。

## 3. 够不着清单（CSS 覆盖不到，落地需改 JS / 图片 / 模板）

| 什么 | 在哪 | 为什么 |
|---|---|---|
| 8 枚预设头像（渐变色对 `#d24a37→#c33a29`×2、`#44688c→#33587a`×2、`#3c7f5f→#2f6d4f`×2、`#b98738→#a8762a`×2，白描边 `#fff`） | pyq.js:47–64（`AV_SVG`/`P8`） | JS 拼 SVG 转 base64 data URI 塞进 `<img>`；且用户选中后 data URI 原样存进账号 avatar（me.html:223 `saveAv(PYQ_AV.PRESETS[i])`）——改 JS 只影响以后选的人，已存头像不变 |
| og.png（1200×630，主色 `#385ae0` 蓝 + `#faf8f4` 纸，比现色板还早一代） | site/og.png；index/features/help/jixing/kaobian/kecheng/log/make/shifan/sponsors 的 `og:image`；api/server.js:550 课程页 | 位图，需重新出图 |
| share-icon.png（512²，朱砂 `#d24a37` 族） | site/share-icon.png；编辑器 muse-tab/index.html:28 `og:image`、:23704 微信分享 `imgUrl` | 位图，需重新出图 |
| bundle-help.png（近白中性 `#fafafc`） | site/bundle-help.png | 位图；无品牌色，仅登记 |
| 跳转占位页内联色：body 底 `#f3f0e8`、字 `#6b6357`、链接 `#c33a29` | view.html:13–14 | 该页不引 pyq.css（0 秒跳转），骨架进不去；落地直接改 html |
| 头像压缩画布白底 `#fff` | me.html:233 `cx.fillStyle='#fff'` | canvas 像素；语义保留（透明图转 JPEG 的白底） |
| 服务端 SSR：曲谱落地页 `/pub/:id` | api/server.js:466 `:root{--ink:#141414;--muted:#8a8a8a;--accent:#3a5ce0;--paper:#faf8f4;--border:#e5e2dc}`（`pubSsrHtml`） | 不在 site/，服务端模板内联 `<style>`；还是旧蓝色板 |
| 服务端 SSR：曲谱分享卡 SVG（og 图） | api/server.js:618–633（`pubCoverSvg`：`#3a5ce0` 顶条/八度点/文案、`#141414`、`#8a8a8a`、`#faf8f4`） | 服务端生成的图片 |
| 服务端 SSR：课程详情 `/course/:id` | api/server.js:554 `:root{--ink:#20211d;--muted:#6b6357;--accent:#c33a29;--bg:#f3f0e8;--panel:#fefdf9;--border:#e4ddcd}`、:566 `rgba(195,58,41,.10)`（`courseSsrHtml`） | 服务端模板；朱砂 + 暖米写死 |
| 服务端 SSR：课程目录 `/course/` | api/server.js:599–606（`#20211d`/`#f3f0e8`/`#fefdf9`/`#e4ddcd`/`#c33a29`/`#6b6357`，`courseIndexHtml`） | 同上 |
| 服务端 SSR：曲谱目录 `/pub/` | api/server.js:1416–1423（`#141414`/`#faf8f4`/`#8a8a8a`/`#3a5ce0`/`#e5e2dc`） | 同上 |
| 微信扫码登录二维码页 | res.wx.qq.com iframe | 第三方 |

## 4. 语义色保留清单（不随品牌换）

- 微信绿 `#07c160` / `rgba(7,193,96,.35)`：pyq.css:319、416–417、463（`.lg-wx`、`.wx-chip`）
- 收藏心 `#e0395a`：pyq.css:368（`.fchip.fav.on`）
- 窗口「红绿灯」`#ff5f57` `#febc2e` `#28c840`：pyq.css:152（`.shot .tbar i`）、make.html:26（`.window .tbar i`）——红点会被探针记为「朱砂」，属预期残留
- 状态：`--danger`、`--warn`、`--ok`/`--ok-soft`、`--bad`/`--bad-soft`（见 §1.2）。官网 `--danger` 现为红 `#c0392b`，编辑器为琥珀 `#b45309`；强调色换成冷色后，红与强调色已能区分，可维持红，也可与编辑器统一成琥珀——但必须与新强调色色相明显区分
- 答题判定字面量：pyq.css:889 `.kq-opt.ok`（`#2f9e57`/`rgba(47,158,87,.10)`/`#1d7a40`）、890 `.kq-opt.bad`（`#c33a29`/`rgba(195,58,41,.08)`/`#b02f20`）——「对/错」语义，值恰好等于旧朱砂，**不能接 --accent**；落地可顺手改读 `--ok/--ok-soft`、`--bad/--bad-soft`（值有细微差）
- 星级：`--star`/`--star-off`；旧版课程写死金色 `#f6c445`（877、896）、`#c99a1f`（878、1389、1420）、`#e6b422`（1401、1411）
- 谱类四族 `--fam-p/v/f`（+ `-ink`）：分类色；`--fam-g` 跟随强调色（属品牌）
- 少儿课程一章一色 `--kh0…kh5` / `--kh0i…kh5i`（pyq.css:913–932；tv_site T17c 断言各章色相互不同、小节继承章色）
- 白字 `#fff` 在实底主按钮、族色实心块上（`.btn`、`.lg-btns .primary`、`.vip-badge`、`.ad-tab.on`、`.ad-b.ok`、`.kc-*` 实心钮等）：无障碍规定白字对 `--btn-pri` ≥4.5:1，换色时调 `--btn-pri` 而不是改字色
- 谱纸 `--paper` 与墨色 `--ink`：记谱保持黑/近黑在纸上；纸底可换中性白，打印/导出仍白底黑字
- 中性字面量（无色相，留着即可）：`.bb-x:hover rgba(0,0,0,.06)`（771）、`.kc-emoji` drop-shadow `rgba(0,0,0,.12)`（836）、`.kcp-drawer rgba(20,20,20,.42)`（1016）、`.lb-code figcaption rgba(255,255,255,.05)`（1448）、`.logfull code rgba(0,0,0,.05)`（log-full.html:16）、`.brand .mark` 白色谱线/圆点（62–67）
- 免费价签绿 `--site-free`（语义「免费」）

## 5. 小程序色值登记（只登记，不改；web-view 内的官网页随骨架换）

| 文件:行 | 现值 | 角色 → 对应官网令牌 |
|---|---|---|
| miniprogram/app.json:10 | `navigationBarBackgroundColor:#1f3a34`（:11 文字 white） | 原生导航条＝`--chrome` 浅色值 |
| miniprogram/app.json:12 | `backgroundColor:#f3f0e8` | 下拉露底＝`--bg` |
| pages/login/login.wxss:2 | 注释「朱砂 #c33a29 / 暖米底 #f3f0e8」 | — |
| login.wxss:3 | `page{background:#f3f0e8}` | `--bg` |
| login.wxss:6 | `.mark` `linear-gradient(96deg,#c33a29,#d24a37 55%,#e2705d)` | `--grad` |
| login.wxss:7、9、27 | `#fff`（Logo 谱线/圆点、勾选框） | 白 |
| login.wxss:10、13 | `#20211d` | `--text` |
| login.wxss:11、14、22 | `#6b6357` | `--muted` |
| login.wxss:16–17 | `.go` 底 `#c33a29` 字 `#fff` | `--btn-pri` |
| login.wxss:18 | `.err` `#c0392b` | `--danger` |
| login.wxss:20 | `.alt` 字/边 `#c33a29` | `--accent` |
| login.wxss:25 | `.tos` `#8a8378` | 近 `--faint` |
| login.wxss:26 | `.box` 边 `#b9b1a2` | 近 `--border` |
| login.wxss:28–29 | `.box.on` / `.lk` `#c33a29` | `--accent` |
| pages/index/index.wxml:4、pages/score/score.wxml:3 | 内联 `color:#1f3a34`（朋友圈预览标题） | `--chrome` 作字色 |
| index.wxml:6–8、score.wxml:5–7 | `#666` / `#999` | 中性灰 |

上传版本号走小程序 1.1.x 线（见 miniprogram/README.md），同步时另行出包。

## 6. 落地时要同步的测试断言线索（muse-tab/tests）

| 文件:行 | 用例 | 断言内容 | 换色影响 |
|---|---|---|---|
| tv_b7a.js:31–40 | T1 浅/深主题：--faint、当前页签、主按钮文字均达 AA | 编辑器 `--faint` 对 bg/panel/toolbar ≥4.5；`.dtab.on` ≥4.5；主按钮实底（无 background-image）白字 ≥4.5 | 新值须满足 |
| tv_b7a.js:81–90 | T5 主题刷新后保持（编辑器 + 官网）；官网 --faint 达 AA、主按钮实底 | 官网 `--faint` 对 `--bg/--panel` ≥4.5；`.btn` 无渐变、白字 ≥4.5 | 新值须满足；`.btn` 不能改成渐变底 |
| tv_site.js:520–544 | T11 全站扁平化（按钮/LOGO/卡片零投影 + --shadow 令牌置 none） | `.btn,.brand .mark,.cc-card,.tool-card,.card,.lib-search input,.nav-login,.fchip` 无偏移投影；`--shadow`/`--shadow-sm` 为 none | 「科技感微光」只能走 background-image（骨架的 `--glow` 层），不能用 box-shadow 发光 |
| tv_site.js:186–192 | T1a 刻版封面（六线+TAB印章+家族色） | `.cc-card` 的 `--fam` 非空 | 不改 `--fam` 机制即可 |
| tv_site.js:1036–1064 | T17c v62.2 少儿科普风：一章一色循环+小节继承章色… | 六章 `--fam` 互不相同，小节 `--fam` 等于章色 | 别把 `--kh*` 统一成品牌色 |
| tv_vwmob.js:48 | T2 红星点亮+回弹（朱砂 #c33a29） | 编辑器看谱页收藏星 `fill === 'rgb(195, 58, 41)'` | 编辑器侧：强调色换后断言要改（或把收藏星定为语义色不随品牌） |
| tv_v66a.js:70 | T7 深色主题打印：刻版灰字回浅色值 | 编辑器打印时 `#paper` 的 `--muted === '#6b6357'` | 编辑器侧：改谱面刻版灰时同步 |
| tv_v66a.js:62–64 | T6 谱面令牌隔离层：零视觉变化；改 --sc-pen 只动谱面 | 编辑器 #paper 内外 --accent 等值一致 | 编辑器侧 |

grep 结果：tests 里没有其它地方直接写 `#c33a29`/`rgb(195, 58, 41)`/`#1f3a34`/`#f3f0e8` 等旧色值；deploy/ 下的语法闸与冒烟脚本也不查颜色。

## 7. 验证结果

**零变化（令牌＝现色）**
- harness S1–S6 对 `tc/base/` 同名 PNG：6/6 张逐像素完全一致（平均差 0.00000，变化像素 0）。
- 扩展验证 `xsite.js`（17 个页面/状态：首页、首页登录弹窗、考编、制谱、功能、帮助、日志、完整日志、赞助、艺考、个人中心未登录/管理员、管理控制台、课程管理、学习列表、两门课程页展开小节 × 明暗两主题，整页 1x）：34 张里 33 张逐像素一致；light-sponsors 导航毛玻璃区有 ≤2/255 抖动（backdrop-filter 采样噪声，该区令牌值未变）。全元素（含 ::before/::after）17 个颜色类属性的计算值逐一比对：唯一差异是 `.cta-band` 的 background-image 多了一层透明 `--glow` 渐变（像素一致）。7 类 hover 态计算值一致。

**覆盖率（刺眼测试色板 `site-probe.css`）**
- harness：S1 0、S2 0、S3 0、S4 2、S5 0、S6 0。S4 的 2 处＝演示窗红绿灯的红点 `#ff5f57`（语义）。
- 全站 34 次探针：残留只有 ①谱卡/课程卡封面的赭金 `--fam-f`、墨绿 `--fam-v` 洗色（分类色）；②课程页 `--kh1i` 青绿章色；③红绿灯红点。
- 「换色板后仍不变的彩色值」审计（`unchanged.py`）：只剩 `--kh*` 章色、`--fam-p/v/f`、星级金、微信绿、`--ok`/`--bad`/`--warn`——全部在 §4 语义清单内。

## 8. 现色板对比度（`site-pairs.json`，供换色后复跑）

现状不达标三项（与本骨架无关，换色时顺手修）：
- `--site-free #2f9e57` 免费价签：浅 3.36:1、深 4.32:1（<4.5）
- 深色 `--accent #df5a45` 作链接字在 `--panel #262924` 上 3.99:1（在 `--bg` 上 4.74 达标）

其余（正文/muted/faint 对 bg/panel/toolbar、白字对 btn-pri、焦点环 ≥3、chrome 上的字）均达标。

## 9. 落地步骤建议

1. 用骨架令牌头替换 pyq.css:6–40，并删掉 513–548、692–694 两处后续令牌块（`--kh*` 保留）；
2. 按 §2.2 把字面量就地改成 `var(--…)`（pyq.css + make.html + log-full.html），或把骨架 H1–H11 规则原样追加到 pyq.css 末尾（make/log-full 两条已带 body 前缀）；
3. view.html、api/server.js 的 SSR 页、og.png/share-icon.png、预设头像按 §3 单独处理；小程序按 §5 另行同步；
4. 跑 tv_site、tv_b7a、tv_a4/a5/a5b/pubsnap（官网相关）+ tv_matrix；按 §6 修编辑器侧断言。
