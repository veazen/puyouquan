# 谱友圈格式规范 v1（Pu8 Score Format）

谱友圈 PYQ（puyouquan.com）的开放曲谱格式。单个曲谱为一个 JSON 对象（文件扩展名 `.mtab.json`，MIME `application/json`），亦是谱友圈发布包的 `data` 字段内容。

## 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `v` | number | 格式版本，当前为 `3`（规范 v1 对应数据版本 3） |
| `title` / `singer` / `lyricist` / `composer` / `maker` | string | 标题 / 演唱 / 作词 / 作曲 / 制谱 |
| `key` | string | 调号（`C`、`F#` 等，1=key） |
| `beats` / `unit` | number | 拍号：每小节拍数 / 以几分音符为一拍 |
| `tempo` | number | 速度 BPM |
| `capo` | number | 变调夹品位（0=不用） |
| `inst` | string | `guitar`（默认，6弦）或 `uku`（尤克里里，4弦 GCEA） |
| `func` | boolean? | `true`=功能谱（级数和弦） |
| `tabVoices` | string[] | TAB 声部名列表（空数组=无 TAB 行） |
| `voxVoices` | string[] | 简谱声部名列表 |
| `lyricLines` | number | 歌词行数 |
| `customChords` | object | 随谱和弦指法表 `{名称: shape}` |
| `mixer` | object? | 音轨配置 `{ "tab:0": {on,solo,inst,vol}, ... }` |
| `instKey` | string? | 乐器身份（v60.46 起，新建器乐谱写入；见下「乐器表」）：决定谱名「X谱（简谱 / 五线谱）」「X＋钢琴伴奏谱」、谱库「器乐（X）」归属、左栏图标与导出 MIDI / MusicXML 的 GM program。无键＝按音轨名推断（只读不回写） |
| `intent` | string? | v70.0 可选：建谱用途，取值只认 11 个 `gtr` 吉他弹唱 · `pacc` 钢琴伴奏 · `kids` 儿歌 · `vocal` 歌谱 / 合唱 · `teach` 教学对照 · `sight` 视唱 · `solo` 独奏 · `inst` 器乐 · `chord` 和弦 / 功能谱 · `blank` 空白 · `custom` 自选记谱法。新建时写一次（换谱类按规则改写），只在谱面推断有歧义时裁定归属（如「艺考视唱」专题只收 `sight`、`kids` 归儿歌），不进谱名；其他值读取端当没写（不剥除）。无键＝按谱面推断（老谱） |
| `voxClefOct` | (number\|null)[]? | v69.8 可选，按旋律声部下标：八度谱号 `-1`＝谱号下加 8（男高音「高音谱号下加 8」）/ `1`＝上加 8 / `null`＝无。只改五线谱显示（音高仍存实音）；无键＝无八度谱号 |
| `voxTransp` | (number\|null)[]? | v69.8 可选，按旋律声部下标：移调乐器的整数半音（实音 − 记谱，与 `transp` 同号向），−24…24 / `null`。**存实音**，只决定五线谱显示成记谱调与记谱音（♭B 单簧管 `-2`）；无键＝不移调显示。与整曲 `transp`（存记谱音）并存时 `transp` 照旧作用于发声、`voxTransp` 只叠加显示 |
| `rowNames` | number? | v69.8 可选：`1`＝印首行声部 / 乐器名（首系统全称、续行简称；花括号组只在中部写一次；本谱 ≥2 条旋律行且至少一条五线谱行时生效）；无键＝不印（老谱） |
| `voxShort` | (string\|null)[]? | v69.8 可选，按旋律声部下标：续行用的声部简称；`''` / `null`＝按全称自动取（Soprano→S.、Piano→Pno.、中文取前 2 字…）；无键＝全部自动 |
| `measures` | Measure[] | 小节数组 |

> 按旋律声部下标的数组（`voxClefOct` / `voxTransp` / `voxShort`，同 `voxNotations` / `voxDual`）长度须等于 `voxVoices`；不等长的数组由 `migrate()` 丢弃（旧版本增删声部后的兜底）。

### 乐器表（`instKey` 取值，28 键；v70.0 新增 6 键标 ★）

| 族 | 键 = 名称 |
|---|---|
| 弹拨（六线 / 四线谱，不写 `instKey`） | `guitar` 吉他 · `uku` 尤克里里 |
| 键盘（钢琴大谱表） | `piano` 钢琴 · `epiano` 电钢琴 · `synth` 电子琴 · `accordion` 手风琴 |
| 西洋管弦（默认五线谱） | `bass` 贝斯 · `violin` 小提琴 · `flute` 长笛 · `sax` 萨克斯 · `trumpet` 小号 · `horn` 圆号 · `trombone` 长号 · ★`cello` 大提琴（低音谱号）· ★`clarinet` 单簧管（按实音记，同萨克斯 / 小号） |
| 民乐 / 课堂乐器（默认简谱） | `erhu` 二胡 · `dizi` 笛子 · `hulusi` 葫芦丝 · `suona` 唢呐 · `guzheng` 古筝 · `pipa` 琵琶 · `yangqin` 扬琴 · `harmonica` 口琴 · ★`recorder` 竖笛 · ★`melodica` 口风琴 · ★`ocarina` 陶笛 · ★`xiao` 箫 |
| 其他 | `other` 其他器乐 |

> GM program（MIDI / MusicXML，0 起）：6 种新乐器写乐器本身的音色——竖笛 74、口风琴 22、陶笛 79、箫 77、大提琴 42、单簧管 71（混音台改过音色时按混音台）。读取端遇到不认识的键按无乐器身份处理（谱名「器乐谱」），键原样保留。
> MusicXML 往返（v70.0）：自家导出在 `<identification><miscellaneous>` 写 `pyq-intent`（有 `intent` 时）与 `pyq-instkey`（有 `intent` 且有 `instKey` 时；老谱输出不变），导入只认上表 / 11 个用途的合法值。

## Measure（小节）

```
{ tabs: TabCol[][],  voxes: VoxCol[][],       // 按声部索引
  repeatStart, repeatEnd, sectionBar, finalBar, // 𝄆 𝄇 段落线 终止线
  dc, ds, fine, segno, coda,                    // D.C. D.S. Fine 𝄋 ⊕
  volta,                                        // 0/1/2 = 无/第一段/第二段
  irr,                                          // v69.3 可选：1=不完整小节（MusicXML 导入时整小节各行都不满拍；时值检查豁免，同首小节 pickup）
  tempos }                                      // v69.8 可选：曲中速度变化 [{q, bpm, tempoUnit?, text?, hide?}]，按 q 升序（见下）
```

`tempos`（v69.8 可选）：本小节内的速度变化点。`q`＝自小节起点的偏移（以四分音符为单位，≥0）；`bpm`＝按 `tempoUnit` 计的速度；`tempoUnit`＝`'q'` / `'e'` / `'dq'`（缺省 `'q'`，同顶层 `tempoUnit`）；`text`＝印在 ♩= 前的速度文字（≤40 字，如 Più mosso）；`hide:true`＝只进播放不印。生效规则：按谱面线性位置取最后一个 ≤（小节, q）的点，没有就是顶层 `tempo`（D.C. 跳回开头自然回到初速）；第 0 小节 `q=0` 的点不存（并进顶层 `tempo`）。无键＝本小节没有速度变化。

## TabCol（TAB 列）

| 字段 | 说明 |
|---|---|
| `dur` | 时值：1/2/4/8/16/32 分 |
| `dotted` | 附点 |
| `tup` | 连音：3(记作1)/5/6/7 |
| `chord` | 和弦名（见指法表/内置库） |
| `notes` | `[{s:弦号1~6, f:品位0~24, x:切音?, tech:技法, tk:{mi,ci,si}连线目标}]` |
| `strum` | `'d'/'u'/'arp'/'arpd'` 扫弦/琶音，`strumN/strumTop/strumBot/strumAnchor` 覆盖弦范围 |
| `mute` / `slap` | 扫弦切音 / 拍弦 |

技法 `tech`：`sl`滑弦 `h`击弦 `p`勾弦 `b/bd`上下推弦 `v`揉弦 `hm`泛音 `tp`点弦 `pm`闷音 `su/sd/ou/od`无头无尾滑音。

## VoxCol（简谱列）

| 字段 | 说明 |
|---|---|
| `dur/dotted/tup` | 同上 |
| `deg` | 唱名 0~7（0=休止） |
| `acc` | `'#'/'b'/'n'` 升降还原 |
| `oct` | 八度 -3~+3 |
| `tie` | 连音线（连到下一列；连续 tie 渲染为跨越弧线） |
| `adds` | 同列和音（五线谱和弦 / 大谱表）：`[{deg,acc,oct,fing?,tie?}]`，最多 3 个；`tie`（v69.3 可选）=该和音单独连到下一列同音高（五线谱画附加音连音弧，播放 / MIDI 合并为长音，MusicXML 逐音 `<tie>`） |
| `grace/graceA` | 前/后倚音 `{notes:[{deg,oct}×1..3], dur, slash?}`；`slash`（v69.8 可选，只对前倚音）：`false`＝不画斜线的长倚音（拍上奏出、占倚音时值，主音推后），无键＝带斜线的短倚音（老谱全部如此） |
| `orn` | `up/down/tr/turn` 波音/颤音/回音 |
| `dyn` | 力度/速度：`ppp..ff/fp/sfp/cresc./dim./</>/rit./accel.` |
| `chord` | 功能谱和弦名（谱面按调号显示级数） |
| `lyrics` | 歌词数组（按行） |
| `syl` | v69.8 可选：歌词音节位掩码数组，与 `lyrics` 按段下标对齐——`1`＝连字符（与本段下一个音节同属一个词，如 A-ve）、`2`＝延长线（本音节后拖腔）、`3`＝两者；末尾的 0 截掉、全 0 删键，只在该段歌词非空时有效。无键＝单独音节、无延长线 |
| `tieSlur` | v69.8 可选：`true`＝`tie` 这一环来自圆滑线——与下一列同音高也要重奏（播放 / MIDI 不合并，MusicXML 写 `<slur>`）；无键＝同音高按连音线合并（老口径） |
| `trem2` | v70.4 可选：双音震音杠数 1–4（八分 / 十六分 / 三十二分 / 六十四分交替），只写在一对的**第一个**音上。一对＝本列与下一列都是有音高的音、都带 2:1 连音（`tup:2, tupM:1`，时值载体：两个音各写全长，合起来占一个音的时值）。五线谱按 Gould 两音震音刻版（不印连音数字、杠在两符干之间；二分 / 全音符杠不接符干），简谱按实际时值画两个音、中间画震音斜杠，播放 / MIDI 两音交替，MusicXML 读写 `<tremolo type="start|stop">`。不成对（缺第二个音、被删改过）＝当没写；无键＝普通 2:1 连音（印「2」） |

## 和弦指法 shape 编码

字符串按 **低音弦→高音弦**（吉他 6→1 共 6 字符，尤克里里 4→1 共 4 字符）：
`x`=不弹，`0`=空弦，`1-9`=品位，10 品以上用小写字母（`a`=10, `b`=11, …base36）。
例：`x32010`=C（吉他），`0003`=C（尤克里里），`8aa988`=C 高把位 E 型。

## 谱友圈发布包（Circle Publication）

```
{ pid: "pub…",            // 发布唯一 ID
  libId, title, author,    // 来源与展示信息
  type: "guitar|uku|vox|func",
  price: number,           // 定价（0=免费）
  preview: number,         // 付费谱免费试读小节数
  pubAt: "YYYY/M/D HH:mm:ss",
  sales, tips, views,      // 销量 / 打赏 / 浏览
  data: <谱友圈格式 v1 对象>  // 发布时的内容快照
}
```

## 兼容性约定

- 读取端必须忽略未知字段；缺省字段按文档默认值处理（向前兼容）。
- 可选字段只写非缺省值，回到缺省就删键（不写 `false` / `0` / 空数组）：没用到新字段的曲谱 JSON 与旧版逐字节相同。v69.8 新增 8 个：`col.syl`、`grace.slash`、`mea.tempos`、`col.tieSlur`、`voxClefOct`、`voxTransp`、`rowNames`、`voxShort`——旧版本打开新谱时忽略它们，退回不画连字符 / 斜线照画 / 整曲一个速度 / 同音按连音线 / 实音显示 / 不印声部名。v70.0 新增 1 个：`intent`（旧版本忽略、原样保留，按谱面推断归属）；`instKey` 只增 6 个取值（v69.9 打开时键原样保留，谱名退成「器乐谱（简谱 / 五线谱）」、图标退成其他器乐 / 人声，谱面与播放不受影响）。v70.4 新增 1 个：`col.trem2`（双音震音；旧版本忽略，退回 2:1 连音「2」的显示与播放，时值不变；清洗表 SAN_NUM / SD_NUM 登记为数值字段）。
- `v` 提升时保证提供迁移函数（编辑器内置 `migrate()`）。
- 时间戳存证：对整个曲谱 JSON 字符串计算 SHA-256（`sha256:` 前缀十六进制）。
