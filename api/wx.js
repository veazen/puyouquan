'use strict';
// 谱友圈 API · 微信登录纯逻辑（零依赖，可独立单测）
// A 开放平台·网站应用扫码登录（snsapi_login）：state 签名防 CSRF + code 换 openid/unionid + 拉资料。
// 不含 DB / HTTP；fetch 可注入以便单测。凭据（AppID/Secret）由调用方从服务器环境传入，不落代码。
const crypto = require('node:crypto');

const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const hmac = (s, key) => crypto.createHmac('sha256', key).update(s).digest('base64url');
const nowSec = () => Math.floor(Date.now() / 1000);

/* ---- state（回跳地址 + 随机数 + 过期，HMAC 签名防伪造/CSRF）---- */
function signState(ret, secret, ttl = 600) {
  const p = b64u({ r: String(ret || '').slice(0, 300), n: crypto.randomBytes(6).toString('hex'), exp: nowSec() + ttl });
  return p + '.' + hmac(p, secret);
}
function verifyState(state, secret) {
  try {
    const [p, s] = String(state).split('.');
    if (!p || !s) return null;
    const expect = hmac(p, secret);
    if (s.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
    const o = JSON.parse(Buffer.from(p, 'base64url'));
    return o.exp > nowSec() ? o : null;
  } catch { return null; }
}

/* ---- 扫码登录 URL（PC 端展示二维码，手机微信扫码授权）---- */
function buildLoginUrl({ appid, redirect, state }) {
  const u = new URL('https://open.weixin.qq.com/connect/qrconnect');
  u.searchParams.set('appid', appid);
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'snsapi_login');
  u.searchParams.set('state', state);
  return u.toString() + '#wechat_redirect';
}

/* ---- code → access_token(+openid+unionid) → userinfo（fetchFn 可注入以便单测）---- */
async function webExchange(code, { appid, secret, fetchFn = fetch }) {
  const tUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(appid)}`
    + `&secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const tRes = await fetchFn(tUrl, { signal: AbortSignal.timeout(10000) });
  const t = await tRes.json().catch(() => ({}));
  if (t.errcode || !t.openid) {
    const e = new Error('微信换取 token 失败: ' + (t.errmsg || t.errcode || 'unknown')); e.status = 502; throw e;
  }
  let info = {};
  try {
    const iUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(t.access_token)}`
      + `&openid=${encodeURIComponent(t.openid)}&lang=zh_CN`;
    const iRes = await fetchFn(iUrl, { signal: AbortSignal.timeout(10000) });
    const j = await iRes.json().catch(() => ({}));
    if (!j.errcode) info = j;
  } catch { /* 资料拉取失败不阻断登录，openid/unionid 已足够建号 */ }
  return {
    openid: t.openid,
    unionid: t.unionid || info.unionid || null,
    nickname: (info.nickname || '').slice(0, 24),
    avatar: (info.headimgurl || '').slice(0, 300),
  };
}

/* ---- v55.3 公众号 JS-SDK 分享签名（微信内转发链接出自定义卡片的官方通道）----
   前提（公众号后台人工配置）：已认证的服务号/订阅号、域名加入「JS接口安全域名」、服务器 IP 加白名单。
   access_token / jsapi_ticket 各 7200s，内存缓存并提前 5 分钟刷新；凭据由调用方注入不落代码。
   cache/fetchFn/nowFn 可注入以便单测。 */
const _jsCache = { tok: null, tokExp: 0, tic: null, ticExp: 0 };
async function jsapiTicket({ appid, secret, fetchFn = fetch, cache = _jsCache, nowFn = nowSec }) {
  const now = nowFn();
  if (cache.tic && now < cache.ticExp) return cache.tic;
  if (!cache.tok || now >= cache.tokExp) {
    const r = await fetchFn(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential`
      + `&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`, { signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) { const e = new Error('获取公众号 access_token 失败: ' + (j.errmsg || j.errcode || 'unknown')); e.status = 502; throw e; }
    cache.tok = j.access_token; cache.tokExp = now + Math.min(j.expires_in || 7200, 7200) - 300;
  }
  const r2 = await fetchFn(`https://api.weixin.qq.com/cgi-bin/ticket/getticket`
    + `?access_token=${encodeURIComponent(cache.tok)}&type=jsapi`, { signal: AbortSignal.timeout(10000) });
  const j2 = await r2.json().catch(() => ({}));
  if (j2.errcode || !j2.ticket) { const e = new Error('获取 jsapi_ticket 失败: ' + (j2.errmsg || j2.errcode || 'unknown')); e.status = 502; throw e; }
  cache.tic = j2.ticket; cache.ticExp = now + Math.min(j2.expires_in || 7200, 7200) - 300;
  return cache.tic;
}
/* 签名规则（官方附录1）：jsapi_ticket/noncestr/timestamp/url 按 key 字典序拼接后 sha1；
   url=当前页面完整 URL 去掉 # 及其后部分。nonce/timestamp 可注入以便单测 */
function jsapiSign(ticket, url, { nonceStr, timestamp } = {}) {
  nonceStr = nonceStr || crypto.randomBytes(8).toString('hex');
  timestamp = timestamp || nowSec();
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${String(url).split('#')[0]}`;
  const signature = crypto.createHash('sha1').update(raw).digest('hex');
  return { nonceStr, timestamp, signature };
}

module.exports = { signState, verifyState, buildLoginUrl, webExchange, jsapiTicket, jsapiSign };
