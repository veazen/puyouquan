'use strict';
// 谱友圈 API · M1：手机验证码登录 + 个人中心（谱面云同步/收藏/谱架/谱集）
// 零依赖：Node 24 内建模块（node:http / node:sqlite / node:crypto）。
// 部署：systemd 服务 pyq-api，nginx 各 vhost include snippets/pyq-api.conf 反代 /api/。
const http = require('node:http');
const crypto = require('node:crypto');
const { q, now } = require('./db');
const { sendSms } = require('./sms');
const wx = require('./wx');

const PORT = +(process.env.PORT || 3127);
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? '.puyouquan.com';
if (!JWT_SECRET) { console.error('缺少 JWT_SECRET'); process.exit(1); }
// v43.6 微信开放平台·网站应用扫码登录（凭据只走服务器环境，不入代码）
const WX_WEB_APPID = process.env.WX_WEB_APPID || '';
const WX_WEB_SECRET = process.env.WX_WEB_SECRET || '';
const WX_WEB_REDIRECT = process.env.WX_WEB_REDIRECT || 'https://www.puyouquan.com/api/wx/web/callback';

const VER = 'wx-1';
const MAX_BODY = 3 * 1024 * 1024;      // 谱面 JSON 上限 3MB（nginx 侧另有 4m）
const MAX_SCORES = 500, MAX_COLLS = 50, MAX_COLL_ITEMS = 500;
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

/* ---------- 路由表 ---------- */
// [method, 正则, 需登录, handler(m, body, user, req, res) -> 返回对象或 {___status, ...}]
const routes = [
  ['GET', /^\/api\/health$/, false, () => ({ ok: true, ver: VER, ts: now(), wx_web: !!(WX_WEB_APPID && WX_WEB_SECRET) })],

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
    }
    setAuthCookie(res, jwtSign({ uid: u.id, tv: u.tok_ver }));
    return { user: pubUser(u), is_new: u.created_at >= now() - 5 };
  }],
  ['POST', /^\/api\/auth\/logout$/, false, (m, b, _u, req, res) => { clearAuthCookie(res); return { ok: true }; }],

  /* -- 微信扫码登录（开放平台·网站应用；A）-- */
  ['GET', /^\/api\/wx\/web\/login-url$/, false, (m, b, _u, req) => {
    if (!WX_WEB_APPID || !WX_WEB_SECRET) throw new ApiError(503, '微信登录未配置');
    const ret = new URL(req.url, 'http://x').searchParams.get('return') || '';
    const safeRet = /^https?:\/\/([a-z0-9-]+\.)*puyouquan\.com(\/|$|\?)/i.test(ret) ? ret : 'https://zhipu.puyouquan.com/';
    const state = wx.signState(safeRet, JWT_SECRET);
    return { url: wx.buildLoginUrl({ appid: WX_WEB_APPID, redirect: WX_WEB_REDIRECT, state }) };
  }],
  ['GET', /^\/api\/wx\/web\/callback$/, false, async (m, b, _u, req, res) => {
    const u2 = new URL(req.url, 'http://x');
    const code = u2.searchParams.get('code'), state = u2.searchParams.get('state');
    const st = state && wx.verifyState(state, JWT_SECRET);
    const back = (st && st.r) || 'https://zhipu.puyouquan.com/';
    const withFlag = (v) => back + (back.includes('?') ? '&' : '?') + 'wxlogin=' + v;
    if (!code || !st) return { ___redirect: withFlag('fail') };
    try {
      const prof = await wx.webExchange(code, { appid: WX_WEB_APPID, secret: WX_WEB_SECRET });
      const u = upsertWxUser(prof);
      setAuthCookie(res, jwtSign({ uid: u.id, tv: u.tok_ver }));
      return { ___redirect: withFlag('ok') };
    } catch (e) { console.error('微信登录失败:', e.message); return { ___redirect: withFlag('fail') }; }
  }],

  /* -- 我的资料 -- */
  ['GET', /^\/api\/me$/, true, (m, b, u) => ({
    user: pubUser(u),
    stats: { scores: q.scoreCount.get(u.id).n, collections: q.collCount.get(u.id).n },
  })],
  ['PATCH', /^\/api\/me$/, true, (m, b, u) => {
    const nick = String(b.nickname || '').trim();
    if (!nick || nick.length > 24) throw new ApiError(400, '昵称需为 1-24 个字符');
    q.userSetNick.run(nick, u.id);
    return { user: pubUser(q.userById.get(u.id)) };
  }],
  ['POST', /^\/api\/me\/creator$/, true, (m, b, u) => {   // 创作者开放注册
    q.userSetRole.run('creator', u.id);
    return { user: pubUser(q.userById.get(u.id)) };
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
    } else if (q.scoreCount.get(u.id).n >= MAX_SCORES) throw new ApiError(403, `云端谱面数量已达上限（${MAX_SCORES}）`);
    q.scoreUpsert.run(id, u.id, String(b.title || '').slice(0, 120), String(b.singer || '').slice(0, 60), data, t, now());
    return { saved: true, updated_at: t };
  }],
  ['DELETE', /^\/api\/scores\/([A-Za-z0-9_-]+)$/, true, (m, b, u) => {
    q.collItemsDelByScore.run(m[1]); q.favDelByScore.run(m[1]); q.shelfDelByScore.run(m[1]);
    q.scoreDelete.run(m[1], u.id);
    return { deleted: true };
  }],

  /* -- 发布 / 下架到谱库（需创作者角色）-- */
  ['POST', /^\/api\/scores\/([A-Za-z0-9_-]+)\/publish$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '只能发布自己的曲谱');
    if (u.role !== 'creator') throw new ApiError(403, '请先在个人中心「成为创作者」');
    q.scoreSetStatus.run('published', s.id, u.id);
    return { published: true };
  }],
  ['POST', /^\/api\/scores\/([A-Za-z0-9_-]+)\/unpublish$/, true, (m, b, u) => {
    const s = needScore(m[1]);
    if (s.user_id !== u.id) throw new ApiError(403, '无权操作');
    q.scoreSetStatus.run('private', s.id, u.id);
    return { unpublished: true };
  }],

  /* -- 公开谱库（谱库 puku，无需登录）-- */
  ['GET', /^\/api\/pub\/scores$/, false, () => ({ scores: q.pubList.all().map(pubShape) })],
  ['GET', /^\/api\/pub\/scores\/([A-Za-z0-9_-]+)$/, false, (m) => {
    const s = q.pubGet.get(m[1]);
    if (!s) throw new ApiError(404, '曲谱不存在或未发布');
    return { score: { ...s, data: JSON.parse(s.data) } };
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
