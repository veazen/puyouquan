'use strict';
// 谱友圈 API · 数据层（node:sqlite，零依赖）
// 所有 SQL 集中在本文件（可移植子集：无 SQLite 方言特性），未来迁 PostgreSQL 只需重写此层。
// 主键一律应用层生成（randomUUID），布尔用 0/1，时间用 Unix 秒 —— 均为迁移友好约定。
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const DB_PATH = process.env.DB_PATH || '/var/lib/puyouquan/pyq.db';
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, wx_openid TEXT UNIQUE, wx_unionid TEXT,
  nickname TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'user',
  tok_ver INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS otp(
  phone TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL,
  day_count INTEGER NOT NULL DEFAULT 1, last_sent_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ip_quota(
  ip TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(ip, day));
CREATE TABLE IF NOT EXISTS scores(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL DEFAULT '', singer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'private',
  data TEXT NOT NULL, updated_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS favorites(
  user_id TEXT NOT NULL REFERENCES users(id), score_id TEXT NOT NULL REFERENCES scores(id),
  created_at INTEGER NOT NULL, PRIMARY KEY(user_id, score_id));
CREATE TABLE IF NOT EXISTS shelf(
  user_id TEXT NOT NULL REFERENCES users(id), score_id TEXT NOT NULL REFERENCES scores(id),
  progress TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, PRIMARY KEY(user_id, score_id));
CREATE TABLE IF NOT EXISTS collections(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS collection_items(
  collection_id TEXT NOT NULL REFERENCES collections(id),
  score_id TEXT NOT NULL REFERENCES scores(id),
  sort INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
  PRIMARY KEY(collection_id, score_id));
-- v45.3 商业闭环五表（六维审计 day1 清单）。金额一律整数分；时间 Unix 秒。
CREATE TABLE IF NOT EXISTS entitlements(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,                          -- 'vip' / 'pack_kaobian' / 'quota_2000' …
  expires_at INTEGER NOT NULL DEFAULT 0,       -- 0=永久（买断）；否则到期秒
  source TEXT NOT NULL DEFAULT '',             -- 'redeem:CODE' / 'order:ID' / 'admin'
  created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ent_user ON entitlements(user_id, kind);
CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL, amount_fen INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT '',            -- 'wxpay' / 'redeem' / 'admin'
  out_trade_no TEXT UNIQUE,                    -- 支付渠道幂等键（兑换/后台授予为 NULL）
  status TEXT NOT NULL DEFAULT 'pending',      -- pending/paid/refunded/closed
  created_at INTEGER NOT NULL, paid_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS redeem_codes(
  code TEXT PRIMARY KEY, kind TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 0,             -- 0=永久；否则有效天数
  used_by TEXT, used_at INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_earnings(
  id TEXT PRIMARY KEY, creator_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT NOT NULL, amount_fen INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending/settled
  created_at INTEGER NOT NULL, settled_at INTEGER);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,
  name TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, created_at);
`);

/* v43.6 微信登录：老库幂等补列（ALTER 失败=列已存在，忽略）+ unionid 唯一索引（多 NULL 允许） */
for (const col of ['wx_unionid TEXT', "avatar TEXT NOT NULL DEFAULT ''"]) {
  try { db.exec('ALTER TABLE users ADD COLUMN ' + col); } catch { /* 列已存在 */ }
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unionid ON users(wx_unionid) WHERE wx_unionid IS NOT NULL');

const now = () => Math.floor(Date.now() / 1000);
const today = () => new Date().toISOString().slice(0, 10);

const q = {
  // 用户
  userByPhone:  db.prepare('SELECT * FROM users WHERE phone = ?'),
  userById:     db.prepare('SELECT * FROM users WHERE id = ?'),
  userCreate:   db.prepare('INSERT INTO users(id,phone,nickname,created_at) VALUES(?,?,?,?)'),
  userSetNick:  db.prepare('UPDATE users SET nickname = ? WHERE id = ?'),
  userSetRole:  db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  userBumpTokVer: db.prepare('UPDATE users SET tok_ver = tok_ver + 1 WHERE id = ?'),   // 退出所有设备/风控：作废该用户全部已签发 JWT
  // v43.6 微信登录（unionid 优先匹配，openid 兜底；合成占位 phone 满足 NOT NULL/UNIQUE）
  userByUnionid:  db.prepare('SELECT * FROM users WHERE wx_unionid = ?'),
  userByWxOpenid: db.prepare('SELECT * FROM users WHERE wx_openid = ?'),
  userCreateWx:   db.prepare('INSERT INTO users(id,phone,wx_openid,wx_unionid,nickname,avatar,created_at) VALUES(?,?,?,?,?,?,?)'),
  userBindWx:     db.prepare('UPDATE users SET wx_openid=COALESCE(?,wx_openid), wx_unionid=COALESCE(?,wx_unionid) WHERE id=?'),
  userFillAvatar: db.prepare("UPDATE users SET avatar=CASE WHEN avatar='' THEN ? ELSE avatar END WHERE id=?"),
  // 验证码与频控
  otpGet:       db.prepare('SELECT * FROM otp WHERE phone = ?'),
  otpUpsert:    db.prepare(`INSERT INTO otp(phone,code_hash,expires_at,attempts,day,day_count,last_sent_at)
                            VALUES(?,?,?,0,?,?,?)
                            ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash,
                              expires_at=excluded.expires_at, attempts=0, day=excluded.day,
                              day_count=excluded.day_count, last_sent_at=excluded.last_sent_at`),
  otpAttempt:   db.prepare('UPDATE otp SET attempts = attempts + 1 WHERE phone = ?'),
  otpDelete:    db.prepare('DELETE FROM otp WHERE phone = ?'),
  ipQuotaGet:   db.prepare('SELECT count FROM ip_quota WHERE ip = ? AND day = ?'),
  ipQuotaBump:  db.prepare(`INSERT INTO ip_quota(ip,day,count) VALUES(?,?,1)
                            ON CONFLICT(ip,day) DO UPDATE SET count = count + 1`),
  // 谱面
  scoreList:    db.prepare('SELECT id,title,singer,status,updated_at,created_at FROM scores WHERE user_id = ? ORDER BY updated_at DESC'),
  scoreGet:     db.prepare('SELECT * FROM scores WHERE id = ?'),
  scoreCount:   db.prepare('SELECT COUNT(*) AS n FROM scores WHERE user_id = ?'),
  scoreUpsert:  db.prepare(`INSERT INTO scores(id,user_id,title,singer,data,updated_at,created_at)
                            VALUES(?,?,?,?,?,?,?)
                            ON CONFLICT(id) DO UPDATE SET title=excluded.title, singer=excluded.singer,
                              data=excluded.data, updated_at=excluded.updated_at`),
  scoreDelete:  db.prepare('DELETE FROM scores WHERE id = ? AND user_id = ?'),
  scoreSetStatus: db.prepare('UPDATE scores SET status = ? WHERE id = ? AND user_id = ?'),
  // 公开谱库（谱库 puku，无需登录）
  // 含 data 以便服务端算封面/类型；库规模变大时可另建轻量查询（见 server.js pubShape 注释）
  pubList:      db.prepare(`SELECT s.id,s.title,s.singer,u.nickname AS author,s.updated_at,s.data
                            FROM scores s JOIN users u ON u.id = s.user_id
                            WHERE s.status = 'published' ORDER BY s.updated_at DESC LIMIT 200`),
  pubGet:       db.prepare(`SELECT s.id,s.title,s.singer,u.nickname AS author,s.data,s.updated_at
                            FROM scores s JOIN users u ON u.id = s.user_id
                            WHERE s.id = ? AND s.status = 'published'`),
  pubCount:     db.prepare("SELECT COUNT(*) AS n FROM scores WHERE status = 'published'"),
  scoreUnref:   db.prepare(`DELETE FROM favorites WHERE score_id = ?;`),
  // 收藏
  favList:      db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.updated_at,f.created_at AS faved_at
                            FROM favorites f JOIN scores s ON s.id = f.score_id
                            WHERE f.user_id = ? ORDER BY f.created_at DESC`),
  favPut:       db.prepare('INSERT OR IGNORE INTO favorites(user_id,score_id,created_at) VALUES(?,?,?)'),
  favDel:       db.prepare('DELETE FROM favorites WHERE user_id = ? AND score_id = ?'),
  favDelByScore:   db.prepare('DELETE FROM favorites WHERE score_id = ?'),
  // 谱架
  shelfList:    db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.updated_at,h.progress,h.sort,h.created_at AS added_at
                            FROM shelf h JOIN scores s ON s.id = h.score_id
                            WHERE h.user_id = ? ORDER BY h.sort, h.created_at DESC`),
  shelfPut:     db.prepare('INSERT OR IGNORE INTO shelf(user_id,score_id,created_at) VALUES(?,?,?)'),
  shelfProg:    db.prepare('UPDATE shelf SET progress = ? WHERE user_id = ? AND score_id = ?'),
  shelfDel:     db.prepare('DELETE FROM shelf WHERE user_id = ? AND score_id = ?'),
  shelfDelByScore: db.prepare('DELETE FROM shelf WHERE score_id = ?'),
  // 谱集
  collList:     db.prepare(`SELECT c.id,c.name,c.created_at,COUNT(i.score_id) AS items
                            FROM collections c LEFT JOIN collection_items i ON i.collection_id = c.id
                            WHERE c.user_id = ? GROUP BY c.id ORDER BY c.created_at DESC`),
  collGet:      db.prepare('SELECT * FROM collections WHERE id = ? AND user_id = ?'),
  collCount:    db.prepare('SELECT COUNT(*) AS n FROM collections WHERE user_id = ?'),
  collCreate:   db.prepare('INSERT INTO collections(id,user_id,name,created_at) VALUES(?,?,?,?)'),
  collRename:   db.prepare('UPDATE collections SET name = ? WHERE id = ? AND user_id = ?'),
  collDelete:   db.prepare('DELETE FROM collections WHERE id = ? AND user_id = ?'),
  collItems:    db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.updated_at
                            FROM collection_items i JOIN scores s ON s.id = i.score_id
                            WHERE i.collection_id = ? ORDER BY i.sort, i.created_at`),
  collItemCount:db.prepare('SELECT COUNT(*) AS n FROM collection_items WHERE collection_id = ?'),
  collItemPut:  db.prepare('INSERT OR IGNORE INTO collection_items(collection_id,score_id,created_at) VALUES(?,?,?)'),
  collItemDel:  db.prepare('DELETE FROM collection_items WHERE collection_id = ? AND score_id = ?'),
  collItemsDelByColl:  db.prepare('DELETE FROM collection_items WHERE collection_id = ?'),
  collItemsDelByScore: db.prepare('DELETE FROM collection_items WHERE score_id = ?'),
  // v45.3 权益 / 订单 / 兑换码 / 埋点
  entList:      db.prepare('SELECT kind,expires_at,source,created_at FROM entitlements WHERE user_id = ? ORDER BY created_at DESC'),
  entActive:    db.prepare('SELECT * FROM entitlements WHERE user_id = ? AND kind = ? AND (expires_at = 0 OR expires_at > ?) ORDER BY expires_at DESC LIMIT 1'),
  entAdd:       db.prepare('INSERT INTO entitlements(id,user_id,kind,expires_at,source,created_at) VALUES(?,?,?,?,?,?)'),
  entDel:       db.prepare('DELETE FROM entitlements WHERE user_id = ? AND kind = ?'),
  orderCreate:  db.prepare('INSERT INTO orders(id,user_id,kind,amount_fen,channel,out_trade_no,status,created_at,paid_at) VALUES(?,?,?,?,?,?,?,?,?)'),
  orderList:    db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'),
  orderByUser:  db.prepare('SELECT id,kind,amount_fen,channel,status,created_at,paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  redeemGet:    db.prepare('SELECT * FROM redeem_codes WHERE code = ?'),
  redeemUse:    db.prepare('UPDATE redeem_codes SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL'),
  redeemAdd:    db.prepare('INSERT INTO redeem_codes(code,kind,days,created_at) VALUES(?,?,?,?)'),
  redeemList:   db.prepare('SELECT * FROM redeem_codes ORDER BY created_at DESC LIMIT ?'),
  eventAdd:     db.prepare('INSERT INTO events(user_id,name,meta,created_at) VALUES(?,?,?,?)'),
  eventStats:   db.prepare('SELECT name, COUNT(*) AS n FROM events WHERE created_at > ? GROUP BY name ORDER BY n DESC'),
};

/* v45.3 兑换：单事务内 核销码 + 发权益 + 记 0 元订单（防并发重复兑换：redeemUse 带 used_by IS NULL 条件）。
   已有同类未过期权益时顺延（在现有到期时间上累加天数），买断类(days=0)直接给永久。 */
function redeemApply(code, userId) {
  const t = now();
  db.exec('BEGIN');
  try {
    const r = q.redeemUse.run(userId, t, code);
    if (!r.changes) { db.exec('ROLLBACK'); return null; }   // 码不存在或已被用（含并发竞争失败）
    const rc = q.redeemGet.get(code);
    let expires = 0;
    if (rc.days > 0) {
      const cur = q.entActive.get(userId, rc.kind, t);
      const base = (cur && cur.expires_at > t) ? cur.expires_at : t;
      expires = base + rc.days * 86400;
    }
    q.entAdd.run(crypto.randomUUID(), userId, rc.kind, expires, 'redeem:' + code, t);
    q.orderCreate.run(crypto.randomUUID(), userId, rc.kind, 0, 'redeem', null, 'paid', t, t);
    db.exec('COMMIT');
    return { kind: rc.kind, expires_at: expires };
  } catch (e) { try { db.exec('ROLLBACK'); } catch { /* ignore */ } throw e; }
}

/* Sprint0 安全：删除自有谱（事务）。调用方必须已校验 userId 拥有该谱。
   先清他人对该谱的收藏/谱架/谱集引用（外键完整性要求），再删本体；scoreDelete 带 user_id 二次保险。
   修复：原 DELETE 路由的级联删除按 score_id 全局执行且先于所有权校验，任意登录用户可清空所有人对任意公开谱的收藏/谱架。 */
function deleteScoreCascade(id, userId) {
  db.exec('BEGIN');
  try {
    q.collItemsDelByScore.run(id);
    q.favDelByScore.run(id);
    q.shelfDelByScore.run(id);
    const r = q.scoreDelete.run(id, userId);
    db.exec('COMMIT');
    return r;
  } catch (e) { try { db.exec('ROLLBACK'); } catch { /* ignore */ } throw e; }
}

/* ---------- 种子：官方示例已发布谱（谱库开箱即有内容，先于短信登录上线） ----------
   官方账号 phone='00000000000'（占位、非真实手机号，不走登录）；仅在无任何已发布谱时插入。 */
function seedPublished(){
  if(q.pubCount.get().n > 0) return;
  let sys = db.prepare('SELECT id FROM users WHERE phone = ?').get('00000000000');
  if(!sys){ const id = 'official0000';
    q.userCreate.run(id, '00000000000', '谱友圈官方', now());
    q.userSetRole.run('creator', id); sys = { id };
  }
  const mkVox = (arr) => arr.map(([deg,ly]) => ({dur:4,dotted:false,deg,acc:'',oct:0,lyrics:ly?[ly]:[]}));
  const song = (title, singer, rows) => ({
    v:3, title, singer, lyricist:'', composer:'', maker:'谱友圈官方',
    key:'C', beats:4, unit:4, tempo:90, capo:0, inst:'guitar',
    tabVoices:[], voxVoices:['主旋律'], lyricLines:1,
    voxNotations:[undefined], voxDual:[false], customChords:{},
    layout:{page:'a4',preset:'std',density:1,scale:1,noteGap:1,rowGap:1},
    measures: rows.map(r => ({ tabs:[], voxes:[ mkVox(r) ] })),
  });
  const demos = [
    { title:'小星星', singer:'儿歌', data: song('小星星','儿歌',
      [[[1,'一'],[1,'闪'],[5,'一'],[5,'闪']],[[6,'亮'],[6,'晶'],[5,'晶'],[0,'']],
       [[4,'满'],[4,'天'],[3,'都'],[3,'是']],[[2,'小'],[2,'星'],[1,'星'],[0,'']]]) },
    { title:'欢乐颂', singer:'贝多芬', data: song('欢乐颂','贝多芬',
      [[[3,'欢'],[3,'乐'],[4,'女'],[5,'神']],[[5,'圣'],[4,'洁'],[3,'美'],[2,'丽']],
       [[1,'灿'],[1,'烂'],[2,'光'],[3,'芒']],[[3,'照'],[2,'大'],[2,'地'],[0,'']]]) },
  ];
  const t = now();
  for(const d of demos){
    const id = 'seed' + Math.random().toString(36).slice(2,10);
    q.scoreUpsert.run(id, sys.id, d.title, d.singer, JSON.stringify(d.data), t, t);
    q.scoreSetStatus.run('published', id, sys.id);
  }
  console.log('已插入官方示例已发布谱：' + demos.length + ' 首');
}
try{ seedPublished(); }catch(e){ console.error('种子插入失败（不影响启动）:', e.message); }

module.exports = { db, q, now, today, deleteScoreCascade, redeemApply };
