# 运维手册：服务器本机快照恢复演练

> 2026-11-07 · 给管理员 · 不含任何凭据值 · 依据：`docs/plan-2026-11-foundation.md` §6.4（v70.5 上线前做一次恢复演练，异地备份未配置时先做本机快照演练）、§8.3 G-17；规格 `docs/spec-2026-11-v705.md` §13。
> 演练**只读线上库、只写临时路径**：不停服务、不改 `/var/lib/puyouquan/pyq.db`、不改 `/etc/puyouquan/api.env`。第 7 节「真恢复」只写进文档，演练时不做。

## 为什么要做

v70.5 是基石阶段第一次引入结构性新字段（`song.voxLayer`、`col.hid`）。推送即上线（`.github/workflows/deploy.yml:107–108` deploy needs test，没有预发环境），万一新版本写坏了谱面数据，要能确定：每日快照真的存在、能打开、内容完整、能起一个服务读出来，以及从快照恢复要多久（RTO）、最多丢多少数据（RPO）。

## 相关事实（仓库里可核对）

| 项 | 值 | 出处 |
|---|---|---|
| 线上库 | `DB_PATH=/var/lib/puyouquan/pyq.db`（SQLite，WAL） | `deploy/api-setup.sh:31`、`api/db.js:8` |
| 每日快照 | `pyq-backup.timer` 每天 04:12 触发 `pyq-backup.service`（用户 `pyq`），`VACUUM INTO` 一致性快照 → `/var/backups/puyouquan/pyq-YYYY-MM-DD.db`，先写 `.tmp` 再原子改名 | `deploy/db-backup.sh:6–40`、`api/db-backup.js:12–38` |
| 保留份数 | 未配异地备份时保留最近 14 份（`BACKUP_KEEP` 可改；配了异地后默认 7） | `api/db-backup.js:16` |
| 日志 | 成功时打印「DB 备份完成 → 路径（字节数，保留最近 N 份）」 | `api/db-backup.js:38` |
| 服务 | `pyq-api`，`/opt/node/bin/node /opt/puyouquan/api/server.js`，只监听 `127.0.0.1:3127`（`PORT` 可改） | `deploy/api-setup.sh:79`、`api/server.js:13`、`:1789` |
| 健康检查 | `GET /api/health` → `{ok:true, ver, …}` | `api/server.js:850` |
| 谱库接口 | `GET /api/pub/cats`、`/api/pub/scores`、`/api/pub/scores/<id>` | `api/server.js:1573`、`:1530`、`:1581` |
| 后台任务 | server.js 没有定时任务；启动时对库跑一次曲库补种 `seedLibrary()`（按 id，只补缺的） | `api/db.js:638`、`:682` |
| 数据校验函数 | `require('/opt/puyouquan/api/scoredata.js').scoreDataDanger(data,'','data',0)`：返回首个违规位置，`null`＝通过 | `api/scoredata.js:19`、`:42` |
| 异地演练脚本 | `api/db-restore-s3.js`：未配置 `BACKUP_S3_*` 时退出码 2，不能用于本机演练 | `api/db-restore-s3.js:11` |

## 0. 前提检查（只读）

| 步 | 命令 | 检查点 | 不满足时 |
|---|---|---|---|
| 0.1 | `systemctl list-timers pyq-backup.timer` | 有「NEXT」时间 | 先按 `deploy/db-backup.sh` 安装 timer，再从 1 开始 |
| 0.2 | `journalctl -u pyq-backup -n 20 --no-pager` | 最近一条是「DB 备份完成 → …」 | 有报错（ENOSPC、权限）先修，再做第 1 步 |
| 0.3 | `ls -l /var/backups/puyouquan/` | 有近几天的 `pyq-YYYY-MM-DD.db`，大小相近、不为 0 | 份数异常少或大小突变：记下来，演练照做，结果里注明 |
| 0.4 | `df -h /var/backups /tmp` | 两处可用空间都 ≥ 3 × 最新快照大小 | 先清理，否则第 1、2 步可能写满盘 |

## 1. 现做一份快照

```bash
sudo systemctl start pyq-backup.service
journalctl -u pyq-backup -n 5 --no-pager
```

- **检查点**：日志给出新文件名与字节数；`ls -l /var/backups/puyouquan/` 里今天的文件已更新，没有残留 `.tmp`。
- **记下**：开始时间 T0、快照文件名、字节数。
- **回滚**：不需要（同日重跑会覆盖当天那一份，属正常行为）。

## 2. 拷到临时路径（原件不动）

```bash
F=/var/backups/puyouquan/pyq-$(date +%F).db      # 或第 1 步日志里的文件名
sudo install -o pyq -g pyq -m 600 "$F" /tmp/pyq-drill.db
ls -l /tmp/pyq-drill.db
```

- **检查点**：`/tmp/pyq-drill.db` 字节数与原件相同、属主 `pyq`、权限 600。
- **回滚**：`sudo rm -f /tmp/pyq-drill.db*`。

## 3. 完整性与行数（只读打开）

```bash
sudo -u pyq /opt/node/bin/node -e '
const { DatabaseSync } = require("node:sqlite");
const open = p => new DatabaseSync(p, { readOnly: true });
const T = ["users","scores","orders","courses","entitlements"];
const cnt = (db,t) => { try { return db.prepare("SELECT COUNT(*) AS n FROM "+t).get().n; } catch { return "—"; } };
const a = open("/tmp/pyq-drill.db"), b = open(process.env.DB_PATH || "/var/lib/puyouquan/pyq.db");
console.log("integrity:", Object.values(a.prepare("PRAGMA integrity_check").get())[0]);
for (const t of T) console.log(t.padEnd(14), "快照", cnt(a,t), "线上", cnt(b,t));
a.close(); b.close();'
```

- **检查点**：`integrity: ok`；各表快照行数 ≤ 线上行数，差值只能来自快照之后的新写入（凌晨刚做的快照差值应接近 0）。
- **不满足**：`integrity` 不是 ok → 换前一天的快照重做第 2–3 步，并在记录里写明「某日快照损坏」；行数快照 > 线上 → 立刻停下，报告负责人（线上可能丢过数据）。
- **回滚**：只读，不需要。

## 4. 数据可读（逐首解析谱面）

```bash
sudo -u pyq /opt/node/bin/node -e '
const { DatabaseSync } = require("node:sqlite");
const { scoreDataDanger } = require("/opt/puyouquan/api/scoredata.js");
const db = new DatabaseSync("/tmp/pyq-drill.db", { readOnly: true });
let n = 0, bad = 0, danger = 0;
for (const r of db.prepare("SELECT id, data FROM scores").iterate()) { n++;
  let d; try { d = JSON.parse(r.data); } catch { bad++; continue; }
  if (scoreDataDanger(d, "", "data", 0)) danger++; }
console.log("scores", n, "JSON 解析失败", bad, "数据违规", danger); db.close();'
```

- **检查点**：`JSON 解析失败 0`、`数据违规 0`。
- **不满足**：记下条数（不要把谱面内容贴进聊天或工单）；与线上库同样跑一遍（把路径换成 `DB_PATH`），线上也有＝历史遗留，线上没有＝快照异常，报告负责人。
- **回滚**：只读，不需要。

## 4b. （可选）已发布谱分类对拍

只在 v70.5 集成说「公开接口取不到全部已发布谱」时做（规格 §10.3 Z、§13）。集成会给出两样东西：对拍脚本（仓库里的路径，实现阶段写）和新版 `api/kindname.js` 所在的提交号。

```bash
# 两套 kindname.js＋scoredata.js 放到临时目录：旧版＝线上现用的，新版＝集成给的提交里的同名两份
sudo -u pyq mkdir -p /tmp/kn-old /tmp/kn-new
sudo -u pyq cp /opt/puyouquan/api/kindname.js /opt/puyouquan/api/scoredata.js /tmp/kn-old/
# 新版两份文件按集成说明放进 /tmp/kn-new/（不要覆盖 /opt/puyouquan 下的文件）
sudo -u pyq /opt/node/bin/node <对拍脚本> /tmp/pyq-drill.db /tmp/kn-old /tmp/kn-new
```

- 脚本只读快照副本、只输出计数与谱 id（不输出谱面内容）：`已发布 N 首，viewOf / pubNameOf / pubKindOf 不同 0 首`。
- **检查点**：不同 0 首。
- **不满足**：把输出的 id 列表交给集成（id 不是敏感信息，内容不要贴）；v70.5 暂缓推送，由集成查原因。
- **回滚**：`sudo rm -rf /tmp/kn-old /tmp/kn-new`。

## 5. 起演练实例（只绑 127.0.0.1，换端口）

```bash
sudo -u pyq bash -c 'cd /opt/puyouquan/api; set -a; . /etc/puyouquan/api.env; set +a; PORT=3199 DB_PATH=/tmp/pyq-drill.db exec /opt/node/bin/node server.js' &
sleep 2
curl -s 127.0.0.1:3199/api/health
curl -s 127.0.0.1:3199/api/pub/cats | head -c 300; echo
curl -s 127.0.0.1:3127/api/pub/cats | head -c 300; echo
```

- 环境文件只在子 shell 里读，**不要** `cat` 或 `echo` 它的内容，也不要把输出贴到聊天 / 工单。
- 演练实例启动时会对 `/tmp/pyq-drill.db` 跑一次曲库补种（`api/db.js:682`），只写这份临时副本。
- **检查点**：
  - `/api/health` 返回 `ok:true`，`ver` 与线上 `curl -s 127.0.0.1:3127/api/health` 相同；
  - `/api/pub/cats` 两个端口的计数一致（快照之后有新上架时允许线上多出这几首）；
  - 抽一首已发布谱：`curl -s 127.0.0.1:3199/api/pub/scores/<id>` 与 3127 端口同一 id 的 `data` 逐字节相同（`diff <(curl …3199…) <(curl …3127…)`）。
- **回滚**：`kill %1`；已不在当前 shell 时用 `sudo ss -ltnp | grep 3199` 找到进程号再 `sudo kill <进程号>`。线上 3127 不受影响。

## 6. 记 RPO / RTO

- **RPO**＝快照时间到现在的间隔（每日快照 → 最多丢约 24 小时的写入）。
- **RTO**＝第 1 步开始到第 5 步健康检查通过的耗时（演练值；真恢复多一次停服 / 起服，见第 7 节）。

## 7. 真恢复（只写进文档，演练时不做）

只在负责人确认线上库损坏或被写坏后执行：

1. `sudo systemctl stop pyq-api`
2. 原库连同 `-wal` / `-shm` 改名留底：`sudo mv /var/lib/puyouquan/pyq.db{,.bad-$(date +%F-%H%M)}`，`-wal`、`-shm` 同样改名。
3. 把**按第 3–4 步校验过的**快照放到原位：`sudo install -o pyq -g pyq -m 600 /var/backups/puyouquan/pyq-<日期>.db /var/lib/puyouquan/pyq.db`
4. 确认 `/var/lib/puyouquan/` 下没有残留的 `pyq.db-wal` / `pyq.db-shm`（否则旧 WAL 会叠到新库上）。
5. `sudo systemctl start pyq-api`，`curl -s 127.0.0.1:3127/api/health` 返回 `ok:true`。
6. **回滚**（恢复后发现更糟）：stop → 把第 2 步改名的三个文件改回原名 → start。

## 8. 清理

```bash
kill %1 2>/dev/null
sudo rm -f /tmp/pyq-drill.db /tmp/pyq-drill.db-wal /tmp/pyq-drill.db-shm
sudo rm -rf /tmp/kn-old /tmp/kn-new
ss -ltn | grep 3199 || echo "3199 已释放"
```

- **检查点**：临时文件全删、3199 端口已释放、线上 `/api/health` 仍 ok。

## 9. 记入 PROJECT.md

把下表填好，原样抄进 `PROJECT.md`（运维 / 发版记录一节）。注明「异地备份 `BACKUP_S3_*` 仍待配置」（未配置时 `db-restore-s3.js` 退出码 2）。v70.5 集成在推送前核对这条记录存在（规格 §13）。

## 演练记录（管理员填写）

| 项 | 填写 |
|---|---|
| 日期 / 执行人 | |
| 服务器（主机名，不写 IP） | |
| 第 0 步：timer 下次触发时间、最近一次备份日志、快照份数、可用空间 | |
| 第 1 步：快照文件名 / 字节数 / 开始时间 T0 | |
| 第 3 步：integrity_check | |
| 第 3 步：行数（快照 / 线上）users · scores · orders · courses · entitlements | |
| 第 4 步：scores 条数 / JSON 解析失败 / 数据违规 | |
| 第 4b 步（可选）：已发布条数 / 分类不同条数（没做写「未做，集成已用公开接口对拍」） | |
| 第 5 步：health ver（演练 / 线上）、/api/pub/cats 是否一致、抽查的谱 id 与 data 是否相同 | |
| 第 6 步：RPO / RTO（分钟） | |
| 第 8 步：清理完成（是 / 否） | |
| 异常与处理 | |
| 异地备份 BACKUP_S3_* 状态 | 待配置 / 已配置（日期） |
