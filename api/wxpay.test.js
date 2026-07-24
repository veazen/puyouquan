'use strict';
// 微信支付纯逻辑单测（零依赖，node api/wxpay.test.js）：签名可被公钥验证、下单/查单请求形状、回调 AES-GCM 解密往返
const assert = require('node:assert');
const crypto = require('node:crypto');
const { buildAuth, nativePrepay, queryByOutTradeNo, decryptNotify } = require('./wxpay');

let pass = 0; const tests = [];
const T = (name, fn) => tests.push([name, fn]);
process.on('beforeExit', async () => {
  if (T.ran) return; T.ran = true;
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('✅ ' + name); }
    catch (e) { console.log('❌ ' + name + ': ' + e.message); }
  }
  console.log(`PASS ${pass}/${tests.length}`);
  process.exit(pass === tests.length ? 0 : 1);
});

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const CFG = { mchid: '1900000001', appid: 'wxTESTAPP', serial: 'SERIAL123', apiV3Key: '0123456789abcdef0123456789abcdef', privateKey };

T('buildAuth：签名串可被商户公钥验证 + 头字段齐全', () => {
  const auth = buildAuth({ method: 'POST', urlPath: '/v3/pay/transactions/native', body: '{"a":1}', mchid: CFG.mchid, serial: CFG.serial, privateKey });
  assert.ok(auth.startsWith('WECHATPAY2-SHA256-RSA2048 '));
  const f = {}; auth.slice(26).split(',').forEach(kv => { const m = /^(\w+)="(.*)"$/.exec(kv); if (m) f[m[1]] = m[2]; });
  assert.strictEqual(f.mchid, CFG.mchid);
  assert.strictEqual(f.serial_no, CFG.serial);
  const msg = `POST\n/v3/pay/transactions/native\n${f.timestamp}\n${f.nonce_str}\n{"a":1}\n`;
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(msg), publicKey, Buffer.from(f.signature, 'base64')));
});

T('nativePrepay：请求形状正确并返回 code_url', async () => {
  let seen = null;
  const stub = async (url, opt) => { seen = { url, opt, body: JSON.parse(opt.body) };
    return { status: 200, json: async () => ({ code_url: 'weixin://wxpay/bizpayurl?pr=abc123' }) }; };
  const cu = await nativePrepay({ description: '谱友圈会员 · 月卡', outTradeNo: 'P123ABC', totalFen: 1500, notifyUrl: 'https://www.puyouquan.com/api/pay/notify' }, CFG, stub);
  assert.strictEqual(cu, 'weixin://wxpay/bizpayurl?pr=abc123');
  assert.ok(seen.url.endsWith('/v3/pay/transactions/native'));
  assert.strictEqual(seen.body.mchid, CFG.mchid);
  assert.strictEqual(seen.body.appid, CFG.appid);
  assert.strictEqual(seen.body.out_trade_no, 'P123ABC');
  assert.deepStrictEqual(seen.body.amount, { total: 1500, currency: 'CNY' });
  assert.ok(seen.opt.headers.Authorization.startsWith('WECHATPAY2-SHA256-RSA2048'));
});

T('nativePrepay：微信侧报错 → 抛 502', async () => {
  const stub = async () => ({ status: 400, json: async () => ({ code: 'PARAM_ERROR', message: 'bad' }) });
  await assert.rejects(() => nativePrepay({ description: 'x', outTradeNo: 'P1', totalFen: 1, notifyUrl: 'https://n' }, CFG, stub), /微信下单失败/);
});

T('queryByOutTradeNo：路径含单号+mchid，返回 trade_state', async () => {
  let seen = null;
  const stub = async (url, opt) => { seen = url;
    return { status: 200, json: async () => ({ trade_state: 'SUCCESS', transaction_id: 'TX9', amount: { payer_total: 1500 } }) }; };
  const r = await queryByOutTradeNo('P123ABC', CFG, stub);
  assert.strictEqual(r.state, 'SUCCESS');
  assert.strictEqual(r.transactionId, 'TX9');
  assert.ok(seen.includes('/v3/pay/transactions/out-trade-no/P123ABC'));
  assert.ok(seen.includes('mchid=1900000001'));
});

T('decryptNotify：AES-256-GCM 加解密往返（含 AAD）', () => {
  const inner = { out_trade_no: 'P123ABC', trade_state: 'SUCCESS', transaction_id: 'TX9' };
  const iv = crypto.randomBytes(12).toString('hex').slice(0, 12);
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(CFG.apiV3Key), Buffer.from(iv));
  c.setAAD(Buffer.from('transaction'));
  const enc = Buffer.concat([c.update(JSON.stringify(inner), 'utf8'), c.final(), c.getAuthTag()]);
  const out = decryptNotify({ ciphertext: enc.toString('base64'), nonce: iv, associatedData: 'transaction' }, CFG.apiV3Key);
  assert.deepStrictEqual(out, inner);
});

T('decryptNotify：密钥不对 → 抛错（伪造回调解不开）', () => {
  const iv = '123456789012';
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(CFG.apiV3Key), Buffer.from(iv));
  const enc = Buffer.concat([c.update('{"x":1}', 'utf8'), c.final(), c.getAuthTag()]);
  assert.throws(() => decryptNotify({ ciphertext: enc.toString('base64'), nonce: iv, associatedData: '' }, 'ffffffffffffffffffffffffffffffff'));
});
