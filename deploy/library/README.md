# 曲库官方公版谱（v69.3 起）

谱友圈曲库里「谱友圈官方」账号（`official0000`）发布的公版名曲。服务端启动时 `api/db.js` 的 `seedLibrary()` 读 `api/seed-library.json`，按 id（`lib-` 前缀）补种（记在 `seed_log` 表）：
- 新曲目：一首一个事务，直接发布并带快照；中途出错整首回滚，下次重启再补
- **随发版刷新**：本函数自己种下（`seed_log.at` 等于谱的 `created_at`）、仍在架、从没被人改过的官方原样谱，内容与 `seed-library.json` 不一致时换成仓库版本（发布时间不变）——导入器改进后重新生成并上线即可生效
- 管理员下架 / 删掉的不动、不复活
- `lib-` 前缀留给官方：普通用户不能新建这种 id（v69.3 起 PUT 400）；v69.3 前已被别的账号占用的，把那份谱连同收藏 / 点赞 / 谱架 / 谱集 / 举报引用改到新 id（`sq…`，人家的数据不丢），官方谱照常补种，日志报出
- 官方账号下手工建的同 id 谱：记为种过、不覆盖，以后也不刷新

谱库展示：`singer` 列放作曲者（服务端搜索按「舒伯特」搜得到；官网首页与编辑器谱友圈的本地即时搜索也把 `composer` 算进去），谱面里 `singer` 空、`composer` 有值——卡片 / 落地页 / 封面 / JSON-LD 认作「作曲」，不会写成「X 演唱」。

## 收录规则

- **只收 CC0 / 公有领域**：OpenScore Lieder Corpus（CC0 1.0）。**不收** CC BY-SA（相同方式共享会传染到整个曲库条目）、任何 NC（非商用）许可、来源不明的谱。
- 每首必须过 `deploy/build-library.js` 的质量门，否则整个构建失败、不写文件：
  1. 音高：源文件与「导入 → 再导出」逐小节比音高多重集（不含倚音），一个小节都不能差
  2. 时值：`beatErrors()` 为 0（弱起 / 不完整小节由导入标记 `pickup` / `measures[].irr` 豁免）
  3. 不丢：`skip.parts / voices / notes` 都为 0。v70.3 起扩口径（基石方案 `docs/plan-2026-11-foundation.md` §3.1 B4）：`skip.parts / voices / notes / lyrics / slurs` 与 `skip.other` 按名（`skip.otherBy`，导入台账 `MXL_LED`）逐项与条目的 `skipAllow` 相等——没写的全 0；写了的要有 `why` 与 `signed`（by / date）逐曲签字。计数多了或少了都不过门：导入器改进后白名单跟着改、重新签（双音震音的白名单 v70.4 已撤：导入收进 `col.trem2`，阿特拉斯不再需要白名单；其余 7 首的条目由验收（v70.3）补签，why 里写了目标版本）
- 现阶段导入器只保留每谱表第一声部（同谱表双声部是下一版），所以**有同谱表第二声部的曲目暂不收**。

## 目录

- `manifest.json`：曲目清单——`id`（`lib-os-<OpenScore 谱号>`）、`file`、中文曲名、作曲、作词、`source`（来源 / 许可 / 原始链接）
- `openscore/*.musicxml`：由 OpenScore 的 `.mscx` 转成的 MusicXML

## 加一首

1. 在 [OpenScore Lieder](https://github.com/OpenScore/Lieder) 找到曲目的 `lcXXXXXXX.mscx`
2. 转 MusicXML：OpenScore 的 `.mscx` 是 MuseScore 3.02 格式，apt 的 MuseScore 3.2.3 读不了——把文件头的 `<museScore version="3.02">` 改成 `"3.01"`（逐首核对过：改前后音符数一致），再
   `QT_QPA_PLATFORM=offscreen mscore3 -o openscore/lcXXXXXXX.musicxml lcXXXXXXX.mscx`
3. `manifest.json` 加一项（中文曲名、作曲、作词、来源链接）
4. `node deploy/build-library.js` 生成 `api/seed-library.json`（`CHROMIUM_PATH` 同测试）；质量门不过的曲目会列出原因
5. 跑 `muse-tab/tests/tv_library.js`，提交

导入器改动若让曲库结果变了，`tv_library` 的 L1（`build-library.js --check` 逐字节比对）会红——重新生成并复核后再提交。

## 示例与手工录入（v70.0 起）

`manifest.json` 除 `items`（OpenScore）外另有两类，构建输出顺序 `items → examples → manual`（原 `items` 逐字节不变）：

- `examples`：编辑器里的示例曲谱（`EXAMPLES`＝`PRESETS`＋`PRESETS_X`）。`preset` 写条目的 `name`，条目上的 `seedId` 与 `id` 一一对应（多一条、少一条都构建失败）；`title`＝显示名（`name2 || name`），制谱署名「谱友圈官方」
- `manual`：`manual/<id>.json`，编辑器谱面格式（与 `.mtab.json` 同结构），只收公有领域 / 谱友圈自编。`source.edition` 写所据版本（能核的写 IMSLP 编号与页码）；公版曲由录入人录入、**另一位核对人不看录入结果**按同一版本写 `check`；`reviewed`（`by` / `date` / `note`）是制谱专家看过 `--png` 导出的第一页并排目视后的签字

两类另过质量门（任一不过整个构建失败）：⑨ 时值 · ⑩ MusicXML 往返音高＋拼写 · ⑪ 归属金表（`expect`＝`pzOf` 的 `pz.sub`，`intent`）· ⑫ 逐小节核对（`check`：段间 `|`、谱表间 `/`、音写「科学音高:时值」，`C4`＝中央 C、升降照谱面拼写、柱式和弦低到高用 `+`、附点 `.`、三连音 `/3`、连音线起点 `~`、休止 `r:时值`、倚音不写；例：致爱丽丝弱起＝`E5:16 D#5:16 / r:8`）· ⑬ 署名与许可（`CC0 1.0` / `公有领域` / `谱友圈自编`）· ⑭ manual 必须有 `reviewed`。

加一首手工录入：写 `manual/<id>.json`（可在编辑器里录好「另存为文件」）→ manifest `manual` 加一项（`expect` / `intent` / `source`）→ 核对人写 `check` → `node deploy/build-library.js --png` 看第一页 → 写 `reviewed` → `node deploy/build-library.js` 生成种子 → 跑 `tv_library` / `tv_v700ex`。`--manifest=<文件>` 可换一份清单（造反例用）。

收录规则同上：只收 CC0 / 公有领域 / 谱友圈自编；同谱表双声部的曲目暂不收（导入器只留每谱表第一声部），录入前先核每谱表单声部（或同节奏柱式和弦），不得删内声部凑数。
