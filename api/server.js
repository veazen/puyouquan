'use strict';
// 谱友圈 API · M1：手机验证码登录 + 个人中心（谱面云同步/收藏/谱架/谱集）
// 零依赖：Node 24 内建模块（node:http / node:sqlite / node:crypto）。
// 部署：systemd 服务 pyq-api，nginx 各 vhost include snippets/pyq-api.conf 反代 /api/。
const http = require('node:http');
const crypto = require('node:crypto');
const { q, now, deleteScoreCascade, redeemApply, fulfillOrder } = require('./db');
const { sendSms } = require('./sms');
const wx = require('./wx');
const wxpay = require('./wxpay');
const fs = require('node:fs');

const PORT = +(process.env.PORT || 3127);
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? '.puyouquan.com';
if (!JWT_SECRET) { console.error('缺少 JWT_SECRET'); process.exit(1); }
// v43.6 微信开放平台·网站应用扫码登录（凭据只走服务器环境，不入代码）
const WX_WEB_APPID = process.env.WX_WEB_APPID || '';
const WX_WEB_SECRET = process.env.WX_WEB_SECRET || '';
const WX_WEB_REDIRECT = process.env.WX_WEB_REDIRECT || 'https://www.puyouquan.com/api/wx/web/callback';
/* v55.3 公众号 JS-SDK 分享签名（微信内转发出自定义卡片）：已认证公众号的 AppID/Secret，
   与扫码登录（开放平台网站应用）是两套凭据；未配置时接口 503、前端静默回退微信默认卡片 */
const WX_MP_APPID = process.env.WX_MP_APPID || '';
const WX_MP_SECRET = process.env.WX_MP_SECRET || '';
/* v58.4 公众号网页授权登录（微信内置浏览器免扫码）：复用 WX_MP 凭据；
   公众号后台「网页授权域名」须含本 redirect 的域名（www.puyouquan.com）。
   v58.6 默认关闭：网页授权仅认证服务号可用——订阅号后台根本没有「网页授权域名」设置项
   （用户截图证实本站公众号为订阅号），oauth 必报 10003。将来换/增服务号并配好
   网页授权域名后，置环境变量 WX_MP_OAUTH=1 即可开启，前端自动出「微信一键登录」。 */
const WX_MP_REDIRECT = process.env.WX_MP_REDIRECT || 'https://www.puyouquan.com/api/wx/mp/callback';
const WX_MP_OAUTH = process.env.WX_MP_OAUTH === '1';
/* v45.4 微信支付（APIv3 Native 扫码）：凭据只走服务器环境；私钥为文件路径（apiclient_key.pem）。
   五项全配齐才启用（health.wxpay=true，前端据此显示支付入口）。 */
const WXPAY = (() => {
  const c = {
    mchid: process.env.WXPAY_MCHID || '',
    appid: process.env.WXPAY_APPID || WX_WEB_APPID,
    serial: process.env.WXPAY_SERIAL || '',
    apiV3Key: process.env.WXPAY_APIV3_KEY || '',
    keyPath: process.env.WXPAY_KEY_PATH || '/etc/puyouquan/wxpay_key.pem',
    notifyUrl: process.env.WXPAY_NOTIFY_URL || 'https://www.puyouquan.com/api/pay/notify',
    privateKey: null,
  };
  if (c.mchid && c.appid && c.serial && c.apiV3Key) {
    try { c.privateKey = fs.readFileSync(c.keyPath, 'utf8'); }
    catch { console.error('微信支付私钥读取失败：' + c.keyPath + '（支付停用，其余功能不受影响）'); }
  }
  return c;
})();
const wxpayOn = () => !!WXPAY.privateKey;
/* 价目表（服务端唯一权威，前端只展示；金额整数分）。月/年卡给足 31/366 天。 */
const PRICES = {
  vip_month:    { fen: 1500, ent: 'vip',          days: 31,  desc: '谱友圈会员 · 月卡' },
  vip_year:     { fen: 9800, ent: 'vip',          days: 366, desc: '谱友圈会员 · 年卡' },
  pack_kaobian: { fen: 3900, ent: 'pack_kaobian', days: 0,   desc: '谱友圈 · 考编内容包（买断）' },
};

const VER = 'wx-1';
const MAX_BODY = 3 * 1024 * 1024;      // 谱面 JSON 上限 3MB（nginx 侧另有 4m）
const MAX_SCORES = 500, MAX_COLLS = 50, MAX_COLL_ITEMS = 500;
const MAX_SCORES_VIP = 2000;                    // v45.3 会员云配额（第一个真实权益开关）
/* v45.3 埋点白名单（客户端 8 + 服务端 4：signup/login/redeem_ok/order_paid 由 handler 直写） */
const EVENT_NAMES = new Set(['visit', 'create_song', 'export', 'publish', 'open_pub', 'paywall_view', 'fav', 'share_card',
  'signup', 'login', 'redeem_ok', 'order_paid']);
let evHour = 0; const evCount = new Map();       // 每 IP 每小时事件计数（内存态，重启清零可接受）
const PHONE_RE = /^1[3-9]\d{9}$/;
const ID_RE = /^[A-Za-z0-9_-]{8,40}$/;  // 客户端生成的谱面 id

/* ---------- JWT（HS256）与 Cookie ---------- */
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const hmac = s => crypto.createHmac('sha256', JWT_SECRET).update(s).digest('base64url');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function jwtSign(payload, days = 30) {
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const p = b64u({ ...payload, exp: now() + days * 86400 });
  return `${h}.${p}.${hmac(h + '.' + p)}`;
}
function jwtVerify(tok) {
  try {
    const [h, p, s] = String(tok).split('.');
    const expect = hmac(h + '.' + p);
    if (s.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
    const pl = JSON.parse(Buffer.from(p, 'base64url'));
    return pl.exp > now() ? pl : null;
  } catch { return null; }
}
function setAuthCookie(res, token) {
  const dom = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}; Secure` : '';
  res.setHeader('Set-Cookie', `pyq_token=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${dom}`);
}
function clearAuthCookie(res) {
  const dom = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}; Secure` : '';
  res.setHeader('Set-Cookie', `pyq_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${dom}`);
}
function authUser(req) {
  const m = /(?:^|;\s*)pyq_token=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const pl = jwtVerify(m[1]);
  if (!pl) return null;
  const u = q.userById.get(pl.uid);
  return u && u.tok_ver === pl.tv ? u : null;
}

/* ---------- 请求辅助 ---------- */
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const ipOf = req => req.headers['x-real-ip'] || req.socket.remoteAddress || '';
const today = () => new Date().toISOString().slice(0, 10);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new ApiError(413, '请求体过大')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks))); } catch { reject(new ApiError(400, 'JSON 解析失败')); }
    });
    req.on('error', () => reject(new ApiError(400, '读取请求失败')));
  });
}
const pubUser = u => ({ id: u.id, phone: PHONE_RE.test(u.phone) ? u.phone.replace(/^(\d{3})\d{4}/, '$1****') : '', nickname: u.nickname, avatar: u.avatar || '', role: u.role, created_at: u.created_at, wx: !!u.wx_openid });
/* v43.6 微信登录：按 unionid（优先，统一网站/公众号/小程序）或 openid 匹配；无则建号（合成占位 phone 满足 NOT NULL/UNIQUE，可后续绑定真实号） */
function upsertWxUser({ openid, unionid, nickname, avatar }) {
  let u = null;
  if (unionid) u = q.userByUnionid.get(unionid);
  if (!u && openid) u = q.userByWxOpenid.get(openid);
  if (u) {
    q.userBindWx.run(openid || null, unionid || null, u.id);
    if (avatar) q.userFillAvatar.run(avatar, u.id);
    return q.userById.get(u.id);
  }
  const id = crypto.randomUUID();
  const phone = 'wx' + sha256((unionid || openid) + '|wx').slice(0, 18);
  const nick = (nickname || '').trim() || ('微信用户' + String(openid || '').slice(-4));
  q.userCreateWx.run(id, phone, openid || null, unionid || null, nick, avatar || '', now());
  return q.userById.get(id);
}
/* v58.4 微信登录两路（扫码 web / 公众号网页授权 mp）共享逻辑：
   state 构造（回跳白名单 + v58.3 绑定模式 uid 签入）与回调落库（绑定分支 + 登录建号分支） */
function wxStateFromReq(req) {
  const sp = new URL(req.url, 'http://x').searchParams;
  const ret = sp.get('return') || '';
  const safeRet = /^https?:\/\/([a-z0-9-]+\.)*puyouquan\.com(\/|$|\?)/i.test(ret) ? ret : 'https://zhipu.puyouquan.com/';
  let extra;
  if (sp.get('bind') === '1') {
    const cur = authUser(req);
    if (!cur) throw new ApiError(401, '请先登录再绑定微信');
    extra = { b: cur.id };
  }
  return wx.signState(safeRet, JWT_SECRET, 600, extra);
}
async function wxCallbackFlow(req, res, appid, secret) {
  const u2 = new URL(req.url, 'http://x');
  const code = u2.searchParams.get('code'), state = u2.searchParams.get('state');
  const st = state && wx.verifyState(state, JWT_SECRET);
  const back = (st && st.r) || 'https://zhipu.puyouquan.com/';
  const withFlag = (v) => back + (back.includes('?') ? '&' : '?') + 'wxlogin=' + v;
  if (!code || !st) return { ___redirect: withFlag('fail') };
  /* v58.3 绑定分支（state 携带 b=uid）：把该微信身份落到已登录的手机号账号上，不动登录态。
     该微信已被其他账号占用 → conflict（unionid/openid 唯一，不抢占不合并，避免误并号） */
  if (st.b) {
    const withB = (v) => back + (back.includes('?') ? '&' : '?') + 'wxbind=' + v;
    try {
      const prof = await wx.webExchange(code, { appid, secret });
      const target = q.userById.get(st.b);
      if (!target) return { ___redirect: withB('fail') };
      let ex = null;
      if (prof.unionid) ex = q.userByUnionid.get(prof.unionid);
      if (!ex && prof.openid) ex = q.userByWxOpenid.get(prof.openid);
      if (ex && ex.id !== st.b) return { ___redirect: withB('conflict') };
      q.userBindWx.run(prof.openid || null, prof.unionid || null, st.b);
      if (prof.avatar) q.userFillAvatar.run(prof.avatar, st.b);
      return { ___redirect: withB('ok') };
    } catch (e) { console.error('微信绑定失败:', e.message); return { ___redirect: withB('fail') }; }
  }
  try {
    const prof = await wx.webExchange(code, { appid, secret });
    const u = upsertWxUser(prof);
    setAuthCookie(res, jwtSign({ uid: u.id, tv: u.tok_ver }));
    return { ___redirect: withFlag('ok') };
  } catch (e) { console.error('微信登录失败:', e.message); return { ___redirect: withFlag('fail') }; }
}
// 谱库列表卡片元信息（类型/封面/小节数）——与编辑器 docType/ccCover 同源，供官网复刻同款卡片。
// 注：pubList 目前含 data 逐条解析；库规模大后可改存发布时快照的 type/cover 列避免每次解析。
function docTypeOf(d) {
  const vn = d.voxNotations || [], staff = n => n === 'staff' || n === 'bass' || n === 'alto';
  if ((d.tabVoices || []).length) { if (d.tabStaff && !(d.voxVoices || []).length) return 'solo'; return d.inst === 'uku' ? 'uku' : 'guitar'; }
  if (d.chordOnly) return 'chord';
  if (d.func) return 'func';
  if (vn[0] === 'staff' && vn[1] === 'bass') return d.pianoAcc ? 'pianoacc' : 'piano';
  if (staff(vn[0])) return (d.voxDual || [])[0] ? 'teach' : 'instr';
  return 'vocal';
}
function coverOf(d) {
  for (const m of (d.measures || [])) {
    const cs = (((m || {}).voxes || [])[0] || []).filter(c => c && (c.deg > 0 || (((c.lyrics || [])[0]) || '').trim()));
    if (cs.length) return cs.slice(0, 7).map(c => ({ deg: c.deg || 0, oct: c.oct || 0, ly: ((c.lyrics || [])[0] || '').slice(0, 2) }));
  }
  return [];
}
function pubShape(row) {
  let d = {}; try { d = JSON.parse(row.data); } catch (_) {}
  return { id: row.id, title: row.title, singer: row.singer, author: row.author, updated_at: row.updated_at,
    type: docTypeOf(d), price: 0, measures: (d.measures || []).length, cover: coverOf(d) };
}
const needScore = id => { const s = ID_RE.test(id) && q.scoreGet.get(id); if (!s) throw new ApiError(404, '谱面不存在'); return s; };
/* ---------- v60.0 平台管理：角色与审计 ----------
   role 三值：'user' / 'creator' / 'admin'（admin 天然包含创作者权限）。
   首个管理员只能在服务器上用 CLI 任命（node admin.js set-role <手机号> admin）——
   任何 HTTP 路径都无法自助提权，这是本模块的安全底线。 */
const isCreator = u => !!u && (u.role === 'creator' || u.role === 'admin');
const requireAdmin = u => { if (!u || u.role !== 'admin') throw new ApiError(403, '需要平台管理员权限'); return u; };
const adminLog = (adminId, action, target, detail) => {
  try { q.adminLogAdd.run(adminId, action, String(target || ''), String(detail || ''), now()); } catch (e) { console.error('adminLog', e); }
};
const needUser = id => { const u = q.userById.get(String(id || '')); if (!u) throw new ApiError(404, '用户不存在'); return u; };

/* ---------- 已发布谱的最小 SSR（title/description/og:image + JSON-LD，可被搜索引擎收录）----------
   动机：交互观看页 zhipu/?pub=ID 是纯前端渲染，爬虫抓到的是空壳；发布谱因此无法被搜索/微信收录。
   方案：/pub/:id 由本服务端出一张「可爬 + 可分享」的落地页（含元数据与静态谱面信息），真人再跳观看页；
   /pub/:id/cover.svg 出一张品牌封面供 og:image。三站 vhost 均 include 本 snippet，canonical 统一指向 puku 去重。*/
const TYPE_CN_SSR = { guitar: '弹唱谱', uku: '尤克里里谱', solo: '独奏谱', pianoacc: '钢琴弹唱谱', piano: '钢琴独奏谱', vocal: '歌谱', teach: '教学对照谱', instr: '器乐五线谱', func: '功能谱', chord: '和弦谱' };
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PUB_CANON = process.env.PUB_CANON || 'https://puku.puyouquan.com';   // canonical/og 主机（去重用）
const VIEW_HOST = process.env.VIEW_HOST || 'https://zhipu.puyouquan.com';  // 真人交互观看页主机
function pubMeta(row) {
  let d = {}; try { d = JSON.parse(row.data); } catch (_) {}
  const title = (row.title || '').trim() || '未命名曲谱';
  const typeCn = TYPE_CN_SSR[docTypeOf(d)] || '曲谱';
  const nMea = (d.measures || []).length;
  const singer = (row.singer || '').trim();
  const author = (row.author || '').trim() || '谱友圈';
  const desc = `《${title}》${singer ? singer + '演唱 · ' : ''}${author}制谱 · ${typeCn}${nMea ? ' · 共' + nMea + '小节' : ''}。在谱友圈在线观看、即时移调、播放跟谱，也可免费制谱下载。`;
  return { id: row.id, title, typeCn, nMea, singer, author, desc, cover: coverOf(d) };
}
function pubSsrHtml(row) {
  const p = pubMeta(row), canon = `${PUB_CANON}/pub/${p.id}`, img = `${canon}/cover.svg`;
  /* v58.5 观看页驻 puku 域（用户要求分享链路地址栏全程 puku）：跳 site/kanpu.html（发布落位时
     由编辑器单文件复制而来），不再跳 zhipu；免费制谱 CTA 仍指 zhipu 编辑器 */
  const viewUrl = `${PUB_CANON}/kanpu.html?pub=${encodeURIComponent(p.id)}`;
  const pageTitle = `${p.title}${p.singer ? ' · ' + p.singer : ''} ${p.typeCn} - 谱友圈谱库`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'MusicComposition',
    name: p.title, url: canon, image: img, description: p.desc,
    composer: { '@type': 'Person', name: p.author }, inLanguage: 'zh-CN',
  };
  if (p.singer) ld.recordedAs = { '@type': 'MusicRecording', name: p.title, byArtist: { '@type': 'MusicGroup', name: p.singer } };
  const jsonLd = JSON.stringify(ld).replace(/</g, '\\u003c');
  const coverRow = p.cover.map(c => `<b>${escHtml(c.deg || 0)}</b>${c.ly ? '<i>' + escHtml(c.ly) + '</i>' : ''}`).join('');
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(pageTitle)}</title>
<meta name="description" content="${escHtml(p.desc)}">
<link rel="canonical" href="${escHtml(canon)}">
<meta property="og:type" content="music.song">
<meta property="og:title" content="${escHtml(p.title + (p.singer ? ' · ' + p.singer : ''))}">
<meta property="og:description" content="${escHtml(p.desc)}">
<meta property="og:url" content="${escHtml(canon)}">
<meta property="og:image" content="${escHtml(img)}">
<meta property="og:site_name" content="谱友圈谱库">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonLd}</script>
<style>
:root{--ink:#141414;--muted:#8a8a8a;--accent:#3a5ce0;--paper:#faf8f4;--border:#e5e2dc}
*{box-sizing:border-box}body{margin:0;font:16px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--paper)}
.wrap{max-width:680px;margin:0 auto;padding:40px 20px;text-align:center}
.brand{color:var(--muted);font-size:13px;letter-spacing:.1em}
h1{font-size:28px;margin:.4em 0 .2em}.meta{color:var(--muted);margin-bottom:1.4em}
.cover{font-size:26px;color:var(--accent);margin:1em 0;line-height:2.2}.cover b{font-family:Georgia,serif;margin:0 .12em;font-weight:600}.cover i{font-style:normal;font-size:14px;color:var(--muted);margin-right:.4em}
.cta{display:inline-block;margin:1em .4em;padding:12px 28px;border-radius:24px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}
.cta.ghost{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.tip{color:var(--muted);font-size:13px;margin-top:1.6em}a{color:var(--accent)}
</style></head><body>
<div class="wrap">
<div class="brand">谱友圈 · 谱库</div>
<h1>${escHtml(p.title)}</h1>
<div class="meta">${p.singer ? escHtml(p.singer) + ' 演唱 · ' : ''}${escHtml(p.author)} 制谱 · ${escHtml(p.typeCn)}${p.nMea ? ' · 共 ' + p.nMea + ' 小节' : ''}</div>
${coverRow ? '<div class="cover">' + coverRow + '</div>' : ''}
<a class="cta" href="${escHtml(viewUrl)}">▶ 在线观看 / 移调 / 跟谱</a>
<a class="cta ghost" href="${escHtml(VIEW_HOST)}/">免费制谱</a>
<p class="tip">正在进入在线观看页…若未自动跳转，请点上方按钮。<br>谱友圈 —— AI 时代的智能制谱 / 配谱工具</p>
</div>
<script>setTimeout(function(){location.replace(${JSON.stringify(viewUrl)})},1200);</script>
</body></html>`;
}
function pubCoverSvg(row) {
  const p = pubMeta(row);
  const W = 1200, H = 630;
  const notes = p.cover.slice(0, 7);
  const cw = 120, x0 = W / 2 - (notes.length - 1) * cw / 2, cy = 400;
  const dot = (cx, y, n) => Array.from({ length: n }, (_, i) => `<circle cx="${cx}" cy="${y + (y < cy ? -i * 14 : i * 14)}" r="4" fill="#3a5ce0"/>`).join('');
  const noteSvg = notes.map((c, i) => {
    const cx = x0 + i * cw;
    const up = (c.oct || 0) > 0 ? dot(cx, cy - 78, c.oct) : '';
    const dn = (c.oct || 0) < 0 ? dot(cx, cy + 20, -c.oct) : '';
    const ly = c.ly ? `<text x="${cx}" y="${cy + 70}" font-size="30" fill="#8a8a8a" text-anchor="middle">${escHtml(c.ly)}</text>` : '';
    return `${up}<text x="${cx}" y="${cy}" font-family="Georgia,serif" font-size="88" fill="#141414" text-anchor="middle">${escHtml(c.deg || 0)}</text>${dn}${ly}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#faf8f4"/>
<rect x="0" y="0" width="${W}" height="10" fill="#3a5ce0"/>
<text x="${W / 2}" y="120" font-size="30" fill="#8a8a8a" text-anchor="middle" letter-spacing="6">谱友圈 · 谱库</text>
<text x="${W / 2}" y="210" font-size="72" font-weight="700" fill="#141414" text-anchor="middle">${escHtml(p.title.slice(0, 16))}</text>
<text x="${W / 2}" y="270" font-size="34" fill="#8a8a8a" text-anchor="middle">${escHtml((p.singer ? p.singer + ' 演唱 · ' : '') + p.typeCn + (p.nMea ? ' · ' + p.nMea + ' 小节' : ''))}</text>
${noteSvg}
<text x="${W / 2}" y="580" font-size="28" fill="#3a5ce0" text-anchor="middle">扫码或点击 · 在线观看 / 移调 / 跟谱 · puyouquan.com</text>
</svg>`;
}

/* ---------- 路由表 ---------- */
// [method, 正则, 需登录, handler(m, body, user, req, res) -> 返回对象或 {___status, ...}]
const routes = [
  ['GET', /^\/api\/health$/, false, () => ({ ok: true, ver: VER, ts: now(), wx_web: !!(WX_WEB_APPID && WX_WEB_SECRET), wx_mp: !!(WX_MP_OAUTH && WX_MP_APPID && WX_MP_SECRET), wxpay: wxpayOn() })],

  /* -- 认证 -- */
  ['POST', /^\/api\/auth\/sms\/send$/, false, async (m, b, _u, req) => {
    const phone = String(b.phone || '');
    if (!PHONE_RE.test(phone)) throw new ApiError(400, '手机号格式不正确');
    const ip = ipOf(req), day = today(), t = now();
    if ((q.ipQuotaGet.get(ip, day)?.count || 0) >= 20) throw new ApiError(429, '今日发送过于频繁');
    const prev = q.otpGet.get(phone);
    if (prev && t - prev.last_sent_at < 60) throw new ApiError(429, '发送太频繁，请一分钟后再试');
    const dayCount = prev && prev.day === day ? prev.day_count + 1 : 1;
    if (dayCount > 5) throw new ApiError(429, '该手机号今日发送次数已达上限');
    const code = String(crypto.randomInt(100000, 1000000));
    await sendSms(phone, code);
    q.otpUpsert.run(phone, sha256(code + phone), t + 300, day, dayCount, t);
    q.ipQuotaBump.run(ip, day);
    return process.env.DEV_OTP === '1' ? { sent: true, dev_code: code } : { sent: true };
  }],
  ['POST', /^\/api\/auth\/sms\/verify$/, false, (m, b, _u, req, res) => {
    const phone = String(b.phone || ''), code = String(b.code || '');
    if (!PHONE_RE.test(phone) || !/^\d{6}$/.test(code)) throw new ApiError(400, '参数不正确');
    const row = q.otpGet.get(phone);
    if (!row || row.expires_at < now()) throw new ApiError(400, '验证码已过期，请重新获取');
    if (row.attempts >= 5) throw new ApiError(429, '尝试次数过多，请重新获取验证码');
    if (row.code_hash !== sha256(code + phone)) { q.otpAttempt.run(phone); throw new ApiError(400, '验证码不正确'); }
    q.otpDelete.run(phone);
    let u = q.userByPhone.get(phone);
    if (!u) {
      const id = crypto.randomUUID();
      q.userCreate.run(id, phone, '谱友' + phone.slice(-4), now());
      u = q.userById.get(id);
      q.eventAdd.run(u.id, 'signup', 'sms', now());     // v45.3 埋点
    } else q.eventAdd.run(u.id, 'login', 'sms', now());
    setAuthCookie(res, jwtSign({ uid: u.id, tv: u.tok_ver }));
    return { user: pubUser(u), is_new: u.created_at >= now() - 5 };
  }],
  ['POST', /^\/api\/auth\/logout$/, false, (m, b, _u, req, res) => { clearAuthCookie(res); return { ok: true }; }],
  // 退出所有设备：自增 tok_ver 使该用户全部已签发 JWT 立即失效（应对 token 泄露/被盗；普通登出仅清本端 Cookie）
  ['POST', /^\/api\/me\/logout-all$/, true, (m, b, u, req, res) => { q.userBumpTokVer.run(u.id); clearAuthCookie(res); return { ok: true }; }],

  /* -- 微信登录（A 开放平台·网站应用扫码 /wx/web/*；v58.4 B 公众号网页授权 /wx/mp/*，微信内免扫码）
        两路共享 state 签名与回调落库逻辑，仅凭据（AppID/Secret）不同 -- */
  ['GET', /^\/api\/wx\/web\/login-url$/, false, (m, b, _u, req) => {
    if (!WX_WEB_APPID || !WX_WEB_SECRET) throw new ApiError(503, '微信登录未配置');
    const state = wxStateFromReq(req);
    return { url: wx.buildLoginUrl({ appid: WX_WEB_APPID, redirect: WX_WEB_REDIRECT, state }) };
  }],
  ['GET', /^\/api\/wx\/web\/callback$/, false, (m, b, _u, req, res) => wxCallbackFlow(req, res, WX_WEB_APPID, WX_WEB_SECRET)],
  ['GET', /^\/api\/wx\/mp\/login-url$/, false, (m, b, _u, req) => {
    if (!WX_MP_OAUTH || !WX_MP_APPID || !WX_MP_SECRET) throw new ApiError(503, '微信登录未配置');
    const state = wxStateFromReq(req);
    return { url: wx.buildMpAuthUrl({ appid: WX_MP_APPID, redirect: WX_MP_REDIRECT, state }) };
  }],
  ['GET', /^\/api\/wx\/mp\/callback$/, false, (m, b, _u, req, res) => wxCallbackFlow(req, res, WX_MP_APPID, WX_MP_SECRET)],

  /* -- v55.3 微信 JS-SDK 分享签名：viewer 页转发出自定义卡片（标题/摘要/缩略图）。
        仅为本站域名下的页面签名（防外站白嫖 ticket）；未配置公众号凭据时 503 -- */
  ['GET', /^\/api\/wx\/jssign$/, false, async (m, b, _u, req) => {
    if (!WX_MP_APPID || !WX_MP_SECRET) throw new ApiError(503, '微信 JS-SDK 未配置');
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    if (!/^https?:\/\/([a-z0-9-]+\.)*puyouquan\.com(\/|$|\?)/i.test(url)) throw new ApiError(400, '仅限本站页面签名');
    const ticket = await wx.jsapiTicket({ appid: WX_MP_APPID, secret: WX_MP_SECRET });
    return { appId: WX_MP_APPID, ...wx.jsapiSign(ticket, url) };
  }],

  /* -- 我的资料 -- */
  ['GET', /^\/api\/me$/, true, (m, b, u) => ({
    user: pubUser(u),
    stats: { scores: q.scoreCount.get(u.id).n, collections: q.collCount.get(u.id).n },
  })],
  ['PATCH', /^\/api\/me$/, true, (m, b, u) => {
    /* v58.9 支持改头像：avatar 为 data:image/*（前端压到 96×96 JPEG，服务端封顶 40KB 字符）
       或空串清除；nickname/avatar 至少给一个，各自独立校验独立落库 */
    const hasNick = b.nickname !== undefined, hasAva = b.avatar !== undefined;
    if (!hasNick && !hasAva) throw new ApiError(400, '没有要修改的字段');
    if (hasNick) {
      const nick = String(b.nickname || '').trim();
      if (!nick || nick.length > 24) throw new ApiError(400, '昵称需为 1-24 个字符');
      q.userSetNick.run(nick, u.id);
    }
    if (hasAva) {
      const ava = String(b.avatar || '');
      if (ava !== '' && !/^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(ava)) throw new ApiError(400, '头像格式不支持');
      if (ava.length > 40000) throw new ApiError(400, '头像图片过大，请重新选择');
      q.userSetAvatar.run(ava, u.id);
    }
    return { user: pubUser(q.userById.get(u.id)) };
  }],
  ['POST', /^\/api\/me\/creator$/, true, (m, b, u) => {   // 创作者开放注册
    q.userSetRole.run('creator', u.id);
    return { user: pubUser(q.userById.get(u.id)) };
  }],

  /* -- v45.3 会员权益 / 兑换码 / 埋点 -- */
  ['GET', /^\/api\/me\/entitlements$/, true, (m, b, u) => {
    const t = now();
    const list = q.entList.all(u.id).filter(e => e.expires_at === 0 || e.expires_at > t);
    const vip = !!q.entActive.get(u.id, 'vip', t);
    return { entitlements: list, vip, quota: vip ? MAX_SCORES_VIP : MAX_SCORES };
  }],
  ['POST', /^\/api\/redeem$/, true, (m, b, u, req) => {
    const code = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{8,29}$/.test(code)) throw new ApiError(400, '兑换码格式不正确');
    const ip = ipOf(req), day = today();                              // 复用 IP 日频控防爆破（与短信共表不同额度语义：此处 30 次/日）
    if ((q.ipQuotaGet.get('rd:' + ip, day)?.count || 0) >= 30) throw new ApiError(429, '尝试过于频繁，请明日再试');
    q.ipQuotaBump.run('rd:' + ip, day);
    const r = redeemApply(code, u.id);
    if (!r) throw new ApiError(400, '兑换码无效或已被使用');
    q.eventAdd.run(u.id, 'redeem_ok', r.kind, now());
    return { ok: true, kind: r.kind, expires_at: r.expires_at };
  }],
  /* -- v45.4 微信支付（Native 扫码）：下单→前端出码→轮询 status；发货一律以主动查单 SUCCESS 为准 -- */
  ['GET', /^\/api\/pay\/prices$/, false, () => ({
    wxpay: wxpayOn(),
    prices: Object.fromEntries(Object.entries(PRICES).map(([k, v]) => [k, { fen: v.fen, desc: v.desc }])),
  })],
  ['POST', /^\/api\/pay\/create$/, true, async (m, b, u) => {
    if (!wxpayOn()) throw new ApiError(503, '微信支付未配置');
    const p = PRICES[String(b.kind || '')];
    if (!p) throw new ApiError(400, '未知商品');
    const t = now();
    const otn = ('P' + t + crypto.randomBytes(6).toString('hex')).slice(0, 32);   // 商户单号：≤32 位字母数字
    const orderId = crypto.randomUUID();
    q.orderCreate.run(orderId, u.id, b.kind, p.fen, 'wxpay', otn, 'pending', t, null);
    const codeUrl = await wxpay.nativePrepay({ description: p.desc, outTradeNo: otn, totalFen: p.fen, notifyUrl: WXPAY.notifyUrl }, WXPAY);
    return { order_id: orderId, code_url: codeUrl, amount_fen: p.fen };
  }],
  ['GET', /^\/api\/pay\/status\/([A-Za-z0-9-]+)$/, true, async (m, b, u) => {
    const o = q.orderGet.get(m[1]);
    if (!o || o.user_id !== u.id) throw new ApiError(404, '订单不存在');
    if (o.status === 'paid') return { status: 'paid' };
    if (o.status !== 'pending' || o.channel !== 'wxpay') return { status: o.status };
    const r = await wxpay.queryByOutTradeNo(o.out_trade_no, WXPAY);   // 查单确认（伪造回调无法触发发货）
    if (r.state === 'SUCCESS') {
      const p = PRICES[o.kind];
      if (p) fulfillOrder(o.id, p.ent, p.days);
      return { status: 'paid' };
    }
    if (r.state === 'CLOSED' || r.state === 'REVOKED' || r.state === 'PAYERROR') return { status: 'closed' };
    return { status: 'pending' };
  }],
  ['POST', /^\/api\/pay\/notify$/, false, async (m, b) => {
    /* 回调仅当加速器：解密拿单号 → 主动查单确认 → 发货（幂等）。解不开/查不到一律回 FAIL 让微信重试。 */
    if (!wxpayOn()) return { ___status: 503, code: 'FAIL', message: 'not configured' };
    try {
      const res = b && b.resource;
      const inner = wxpay.decryptNotify({ ciphertext: res.ciphertext, nonce: res.nonce, associatedData: res.associated_data }, WXPAY.apiV3Key);
      const o = q.orderByOtn.get(inner.out_trade_no || '');
      if (o && o.status === 'pending') {
        const r = await wxpay.queryByOutTradeNo(o.out_trade_no, WXPAY);
        if (r.state === 'SUCCESS') { const p = PRICES[o.kind]; if (p) fulfillOrder(o.id, p.ent, p.days); }
      }
      return { code: 'SUCCESS', message: '' };
    } catch (e) { console.error('支付回调处理失败:', e.message); return { ___status: 500, code: 'FAIL', message: 'retry' }; }
  }],

  ['POST', /^\/api\/events$/, false, (m, b, u, req) => {
    const name = String(b.name || '');
    if (!EVENT_NAMES.has(name)) return { ok: true };                  // 未知事件静默丢弃（不给探测面）
    const ip = ipOf(req);
    const h = Math.floor(Date.now() / 3600000);
    if (evHour !== h) { evHour = h; evCount.clear(); }
    const c = (evCount.get(ip) || 0) + 1; evCount.set(ip, c);
    if (c > 300) return { ok: true };                                 // 每 IP 每小时 300 条上限，超出静默丢弃
    q.eventAdd.run(u ? u.id : null, name, String(b.meta || '').slice(0, 120), now());
    return { ok: true };
  }],

  /* -- 谱面云同步（客户端 id，最后写入胜出 + 冲突提示）-- */
  ['GET', /^\/api\/scores$/, true, (m, b, u) => ({ scores: q.scoreList.all(u.id) })],
  ['GET', /^\/api\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id && s.status !== 'published') throw new ApiError(403, '无权访问');
    return { score: { ...s, data: JSON.parse(s.data) } };
  }],
  ['PUT', /^\/api\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const id = m[1];
    if (!ID_RE.test(id)) throw new ApiError(400, '谱面 id 不合法');
    if (typeof b.data !== 'object' || b.data === null) throw new ApiError(400, '缺少谱面数据');
    const data = JSON.stringify(b.data);
    if (data.length > 2 * 1024 * 1024) throw new ApiError(413, '谱面过大');
    const t = Math.floor(+b.updated_at || now());
    const exist = q.scoreGet.get(id);
    if (exist) {
      if (exist.user_id !== u.id) throw new ApiError(403, '该 id 已被占用');
      if (t < exist.updated_at) return { ___status: 409, conflict: true, server_updated_at: exist.updated_at };
    } else {                                     // v45.3 配额按会员态：vip 2000 / 免费 500
      const cap = q.entActive.get(u.id, 'vip', now()) ? MAX_SCORES_VIP : MAX_SCORES;
      if (q.scoreCount.get(u.id).n >= cap) throw new ApiError(403, `云端谱面数量已达上限（${cap}${cap === MAX_SCORES ? '，开通会员可扩容至 ' + MAX_SCORES_VIP : ''}）`);
    }
    q.scoreUpsert.run(id, u.id, String(b.title || '').slice(0, 120), String(b.singer || '').slice(0, 60), data, t, now());
    return { saved: true, updated_at: t };
  }],
  ['DELETE', /^\/api\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = q.scoreGet.get(m[1]);
    if (!s) return { deleted: true };                                    // 幂等：不存在视为已删
    if (s.user_id !== u.id) throw new ApiError(403, '只能删除自己的曲谱');   // 所有权校验先于任何级联
    deleteScoreCascade(m[1], u.id);                                      // 事务：清引用 + 删本体
    return { deleted: true };
  }],

  /* -- 发布 / 下架到谱库（需创作者角色）-- */
  /* v60.0 审核流：创作者提交 → status='pending'（谱库不展示）→ 管理员通过才 'published'。
     管理员自己发布的谱直接上架（免自审）。返回 status 供前端显示「审核中」。 */
  ['POST', /^\/api\/scores\/([A-Za-z0-9_-]+)\/publish$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '只能发布自己的曲谱');
    if (!isCreator(u)) throw new ApiError(403, '请先在个人中心「成为创作者」');
    const st = u.role === 'admin' ? 'published' : 'pending';
    q.scoreReview.run(st, '', s.id);
    return { published: st === 'published', status: st, pending: st === 'pending' };
  }],
  ['POST', /^\/api\/scores\/([A-Za-z0-9_-]+)\/unpublish$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '无权操作');
    q.scoreSetStatus.run('private', s.id, u.id);
    return { unpublished: true };
  }],

  /* -- v60.0 平台管理（全部需 role='admin'；写操作一律记 admin_logs 审计）-- */
  ['GET', /^\/api\/admin\/overview$/, true, (m, b, u) => {
    requireAdmin(u);
    const roles = {}; q.userCountRole.all().forEach(r => { roles[r.role] = r.n; });
    const sts = {}; q.scoreCountBySt.all().forEach(r => { sts[r.status] = r.n; });
    const paid = q.orderPaidAgg.get();
    return { users: q.userCount.get().n, roles, scores: q.scoreCountAll.get().n, scoreStatus: sts,
      pending: sts.pending || 0, published: sts.published || 0,
      orders: { paid: paid.n, amount_fen: paid.fen },
      funnel: q.eventStats.all(now() - 7 * 86400) };
  }],
  ['GET', /^\/api\/admin\/users$/, true, (m, b, u, req) => {
    requireAdmin(u);
    const kw = (new URL(req.url, 'http://x').searchParams.get('q') || '').trim().slice(0, 40);
    const rows = kw ? q.userSearch.all('%' + kw + '%', '%' + kw + '%', 50) : q.userRecent.all(50);
    return { users: rows.map(r => ({ ...r, phone: PHONE_RE.test(r.phone) ? r.phone.replace(/^(\d{3})\d{4}/, '$1****') : '' })) };
  }],
  ['POST', /^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/role$/, true, (m, b, u) => {
    requireAdmin(u);
    const target = needUser(m[1]), role = String(b.role || '');
    if (!['user', 'creator', 'admin'].includes(role)) throw new ApiError(400, '角色只能是 user / creator / admin');
    if (target.id === u.id && role !== 'admin') throw new ApiError(400, '不能取消自己的管理员身份（请由另一位管理员操作，或用服务器 CLI）');
    q.userSetRole.run(role, target.id);
    adminLog(u.id, 'role', target.id, target.role + '→' + role);
    return { ok: true, role };
  }],
  ['POST', /^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/grant$/, true, (m, b, u) => {
    requireAdmin(u);
    const target = needUser(m[1]);
    const kind = String(b.kind || '').trim(), days = Math.max(0, Math.min(3650, parseInt(b.days, 10) || 0));
    if (!/^[a-z0-9_]{2,32}$/.test(kind)) throw new ApiError(400, '权益类型不合法（小写字母/数字/下划线）');
    const t = now();
    const cur = q.entActive.get(target.id, kind, t);
    const expires = days > 0 ? ((cur && cur.expires_at > t) ? cur.expires_at : t) + days * 86400 : 0;
    q.entAdd.run(crypto.randomUUID(), target.id, kind, expires, 'admin:' + u.id, t);
    adminLog(u.id, 'grant', target.id, kind + (days ? '+' + days + '天' : '（永久）'));
    return { ok: true, kind, expires_at: expires };
  }],
  ['POST', /^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/revoke$/, true, (m, b, u) => {
    requireAdmin(u);
    const target = needUser(m[1]), kind = String(b.kind || '').trim();
    if (!kind) throw new ApiError(400, '缺少权益类型');
    q.entDel.run(target.id, kind);
    adminLog(u.id, 'revoke', target.id, kind);
    return { ok: true };
  }],
  ['GET', /^\/api\/admin\/reviews$/, true, (m, b, u, req) => {
    requireAdmin(u);
    const st = (new URL(req.url, 'http://x').searchParams.get('status') || 'pending');
    if (!['pending', 'published', 'rejected'].includes(st)) throw new ApiError(400, '状态不合法');
    return { status: st, scores: q.reviewList.all(st, 50).map(r => ({ ...r, phone: PHONE_RE.test(r.phone) ? r.phone.replace(/^(\d{3})\d{4}/, '$1****') : '' })) };
  }],
  /* 审核预览：管理员按 id 读任意谱（含未上架的 pending），供编辑器 ?review=ID 进观看模式核对谱面 */
  ['GET', /^\/api\/admin\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const s = needScore(m[1]), au = q.userById.get(s.user_id);
    return { score: { id: s.id, title: s.title, singer: s.singer, author: au ? au.nickname : '',
      status: s.status, review_note: s.review_note || '', updated_at: s.updated_at, data: JSON.parse(s.data) } };
  }],
  ['POST', /^\/api\/admin\/scores\/([A-Za-z0-9_-]+)\/review$/, true, (m, b, u) => {
    requireAdmin(u);
    const s = needScore(m[1]);
    const act = String(b.action || '');
    if (!['approve', 'reject', 'unpublish'].includes(act)) throw new ApiError(400, '操作只能是 approve / reject / unpublish');
    const note = String(b.note || '').slice(0, 200);
    if (act === 'reject' && !note) throw new ApiError(400, '驳回需填写原因（会展示给创作者）');
    const st = act === 'approve' ? 'published' : act === 'reject' ? 'rejected' : 'private';
    q.scoreReview.run(st, act === 'approve' ? '' : note, s.id);
    adminLog(u.id, act, s.id, (s.title || '') + (note ? ' · ' + note : ''));
    return { ok: true, status: st };
  }],
  ['GET', /^\/api\/admin\/logs$/, true, (m, b, u) => {
    requireAdmin(u);
    return { logs: q.adminLogList.all(50).map(l => ({ ...l, admin_phone: PHONE_RE.test(l.admin_phone) ? l.admin_phone.replace(/^(\d{3})\d{4}/, '$1****') : '' })) };
  }],

  /* -- 公开谱库（谱库 puku，无需登录）-- */
  ['GET', /^\/api\/pub\/scores$/, false, () => ({ scores: q.pubList.all().map(pubShape) })],
  ['GET', /^\/api\/pub\/scores\/([A-Za-z0-9_-]+)$/, false, (m) => {
    const s = q.pubGet.get(m[1]);
    if (!s) throw new ApiError(404, '曲谱不存在或未发布');
    return { score: { ...s, data: JSON.parse(s.data) } };
  }],

  /* -- 已发布谱 SSR 落地页 + og 封面（无需登录，供搜索引擎/社交爬虫收录）-- */
  ['GET', /^\/pub\/([A-Za-z0-9_-]+)$/, false, (m, b, u, req, res) => {
    const s = q.pubGet.get(m[1]);
    if (!s) return { ___raw: '<!doctype html><meta charset="utf-8"><title>曲谱不存在 - 谱友圈</title><body style="font:16px sans-serif;text-align:center;padding:60px">该曲谱不存在或已下架。<a href="//puku.puyouquan.com/">返回谱库</a>', ___ctype: 'text/html; charset=utf-8', ___cache: 'no-store', ___status: 404 };
    return { ___raw: pubSsrHtml(s), ___ctype: 'text/html; charset=utf-8', ___cache: 'public, max-age=300' };
  }],
  ['GET', /^\/pub\/([A-Za-z0-9_-]+)\/cover\.svg$/, false, (m) => {
    const s = q.pubGet.get(m[1]);
    if (!s) return { ___status: 404, ___raw: '', ___ctype: 'image/svg+xml', ___cache: 'no-store' };
    return { ___raw: pubCoverSvg(s), ___ctype: 'image/svg+xml; charset=utf-8', ___cache: 'public, max-age=600' };
  }],
  // 已发布谱动态 sitemap：每首谱一条 /pub/:id，供搜索引擎抓取（robots.txt 引用本地址）
  ['GET', /^\/pub\/sitemap\.xml$/, false, () => {
    const rows = q.pubList.all();
    const urls = rows.map(r => `  <url><loc>${PUB_CANON}/pub/${escHtml(r.id)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    return { ___raw: xml, ___ctype: 'application/xml; charset=utf-8', ___cache: 'public, max-age=600' };
  }],

  /* -- 收藏 -- */
  ['GET', /^\/api\/favorites$/, true, (m, b, u) => ({ favorites: q.favList.all(u.id) })],
  ['PUT', /^\/api\/favorites\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id && s.status !== 'published') throw new ApiError(403, '仅可收藏已发布的谱面');
    q.favPut.run(u.id, s.id, now()); return { ok: true };
  }],
  ['DELETE', /^\/api\/favorites\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => { q.favDel.run(u.id, m[1]); return { ok: true }; }],

  /* -- 谱架（练习清单，带进度）-- */
  ['GET', /^\/api\/shelf$/, true, (m, b, u) => ({ shelf: q.shelfList.all(u.id) })],
  ['PUT', /^\/api\/shelf\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id && s.status !== 'published') throw new ApiError(403, '仅可加入自己的或已发布的谱面');
    q.shelfPut.run(u.id, s.id, now());
    if (b.progress !== undefined) q.shelfProg.run(String(b.progress).slice(0, 200), u.id, s.id);
    return { ok: true };
  }],
  ['DELETE', /^\/api\/shelf\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => { q.shelfDel.run(u.id, m[1]); return { ok: true }; }],

  /* -- 谱集 -- */
  ['GET', /^\/api\/collections$/, true, (m, b, u) => ({ collections: q.collList.all(u.id) })],
  ['POST', /^\/api\/collections$/, true, (m, b, u) => {
    const name = String(b.name || '').trim();
    if (!name || name.length > 40) throw new ApiError(400, '谱集名需为 1-40 个字符');
    if (q.collCount.get(u.id).n >= MAX_COLLS) throw new ApiError(403, `谱集数量已达上限（${MAX_COLLS}）`);
    const id = crypto.randomUUID();
    q.collCreate.run(id, u.id, name, now());
    return { id, name };
  }],
  ['GET', /^\/api\/collections\/([A-Za-z0-9-]+)$/, true, (m, b, u) => {
    const c = q.collGet.get(m[1], u.id); if (!c) throw new ApiError(404, '谱集不存在');
    return { collection: c, items: q.collItems.all(c.id) };
  }],
  ['PATCH', /^\/api\/collections\/([A-Za-z0-9-]+)$/, true, (m, b, u) => {
    const name = String(b.name || '').trim();
    if (!name || name.length > 40) throw new ApiError(400, '谱集名需为 1-40 个字符');
    q.collRename.run(name, m[1], u.id); return { ok: true };
  }],
  ['DELETE', /^\/api\/collections\/([A-Za-z0-9-]+)$/, true, (m, b, u) => {
    const c = q.collGet.get(m[1], u.id); if (!c) throw new ApiError(404, '谱集不存在');
    q.collItemsDelByColl.run(c.id); q.collDelete.run(c.id, u.id); return { ok: true };
  }],
  ['PUT', /^\/api\/collections\/([A-Za-z0-9-]+)\/items\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const c = q.collGet.get(m[1], u.id); if (!c) throw new ApiError(404, '谱集不存在');
    const s = needScore(m[2]);
    if (s.user_id !== u.id && s.status !== 'published') throw new ApiError(403, '仅可加入自己的或已发布的谱面');
    if (q.collItemCount.get(c.id).n >= MAX_COLL_ITEMS) throw new ApiError(403, '谱集容量已达上限');
    q.collItemPut.run(c.id, s.id, now()); return { ok: true };
  }],
  ['DELETE', /^\/api\/collections\/([A-Za-z0-9-]+)\/items\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const c = q.collGet.get(m[1], u.id); if (!c) throw new ApiError(404, '谱集不存在');
    q.collItemDel.run(c.id, m[2]); return { ok: true };
  }],
];

/* ---------- HTTP 服务 ---------- */
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const path = req.url.split('?')[0];
    for (const [method, re, needAuth, handler] of routes) {
      if (req.method !== method) continue;
      const m = re.exec(path);
      if (!m) continue;
      const user = authUser(req);
      if (needAuth && !user) throw new ApiError(401, '请先登录');
      const body = (method === 'GET' || method === 'DELETE') ? {} : await readBody(req);
      const out = await handler(m, body, user, req, res);
      if (out && out.___redirect) { res.writeHead(302, { Location: out.___redirect }); res.end(); return; }   // v43.6 微信回调 302 回跳
      if (out && out.___raw !== undefined) {   // SSR 落地页 / og 封面：非 JSON 原样输出（覆盖默认 Content-Type/no-store）
        res.statusCode = out.___status || 200;
        res.setHeader('Content-Type', out.___ctype || 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', out.___cache || 'public, max-age=300');
        res.end(out.___raw);
        return;
      }
      res.statusCode = out && out.___status || 200;
      if (out) delete out.___status;
      res.end(JSON.stringify(out ?? { ok: true }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: '接口不存在' }));
  } catch (e) {
    res.statusCode = e.status || 500;
    if (!e.status) console.error(req.method, req.url, e);
    res.end(JSON.stringify({ error: e.status ? e.message : '服务器内部错误' }));
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`pyq-api ${VER} listening on 127.0.0.1:${PORT}`));
