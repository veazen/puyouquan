// v60.1 小程序静默登录 → web-view 免登录。
// 小程序既读不到也写不了 web-view 的 Cookie，所以走「一次性票据」：
//   wx.login() → code → POST /api/wx/mini/login → 服务端建/认号，回 ticket
//   → 把 /api/wx/mini/enter?t=…&to=<目标页> 交给 <web-view>，服务端校验票据后 Set-Cookie 再 302 到目标页。
// 票据 120s、用一次即焚，所以每次进页面都重新换一张，不缓存。
// 登录拿不到（网络差/未配置/审核环境）时回落到直开目标页——只是没登录态，不能白屏。
const API = 'https://www.puyouquan.com';

function wxLoginCode() {
  return new Promise((resolve) => wx.login({ success: r => resolve(r && r.code), fail: () => resolve(null) }));
}
function post(path, data) {
  return new Promise((resolve) => wx.request({
    url: API + path, method: 'POST', data, timeout: 8000,
    success: r => resolve(r && r.statusCode === 200 ? r.data : null),
    fail: () => resolve(null),
  }));
}

/** 换出可直接喂给 <web-view> 的地址：成功=带票据的 enter 链接（落地即登录），失败=原目标页 */
async function enterUrl(target) {
  try {
    const code = await wxLoginCode();
    if (!code) return target;
    const j = await post('/api/wx/mini/login', { code });
    if (!j || !j.ticket) return target;
    return API + '/api/wx/mini/enter?t=' + encodeURIComponent(j.ticket) + '&to=' + encodeURIComponent(target);
  } catch (_) { return target; }
}

module.exports = { enterUrl, API };
