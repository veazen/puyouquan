'use strict';
/* v62.7 A6 异地备份回归：① SigV4 签名对 AWS 官方文档示例向量（GET Object / List Objects）逐字一致；
   ② 本地模拟对象存储端到端：db-backup.js 上传当日快照、异地超量按日期清理；db-restore-s3.js 取回最新一份并通过完整性校验；
   ③ 未配置 BACKUP_S3_* 时与以前完全一样（只存本盘、不发任何请求）。 */
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFile } = require('node:child_process');
/* 子进程必须异步跑：模拟对象存储就在本进程里，execFileSync 会把事件循环卡死、请求永远等不到回应 */
const runAsync = (file, args, env) => new Promise(r => execFile(process.execPath, [file, ...(args || [])], { env, encoding: 'utf8', timeout: 30000 },
  (e, so, se) => r(e ? 'EXIT ' + e.code + ' ' + (so || '') + (se || '') : so)));
const { DatabaseSync } = require('node:sqlite');
const S3 = require('./s3');
let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

const E = S3.sha256hex('');
const A = { region: 'us-east-1', key: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' };
const g = S3.signV4({ ...A, method: 'GET', path: '/test.txt', query: {}, payloadHash: E,
  headers: { host: 'examplebucket.s3.amazonaws.com', range: 'bytes=0-9', 'x-amz-content-sha256': E, 'x-amz-date': '20130524T000000Z' } });
T(g.endsWith('Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'), 'T1 SigV4 对 AWS 官方示例「GET Object」一致');
const l = S3.signV4({ ...A, method: 'GET', path: '/', query: { 'max-keys': 2, prefix: 'J' }, payloadHash: E,
  headers: { host: 'examplebucket.s3.amazonaws.com', 'x-amz-content-sha256': E, 'x-amz-date': '20130524T000000Z' } });
T(l.endsWith('Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7'), 'T2 SigV4 对 AWS 官方示例「List Objects」一致（查询串编码与排序）');

/* ---- 模拟对象存储：路径式 /桶/对象；每个请求按同一套签名复算校验 ---- */
const store = new Map(); let badSig = 0, reqs = 0;
const srv = http.createServer((req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c));
  req.on('end', () => {
    reqs++;
    const body = Buffer.concat(chunks);
    const u = new URL(req.url, 'http://x');
    const query = {}; u.searchParams.forEach((v, k) => { query[k] = v; });
    const want = S3.signV4({ method: req.method, path: u.pathname, query, payloadHash: req.headers['x-amz-content-sha256'],
      headers: { host: req.headers.host, 'x-amz-date': req.headers['x-amz-date'], 'x-amz-content-sha256': req.headers['x-amz-content-sha256'] },
      region: 'test-1', key: 'K', secret: 'S' });
    if (want !== req.headers.authorization || S3.sha256hex(body) !== req.headers['x-amz-content-sha256']) { badSig++; res.statusCode = 403; return res.end('SignatureDoesNotMatch'); }
    const [, bucket, ...rest] = u.pathname.split('/'); const key = rest.map(decodeURIComponent).join('/');
    if (req.method === 'PUT') { store.set(key, body); return res.end(''); }
    if (req.method === 'DELETE') { store.delete(key); res.statusCode = 204; return res.end(''); }
    if (req.method === 'GET' && !key) {
      const ks = [...store.keys()].filter(k => k.startsWith(query.prefix || '')).sort();
      return res.end(`<?xml version="1.0"?><ListBucketResult><Name>${bucket}</Name><IsTruncated>false</IsTruncated>${ks.map(k => `<Contents><Key>${k}</Key></Contents>`).join('')}</ListBucketResult>`);
    }
    if (req.method === 'GET') { if (!store.has(key)) { res.statusCode = 404; return res.end('NoSuchKey'); } return res.end(store.get(key)); }
    res.statusCode = 400; res.end('');
  });
});
srv.listen(0, '127.0.0.1', async () => {
  const port = srv.address().port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyq-s3-'));
  const dbp = path.join(dir, 'live.db');
  const db = new DatabaseSync(dbp); db.exec("CREATE TABLE users(id TEXT); CREATE TABLE scores(id TEXT); INSERT INTO users VALUES('u1'); INSERT INTO scores VALUES('s1'),('s2');"); db.close();
  const env = { ...process.env, DB_PATH: dbp, BACKUP_DIR: path.join(dir, 'bk'), BACKUP_S3_ENDPOINT: '127.0.0.1:' + port, BACKUP_S3_BUCKET: 'bkt',
    BACKUP_S3_REGION: 'test-1', BACKUP_S3_KEY: 'K', BACKUP_S3_SECRET: 'S', BACKUP_S3_SCHEME: 'http', BACKUP_S3_PATHSTYLE: '1', BACKUP_S3_KEEP: '3' };
  /* 先塞 4 份「历史」快照，跑一次备份后异地应只剩最近 3 份（含今天） */
  for (const d of ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']) store.set('pyq-db/pyq-' + d + '.db', Buffer.from('old'));
  store.set('other/keep-me.txt', Buffer.from('x'));
  const run = (f, extra) => runAsync(path.join(__dirname, f), extra, env);
  const o1 = await run('db-backup.js');
  const today = new Date().toISOString().slice(0, 10);
  const remote = [...store.keys()].filter(k => k.startsWith('pyq-db/')).sort();
  T(/异地备份完成/.test(o1) && store.has('pyq-db/pyq-' + today + '.db'), 'T3 备份后当日快照已传到对象存储', o1.trim().slice(-300));
  T(remote.length === 3 && !remote.includes('pyq-db/pyq-2026-01-01.db') && store.has('other/keep-me.txt'), 'T4 异地只保留最近 N 份（按日期清理，只动备份前缀）', remote.join(','));
  T(badSig === 0, 'T5 全部请求签名经服务端复算一致', 'bad=' + badSig);
  const o2 = await run('db-restore-s3.js', ['--out', path.join(dir, 'drill.db')]);
  T(/完整性：ok/.test(o2) && /曲谱 2/.test(o2), 'T6 恢复演练取回最新快照并通过完整性校验', o2.trim().split('\n').pop());
  const before = reqs;
  const env2 = { ...process.env, DB_PATH: dbp, BACKUP_DIR: path.join(dir, 'bk2') };
  const o3 = await runAsync(path.join(__dirname, 'db-backup.js'), [], env2);
  T(/DB 备份完成/.test(o3) && !/异地/.test(o3) && reqs === before && /保留最近 14 份/.test(o3), 'T7 未配置对象存储时与以前一样（只存本盘、本地保留 14 份、不发请求）', o3.trim());
  srv.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(pass === total ? 'PASS ' + pass + '/' + total : 'FAIL ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
});
