'use strict';
// 谱友圈 DB 每日备份（零依赖）：VACUUM INTO 生成一致性快照——WAL 下安全、无需 sqlite3 CLI。
// 由 systemd timer pyq-backup.timer 每日触发（见 deploy/db-backup.sh 安装）。保留最近 BACKUP_KEEP 份。
// 手动跑：DB_PATH=/var/lib/puyouquan/pyq.db /opt/node/bin/node /opt/puyouquan/api/db-backup.js
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SRC = process.env.DB_PATH || '/var/lib/puyouquan/pyq.db';
const DIR = process.env.BACKUP_DIR || '/var/backups/puyouquan';
const KEEP = Math.max(1, +(process.env.BACKUP_KEEP || 14));

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
