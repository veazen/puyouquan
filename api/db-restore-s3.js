'use strict';
/* v62.7 A6 恢复演练（只读、不碰线上库）：从对象存储取一份异地快照到临时路径，做 SQLite 完整性校验并报关键表行数。
   用法（服务器上，读同一份 api.env）：
     sudo -u pyq bash -c 'set -a; . /etc/puyouquan/api.env; /opt/node/bin/node /opt/puyouquan/api/db-restore-s3.js [对象名] --out /tmp/drill.db'
   不给对象名则取最新一份。真要恢复时：停 pyq-api → 用校验通过的文件替换 DB_PATH → 启 pyq-api（人工操作，脚本不代劳）。 */
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const S3 = require('./s3');
(async () => {
  const c = S3.cfgFromEnv();
  if (!c) { console.error('未配置 BACKUP_S3_*，无异地备份可演练'); process.exit(2); }
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out'); const out = oi >= 0 ? args[oi + 1] : '/tmp/pyq-restore-drill.db';
  let key = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
  if (!key) {
    const keys = (await S3.listKeys(c, c.prefix)).filter(k => /pyq-\d{4}-\d{2}-\d{2}\.db$/.test(k)).sort();
    if (!keys.length) { console.error('对象存储里还没有快照'); process.exit(3); }
    key = keys[keys.length - 1];
  }
  fs.writeFileSync(out, await S3.getObject(c, key));
  const db = new DatabaseSync(out, { readOnly: true });
  const ok = db.prepare('PRAGMA integrity_check').get();
  const n = t => { try { return db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n; } catch { return '—'; } };
  console.log(`取回 ${key} → ${out}（${fs.statSync(out).size} B）`);
  console.log(`完整性：${Object.values(ok)[0]}　用户 ${n('users')} · 曲谱 ${n('scores')} · 订单 ${n('orders')} · 课程 ${n('courses')}`);
  db.close();
  process.exit(Object.values(ok)[0] === 'ok' ? 0 : 1);
})().catch(e => { console.error('恢复演练失败：' + e.message); process.exit(1); });
