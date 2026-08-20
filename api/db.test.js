'use strict';
// 微信账号 DB 层 + 迁移 + upsert 逻辑集成测试
// 运行：node --experimental-sqlite api/db.test.js
const os = require('node:os'), path = require('node:path');
process.env.DB_PATH = path.join(os.tmpdir(), 'pyq_wxtest_' + process.pid + '.db');
process.env.JWT_SECRET = 'test';
const assert = require('node:assert');
const crypto = require('node:crypto');
const { q, now } = require('./db');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

// 复刻 server.js 的 upsertWxUser 逻辑（DB 层等价，验证匹配/建号/占位 phone）
function upsertWx({ openid, unionid, nickname, avatar }) {
  let u = null;
  if (unionid) u = q.userByUnionid.get(unionid);
  if (!u && openid) u = q.userByWxOpenid.get(openid);
  if (u) { q.userBindWx.run(openid || null, unionid || null, u.id); if (avatar) q.userFillAvatar.run(avatar, u.id); return q.userById.get(u.id); }
  const id = crypto.randomUUID();
  const phone = 'wx' + sha256((unionid || openid) + '|wx').slice(0, 18);
  q.userCreateWx.run(id, phone, openid || null, unionid || null, (nickname || '').trim() || ('微信用户' + String(openid || '').slice(-4)), avatar || '', now());
  return q.userById.get(id);
}

let pass = 0, total = 0;
const T = (name, fn) => { total++; try { fn(); pass++; console.log('✅ ' + name); } catch (e) { console.log('❌ ' + name + ': ' + e.message); } };

T('迁移：wx_unionid / avatar 列存在（userCreateWx 可插入）', () => {
  const u = upsertWx({ openid: 'o1', unionid: 'u1', nickname: '小明', avatar: 'http://a/x.png' });
  assert.strictEqual(u.wx_openid, 'o1');
  assert.strictEqual(u.wx_unionid, 'u1');
  assert.strictEqual(u.nickname, '小明');
  assert.strictEqual(u.avatar, 'http://a/x.png');
  assert.ok(u.phone.startsWith('wx') && u.phone.length > 4);   // 合成占位、非真实号
  assert.strictEqual(u.role, 'user');
});
T('unionid 复登：同一 unionid 返回同一账号（不重复建号）', () => {
  const a = upsertWx({ openid: 'o1', unionid: 'u1' });
  const b = upsertWx({ openid: 'o1b', unionid: 'u1' });   // openid 变了也无妨，unionid 统一
  assert.strictEqual(a.id, b.id);
});
T('openid 兜底：无 unionid 时按 openid 匹配/建号', () => {
  const a = upsertWx({ openid: 'noUnion1' });
  const b = upsertWx({ openid: 'noUnion1' });
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(a.wx_unionid, null);
});
T('资料兜底：无昵称时用「微信用户+openid尾4」', () => {
  const u = upsertWx({ openid: 'abcd1234', unionid: 'uNick' });
  assert.strictEqual(u.nickname, '微信用户1234');
});
T('绑定：已有手机号用户可绑微信，之后 unionid 命中该账号（账号统一）', () => {
  const id = crypto.randomUUID();
  q.userCreate.run(id, '13800001111', '谱友1111', now());
  q.userBindWx.run('oBind', 'uBind', id);
  const byU = q.userByUnionid.get('uBind');
  assert.strictEqual(byU.id, id);
  assert.strictEqual(byU.phone, '13800001111');   // 真实手机号保留
  assert.strictEqual(byU.wx_openid, 'oBind');
});
T('userBindWx 用 COALESCE：只传 openid 不清空已有 unionid', () => {
  const id = crypto.randomUUID();
  q.userCreateWx.run(id, 'wxplaceholderXY', 'oC', 'uC', '测试', '', now());
  q.userBindWx.run('oC2', null, id);   // unionid 传 null
  const u = q.userById.get(id);
  assert.strictEqual(u.wx_openid, 'oC2');
  assert.strictEqual(u.wx_unionid, 'uC');   // 未被 null 覆盖
});

T('userSetAvatar：设 data URI / 清空 往返（v58.9 换头像）', () => {
  const id = crypto.randomUUID();
  q.userCreateWx.run(id, 'wxavatartest0001', 'oAv', 'uAv', '头像君', '', now());
  q.userSetAvatar.run('data:image/jpeg;base64,QUJD', id);
  assert.strictEqual(q.userById.get(id).avatar, 'data:image/jpeg;base64,QUJD');
  q.userSetAvatar.run('', id);
  assert.strictEqual(q.userById.get(id).avatar, '');
});

/* v60.8 同秒并列排序回归。
   背景：created_at 是秒级整数，一批管理动作/下单常常全部落在同一秒；
   `ORDER BY created_at DESC LIMIT N` 对并列行的相对顺序在 SQL 里是**未定义**的，
   于是「最近 N 条」会从窗口里随机丢行——CI 快机器上实测把一条 approve 挤出了前 5。
   这两条用例不依赖机器快慢：显式写死同一个 created_at，构造出必然并列的条件，
   所以去掉 db.js 里的 rowid/id tie-breaker 就会红。 */
T('adminLogList：同秒 8 条取前 5 —— 严格按插入倒序，不丢条（v60.8）', () => {
  const admin = crypto.randomUUID();
  q.userCreate.run(admin, '13900002222', '管理员', now());
  const T0 = 1750000000;                        // 写死时间戳：8 条全部同秒
  const acts = ['role', 'grant', 'revoke', 'approve', 'reject', 'grant', 'approve', 'revoke'];
  acts.forEach((a, i) => q.adminLogAdd.run(admin, a, 'tgt' + i, 'd' + i, T0));
  const rows = q.adminLogList.all(5);
  assert.strictEqual(rows.length, 5);
  // 最近 5 条 = 下标 7..3 倒序；target 里带下标，能精确指认「丢了哪条」
  assert.deepStrictEqual(rows.map(r => r.target), ['tgt7', 'tgt6', 'tgt5', 'tgt4', 'tgt3']);
  assert.deepStrictEqual(rows.map(r => r.action), ['revoke', 'approve', 'grant', 'reject', 'approve']);
  // id 严格递减 —— 审计日志的时序保证
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].id > rows[i].id, '审计日志 id 必须严格递减');
});

T('orderByUser：同秒 6 单 —— 订单记录按下单序倒排，不随机丢单（v60.8）', () => {
  const uid = crypto.randomUUID();
  q.userCreate.run(uid, '13900003333', '买家', now());
  const T0 = 1750000100;
  for (let i = 0; i < 6; i++) q.orderCreate.run('od' + i, uid, 'pro', 100 + i, 'admin', null, 'paid', T0, T0);
  const rows = q.orderByUser.all(uid);
  assert.strictEqual(rows.length, 6);
  assert.deepStrictEqual(rows.map(r => r.id), ['od5', 'od4', 'od3', 'od2', 'od1', 'od0']);
});

setTimeout(() => {
  try { require('node:fs').unlinkSync(process.env.DB_PATH); } catch {}
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
}, 30);
