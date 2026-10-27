# 曲库官方公版谱（v69.3 起）

谱友圈曲库里「谱友圈官方」账号（`official0000`）发布的公版名曲。服务端启动时 `api/db.js` 的 `seedLibrary()` 读 `api/seed-library.json`，按 id（`lib-` 前缀）补种（记在 `seed_log` 表）：
- 新曲目：一首一个事务，直接发布并带快照；中途出错整首回滚，下次重启再补
- **随发版刷新**：已种过、仍在架、从没被人改过的官方原样谱，内容与 `seed-library.json` 不一致时换成仓库版本（发布时间不变）——导入器改进后重新生成并上线即可生效
- 管理员下架 / 删掉的不动、不复活
- `lib-` 前缀留给官方：普通用户不能新建这种 id；万一已被别的账号占用，不种、不记 `seed_log`、日志报出，处理掉占用的谱后下次重启照常补种

谱库展示：`singer` 列放作曲者（谱库按「舒伯特」搜得到），谱面里 `singer` 空、`composer` 有值——卡片 / 落地页 / 封面 / JSON-LD 认作「作曲」，不会写成「X 演唱」。

## 收录规则

- **只收 CC0 / 公有领域**：OpenScore Lieder Corpus（CC0 1.0）。**不收** CC BY-SA（相同方式共享会传染到整个曲库条目）、任何 NC（非商用）许可、来源不明的谱。
- 每首必须过 `deploy/build-library.js` 的质量门，否则整个构建失败、不写文件：
  1. 音高：源文件与「导入 → 再导出」逐小节比音高多重集（不含倚音），一个小节都不能差
  2. 时值：`beatErrors()` 为 0（弱起 / 不完整小节由导入标记 `pickup` / `measures[].irr` 豁免）
  3. 不丢：`skip.parts / voices / notes` 都为 0
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
