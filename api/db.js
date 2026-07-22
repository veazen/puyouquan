'use strict';
// 谱友圈 API · 数据层（node:sqlite，零依赖）
// 所有 SQL 集中在本文件（可移植子集：无 SQLite 方言特性），未来迁 PostgreSQL 只需重写此层。
// 主键一律应用层生成（randomUUID），布尔用 0/1，时间用 Unix 秒 —— 均为迁移友好约定。
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || '/var/lib/puyouquan/pyq.db';
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, wx_openid TEXT UNIQUE,
  nickname TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'user',
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
`);

const now = () => Math.floor(Date.now() / 1000);
const today = () => new Date().toISOString().slice(0, 10);

const q = {
  // 用户
  userByPhone:  db.prepare('SELECT * FROM users WHERE phone = ?'),
  userById:     db.prepare('SELECT * FROM users WHERE id = ?'),
  userCreate:   db.prepare('INSERT INTO users(id,phone,nickname,created_at) VALUES(?,?,?,?)'),
  userSetNick:  db.prepare('UPDATE users SET nickname = ? WHERE id = ?'),
  userSetRole:  db.prepare('UPDATE users SET role = ? WHERE id = ?'),
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
};

module.exports = { db, q, now, today };
