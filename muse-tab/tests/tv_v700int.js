/* v70.0 集成 · 跨组接缝（规格 docs/spec-2026-11-v700.md §9 第 2 条「跨组接缝」①–⑥，集成人补⑦）：A 组数据 / 谱名 / intent 存取 × B 组新建面板新组合 × C 组示例与种子 × 真服务端
   I1 ① 新外壳真实点击新建：器乐 × 6 种新乐器（竖笛 / 口风琴 / 陶笛 / 箫 / 大提琴 / 单簧管）×「旋律用」简谱 / 五线谱 ×「钢琴伴奏 加」——乐器下拉 / ⋯ / 旋律用先断言可见再点；
      默认旋律用＝乐器族（简谱族 J、五线谱族 S）；面板「将建成」＝建成谱名＝docTypeLabel＝node nameOf；pzOf 主二级 / 也在 / 乐器（编辑器＝node）；intent＝inst；
      MIDI 通道 0 与 MusicXML 第一个 part 写该乐器 GM program（钢琴两行仍是钢琴）；左栏第一行图标＝同族已有图标（A 数据 × B 面板）
   I2 ② 合唱＋钢琴（简谱 / 五线谱，2–4 部）、器乐＋钢琴（五线谱族 / 简谱族 / 新乐器）建好填音（合唱行带词）后导出 MusicXML → 导入：pyq-intent 写出、intent / 谱名 / 谱行 /
      pzOf 归属不变（B × A）；其中一份走真实「新建 → 从已有音乐 → 选择文件 → 按原文件」；另带萨克斯简谱、简谱视唱两份（v70.0 起新建的 X谱 往返保留乐器名）
   I3 ③ 新组合上换谱类：8 种新组合谱（空 / 有旋律）× 14 个目标谱行按 §3.3 四条规则改写 intent（直接换 / 重建 / 另建一份），另建一份原谱不动；
      真实 lbSwitch：萨克斯简谱→钢琴伴奏歌谱（直接换）、尤克里里指弹→吉他弹唱（空谱重建）、简谱视唱→五线谱（直接换）一步撤销连 intent / instKey 一起退；
      合唱＋钢琴→功能谱（另建一份）原谱 intent 不动（B × A）
   I4 ④ 新示例「做同款」（真实点击：新建 → 从已有音乐 → 示例 → 做同款）→ 填一个音 → 云同步载荷（scoreCloudPush 的 PUT body）→ 真服务端发布 → 谱库卡片 intent / 谱种＝node；
      专题「视唱专题」（?zt=yikao）收两份视唱、「儿歌专题」（?zt=shifan）收儿歌弹唱（C × A × 服务端；v70.3 D9 改显示名，key 不变）
   I5 ⑥ 30 份官方谱口径（实为 29 份：莫扎特 K.2 未录，规格 §7.5 / C 组报告）下真服务端照常：新库启动即种全 seed-library.json（份数读文件，不写死）、
      /api/pub/cats 总数＝种子份数、7 个一级都 ≥1、钢琴谱 › 独奏 ≥3、艺考视唱专题＝种子里 intent＝sight 的那几份（逐 id）、每份卡片谱种＝node pubKindOf
   I6 ⑦（集成人补：C 的种子在 A 的导入导出器合并前生成）29 份种子在最终编辑器上导出 MusicXML 再导入：有 intent 的写 pyq-intent 且读回同值、没有的不写 pyq-intent / pyq-instkey；
      示例 seedId 对应的种子 intent＝编辑器 EXAMPLES make() 的 intent（种子逐字节重建由 tv_library L1 守）
   I7 验收⑥：没填词的歌谱类（pyq-intent＝vocal / kids / pacc / gtr / teach）导出再导入留 1 行词位、谱名不变；器乐 / 视唱 / 指弹 / 功能谱与去掉 pyq-intent 的老文件口径仍 0 行
   ⑤ 在 tv_kindsync K2（新组合变体编辑器 ↔ node 谱名对拍）。
   修前红：MUSETAB_URL=file://<git show 4a99faa:muse-tab/index.html 的副本>（第 0 步：数据与谱名规则已在、面板 / 示例 / intent 存取都还没有）复跑，I1–I4、I6 红。
   env：MUSETAB_URL 编辑器、MUSETAB_API 服务端 server.js（默认仓库 api/server.js）、ONLY=I1,I3、CHROMIUM_PATH。
   v70.1 迁移（规格 docs/spec-2026-11-v701.md §15.2）：新外壳新形态第一步按谱种，「器乐独奏」卡不在了——I1 改 nfpick.nfPick(pg, 'inst', {instKey, tacc}, 旋律用)
   （卡可见点卡；否则「简谱 / 五线谱」行 → 「器乐」形态，各自先断言可见）；乐器下拉照旧选；形态已定旋律用（返回 fixed 含 mel）时不再点预览左上「旋律」，
   「默认旋律用」期望＝形态定的（简谱 › 器乐＝J、五线谱 › 器乐＝S），卡路径照旧＝乐器族；加伴奏照旧开 ⋯ 点「加伴奏」 */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const NFP = require('./lib/nfpick');
const { spawn, spawnSync } = require('child_process');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : (process.env.MUSETAB_URL ? path.resolve(process.env.MUSETAB_URL) : path.resolve(__dirname, '../index.html'));
const API_DIR = path.dirname(process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js'));
const K = require(path.join(API_DIR, 'kindname.js'));
const SEED = JSON.parse(fs.readFileSync(path.join(API_DIR, 'seed-library.json'), 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pyq_v700i_'));
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0; const pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = s => console.log('ℹ️ ' + s);
const guard = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, '运行异常', String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

/* 6 种新乐器：[名, 族, GM program（0 起）]（规格 §4.1–4.2）；左栏图标＝同族已有图标（INST_PQ） */
const NEW6 = { recorder: ['竖笛', 'jianpu', 74], melodica: ['口风琴', 'jianpu', 22], ocarina: ['陶笛', 'jianpu', 79], xiao: ['箫', 'jianpu', 77], cello: ['大提琴', 'staff', 42], clarinet: ['单簧管', 'staff', 71] };
const NEW6_PQ = { recorder: 'inst-flute', melodica: 'inst-harmonica', ocarina: 'inst-hulusi', xiao: 'inst-dizi', cello: 'inst-violin', clarinet: 'inst-sax' };
const INTENTS = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
/* §3.3 换谱类 intent 规则 */
const LB_OK = { gtr: ['JT', 'T'], pacc: ['JG', 'SG', 'CG'], vocal: ['J', 'S', 'JG', 'SG'], teach: ['SJ', 'SJG'], sight: ['S', 'J'], solo: ['ST', 'T'], inst: ['G', 'J', 'S', 'SG'], chord: ['C', 'CJ', 'CS'], blank: ['J', 'S'] };
const LB_DEF = { J: 'vocal', S: 'vocal', SJ: 'teach', SJG: 'teach', JG: 'pacc', SG: 'pacc', CG: 'pacc', JT: 'gtr', T: 'gtr', ST: 'solo', G: 'inst', CJ: 'chord', CS: 'chord', C: 'chord' };
const lbExp = (it, to) => !it ? '∅' : INTENTS.indexOf(it) < 0 ? it : (it === 'kids' || it === 'custom') ? it : (LB_OK[it] || []).indexOf(to) >= 0 ? it : LB_DEF[to];

/* MIDI program change（GM 0 起）：最小 SMF 解析（同 tv_v700data） */
function midiProgs(buf) {
  const out = []; let p = 0;
  const vlq = q => { let v = 0; do { v = (v << 7) | (buf[q.i] & 0x7f); } while (buf[q.i++] & 0x80); return v; };
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4), len = buf.readUInt32BE(p + 4); p += 8;
    if (id === 'MTrk') {
      const q = { i: p }, end = p + len; let rs = 0;
      while (q.i < end) {
        vlq(q); let st = buf[q.i];
        if (st === 0xFF) { q.i += 2; const l = vlq(q); q.i += l; continue; }
        if (st === 0xF0 || st === 0xF7) { q.i++; const l = vlq(q); q.i += l; continue; }
        if (st & 0x80) { rs = st; q.i++; } else st = rs;
        const hi = st & 0xF0;
        if (hi === 0xC0) out.push({ ch: st & 15, prog: buf[q.i] });
        q.i += (hi === 0xC0 || hi === 0xD0) ? 1 : 2;
      }
    }
    p += len;
  }
  return out;
}

/* ---------- 真服务端（DEV_OTP 登录 → CLI 任命管理员：管理员发布免审直接上架；同 tv_v700data） ---------- */
const SQLF = (() => { try { require('node:sqlite'); return []; } catch (_) { return ['--experimental-sqlite']; } })();
const PORT = 4300 + (process.pid % 80);
const DB = path.join(TMP, 'v700i.db');
const BASEURL = 'http://127.0.0.1:' + PORT;
const SENV = () => Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB, JWT_SECRET: 'v700int', COOKIE_DOMAIN: '', DEV_OTP: '1' });
function hreq(method, u, body, cookie) {
  return new Promise((res, rej) => {
    const data = body == null ? null : Buffer.from(JSON.stringify(body));
    const r = http.request(BASEURL + u, { method, headers: Object.assign({}, data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}, cookie ? { Cookie: cookie } : {}) }, rr => {
      let b = ''; rr.setEncoding('utf8'); rr.on('data', c => b += c);
      rr.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (_) {} res({ status: rr.statusCode, body: b, j, set: rr.headers['set-cookie'] || [] }); });
    });
    r.on('error', rej); if (data) r.write(data); r.end();
  });
}
async function startServer() {
  const p = spawn(process.execPath, [...SQLF, 'server.js'], { cwd: API_DIR, env: SENV(), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', c => log += c); p.stderr.on('data', c => log += c);
  for (let i = 0; i < 80; i++) { try { const r = await hreq('GET', '/api/health'); if (r.status === 200) return { p, log: () => log }; } catch (_) {} await W(150); }
  throw new Error('server not up: ' + log.slice(0, 400));
}
async function adminLogin(phone) {
  const s = await hreq('POST', '/api/auth/sms/send', { phone }); const code = s.j && s.j.dev_code;
  const v = await hreq('POST', '/api/auth/sms/verify', { phone, code });
  const ck = (v.set.find(x => /^pyq_token=/.test(x)) || '').split(';')[0];
  const r = spawnSync(process.execPath, [...SQLF, 'admin.js', 'set-role', phone, 'admin'], { cwd: API_DIR, env: SENV(), encoding: 'utf8' });
  const me = await hreq('GET', '/api/me', null, ck);
  return { ck, ok: !!ck && me.j && ((me.j.user || me.j).role === 'admin'), cli: (r.stdout || '') + (r.stderr || '') };
}
async function publish(ck, id, data) {
  const put = await hreq('PUT', '/api/scores/' + id, { title: data.title || id, singer: '', updated_at: Math.floor(Date.now() / 1000), data }, ck);
  if (put.status !== 200) return { put };
  const pub = await hreq('POST', '/api/scores/' + id + '/publish', null, ck);
  return { put, pub };
}
/* 分页取全（?zt= / ?pz= 在全库里筛，size ≤60） */
async function allOf(qs) {
  const out = [];
  for (let p = 0; p < 40; p++) { const r = await hreq('GET', '/api/pub/scores?' + qs + '&size=60&page=' + p), a = (r.j && r.j.scores) || []; out.push(...a); if (a.length < 60) break; }
  return out;
}

/* ---------- 编辑器页面 ---------- */
function INIT() {
  window.__panel = () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} showNewWizard({}); };
  window.__info = s => { s = s || song; const p = PQ_KIND.pzOf(s);
    return { k: NWB.stackOf(s), name: docTypeLabel(s), pz: p.pz + '.' + p.sub, also: (p.also || []).slice().sort(), inst: p.inst || '', intent: s.intent == null ? null : s.intent, ik: s.instKey || '' }; };
  window.__b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  /* 填音：每个旋律 / 人声行第一格一个音，钢琴组以前的行（合唱 / 旋律）带一个字的词；六线 / 四线谱第一格空弦 */
  window.__fill = s => { const g = PQ_KIND.groupsOf(s).find(x => x.type === 'brace'), nMel = g ? g.from : (s.voxVoices || []).length;
    (s.voxVoices || []).forEach((_, vi) => { const c = s.measures[0].voxes[vi][0]; c.deg = [5, 3, 1, 5, 3, 1][vi % 6]; if (vi >= nMel) c.oct = vi === nMel ? 0 : -1;
      if (vi < nMel && (s.lyricLines | 0) > 0) c.lyrics = ['啊']; });
    (s.tabVoices || []).forEach((_, ti) => { s.measures[0].tabs[ti][0].notes = [{ s: 1, f: 0 }]; }); return s; };
}
async function openEd(b, q, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  await ctx.addInitScript(INIT);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(8000); pg._ctx = ctx;
  pg.on('pageerror', e => pageErrs.push((o.tag || '') + ' ' + String(e && e.message || e).slice(0, 200)));
  await pg.goto('file://' + ED + (q || '')); await pg.waitForTimeout(o.wait || 1400);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} });
  return pg;
}
/* 新建面板 linkApply → planOf → realCreate（新外壳新形态，同 tv_v700new N1 口径） */
const CREATE = (pg, qs) => pg.evaluate(async qs => {
  const out = [];
  for (const q of qs) {
    const L = NWP.linkParse('?' + q), st = NWP.fresh({ clean: true, scene: L.scene, link: L }), P = NWP.planOf(st);
    realCreate(P, '', null); await new Promise(r => setTimeout(r, 30));
    out.push({ q, panel: P.kind.name, bad: (st.link || { bad: [] }).bad || [], json: JSON.stringify(__fill(JSON.parse(JSON.stringify(song)))) });
    if (docs.length > 3) closeDocAt(curDocI);
  }
  return out;
}, qs);

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let srv = null;
  try {
    /* ================= I1 ① 6 种新乐器 × 旋律用 × 钢琴伴奏（真实点击） ================= */
    if (want('I1')) await guard('I1', async () => {
      const pg = await openEd(b, '', { tag: 'I1' });
      const p2a = await pg.evaluate(() => typeof nwP2A === 'function' && nwP2A());
      const bad = [], rows = [];
      for (const k of Object.keys(NEW6)) {
        const [nm, fam, gm] = NEW6[k];
        for (const mode of ['J', 'S', 'acc']) {
          const tag = k + ' ' + mode, vis = [];
          await pg.evaluate(() => __panel()); await W(250);
          const pk0 = await NFP.nfPick(pg, 'inst', { instKey: k, tacc: mode === 'acc' ? 'with' : 'no' }, mode === 'J' ? 'J' : 'S'); await W(80);
          const melFix = pk0.fixed.includes('mel'), melWant = melFix ? (pk0.pz === 'jianpu' ? 'J' : 'S') : (fam === 'staff' ? 'S' : 'J');
          vis.push(await pg.isVisible('#nf-inst'));
          const hasOpt = await pg.evaluate(k => !!document.querySelector('#nf-inst option[value="' + k + '"]'), k);
          if (!hasOpt) { bad.push(tag + '：乐器下拉没有 ' + k); continue; }
          await pg.selectOption('#nf-inst', k); await W(80);
          const mel0 = await pg.evaluate(() => NWP.state && NWP.state.mel);
          if (mode === 'acc') {
            vis.push(await pg.isVisible('#nf-more')); await pg.click('#nf-more'); await W(100);
            const sv = '#nf-moreb [data-act="var"][data-k="tacc"][data-v="with"]'; vis.push(await pg.isVisible(sv)); await pg.click(sv); await W(80);
            if (await pg.isVisible('#nf-moreb')) { await pg.click('#nf-more'); await W(60); }
          } else if (!melFix) { const sm = '#nf-pvmel [data-act="mel"][data-v="' + mode + '"]'; vis.push(await pg.isVisible(sm)); await pg.click(sm); await W(80); }
          const pk = await pg.evaluate(() => (document.getElementById('nf-kind') || {}).textContent || '');
          vis.push(await pg.isVisible('#nw-create'));
          await pg.click('#nw-create'); await W(250);
          const r = await pg.evaluate(() => {
            const s = migrate(JSON.parse(JSON.stringify(song))); __fill(s);
            const x = exportMusicXML(JSON.parse(JSON.stringify(s))), m = exportMIDI(JSON.parse(JSON.stringify(s)));
            try { FLOW.tree.sync(); } catch (_) {}
            const ic = document.querySelector('.flw-trow .flw-tic svg.pqi');
            const out = Object.assign(__info(song), { json: JSON.stringify(song), mid: __b64(m.bytes || m), mxp: (x.match(/<midi-program>(\d+)<\/midi-program>/g) || []).map(t => +t.replace(/\D/g, '')), icon: ic ? ic.getAttribute('data-pq') : null });
            if (docs.length > 3) closeDocAt(curDocI);
            return out;
          });
          const d = JSON.parse(r.json), np = K.pzOf(d), progs = midiProgs(Buffer.from(r.mid, 'base64'));
          const wk = mode === 'acc' ? 'SG' : mode, wname = mode === 'acc' ? nm + '＋钢琴伴奏谱（五线谱）' : nm + '谱（' + (mode === 'J' ? '简谱' : '五线谱') + '）';
          const wpz = mode === 'J' ? 'jianpu.qiyue' : 'wuxian.qiyue', walso = mode === 'acc' ? ['gangqin.banzou'] : [];
          const ch0 = (progs.find(p => p.ch === 0) || {}).prog, other = progs.filter(p => p.ch !== 0 && p.ch !== 9).map(p => p.prog);
          const why = [];
          if (!vis.every(Boolean)) why.push('不可见 ' + J(vis));
          if (mel0 !== melWant) why.push('默认旋律用 ' + mel0 + '（期望 ' + melWant + (melFix ? '，形态 ' + pk0.pz + '.' + pk0.form : '') + '）');
          if (r.k !== wk) why.push('谱行 ' + r.k);
          if (pk !== wname || r.name !== wname || K.nameOf(d) !== wname) why.push('谱名 面板 ' + pk + ' / 建成 ' + r.name + ' / node ' + K.nameOf(d));
          if (r.pz !== wpz || J(r.also) !== J(walso) || r.inst !== k || (np.pz + '.' + np.sub) !== wpz || J((np.also || []).slice().sort()) !== J(walso) || np.inst !== k) why.push('pzOf ' + r.pz + '+' + r.also + '〔' + r.inst + '〕 node ' + np.pz + '.' + np.sub + '〔' + np.inst + '〕');
          if (r.intent !== 'inst' || r.ik !== k) why.push('intent ' + r.intent + ' instKey ' + r.ik);
          if (ch0 !== gm || other.some(p => p !== 0) || (mode === 'acc' && !other.length)) why.push('MIDI program ' + J(progs));
          if (r.mxp[0] !== gm + 1 || r.mxp.slice(1).some(p => p !== 1) || (mode === 'acc' && r.mxp.length < 2)) why.push('MusicXML program ' + J(r.mxp));
          if (r.icon !== NEW6_PQ[k]) why.push('左栏图标 ' + r.icon);
          rows.push(tag + ' → ' + r.name); if (why.length) bad.push(tag + '：' + why.join('；'));
        }
      }
      await pg._ctx.close();
      T('I1', p2a && rows.length === 18 && !bad.length, '① 新外壳真实点击「器乐」× 6 种新乐器 × 旋律用简谱 / 五线谱 / 加钢琴伴奏（18 份）：默认旋律用＝乐器族（P2b 按谱种：＝形态定的）；面板「将建成」＝建成＝node 谱名；pzOf 主二级 / 也在 / 乐器编辑器＝node；intent＝inst；'
        + 'MIDI 通道 0 / MusicXML 首 part＝该乐器 GM program（钢琴行仍钢琴）；左栏第一行图标＝同族已有图标', (p2a ? '' : 'nwP2A() 为假！ ') + J({ n: rows.length, bad: bad.slice(0, 6) }));
    });

    /* ================= I2 ② 合唱＋钢琴 / 器乐＋钢琴 → MusicXML → 导入 ================= */
    if (want('I2')) await guard('I2', async () => {
      const pg = await openEd(b, '', { tag: 'I2' });
      const QS = ['new=vocal&parts=4&tacc=with&mel=J', 'new=vocal&parts=4&tacc=with&mel=S', 'new=vocal&parts=3&tacc=with&mel=J', 'new=vocal&parts=2&tacc=with&mel=S',
        'new=inst&instKey=violin&tacc=with', 'new=inst&instKey=cello&tacc=with', 'new=inst&instKey=erhu&tacc=with', 'new=inst&instKey=recorder&tacc=with', 'new=inst&instKey=clarinet&tacc=with',
        'new=inst&instKey=sax&mel=J', 'new=sight&mel=J'];
      const made = await CREATE(pg, QS);
      const r = await pg.evaluate(made => made.map((m, i) => {
        const s = JSON.parse(m.json), x = exportMusicXML(JSON.parse(JSON.stringify(s))), im = importMusicXML(x), t = im && im.song ? migrate(im.song) : null;
        return { q: m.q, panel: m.panel, a: __info(s), b: t ? __info(t) : null, pyq: (x.match(/name="pyq-intent">([^<]*)</) || [])[1] || '', ik: (x.match(/name="pyq-instkey">([^<]*)</) || [])[1] || '', err: im && im.error, xml: i === 0 ? x : '' };
      }), made).catch(e => ({ err: String(e.message || e) }));
      if (r.err) throw new Error(r.err);
      const bad = [];
      r.forEach(x => {
        const a = x.a, c = x.b || {};
        if (x.err || !x.b) { bad.push(x.q + ' 导入失败 ' + x.err); return; }
        if (x.pyq !== a.intent) bad.push(x.q + ' pyq-intent ' + x.pyq + ' ≠ ' + a.intent);
        if (x.panel !== a.name) bad.push(x.q + ' 面板 ' + x.panel + ' ≠ 建成 ' + a.name);
        ['k', 'name', 'pz', 'inst', 'intent'].forEach(f => { if (c[f] !== a[f]) bad.push(x.q + ' ' + f + ' ' + a[f] + ' → ' + c[f]); });
        if (J(c.also) !== J(a.also)) bad.push(x.q + ' also ' + a.also + ' → ' + c.also);
      });
      /* 真实点击导入（按原文件）：四部简谱合唱＋钢琴 */
      const x0 = r.find(x => x.xml).xml;
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} });
      await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
      await pg.setInputFiles('#nw-anyfile', { name: '合唱钢琴.musicxml', mimeType: 'application/xml', buffer: Buffer.from(x0) });
      await pg.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 8000 });
      await pg.click('#nf-tg-orig'); await W(300);
      await pg.click('#nf-impgo'); await pg.waitForFunction(() => !document.querySelector('.nf-modal'), null, { timeout: 8000 }); await W(250);
      const ui = await pg.evaluate(() => __info(song));
      const a0 = r.find(x => x.xml).a;
      const uiOk = ui.name === a0.name && ui.k === a0.k && ui.pz === a0.pz && J(ui.also) === J(a0.also) && ui.intent === a0.intent;
      await pg._ctx.close();
      T('I2', r.length === QS.length && !bad.length && uiOk, '② 合唱＋钢琴（简谱 / 五线谱 2–4 部）、器乐＋钢琴（小提琴 / 大提琴 / 二胡 / 竖笛 / 单簧管）与萨克斯简谱、简谱视唱建好填音后导出 MusicXML → 导入：'
        + 'pyq-intent 写出、intent / 谱名 / 谱行 / pzOf 主二级 · 也在 · 乐器不变；四部简谱合唱＋钢琴走真实「从已有音乐 → 选择文件 → 按原文件」同样不变',
        J({ n: r.length, bad: bad.slice(0, 8), ui, want: a0 && { name: a0.name, k: a0.k, pz: a0.pz, intent: a0.intent } }));
      NOTE('I2 往返样例：' + r.slice(0, 11).map(x => x.a.name + (x.ik ? '〔' + x.ik + '〕' : '')).join(' · '));
    });

    /* ================= I3 ③ 新组合上换谱类 ================= */
    if (want('I3')) await guard('I3', async () => {
      const pg = await openEd(b, '', { tag: 'I3' });
      const SRC = ['new=vocal&parts=4&tacc=with&mel=J', 'new=vocal&parts=4&tacc=with&mel=S', 'new=inst&instKey=violin&tacc=with', 'new=solo&inst=uku',
        'new=inst&instKey=sax&mel=J', 'new=sight&mel=J', 'new=inst&instKey=cello', 'new=inst&instKey=recorder'];
      const made = await CREATE(pg, SRC);
      const r = await pg.evaluate(made => {
        const out = [], keep = song, own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        try {
          made.forEach(m => [0, 1].forEach(full => {
            const b0 = JSON.parse(m.json);
            if (!full) { b0.measures.forEach(me => { (me.voxes || []).forEach(v => v.forEach(c => { c.deg = 0; c.lyrics = []; })); (me.tabs || []).forEach(t => t.forEach(c => { c.notes = []; })); }); }
            NWB.VALID.forEach(to => {
              const p = lbPlan(b0, to); if (p.mode === 'no' || p.mode === 'same') { out.push([m.q, to, full, p.mode]); return; }
              const s = JSON.parse(JSON.stringify(b0)), src = JSON.stringify(s); let res; song = s;
              if (p.mode === 'copy') res = lbCopy(s, to); else if (p.mode === 'rebuild') res = lbRebuild(s, to); else { lbApplyDirect(s, NWB.stackOf(s), to); res = s; }
              out.push([m.q, to, full, p.mode, b0.intent, own(res, 'intent') ? res.intent : '∅', NWB.stackOf(res), p.mode === 'copy' ? JSON.stringify(s) === src : true]);
            });
          }));
        } finally { song = keep; }
        return out;
      }, made);
      const bad = [], modes = {};
      /* 源谱都得带用途（建谱写 intent，B 组 realCreate）——否则「没写不写」整张表空转也会绿 */
      made.forEach(m => { const it = JSON.parse(m.json).intent; if (INTENTS.indexOf(it) < 0) bad.push(m.q.replace('new=', '') + ' 建成没有 intent（' + it + '）'); });
      r.forEach(x => { if (x.length < 5) return; const [q, to, full, mode, it, got, k2, srcSame] = x; modes[mode] = (modes[mode] || 0) + 1; const w = lbExp(it, to);
        if (got !== w || k2 !== to || !srcSame) bad.push(q.replace('new=', '') + (full ? '（有音）' : '（空）') + '→' + to + ' ' + mode + '：' + got + ' ≠ ' + w + (k2 !== to ? ' 谱行 ' + k2 : '') + (srcSame ? '' : ' 原谱被改')); });
      T('I3a', made.length === SRC.length && !bad.length && (modes.direct || 0) > 10 && (modes.rebuild || 0) > 10 && (modes.copy || 0) > 5,
        '③ 8 种新组合谱（合唱＋钢琴 简谱 / 五线谱、小提琴＋钢琴、尤克里里指弹、萨克斯简谱、简谱视唱、大提琴、竖笛）× 空 / 有音 × 14 个目标谱行：intent 按 §3.3 四条规则改写（直接换 / 重建 / 另建一份），另建一份原谱不动',
        J({ modes, n: bad.length, bad: bad.slice(0, 8) }));
      /* 真实换谱类 lbSwitch + 一步撤销 */
      const live = await pg.evaluate(async made => {
        const w = ms => new Promise(r => setTimeout(r, ms)), o = {};
        const open = async q => { const m = made.find(x => x.q === q), s = JSON.parse(m.json); await new Promise(r => addDoc(s, () => setTimeout(r, 200))); };
        const rec = () => [song.intent || '∅', NWB.stackOf(song), song.instKey || ''];
        await open('new=inst&instKey=sax&mel=J'); o.sax0 = rec(); o.saxM = lbSwitch('JG', true); await w(200); o.sax1 = rec(); undo(); await w(100); o.sax2 = rec();
        { const m = made.find(x => x.q === 'new=solo&inst=uku'), s = JSON.parse(m.json); s.measures.forEach(me => (me.tabs || []).forEach(t => t.forEach(c => { c.notes = []; }))); (s.measures || []).forEach(me => (me.voxes || []).forEach(v => v.forEach(c => { c.deg = 0; })));
          await new Promise(r => addDoc(s, () => setTimeout(r, 200))); }
        o.uku0 = rec(); o.ukuM = lbSwitch('JT', true); await w(200); o.uku1 = rec(); undo(); await w(100); o.uku2 = rec();
        await open('new=sight&mel=J'); o.si0 = rec(); o.siM = lbSwitch('S', true); await w(200); o.si1 = rec(); undo(); await w(100); o.si2 = rec();
        await open('new=vocal&parts=4&tacc=with&mel=J'); const d0 = curDocI; o.ch0 = rec(); o.chM = lbSwitch('CJ', true); await w(600); o.ch1 = rec(); o.chOrig = [docs[d0].song.intent || '∅', NWB.stackOf(docs[d0].song), ''];
        try { closeModal(); } catch (_) {}
        return o;
      }, made);
      const ok = live.saxM === 'direct' && live.sax0.join() === 'inst,J,sax' && live.sax1.join() === 'pacc,JG,sax' && live.sax2.join() === live.sax0.join()
        && live.ukuM === 'rebuild' && live.uku0.join() === 'solo,ST,' && live.uku1[0] === 'gtr' && live.uku1[1] === 'JT' && live.uku2.join() === live.uku0.join()
        && live.siM === 'direct' && live.si0.join() === 'sight,J,' && live.si1.join() === 'sight,S,' && live.si2.join() === live.si0.join()
        && live.chM === 'copy' && live.ch0.join() === 'vocal,J,' && live.ch1[0] === 'chord' && live.ch1[1] === 'CJ' && live.chOrig.join() === live.ch0.join();
      await pg._ctx.close();
      T('I3b', ok, '③ 真实换谱类：萨克斯简谱→钢琴伴奏歌谱（直接换，inst→pacc，乐器身份留着）、空的尤克里里指弹→吉他弹唱（重建，solo→gtr）、简谱视唱→五线谱（直接换，sight 不改）一步撤销连 intent 一起退；'
        + '四部简谱合唱＋钢琴→功能谱（另建一份：新谱 chord，原谱 vocal 不动）', J(live));
    });

    /* ================= I4 ④ 示例做同款 → 云同步载荷 → 真服务端发布 → 卡片 / 专题；I5 ⑥ 官方谱口径 ================= */
    if (want('I4') || want('I5')) await guard('I4', async () => {
      try { fs.unlinkSync(DB); } catch (_) {}
      srv = await startServer();
      /* ---- I5 ⑥：新库只有官方种子 ---- */
      const LIBN = SEED.length, sightIds = SEED.filter(x => x.data && x.data.intent === 'sight').map(x => x.id).sort();
      const L0 = await hreq('GET', '/api/pub/scores'), list0 = (L0.j && L0.j.scores) || [], cats0 = (await hreq('GET', '/api/pub/cats')).j || {};
      const yk0 = (await allOf('zt=yikao')).map(c => c.id).sort();
      const cardBad = [];
      SEED.forEach(x => { const c = list0.find(y => y.id === x.id); if (!c) { cardBad.push(x.id + ' 缺'); return; } const pk = K.pubKindOf(x.data);
        if (c.pz !== pk.pz || c.sub !== pk.sub || J(c.also) !== J(pk.also) || (c.inst || '') !== (pk.inst || '') || c.typeLabel !== pk.typeLabel) cardBad.push(x.id + ' ' + c.pz + '.' + c.sub + ' ≠ ' + pk.pz + '.' + pk.sub); });
      /* 新库另有早年的两首官方示例（db.js seedPublished：小星星 / 欢乐颂，id 随机）——与新上架的同名示例并存，需要时由管理员下架（规格 §10「老种子并存」），这里只点名不计入种子 */
      const seedIds = new Set(SEED.map(x => x.id)), extra = list0.filter(c => !seedIds.has(c.id)).map(c => c.title).sort();
      const pzN = Object.fromEntries(Object.entries(cats0.pz || {}).map(([k, v]) => [k, v.n]));
      const duzou = (((cats0.pz || {}).gangqin || {}).sub || {}).duzou;
      if (want('I5')) T('I5', LIBN >= 29 && list0.length === LIBN + extra.length && extra.every(t => t === '小星星' || t === '欢乐颂') && extra.length <= 2 && cats0.total === list0.length && Object.keys(pzN).length === 7 && Object.values(pzN).every(n => n >= 1) && duzou >= 3 && J(yk0) === J(sightIds) && sightIds.length >= 3 && !cardBad.length,
        '⑥ 官方谱 ' + LIBN + ' 份（读 seed-library.json，不写死）：新库启动即全部上架（另有早年两首官方示例 ' + extra.join(' / ') + ' 并存）、/api/pub/cats 总数＝列表份数、7 个一级都 ≥1、钢琴谱 › 独奏 ' + duzou + '（≥3）、「艺考视唱」专题＝种子里 intent＝sight 的 ' + sightIds.length + ' 份（逐 id）、每份卡片谱种 / 谱名＝node pubKindOf',
        J({ LIBN, list: list0.length, extra, total: cats0.total, pzN, duzou, yk0, sightIds, cardBad: cardBad.slice(0, 5) }));
      NOTE('I5 官方谱首日计数（/api/pub/cats）：' + Object.entries(pzN).map(([k, n]) => k + ' ' + n).join(' · ') + '；钢琴谱 › 独奏 ' + duzou + '；艺考视唱 ' + yk0.length);
      if (!want('I4')) return;
      /* ---- I4 ④：示例做同款（真实点击）→ 填音 → 云同步载荷 → 发布 ---- */
      const ad = await adminLogin('13700070701');
      const pg = await openEd(b, '', { tag: 'I4', w: 1280, h: 800 });
      const pick = await pg.evaluate(() => { const f = fn => EXAMPLES.findIndex((p, i) => fn(migrate(p.make()), p, i));
        return { sightC: f(s => s.intent === 'sight' && (s.voxNotations || [])[0] === 'staff'), sightJ: f(s => s.intent === 'sight' && !(s.voxNotations || [])[0]), kids: f(s => s.intent === 'kids') }; });
      const pay = {};
      for (const [tag, i] of Object.entries(pick)) {
        if (!(i >= 0)) { pay[tag] = { err: '示例里没有' }; continue; }
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} });
        await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
        const exb = await pg.isVisible('#nf-isrc-ex'); await pg.click('#nf-isrc-ex'); await pg.waitForSelector('#nf-exl'); await W(150);
        await pg.locator('#nf-ex-' + i).scrollIntoViewIfNeeded(); const vis = exb && await pg.isVisible('#nf-ex-' + i);
        await pg.click('#nf-ex-' + i); await pg.click('#nf-exgo'); await W(300);
        pay[tag] = await pg.evaluate(async ([tag, i]) => {
          const ex = migrate(EXAMPLES[i].make()), made = { intent: song.intent || '', empty: NWB.isEmptySong(song) };
          const s = JSON.parse(JSON.stringify(song)); s.id = 'v700i' + tag.toLowerCase().padEnd(7, '0'); s.title = '做同款 ' + tag; s.measures[0].voxes[0][0].deg = 1;
          const lib = libLoad().filter(x => x.id !== s.id); lib.unshift({ id: s.id, title: s.title, data: s, mtime: Math.floor(Date.now() / 1000), updatedAt: '' }); libSave(lib);
          const f0 = window.fetch, cap = []; window.PYQ_CLOUD = true; try { ACCT = ACCT || { id: 'u1', phone: '1' }; } catch (_) {}
          window.fetch = async (u, init) => { cap.push({ u: String(u), m: init && init.method, b: init && init.body }); return new Response('{"saved":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
          try { await scoreCloudPush(s.id); } finally { window.fetch = f0; window.PYQ_CLOUD = false; }
          const put = cap.find(x => x.u.indexOf('/api/scores/' + s.id) >= 0 && x.m === 'PUT');
          return { id: s.id, exIntent: ex.intent || '', made, data: put ? JSON.parse(put.b).data : null };
        }, [tag, i]);
        pay[tag].vis = vis;
      }
      await pg._ctx.close();
      const pubs = {};
      for (const [tag, p] of Object.entries(pay)) if (ad.ok && p.data) pubs[tag] = await publish(ad.ck, p.id, p.data);
      const list = (await hreq('GET', '/api/pub/scores')).j, cards = (list && list.scores) || [];
      const yk = (await allOf('zt=yikao')).map(c => c.id), sf = (await allOf('zt=shifan')).map(c => c.id);
      const bad = [];
      for (const [tag, p] of Object.entries(pay)) {
        if (p.err || !p.data) { bad.push(tag + ' ' + (p.err || '没抓到云同步载荷')); continue; }
        if (!p.vis) bad.push(tag + ' 示例格不可见');
        const wantI = tag === 'kids' ? 'kids' : 'sight';
        if (p.exIntent !== wantI || p.made.intent !== wantI || !p.made.empty || p.data.intent !== wantI) bad.push(tag + ' 做同款 intent ' + J({ ex: p.exIntent, made: p.made, payload: p.data.intent }));
        const pb = pubs[tag]; if (!pb || !pb.pub || pb.pub.status !== 200) { bad.push(tag + ' 发布 ' + (pb && (pb.pub || pb.put) || {}).status); continue; }
        const c = cards.find(x => x.id === p.id) || {}, pk = K.pubKindOf(p.data);
        if (c.intent !== wantI || c.pz !== pk.pz || c.sub !== pk.sub || J(c.also) !== J(pk.also)) bad.push(tag + ' 卡片 ' + J({ intent: c.intent, pz: c.pz, sub: c.sub, also: c.also, want: pk.pz + '.' + pk.sub }));
        /* v70.3 有意迁移（基石方案 §2.3 D9）：专题显示名改「视唱专题 / 儿歌专题」（key yikao / shifan 与 ?zt= 口径不变） */
        if (wantI === 'sight' && !yk.includes(p.id)) bad.push(tag + ' 不在视唱专题（?zt=yikao）');
        if (wantI === 'kids' && !sf.includes(p.id)) bad.push(tag + ' 不在儿歌专题（?zt=shifan）');
      }
      T('I4', ad.ok && Object.keys(pay).length === 3 && !bad.length && sightIds.every(id => yk.includes(id)),
        '④ 新示例做同款（真实点击：两只老虎（儿歌弹唱）、视唱谱例 C 大调（五线谱）、G 大调（简谱））→ intent 保留（新谱内容留空）→ 填音 → 云同步载荷带 intent → 真服务端发布 → 卡片 intent / 谱种＝node pubKindOf；'
        + '视唱两份进「视唱专题」?zt=yikao（官方 ' + sightIds.length + ' 份仍在）、儿歌弹唱进「儿歌专题」?zt=shifan', J({ ad: ad.ok, cli: ad.ok ? '' : ad.cli.slice(0, 120), pick, bad: bad.slice(0, 6) }));
    });

    /* ================= I6 ⑦ 种子 × 最终导入导出器 ================= */
    if (want('I6')) await guard('I6', async () => {
      const pg = await openEd(b, '', { tag: 'I6' });
      const r = await pg.evaluate(seed => {
        const out = [];
        seed.forEach(x => {
          const s = migrate(JSON.parse(JSON.stringify(x.data))), it = PQ_KIND.intentOf(s) || '', xml = exportMusicXML(JSON.parse(JSON.stringify(s))), im = importMusicXML(xml), t = im && im.song ? migrate(im.song) : null;
          const pa = PQ_KIND.pzOf(s), pb = t ? PQ_KIND.pzOf(t) : {};
          out.push({ id: x.id, it, pyq: (xml.match(/name="pyq-intent">([^<]*)</) || [])[1] || '', ik: (xml.match(/name="pyq-instkey">([^<]*)</) || [])[1] || '', back: t ? (t.intent || '') : 'ERR',
            pz: pa.pz + '.' + pa.sub, pz2: t ? pb.pz + '.' + pb.sub : '', nm: docTypeLabel(s), nm2: t ? docTypeLabel(t) : '' });
        });
        const ex = EXAMPLES.filter(p => p.seedId).map(p => ({ seedId: p.seedId, intent: migrate(p.make()).intent || '' }));
        return { out, ex };
      }, SEED);
      const bad = [], nameDiff = [];
      r.out.forEach(x => {
        if (x.it) { if (x.pyq !== x.it || x.back !== x.it) bad.push(x.id + ' intent ' + x.it + ' → 文件 ' + x.pyq + ' → 读回 ' + x.back); }
        else if (x.pyq || x.ik || x.back) bad.push(x.id + ' 无 intent 却写了 ' + (x.pyq || x.ik || x.back));
        if (x.it && x.pz2 !== x.pz) bad.push(x.id + ' 归属 ' + x.pz + ' → ' + x.pz2);
        if (x.nm2 !== x.nm) nameDiff.push(x.id + ' ' + x.nm + '→' + x.nm2);
      });
      const exBad = r.ex.filter(e => { const sd = SEED.find(x => x.id === e.seedId); return !sd || ((sd.data && sd.data.intent) || '') !== e.intent; }).map(e => e.seedId);
      await pg._ctx.close();
      T('I6', r.out.length === SEED.length && r.out.filter(x => x.it).length >= 4 && !bad.length && r.ex.length >= 15 && !exBad.length,
        '⑦ 种子 ' + SEED.length + ' 份在最终编辑器上导出 MusicXML 再导入：有 intent 的（' + r.out.filter(x => x.it).length + ' 份）写 pyq-intent、读回同值、归属不变；没有的不写 pyq-intent / pyq-instkey；示例 seedId 对应种子 intent＝EXAMPLES make()（' + r.ex.length + ' 份）',
        J({ bad: bad.slice(0, 6), exBad }));
      if (nameDiff.length) NOTE('I6 只打印（存量：v69.9 起 MusicXML 不带 instKey / 六线谱上方五线谱，老谱往返谱名会变）：' + nameDiff.join(' · '));
    });

    /* ================= I7 验收⑥ 没填词的歌谱类往返留 1 行词位 ================= */
    if (want('I7')) await guard('I7', async () => {
      const pg = await openEd(b, '', { tag: 'I7' });
      const QS = ['new=vocal&parts=4&tacc=with&mel=J', 'new=vocal&parts=2&tacc=with&mel=S', 'new=vocal&parts=3&mel=J', 'new=vocal&parts=1&mel=J', 'new=gtr', 'new=kids', 'new=pacc', 'new=pacc&mel=S', 'new=teach',
        'new=inst&instKey=violin&tacc=with', 'new=sight&mel=J', 'new=solo&inst=uku', 'new=chord&ftype=CJ'];
      const made = await CREATE(pg, QS);
      const r = await pg.evaluate(made => made.map(m => {
        const s = JSON.parse(m.json); s.measures.forEach(me => (me.voxes || []).forEach(cols => (cols || []).forEach(c => { c.lyrics = []; })));   /* 填了音、没填词 */
        const x = exportMusicXML(JSON.parse(JSON.stringify(s))), x0 = x.replace(/<miscellaneous-field name="pyq-(intent|instkey)">[^<]*<\/miscellaneous-field>/g, '');
        const im = importMusicXML(x), im0 = importMusicXML(x0), t = im && im.song ? migrate(im.song) : null, t0 = im0 && im0.song ? migrate(im0.song) : null;
        const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.intent; delete c.instKey; delete c.lyricLines; return JSON.stringify(c); };
        return { q: m.q, a: __info(s), lyrA: s.lyricLines | 0, hasLyr: /<lyric\b/.test(x), pyq: (x.match(/name="pyq-intent">([^<]*)</) || [])[1] || '',
          b: t ? __info(t) : null, lyrB: t ? t.lyricLines : null, lyr0: t0 ? t0.lyricLines : null, same: !!(t && t0) && strip(im.song) === strip(im0.song) };
      }), made).catch(e => ({ err: String(e.message || e) }));
      if (r.err) throw new Error(r.err);
      const LYR = ['vocal', 'kids', 'pacc', 'gtr', 'teach'], bad = [];
      r.forEach(x => {
        if (!x.b) { bad.push(x.q + ' 导入失败'); return; }
        if (x.hasLyr) bad.push(x.q + ' 导出不该有 <lyric>');
        const keep = LYR.includes(x.pyq);
        if (keep) {
          if (x.lyrB !== 1) bad.push(x.q + '（' + x.pyq + '）读回词位 ' + x.lyrB + ' ≠ 1');
          ['k', 'name', 'pz', 'intent'].forEach(f => { if (x.b[f] !== x.a[f]) bad.push(x.q + ' ' + f + ' ' + x.a[f] + ' → ' + x.b[f]); });
        } else if (x.lyrB !== 0) bad.push(x.q + '（' + x.pyq + '）无歌词类用途却留了词位 ' + x.lyrB);
        if (x.lyr0 !== 0) bad.push(x.q + ' 去掉 pyq-intent 的同一文件（老文件口径）词位 ' + x.lyr0 + ' ≠ 0');
        if (!x.same) bad.push(x.q + ' 带 / 不带 pyq-intent 两份导入除 intent / instKey / 词位外不一致');
      });
      const nKeep = r.filter(x => LYR.includes(x.pyq)).length;
      await pg._ctx.close();
      T('I7', r.length === QS.length && nKeep >= 9 && !bad.length, '验收⑥ 没填词的歌谱类（合唱＋钢琴 / 合唱 / 独唱 / 吉他弹唱 / 儿歌 / 钢琴伴奏歌谱 / 对照谱，' + nKeep + ' 份）导出 MusicXML 再导入：留 1 行词位，谱名 / 谱行 / 归属 / intent 不变（此前合唱＋钢琴退成重奏谱）；'
        + '器乐＋钢琴 / 视唱 / 指弹 / 功能谱照旧 0 行；同一文件去掉 pyq-intent（老文件口径）仍 0 行、其余逐字段相同', J({ bad: bad.slice(0, 8), rows: r.map(x => x.q + ':' + x.pyq + ':' + x.lyrA + '→' + x.lyrB + '/' + x.lyr0 + ':' + (x.b && x.b.name)) }));
    });

    T('E', !pageErrs.length, '页面脚本错误 0', pageErrs.slice(0, 5).join(' | '));
  } finally {
    try { if (srv) srv.p.kill(); } catch (_) {}
    await b.close();
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + ED + '）');
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
