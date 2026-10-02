'use strict';
// 谱友圈 API · M1：手机验证码登录 + 个人中心（谱面云同步/收藏/谱架/谱集）
// 零依赖：Node 24 内建模块（node:http / node:sqlite / node:crypto）。
// 部署：systemd 服务 pyq-api，nginx 各 vhost include snippets/pyq-api.conf 反代 /api/。
const http = require('node:http');
const crypto = require('node:crypto');
const { q, now, mergeUserInto, deleteScoreCascade, redeemApply, fulfillOrder, retractBroadcast } = require('./db');
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
/* v60.1 小程序静默登录：与公众号/开放平台是**第三套**独立凭据（小程序后台 → 开发管理 → 开发设置）。
   要与网页微信登录并成同一账号，需把小程序绑定到与网站应用/公众号同一个开放平台账号（才有 unionid）。*/
const WX_MINI_APPID = process.env.WX_MINI_APPID || '';
const WX_MINI_SECRET = process.env.WX_MINI_SECRET || '';
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
  /* v62.9 A4（D-01 拍板「停售改预约」）：内容尚未交付，不再接新单——条目保留供已付款订单的回调/查单照常履约 */
  pack_kaobian: { fen: 3900, ent: 'pack_kaobian', days: 0,   desc: '谱友圈 · 考编内容包（买断）', sale: false },
};

const VER = 'wx-1';
const MAX_BODY = 3 * 1024 * 1024;      // 谱面 JSON 上限 3MB（nginx 侧另有 4m）
const MAX_SCORES = 500, MAX_COLLS = 50, MAX_COLL_ITEMS = 500;
const MAX_SCORES_VIP = 2000;                    // v45.3 会员云配额（第一个真实权益开关）
/* v45.3 埋点白名单（客户端 8 + 服务端 4：signup/login/redeem_ok/order_paid 由 handler 直写） */
const EVENT_NAMES = new Set(['visit', 'create_song', 'export', 'publish', 'open_pub', 'paywall_view', 'fav', 'like', 'share_card',
  'signup', 'login', 'redeem_ok', 'order_paid']);
let evHour = 0; const evCount = new Map();       // 每 IP 每小时事件计数（内存态，重启清零可接受）
let thumbHour = 0; const thumbCount = new Map(); // v60.7 每用户每小时缩图上传计数（同上，内存态）
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
const { scoreDataDanger } = require('./scoredata');   // v62.5 A1a 谱面数据按字段校验（admin.js scan-xss 共用）
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
  /* v60.6 卡片信息补全：谱种/小节数之外再给 调号·拍号·速度·歌词版数——
     卡片一眼能判断「这份谱能不能用」，不用点进去。thumb 为 1 时前端换真实缩图。 */
  const mea = d.measures || [];
  return { id: row.id, title: row.title, singer: row.singer, author: row.author, updated_at: row.updated_at,
    type: docTypeOf(d), typeLabel: typeLabelOf(d), price: 0, measures: mea.length, cover: coverOf(d),
    /* v60.7 thumb 从 0/1 改传 thumb_at 时间戳：既当有无标志（truthy 判断不变），又给前端当
       缓存戳拼 ?v=——此前 URL 恒定 + max-age=86400，重新发布后卡片最长一整天吃陈图 */
    thumb: row.thumb_at || 0,
    key: String(d.key || '').slice(0, 6), tempo: +d.tempo || 0,
    beats: +d.beats || 0, unit: +d.unit || 0,
    /* v60.7 修字段名：歌词段数在 song 模型里叫 lyricLines（verses 不存在，此前恒为 0——
       「N 段词」信息条上线即死代码，复核实测抓出）；MAX_LYR=5，钳 9 仅防御脏数据 */
    verses: Math.max(0, Math.min(9, +d.lyricLines || 0)),
    /* v60.98 卡片带浏览/收藏数（产品指示：计数在谱库曲谱卡上显示；likes 一并透传备用） */
    views: +row.views || 0, likes: +row.likes || 0, favs: +row.favs || 0 };
}
/* v60.6 曲谱实例缩图：只收栅格图（webp/jpeg/png），按魔数硬校验后落库。
   收栅格不收 SVG 是安全取舍——SVG 同源直开会执行内嵌脚本，栅格没有脚本面。 */
const THUMB_MAX = 220 * 1024;
function decodeThumb(dataUrl) {
  const s = String(dataUrl || '');
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=\s]{64,})$/.exec(s);
  if (!m) throw new ApiError(400, '缩图格式不合法');
  let buf; try { buf = Buffer.from(m[2], 'base64'); } catch (_) { throw new ApiError(400, '缩图解码失败'); }
  if (!buf.length) throw new ApiError(400, '缩图为空');
  if (buf.length > THUMB_MAX) throw new ApiError(413, '缩图过大');
  /* v60.7 按整数逐字节精确比对：Node 的 'ascii' 解码会抹高位（0xD2→'R'），
     伪造高位字节可冒充 RIFF/WEBP 绕过魔数闸（复核实测复现过）；jpeg/png 分支本就精确 */
  const isWebp = buf.length > 12 && buf.readUInt32BE(0) === 0x52494646 && buf.readUInt32BE(8) === 0x57454250;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.toString('hex', 0, 8) === '89504e470d0a1a0a';
  const mime = isWebp ? 'image/webp' : isJpeg ? 'image/jpeg' : isPng ? 'image/png' : '';
  if (!mime || mime !== 'image/' + (m[1] === 'jpeg' ? 'jpeg' : m[1])) throw new ApiError(400, '缩图内容与声明格式不符');
  return { buf, mime };
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

/* ---------- v60.87 站内信 ----------
   notify 永不抛错——通知是主流程的旁路（审核照常生效，通知失败只记日志）；
   MSG_WIN=广播可见窗口 90 天（三条 SQL 口径一致，见 db.js msgList 注释）。 */
const MSG_WIN = 90 * 86400;
const notify = (userId, kind, title, body, link) => {
  try { q.msgAdd.run(userId, kind, String(title || '').slice(0, 80), String(body || '').slice(0, 2000), String(link || '').slice(0, 300), now()); }
  catch (e) { console.error('notify', e.message); }
};
/* 站内信 link 只认站内（相对路径或 *.puyouquan.com）——防管理号被盗后广播钓鱼外链 */
const SITE_LINK = /^(\/|https:\/\/([a-z0-9-]+\.)*puyouquan\.com\/)/i;

/* ---------- v60.1 小程序换票（内存态，进程重启即清空——120s 有效期内的登录重来一次即可）----------
   一次性：consume 后立刻删除，重放拿不到第二次 Cookie。签发时顺带清过期票，上限兜住异常刷量。 */
/* v62.7 A6 相关推荐缓存：每首谱一份，10 分钟过期；上限兜内存 */
const relCache = new Map();
function pubRelatedCached(id, singer) {
  const k = id + '|' + singer, hit = relCache.get(k), t = Date.now();
  if (hit && hit.exp > t) return hit.rows;
  if (relCache.size > 5000) relCache.clear();
  const rows = q.pubRelated.all(id, singer);
  relCache.set(k, { rows, exp: t + 600000 });
  return rows;
}
/* v62.9 A4 ⑧：默认昵称不再用手机号后四位（公开署名会泄露号码片段），改随机 4 位字母数字 */
function randNick() { return '谱友' + crypto.randomBytes(3).toString('hex').slice(0, 4).toUpperCase(); }
const RESERVE_KINDS = new Set(['pack_kaobian']);
const REPORT_REASONS = new Set(['copyright', 'wrong', 'spam', 'illegal', 'other']);
const MINI_TICKET_TTL = 30;   // v62.6 A1c 120→30s：票据只用于「换到即进 web-view」这一跳，窗口越短越难被截获重放
/* v62.6 A1c 占位号合并确认票：手机号登录时发现微信身份挂在一个**有数据**的占位号上，不静默合并（v60.5 原则），
   发一张 10 分钟的确认票给小程序，用户在确认页点「合并」才执行 */
const mergeOffers = new Map();
function mergeOfferIssue(fromId, toId, wxIds) {
  const nowMs = Date.now();
  for (const [k, v] of mergeOffers) if (v.exp <= nowMs) mergeOffers.delete(k);
  if (mergeOffers.size > 2000) mergeOffers.clear();
  const t = crypto.randomBytes(24).toString('base64url');
  mergeOffers.set(t, { fromId, toId, wxIds, exp: nowMs + 600000 });
  return t;
}
const miniTickets = new Map();
function miniTicketIssue(uid) {
  const nowMs = Date.now();
  for (const [k, v] of miniTickets) if (v.exp <= nowMs) miniTickets.delete(k);
  if (miniTickets.size > 5000) miniTickets.clear();            // 异常刷量兜底：宁可让在途票失效也不涨内存
  const t = crypto.randomBytes(24).toString('base64url');
  miniTickets.set(t, { uid, exp: nowMs + MINI_TICKET_TTL * 1000 });
  return t;
}
function miniTicketConsume(t) {
  const v = miniTickets.get(String(t || ''));
  if (!v) return null;
  miniTickets.delete(String(t));                               // 用一次即焚（先删再判过期，过期票也不留）
  return v.exp > Date.now() ? v.uid : null;
}

/* ---------- 已发布谱的最小 SSR（title/description/og:image + JSON-LD，可被搜索引擎收录）----------
   动机：交互观看页 zhipu/?pub=ID 是纯前端渲染，爬虫抓到的是空壳；发布谱因此无法被搜索/微信收录。
   方案：/pub/:id 由本服务端出一张「可爬 + 可分享」的落地页（含元数据与静态谱面信息），真人再跳观看页；
   /pub/:id/cover.svg 出一张品牌封面供 og:image。三站 vhost 均 include 本 snippet，canonical 统一指向 puku 去重。*/
const TYPE_CN_SSR = { guitar: '弹唱谱', uku: '尤克里里谱', solo: '独奏谱', pianoacc: '钢琴弹唱谱', piano: '钢琴独奏谱', vocal: '歌谱', teach: '教学对照谱', instr: '器乐五线谱', func: '功能谱', chord: '和弦谱' };
/* v60.81 谱类细分标签（产品指示：弹唱谱说清吉他/钢琴、歌谱说清简谱/五线谱）。
   与 muse-tab/index.html 的 docTypeLabel 同一张表——改一处必须同步另一处。 */
const TYPE_FULL_SSR = { guitar: '吉他弹唱谱', uku: '尤克里里谱', solo: '吉他独奏谱', pianoacc: '钢琴弹唱谱', piano: '钢琴独奏谱', teach: '教学对照谱', instr: '器乐五线谱', func: '功能谱', chord: '和弦谱' };
function typeLabelOf(d) {
  const t = docTypeOf(d);
  if (t === 'vocal') return '简谱歌谱';   /* docTypeOf 里 vocal 只会是简谱记谱 */
  /* 五线谱写的歌在 docTypeOf 里归为 instr——按「有没有实际歌词」区分（与编辑器 docTypeLabel 同口径） */
  if (t === 'instr') {
    const hasLy = (d.measures || []).some(m => ((m || {}).voxes || []).some(cols => (cols || []).some(c =>
      c && c.lyrics && c.lyrics.some(x => String(x || '').trim()))));
    return hasLy ? '五线谱歌谱' : '器乐五线谱';
  }
  return TYPE_FULL_SSR[t] || TYPE_CN_SSR[t] || '曲谱';
}
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PUB_CANON = process.env.PUB_CANON || 'https://puku.puyouquan.com';   // canonical/og 主机（去重用）
const VIEW_HOST = process.env.VIEW_HOST || 'https://zhipu.puyouquan.com';  // 真人交互观看页主机
const SITE_HOST = process.env.SITE_HOST || 'https://www.puyouquan.com';    // v62.0 官网主机（课程页所在）
/* v61.7 百度主动推送（收录提速）：谱面上架（直发/过审）时把落地页 URL 推给百度站长平台。
   token 走服务器环境变量 BAIDU_PUSH_TOKEN（凭据不入代码/仓库），未配置即静默跳过；
   旁路 fire-and-forget：推送失败只记日志，绝不影响发布主流程。 */
const BAIDU_PUSH_TOKEN = process.env.BAIDU_PUSH_TOKEN || '';
function baiduPush(ids) {
  if (!BAIDU_PUSH_TOKEN || !ids.length) return;
  try {
    fetch(`http://data.zz.baidu.com/urls?site=${encodeURIComponent(PUB_CANON)}&token=${encodeURIComponent(BAIDU_PUSH_TOKEN)}`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: ids.map(id => `${PUB_CANON}/pub/${id}`).join('\n'),
      signal: AbortSignal.timeout(8000),
    }).then(r => r.text()).then(t => console.log('[baidu-push]', ids.length, '条：', t.slice(0, 160)))
      .catch(e => console.error('[baidu-push]', e.message));
  } catch (e) { console.error('[baidu-push]', e.message); }
}
/* v61.7 收录加厚：落地页可爬正文的歌词节选与和弦进行（薄内容+秒跳转会被当「桥页」拒收） */
function lyricExcerpt(d, cap) {
  let out = '';
  for (const m of (d.measures || [])) for (const cols of ((m || {}).voxes || [])) for (const c of (cols || [])) {
    const w = String(((c || {}).lyrics || [])[0] || '').trim();
    if (w) { out += w; if (out.length >= cap) return out.slice(0, cap); }
  }
  return out;
}
function chordSeq(d, cap) {
  const seq = [];
  for (const m of (d.measures || [])) for (const cols of ((m || {}).voxes || [])) for (const c of (cols || [])) {
    if (!c) continue;
    const names = [];
    if (typeof c.chord === 'string' && c.chord.trim()) names.push(c.chord.trim());
    if (Array.isArray(c.chords)) for (const x of c.chords) {
      const n = x && (typeof x === 'string' ? x : x.name);
      if (n && String(n).trim()) names.push(String(n).trim());
    }
    for (const n of names) { if (seq[seq.length - 1] !== n) seq.push(n); if (seq.length >= cap) return seq; }
  }
  return seq;
}
function pubMeta(row) {
  let d = {}; try { d = JSON.parse(row.data); } catch (_) {}
  const title = (row.title || '').trim() || '未命名曲谱';
  const typeCn = typeLabelOf(d);   /* v60.81 细分标签：吉他弹唱谱/简谱歌谱… */
  const nMea = (d.measures || []).length;
  const singer = (row.singer || '').trim();
  const author = (row.author || '').trim() || '谱友圈';
  const desc = `《${title}》${singer ? singer + '演唱 · ' : ''}${author}制谱 · ${typeCn}${nMea ? ' · 共' + nMea + '小节' : ''}。在谱友圈在线观看、即时移调、播放跟谱，也可免费制谱下载。`;
  return { id: row.id, title, typeCn, nMea, singer, author, desc, cover: coverOf(d), thumb: row.thumb_at || 0,
    key: String(d.key || '').slice(0, 6), beats: +d.beats || 0, unit: +d.unit || 0, tempo: +d.tempo || 0,
    lyric: lyricExcerpt(d, 140), chords: chordSeq(d, 16) };
}
function pubSsrHtml(row, related) {
  const p = pubMeta(row), canon = `${PUB_CANON}/pub/${p.id}`;
  /* v60.6 og:image 优先用真实谱面缩图（栅格）：微信/微博等抓取端对 SVG 支持参差，
     且真谱面比品牌封面更能说明这首谱长什么样；没生成过缩图的老谱仍回落 cover.svg。
     v60.7 拼 ?v=thumb_at 当缓存戳：URL 恒定 + max-age=86400 会让重新发布后的分享图吃一整天陈图 */
  const img = p.thumb ? `${PUB_CANON}/api/pub/${p.id}/thumb?v=${p.thumb}` : `${canon}/cover.svg`;
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
.crumbs{font-size:13px;color:var(--muted);margin-bottom:1.2em}.crumbs a{color:var(--muted)}
.lyr,.chords{font-size:14px;color:var(--muted);max-width:520px;margin:1.1em auto 0;line-height:1.9}
.lyr b,.chords b{color:var(--ink);font-weight:600;margin-right:.4em}
.rel{margin-top:2.4em;padding-top:1.4em;border-top:1px solid var(--border);text-align:left}
.rel b{display:block;text-align:center;margin-bottom:.7em;color:var(--ink)}
.rel ul{list-style:none;margin:0;padding:0;columns:2;column-gap:24px;font-size:14px;line-height:2}
.rel a{color:var(--muted)}.rel a:hover{color:var(--accent)}
</style></head><body>
<div class="wrap">
<div class="brand">谱友圈 · 谱库</div>
<div class="crumbs"><a href="${escHtml(PUB_CANON)}/pub/">谱库目录</a> › ${escHtml(p.typeCn)}</div>
<h1>${escHtml(p.title)}</h1>
<div class="meta">${p.singer ? escHtml(p.singer) + ' 演唱 · ' : ''}${escHtml(p.author)} 制谱 · ${escHtml(p.typeCn)}${p.nMea ? ' · 共 ' + p.nMea + ' 小节' : ''}${p.key ? ' · 1=' + escHtml(p.key) : ''}${p.beats && p.unit ? ' · ' + p.beats + '/' + p.unit : ''}${p.tempo ? ' · ♩=' + p.tempo : ''}</div>
${coverRow ? '<div class="cover">' + coverRow + '</div>' : ''}
<a class="cta" href="${escHtml(viewUrl)}">▶ 在线观看 / 移调 / 跟谱</a>
<a class="cta ghost" href="${escHtml(VIEW_HOST)}/">免费制谱</a>
${p.lyric ? '<p class="lyr"><b>歌词节选</b>' + escHtml(p.lyric) + '…</p>' : ''}
${p.chords.length ? '<p class="chords"><b>和弦进行</b>' + p.chords.map(escHtml).join(' · ') + '</p>' : ''}
${(related || []).length ? '<div class="rel"><b>相关曲谱</b><ul>' + related.map(r =>
    `<li><a href="${escHtml(PUB_CANON)}/pub/${escHtml(r.id)}">${escHtml((r.title || '未命名曲谱') + (r.singer ? ' - ' + r.singer : ''))}</a></li>`).join('') + '</ul></div>' : ''}
<p class="tip">点上方按钮进入在线观看：即时移调 · 变速循环 · 跟谱播放。<br>谱友圈 —— 专业曲谱平台 · 出版级在线制谱</p>
</div>
</body></html>`;
}
/* ---------- v62.0 课程独立页（产品指示：每门课程打开进入独立页面）----------
   /course/<id>：服务端渲染的课程落地页——真实 URL、可分享、可被搜索引擎收录（课程正文本来只存在于
   前端 JSON 里，爬虫读不到）。真人点 CTA 进 kecheng.html?c=<id> 学习（不做自动跳转，v61.7 桥页教训）。
   /course/：全部已发布课程的目录页。 */
const CRS_INST_CN = { guitar: '吉他', piano: '钢琴', uku: '尤克里里', vocal: '唱歌/视唱', theory: '乐理/识谱', kids: '幼儿启蒙', other: '综合' };
function courseShape(row) {
  let d = {}; try { d = JSON.parse(row.data || '{}'); } catch (_) {}
  const chs = d.chapters || [];
  const secs = chs.reduce((a, ch) => a.concat((ch.sections || []).map(s => ({ ch, s }))), []);
  const nQ = secs.reduce((a, x) => a + (((x.s.test || {}).items) || []).length, 0);
  return { id: row.id, title: (row.title || '').trim() || '未命名课程', subtitle: (row.subtitle || '').trim(),
    intro: (row.intro || '').trim(), level: (row.level || '').trim(), weeks: row.weeks | 0,
    inst: CRS_INST_CN[row.instrument] || '', emoji: d.emoji || '🎼', chapters: chs, nSec: secs.length, nQuiz: nQ };
}
/* 小节学习块里的纯文本节选——给爬虫与摘要用（谱例/图片/视频块跳过） */
function courseTextOf(sec, cap) {
  let out = '';
  for (const b of (((sec.learn || {}).blocks) || [])) {
    if (b && b.t === 'text' && b.md) out += String(b.md).replace(/[#>*`\-]/g, '').replace(/\[\[(.*?)\]\]/g, '$1').replace(/\s+/g, ' ').trim() + ' ';
    if (out.length >= cap) break;
  }
  return out.slice(0, cap).trim();
}
function courseSsrHtml(row) {
  const c = courseShape(row), canon = `${SITE_HOST}/course/${c.id}`;
  const learnUrl = `${SITE_HOST}/kecheng.html?c=${encodeURIComponent(c.id)}`;
  const desc = c.intro || `${c.title}：${c.subtitle}`;
  const pageTitle = `${c.title}${c.subtitle ? ' · ' + c.subtitle : ''} - 谱友圈学习`;
  const ld = { '@context': 'https://schema.org', '@type': 'Course', name: c.title, url: canon,
    description: desc, inLanguage: 'zh-CN', isAccessibleForFree: true,
    provider: { '@type': 'Organization', name: '谱友圈', url: SITE_HOST },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'P' + Math.max(1, c.weeks) + 'W' } };
  const chapHtml = c.chapters.map((ch, i) => {
    const secs = (ch.sections || []);
    return `<section class="ch"><h2><span class="no">第 ${i + 1} 章</span>${escHtml(ch.title || '')}</h2>`
      + (ch.goal ? `<p class="goal">${escHtml(ch.goal)}</p>` : '')
      + (secs.length ? '<ol class="secs">' + secs.map((s, j) => `<li><b>${i + 1}.${j + 1}　${escHtml(s.title || '')}</b>`
          + `<span class="meta">${(((s.test || {}).items) || []).length} 题测试${(s.practice || {}).checkin ? ' · 练习打卡' : ''}</span>`
          + (courseTextOf(s, 90) ? `<p>${escHtml(courseTextOf(s, 90))}…</p>` : '') + '</li>').join('') + '</ol>'
        : ((ch.points || []).length ? '<ul class="pts">' + ch.points.map(p => `<li>${escHtml(p)}</li>`).join('') + '</ul>' : ''))
      + '</section>';
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(pageTitle)}</title>
<meta name="description" content="${escHtml(desc.slice(0, 150))}">
<link rel="canonical" href="${escHtml(canon)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escHtml(c.title)}">
<meta property="og:description" content="${escHtml(desc.slice(0, 150))}">
<meta property="og:url" content="${escHtml(canon)}">
<meta property="og:image" content="${SITE_HOST}/og.png">
<meta property="og:site_name" content="谱友圈">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--ink:#20211d;--muted:#6b6357;--accent:#c33a29;--bg:#f3f0e8;--panel:#fefdf9;--border:#e4ddcd}
*{box-sizing:border-box}body{margin:0;font:16px/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg)}
.wrap{max-width:760px;margin:0 auto;padding:38px 20px 60px}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:18px}.crumbs a{color:var(--muted)}
h1{font-size:30px;margin:.2em 0 .3em;letter-spacing:1px}
.sub{color:var(--muted);margin:0 0 14px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.chips i{font-style:normal;font-size:12.5px;color:var(--muted);border:1px solid var(--border);border-radius:20px;padding:4px 12px;background:var(--panel)}
.intro{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 18px;font-size:14.5px;margin-bottom:22px}
.cta{display:inline-block;margin:0 0 30px;padding:13px 32px;border-radius:26px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700}
.ch{margin-bottom:26px}
.ch h2{font-size:18px;margin:0 0 6px;display:flex;align-items:center;gap:10px}
.no{font-size:12px;font-weight:700;color:var(--accent);background:rgba(195,58,41,.10);border-radius:6px;padding:3px 9px}
.goal{font-size:14px;color:var(--muted);margin:0 0 10px}
.secs{margin:0;padding-left:1.3em}.secs li{margin:.5em 0;font-size:14.5px}
.secs b{font-weight:600}.secs .meta{font-size:12.5px;color:var(--muted);margin-left:10px}
.secs p{margin:.2em 0 0;font-size:13.5px;color:var(--muted)}
.pts{margin:0;padding-left:1.3em;font-size:14px;color:var(--muted)}
.foot{margin-top:34px;padding-top:18px;border-top:1px solid var(--border);font-size:13px;color:var(--muted)}
.foot a{color:var(--muted);margin-right:16px}
a{color:var(--accent)}
</style></head><body><div class="wrap">
<div class="crumbs"><a href="${SITE_HOST}/">谱友圈</a> › <a href="${SITE_HOST}/course/">学习课程</a> › ${escHtml(c.title)}</div>
<h1>${escHtml(c.emoji)} ${escHtml(c.title)}</h1>
<p class="sub">${escHtml(c.subtitle)}</p>
<div class="chips"><i>免费</i>${c.level ? `<i>${escHtml(c.level)}</i>` : ''}${c.inst ? `<i>${escHtml(c.inst)}</i>` : ''}<i>${c.weeks} 周 · ${c.chapters.length} 章${c.nSec ? ' · ' + c.nSec + ' 小节' : ''}</i>${c.nQuiz ? `<i>${c.nQuiz} 道闯关题</i>` : ''}</div>
${c.intro ? `<div class="intro">${escHtml(c.intro)}</div>` : ''}
<a class="cta" href="${escHtml(learnUrl)}">开始学习 →</a>
${chapHtml}
<div class="foot"><a href="${SITE_HOST}/course/">全部课程</a><a href="${SITE_HOST}/">谱库找谱</a><a href="${VIEW_HOST}/">免费在线制谱</a></div>
</div></body></html>`;
}
function courseIndexHtml(rows) {
  const items = rows.map(r => {
    const c = courseShape(r);
    return `<li><a href="${SITE_HOST}/course/${escHtml(c.id)}"><b>${escHtml(c.emoji)} ${escHtml(c.title)}</b></a>`
      + `<span class="m">${escHtml(c.subtitle)}</span>`
      + `<span class="m2">${c.weeks} 周 · ${c.chapters.length} 章${c.nSec ? ' · ' + c.nSec + ' 小节' : ''}${c.nQuiz ? ' · ' + c.nQuiz + ' 题' : ''}</span></li>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>学习课程（共 ${rows.length} 门）- 谱友圈</title>
<meta name="description" content="谱友圈官方自制课程，全部免费：认识简谱、民谣吉他启蒙、幼儿音乐启蒙——每个小节都是「学习 + 练习打卡 + 闯关测试」的完整闭环。">
<link rel="canonical" href="${SITE_HOST}/course/">
<style>
body{margin:0;font:16px/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#20211d;background:#f3f0e8}
.wrap{max-width:720px;margin:0 auto;padding:38px 20px 60px}
h1{font-size:26px;margin:.3em 0 1em}
ul{list-style:none;margin:0;padding:0}
li{background:#fefdf9;border:1px solid #e4ddcd;border-radius:12px;padding:15px 18px;margin-bottom:12px}
a{color:#c33a29;text-decoration:none}a:hover{text-decoration:underline}
b{font-size:17px}.m,.m2{display:block;font-size:13.5px;color:#6b6357}.m2{font-size:12.5px;margin-top:4px}
.foot{margin-top:26px;font-size:13px;color:#6b6357}.foot a{color:#6b6357;margin-right:16px}
</style></head><body><div class="wrap">
<h1>学习课程（共 ${rows.length} 门）</h1>
<ul>${items}</ul>
<div class="foot"><a href="${SITE_HOST}/kecheng.html">进入学习页</a><a href="${SITE_HOST}/">谱友圈首页</a></div>
</div></body></html>`;
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
  ['GET', /^\/api\/health$/, false, () => ({ ok: true, ver: VER, ts: now(), wx_web: !!(WX_WEB_APPID && WX_WEB_SECRET), wx_mp: !!(WX_MP_OAUTH && WX_MP_APPID && WX_MP_SECRET), wx_mini: !!(WX_MINI_APPID && WX_MINI_SECRET), wxpay: wxpayOn() })],

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
      q.userCreate.run(id, phone, randNick(), now());
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

  /* -- v60.1 C 小程序静默登录（web-view 免登录）--
     小程序端拿不到、也设不了 web-view 的 Cookie，只能靠一次性换票：
       ① 小程序 wx.login() → code，POST /wx/mini/login → 服务端 jscode2session 建/认号 → 回一次性 ticket
       ② 小程序把 enter_url 交给 <web-view>：GET /wx/mini/enter?t=…&to=… → 校验并作废 ticket
          → Set-Cookie pyq_token → 302 到目标页。网页端零改动，落地即登录态。
     ticket 只在内存、120s、用一次即焚（进程重启丢弃无害）；to 走站内白名单防开放重定向。 */
  ['POST', /^\/api\/wx\/mini\/login$/, false, async (m, b) => {
    if (!WX_MINI_APPID || !WX_MINI_SECRET) throw new ApiError(503, '小程序登录未配置');
    const code = String(b.code || '').trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(code)) throw new ApiError(400, '缺少或非法的 code');
    const prof = await wx.miniSession(code, { appid: WX_MINI_APPID, secret: WX_MINI_SECRET });
    // 小程序不再提供昵称/头像（getUserInfo 已废），允许端上用 chooseAvatar/nickname 组件采集后带上，仅用于新建号
    const u = upsertWxUser({ ...prof, nickname: String(b.nickname || '').slice(0, 24), avatar: '' });
    q.eventAdd.run(u.id, 'login', 'mini', now());
    const t = miniTicketIssue(u.id);
    return { ticket: t, expires_in: MINI_TICKET_TTL, user: pubUser(u),
      enter_url: 'https://www.puyouquan.com/api/wx/mini/enter?t=' + t };
  }],
  /* v60.3 小程序「微信一键登录」：<button open-type="getPhoneNumber"> 回调的 code → 真实手机号 → 账号。
     选手机号而非 unionid 作为主键，是因为本站账号本就以手机号唯一——这样小程序用户与网页短信登录
     天然是同一个账号，比靠开放平台 unionid 更直接，也不受「用户先在哪端注册」影响。
     loginCode（wx.login 的 code）可选：一并带上就把 openid/unionid 绑到该手机号账号，微信扫码登录随后也能命中。
     手机号验证是微信付费能力（需后台开通「手机号快速验证」；有免费额度），未开通时官方返回错误，此处如实上抛不静默。 */
  ['POST', /^\/api\/wx\/mini\/phone$/, false, async (m, b) => {
    if (!WX_MINI_APPID || !WX_MINI_SECRET) throw new ApiError(503, '小程序登录未配置');
    const code = String(b.code || '').trim();
    if (!/^[A-Za-z0-9_-]{8,256}$/.test(code)) throw new ApiError(400, '缺少或非法的 code');
    const { phone } = await wx.miniPhone(code, { appid: WX_MINI_APPID, secret: WX_MINI_SECRET });
    if (!PHONE_RE.test(phone)) throw new ApiError(502, '微信返回的手机号格式异常');
    let u = q.userByPhone.get(phone), fresh = false;
    if (!u) {
      const id = crypto.randomUUID();
      q.userCreate.run(id, phone, randNick(), now());
      u = q.userById.get(id); fresh = true;
    }
    /* 顺带绑微信身份：同一个人之后用微信扫码登录网页时能命中同一账号（COALESCE 不清空已有值） */
    const lc = String(b.loginCode || '').trim();
    let merge = null, merged = false;
    if (/^[A-Za-z0-9_-]{8,128}$/.test(lc)) {
      try {
        const prof = await wx.miniSession(lc, { appid: WX_MINI_APPID, secret: WX_MINI_SECRET });
        const owner = (prof.unionid && q.userByUnionid.get(prof.unionid)) || (prof.openid && q.userByWxOpenid.get(prof.openid));
        if (!owner) q.userBindWx.run(prof.openid || null, prof.unionid || null, u.id);
        /* v62.6 A1c（P1-35）：微信身份挂在一个小程序静默登录建的**占位号**上（没有真实手机号）——
           此前「已属他号则不抢占」，于是每次冷启动静默登录都回到那个空号，手机号会话被覆盖、老用户永远找不回自己的谱。
           占位号零数据 → 直接并入手机号账号并作废；有数据 → 不静默合并（v60.5 原则），发确认票让用户自己选 */
        else if (owner.id !== u.id && !PHONE_RE.test(owner.phone)) {
          const c = q.userDataCount.get(owner.id);
          const wxIds = { openid: prof.openid || null, unionid: prof.unionid || null };
          if (!c.scores && !c.marks && !c.paid) { mergeUserInto(owner.id, u.id, wxIds); merged = true; }
          else merge = { token: mergeOfferIssue(owner.id, u.id, wxIds), scores: c.scores, marks: c.marks, paid: c.paid };
        }
        /* owner 是另一个真实手机号账号：两个真人账号，不动 */
      } catch (e) { console.error('mini bind wx:', e.message); }                          // 绑定失败不影响登录
    }
    q.eventAdd.run(u.id, fresh ? 'signup' : 'login', 'mini_phone', now());
    const t = miniTicketIssue(u.id);
    return { ticket: t, expires_in: MINI_TICKET_TTL, user: pubUser(u), fresh, merged, merge,
      enter_url: 'https://www.puyouquan.com/api/wx/mini/enter?t=' + t };
  }],
  /* v62.6 A1c：用户在小程序确认页选「合并」——把占位号里的谱/收藏/谱架/谱集/权益并入手机号账号 */
  ['POST', /^\/api\/wx\/mini\/merge$/, false, (m, b) => {
    const k = String(b.token || '');
    const o = mergeOffers.get(k);
    mergeOffers.delete(k);
    if (!o || o.exp <= Date.now()) throw new ApiError(400, '合并确认已过期，请重新登录后再试');
    const from = q.userById.get(o.fromId), to = q.userById.get(o.toId);
    if (!from || !to || from.deleted_at || to.deleted_at) throw new ApiError(400, '账号状态已变化，未合并');
    mergeUserInto(o.fromId, o.toId, o.wxIds);
    q.eventAdd.run(o.toId, 'login', 'mini_merge', now());
    return { merged: true };
  }],
  ['GET', /^\/api\/wx\/mini\/enter$/, false, (m, b, _u, req, res) => {
    const sp = new URL(req.url, 'http://x').searchParams;
    const to = sp.get('to') || '';
    const dest = /^https:\/\/([a-z0-9-]+\.)*puyouquan\.com(\/|$|\?)/i.test(to) ? to : 'https://www.puyouquan.com/';
    const uid = miniTicketConsume(sp.get('t') || '');
    if (!uid) return { ___redirect: dest };                    // 票据过期/已用：不报错，按未登录进站
    /* v62.6 A1c ②：只在小程序 web-view 里下发 Cookie——普通浏览器打开带票链接（被诱导点击）不会被登进别人的号（登录 CSRF） */
    if (!/miniProgram/i.test(String(req.headers['user-agent'] || ''))) return { ___redirect: dest };
    const u = q.userById.get(uid);
    if (!u || u.deleted_at) return { ___redirect: dest };
    /* v62.6 A1c ①（P1-35）：web-view 已登录真实手机号账号时，静默登录换来的**占位号**票据不覆盖会话——
       此前每次冷启动都被换回空号。占位号零数据就顺手并入当前手机号账号，此后静默登录直接命中手机号账号 */
    const cur = authUser(req);
    if (cur && cur.id !== u.id && PHONE_RE.test(cur.phone) && !PHONE_RE.test(u.phone)) {
      const c = q.userDataCount.get(u.id);
      if (!c.scores && !c.marks && !c.paid) mergeUserInto(u.id, cur.id, { openid: u.wx_openid, unionid: u.wx_unionid });
      return { ___redirect: dest };
    }
    setAuthCookie(res, jwtSign({ uid: u.id, tv: u.tok_ver }));
    return { ___redirect: dest };
  }],

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
    /* v60.87 未读站内信数随 /me 带出——各页本就拉 /me，导航红点零新增请求 */
    unread_msgs: q.msgUnread.get(u.id, u.id, now() - MSG_WIN).n,
  })],

  /* -- v60.87 站内信（用户操作提醒 + 官方公告）-- */
  ['GET', /^\/api\/messages$/, true, (m, b, u) => ({
    messages: q.msgList.all(u.id, u.id, now() - MSG_WIN, 50),
  })],
  ['POST', /^\/api\/messages\/read$/, true, (m, b, u) => {
    const t = now();
    if (b && b.all) { q.msgReadAll.run(u.id, t, u.id, t - MSG_WIN); return { ok: true }; }
    const ids = Array.isArray(b && b.ids) ? b.ids.slice(0, 100) : [];
    for (const id of ids) {
      const msg = q.msgGet.get(+id || 0);
      if (msg && (msg.user_id === u.id || msg.user_id == null)) q.msgRead.run(u.id, msg.id, t);   // 只能读自己可见的
    }
    return { ok: true };
  }],
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
  /* v60.5 微信账号补绑真实手机号（方案A 的落点）：小程序静默登录 / 微信扫码建的号，
     phone 是合成占位（wx+hash），换设备就接不上。这里用同一套短信验证码把真号绑上，
     绑定后与网页短信登录是同一个账号。
     不做账号合并：目标号已被占用时明确拒绝并指路，绝不静默改写任何一方的数据。 */
  ['POST', /^\/api\/me\/bind-phone$/, true, (m, b, u) => {
    if (PHONE_RE.test(u.phone)) throw new ApiError(400, '该账号已绑定手机号');
    const phone = String(b.phone || ''), code = String(b.code || '');
    if (!PHONE_RE.test(phone) || !/^\d{6}$/.test(code)) throw new ApiError(400, '参数不正确');
    const row = q.otpGet.get(phone);
    if (!row || row.expires_at < now()) throw new ApiError(400, '验证码已过期，请重新获取');
    if (row.attempts >= 5) throw new ApiError(429, '尝试次数过多，请重新获取验证码');
    if (row.code_hash !== sha256(code + phone)) { q.otpAttempt.run(phone); throw new ApiError(400, '验证码不正确'); }
    const other = q.userByPhone.get(phone);
    if (other && other.id !== u.id) {
      throw new ApiError(409, '该手机号已注册过账号。请改用「手机号 + 验证码」直接登录那个账号；'
        + '本微信账号里的曲谱可先导出再导入，我们不会自动合并以免覆盖任何一边的数据。');
    }
    q.otpDelete.run(phone);
    q.userSetPhone.run(phone, u.id);
    q.eventAdd.run(u.id, 'login', 'bind_phone', now());
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
    const p = PRICES[String(b.kind || '')];
    if (!p) throw new ApiError(400, '未知商品');
    if (p.sale === false) throw new ApiError(400, '该内容还在筹备中，暂不开放购买——可在权益页免费预约，上线后第一时间通知你');
    if (!wxpayOn()) throw new ApiError(503, '微信支付未配置');
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
    /* v62.4 A0-5：「我的曲谱」接口只给谱主本人。此前已发布谱对任意登录用户放行，
       编辑器 ?mine= 深链走这条路且不经 XSS 清洗→恶意谱可在受害者会话里执行脚本并写进其本机库。
       他人发布谱一律走 /api/pub/scores/:id（观看端会经 sanitizeUntrusted 清洗）。 */
    if (s.user_id !== u.id) throw new ApiError(403, '无权访问：这不是你的曲谱');
    return { score: { ...s, data: JSON.parse(s.data) } };
  }],
  ['PUT', /^\/api\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const id = m[1];
    if (!ID_RE.test(id)) throw new ApiError(400, '谱面 id 不合法');
    if (typeof b.data !== 'object' || b.data === null) throw new ApiError(400, '缺少谱面数据');
    { const bad = scoreDataDanger(b.data, '', 'data', 0); if (bad) throw new ApiError(400, '谱面数据不合法：' + bad); }
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
    /* v62.5 A1b：已发布谱的保存只改草稿（公开端读快照）；管理员改自己的谱免审，直接刷新快照 */
    if (exist && exist.status === 'published' && u.role === 'admin') q.scoreSnap.run(now(), id);
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
    /* v62.5 A1b 已发布谱再点发布＝「提交更新审核」：公开端在通过前一直是旧快照；
       草稿与快照相同则无事可审（返回 unchanged）；管理员免审直接刷新快照 */
    if (s.status === 'published') {
      if (!s.pub_dirty) return { published: true, status: 'published', unchanged: true };
      if (u.role === 'admin') { q.scoreSnap.run(now(), s.id); baiduPush([s.id]); return { published: true, status: 'published', revision: 'applied' }; }
      q.scoreRevSet.run('pending', '', s.id);
      return { published: true, status: 'published', revision: 'pending' };
    }
    const st = u.role === 'admin' ? 'published' : 'pending';
    q.scoreReview.run(st, '', s.id);
    if (st === 'published') { q.scoreSnap.run(now(), s.id); baiduPush([s.id]); }   /* v61.7 直发上架即推百度（未配 token 静默跳过） */
    return { published: st === 'published', status: st, pending: st === 'pending' };
  }],
  /* v60.6 曲谱实例缩图上传：制谱器把真实渲染的谱面首行光栅化后回传，谱库卡片直接当截图展示。
     只认本人的谱——别人不能给你的谱换封面（栅格已无脚本面，剩下的风险只有「贴错图」）。 */
  ['PUT', /^\/api\/scores\/([A-Za-z0-9_-]+)\/thumb$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '只能为自己的曲谱生成缩图');
    /* v60.7 私有谱拒收：缩图只被公开接口消费（scoreThumbGet 要求 published），私有谱的缩图是
       纯死重——免费号 500 谱 ×220KB 可合法塞 110MB 进主库再被每日备份放大，堵住这个面 */
    if (s.status === 'private') throw new ApiError(403, '缩图仅用于已发布或审核中的曲谱');
    /* v60.7 频控：正常路径每次发布 1 张 + 补图每次 3 张，40/小时远够用，刷子直接 429 */
    const h = Math.floor(Date.now() / 3600000);
    if (thumbHour !== h) { thumbHour = h; thumbCount.clear(); }
    const c = (thumbCount.get(u.id) || 0) + 1; thumbCount.set(u.id, c);
    if (c > 40) throw new ApiError(429, '缩图上传过于频繁，请稍后再试');
    const { buf, mime } = decodeThumb(b && b.data);
    q.scoreThumbSet.run(buf, mime, now(), s.id, u.id);
    /* v62.5 A1b：缩图同属发布快照——已发布谱换图只进草稿，随下次更新审核通过才外发；
       管理员直发的谱（快照在发布那一刻已建好、缩图随后才传上来）与管理员自己的谱免审同步 */
    if (s.status === 'published' && u.role === 'admin') q.scorePubThumb.run(s.id);
    return { saved: true, bytes: buf.length, mime };
  }],
  ['POST', /^\/api\/scores\/([A-Za-z0-9_-]+)\/unpublish$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '无权操作');
    q.scoreSetStatus.run('private', s.id, u.id);
    q.scoreRevSet.run('', '', s.id);   // v62.5 下架连带清掉进行中的更新审核
    return { unpublished: true };
  }],

  /* -- v62.9 A4 预约登记（筹备中的内容：不收钱，上线后站内通知）-- */
  ['POST', /^\/api\/reserve$/, true, (m, b, u) => {
    const kind = String(b.kind || '');
    if (!RESERVE_KINDS.has(kind)) throw new ApiError(400, '该内容不支持预约');
    q.reserveAdd.run(u.id, kind, now());
    return { reserved: true, kind };
  }],
  ['GET', /^\/api\/me\/reserves$/, true, (m, b, u) => ({ reserves: q.reserveMine.all(u.id) })],
  /* -- v62.9 A4 ⑥ 举报（看谱页 ⚙「举报这首谱」；未登录也能举报，按 登录号/IP 摘要 + 理由 去重）-- */
  ['POST', /^\/api\/report$/, false, (m, b, _u, req) => {
    const sid = String(b.score_id || ''), reason = String(b.reason || '');
    if (!ID_RE.test(sid) && !/^seed[a-z0-9]{6,}$/.test(sid)) throw new ApiError(400, '曲谱 id 不合法');
    if (!REPORT_REASONS.has(reason)) throw new ApiError(400, '请选择举报理由');
    if (!q.scoreGet.get(sid)) throw new ApiError(404, '曲谱不存在');
    const u = authUser(req);
    const who = u ? 'u:' + u.id : 'ip:' + sha256(ipOf(req) + '|rep').slice(0, 16);
    q.reportAdd.run(sid, u ? u.id : null, who, reason, String(b.note || '').slice(0, 300), now());
    return { reported: true };
  }],
  /* -- v60.0 平台管理（全部需 role='admin'；写操作一律记 admin_logs 审计）-- */
  ['GET', /^\/api\/admin\/overview$/, true, (m, b, u) => {
    requireAdmin(u);
    const roles = {}; q.userCountRole.all().forEach(r => { roles[r.role] = r.n; });
    const sts = {}; q.scoreCountBySt.all().forEach(r => { sts[r.status] = r.n; });
    const paid = q.orderPaidAgg.get();
    return { users: q.userCount.get().n, roles, scores: q.scoreCountAll.get().n, scoreStatus: sts,
      pending: sts.pending || 0, published: sts.published || 0, revisions: q.revPendingCount.get().n,
      reports: q.reportOpenCount.get().n, reserves: Object.fromEntries(q.reserveCount.all().map(r => [r.kind, r.n])),
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
  /* v62.9 A4 举报处理：列未处理举报（按谱聚合计数）；处理＝关闭该谱全部未处理举报（下架另走审核下架接口） */
  ['GET', /^\/api\/admin\/reports$/, true, (m, b, u) => { requireAdmin(u); return { reports: q.reportOpen.all(100) }; }],
  ['POST', /^\/api\/admin\/reports\/([A-Za-z0-9_-]+)\/close$/, true, (m, b, u) => {
    requireAdmin(u);
    const r = q.reportClose.run(now(), u.id, m[1]);
    adminLog(u.id, 'report-close', m[1], '处理举报 ' + r.changes + ' 条');
    return { closed: r.changes };
  }],
  /* 审核预览：管理员按 id 读任意谱（含未上架的 pending），供编辑器 ?review=ID 进观看模式核对谱面 */
  ['GET', /^\/api\/admin\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const s = needScore(m[1]), au = q.userById.get(s.user_id);
    return { score: { id: s.id, title: s.title, singer: s.singer, author: au ? au.nickname : '',
      status: s.status, review_note: s.review_note || '', updated_at: s.updated_at, data: JSON.parse(s.data),
      revision: s.status === 'published' && s.rev_status === 'pending' ? 1 : 0, rev_status: s.rev_status || '' } };
  }],
  ['POST', /^\/api\/admin\/scores\/([A-Za-z0-9_-]+)\/review$/, true, (m, b, u) => {
    requireAdmin(u);
    const s = needScore(m[1]);
    const act = String(b.action || '');
    if (!['approve', 'reject', 'unpublish'].includes(act)) throw new ApiError(400, '操作只能是 approve / reject / unpublish');
    const note = String(b.note || '').slice(0, 200);
    if (act === 'reject' && !note) throw new ApiError(400, '驳回需填写原因（会展示给创作者）');
    /* v62.5 A1b 更新审核（已发布谱的修订）：通过＝用草稿刷新快照；驳回＝只记修订驳回原因，谱库继续展示上一版、谱不下架 */
    if (s.status === 'published' && s.rev_status === 'pending' && act !== 'unpublish') {
      if (act === 'approve') { q.scoreSnap.run(now(), s.id); baiduPush([s.id]); }
      else q.scoreRevSet.run('rejected', note, s.id);
      adminLog(u.id, act === 'approve' ? 'rev-approve' : 'rev-reject', s.id, (s.title || '') + (note ? ' · ' + note : ''));
      if (s.user_id !== u.id) {
        const nm = '《' + (s.title || '未命名曲谱') + '》';
        if (act === 'approve') notify(s.user_id, 'review', '你的曲谱' + nm + '的更新已通过审核', '谱库已换成你的最新版本。', 'https://puku.puyouquan.com/kanpu.html?pub=' + encodeURIComponent(s.id));
        else notify(s.user_id, 'review', '你的曲谱' + nm + '的更新未通过审核', '驳回原因：' + note + '。谱库仍展示上一版；修改后可再次提交更新审核。', 'https://zhipu.puyouquan.com/?mine=' + encodeURIComponent(s.id));
      }
      return { ok: true, status: 'published', revision: act === 'approve' ? 'applied' : 'rejected' };
    }
    const st = act === 'approve' ? 'published' : act === 'reject' ? 'rejected' : 'private';
    q.scoreReview.run(st, act === 'approve' ? '' : note, s.id);
    if (st === 'published') q.scoreSnap.run(now(), s.id);   // v62.5 过审即冻结快照
    else q.scoreRevSet.run('', '', s.id);
    adminLog(u.id, act, s.id, (s.title || '') + (note ? ' · ' + note : ''));
    if (act === 'approve') baiduPush([s.id]);   /* v61.7 过审上架即推百度（未配 token 静默跳过） */
    /* v60.87 审核结果发站内信给谱主（管理员审自己的谱不发，免自言自语）。
       通过→附谱库直达链；驳回/下架→附编辑器打开链，正文带原因。 */
    if (s.user_id !== u.id) {
      const nm = '《' + (s.title || '未命名曲谱') + '》';
      if (act === 'approve') notify(s.user_id, 'review', '你的曲谱' + nm + '已通过审核并上架', '现在所有人都能在谱库看到它了。', 'https://puku.puyouquan.com/kanpu.html?pub=' + encodeURIComponent(s.id));
      else if (act === 'reject') notify(s.user_id, 'review', '你的曲谱' + nm + '未通过审核', '驳回原因：' + note + '。修改后可重新提交发布。', 'https://zhipu.puyouquan.com/?mine=' + encodeURIComponent(s.id));
      else notify(s.user_id, 'review', '你的曲谱' + nm + '已被平台下架', (note ? '下架原因：' + note + '。' : '') + '曲谱已回到你的私有状态，可修改后重新发布。', 'https://zhipu.puyouquan.com/?mine=' + encodeURIComponent(s.id));
    }
    return { ok: true, status: st };
  }],
  /* v60.87 官方公告（广播站内信）：全体用户可见（近 90 天窗口），落审计日志 */
  ['POST', /^\/api\/admin\/broadcast$/, true, (m, b, u) => {
    requireAdmin(u);
    const title = String(b.title || '').trim();
    if (!title || title.length > 80) throw new ApiError(400, '公告标题需为 1-80 个字符');
    const body = String(b.body || '').trim().slice(0, 2000);
    const link = String(b.link || '').trim();
    if (link && !SITE_LINK.test(link)) throw new ApiError(400, '链接只能是站内地址（puyouquan.com）');
    notify(null, 'announce', title, body, link);
    adminLog(u.id, 'broadcast', '', title);
    return { ok: true };
  }],
  /* -- v60.88 管理控制台强化（admin.html 独立页）-- */
  /* 公告历史（含已读人数）与撤回：撤回=连读记录一并删（事务），全站消息卡即刻消失 */
  ['GET', /^\/api\/admin\/broadcasts$/, true, (m, b, u) => {
    requireAdmin(u);
    return { broadcasts: q.msgBroadcasts.all() };
  }],
  ['DELETE', /^\/api\/admin\/broadcasts\/(\d+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const msg = q.msgGet.get(+m[1]);
    if (!msg || msg.user_id != null) throw new ApiError(404, '公告不存在');
    if (!retractBroadcast(+m[1])) throw new ApiError(404, '公告不存在');
    adminLog(u.id, 'bcast-del', String(m[1]), msg.title || '');
    return { ok: true };
  }],
  /* 兑换码 HTTP 化（此前只有服务器 CLI）：生成 + 最近列表。码面与 CLI 同一格式（PYQ-XXXX-XXXX-XXXX） */
  ['POST', /^\/api\/admin\/codes$/, true, (m, b, u) => {
    requireAdmin(u);
    const kind = String(b.kind || '').trim();
    if (!/^[a-z0-9_]{2,32}$/.test(kind)) throw new ApiError(400, '权益类型需为 2-32 位小写字母/数字/下划线（如 vip / pack_kaobian）');
    const days = Math.max(0, Math.min(3650, +b.days || 0));
    const count = Math.max(1, Math.min(200, +b.count || 1));
    const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const gen = () => 'PYQ-' + Array.from({ length: 3 }, () =>
      Array.from(crypto.randomBytes(4)).map(x => AB[x % AB.length]).join('')).join('-');
    const t = now(), codes = [];
    for (let i = 0; i < count; i++) {
      let code; do { code = gen(); } while (q.redeemGet.get(code));
      q.redeemAdd.run(code, kind, days, t);
      codes.push(code);
    }
    adminLog(u.id, 'codes', '', kind + ' ×' + count + '（' + (days > 0 ? days + ' 天' : '永久') + '）');
    return { codes, kind, days };
  }],
  ['GET', /^\/api\/admin\/codes$/, true, (m, b, u) => {
    requireAdmin(u);
    return { codes: q.redeemList.all(100) };
  }],
  /* 订单列表：带用户昵称与打码手机号（运营对账用） */
  ['GET', /^\/api\/admin\/orders$/, true, (m, b, u) => {
    requireAdmin(u);
    return { orders: q.orderList.all(50).map(o => {
      const ou = q.userById.get(o.user_id);
      return { id: o.id, kind: o.kind, amount_fen: o.amount_fen, channel: o.channel, status: o.status,
        created_at: o.created_at, paid_at: o.paid_at,
        nickname: ou ? ou.nickname : '', phone: (ou && PHONE_RE.test(ou.phone)) ? ou.phone.replace(/^(\d{3})\d{4}/, '$1****') : '' };
    }) };
  }],
  /* -- v60.90 课程发布工作台（v1 仅管理员；官方自制先行，签约/UGC 开课复用同一模型再放开）-- */
  ['GET', /^\/api\/admin\/courses$/, true, (m, b, u) => {
    requireAdmin(u);
    return { courses: q.courseAll.all() };
  }],
  ['GET', /^\/api\/admin\/courses\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const c = q.courseGet.get(m[1]);
    if (!c) throw new ApiError(404, '课程不存在');
    return { course: { ...c, data: JSON.parse(c.data || '{}') } };
  }],
  ['PUT', /^\/api\/admin\/courses\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const id = m[1];
    if (!/^[a-z0-9-]{3,48}$/.test(id)) throw new ApiError(400, '课程 id 需为 3-48 位小写字母/数字/连字符');
    const title = String(b.title || '').trim();
    if (!title || title.length > 60) throw new ApiError(400, '课程标题需为 1-60 字');
    const data = (b.data && typeof b.data === 'object') ? b.data : {};
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    if (chapters.length > 30) throw new ApiError(400, '章节最多 30 个');
    for (const ch of chapters) if (!ch || typeof ch !== 'object' || !String(ch.title || '').trim()) throw new ApiError(400, '每个章节都需要标题');
    const raw = JSON.stringify(data);
    if (raw.length > 200 * 1024) throw new ApiError(413, '课程内容过大（上限 200KB）');
    const t = now();
    const exist = q.courseGet.get(id);
    q.courseUpsert.run(id, exist ? exist.user_id : u.id, title, String(b.subtitle || '').slice(0, 120),
      String(b.instrument || '').slice(0, 20), String(b.level || '').slice(0, 20),
      Math.max(0, Math.min(52, +b.weeks || 0)), String(b.intro || '').slice(0, 500),
      Math.max(0, Math.min(999, +b.sort || 0)), raw, exist ? exist.created_at : t, t);
    adminLog(u.id, 'course', id, (exist ? '更新' : '新建') + '课程 · ' + title);
    return { saved: true, id, status: exist ? exist.status : 'draft' };
  }],
  ['POST', /^\/api\/admin\/courses\/([A-Za-z0-9_-]+)\/(publish|unpublish)$/, true, (m, b, u) => {
    requireAdmin(u);
    const c = q.courseGet.get(m[1]);
    if (!c) throw new ApiError(404, '课程不存在');
    const st = m[2] === 'publish' ? 'published' : 'draft';
    /* v61.8 发布校验强化：除「须有章节」外，闯关题结构非法（题干空/选项不在 2-4 个/答案序号越界）
       一律拒发并定位到章与题——防把坏题发到学习页让闯关卡死。草稿随便存，发布才把关。 */
    if (st === 'published') {
      const chs = (JSON.parse(c.data || '{}').chapters || []);
      if (!chs.length) throw new ApiError(400, '没有章节的课程不能发布');
      const badQ = (t) => !t || typeof t !== 'object' || !String(t.q || '').trim()
        || !Array.isArray(t.opts) || t.opts.length < 2 || t.opts.length > 4
        || !Number.isInteger(t.a) || t.a < 0 || t.a >= t.opts.length;
      chs.forEach((ch, i) => {
        const qz = ch && ch.quiz;
        if (qz != null) {
          if (!Array.isArray(qz)) throw new ApiError(400, '第 ' + (i + 1) + ' 章闯关题格式不对（需为数组）');
          qz.forEach((t, j) => {
            if (badQ(t)) throw new ApiError(400, '第 ' + (i + 1) + ' 章第 ' + (j + 1) + ' 题不完整：需题干、2-4 个选项、有效答案序号');
          });
        }
        /* v62.0 2.0 小节结构同款校验：此前只校章级 quiz，小节里的 test.items 一条不校验就能发布，
           坏题会让学员在闯关处卡死（前端清单挡不住直接打 API）。 */
        const secs = (ch && ch.sections) || [];
        if (secs.length && !Array.isArray(secs)) throw new ApiError(400, '第 ' + (i + 1) + ' 章小节格式不对（需为数组）');
        secs.forEach((s, k) => {
          const where = '第 ' + (i + 1) + '.' + (k + 1) + ' 节';
          if (!s || typeof s !== 'object' || !String(s.title || '').trim()) throw new ApiError(400, where + '缺标题');
          const items = ((s.test || {}).items) || [];
          if (!Array.isArray(items)) throw new ApiError(400, where + '测试题格式不对（需为数组）');
          items.forEach((t, j) => {
            if (badQ(t)) throw new ApiError(400, where + '第 ' + (j + 1) + ' 题不完整：需题干、2-4 个选项、有效答案序号');
          });
        });
      });
    }
    q.courseSetStatus.run(st, now(), c.id);
    adminLog(u.id, m[2] === 'publish' ? 'course-pub' : 'course-off', c.id, c.title);
    return { ok: true, status: st };
  }],
  ['DELETE', /^\/api\/admin\/courses\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    requireAdmin(u);
    const c = q.courseGet.get(m[1]);
    if (!c) throw new ApiError(404, '课程不存在');
    if (c.status === 'published') throw new ApiError(400, '已发布课程需先下架再删除');
    q.courseDelete.run(c.id);
    adminLog(u.id, 'course-del', c.id, c.title);
    return { ok: true };
  }],

  /* 用户详情：权益 / 订单 / 曲谱分状态计数——点开用户行即看全貌，不用再去 CLI 查 */
  ['GET', /^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/detail$/, true, (m, b, u) => {
    requireAdmin(u);
    const target = needUser(m[1]);
    const byStatus = {};
    q.scoreList.all(target.id).forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
    return { user: pubUser(target),
      entitlements: q.entList.all(target.id),
      orders: q.orderByUser.all(target.id).slice(0, 10),
      scores: { total: q.scoreCount.get(target.id).n, byStatus } };
  }],
  ['GET', /^\/api\/admin\/logs$/, true, (m, b, u) => {
    requireAdmin(u);
    return { logs: q.adminLogList.all(50).map(l => ({ ...l, admin_phone: PHONE_RE.test(l.admin_phone) ? l.admin_phone.replace(/^(\d{3})\d{4}/, '$1****') : '' })) };
  }],

  /* -- v60.90 课程（公开读，无需登录）：章节=谱面+图文+练习任务，整包 JSON 出 -- */
  ['GET', /^\/api\/courses$/, false, () => ({
    courses: q.courseListPub.all().map(c => ({ ...c, data: JSON.parse(c.data || '{}') })),
  })],
  ['GET', /^\/api\/courses\/([A-Za-z0-9_-]+)$/, false, (m) => {
    const c = q.courseGetPub.get(m[1]);
    if (!c) throw new ApiError(404, '课程不存在或未发布');
    return { course: { ...c, data: JSON.parse(c.data || '{}') } };
  }],

  /* -- 公开谱库（谱库 puku，无需登录）-- */
  /* v62.7 A6（P1-34）：不带参数＝首页最新 200 首（附 total 供前端判断是否被截断）；
     ?q= 关键词（标题/演唱/署名）在**全库**里分页搜索——第 201 首起也搜得到 */
  ['GET', /^\/api\/pub\/scores$/, false, (m, b, u, req) => {
    const sp = new URL(req.url, 'http://x').searchParams;
    const kw = String(sp.get('q') || '').trim().slice(0, 40);
    if (!kw) return { scores: q.pubList.all().map(pubShape), total: q.pubTotal.get().n };
    const size = Math.min(60, Math.max(1, +sp.get('size') || 40)), page = Math.max(0, Math.min(200, +sp.get('page') || 0));
    const like = '%' + kw.replace(/[\\%_]/g, c => '\\' + c) + '%';
    return { q: kw, page, size, total: q.pubSearchCount.get(like).n, scores: q.pubSearch.all(like, size, page * size).map(pubShape) };
  }],
  ['GET', /^\/api\/pub\/scores\/([A-Za-z0-9_-]+)$/, false, (m) => {
    /* v60.97 浏览数：公开详情每次拉取 +1（先加后读，返回值即含本次）；
       stats 随谱带回（views/likes/favs），观看页头部直接显示 */
    q.viewInc.run(m[1]);
    const s = q.pubGet.get(m[1]);
    if (!s) throw new ApiError(404, '曲谱不存在或未发布');
    return { score: { ...s, data: JSON.parse(s.data) },
      stats: { views: s.views || 0, likes: s.likes || 0, favs: s.favs || 0 } };
  }],

  /* -- v62.0 课程独立页（SSR，无需登录）：/course/ 目录 · /course/<id> 课程页 · /course/sitemap.xml -- */
  ['GET', /^\/course\/sitemap\.xml$/, false, () => {
    const rows = q.courseListPub.all();
    const urls = [`  <url><loc>${SITE_HOST}/course/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`]
      .concat(rows.map(r => {
        const lm = r.updated_at ? `<lastmod>${new Date(r.updated_at * 1000).toISOString().slice(0, 10)}</lastmod>` : '';
        return `  <url><loc>${SITE_HOST}/course/${escHtml(r.id)}</loc>${lm}<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      })).join('\n');
    return { ___raw: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
      ___ctype: 'application/xml; charset=utf-8', ___cache: 'public, max-age=600' };
  }],
  ['GET', /^\/course\/?$/, false, () => ({
    ___raw: courseIndexHtml(q.courseListPub.all()), ___ctype: 'text/html; charset=utf-8', ___cache: 'public, max-age=600',
  })],
  ['GET', /^\/course\/([A-Za-z0-9_-]+)$/, false, (m) => {
    const c = q.courseGetPub.get(m[1]);
    if (!c) return { ___status: 404, ___cache: 'no-store', ___ctype: 'text/html; charset=utf-8',
      ___raw: '<!doctype html><meta charset="utf-8"><title>课程不存在 - 谱友圈</title><body style="font:16px sans-serif;text-align:center;padding:60px">该课程不存在或尚未发布。<a href="' + SITE_HOST + '/course/">全部课程</a>' };
    return { ___raw: courseSsrHtml(c), ___ctype: 'text/html; charset=utf-8', ___cache: 'public, max-age=600' };
  }],

  /* -- 已发布谱 SSR 落地页 + og 封面（无需登录，供搜索引擎/社交爬虫收录）-- */
  /* v61.7 谱库目录页（收录工程）：全部已发布谱的纯 HTML 链接清单。动机：谱库首页卡片是 JS 渲染，
     爬虫抓 raw HTML 只见骨架、拿不到任何 /pub/ 链接，收录只能靠跨主机 sitemap 声明（百度基本不认）——
     本页由 www 首页静态内链引入，形成「首页 → 目录 → 每首谱」的可爬路径。 */
  ['GET', /^\/pub\/?$/, false, () => {
    const rows = q.pubIndex.all();   // v62.7 A6：全量、不取 data
    const lis = rows.map(r =>
      `  <li><a href="/pub/${escHtml(r.id)}">${escHtml((r.title || '未命名曲谱') + (r.singer ? ' - ' + r.singer : ''))}</a></li>`).join('\n');
    const html = `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>曲谱目录（共 ${rows.length} 首）- 谱友圈谱库</title>
<meta name="description" content="谱友圈谱库全部曲谱目录：吉他谱、钢琴谱、简谱、五线谱、尤克里里谱免费在线看，一键移调、跟谱播放。">
<link rel="canonical" href="${PUB_CANON}/pub/">
<style>
body{margin:0;font:16px/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#141414;background:#faf8f4}
.wrap{max-width:760px;margin:0 auto;padding:36px 20px}
.brand{color:#8a8a8a;font-size:13px;letter-spacing:.1em}
h1{font-size:24px;margin:.4em 0 1em}
ul{list-style:none;margin:0;padding:0;columns:2;column-gap:28px}
li{break-inside:avoid}a{color:#3a5ce0;text-decoration:none}a:hover{text-decoration:underline}
.foot{margin-top:2.4em;padding-top:1.2em;border-top:1px solid #e5e2dc;font-size:13px;color:#8a8a8a}
.foot a{color:#8a8a8a;margin-right:16px}
@media (max-width:560px){ul{columns:1}}
</style></head><body><div class="wrap">
<div class="brand">谱友圈 · 谱库</div>
<h1>曲谱目录（共 ${rows.length} 首）</h1>
<ul>
${lis}
</ul>
<div class="foot"><a href="https://www.puyouquan.com/">谱友圈首页</a><a href="${VIEW_HOST}/">免费在线制谱</a></div>
</div></body></html>`;
    return { ___raw: html, ___ctype: 'text/html; charset=utf-8', ___cache: 'public, max-age=600' };
  }],
  ['GET', /^\/pub\/([A-Za-z0-9_-]+)$/, false, (m, b, u, req, res) => {
    const s = q.pubGet.get(m[1]);
    if (!s) return { ___raw: '<!doctype html><meta charset="utf-8"><title>曲谱不存在 - 谱友圈</title><body style="font:16px sans-serif;text-align:center;padding:60px">该曲谱不存在或已下架。<a href="//puku.puyouquan.com/">返回谱库</a>', ___ctype: 'text/html; charset=utf-8', ___cache: 'no-store', ___status: 404 };
    /* v61.7 相关曲谱内链（同歌手优先，再补最新）：谱页彼此互链成网，收录不再只靠目录单点 */
    /* v62.7 A6：相关推荐改带条件的小查询（同歌手优先，再补最新），按谱 10 分钟缓存——此前每次打开都整份解析最新 200 份谱面 */
    const related = pubRelatedCached(s.id, s.singer || '');
    return { ___raw: pubSsrHtml(s, related), ___ctype: 'text/html; charset=utf-8', ___cache: 'public, max-age=300' };
  }],
  ['GET', /^\/pub\/([A-Za-z0-9_-]+)\/cover\.svg$/, false, (m) => {
    const s = q.pubGet.get(m[1]);
    if (!s) return { ___status: 404, ___raw: '', ___ctype: 'image/svg+xml', ___cache: 'no-store' };
    return { ___raw: pubCoverSvg(s), ___ctype: 'image/svg+xml; charset=utf-8', ___cache: 'public, max-age=600' };
  }],
  /* v60.6 曲谱实例缩图（已发布谱公开可读，谱库卡片与 og:image 共用）。
     栅格原样外发，另加 nosniff 防浏览器把它当别的类型解释；ETag 走 thumb_at，换图即换 URL 语义。 */
  ['GET', /^\/api\/pub\/([A-Za-z0-9_-]+)\/thumb$/, false, (m, b, u, req) => {
    const r = ID_RE.test(m[1]) && q.scoreThumbGet.get(m[1]);
    if (!r || !r.thumb) return { ___status: 404, ___raw: '', ___ctype: 'text/plain; charset=utf-8', ___cache: 'no-store' };
    const etag = '"t' + (r.thumb_at || 0) + '-' + (r.thumb.length || 0) + '"';
    const hdr = { ETag: etag, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' };
    if ((req.headers['if-none-match'] || '') === etag)
      return { ___status: 304, ___raw: '', ___ctype: r.thumb_mime || 'image/webp', ___cache: 'public, max-age=86400', ___headers: hdr };
    return { ___raw: Buffer.from(r.thumb), ___ctype: r.thumb_mime || 'image/webp',
      ___cache: 'public, max-age=86400', ___headers: hdr };
  }],
  // 已发布谱动态 sitemap：每首谱一条 /pub/:id，供搜索引擎抓取（robots.txt 引用本地址）
  ['GET', /^\/pub\/sitemap\.xml$/, false, () => {
    const rows = q.pubIndex.all();   // v62.7 A6：全量收录（此前只收最新 200 首）
    /* v60.82 SEO：带 <lastmod>（updated_at 是 epoch 秒）——搜索引擎按它安排重抓，
       重新发布过的谱能更快刷新快照，没动过的不浪费抓取配额 */
    /* v61.7 目录页也进 sitemap（daily：每次上新它都变） */
    const urls = [`  <url><loc>${PUB_CANON}/pub/</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`]
      .concat(rows.map(r => {
        const lm = r.updated_at ? `<lastmod>${new Date(r.updated_at * 1000).toISOString().slice(0, 10)}</lastmod>` : '';
        return `  <url><loc>${PUB_CANON}/pub/${escHtml(r.id)}</loc>${lm}<changefreq>weekly</changefreq><priority>0.6</priority></url>`;
      })).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    return { ___raw: xml, ___ctype: 'application/xml; charset=utf-8', ___cache: 'public, max-age=600' };
  }],

  /* -- 收藏 -- */
  /* v62.7 A6：顺带返回已发布收藏的完整卡片（cards，与谱库卡片同构）——个人中心不必再拿最新 200 首联查，老收藏不再消失 */
  ['GET', /^\/api\/favorites$/, true, (m, b, u) => ({ favorites: q.favList.all(u.id), cards: q.favCards.all(u.id).map(pubShape) })],
  ['PUT', /^\/api\/favorites\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id && s.status !== 'published') throw new ApiError(403, '仅可收藏已发布的谱面');
    q.favPut.run(u.id, s.id, now()); return { ok: true };
  }],
  ['DELETE', /^\/api\/favorites\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => { q.favDel.run(u.id, m[1]); return { ok: true }; }],

  /* -- v60.97 点赞（结构同收藏；计数在公开详情 stats 里带回）-- */
  ['GET', /^\/api\/likes$/, true, (m, b, u) => ({ likes: q.likeList.all(u.id), cards: q.likeCards.all(u.id).map(pubShape) })],
  ['PUT', /^\/api\/likes\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.status !== 'published') throw new ApiError(403, '仅可点赞已发布的谱面');
    q.likePut.run(u.id, s.id, now()); return { ok: true };
  }],
  ['DELETE', /^\/api\/likes\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => { q.likeDel.run(u.id, m[1]); return { ok: true }; }],

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
      if (out && out.___raw !== undefined) {   // SSR 落地页 / og 封面 / 曲谱缩图：非 JSON 原样输出（覆盖默认 Content-Type/no-store）
        res.statusCode = out.___status || 200;
        res.setHeader('Content-Type', out.___ctype || 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', out.___cache || 'public, max-age=300');
        for (const k in (out.___headers || {})) res.setHeader(k, out.___headers[k]);   // v60.6 ETag / nosniff 等附加头
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
