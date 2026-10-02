'use strict';
// 谱友圈 DB 每日备份（零依赖）：VACUUM INTO 生成一致性快照——WAL 下安全、无需 sqlite3 CLI。
// 由 systemd timer pyq-backup.timer 每日触发（见 deploy/db-backup.sh 安装）。保留最近 BACKUP_KEEP 份。
// 手动跑：DB_PATH=/var/lib/puyouquan/pyq.db /opt/node/bin/node /opt/puyouquan/api/db-backup.js
// v62.7 A6 异地备份：api.env 配齐 BACKUP_S3_*（见 s3.js 文件头）后，每份快照再传一份到对象存储，异地保留 BACKUP_S3_KEEP（默认 30）份；
//   本地默认保留份数随之从 14 降到 7（异地兜底了，本盘不必囤太多）。没配就和以前一样只存本盘。
//   恢复演练：node db-restore-s3.js [对象名] --out /tmp/drill.db（只下载到临时路径并做完整性校验，不碰线上库）
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SRC = process.env.DB_PATH || '/var/lib/puyouquan/pyq.db';
const DIR = process.env.BACKUP_DIR || '/var/backups/puyouquan';
const S3 = require('./s3');
const S3C = S3.cfgFromEnv();
const KEEP = Math.max(1, +(process.env.BACKUP_KEEP || (S3C ? 7 : 14)));
const S3KEEP = Math.max(1, +(process.env.BACKUP_S3_KEEP || 30));

fs.mkdirSync(DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);          // 每日一份，同日重跑覆盖
const out = path.join(DIR, 'pyq-' + stamp + '.db');
/* v60.7 先写临时名、成功后再原子改名——此前是「先删当天旧文件再 VACUUM」，
   磁盘写满时 VACUUM 抛 ENOSPC，旧快照已删、新快照没写成，当天备份直接归零。
   缩图 BLOB 进库后（v60.6）快照体积会涨，这个次序问题从理论隐患变成现实风险。 */
const tmp = out + '.tmp';
try { fs.unlinkSync(tmp); } catch { /* 无残留 */ }

const db = new DatabaseSync(SRC);
try {
  db.exec('PRAGMA busy_timeout=10000');                       // 与 pyq-api 并发时不立刻 SQLITE_BUSY
  db.exec("VACUUM INTO '" + tmp.replace(/'/g, "''") + "'");   // 一致性快照到临时文件
} catch (e) {
  try { fs.unlinkSync(tmp); } catch { /* 写了一半的残片清掉 */ }
  throw e;                                                    // 失败时当天旧快照原封不动
} finally { db.close(); }
fs.renameSync(tmp, out);                                      // 同盘 rename 原子，旧文件此刻才被替换

// 保留最近 KEEP 份，其余按日期升序删除
const files = fs.readdirSync(DIR).filter(f => /^pyq-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(DIR, f));
console.log('DB 备份完成 → ' + out + '（' + fs.statSync(out).size + ' B，保留最近 ' + KEEP + ' 份）');

/* v62.7 A6：异地副本。本地快照已落盘，上传失败只影响异地那一份——退出码置 1 让 systemd 记为失败（journalctl 可查），本盘备份不受影响 */
if (S3C) {
  (async () => {
    const key = S3C.prefix + 'pyq-' + stamp + '.db';
    await S3.putObject(S3C, key, fs.readFileSync(out));
    const keys = (await S3.listKeys(S3C, S3C.prefix)).filter(k => /pyq-\d{4}-\d{2}-\d{2}\.db$/.test(k)).sort();
    const old = keys.slice(0, Math.max(0, keys.length - S3KEEP));
    for (const k of old) await S3.deleteObject(S3C, k);
    console.log('异地备份完成 → ' + S3C.bucket + '/' + key + '（异地共 ' + (keys.length - old.length) + ' 份，保留最近 ' + S3KEEP + ' 份）');
  })().catch(e => { console.error('异地备份失败（本盘快照已保存）：' + e.message); process.exitCode = 1; });
}
