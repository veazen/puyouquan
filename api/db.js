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
CREATE TABLE IF NOT EXISTS likes(
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
-- v60.87 站内信：messages（user_id 为 NULL＝官方广播，全体可见）+ msg_reads（按用户记已读）。
-- 广播不给每个用户插行（用户量大时是笛卡尔积），已读表只在用户真读过时才有行。
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,                                -- NULL=官方广播；否则定向某用户
  kind TEXT NOT NULL DEFAULT 'system',         -- 'review' 审核结果 / 'announce' 官方公告 / 'system' 其他
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',               -- 站内跳转地址（可空）
  created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_msgs_user ON messages(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS msg_reads(
  user_id TEXT NOT NULL, msg_id INTEGER NOT NULL REFERENCES messages(id),
  read_at INTEGER NOT NULL, PRIMARY KEY(user_id, msg_id));
-- v60.90 课程数据模型：章节=谱面+图文+练习任务，章节数组存 data JSON（与 scores.data 同构思路：
-- 结构化内容整体读写、无跨行一致性问题；迁移 PostgreSQL 时可平移为 jsonb）。
-- data = { emoji, fam(g/p/v/f 配色族), chapters:[{emoji,title,goal,points[],task,links:[{t,href}],score_q?}] }
CREATE TABLE IF NOT EXISTS courses(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '',
  instrument TEXT NOT NULL DEFAULT '',         -- guitar/piano/uku/vocal/kids…
  level TEXT NOT NULL DEFAULT '',              -- 零基础/入门/进阶/亲子…
  weeks INTEGER NOT NULL DEFAULT 0,
  intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',        -- draft/published（v1 工作台仅管理员，暂无 pending 审核档）
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
-- v60.0 平台管理：管理操作审计日志（谁 在何时 对谁 做了什么，永不删）
CREATE TABLE IF NOT EXISTS admin_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,                        -- 'role' / 'grant' / 'revoke' / 'approve' / 'reject'
  target TEXT NOT NULL DEFAULT '',             -- 目标 user_id 或 score_id
  detail TEXT NOT NULL DEFAULT '',             -- 补充说明（新角色/权益类型/驳回原因…）
  created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_adminlogs_at ON admin_logs(created_at DESC);
`);

/* v43.6 微信登录：老库幂等补列（ALTER 失败=列已存在，忽略）+ unionid 唯一索引（多 NULL 允许） */
for (const col of ['wx_unionid TEXT', "avatar TEXT NOT NULL DEFAULT ''"]) {
  try { db.exec('ALTER TABLE users ADD COLUMN ' + col); } catch { /* 列已存在 */ }
}
/* v60.0 审核流：驳回原因挂在谱面上（scores.status 增枚举值 'pending'/'rejected'，列名不改——数据红线）。
   老库已 published 的谱不受影响：只有新提交的发布才会进入 pending。 */
try { db.exec("ALTER TABLE scores ADD COLUMN review_note TEXT NOT NULL DEFAULT ''"); } catch { /* 列已存在 */ }
/* v60.6 曲谱实例缩图：制谱器把真实渲染谱面裁首行、光栅化成 webp/jpeg 后回传，卡片直接当截图用。
   存栅格而非 SVG 是安全取舍——栅格无脚本面，服务端只校验魔数即可安全外发；SVG 同源直开会执行脚本。
   老库无这三列时补齐；缺图的谱前端回退刻版封面（cover 数组仍在，向后兼容）。 */
for (const col of ['thumb BLOB', 'thumb_mime TEXT', 'thumb_at INTEGER']) {
  try { db.exec('ALTER TABLE scores ADD COLUMN ' + col); } catch { /* 列已存在 */ }
}
/* v60.97 浏览数（产品指示：曲谱有浏览数和收藏点赞记录）：详情每次公开拉取 +1，列只增不改名 */
try { db.exec('ALTER TABLE scores ADD COLUMN views INTEGER NOT NULL DEFAULT 0'); } catch { /* 列已存在 */ }
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unionid ON users(wx_unionid) WHERE wx_unionid IS NOT NULL');

const now = () => Math.floor(Date.now() / 1000);
const today = () => new Date().toISOString().slice(0, 10);

const q = {
  // 用户
  userByPhone:  db.prepare('SELECT * FROM users WHERE phone = ?'),
  userById:     db.prepare('SELECT * FROM users WHERE id = ?'),
  userCreate:   db.prepare('INSERT INTO users(id,phone,nickname,created_at) VALUES(?,?,?,?)'),
  userSetNick:  db.prepare('UPDATE users SET nickname = ? WHERE id = ?'),
  userSetAvatar: db.prepare('UPDATE users SET avatar = ? WHERE id = ?'),   /* v58.9 换头像（data URI / 微信 URL / 空串清除） */
  /* v60.5 微信账号补绑真实手机号：小程序/扫码建号时 phone 是合成占位（wx+hash），
     绑定后该账号即与网页短信登录同号。UNIQUE 约束由调用方先查重后再写，冲突不静默覆盖。 */
  userSetPhone: db.prepare('UPDATE users SET phone = ? WHERE id = ?'),
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
  /* v60.8 所有「秒级时间戳 DESC + LIMIT」的列表一律补 rowid DESC 破并列：
     created_at/updated_at 只到秒，同秒多行的相对顺序在 SQL 里是未定义的，
     叠加 LIMIT 就会从窗口里随机丢行（管理端少看到一条订单/一次审计）。
     rowid 是插入序，既确定又正好等于「谁先发生」。 */
  // 谱面
  scoreList:    db.prepare('SELECT id,title,singer,status,review_note,updated_at,created_at,thumb_at FROM scores WHERE user_id = ? ORDER BY updated_at DESC'),
  /* v60.6 起显式列而非 SELECT *：thumb 是 BLOB，随 `{...s}` 进 JSON 会被序列化成
     {"0":82,"1":73,…} 的巨型对象（体积翻十几倍且客户端无用）。只取 thumb_at 供前端判断有无缩图。 */
  scoreGet:     db.prepare('SELECT id,user_id,title,singer,status,review_note,data,updated_at,created_at,thumb_at FROM scores WHERE id = ?'),
  scoreCount:   db.prepare('SELECT COUNT(*) AS n FROM scores WHERE user_id = ?'),
  scoreUpsert:  db.prepare(`INSERT INTO scores(id,user_id,title,singer,data,updated_at,created_at)
                            VALUES(?,?,?,?,?,?,?)
                            ON CONFLICT(id) DO UPDATE SET title=excluded.title, singer=excluded.singer,
                              data=excluded.data, updated_at=excluded.updated_at`),
  scoreDelete:  db.prepare('DELETE FROM scores WHERE id = ? AND user_id = ?'),
  scoreSetStatus: db.prepare('UPDATE scores SET status = ? WHERE id = ? AND user_id = ?'),
  /* v60.6 缩图：写入只认本人（server.js 先查 ownership），读取按发布态放行 */
  scoreThumbSet: db.prepare('UPDATE scores SET thumb = ?, thumb_mime = ?, thumb_at = ? WHERE id = ? AND user_id = ?'),
  scoreThumbGet: db.prepare("SELECT thumb,thumb_mime,thumb_at FROM scores WHERE id = ? AND status = 'published'"),
  // 公开谱库（谱库 puku，无需登录）
  // 含 data 以便服务端算封面/类型；库规模变大时可另建轻量查询（见 server.js pubShape 注释）
  // thumb_at 只取时间戳不取 BLOB——列表接口若带上二进制会撑爆 JSON
  pubList:      db.prepare(`SELECT s.id,s.title,s.singer,u.nickname AS author,s.updated_at,s.thumb_at,s.data,s.views,
                            (SELECT COUNT(*) FROM likes l WHERE l.score_id=s.id) AS likes,
                            (SELECT COUNT(*) FROM favorites f WHERE f.score_id=s.id) AS favs
                            FROM scores s JOIN users u ON u.id = s.user_id
                            WHERE s.status = 'published' ORDER BY s.updated_at DESC, s.rowid DESC LIMIT 200`),
  pubGet:       db.prepare(`SELECT s.id,s.title,s.singer,u.nickname AS author,s.data,s.updated_at,s.thumb_at,s.views,
                            (SELECT COUNT(*) FROM likes l WHERE l.score_id=s.id) AS likes,
                            (SELECT COUNT(*) FROM favorites f WHERE f.score_id=s.id) AS favs
                            FROM scores s JOIN users u ON u.id = s.user_id
                            WHERE s.id = ? AND s.status = 'published'`),
  viewInc:      db.prepare("UPDATE scores SET views = views + 1 WHERE id = ? AND status = 'published'"),
  pubCount:     db.prepare("SELECT COUNT(*) AS n FROM scores WHERE status = 'published'"),
  scoreUnref:   db.prepare(`DELETE FROM favorites WHERE score_id = ?;`),
  // 收藏
  favList:      db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.updated_at,f.created_at AS faved_at
                            FROM favorites f JOIN scores s ON s.id = f.score_id
                            WHERE f.user_id = ? ORDER BY f.created_at DESC`),
  favPut:       db.prepare('INSERT OR IGNORE INTO favorites(user_id,score_id,created_at) VALUES(?,?,?)'),
  favDel:       db.prepare('DELETE FROM favorites WHERE user_id = ? AND score_id = ?'),
  favDelByScore:   db.prepare('DELETE FROM favorites WHERE score_id = ?'),
  // v60.97 点赞（结构同收藏：user_id+score_id 主键幂等）
  likeList:     db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.updated_at,l.created_at AS liked_at
                            FROM likes l JOIN scores s ON s.id = l.score_id
                            WHERE l.user_id = ? ORDER BY l.created_at DESC`),
  likePut:      db.prepare('INSERT OR IGNORE INTO likes(user_id,score_id,created_at) VALUES(?,?,?)'),
  likeDel:      db.prepare('DELETE FROM likes WHERE user_id = ? AND score_id = ?'),
  likeDelByScore:  db.prepare('DELETE FROM likes WHERE score_id = ?'),
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
  orderGet:     db.prepare('SELECT * FROM orders WHERE id = ?'),
  orderByOtn:   db.prepare('SELECT * FROM orders WHERE out_trade_no = ?'),
  orderMarkPaid:db.prepare("UPDATE orders SET status='paid', paid_at=? WHERE id=? AND status='pending'"),   // 幂等：仅 pending→paid
  orderList:    db.prepare('SELECT * FROM orders ORDER BY created_at DESC, rowid DESC LIMIT ?'),
  orderByUser:  db.prepare('SELECT id,kind,amount_fen,channel,status,created_at,paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50'),
  redeemGet:    db.prepare('SELECT * FROM redeem_codes WHERE code = ?'),
  redeemUse:    db.prepare('UPDATE redeem_codes SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL'),
  redeemAdd:    db.prepare('INSERT INTO redeem_codes(code,kind,days,created_at) VALUES(?,?,?,?)'),
  redeemList:   db.prepare('SELECT * FROM redeem_codes ORDER BY created_at DESC, rowid DESC LIMIT ?'),
  eventAdd:     db.prepare('INSERT INTO events(user_id,name,meta,created_at) VALUES(?,?,?,?)'),
  eventStats:   db.prepare('SELECT name, COUNT(*) AS n FROM events WHERE created_at > ? GROUP BY name ORDER BY n DESC'),
  /* v60.87 站内信。广播可见窗口＝近 90 天（server.js 传 cutoff）：老公告对所有人自然过期、
     新注册用户也能看到近期公告（若按注册时间过滤，注册前一天发的公告会被冤枉地藏掉）。
     read 用 LEFT JOIN 已读表判定；列表/未读数/一键已读三条 SQL 的可见范围口径必须一致。 */
  msgAdd:    db.prepare('INSERT INTO messages(user_id,kind,title,body,link,created_at) VALUES(?,?,?,?,?,?)'),
  msgGet:    db.prepare('SELECT * FROM messages WHERE id = ?'),
  msgList:   db.prepare(`SELECT m.id,m.kind,m.title,m.body,m.link,m.created_at,
                           CASE WHEN r.msg_id IS NULL THEN 0 ELSE 1 END AS read
                         FROM messages m LEFT JOIN msg_reads r ON r.msg_id = m.id AND r.user_id = ?
                         WHERE (m.user_id = ? OR (m.user_id IS NULL AND m.created_at >= ?))
                         ORDER BY m.created_at DESC, m.id DESC LIMIT ?`),
  msgUnread: db.prepare(`SELECT COUNT(*) AS n
                         FROM messages m LEFT JOIN msg_reads r ON r.msg_id = m.id AND r.user_id = ?
                         WHERE r.msg_id IS NULL AND (m.user_id = ? OR (m.user_id IS NULL AND m.created_at >= ?))`),
  msgRead:   db.prepare('INSERT OR IGNORE INTO msg_reads(user_id,msg_id,read_at) VALUES(?,?,?)'),
  msgReadAll:db.prepare(`INSERT OR IGNORE INTO msg_reads(user_id,msg_id,read_at)
                         SELECT ?, m.id, ? FROM messages m
                         WHERE (m.user_id = ? OR (m.user_id IS NULL AND m.created_at >= ?))`),
  /* v60.88 管理控制台：公告历史（含已读人数）与撤回 */
  msgBroadcasts: db.prepare(`SELECT m.id,m.title,m.body,m.link,m.created_at,COUNT(r.user_id) AS reads
                             FROM messages m LEFT JOIN msg_reads r ON r.msg_id = m.id
                             WHERE m.user_id IS NULL GROUP BY m.id
                             ORDER BY m.created_at DESC, m.id DESC LIMIT 50`),
  msgReadsDelByMsg: db.prepare('DELETE FROM msg_reads WHERE msg_id = ?'),
  msgDelBroadcast:  db.prepare('DELETE FROM messages WHERE id = ? AND user_id IS NULL'),
  // v60.90 课程
  courseListPub: db.prepare(`SELECT id,title,subtitle,instrument,level,weeks,intro,data,updated_at
                             FROM courses WHERE status='published' ORDER BY sort, created_at, rowid`),
  courseGetPub:  db.prepare(`SELECT id,title,subtitle,instrument,level,weeks,intro,data,updated_at
                             FROM courses WHERE id = ? AND status='published'`),
  courseGet:     db.prepare('SELECT * FROM courses WHERE id = ?'),
  /* v61.8 工作台列表带 data：渲染「N 章 · N 题」体量列（列表页量级小，整列带回可接受） */
  courseAll:     db.prepare('SELECT id,title,subtitle,instrument,level,weeks,status,sort,data,updated_at FROM courses ORDER BY sort, created_at, rowid'),
  courseCount:   db.prepare('SELECT COUNT(*) AS n FROM courses'),
  courseUpsert:  db.prepare(`INSERT INTO courses(id,user_id,title,subtitle,instrument,level,weeks,intro,sort,data,created_at,updated_at)
                             VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                             ON CONFLICT(id) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle,
                               instrument=excluded.instrument, level=excluded.level, weeks=excluded.weeks,
                               intro=excluded.intro, sort=excluded.sort, data=excluded.data, updated_at=excluded.updated_at`),
  courseSetStatus: db.prepare('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?'),
  courseDelete:  db.prepare('DELETE FROM courses WHERE id = ?'),
  // v60.0 平台管理（全部只读或后台写，均需 role='admin'，见 server.js requireAdmin）
  userSearch:   db.prepare(`SELECT id,phone,nickname,avatar,role,created_at FROM users
                            WHERE phone LIKE ? OR nickname LIKE ? ORDER BY created_at DESC, rowid DESC LIMIT ?`),
  userRecent:   db.prepare('SELECT id,phone,nickname,avatar,role,created_at FROM users ORDER BY created_at DESC, rowid DESC LIMIT ?'),
  userCount:    db.prepare('SELECT COUNT(*) AS n FROM users'),
  userCountRole:db.prepare('SELECT role, COUNT(*) AS n FROM users GROUP BY role'),
  scoreCountAll:db.prepare('SELECT COUNT(*) AS n FROM scores'),
  scoreCountBySt:db.prepare('SELECT status, COUNT(*) AS n FROM scores GROUP BY status'),
  // 审核队列：待审 + 最近处理（含作者昵称/手机号，便于甄别）
  reviewList:   db.prepare(`SELECT s.id,s.title,s.singer,s.status,s.review_note,s.updated_at,
                              u.id AS user_id,u.nickname AS author,u.phone
                            FROM scores s JOIN users u ON u.id = s.user_id
                            WHERE s.status = ? ORDER BY s.updated_at DESC, s.rowid DESC LIMIT ?`),
  scoreReview:  db.prepare('UPDATE scores SET status = ?, review_note = ? WHERE id = ?'),   // 管理员改状态：不带 user_id 约束
  orderPaidAgg: db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount_fen),0) AS fen FROM orders WHERE status='paid'"),
  adminLogAdd:  db.prepare('INSERT INTO admin_logs(admin_id,action,target,detail,created_at) VALUES(?,?,?,?,?)'),
  adminLogList: db.prepare(`SELECT l.id,l.admin_id,l.action,l.target,l.detail,l.created_at,u.nickname AS admin_name,u.phone AS admin_phone
                            FROM admin_logs l JOIN users u ON u.id = l.admin_id
                            /* v60.8 加 id DESC 破同秒并列：created_at 是秒级，同一秒内的多条
                               操作靠它排序结果是未定义的——审计日志要求严格时序，且 CI 快机器上
                               一批管理动作常落在同一秒，会让「最近 N 条」随机丢条（实测踩到）。
                               id 是 AUTOINCREMENT 严格单调，正好当插入序的 tie-breaker。 */
                            ORDER BY l.created_at DESC, l.id DESC LIMIT ?`),
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

/* v45.4 支付发货（单事务·幂等）：orderMarkPaid 仅 pending→paid 生效，重复回调/轮询不会二次发权益。
   entKind/days 由调用方按价目表传入（days=0 买断永久；否则同类未过期顺延）。 */
function fulfillOrder(orderId, entKind, days) {
  const t = now();
  db.exec('BEGIN');
  try {
    const r = q.orderMarkPaid.run(t, orderId);
    if (!r.changes) { db.exec('ROLLBACK'); return false; }   // 已发过货（或订单不存在/非 pending）
    const o = q.orderGet.get(orderId);
    let expires = 0;
    if (days > 0) {
      const cur = q.entActive.get(o.user_id, entKind, t);
      expires = ((cur && cur.expires_at > t) ? cur.expires_at : t) + days * 86400;
    }
    q.entAdd.run(crypto.randomUUID(), o.user_id, entKind, expires, 'order:' + orderId, t);
    q.eventAdd.run(o.user_id, 'order_paid', o.kind, t);
    db.exec('COMMIT');
    return true;
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
    q.likeDelByScore.run(id);
    q.shelfDelByScore.run(id);
    const r = q.scoreDelete.run(id, userId);
    db.exec('COMMIT');
    return r;
  } catch (e) { try { db.exec('ROLLBACK'); } catch { /* ignore */ } throw e; }
}

/* v60.88 撤回公告（事务）：先清已读记录（外键）再删本体；只删广播行（user_id IS NULL 条件在 SQL 里），
   定向消息不可经此删除。返回是否真的删了。 */
function retractBroadcast(id) {
  db.exec('BEGIN');
  try {
    q.msgReadsDelByMsg.run(id);
    const r = q.msgDelBroadcast.run(id);
    db.exec('COMMIT');
    return r.changes > 0;
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

/* ---------- v60.90 种子：官方课程（seed-courses.json 单一内容源；kecheng.html 内嵌同一份做
   SEO/离线兜底，两处同步由 tv_site 测试钉住）。
   v61.8 改「按 id 补种」：只插入库里还没有的课程 id——存量服务器也能拿到随发版新增的官方课
   （此前「表非空即跳过」导致新课永远到不了生产库）；已存在的 id 一律不动，重启不覆盖管理员的修改。 ---------- */
function seedCourses(){
  const list = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'seed-courses.json'), 'utf8'));
  /* v61.9 补种 + **内容随发版刷新**：官方课程的内容源在仓库里（随版本演进，如 v61.9 把《认识简谱》
     细化到小节）。判定「这行有没有被人改过」＝ updated_at > created_at：
       · 从没被改过（种子写入时两者相等）→ 内容与种子不一致就刷新，新版内容才能真正到线上；
       · 被管理员在工作台改过 → **一律不动**，绝不覆盖人的编辑（改坏了可在工作台重编）。 */
  const seedNew = list.filter(c => !q.courseGet.get(c.id));
  const stale = [];
  list.forEach(c => {
    const row = q.courseGet.get(c.id);
    if(!row) return;
    if(row.updated_at > row.created_at) return;                       // 人改过，尊重人的版本
    if(row.data === JSON.stringify(c.data || {})) return;             // 已是最新，不做无谓写入
    stale.push({ c, row });
  });
  if(!seedNew.length && !stale.length) return;
  let sys = db.prepare('SELECT id FROM users WHERE phone = ?').get('00000000000');
  if(!sys){ const id = 'official0000';
    q.userCreate.run(id, '00000000000', '谱友圈官方', now());
    q.userSetRole.run('creator', id); sys = { id };
  }
  const t = now();
  seedNew.forEach(c => {
    q.courseUpsert.run(c.id, sys.id, c.title, c.subtitle || '', c.instrument || '', c.level || '',
      c.weeks | 0, c.intro || '', list.indexOf(c), JSON.stringify(c.data || {}), t, t);
    q.courseSetStatus.run('published', t, c.id);
  });
  /* 刷新时 created_at/updated_at 都写成原 created_at——保持「未被人改过」这个不变量，
     否则刷新一次之后就再也认不出这行是官方原样了 */
  stale.forEach(({ c, row }) => {
    q.courseUpsert.run(c.id, row.user_id, c.title, c.subtitle || '', c.instrument || '', c.level || '',
      c.weeks | 0, c.intro || '', list.indexOf(c), JSON.stringify(c.data || {}), row.created_at, row.created_at);
  });
  if(seedNew.length) console.log('已补种官方课程：' + seedNew.length + ' 门');
  if(stale.length) console.log('已按仓库内容刷新官方课程：' + stale.map(x => x.c.id).join(', '));
}
try{ seedCourses(); }catch(e){ console.error('课程种子插入失败（不影响启动）:', e.message); }

/* seedCourses 导出供 db.test.js 直接驱动（测真实函数而不是复刻一遍判定逻辑） */
module.exports = { db, q, now, today, deleteScoreCascade, redeemApply, fulfillOrder, retractBroadcast, seedCourses };
