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

setTimeout(() => {
  try { require('node:fs').unlinkSync(process.env.DB_PATH); } catch {}
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
}, 30);
