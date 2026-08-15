'use strict';
// 微信登录纯逻辑单测（零依赖，node api/wx.test.js）
const assert = require('node:assert');
const { signState, verifyState, buildLoginUrl, buildMpAuthUrl, webExchange } = require('./wx');

let pass = 0, total = 0;
const T = (name, fn) => { total++; try { fn(); pass++; console.log('✅ ' + name); } catch (e) { console.log('❌ ' + name + ': ' + e.message); } };
const SEC = 'test-secret-abc';

T('state 往返：有效 state 可验签取回 return', () => {
  const st = signState('https://zhipu.puyouquan.com/?x=1', SEC);
  const o = verifyState(st, SEC);
  assert.ok(o && o.r === 'https://zhipu.puyouquan.com/?x=1');
});
T('state 防伪：篡改签名不通过', () => {
  const st = signState('https://a.com', SEC);
  assert.strictEqual(verifyState(st.slice(0, -2) + 'zz', SEC), null);
});
T('state 防伪：换密钥不通过', () => {
  assert.strictEqual(verifyState(signState('https://a.com', SEC), 'other'), null);
});
T('state 过期：ttl<0 立即失效', () => {
  assert.strictEqual(verifyState(signState('https://a.com', SEC, -1), SEC), null);
});
T('state extra：绑定模式 {b:uid} 随签名往返（v58.3）', () => {
  const st = signState('https://zhipu.puyouquan.com/', SEC, 600, { b: 'uid-123' });
  const o = verifyState(st, SEC);
  assert.ok(o && o.b === 'uid-123' && o.r === 'https://zhipu.puyouquan.com/');
  assert.strictEqual(verifyState(signState('https://a.com', SEC, 600, { b: 'u1' }).slice(0, -2) + 'zz', SEC), null);
  assert.strictEqual((verifyState(signState('https://a.com', SEC), SEC) || {}).b, undefined);
});
T('公众号授权 URL：oauth2/authorize + snsapi_userinfo + wechat_redirect（v58.4）', () => {
  const url = buildMpAuthUrl({ appid: 'wxMP1', redirect: 'https://www.puyouquan.com/api/wx/mp/callback', state: 'S2' });
  assert.ok(url.includes('open.weixin.qq.com/connect/oauth2/authorize'));
  assert.ok(url.includes('appid=wxMP1'));
  assert.ok(url.includes('scope=snsapi_userinfo'));
  assert.ok(url.includes('state=S2'));
  assert.ok(url.endsWith('#wechat_redirect'));
});
T('登录 URL 含 appid/scope=snsapi_login/state + wechat_redirect', () => {
  const url = buildLoginUrl({ appid: 'wxABC', redirect: 'https://zhipu.puyouquan.com/api/wx/web/callback', state: 'S1' });
  assert.ok(url.includes('open.weixin.qq.com/connect/qrconnect'));
  assert.ok(url.includes('appid=wxABC'));
  assert.ok(url.includes('scope=snsapi_login'));
  assert.ok(url.includes('state=S1'));
  assert.ok(url.includes('redirect_uri=https%3A%2F%2Fzhipu.puyouquan.com%2Fapi%2Fwx%2Fweb%2Fcallback'));
  assert.ok(url.endsWith('#wechat_redirect'));
});
T('webExchange：正常返回 openid+unionid+资料', async () => {
  const stub = async (u) => ({
    json: async () => u.includes('/sns/oauth2/access_token')
      ? { access_token: 'AT', openid: 'OPENID_1', unionid: 'UNION_1' }
      : { openid: 'OPENID_1', nickname: '小明', headimgurl: 'http://img/x.png' },
  });
  const r = await webExchange('CODE', { appid: 'wxABC', secret: 'sk', fetchFn: stub });
  assert.strictEqual(r.openid, 'OPENID_1');
  assert.strictEqual(r.unionid, 'UNION_1');
  assert.strictEqual(r.nickname, '小明');
  assert.strictEqual(r.avatar, 'http://img/x.png');
});
T('webExchange：token 接口 errcode → 抛 502', async () => {
  const stub = async () => ({ json: async () => ({ errcode: 40029, errmsg: 'invalid code' }) });
  await assert.rejects(() => webExchange('BAD', { appid: 'x', secret: 'y', fetchFn: stub }), e => e.status === 502);
});
T('webExchange：userinfo 失败不阻断（仍返回 openid/unionid）', async () => {
  const stub = async (u) => ({
    json: async () => u.includes('/sns/oauth2/access_token')
      ? { access_token: 'AT', openid: 'OPENID_2', unionid: 'UNION_2' }
      : { errcode: 40003, errmsg: 'invalid openid' },
  });
  const r = await webExchange('CODE', { appid: 'x', secret: 'y', fetchFn: stub });
  assert.strictEqual(r.openid, 'OPENID_2');
  assert.strictEqual(r.unionid, 'UNION_2');
  assert.strictEqual(r.nickname, '');
});

/* ---- v55.3 JS-SDK 分享签名 ---- */
const { jsapiTicket, jsapiSign } = require('./wx');
const cryptoT = require('node:crypto');

T('jsapiTicket：token+ticket 各请求一次并缓存（第二次调用零网络）', async () => {
  let calls = 0;
  const stub = async (u) => { calls++; return { json: async () =>
    u.includes('/cgi-bin/token') ? { access_token: 'AT1', expires_in: 7200 } : { ticket: 'TIC1', expires_in: 7200, errcode: 0 } }; };
  const cache = { tok: null, tokExp: 0, tic: null, ticExp: 0 };
  const t1 = await jsapiTicket({ appid: 'a', secret: 's', fetchFn: stub, cache, nowFn: () => 1000 });
  const t2 = await jsapiTicket({ appid: 'a', secret: 's', fetchFn: stub, cache, nowFn: () => 1000 });
  assert.strictEqual(t1, 'TIC1'); assert.strictEqual(t2, 'TIC1'); assert.strictEqual(calls, 2);
});
T('jsapiTicket：token 接口失败 → 抛 502', async () => {
  const stub = async () => ({ json: async () => ({ errcode: 40125, errmsg: 'invalid appsecret' }) });
  await assert.rejects(() => jsapiTicket({ appid: 'a', secret: 'bad', fetchFn: stub,
    cache: { tok: null, tokExp: 0, tic: null, ticExp: 0 } }), e => e.status === 502);
});
T('jsapiSign：字段字典序拼接 + url 去 # 后 sha1（官方附录1 规则）', () => {
  const r = jsapiSign('TICKET_X', 'https://zhipu.puyouquan.com/?pub=abc#frag', { nonceStr: 'NONCE1', timestamp: 12345 });
  const raw = 'jsapi_ticket=TICKET_X&noncestr=NONCE1&timestamp=12345&url=https://zhipu.puyouquan.com/?pub=abc';
  assert.strictEqual(r.signature, cryptoT.createHash('sha1').update(raw).digest('hex'));
  assert.strictEqual(r.nonceStr, 'NONCE1'); assert.strictEqual(r.timestamp, 12345);
});
T('jsapiSign：缺省自动生成 nonce/timestamp', () => {
  const r = jsapiSign('T', 'https://puyouquan.com/');
  assert.ok(r.nonceStr.length >= 8 && r.timestamp > 0 && /^[0-9a-f]{40}$/.test(r.signature));
});

(async () => {
  // 顺序跑（含 async T）
  await new Promise(r => setTimeout(r, 50));
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
