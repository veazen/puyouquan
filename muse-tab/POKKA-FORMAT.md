# 谱客格式规范 v1（Pokka Score Format）

谱客 POKKA（pokka.cc）的开放曲谱格式。单个曲谱为一个 JSON 对象（文件扩展名 `.mtab.json`，MIME `application/json`），亦是谱客圈发布包的 `data` 字段内容。

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
| `measures` | Measure[] | 小节数组 |

## Measure（小节）

```
{ tabs: TabCol[][],  voxes: VoxCol[][],       // 按声部索引
  repeatStart, repeatEnd, sectionBar, finalBar, // 𝄆 𝄇 段落线 终止线
  dc, ds, fine, segno, coda,                    // D.C. D.S. Fine 𝄋 ⊕
  volta }                                       // 0/1/2 = 无/第一段/第二段
```

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
| `grace/graceA` | 前/后倚音 `{notes:[{deg,oct}×1..3], dur}` |
| `orn` | `up/down/tr/turn` 波音/颤音/回音 |
| `dyn` | 力度/速度：`ppp..ff/fp/sfp/cresc./dim./</>/rit./accel.` |
| `chord` | 功能谱和弦名（谱面按调号显示级数） |
| `lyrics` | 歌词数组（按行） |

## 和弦指法 shape 编码

字符串按 **低音弦→高音弦**（吉他 6→1 共 6 字符，尤克里里 4→1 共 4 字符）：
`x`=不弹，`0`=空弦，`1-9`=品位，10 品以上用小写字母（`a`=10, `b`=11, …base36）。
例：`x32010`=C（吉他），`0003`=C（尤克里里），`8aa988`=C 高把位 E 型。

## 谱客圈发布包（Circle Publication）

```
{ pid: "pub…",            // 发布唯一 ID
  libId, title, author,    // 来源与展示信息
  type: "guitar|uku|vox|func",
  price: number,           // 定价（0=免费）
  preview: number,         // 付费谱免费试读小节数
  pubAt: "YYYY/M/D HH:mm:ss",
  sales, tips, views,      // 销量 / 打赏 / 浏览
  data: <谱客格式 v1 对象>  // 发布时的内容快照
}
```

## 兼容性约定

- 读取端必须忽略未知字段；缺省字段按文档默认值处理（向前兼容）。
- `v` 提升时保证提供迁移函数（编辑器内置 `migrate()`）。
- 时间戳存证：对整个曲谱 JSON 字符串计算 SHA-256（`sha256:` 前缀十六进制）。
