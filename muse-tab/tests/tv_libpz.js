/* 分类升级 P1 谱库换成 7 个谱种（方案 docs/design-2026-11-taxonomy §四 / §七 / §九 / §十四 P1 验收；2026-10-31 负责人「好的，按建议」＝§十五 30 项按推荐）。
   真服务端（api/server.js + 临时库：官方种子（曲库 10 首等）＋ 240 首旧谱垫底 ＋ 22 首样例，共二百七十余首、首批只拉最新 200 首）＋ 官网首页 ＋ 编辑器（谱友圈 / 观看页）：
   Z1 三处同口径：官网 PYQ_PZ（match / conv / query / cats）＝统一谱名表 PQ_KIND（pzMatch / pzConv / pzQuery / pzCats）＝接口列表与 /api/pub/cats
   Z2 官网一级 7 个谱种（全部 · 简谱 · 五线谱 · 钢琴谱 · 吉他谱 · 尤克里里 · 合唱谱 · 功能谱 · ♥ 收藏，旧 10 类按钮不在）；二级只露有谱的＋主攻 4 个；
      简谱 / 五线谱乐器行按数量排；行末开关 / 专题入口；首页「考编 · 艺考 · 师范 · 课堂」文字链
   Z3 第 201 首以后：点 简谱 › 二胡、钢琴谱 › 独奏 都能看到最早的垫底谱（接口补齐全库）；接口 ?pz=&inst= 翻页到底含它们
   Z4 旧 id 别名 10 个（?cat=guitar …）落到 §七的新筛选（官网 URL 改写＋接口同集合）
   Z5 搜索样例：茉莉花 二胡谱 · X 简谱 含可转（原稿 → 可转 &nota=jp → 吉他弹唱谱里也有）· 晴天 和弦谱 · 吉他 和弦谱 · 二胡曲谱大全 · 舒伯特 · 黄河大合唱 不误伤 ·
      C调葫芦丝 不按曲调筛 · 单独「简谱」＝点一级 · 乌克丽丽 · 教资 儿歌弹唱 · 器乐谱 提示条 · 0 结果退路 · 条件块可删
   Z6 计数与可转：一级＝各二级之和；简谱列表末尾「还有 N 首是五线谱」＝/api/pub/cats 的 conv；点「用简谱看」展开、卡片带 &nota=jp、本次会话记住
   Z7 手机 375×667：未选一级 2×4 宫格全在首屏（几何断言）且看得到第一张卡；选一级收成一行「‹」；「器乐」换成全部乐器「‹ 器乐」
   Z8 旧缓存 / 旧接口：sessionStorage 旧键 pyq-pub-cache 与缺 pz 的新键条目不藏一级、老卡片按旧 type 归一级
   Z9 观看页 ?nota=jp：五线谱原稿打开即简谱视图（vwNotaOf＝jp），只改观看副本；非法值忽略；open_pub 带 :jp
   Z10 编辑器新外壳谱友圈：谱种按钮 · 首访一次性提示「钢琴独奏 → 钢琴谱 › 独奏」· 可转卡点开即简谱 · 在线搜索条件块；旧外壳 ?shell=classic 与 ?next=0 仍是旧 11 类
   Z11 埋点（ui_cmd lib:pz:jianpu 等）· 小程序里「发到电脑做」· 后台概览显示新建谱分布与筛选点击 · 拍板 10 纯伴奏谱名
   Z12 新外壳行 1「发布」弹层「将归入」主谱种 › 二级（「也出现在」在悬停）＝发布后 /api/pub/scores 卡片的 pz / sub / also（简谱旋律＋钢琴、纯简谱歌曲、合唱＋钢琴三种，
       发布体＝编辑器提交时 PUT 的那份 data）；搜索「合唱 带伴奏」「合唱 伴奏」＝合唱谱 › 带伴奏、「无伴奏」＝合唱谱 › 无伴奏（官网搜索框不被清空）；
       钢琴谱二级悬停（官网＋编辑器）与编辑器合唱谱「伴奏」行标
   Z14 v70.2 专题入口＝站内谱单：官网首页文字链与二级行末、编辑器新外壳谱友圈行末 → ?zt= 列表与计数＝接口、「了解专题 ›」到原宣传页
   Z13 v70.0 验收⑦：接口卡片带 mode；官网 / 编辑器新外壳谱友圈卡片小调写关系小调（《致爱丽丝》a 小调）；旧外壳卡片照写「C 调」
   Z5h 退路之后仍 0 首：接口不给 fb、官网不写「下面是其他谱」，zero_result 照常记
   Z2d / Z2e 筛选抽屉（编制 / 能用来 / 风格 / 调拍速，吉他谱按「G调指法 · 夹2」）· 原稿不满 6 首自动展开可转
   修前红：LIBPZ_ROOT 指向 115bca4 的仓库副本（git archive 115bca4 api muse-tab/site muse-tab/index.html）复跑。env：LIBPZ_ROOT、CHROMIUM_PATH、SHOTS（截图目录） */
'use strict';

/* v70.2 验收：并发跑时页面 / context 已关而路由里还有请求未回，route.fulfill 抛「has been disposed」等——只吞这一类，其余照旧让进程失败 */
process.on('unhandledRejection', e => { const m = String((e && e.message) || e); if (/has been disposed|Target page, context or browser has been closed|Route is already handled/.test(m)) return; console.error(e); process.exit(1); });
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = process.env.LIBPZ_ROOT ? path.resolve(process.env.LIBPZ_ROOT) : path.resolve(__dirname, '../..');
const API_DIR = path.join(ROOT, 'api'), SITE = path.join(ROOT, 'muse-tab/site'), ED = path.join(ROOT, 'muse-tab/index.html');
const K = require(path.join(API_DIR, 'kindname.js'));
let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
const errs = [];
const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name + '（运行异常）', String(e && e.stack || e).slice(0, 300)); } };
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
/* env SHOTS＝目录：顺手存三张验收截图（电脑谱库 · 手机宫格 · 简谱列表末尾「用简谱看」） */
const SHOTS = process.env.SHOTS || '';
const shot = async (pg, name) => { if (!SHOTS) return; try { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name) }); } catch (_) {} };

/* ---------- 样例谱 ---------- */
const C = o => Object.assign({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
const lyOn = (ly, i) => ly === true || (Array.isArray(ly) && ly.includes(i));
const V = (names, nota, o, ly) => Object.assign({ v: 3, title: 't', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: names, voxNotations: nota, lyricLines: ly ? 1 : 0,
  measures: [{ tabs: [], voxes: names.map((_, i) => [C(lyOn(ly, i) ? { lyrics: ['啊'] } : {}), C({ deg: 3 })]) }] }, o || {});
const JT = o => Object.assign({ v: 3, title: 't', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1,
  measures: [{ tabs: [[{ dur: 4, chord: 'C', strum: 'd', notes: [{ s: 2, f: 1 }] }]], voxes: [[C({ lyrics: ['啊'] })]] }] }, o || {});
const TB = o => Object.assign({ v: 3, title: 't', key: 'A', beats: 4, unit: 4, tempo: 90, capo: 2, tabVoices: ['吉他1'], voxVoices: [], lyricLines: 0,
  measures: [{ tabs: [[{ dur: 4, chord: 'G', strum: 'd', notes: [{ s: 6, f: 3 }] }, { dur: 4, strum: 'u', notes: [] }]], voxes: [] }] }, o || {});
const BR = (a, b) => ({ type: 'bracket', from: a, to: b }), BC = (a, b) => ({ type: 'brace', from: a, to: b });
const TOP = [
  ['lpq01', '晴天', '周杰伦', JT()],
  ['lpq02', '茉莉花', '', V(['二胡'], [null], { instKey: 'erhu' })],
  ['lpq03', '茉莉花', '', V(['旋律'], [null], null, true)],
  ['lpq04', '茉莉花', '', V(['旋律'], ['staff'], null, true)],
  ['lpq05', '茉莉花', '', JT()],
  ['lpq06', '黄河大合唱', '', V(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], { voxGroups: [BR(0, 3)] }, true)],
  ['lpq07', '梦幻曲', '', V(['小提琴', '右手', '左手'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'violin' })],
  ['lpq08', '渔舟唱晚', '', V(['右手', '左手'], [null, null], { instKey: 'guzheng' })],
  ['lpq09', '月光下的凤尾竹', '', V(['葫芦丝'], [null], { instKey: 'hulusi', key: 'F' })],
  ['lpq10', '彩云追月', '', V(['葫芦丝'], [null], { instKey: 'hulusi', key: 'C' })],
  ['lpq11', '欢乐颂（对照）', '', V(['旋律'], ['staff'], { voxDual: [true] }, true)],
  ['lpq12', '流行进行', '', V(['旋律'], [null], { func: true })],
  ['lpq13', '和弦进行', '', V(['和弦'], [null], { func: true, chordOnly: true })],
  ['lpq14', '卡农伴奏', '', V(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true })],
  ['lpq15', '小幸运', '', JT({ inst: 'uku', tabVoices: ['尤克里里1'] })],
  ['lpq16', '送别', '', V(['旋律', '右手伴奏', '左手伴奏'], [null, 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, [0])],
  ['lpq17', '小提琴二重奏', '', V(['小提琴1', '小提琴2'], ['staff', 'staff'], { voxGroups: [BR(0, 1)], instKey: 'violin' })],
  ['lpq18', '友谊地久天长', '', V(['S', 'A', 'T', 'B'], [null, null, null, null], null, true)],
  ['lpq19', '吉他练习', '', TB()],
  ['lpq20', '视唱一', '', V(['旋律'], ['staff'])],
  ['lpq21', '小步舞曲', '', V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)] })],
  ['lpq22', '指弹练习', '', TB({ key: 'G', capo: 0, measures: [{ tabs: [[{ dur: 4, notes: [{ s: 6, f: 3 }] }, { dur: 4, notes: [{ s: 2, f: 1 }] }]], voxes: [] }] })],
].map((x, i) => ({ id: x[0] + 'xxx', title: x[1], singer: x[2], d: Object.assign(x[3], { title: x[1] }), at: 1000 + i }));
const FILL = Array.from({ length: 240 }, (_, i) => ({ id: 'lpf' + String(i).padStart(4, '0') + 'xx', title: '垫底' + i, singer: '', at: i,
  d: i % 3 === 0 ? V(['旋律'], [null], null, true) : i % 3 === 1 ? V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)] }) : V(['二胡'], [null], { instKey: 'erhu' }) }));
const ID = t => TOP.find(x => x.title === t).id;

/* ---------- 真服务端 ---------- */
const SQLF = (() => { try { require('node:sqlite'); return []; } catch (_) { return ['--experimental-sqlite']; } })();
const PORT = 3600 + (process.pid % 90), BASE = 'http://127.0.0.1:' + PORT;
const DB = path.join(os.tmpdir(), 'pyq_libpz_' + process.pid + '.db');
const get = u => new Promise((res, rej) => http.get(BASE + u, r => { let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const getJ = async u => { const r = await get(u); let j = null; try { j = JSON.parse(r.body); } catch (_) {} return { status: r.status, j }; };
const qs = s => s.split('&').map(p => { const i = p.indexOf('='); return i < 0 ? p : p.slice(0, i) + '=' + encodeURIComponent(p.slice(i + 1)); }).join('&');
async function allPages(q) {
  const out = []; let tot = -1, st = 200, last = null;
  for (let p = 0; p <= 30; p++) {
    const r = await getJ('/api/pub/scores?' + qs(q) + '&size=60&page=' + p); st = Math.max(st, r.status);
    if (r.status !== 200 || !r.j || !Array.isArray(r.j.scores)) return { status: r.status, cards: out, total: -1, j: r.j };
    tot = r.j.total; last = r.j; out.push(...r.j.scores);
    if (out.length >= tot || !r.j.scores.length) break;
  }
  return { status: st, cards: out, total: tot, j: last };
}
function seed(items, uid, phone) {
  const f = path.join(os.tmpdir(), 'pyq_libpz_' + process.pid + '.json');
  fs.writeFileSync(f, J(items));
  const code = `const {q,now}=require('./db'); const L=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
    const uid=process.argv[2]; q.userCreate.run(uid,process.argv[3],'谱库样例',now()); const t=now()+5;
    L.forEach(x=>{ q.scoreUpsert.run(x.id,uid,x.title,x.singer||'',JSON.stringify(x.d),t,t); q.scoreSetStatus.run('published',x.id,uid); q.scoreSnap.run(t+x.at,x.id); });
    console.log('seeded '+L.length);`;
  const r = spawnSync(process.execPath, [...SQLF, '-e', code, f, uid || 'libpz00001', phone || '13100006666'], { cwd: API_DIR, env: Object.assign({}, process.env, { DB_PATH: DB, JWT_SECRET: 'libpz' }), encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (_) {}
  return (r.stdout || '') + (r.status ? (r.stderr || '') : '');
}
async function startServer() {
  const p = spawn(process.execPath, [...SQLF, 'server.js'], { cwd: API_DIR, env: Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB, JWT_SECRET: 'libpz', COOKIE_DOMAIN: '' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', c => log += c); p.stderr.on('data', c => log += c);
  for (let i = 0; i < 80; i++) { try { const r = await get('/api/health'); if (r.status === 200) return { p, log: () => log }; } catch (_) {} await W(150); }
  throw new Error('server not up: ' + log.slice(0, 400));
}

/* ---------- 页面：www＝官网，zhipu / puku＝编辑器单文件；/api 转真服务端（opt.stub 可截胡），/api/events 记下 ---------- */
async function mkPage(b, url, opt) {
  opt = opt || {};
  const ctx = await b.newContext({ viewport: opt.vp || { width: 1280, height: 900 }, userAgent: opt.ua });
  if (opt.init) await ctx.addInitScript(opt.init);
  const pg = await ctx.newPage(); pg._ctx = ctx; pg._ev = [];
  pg.on('pageerror', e => errs.push('PAGEERR(' + url + '):' + e.message));
  await pg.route(/^https:\/\/(zhipu|puku|www)\.puyouquan\.com\/.*/, async route => {
    const req = route.request(), u = new URL(req.url()), p = u.pathname, host = u.hostname.split('.')[0];
    if (p.startsWith('/api/')) {
      if (p === '/api/events') { try { pg._ev.push(JSON.parse(req.postData() || '{}')); } catch (_) {} }
      if (opt.stub) { const s = opt.stub(p, u); if (s) return route.fulfill(s); }
      try { const r = await route.fetch({ url: BASE + p + u.search }); return route.fulfill({ response: r }); }
      catch (e) { return route.fulfill({ status: 502, body: '' }); }
    }
    if (host !== 'www') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(ED) });
    const f = p === '/' ? 'index.html' : p.slice(1);
    if (fs.existsSync(path.join(SITE, f))) return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : /\.png$/.test(f) ? 'image/png' : 'text/html; charset=utf-8', body: fs.readFileSync(path.join(SITE, f)) });
    return route.fulfill({ status: 404, body: '' });
  });
  await pg.route(/res\.wx\.qq\.com/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.wx=window.wx||{};' }));
  await pg.goto(url); await pg.waitForTimeout(opt.wait || 1500);
  return pg;
}
const ids = pg => pg.evaluate(() => [...document.querySelectorAll('#lib-grid .cc-card')].map(c => ((c.getAttribute('href') || '').match(/pub=([^&]+)/) || [])[1]));
const cardsOf = pg => pg.evaluate(() => [...document.querySelectorAll('#lib-grid > *')].map(e => e.classList.contains('cc-card') ? { id: ((e.getAttribute('href') || '').match(/pub=([^&]+)/) || [])[1], nota: ((e.getAttribute('href') || '').match(/nota=([a-z]+)/) || [])[1] || '' } : { sep: e.textContent.trim(), cls: e.className }));
const typeQ = async (pg, q) => { await pg.fill('#lib-q', q); await pg.waitForTimeout(1300); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let srv = null;
  try {
    try { fs.unlinkSync(DB); } catch (_) {}
    srv = await startServer(); srv.p.kill(); await W(300);   /* 先起一次：建表＋官方曲库 10 首 */
    const sd = seed(FILL.concat(TOP));
    srv = await startServer();
    const ALL = await allPages('conv=1');
    const cards = ALL.cards;
    const nOff = cards.filter(c => !/^lp[qf]/.test(c.id)).length;
    T(/seeded 262/.test(sd) && ALL.status === 200 && cards.length === 262 + nOff && nOff >= 10, 'Z0 真服务端起好：官方种子（曲库 10 首等）＋垫底 240 首＋样例 22 首（首批只给最新 200 首）', J({ sd: sd.trim().slice(0, 20), n: cards.length, nOff }));

    /* ---------- Z1 三处同口径 ---------- */
    await guard('Z1', async () => {
      const FS = [{}, { pz: 'jianpu' }, { pz: 'wuxian' }, { pz: 'gangqin' }, { pz: 'jita' }, { pz: 'uku' }, { pz: 'hechang' }, { pz: 'gongneng' },
        { pz: 'jianpu', sub: 'gequ' }, { pz: 'jianpu', sub: 'qiyue' }, { pz: 'jianpu', inst: 'erhu' }, { pz: 'jianpu', inst: 'violin' }, { pz: 'wuxian', inst: 'violin' }, { pz: 'wuxian', sub: 'gequ' },
        { pz: 'hechang', sub: 'jianpu' }, { pz: 'hechang', sub: 'wuxian' }, { sub: 'duizhao' }, { sub: 'zhitan' }, { inst: 'piano' }, { pz: 'gangqin', sub: 'banzou' }, { pz: 'jianpu', sub: 'shichang' }, { pz: 'wuxian', sub: 'shichang' }];
      const OS = [{ f: { pz: 'jianpu' }, conv: true, more: true }, { f: { pz: 'jianpu', inst: 'hulusi' }, conv: true, more: true }, { f: {}, words: '茉莉花' }, { f: { pz: 'gongneng' }, words: '晴天', tail: 'tab' },
        { f: { pz: 'jianpu' }, words: '茉莉花', conv: true, tail: 'jp' }, { f: {}, zt: 'kaobian' }, { f: { pz: 'wuxian' }, conv: true, sort: 'fav' }, { f: {}, x: { parts: [4], keys: [], meters: [], speeds: [] } },
        { f: { pz: 'hechang', sub: 'jianpu' }, conv: true, x: { hacc: 'no', parts: [], keys: [], meters: [], speeds: [] } }, { f: { pz: 'jita' }, x: { keys: ['G'], parts: [], meters: [], speeds: [] } }];
      const pg = await mkPage(b, 'https://www.puyouquan.com/', { wait: 800 });
      const site = await pg.evaluate(([cards, FS, OS]) => {
        const Z = window.PYQ_PZ; if (!Z) return null;
        return { m: FS.map(f => cards.map(c => Z.match(c, f) + '/' + Z.conv(c, f)).join(',')), q: OS.map(o => Z.query(cards, o).list.map(e => e.c.id + ':' + e.sec + e.nota).join(',')),
          cats: Z.cats(cards), pz: Z.PZ.map(p => p.id + ':' + p.name + ':' + p.subs.map(x => x.id + '=' + x.name).join('|')).join(';') };
      }, [cards, FS, OS]);
      await pg._ctx.close();
      const has = typeof K.pzQuery === 'function' && typeof K.pzConv === 'function';
      const node = has ? { m: FS.map(f => cards.map(c => K.pzMatch(c, f) + '/' + K.pzConv(c, f)).join(',')), q: OS.map(o => K.pzQuery(cards, o).list.map(e => e.c.id + ':' + e.sec + e.nota).join(',')),
        cats: K.pzCats(cards), pz: K.PZ.map(p => p.id + ':' + p.name + ':' + p.subs.map(x => x.id + '=' + x.name).join('|')).join(';') } : null;
      const catsApi = (await getJ('/api/pub/cats')).j;
      const mBad = site && node ? FS.filter((f, i) => site.m[i] !== node.m[i]).map(J) : ['缺'];
      const qBad = site && node ? OS.filter((o, i) => site.q[i] !== node.q[i]).map(J) : ['缺'];
      T(!!site && !!node && !mBad.length && !qBad.length && site.pz === node.pz && J(site.cats) === J(node.cats) && J(node.cats) === J(catsApi),
        'Z1 官网 PYQ_PZ ＝ 统一谱名表 PQ_KIND ＝ 接口：' + FS.length + ' 种筛选 × ' + cards.length + ' 张卡片的 match / conv、' + OS.length + ' 条列表（段 / 可转 nota / 尾节 / 排序 / 分面 / 专题）、计数 cats（含可转）逐项相同',
        J({ site: !!site, node: !!node, mBad: mBad.slice(0, 3), qBad: qBad.slice(0, 3), pz: site && node && site.pz === node.pz, cats: site && node && J(site.cats) === J(node.cats), api: node && J(node.cats) === J(catsApi) }));
      /* 接口列表＝pzQuery（同一份卡片）：可转 / 尾节 / 排序 / 分面参数 */
      const AQ = [['pz=jianpu&conv=1&more=1', { f: { pz: 'jianpu' }, conv: true, more: true }], ['pz=jianpu&inst=hulusi&more=1', { f: { pz: 'jianpu', inst: 'hulusi' }, more: true }],
        ['pz=wuxian&sort=fav', { f: { pz: 'wuxian' }, sort: 'fav' }], ['parts=4', { f: {}, x: { parts: [4], keys: [], meters: [], speeds: [] } }], ['zt=kaobian', { f: {}, zt: 'kaobian' }],
        ['pz=hechang&sub=jianpu&hacc=no&conv=1', { f: { pz: 'hechang', sub: 'jianpu' }, conv: true, x: { hacc: 'no', parts: [], keys: [], meters: [], speeds: [] } }]];
      const aBad = [];
      for (const [q, o] of AQ) { const r = await allPages(q); const want = has ? K.pzQuery(cards, o).list.map(e => e.c.id + ':' + e.sec).join(',') : '?';
        const got = r.cards.map(c => c.id + ':' + c.sec).join(','); if (r.status !== 200 || got !== want) aBad.push(q + ' ' + r.cards.length); }
      T(has && !aBad.length, 'Z1b 接口 /api/pub/scores 的可转 conv=1 · 尾节 more=1 · 排序 sort · 分面 parts · 专题 zt · 合唱伴奏 hacc：结果与顺序＝pzQuery（翻页到底不重不漏）', J(aBad));
    });

    /* ---------- Z2 官网一级 / 二级 / 乐器行 / 开关 / 专题 ---------- */
    await guard('Z2', async () => {
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      const r0 = await pg.evaluate(() => ({ cats: [...document.querySelectorAll('#lib-cats .fchip')].map(c => c.textContent.trim()), zt: [...document.querySelectorAll('#lib-zt a')].map(a => a.textContent + '>' + a.getAttribute('href')), subsHidden: (document.getElementById('lib-subs') || { hidden: true }).hidden }));
      await pg.click('#lib-cats [data-pz="jianpu"]'); await pg.waitForTimeout(900);
      await shot(pg, '1-desktop-jianpu.png');
      const r1 = await pg.evaluate(() => ({ subs: [...document.querySelectorAll('#lib-subs > *')].map(e => e.textContent.trim()), insts: [...document.querySelectorAll('#lib-insts .fchip')].map(e => e.textContent.trim()),
        title: document.getElementById('lib-title').textContent, url: location.search, lit: [...document.querySelectorAll('#lib-cats .fchip.on')].map(e => e.textContent.trim()) }));
      const list = await ids(pg), byId = Object.fromEntries((await allPages('conv=1')).cards.map(c => [c.id, c]));
      const segs = list.map(id => K.pzMatch(byId[id], { pz: 'jianpu' }));
      await pg.click('#lib-cats [data-pz="hechang"]'); await pg.waitForTimeout(900);
      const r2 = await pg.evaluate(() => [...document.querySelectorAll('#lib-subs > *')].map(e => e.textContent.trim()).join(','));
      await pg.click('#lib-cats [data-pz="gangqin"]'); await pg.waitForTimeout(900);
      const r3 = await pg.evaluate(() => [...document.querySelectorAll('#lib-subs > *')].map(e => e.textContent.trim() + (e.getAttribute('href') ? '>' + e.getAttribute('href') : '')).join(','));
      await pg.click('#lib-cats [data-pz="gangqin"]'); await pg.waitForTimeout(600);
      const r4 = await pg.evaluate(() => ({ url: location.search, lit: [...document.querySelectorAll('#lib-cats .fchip.on')].map(e => e.textContent.trim()), subsHidden: document.getElementById('lib-subs').hidden }));
      await pg._ctx.close();
      T(J(r0.cats) === J(['全部', '简谱', '五线谱', '钢琴谱', '吉他谱', '尤克里里', '合唱谱', '功能谱', '♥ 收藏']) && r0.subsHidden
        && J(r0.zt) === J(['考编>?zt=kaobian', '艺考>?zt=yikao', '师范>?zt=shifan', '课堂>?sub=duizhao']),
        'Z2a 官网一级＝全部 · 简谱 · 五线谱 · 钢琴谱 · 吉他谱 · 尤克里里 · 合唱谱 · 功能谱 · ♥ 收藏（旧 10 类按钮不在）；首页文字链 考编 · 艺考 · 师范 · 课堂（v70.2 有意迁移：都落站内谱单 ?zt= / ?sub=）', J(r0));
      /* v70.0 C 有意迁移：种子新增官方示例 / 视唱谱例（lib-ex-shichang-g＝简谱 › 视唱），视唱有谱就该露出——按全库实际有没有简谱 › 视唱算期望（规则「视唱 0 首不出」不变） */
      const scN = cards.filter(c => K.pzMatch(c, { pz: 'jianpu', sub: 'shichang' }) >= 0).length;
      T(r1.url === '?pz=jianpu' && J(r1.lit) === J(['简谱']) && r1.title === '简谱' && r1.subs.join(',') === '歌曲,儿歌,合唱,器乐,' + (scN ? '视唱,' : '') + '对照谱,带伴奏,已配和弦,儿歌弹唱 ›'
        && r1.insts[0] === '二胡' && r1.insts.length >= 3 && list.length > 0 && segs.every((v, i) => v >= 0 && (!i || segs[i - 1] <= v)),
        'Z2b 点「简谱」：URL ?pz=jianpu；二级只露有谱的＋主攻（儿歌 0 首也在、视唱 0 首不出）＋行末「带伴奏」「已配和弦」＋专题「儿歌弹唱 ›」；乐器行按数量排（二胡最多）；列表全是简谱成员、主谱种在前',
        J({ r1, n: list.length, segBad: segs.filter(v => v < 0).length }));
      T(r2 === '简谱合唱,五线合唱,伴奏,全部,带伴奏,无伴奏' && /^独奏,弹唱,伴奏,即兴伴奏 ›>\?zt=kaobian$/.test(r3) && r4.url === '' && J(r4.lit) === J(['全部']) && r4.subsHidden,
        'Z2c 合唱谱二级＋伴奏三选（全部 · 带伴奏 · 无伴奏）；钢琴谱二级＋「即兴伴奏 ›」专题入口；再点已选的一级回到全部', J({ r2, r3, r4 }));
    });

    /* ---------- Z2d 筛选抽屉 · 吉他谱按指法调 · 原稿不满 6 首自动展开 ---------- */
    await guard('Z2d', async () => {
      const pg = await mkPage(b, 'https://www.puyouquan.com/?pz=jita');
      const meta = await pg.evaluate(() => { const c = document.querySelector('.cc-card[href*="lpq19xxx"]'); return c ? [...c.querySelectorAll('.meta i')].map(i => i.textContent).join('|') : ''; });
      await pg.click('#lib-fbtn'); await pg.waitForTimeout(300);
      const d0 = await pg.evaluate(() => ({ open: !document.getElementById('lib-drawer').hidden, groups: [...document.querySelectorAll('#lib-drawer .ld-g > b')].map(b => b.textContent),
        keys: [...document.querySelectorAll('#lib-drawer [data-dx^="key:"]')].map(b => b.textContent), foot: (document.querySelector('#lib-drawer .ld-ft span') || {}).textContent || '' }));
      await pg.click('#lib-drawer [data-dx="key:G"]'); await pg.waitForTimeout(400);
      const d1 = await pg.evaluate(() => ({ ids: [...document.querySelectorAll('#lib-grid .cc-card')].map(c => (c.getAttribute('href').match(/pub=([^&]+)/) || [])[1]), on: document.getElementById('lib-fbtn').classList.contains('on'),
        foot: (document.querySelector('#lib-drawer .ld-ft span') || {}).textContent || '' }));
      await pg.click('#lib-drawer [data-dclr]'); await pg.waitForTimeout(300);
      const d2 = await pg.evaluate(() => document.querySelectorAll('#lib-grid .cc-card').length);
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
      const d3 = await pg.evaluate(() => document.getElementById('lib-drawer').hidden);
      await pg._ctx.close();
      const want = cards.filter(c => K.pzMatch(c, { pz: 'jita' }) >= 0 && c.fx && c.fx.fkey === 'G').map(c => c.id);
      const p2 = await mkPage(b, 'https://www.puyouquan.com/?pz=hechang&sub=jianpu');
      const a = await p2.evaluate(() => ({ sep: [...document.querySelectorAll('#lib-grid .lib-sep')].map(e => e.textContent), line: !!document.getElementById('lib-conv'), n: document.querySelectorAll('#lib-grid .cc-card').length, conv: document.querySelectorAll('#lib-grid .cc-card[data-nota="jp"]').length }));
      await p2._ctx.close();
      T(/G调指法 · 夹2/.test(meta) && d0.open && d0.groups.join(',') === '编制,能用来,风格,调（按指法）,拍号,速度' && d0.keys.includes('G调指法') && /首 · 调拍速都能一键移调/.test(d0.foot)
        && J(d1.ids.slice().sort()) === J(want.slice().sort()) && d1.on && d1.foot.startsWith(want.length + ' 首') && d2 > want.length && d3,
        'Z2d 筛选抽屉（编制 / 能用来 / 风格 / 调 / 拍号 / 速度，结果数随选项变，「清空」一键，Esc 收起）；吉他谱的调按指法（卡片「G调指法 · 夹2」、抽屉「G调指法」）', J({ meta, d0, d1, d2, d3, want }));
      /* v70.0 C 有意迁移：种子新增欢乐颂四部 / 送别三部两份简谱合唱示例，原稿从 1 首变成按全库实算（仍不满 6 首） */
      const n0 = cards.filter(c => K.pzMatch(c, { pz: 'hechang', sub: 'jianpu' }) >= 0).length;
      T(a.sep[0] === '以下是五线合唱，打开时用简谱看' && !a.line && a.conv >= 1 && n0 >= 1 && n0 < 6 && a.n === a.conv + n0,
        'Z2e 原稿不满 6 首（合唱谱 › 简谱合唱 ' + n0 + ' 首）：可转的那部分自动展开（分隔线照旧），没有「还有 N 首」那一行', J(Object.assign({ n0 }, a)));
    });

    /* ---------- Z3 第 201 首以后 ---------- */
    await guard('Z3', async () => {
      const L0 = (await getJ('/api/pub/scores')).j, newest = new Set(L0.scores.map(c => c.id));
      const old = ['lpf0002xx', 'lpf0001xx', 'lpf0000xx'];
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      await pg.click('#lib-cats [data-pz="jianpu"]'); await pg.waitForTimeout(500);
      await pg.click('#lib-insts [data-inst="erhu"]'); await pg.waitForTimeout(2500);
      const e1 = await ids(pg), u1 = await pg.evaluate(() => location.search);
      await pg.click('#lib-cats [data-pz="gangqin"]'); await pg.waitForTimeout(500);
      await pg.click('#lib-subs [data-sub="duzou"]'); await pg.waitForTimeout(2500);
      const e2 = await ids(pg);
      await pg._ctx.close();
      const api = await allPages('pz=jianpu&inst=erhu'), api2 = await allPages('pz=gangqin&sub=duzou');
      T(L0.scores.length === 200 && L0.total === cards.length && old.every(x => !newest.has(x)) && u1 === '?pz=jianpu&inst=erhu' && e1.includes('lpf0002xx') && e2.includes('lpf0001xx')
        && api.cards.some(c => c.id === 'lpf0002xx') && api2.cards.some(c => c.id === 'lpf0001xx') && e1.length === api.total && e2.length === api2.total,
        'Z3 首批只拉最新 200 首：官网点 简谱 › 二胡、钢琴谱 › 独奏 都能看到第 201 首以后最早的垫底谱（从接口补齐全库，首数＝接口 total）',
        J({ tot: L0.total, e1: e1.length, a1: api.total, e2: e2.length, a2: api2.total, has1: e1.includes('lpf0002xx'), has2: e2.includes('lpf0001xx') }));
    });

    /* ---------- Z4 旧 id 别名 ---------- */
    await guard('Z4', async () => {
      const AL = { guitar: '?pz=jita&sub=tanchang', uku: '?pz=uku', solo: '?sub=zhitan', pianoacc: '?pz=gangqin&sub=banzou', piano: '?pz=gangqin&sub=duzou', vocal: '?pz=jianpu',
        teach: '?sub=duizhao', instr: '?pz=wuxian', func: '?pz=gongneng&sub=jishu', chord: '?pz=gongneng&sub=hexian' };
      const bad = [];
      const pg = await mkPage(b, 'https://www.puyouquan.com/', { wait: 600 });
      for (const [k, want] of Object.entries(AL)) {
        await pg.goto('https://www.puyouquan.com/?cat=' + k); await pg.waitForTimeout(1300);
        const r = await pg.evaluate(() => ({ url: location.search, n: document.querySelectorAll('#lib-grid .cc-card').length, title: document.getElementById('lib-title').textContent }));
        const a = await allPages('cat=' + k), w = await allPages(want.slice(1));
        if (r.url !== want || a.total !== w.total || a.total < 1 || r.n !== w.total) bad.push(k + ' ' + J(r) + ' api ' + a.total + '/' + w.total);
      }
      await pg._ctx.close();
      T(!bad.length, 'Z4 旧 id 别名 10 个（?cat=guitar / uku / solo / pianoacc / piano / vocal / teach / instr / func / chord）落到 §七的新筛选：官网 URL 改写成 ?pz=&sub=、列表＝接口同一集合', J(bad.slice(0, 4)));
    });

    /* ---------- Z5 搜索 ---------- */
    await guard('Z5', async () => {
      const A = async q => (await getJ('/api/pub/scores?q=' + encodeURIComponent(q) + '&size=60')).j || {};
      const byId = Object.fromEntries(cards.map(c => [c.id, c]));
      /* a 茉莉花 二胡谱 */
      const a = await A('茉莉花 二胡谱');
      const a0 = (a.scores || []).filter(c => c.sec < 2);
      T(a.parse && a.parse.inst === 'erhu' && a.parse.words === '茉莉花' && a0.length === 1 && a0[0].id === ID('茉莉花') && a0.every(c => c.inst === 'erhu')
        && (a.scores || []).every(c => c.title === '茉莉花'), 'Z5a「茉莉花 二胡谱」＝曲名茉莉花＋乐器二胡（条件块「乐器：二胡」）', J({ parse: a.parse && a.parse.conds, ids: (a.scores || []).map(c => c.id + ':' + c.sec) }));
      /* b 茉莉花 简谱：原稿 → 可转（五线谱 &nota=jp）→ 吉他弹唱谱里也有 */
      const b1 = await A('茉莉花 简谱');
      const want = [[ID('茉莉花'), 0], ['lpq03xxx', 0], ['lpq04xxx', 2], ['lpq05xxx', 3]];
      const got = (b1.scores || []).map(c => [c.id, c.sec]);
      const sec = got.map(x => x[1]);
      T(b1.parse && b1.parse.pz === 'jianpu' && b1.conv === 1 && b1.tail === 'jp' && got.some(x => x[0] === 'lpq04xxx' && x[1] === 2) && got.some(x => x[0] === 'lpq05xxx' && x[1] === 3)
        && got.some(x => x[0] === 'lpq03xxx' && x[1] === 0) && sec.every((v, i) => !i || sec[i - 1] <= v) && (b1.scores || []).find(c => c.id === 'lpq04xxx').nota === 'jp',
        'Z5b「茉莉花 简谱」含可转：简谱原稿在前，五线谱原稿在后（打开 nota=jp），最后一节「吉他弹唱谱里也有简谱旋律」', J({ got, want }));
      /* c 晴天 和弦谱 / 吉他 和弦谱 / 和弦谱 */
      const c1 = await A('晴天 和弦谱'), c2 = await A('吉他 和弦谱');
      T(c1.parse && c1.parse.pz === 'gongneng' && (c1.scores || []).some(c => c.id === 'lpq01xxx' && c.sec === 3) && c1.tail === 'tab'
        && c2.parse && c2.parse.pz === 'jita' && c2.parse.sub === 'tanchang' && (c2.scores || []).length > 0 && (c2.scores || []).every(c => K.pzMatch(c, { pz: 'jita', sub: 'tanchang' }) >= 0),
        'Z5c「晴天 和弦谱」（库里只有吉他弹唱版）落功能谱、后接一节「吉他 / 尤克里里弹唱谱」能出《晴天》；「吉他 和弦谱」落 吉他谱 › 弹唱', J({ c1: (c1.scores || []).map(c => c.id + ':' + c.sec), c2: c2.parse }));
      /* d 二胡曲谱大全 / 舒伯特 / 黄河大合唱 / C调葫芦丝 / 乌克丽丽 / 教资 儿歌弹唱 */
      const d1 = await A('二胡曲谱大全'), d1w = await allPages('inst=erhu');
      const d2 = await A('舒伯特'), d3 = await A('黄河大合唱'), d4 = await A('C调葫芦丝'), d5 = await A('乌克丽丽'), d6 = await A('教资 儿歌弹唱');
      const d4ids = (d4.scores || []).map(c => c.id);
      T(d1.parse && d1.parse.inst === 'erhu' && !d1.parse.words && d1.total === d1w.total
        && (d2.scores || []).length >= 4 && (d2.scores || []).every(c => c.composer === '舒伯特') && !(d2.parse.conds || []).length
        && !(d3.parse.conds || []).length && (d3.scores || []).length === 1 && d3.scores[0].id === 'lpq06xxx'
        && d4.parse.keySort === 'C' && !d4.parse.key && d4ids[0] === 'lpq10xxx' && d4ids.includes('lpq09xxx')
        && d5.parse.pz === 'uku' && d5.parse.only && d6.parse.zt === 'shifan',
        'Z5d 停用词「二胡曲谱大全」＝乐器二胡；「舒伯特」按作曲搜到曲库；「黄河大合唱」整句不拆；「C调葫芦丝」不按曲调筛、C 调的排前；「乌克丽丽」落尤克里里；「教资 儿歌弹唱」落师范专题',
        J({ d1: [d1.total, d1w.total], d2: (d2.scores || []).length, d3: (d3.scores || []).map(c => c.id), d4: d4ids, d5: d5.parse && d5.parse.pz, d6: d6.parse && d6.parse.zt }));
      /* e 0 结果退路：「晴天 功能谱」→ 去掉解析条件、只按「晴天」搜 */
      const e1 = await A('晴天 功能谱');
      T(e1.fb && /没有「晴天」的功能谱/.test(e1.fb) && (e1.scores || []).some(c => c.id === 'lpq01xxx'), 'Z5e 解析后 0 结果：去掉解析出的条件、只按剩下的词搜，并说明「没有「晴天」的功能谱，下面是其他谱」', J({ fb: e1.fb, n: (e1.scores || []).length }));
      /* h 退路之后仍 0 首：不给 fb（否则界面写「下面是其他谱」而下面一首都没有）；官网照常记 zero_result（meta 带解析结果） */
      const g1 = await A('一首根本不存在的歌 合唱');
      const pgz = await mkPage(b, 'https://www.puyouquan.com/');
      await typeQ(pgz, '一首根本不存在的歌 合唱'); await pgz.waitForTimeout(400);
      const g2 = await pgz.evaluate(() => ({ note: [...document.querySelectorAll('#lib-conds .cond-note')].map(e => e.textContent).join('|'), n: document.querySelectorAll('#lib-grid .cc-card').length,
        conds: [...document.querySelectorAll('#lib-conds .cond')].map(c => c.textContent.replace(/\s+/g, ' ').trim()) }));
      const zr = pgz._ev.filter(e => e.name === 'zero_result').map(e => e.meta);
      await pgz._ctx.close();
      T(g1.parse && g1.parse.pz === 'hechang' && g1.parse.words === '一首根本不存在的歌' && g1.total === 0 && !(g1.scores || []).length && !('fb' in g1)
        && !/下面是其他谱/.test(g2.note) && g2.n === 0 && g2.conds.length === 1 && zr.length === 1 && /^一首根本不存在的歌 合唱 \[pz:hechang\]/.test(zr[0]),
        'Z5h 退路之后仍 0 首：接口不给 fb、官网不写「没有…，下面是其他谱」（条件块照留），zero_result 照常记一次（meta 带解析结果）', J({ fb: g1.fb, total: g1.total, g2, zr }));
      /* f 官网：条件块 / 删条件 / 可转分隔与 nota / 单独「简谱」＝点一级 / 器乐谱提示条 */
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      await typeQ(pg, '茉莉花 二胡谱');
      const f1 = await pg.evaluate(() => [...document.querySelectorAll('#lib-conds .cond')].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
      const f1ids = await ids(pg);
      await pg.click('#lib-conds .cond'); await pg.waitForTimeout(1300);
      const f2 = await pg.evaluate(() => ({ q: document.getElementById('lib-q').value, conds: document.querySelectorAll('#lib-conds .cond').length, n: document.querySelectorAll('#lib-grid .cc-card').length }));
      await typeQ(pg, '茉莉花 简谱');
      const f3 = await cardsOf(pg);
      await typeQ(pg, '器乐谱');
      const f4 = await pg.evaluate(() => [...document.querySelectorAll('#lib-conds [data-hinst]')].map(c => c.textContent).concat(document.querySelector('#lib-conds [data-hmore]') ? ['更多'] : []));
      await pg.click('#lib-conds [data-hinst="erhu"]'); await pg.waitForTimeout(1500);
      const f5 = await pg.evaluate(() => ({ q: document.getElementById('lib-q').value, conds: [...document.querySelectorAll('#lib-conds .cond')].map(c => c.textContent.replace(/\s+/g, ' ').trim()) }));
      await typeQ(pg, '简谱');
      const f6 = await pg.evaluate(() => ({ q: document.getElementById('lib-q').value, url: location.search, lit: [...document.querySelectorAll('#lib-cats .fchip.on')].map(e => e.textContent.trim()) }));
      const f6ids = await ids(pg);
      await pg.goto('https://www.puyouquan.com/'); await pg.waitForTimeout(1300);
      await pg.click('#lib-cats [data-pz="jianpu"]'); await pg.waitForTimeout(1500);
      const f7ids = await ids(pg);
      await pg._ctx.close();
      const j6 = await allPages('q=简谱'), j7 = await allPages('pz=jianpu');
      const s3 = f3.filter(x => x.sep).map(x => x.sep), conv = f3.find(x => x.id === 'lpq04xxx');
      T(J(f1) === J(['乐器：二胡 ×']) && f1ids[0] === ID('茉莉花') && f2.q === '茉莉花' && f2.conds === 0 && f2.n === 4
        && s3.includes('以下是五线谱，打开时用简谱看') && s3.includes('吉他弹唱谱里也有简谱旋律') && conv && conv.nota === 'jp'
        && f4.join(',') === '二胡,古筝,笛子,葫芦丝,萨克斯,小提琴,更多' && f5.q === '二胡' && J(f5.conds) === J(['乐器：二胡 ×']),
        'Z5f 官网：搜索词变可删条件块（删「乐器：二胡」→ 只按「茉莉花」搜 4 首）；「茉莉花 简谱」列表有分隔「以下是五线谱，打开时用简谱看」（卡片链接带 &nota=jp）与「吉他弹唱谱里也有简谱旋律」；「器乐谱」出乐器提示条，点了变成乐器条件',
        J({ f1, f2, s3, conv, f4, f5 }));
      T(f6.q === '' && f6.url === '?pz=jianpu' && J(f6.lit) === J(['简谱']) && J(f6ids) === J(f7ids) && J(j6.cards.map(c => c.id)) === J(j7.cards.map(c => c.id)) && f6ids.length === j7.total,
        'Z5g 单独搜「简谱」＝点了「简谱」一级（搜索框清空、按钮亮、URL ?pz=jianpu，只列原稿）：官网列表与接口 q=简谱 都和点按钮逐张相同', J({ f6, n6: f6ids.length, n7: f7ids.length, api: [j6.total, j7.total] }));
    });

    /* ---------- Z6 计数与可转 ---------- */
    await guard('Z6', async () => {
      const cats = (await getJ('/api/pub/cats')).j;
      const sums = Object.entries(cats.pz).every(([, o]) => Object.values(o.sub).reduce((a, x) => a + x, 0) === o.n);
      const L = (await getJ('/api/pub/scores?pz=jianpu&size=1')).j;
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      await pg.evaluate(() => { try { sessionStorage.removeItem('pyq-lib-conv'); } catch (_) {} });
      await pg.click('#lib-cats [data-pz="jianpu"]'); await pg.waitForTimeout(2500);
      const r1 = await pg.evaluate(() => ({ line: (document.getElementById('lib-conv') || {}).textContent || '', n: document.querySelectorAll('#lib-grid .cc-card').length, conv: document.querySelectorAll('#lib-grid .cc-card[data-nota]').length }));
      if (SHOTS) { await pg.evaluate(() => { const l = document.getElementById('lib-conv'); document.documentElement.style.scrollBehavior = 'auto'; if (l) window.scrollTo(0, l.getBoundingClientRect().top + window.scrollY - innerHeight * 0.7); });
        await pg.waitForTimeout(1200); await shot(pg, '3-jianpu-conv-line.png'); await pg.evaluate(() => window.scrollTo(0, 0)); }
      await pg.click('#lib-conv [data-conv]'); await pg.waitForTimeout(2500);
      const r2 = await pg.evaluate(() => ({ url: location.search, ss: sessionStorage.getItem('pyq-lib-conv'), sep: [...document.querySelectorAll('#lib-grid .lib-sep')].map(e => e.textContent),
        conv: [...document.querySelectorAll('#lib-grid .cc-card[data-nota]')].map(c => c.getAttribute('href')), line: !!document.getElementById('lib-conv') }));
      const bc = await pg.evaluate(() => [...document.querySelectorAll('.cc-card[href*="lpq04xxx"] .cc-nota, .cc-card[href*="lpq03xxx"] .cc-nota')].map(e => e.textContent));
      await pg.click('#lib-cats [data-pz="wuxian"]'); await pg.waitForTimeout(2500);
      const r3 = await pg.evaluate(() => ({ url: location.search, sep: [...document.querySelectorAll('#lib-grid .lib-sep')].map(e => e.textContent), st: [...document.querySelectorAll('#lib-grid .cc-card[data-nota]')].every(c => /&nota=st$/.test(c.getAttribute('href'))) }));
      /* 合唱谱 › 简谱合唱 也给末尾提示（T9） */
      await pg.goto('https://www.puyouquan.com/?pz=hechang&sub=jianpu'); await pg.waitForTimeout(2500);
      const r4 = await pg.evaluate(() => ({ sep: [...document.querySelectorAll('#lib-grid .lib-sep')].map(e => e.textContent), ids: [...document.querySelectorAll('#lib-grid .cc-card')].map(c => (c.getAttribute('href').match(/pub=([^&]+)/) || [])[1] + ((c.getAttribute('href').match(/nota=([a-z]+)/) || [])[1] ? ':' + c.getAttribute('href').match(/nota=([a-z]+)/)[1] : '')) }));
      await pg._ctx.close();
      T(sums && cats.conv && L.nConv === cats.conv.jianpu.n && r1.line === '还有 ' + cats.conv.jianpu.n + ' 首是五线谱 · 用简谱看 ›' && r1.conv === 0 && r1.n === L.n0,
        'Z6a 计数：每个一级＝各二级之和；「简谱」列表末尾「还有 N 首是五线谱 · 用简谱看 ›」的 N＝/api/pub/cats 的 conv＝接口 nConv（浏览默认不展开）', J({ sums, conv: cats.conv && cats.conv.jianpu.n, nConv: L.nConv, r1 }));
      T(/conv=1/.test(r2.url) && r2.ss === '1' && J(r2.sep) === J(['以下是五线谱，打开时用简谱看']) && r2.conv.length === cats.conv.jianpu.n && r2.conv.every(h => /&nota=jp$/.test(h)) && !r2.line
        && /conv=1/.test(r3.url) && r3.sep[0] === '以下是简谱，打开时用五线谱看' && r3.st && r4.sep[0] === '以下是五线合唱，打开时用简谱看' && r4.ids.includes('lpq06xxx:jp') && r4.ids.indexOf('lpq18xxx') === 0
        && bc.includes('可看五线') && bc.includes('可看简谱'),
        'Z6b 点「用简谱看」：五线谱原稿接在分隔线后（链接带 &nota=jp），URL 带 conv=1、本次会话记住（换到五线谱也展开、带 &nota=st）；合唱谱 › 简谱合唱同样末尾接五线合唱；卡片角标「可看五线 / 可看简谱」',
        J({ r2: Object.assign({}, r2, { conv: r2.conv.length }), r3, r4, bc }));
    });

    /* ---------- Z7 手机 375×667 ---------- */
    await guard('Z7', async () => {
      const pg = await mkPage(b, 'https://www.puyouquan.com/', { vp: { width: 375, height: 667 } });
      const g = await pg.evaluate(() => {
        const row = document.getElementById('lib-cats'), cs = [...row.querySelectorAll('.fchip')].map(c => { const r = c.getBoundingClientRect(); return { t: c.textContent.trim(), l: r.left, r: r.right, t0: r.top, b: r.bottom, vis: getComputedStyle(c).display !== 'none' }; });
        const card = document.querySelector('#lib-grid .cc-card'), cr = card ? card.getBoundingClientRect() : null;
        return { grid: row.classList.contains('pz-grid'), cs, card: cr && { t: cr.top, b: cr.bottom }, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: innerHeight };
      });
      const rows = [...new Set(g.cs.map(c => Math.round(c.t0)))];
      await shot(pg, '2-mobile-375-grid.png');
      await pg.click('#lib-cats [data-pz="jianpu"]'); await pg.waitForTimeout(900);
      const s1 = await pg.evaluate(() => ({ cls: document.getElementById('lib-cats').className, chips: [...document.querySelectorAll('#lib-cats .fchip')].map(c => c.textContent.trim()), nowrap: getComputedStyle(document.getElementById('lib-cats')).flexWrap, subs: document.getElementById('lib-subs').hidden, insts: document.getElementById('lib-insts').hidden }));
      await pg.click('#lib-cats [data-sub="qiyue"]'); await pg.waitForTimeout(900);
      const s2 = await pg.evaluate(() => [...document.querySelectorAll('#lib-cats .fchip')].map(c => c.textContent.trim()));
      await pg.click('#lib-cats [data-iback]'); await pg.waitForTimeout(300);
      const s3 = await pg.evaluate(() => [...document.querySelectorAll('#lib-cats .fchip')].map(c => c.textContent.trim())[0]);
      await pg.click('#lib-cats [data-back]'); await pg.waitForTimeout(600);
      const s4 = await pg.evaluate(() => ({ grid: document.getElementById('lib-cats').classList.contains('pz-grid'), url: location.search }));
      await pg._ctx.close();
      const allIn = g.cs.length === 8 && g.cs.every(c => c.vis && c.l >= 0 && c.r <= 375 && c.b <= 667);
      T(g.grid && allIn && rows.length === 2 && g.cs.map(c => c.t).join(' ') === '简谱 五线谱 钢琴谱 吉他谱 尤克里里 合唱谱 功能谱 ♥ 收藏' && g.sw <= g.cw && g.card && g.card.t < 667,
        'Z7a 375×667 未选一级：2×4 宫格 8 格（简谱 五线谱 钢琴谱 吉他谱 / 尤克里里 合唱谱 功能谱 ♥ 收藏）全在首屏、不横滑，首屏看得到第一张卡', J({ rows, cs: g.cs.map(c => c.t + '@' + Math.round(c.l) + ',' + Math.round(c.t0) + '-' + Math.round(c.r) + ',' + Math.round(c.b)), card: g.card, sw: g.sw }));
      T(/pz-row/.test(s1.cls) && s1.nowrap === 'nowrap' && s1.chips[0] === '‹' && s1.chips[1] === '简谱' && s1.chips.includes('器乐') && s1.chips[s1.chips.indexOf('器乐') + 1] === '二胡' && s1.subs && s1.insts
        && s2[0] === '‹ 器乐' && s2.includes('二胡') && s2.includes('葫芦丝') && s3 === '‹' && s4.grid && s4.url === '',
        'Z7b 手机选了一级收成一行「‹ 简谱 · 二级…」（「器乐」后直接露前 3 个乐器）；点「器乐」整行换成全部乐器「‹ 器乐」可返回；行首「‹」回宫格', J({ s1, s2, s3, s4 }));
    });

    /* ---------- Z8 旧缓存 / 旧接口 ---------- */
    await guard('Z8', async () => {
      const OLD = [{ id: 'oldv0001', title: '老歌谱', author: 'a', type: 'vocal', measures: 2, cover: [] }, { id: 'oldg0001', title: '老弹唱', author: 'a', type: 'guitar', measures: 2, cover: [] }];
      const init = `try{ sessionStorage.setItem('pyq-pub-cache', JSON.stringify({t:Date.now(), scores:${J(OLD)}})); sessionStorage.setItem('pyq-pub-cache2', JSON.stringify({t:Date.now(), scores:${J(OLD)}})); }catch(_){}`;
      const pg = await mkPage(b, 'https://www.puyouquan.com/', { init });
      const r1 = await pg.evaluate(() => ({ cats: document.querySelectorAll('#lib-cats .fchip[data-pz]').length, n: document.querySelectorAll('#lib-grid .cc-card').length }));
      await pg._ctx.close();
      const stub = (p) => p === '/api/pub/scores' ? { status: 200, contentType: 'application/json', body: J({ scores: OLD, total: 2 }) } : p === '/api/pub/cats' ? { status: 404, body: '' } : null;
      const p2 = await mkPage(b, 'https://www.puyouquan.com/', { stub });
      const r2 = await p2.evaluate(() => document.querySelectorAll('#lib-cats .fchip[data-pz]').length);
      await p2.click('#lib-cats [data-pz="jianpu"]'); await p2.waitForTimeout(500);
      const r3 = await ids(p2);
      await p2.click('#lib-cats [data-pz="jita"]'); await p2.waitForTimeout(500);
      const r4 = await ids(p2);
      await p2._ctx.close();
      T(r1.cats === 7 && r1.n === 12 && r2 === 7 && J(r3) === J(['oldv0001']) && J(r4) === J(['oldg0001']),
        'Z8 上线前写入的旧缓存（旧键 pyq-pub-cache、缺 pz 的新键 pyq-pub-cache2）当没命中、7 个一级常显；旧接口（卡片没有 pz、没有 /api/pub/cats）照样按旧 type 归一级', J({ r1, r2, r3, r4 }));
    });

    /* ---------- Z9 观看页 ?nota= ---------- */
    await guard('Z9', async () => {
      const id = 'lpq04xxx';
      const pg = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + id + '&nota=jp', { wait: 2500 });
      await pg.waitForFunction(() => typeof viewerMode !== 'undefined' && viewerMode && !!document.getElementById('vw-fav'), null, { timeout: 15000 }).catch(() => {});
      const r1 = await pg.evaluate(() => ({ nota: vwNotaOf(song), orig: JSON.stringify((viewerCtx.pb.data || {}).voxNotations), vn: JSON.stringify(song.voxNotations || null) }));
      const ev = pg._ev.filter(e => e.name === 'open_pub').map(e => e.meta);
      await pg._ctx.close();
      const p2 = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + id + '&nota=xx', { wait: 2500 });
      await p2.waitForFunction(() => typeof viewerMode !== 'undefined' && viewerMode && !!document.getElementById('vw-fav'), null, { timeout: 15000 }).catch(() => {});
      const r2 = await p2.evaluate(() => vwNotaOf(song));
      await p2._ctx.close();
      T(r1.nota === 'jp' && r1.orig === '["staff"]' && r2 === 'st' && J(ev) === J([id + ':jp']),
        'Z9 观看页读 ?nota=jp：五线谱原稿打开即简谱视图（vwNotaOf＝jp），发布数据里的记谱法不动（只改观看副本）；非法值忽略；open_pub 带 :jp 来源', J({ r1, r2, ev }));
    });

    /* ---------- Z10 编辑器谱友圈 ---------- */
    await guard('Z10', async () => {
      const pg = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 2000 });
      const toasts = [];
      await pg.evaluate(() => { try { localStorage.removeItem('musetab-libtip'); } catch (_) {} hideStartPad(); window.__tq = []; const t0 = window.toast; window.toast = function (m) { window.__tq.push(String(m)); return t0.apply(this, arguments); }; });
      await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-old="b-circle"]'); await pg.click('#popmenu [data-old="b-circle"]');
      await pg.waitForTimeout(400);
      toasts.push(await pg.evaluate(() => window.__tq.join('|')));
      await pg.waitForTimeout(1800);
      const r1 = await pg.evaluate(() => ({ nx: (document.getElementById('circle') || {}).className, chips: [...document.querySelectorAll('#circle .cc-pzrow .cc-chip')].map(c => c.textContent.trim()), old: document.querySelectorAll('#circle [data-cat]').length }));
      await pg.click('#circle [data-pz="jianpu"]'); await pg.waitForTimeout(800);
      const ids1 = await pg.evaluate(() => [...document.querySelectorAll('#circle .cc-card[data-pub]')].map(c => c.dataset.pub));
      const line = await pg.evaluate(() => (document.querySelector('#circle .cc-conv') || {}).textContent || '');
      await pg.click('#circle [data-conv]'); await pg.waitForTimeout(800);
      const conv = await pg.evaluate(() => [...document.querySelectorAll('#circle .cc-card[data-nota]')].map(c => c.dataset.pub + ':' + c.dataset.nota));
      await pg.click('#circle .cc-card[data-pub="lpq04xxx"]'); await pg.waitForTimeout(2000);
      const v = await pg.evaluate(() => ({ viewer: viewerMode, nota: vwNotaOf(song), title: song.title }));
      await pg.evaluate(() => { try { exitViewer(); } catch (_) {} window.__tq = []; openCircle(); }); await pg.waitForTimeout(1500);
      toasts.push(await pg.evaluate(() => window.__tq.join('|')));
      await pg.fill('#cc-q', '茉莉花 二胡谱'); await pg.waitForTimeout(1300);
      const sq = await pg.evaluate(() => ({ conds: [...document.querySelectorAll('#circle .cc-cond')].map(c => c.textContent.trim()), ids: [...document.querySelectorAll('#circle .cc-card[data-pub]')].map(c => c.dataset.pub) }));
      const libEv = pg._ev.filter(e => e.name === 'ui_cmd' && /^lib:/.test(e.meta)).map(e => e.meta);
      await pg._ctx.close();
      const want = new Set(cards.filter(c => K.pzMatch(c, { pz: 'jianpu' }) >= 0).map(c => c.id));
      T(r1.nx === 'cc-nx' && r1.chips.join(',') === '全部,简谱,五线谱,钢琴谱,吉他谱,尤克里里,合唱谱,功能谱,♥ 收藏' && r1.old === 0 && /钢琴独奏 → 钢琴谱 › 独奏/.test(toasts[0]) && !/钢琴独奏 →/.test(toasts[1])
        && ids1.length === want.size && ids1.every(x => want.has(x)) && /^还有 \d+ 首是五线谱 · 用简谱看 ›$/.test(line.trim()) && conv.includes('lpq04xxx:jp') && conv.every(x => /:jp$/.test(x))
        && v.viewer && v.nota === 'jp' && v.title === '茉莉花' && J(sq.conds) === J(['乐器：二胡 ×']) && sq.ids[0] === ID('茉莉花') && libEv.includes('lib:pz:jianpu') && libEv.includes('lib:conv:1'),
        'Z10a 编辑器新外壳谱友圈（文件 ▾ 谱库）：一级同官网（旧 11 类不在）；首访一次性提示「钢琴独奏 → 钢琴谱 › 独奏」（第二次不再出）；点简谱＝全库简谱成员（含第 201 首以后）；「用简谱看」展开后点五线谱原稿＝观看页简谱视图；在线搜索出条件块；埋点 ui_cmd lib:*',
        J({ r1, toasts, n: [ids1.length, want.size], extraIds: ids1.filter(x => !want.has(x)).slice(0, 4), missIds: [...want].filter(x => !ids1.includes(x)).slice(0, 4), line, conv: conv.slice(0, 3), v, sq: { conds: sq.conds, first: sq.ids[0] }, libEv }));
      /* 旧外壳 / ?next=0：谱友圈逐字不变（旧 11 类 + 免费 / 付费 / 收藏，没有谱种按钮） */
      const OLDC = 'all,guitar,solo,pianoacc,piano,vocal,teach,instr,func,chord,uku';
      const res = {};
      for (const u of ['https://zhipu.puyouquan.com/?shell=classic', 'https://zhipu.puyouquan.com/?next=0']) {
        const p2 = await mkPage(b, u, { wait: 2000 });
        await p2.evaluate(() => { hideStartPad(); openCircle(); }); await p2.waitForTimeout(1200);
        res[u.split('?')[1]] = await p2.evaluate(() => ({ cls: document.getElementById('circle').className, cats: [...document.querySelectorAll('#circle .cc-chip[data-cat]')].map(c => c.dataset.cat).join(','),
          pay: document.querySelectorAll('#circle .cc-chip[data-pay]').length, pz: document.querySelectorAll('#circle [data-pz]').length, ph: document.getElementById('cc-q').placeholder, toast: (document.getElementById('toast') || {}).textContent || '' }));
        await p2._ctx.close();
      }
      T(Object.values(res).every(r => r.cls === '' && r.cats === OLDC && r.pay === 2 && r.pz === 0 && r.ph === '搜索曲名 / 作者' && !/钢琴独奏 →/.test(r.toast)),
        'Z10b 旧外壳 ?shell=classic 与 ?next=0：谱友圈仍是旧 11 类＋免费 / 付费＋收藏、搜索框原文，没有谱种按钮与首访提示', J(res));
    });

    /* ---------- Z13 v70.0 验收⑦：小调卡片调名（《致爱丽丝》a 小调，此前写「C 调」） ---------- */
    await guard('Z13', async () => {
      const FE = 'lib-pd-fur-elise', fe = cards.find(c => c.id === FE) || {};
      const modes = [...new Set(cards.map(c => c.mode))].sort();
      /* 官网卡片 */
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      await typeQ(pg, '致爱丽丝');
      const site = await pg.evaluate(id => { const a = [...document.querySelectorAll('#lib-grid .cc-card')].find(c => (c.getAttribute('href') || '').includes('pub=' + id)); const m = a && a.querySelector('.meta');
        return m ? [...m.querySelectorAll('i')].map(i => i.textContent) : null; }, FE);
      await pg._ctx.close();
      /* 编辑器新外壳谱友圈 */
      const ed = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 2000 });
      await ed.evaluate(() => { hideStartPad(); });
      await ed.click('#flw-file'); await ed.waitForSelector('#popmenu [data-old="b-circle"]'); await ed.click('#popmenu [data-old="b-circle"]'); await ed.waitForTimeout(1500);
      await ed.fill('#cc-q', '致爱丽丝'); await ed.waitForTimeout(1500);
      const nx = await ed.evaluate(id => { const c = document.querySelector('#circle .cc-card[data-pub="' + id + '"] .meta'); return { cls: document.getElementById('circle').className, m: c ? [...c.querySelectorAll('i')].map(i => i.textContent) : null }; }, FE);
      await ed._ctx.close();
      /* 旧外壳：卡片调名不动（同一张接口卡片照写「C 调」） */
      const old = {};
      for (const u of ['https://zhipu.puyouquan.com/?shell=classic', 'https://zhipu.puyouquan.com/?next=0']) {
        const p2 = await mkPage(b, u, { wait: 2000 });
        await p2.evaluate(() => { hideStartPad(); openCircle(); }); await p2.waitForTimeout(1200);
        old[u.split('?')[1]] = await p2.evaluate(id => { const card = document.querySelector('#circle .cc-card[data-pub="' + id + '"] .meta');
          const h = circleCard({ pid: 'z13', remote: true, title: 't', type: 'piano', key: 'C', mode: 'minor', data: { mode: 'minor' }, measures: 4 }, {}, {});
          return { cls: document.getElementById('circle').className, grid: card ? [...card.querySelectorAll('i')].map(i => i.textContent) : null, synth: /<i>C 调<\/i>/.test(h) && !/小调/.test(h), any: /小调/.test(document.getElementById('circle').innerHTML) }; }, FE);
        await p2._ctx.close();
      }
      T(fe.mode === 'minor' && fe.key === 'C' && J(modes) === J(['', 'minor']) && !!site && site.includes('a 小调') && !site.includes('C 调')
        && nx.cls === 'cc-nx' && !!nx.m && nx.m.includes('a 小调') && !nx.m.includes('C 调')
        && Object.values(old).every(o => o.cls === '' && o.synth && !o.any && (!o.grid || o.grid.includes('C 调'))),
        'Z13 验收⑦ 小调卡片调名：接口卡片带 mode（小调＝minor、其余＝空串，只增字段）；官网卡片与编辑器新外壳谱友圈卡片《致爱丽丝》写「a 小调」（此前「C 调」）；旧外壳 ?shell=classic / ?next=0 谱友圈卡片照写「C 调」',
        J({ fe: { key: fe.key, mode: fe.mode, type: fe.type }, modes, site, nx, old }));
    });

    /* ---------- Z14 v70.2 专题入口＝站内谱单（方案 §4.4 / §十四 P3 最小一步）：官网首页文字链 3 个＋二级行末 4 个、编辑器新外壳谱友圈行末 4 个 ---------- */
    await guard('Z14', async () => {
      const API = {}; for (const z of ['kaobian', 'yikao', 'shifan']) { const r = await allPages('zt=' + z); API[z] = { ids: r.cards.map(c => c.id).sort(), n: r.total }; }
      const snapW = pg => pg.evaluate(() => ({ url: location.search, title: document.getElementById('lib-title').textContent, count: document.getElementById('lib-count').textContent.trim(),
        ids: [...document.querySelectorAll('#lib-grid .cc-card')].map(c => ((c.getAttribute('href') || '').match(/pub=([^&]+)/) || [])[1]).sort(),
        conds: [...document.querySelectorAll('#lib-conds .cond')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), lk: [...document.querySelectorAll('#lib-conds a.cond-lk')].map(a => a.textContent.trim() + '>' + a.getAttribute('href')),
        lit: [...document.querySelectorAll('#lib-cats .fchip.on')].map(e => e.textContent.trim()) }));
      const NAME = { kaobian: '考编即兴伴奏', yikao: '艺考视唱练耳', shifan: '师范儿歌弹唱' };
      const okW = (r, z, page) => r.url === '?zt=' + z && r.title === NAME[z] && J(r.ids) === J(API[z].ids) && r.count === API[z].n + ' 首' && J(r.conds) === J(['专题：' + NAME[z] + ' ×']) && J(r.lk) === J(['了解专题 ›>' + page + '.html']) && J(r.lit) === J(['全部']);
      const site = [];
      for (const z of ['kaobian', 'yikao', 'shifan']) {
        const pg = await mkPage(b, 'https://www.puyouquan.com/');
        await pg.click('#lib-zt [data-zt="' + z + '"]'); await pg.waitForTimeout(1500);
        const r = await snapW(pg); site.push({ from: '文字链 ' + z, ok: okW(r, z, z), r });
        if (z === 'kaobian') {   /* 去掉条件回到全部；了解专题 → 原宣传页（同站） */
          await pg.click('#lib-conds [data-rmzt]'); await pg.waitForTimeout(500);
          const r2 = await snapW(pg); site.push({ from: '去掉专题', ok: r2.url === '' && r2.title === '最新上架' && !r2.conds.length && !r2.lk.length, r: r2 });
          await pg.click('#lib-zt [data-zt="kaobian"]'); await pg.waitForTimeout(800);
          await Promise.all([pg.waitForNavigation({ timeout: 8000 }).catch(() => {}), pg.click('#lib-conds a.cond-lk')]);
          site.push({ from: '了解专题', ok: new URL(pg.url()).pathname === '/kaobian.html', r: pg.url() });
        }
        await pg._ctx.close();
      }
      const TAIL = [['jianpu', 'shifan', 'shifan'], ['wuxian', 'yikao', 'yikao'], ['gangqin', 'kaobian', 'kaobian'], ['gongneng', 'kaobian', 'jixing']];
      for (const [pz, z, page] of TAIL) {
        const pg = await mkPage(b, 'https://www.puyouquan.com/?pz=' + pz);
        await pg.click('#lib-subs .lib-ztl'); await pg.waitForTimeout(1500);
        const r = await snapW(pg); site.push({ from: '行末 ' + pz, ok: okW(r, z, page), r });
        await pg._ctx.close();
      }
      const pj = await mkPage(b, 'https://www.puyouquan.com/?zt=jixing');   /* 旧口径 ?zt=jixing：落考编、地址栏改写，「了解专题」回即兴伴奏页 */
      const rj = await snapW(pj); await pj._ctx.close(); site.push({ from: '?zt=jixing', ok: okW(rj, 'kaobian', 'jixing'), r: rj });
      /* 编辑器新外壳谱友圈：行末 4 个入口在谱友圈里按 zt 筛（不新开窗口），条件区「了解专题 ›」新开窗口去原宣传页 */
      const pe = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 2000 });
      await pe.evaluate(() => { hideStartPad(); openCircle(); }); await pe.waitForTimeout(1500);
      const ed = [];
      for (const [pz, z, page] of TAIL) {
        await pe.click('#circle [data-pz="' + pz + '"]'); await pe.waitForTimeout(500);
        const a0 = await pe.evaluate(() => { const a = document.querySelector('#circle .cc-subrow .cc-ztl'); return a ? { t: a.textContent.trim(), tg: a.getAttribute('target') || '' } : null; });
        const n0 = pe.context().pages().length;
        await pe.click('#circle .cc-subrow .cc-ztl'); await pe.waitForTimeout(1500);
        const r = await pe.evaluate(() => ({ cls: document.getElementById('circle') && document.getElementById('circle').className, count: document.querySelector('#circle .cc-count').textContent.trim(),
          ids: [...document.querySelectorAll('#circle .cc-card[data-pub]')].map(c => c.dataset.pub).sort(), conds: [...document.querySelectorAll('#circle .cc-condrow .cc-cond')].map(c => c.textContent.trim()),
          lk: [...document.querySelectorAll('#circle .cc-condrow a[data-ztx]')].map(a => a.textContent.trim() + '>' + a.getAttribute('href') + '>' + a.getAttribute('target')),
          lit: [...document.querySelectorAll('#circle .cc-pzrow .cc-chip.on')].map(e => e.textContent.trim()), subHidden: document.querySelector('#circle .cc-subrow').hidden }));
        ed.push({ pz, a0, r, ok: !!a0 && a0.tg === '' && pe.context().pages().length === n0 && r.cls === 'cc-nx' && J(r.ids) === J(API[z].ids) && r.count === API[z].n + ' 首'
          && J(r.conds) === J(['专题：' + NAME[z] + ' ×']) && J(r.lk) === J(['了解专题 ›>https://www.puyouquan.com/' + page + '.html>_blank']) && J(r.lit) === J(['全部']) && r.subHidden });
        await pe.click('#circle .cc-condrow [data-rmzt]'); await pe.waitForTimeout(400);
      }
      const back = await pe.evaluate(() => ({ conds: document.querySelectorAll('#circle .cc-condrow > *').length, n: document.querySelectorAll('#circle .cc-card[data-pub]').length }));
      const zEv = pe._ev.filter(e => e.name === 'ui_cmd' && /^lib:zt:/.test(e.meta)).map(e => e.meta);
      await pe._ctx.close();
      T(site.every(x => x.ok), 'Z14a 官网专题入口落站内谱单：首页「考编 · 艺考 · 师范」与简谱 / 五线谱 / 钢琴谱 / 功能谱行末入口 → URL ?zt=、列表与计数＝接口 ?zt= 全库、条件块「专题：…」可删、「了解专题 ›」指向原宣传页（功能谱 → jixing.html）、点了同站跳转；?zt=jixing 落考编',
        J(site.filter(x => !x.ok).map(x => ({ from: x.from, r: x.r, want: API }))).slice(0, 1500));
      T(ed.every(x => x.ok) && back.conds === 0 && back.n > 0 && J([...new Set(zEv)].sort()) === J(['lib:zt:kaobian', 'lib:zt:shifan', 'lib:zt:yikao']) && zEv.every(m => /^lib:zt:(kaobian|yikao|shifan)$/.test(m)),   /* 同一会话同一 id 只记一次 */
        'Z14b 编辑器新外壳谱友圈行末 4 个专题入口：站内按 zt 筛（不新开窗口）、计数＝接口 zt 计数、条件块可删、「了解专题 ›」新开窗口到 www 原页；埋点 lib:zt:*',
        J({ bad: ed.filter(x => !x.ok), back, zEv, want: Object.fromEntries(Object.entries(API).map(([k, v]) => [k, v.n])) }).slice(0, 1500));
    });

    /* ---------- Z11 埋点 / 小程序 / 后台 / 谱名 ---------- */
    await guard('Z11', async () => {
      const pg = await mkPage(b, 'https://www.puyouquan.com/');
      await pg.click('#lib-cats [data-pz="wuxian"]'); await pg.waitForTimeout(500);
      await pg.click('#lib-insts [data-inst="violin"]'); await pg.waitForTimeout(500);
      await typeQ(pg, '茉莉花 二胡谱');
      const ev = pg._ev.filter(e => e.name === 'ui_cmd').map(e => e.meta);
      const vIds = (await allPages('pz=wuxian&inst=violin')).cards.map(c => c.id);
      await pg._ctx.close();
      T(ev.includes('lib:pz:wuxian') && ev.includes('lib:inst:violin') && ev.includes('lib:q2f:erhu') && ev.every(m => /^lib:(pz|sub|inst|conv|acc|zt|q2f):[a-z0-9]+$/.test(m)) && vIds.includes('lpq17xxx') && vIds.includes('lpq07xxx'),
        'Z11a 官网筛选埋点只发 ui_cmd lib:<维度>:<表内 id>（不带原词）；五线谱 › 小提琴＝器乐 ∪ 重奏（小提琴＋钢琴、小提琴二重奏都在，T20）', J({ ev, v: vIds }));
      const mp = await mkPage(b, 'https://www.puyouquan.com/', { ua: 'Mozilla/5.0 (iPhone) MicroMessenger/8.0 miniProgram', vp: { width: 375, height: 667 }, init: 'window.__wxjs_environment="miniprogram";' });
      await typeQ(mp, '一首根本不存在的歌');
      const mk = await mp.evaluate(() => { const a = document.getElementById('empty-make'); return a ? a.textContent.trim() + '|' + a.getAttribute('href') : ''; });
      await mp._ctx.close();
      T(/^发到电脑做\|\/\/zhipu\.puyouquan\.com\/$/.test(mk), 'Z11b 小程序里（html.is-mp）通往编辑器的按钮改「发到电脑做」（点了复制制谱链接）', mk);
      const ov = { users: 1, roles: {}, scores: 1, published: 1, pending: 0, orders: {}, funnel: [], uiModes: null,
        createStack: { days: 7, n: 5, scene: { gtr: { n: 3, u: 2 }, pacc: { n: 2, u: 1 } }, stack: { JT: { n: 3, u: 2 } }, entry: { panel: { n: 5, u: 3 } }, first: { '1': { n: 2, u: 2 } } },
        libCmd: [{ k: 'lib:pz:jianpu', n: 9, u: 4 }, { k: 'lib:inst:erhu', n: 3, u: 2 }] };
      const stub = p => p === '/api/me' ? { status: 200, contentType: 'application/json', body: J({ user: { id: 'u1', role: 'admin', nickname: '管', phone: '1' }, stats: {} }) }
        : p === '/api/admin/overview' ? { status: 200, contentType: 'application/json', body: J(ov) } : p.startsWith('/api/admin/') ? { status: 200, contentType: 'application/json', body: '{}' } : null;
      const ad = await mkPage(b, 'https://www.puyouquan.com/admin.html', { stub, wait: 1500 });
      const ft = await ad.evaluate(() => (document.getElementById('ad-funnel') || {}).textContent || '');
      await ad._ctx.close();
      T(/新建谱（7 日 5 次/.test(ft) && /用途 gtr 2\/3/.test(ft) && /谱行 JT 2\/3/.test(ft) && /入口 panel 3\/5/.test(ft) && /谱库筛选（7 日/.test(ft) && /pz:jianpu 4\/9/.test(ft),
        'Z11c 后台概览显示 P0 新增的新建谱分布（用途 / 谱行 / 入口 / 首次，人数/次数）与谱库筛选点击（lib:*）', ft.split('\n').slice(-2).join(' ¦ ').slice(0, 200));
      const cg = cards.find(c => c.id === 'lpq14xxx');
      T(cg && cg.typeLabel === '钢琴伴奏谱（纯伴奏）' && cg.type === 'pianoacc' && cg.pz === 'gangqin' && cg.sub === 'banzou',
        'Z11d 拍板 10：纯伴奏谱名「钢琴伴奏谱（纯伴奏）」（与归属 钢琴谱 › 伴奏 一致；旧 type 仍是 pianoacc）', J(cg && [cg.typeLabel, cg.type, cg.pz, cg.sub]));
    });

    /* ---------- Z12 发布弹层「将归入」＝发布后谱库卡片；合唱谱伴奏搜索词（放最后：这里会再发布 3 首，不影响前面的计数） ---------- */
    await guard('Z12', async () => {
      const SAMPLES = [
        ['将归入弹唱样例', V(['旋律', '右手伴奏', '左手伴奏'], [null, 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, [0]), 'gangqin.tanchang'],   /* 简谱旋律＋钢琴（有词） */
        ['将归入歌曲样例', V(['旋律'], [null], null, true), 'jianpu.gequ'],                                                            /* 纯简谱歌曲 */
        ['将归入合唱样例', V(['S', 'A', '右手', '左手'], [null, null, 'staff', 'bass'], { voxGroups: [BC(2, 3)] }, [0, 1]), 'hechang.jianpu'],   /* 合唱＋钢琴：也出现在两处 */
      ];
      const pg = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 2000 });
      /* 线上已登录的管理员（发布免自审直接上架）：云端接口在页内打桩，只记下提交时 PUT 的发布体 */
      await pg.evaluate(() => { hideStartPad(); if (typeof guardReplace !== 'undefined') guardReplace = p => p();
        window.__put = []; window.PYQ_CLOUD = true; ACCT = { id: 'u1', phone: '138****0000', role: 'admin', nickname: '测' };
        apiCall = async (p, o) => { if (o && o.method === 'PUT' && /^\/scores\/[^/]+$/.test(p)) { window.__put.push({ id: p.split('/')[2], body: JSON.parse(JSON.stringify(o.body)) }); return {}; }
          return /\/publish$/.test(p) ? { published: true } : {}; }; });
      const ui = [];
      for (const [title, d] of SAMPLES) {
        await pg.evaluate(([t, d]) => { try { closeModal(); } catch (_) {} try { FLOW.menu.close(); } catch (_) {} loadSong(Object.assign(JSON.parse(JSON.stringify(d)), { title: t })); }, [title, d]);
        await pg.waitForTimeout(600);
        await pg.click('#flw-pub'); await pg.waitForTimeout(450);
        ui.push(await pg.evaluate(() => { const e = document.getElementById('flw-pubp-pz'), b = e && e.querySelector('b'), r = e && e.getBoundingClientRect();
          return e ? { pz: e.dataset.pz, sub: e.dataset.sub, lab: (e.querySelector('span') || {}).textContent, name: b && b.textContent, tip: e.getAttribute('title') || '', vis: !!r && r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden',
            inPop: !!e.closest('#flw-pubp') } : null; }));
        await pg.click('#flw-pubp-go'); await pg.waitForTimeout(900);
      }
      /* 存入时后台去抖同步也会 PUT 同一首：按 id 取最后一次（＝提交发布时那份） */
      const put = Object.values((await pg.evaluate(() => window.__put)).reduce((o, x) => (o[x.id] = x, o), {}));
      await pg._ctx.close();
      /* 把编辑器提交的那份 data 原样写进库并上架（同 seed 口径），再从谱库列表接口取卡片 */
      const sd2 = seed(put.map((x, i) => ({ id: x.id, title: x.body.title, singer: x.body.singer || '', d: x.body.data, at: 9000 + i })), 'libpz00002', '13100006667');
      const all = await allPages('conv=1');
      const rows = SAMPLES.map(([title, , want], i) => { const x = put.find(p => p.body && p.body.title === title), c = x && all.cards.find(k => k.id === x.id), u = ui[i] || {};
        const tip = c && c.also.length ? '也出现在 ' + c.also.map(a => K.pzName(a)).join(' · ') : '';
        return { title, want, ui: u.pz + '.' + u.sub, card: c ? c.pz + '.' + c.sub : '', name: u.name, nameWant: c ? K.pzName(c.pz + '.' + c.sub) : '', tip: u.tip, tipWant: tip, lab: u.lab, vis: u.vis && u.inPop,
          ok: !!c && u.vis && u.inPop && u.lab === '将归入' && u.pz === c.pz && u.sub === c.sub && c.pz + '.' + c.sub === want && u.name === K.pzName(c.pz + '.' + c.sub) && u.tip === tip }; });
      T(/seeded 3/.test(sd2) && put.length === 3 && rows.every(r => r.ok) && rows[1].tip === '' && rows[2].tip === '也出现在 简谱 › 合唱 · 钢琴谱 › 伴奏',
        'Z12a 新外壳行 1「发布」弹层显示「将归入」主谱种 › 二级（悬停「也出现在」）＝发布后 /api/pub/scores 卡片的 pz / sub / also：简谱旋律＋钢琴 → 钢琴谱 › 弹唱；纯简谱歌曲 → 简谱 › 歌曲（无悬停）；合唱＋钢琴 → 合唱谱 › 简谱合唱',
        J({ sd2: sd2.trim().slice(0, 20), n: put.length, rows: rows.filter(r => !r.ok).concat(rows.length ? [] : ['空']).slice(0, 3) }));
      /* 合唱谱「伴奏」三选的搜索词：合唱 带伴奏 / 合唱 伴奏 / 合唱 钢琴伴奏 → 带伴奏；无伴奏 → 无伴奏（接口同 ?pz=hechang&hacc=） */
      const A = async q => (await getJ('/api/pub/scores?q=' + encodeURIComponent(q) + '&size=60')).j || {};
      const wantY = (await allPages('pz=hechang&hacc=yes')).cards.map(c => c.id).sort(), wantN = (await allPages('pz=hechang&hacc=no')).cards.map(c => c.id).sort();
      const chId = (put.find(p => p.body && p.body.title === '将归入合唱样例') || {}).id;
      const sq = {};
      for (const q of ['合唱 带伴奏', '合唱 伴奏', '合唱 钢琴伴奏', '无伴奏']) { const r = await A(q); sq[q] = { hacc: r.parse && r.parse.hacc, only: r.parse && r.parse.only, conds: (r.parse && r.parse.conds || []).map(c => c.label), ids: (r.scores || []).map(c => c.id).sort(), fb: r.fb }; }
      const okY = ['合唱 带伴奏', '合唱 伴奏', '合唱 钢琴伴奏'].every(q => sq[q].hacc === 'yes' && !sq[q].only && sq[q].conds.includes('带伴奏') && J(sq[q].ids) === J(wantY) && !sq[q].fb);
      const pgs = await mkPage(b, 'https://www.puyouquan.com/');
      await typeQ(pgs, '合唱 伴奏');
      const site = await pgs.evaluate(() => ({ q: document.getElementById('lib-q').value, conds: [...document.querySelectorAll('#lib-conds .cond')].map(c => c.textContent.replace(/\s+/g, ' ').trim()),
        ids: [...document.querySelectorAll('#lib-grid .cc-card')].map(c => ((c.getAttribute('href') || '').match(/pub=([^&]+)/) || [])[1]).sort() }));
      await pgs._ctx.close();
      T(okY && wantY.includes(chId) && sq['无伴奏'].hacc === 'no' && J(sq['无伴奏'].ids) === J(wantN) && !wantN.includes(chId) && wantN.length > 0
        && site.q === '合唱 伴奏' && site.conds.some(c => /带伴奏/.test(c)) && J(site.ids) === J(wantY),
        'Z12b 搜索「合唱 带伴奏」「合唱 伴奏」「合唱 钢琴伴奏」＝合唱谱 › 带伴奏（条件块「带伴奏」，不当成只有谱种词）、「无伴奏」＝合唱谱 › 无伴奏；官网搜「合唱 伴奏」搜索框不被清空',
        J({ wantY, wantN: wantN.length, chId, sq: Object.fromEntries(Object.entries(sq).map(([k, v]) => [k, Object.assign({}, v, { ids: v.ids.length })])), site }));
      /* 钢琴谱二级悬停（§4.2）与合唱谱「伴奏」行标：官网与编辑器新外壳谱友圈同文 */
      const TIP = { tanchang: '旋律＋歌词＋钢琴', banzou: '纯伴奏 · 合唱器乐伴奏' };
      const pw = await mkPage(b, 'https://www.puyouquan.com/');
      await pw.click('#lib-cats [data-pz="gangqin"]'); await pw.waitForTimeout(600);
      const wTip = await pw.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lib-subs [data-sub]')].map(e => [e.dataset.sub, e.getAttribute('title') || ''])));
      await pw._ctx.close();
      const pe = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 2000 });
      await pe.evaluate(() => { hideStartPad(); openCircle(); }); await pe.waitForTimeout(1500);
      await pe.click('#circle [data-pz="gangqin"]'); await pe.waitForTimeout(600);
      const eTip = await pe.evaluate(() => Object.fromEntries([...document.querySelectorAll('#circle .cc-subrow [data-sub]')].map(e => [e.dataset.sub, e.getAttribute('title') || ''])));
      await pe.click('#circle [data-pz="hechang"]'); await pe.waitForTimeout(600);
      const eCh = await pe.evaluate(() => [...document.querySelectorAll('#circle .cc-subrow > *')].map(e => e.textContent.trim()).join(','));
      await pe._ctx.close();
      const tipOk = t => t.tanchang === TIP.tanchang && t.banzou === TIP.banzou && t.duzou === '';
      T(tipOk(wTip) && tipOk(eTip) && /^简谱合唱,五线合唱,伴奏,全部,带伴奏,无伴奏(,|$)/.test(eCh),
        'Z12c 钢琴谱二级悬停「弹唱＝旋律＋歌词＋钢琴」「伴奏＝纯伴奏 · 合唱器乐伴奏」（官网与编辑器新外壳谱友圈同文、独奏无悬停）；编辑器合唱谱三选前有「伴奏」行标（同官网）', J({ wTip, eTip, eCh }));
    });
  } finally {
    if (srv) { try { srv.p.kill(); } catch (_) {} }
    for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (_) {} }
    await b.close();
  }
  const errs2 = errs.filter(e => !/ResizeObserver/.test(e));
  console.log('PASS ' + pass + '/' + total);
  console.log(errs2.length ? 'ERRORS:\n' + errs2.slice(0, 10).join('\n') : 'NO ERRORS');
  process.exit(pass === total && !errs2.length ? 0 : 1);
})().catch(e => { console.log('❌ 运行异常: ' + (e && e.stack || e)); process.exit(1); });
