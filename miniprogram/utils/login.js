// v60.1 小程序静默登录 → web-view 免登录；v60.3 增微信一键登录（手机号）。
// 小程序既读不到也写不了 web-view 的 Cookie，所以两条路都走「一次性票据」：
//   静默：wx.login() → code → POST /api/wx/mini/login          （只认 openid/unionid，够看谱/收藏）
//   一键：getPhoneNumber → code → POST /api/wx/mini/phone      （拿真实手机号，与网页短信登录同一个账号）
//   两者都回 ticket → 把 /api/wx/mini/enter?t=…&to=… 交给 <web-view>
//     → 服务端校验并作废票据 → Set-Cookie pyq_token → 302 到目标页。网页端零改动，落地即登录态。
// 票据 30s（v62.6 由 120s 缩短）、用一次即焚，所以每次进页面都重新换一张，不缓存。
// 登录拿不到（网络差/未配置/审核环境）时回落到直开目标页——只是没登录态，不能白屏。
const API = 'https://www.puyouquan.com';
const K_PHONE = 'pyq_phone_ok';   // 已完成一键登录（仅作是否再弹登录页的判断，不存任何凭据）

function wxLoginCode() {
  return new Promise((resolve) => wx.login({ success: r => resolve(r && r.code), fail: () => resolve(null) }));
}
function post(path, data) {
  return new Promise((resolve) => wx.request({
    url: API + path, method: 'POST', data, timeout: 10000,
    success: r => resolve(r && r.statusCode === 200 ? r.data : null),
    fail: () => resolve(null),
  }));
}

/** 换出可直接喂给 <web-view> 的地址：成功=带票据的 enter 链接（落地即登录），失败=原目标页 */
async function enterUrl(target) {
  try {
    /* 一键登录刚拿到的票据只用一次，用完即删——票据本身 120s 过期，留着也没用 */
    const pending = wx.getStorageSync('pyq_enter');
    if (pending) { wx.removeStorageSync('pyq_enter'); return pending + '&to=' + encodeURIComponent(target); }
    const code = await wxLoginCode();
    if (!code) return target;
    const j = await post('/api/wx/mini/login', { code });
    if (!j || !j.ticket) return target;
    return API + '/api/wx/mini/enter?t=' + encodeURIComponent(j.ticket) + '&to=' + encodeURIComponent(target);
  } catch (_) { return target; }
}

/** 手机号快捷登录：getPhoneNumber 的 code → 真实手机号账号。成功返回服务端结果（含 merge 合并提议）并留一张待用票据，失败返回 false
    v62.6：若这台手机之前用小程序时建过一个没绑手机号的账号、且里面有谱/收藏，服务端不静默合并，回一个 merge 提议由登录页确认 */
async function phoneLogin(phoneCode) {
  try {
    const loginCode = await wxLoginCode();   // 一并带上，服务端顺手把小程序身份绑到该手机号账号
    const j = await post('/api/wx/mini/phone', { code: phoneCode, loginCode: loginCode || '' });
    if (!j || !j.ticket) return false;
    wx.setStorageSync(K_PHONE, 1);
    wx.setStorageSync('pyq_enter', API + '/api/wx/mini/enter?t=' + encodeURIComponent(j.ticket));
    return j;
  } catch (_) { return false; }
}
/** v62.6 用户在确认框里选「合并」：把旧账号的谱/收藏/谱架并入手机号账号 */
async function mergeAccount(token) {
  const j = await post('/api/wx/mini/merge', { token });
  return !!(j && j.merged);
}

/** 是否该先弹登录页：没一键登录过、且本次安装内没点过「先随便看看」 */
function needLogin() {
  try { return !wx.getStorageSync(K_PHONE) && !wx.getStorageSync('pyq_skip'); } catch (_) { return false; }
}

/** v60.79 从任意站内地址解析发布谱 ID：观看页 kanpu.html?pub=ID、SSR 落地页 /pub/ID、
    静默登录 enter 链接（真实目标藏在 to= 参数里，先解出来再认）。解析不出返回 ''。
    分享直达全靠它——微信在 onShareAppMessage 给的 webViewUrl / web-view bindload 给的 src
    都是 URL，而观看页的 URL 本身就带着谱 ID，不需要网页配合。 */
function pubIdFrom(url) {
  let u = String(url || '');
  const to = u.match(/[?&]to=([^&#]+)/);
  if (to) { try { u = decodeURIComponent(to[1]); } catch (_) { } }
  const m = u.match(/[?&]pub=([A-Za-z0-9_-]+)/) || u.match(/\/pub\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

module.exports = { enterUrl, phoneLogin, mergeAccount, needLogin, pubIdFrom, API };
