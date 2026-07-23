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

module.exports = { signState, verifyState, buildLoginUrl, webExchange };
