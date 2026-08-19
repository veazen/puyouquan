'use strict';
// 微信登录纯逻辑单测（零依赖，node api/wx.test.js）
const assert = require('node:assert');
const { signState, verifyState, buildLoginUrl, buildMpAuthUrl, webExchange, miniSession, miniPhone } = require('./wx');

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

T('miniSession：jscode2session 正常 → 取回 openid+unionid，且不外传 session_key', async () => {
  let seen = '';
  const stub = async (u) => { seen = u; return { json: async () => ({ openid: 'OP1', unionid: 'UN1', session_key: 'SECRET_SK' }) }; };
  const r = await miniSession('CODE1', { appid: 'wxmini', secret: 'msec', fetchFn: stub });
  assert.deepStrictEqual(r, { openid: 'OP1', unionid: 'UN1' });
  assert.ok(!('session_key' in r), 'session_key 绝不能出现在返回值里');
  assert.ok(seen.includes('/sns/jscode2session') && seen.includes('js_code=CODE1')
    && seen.includes('grant_type=authorization_code'), '端点/参数应为小程序 code2Session');
});
T('miniSession：未绑开放平台无 unionid → null（不报错，仅按 openid 建号）', async () => {
  const stub = async () => ({ json: async () => ({ openid: 'OP2', session_key: 'x' }) });
  assert.deepStrictEqual(await miniSession('C', { appid: 'a', secret: 's', fetchFn: stub }), { openid: 'OP2', unionid: null });
});
T('miniSession：code 无效 → 抛 502', async () => {
  const stub = async () => ({ json: async () => ({ errcode: 40029, errmsg: 'invalid code' }) });
  await assert.rejects(() => miniSession('BAD', { appid: 'a', secret: 's', fetchFn: stub }), e => e.status === 502);
});

/* ── v60.3 小程序微信一键登录：getPhoneNumber 的 code → 真实手机号 ──
   新版协议（基础库 2.21.2+）不再是 encryptedData/iv 那套需 session_key 解密，
   而是服务端用小程序全局 access_token 直接换；token 缓存与失效重取是这里的关键行为。 */
const TA = (name, fn) => { total++; return fn().then(() => { pass++; console.log('✅ ' + name); })
  .catch(e => console.log('❌ ' + name + ': ' + e.message)); };

(async () => {
  const cache = { tok: '', tokExp: 0 };
  let tokHits = 0;
  const fake = async (url, opt) => {
    if (url.indexOf('/cgi-bin/token') >= 0) { tokHits++; return { json: async () => ({ access_token: 'TOK', expires_in: 7200 }) }; }
    if (url.indexOf('getuserphonenumber') >= 0) {
      const body = JSON.parse(opt.body);
      if (body.code === 'bad') return { json: async () => ({ errcode: 40029, errmsg: 'invalid code' }) };
      if (body.code === 'stale') return { json: async () => ({ errcode: 40001, errmsg: 'invalid credential' }) };
      return { json: async () => ({ errcode: 0, phone_info: { phoneNumber: '+8613800001234', purePhoneNumber: '13800001234', countryCode: '86' } }) };
    }
    return { json: async () => ({}) };
  };
  const opt = { appid: 'wxA', secret: 'S', fetchFn: fake, cache, nowFn: () => 1000 };
  await TA('miniPhone：换出纯手机号（不外传 access_token）', async () => {
    const r = await miniPhone('good-code-1234', opt);
    assert.strictEqual(r.phone, '13800001234'); assert.strictEqual(r.countryCode, '86');
    assert.ok(!('access_token' in r));
  });
  await TA('miniPhone：access_token 命中缓存不重复取', async () => {
    await miniPhone('good-code-1234', opt); assert.strictEqual(tokHits, 1);
  });
  await TA('miniPhone：微信报错时抛 502 不静默', async () => {
    await assert.rejects(() => miniPhone('bad', opt), e => e.status === 502);
  });
  await TA('miniPhone：40001 token 失效时清缓存供下次重取', async () => {
    await assert.rejects(() => miniPhone('stale', opt), e => e.status === 502);
    assert.strictEqual(cache.tok, '');
  });

  // 顺序跑（含 async T）
  await new Promise(r => setTimeout(r, 50));
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
