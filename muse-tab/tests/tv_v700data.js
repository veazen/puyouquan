/* v70.0 A 组（规格 docs/spec-2026-11-v700.md §3–§5、§8.2）：数据 · 谱名 · song.intent 存取 · 换谱类 · 乐器表
   D1 乐器表：NW_INSTS / PQ_KIND.INST / INST_FAM / 官网 site/pyq.js 抄本 / 图标表 INST_PQ · INST_ICON 四处 28 键一致，旧 22 键名义与基线 6d8d6f8 逐项相同；
      6 种新乐器（竖笛 / 口风琴 / 陶笛 / 箫 / 大提琴 / 单簧管）各建 J / S（经 NWB.build）：谱名、pzOf、左轨图标（真实音轨区 DOM）、MIDI 与 MusicXML 的 GM program（§4.2；
      混音音色改过＝回落原映射）；旧谱（基线 16 预设＋曲库 lib-os-* 10 首）MIDI / MusicXML 与基线编辑器逐字节相同、不出现 pyq-intent
   D2 按音轨名认乐器 IK_ALIAS（§4.3）：正例 / 反例（Violin / Vln. 仍小提琴、Flute / Fl. 仍长笛、Flauto dolce → 竖笛、笛箫不归箫、English Horn / Voice / Bass / Piano·右手 不认）；
      编辑器内联与 node 端逐例同；真实导入 Violoncello 独奏：归 五线谱 › 器乐（大提琴），谱名不变、不回写 instKey
   D3 谱名（§5.1–5.3）：拍板 11「（含钢琴伴奏）」、拍板 22 后半「X＋钢琴伴奏谱（简谱 / 五线谱）」、第 11 行 vocal；名实一致 / 互切镜像对新样例成立；
      kindName 网格编辑器内联＝node；谱库图标 ccKindIc 认新谱名；老谱（基线预设 / 曲库 / tv_taxonomy 金表）谱名与 pzOf 对基线只许 §5 / §4.3 列明的差异
   D4 intent 往返：MusicXML 写 / 读（11 个合法值；非法值不写不读；老谱无 pyq-intent）、migrate / normalizeSongFields / sanitizeUntrusted 逐字节、本机保存（当前谱 / 窗口存档 /
      我的曲谱 / 刷新后读回）、存为文件 .mtab → 真实打开、云同步载荷（scoreCloudPush）、真服务端保存 → 发布 → 谱库卡片 intent → 观看页数据 sanitizeUntrusted；服务端拒收 <b> / 对象
   D5 换谱类（§3.3）：14 × 14 谱行 ×（无 / 11 个用途 / 认不出的值）× 空谱与有内容 表驱动（直接换 / 重建 / 另建一份按四条规则）；真实换谱类一步撤销连 intent 一起退、
      另建一份原谱不动；旋律用切换 / setVoxNotation / 加删音轨不改 intent；菜单谱名＝换完谱名（直接换成 JG / SG 带乐器身份、「当前」项随谱面）
   D6 从已有音乐（§3.4）6 种做法：acc→pacc、SJ→teach、JT→gtr、CJ→chord；orig / J 不写（保留文件读进来的 pyq-intent）；真实点击导入；MIDI 导入不写
   D7 搜索词（§4.4）：pzq 解析 6 种新乐器词、箫 / 陶笛 / 竖笛 / 单簧管的调只排序；真服务端 ?q= 按乐器筛到
   基线（CI 没有 6d8d6f8 的历史，零差异对拍读文件，同 §1 第 8 条口径）：fixtures/v700data_base.json 由 `node tv_v700data.js --write-base` 用
   git show 6d8d6f8:muse-tab/index.html 与 6d8d6f8:api/kindname.js 生成（基线 16 预设原始 JSON、曲库 10 首数据摘要、基线导出摘要、基线谱名 / pzOf / 音轨名推乐器）。
   修前红：MUSETAB_URL=file://<6d8d6f8 编辑器副本> MUSETAB_API=<6d8d6f8 的 api/server.js> 复跑，D1–D7 各段至少一条红。
   env：MUSETAB_URL 编辑器、MUSETAB_API 服务端 server.js（默认仓库 api/server.js）、CHROMIUM_PATH。 */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'), vm = require('vm');
const { spawn, spawnSync, execFileSync } = require('child_process');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const WRITE = process.argv.includes('--write-base');
const BASE_COMMIT = '6d8d6f84ae84c0a64818b7d0327cb7e73a45770e';
const BASE_F = path.join(__dirname, 'fixtures/v700data_base.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pyq_v700d_'));
const gitShow = p => execFileSync('git', ['show', BASE_COMMIT + ':' + p], { cwd: ROOT, maxBuffer: 64 << 20 }).toString('utf8');
let ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
let API_DIR = path.dirname(process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js'));
if (WRITE) {   /* 基线副本：编辑器单文件 ＋ 统一谱名表（连同它 require 的 scoredata） */
  fs.mkdirSync(path.join(TMP, 'api')); ED = path.join(TMP, 'base.html'); fs.writeFileSync(ED, gitShow('muse-tab/index.html'));
  for (const f of ['kindname.js', 'scoredata.js']) fs.writeFileSync(path.join(TMP, 'api', f), gitShow('api/' + f));
}
const K = require(path.join(WRITE ? path.join(TMP, 'api') : API_DIR, 'kindname.js'));
const PZQ = (() => { try { return require(path.join(API_DIR, 'pzq.js')); } catch (_) { return null; } })();
const LIB = JSON.parse(fs.readFileSync(path.join(API_DIR, 'seed-library.json'), 'utf8')).filter(x => /^lib-os-/.test(String(x.id || '')));
const BASE = WRITE ? null : JSON.parse(fs.readFileSync(BASE_F, 'utf8'));

let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d && !ok ? ': ' + d : '')); };
const errs = [];
const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name + '（运行异常）', String(e && e.stack || e).slice(0, 400)); } };
const J = x => JSON.parse(JSON.stringify(x));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const safe = (fn, dflt) => { try { return fn(); } catch (_) { return dflt; } };
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ---------- 语料：tv_taxonomy 金表（GOLD / EDGE / BAD，原样取那一段源码求值，不另抄一份） ---------- */
const TAXO = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'tv_taxonomy.js'), 'utf8');
  const a = src.indexOf('/* ---------- 金表样例'), b = src.indexOf('const placesOf');
  return vm.runInNewContext(src.slice(a, b) + '\n;({ GOLD, EDGE, BAD, V, BR, BC, ACC, ACS, ACN, C })', { J, JSON, Object, Array });
})();
const { V, BR, BC, ACC, ACS, ACN } = TAXO;
const NEW6 = { recorder: ['竖笛', 'jianpu', null, 74], melodica: ['口风琴', 'jianpu', null, 22], ocarina: ['陶笛', 'jianpu', null, 79], xiao: ['箫', 'jianpu', null, 77],
  cello: ['大提琴', 'staff', 'bass', 42], clarinet: ['单簧管', 'staff', 'staff', 71] };
const NEW6_PQ = { recorder: 'inst-flute', melodica: 'inst-harmonica', ocarina: 'inst-hulusi', xiao: 'inst-dizi', cello: 'inst-violin', clarinet: 'inst-sax' };
const NEW6_IC = { recorder: 'flute', melodica: 'harmonica', ocarina: 'hulusi', xiao: 'dizi', cello: 'violin', clarinet: 'sax' };
const KEYS28 = ['guitar', 'uku', 'bass', 'piano', 'epiano', 'synth', 'accordion', 'violin', 'flute', 'sax', 'trumpet', 'horn', 'trombone', 'cello', 'clarinet',
  'erhu', 'dizi', 'hulusi', 'suona', 'guzheng', 'pipa', 'yangqin', 'harmonica', 'recorder', 'melodica', 'ocarina', 'xiao', 'other'];
const INTENTS = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
/* 老导入谱：没有 instKey、音轨名是 6 种新乐器（§4.3 有意的派生变化：pzOf 改落器乐，谱名不变） */
const OLDX = [
  ['老导入 Violoncello 独奏（无 instKey）', V(['Violoncello'], ['bass'])], ['老导入 Clarinet in Bb', V(['Clarinet in Bb'], ['staff'])], ['老导入 Recorder', V(['Recorder'], ['staff'])],
  ['老导入 Flauto dolce', V(['Flauto dolce'], ['staff'])], ['老导入 Melodica＋钢琴（无词）', V(['Melodica', 'Piano·右手', 'Piano·左手'], ACS, { voxGroups: [BC(1, 2)] })],
  ['老导入 Ocarina 简谱', V(['Ocarina'], [null])], ['老导入 洞箫', V(['洞箫'], [null])], ['老导入 Vc. 二重奏', V(['Vc. 1', 'Vc. 2'], ['bass', 'bass'])],
  ['老谱 J 二胡简谱直接换成钢琴伴奏歌谱（instKey 留着）', V(['二胡', '右手伴奏', '左手伴奏'], ACC, { voxGroups: [BC(1, 2)], instKey: 'erhu' })],
  ['老谱 SG 无词 instKey violin', V(['小提琴', '右手伴奏', '左手伴奏'], ACS, { voxGroups: [BC(1, 2)], instKey: 'violin' })],
  ['老谱 SG 无词 instKey other', V(['旋律', '右手伴奏', '左手伴奏'], ACS, { voxGroups: [BC(1, 2)], instKey: 'other' })],
].map(([tag, d]) => ({ tag, d: J(d) }));
const placesOf = r => [r.pz + '.' + r.sub].concat(r.also || []);
const pzShow = r => r ? r.row + ' ' + placesOf(r).join('+') + (r.inst ? ' 〔' + r.inst + '〕' : '') : 'null';
const viewOrClean = (KK, d) => { let v = null; try { v = KK.viewOf(d); } catch (_) {} return v || (d && typeof d === 'object' && !Array.isArray(d) ? KK.sanitizeLike(d) : {}); };
const kindRec = (KK, d) => ({ name: safe(() => KK.nameOf(viewOrClean(KK, d)), 'ERR'), pz: safe(() => pzShow(KK.pzOf(d)), 'ERR'), ik: safe(() => KK.ikOf(viewOrClean(KK, d)) || '', 'ERR') });

/* ---------- 不变式（口径同 tv_taxonomy X4） ---------- */
const nI = x => x === 'other' ? '' : (x || '');
function mirrorOk(a, b) {
  const g = x => x === 'erge' ? 'gequ' : x;
  if (a.pz === 'jianpu' || a.pz === 'wuxian') {
    if (b.pz !== (a.pz === 'jianpu' ? 'wuxian' : 'jianpu')) return false;
    if ((a.sub === 'qiyue' && b.sub === 'chongzou') || (a.sub === 'chongzou' && b.sub === 'qiyue')) return nI(a.inst) === nI(b.inst);
    return g(a.sub) === g(b.sub) && (a.sub !== 'qiyue' || nI(a.inst) === nI(b.inst));
  }
  if (b.pz !== a.pz) return false;
  if (a.pz === 'hechang') return b.sub === (a.sub === 'jianpu' ? 'wuxian' : 'jianpu');
  return b.sub === a.sub;
}
function nameOk(nm, r) {
  const m = r.pz + '.' + r.sub;
  if (/合唱谱/.test(nm)) return r.pz === 'hechang';
  if (/^简谱重奏谱|谱（简谱）$/.test(nm)) return m === 'jianpu.qiyue';
  if (/^钢琴(弹唱|伴奏)谱（纯伴奏/.test(nm)) return m === 'gangqin.banzou';
  if (/独奏谱/.test(nm)) return ['gangqin.duzou', 'wuxian.qiyue', 'jita.zhitan', 'uku.zhitan'].includes(m);
  if (/弹唱谱/.test(nm)) return ['jita.tanchang', 'uku.tanchang', 'gangqin.tanchang'].includes(m);
  if (/重奏谱/.test(nm)) return m === 'wuxian.chongzou';
  if (/^[^＋]+谱（五线谱）$/.test(nm) && !/^钢琴伴奏/.test(nm)) return m === 'wuxian.qiyue';
  if (/＋钢琴伴奏谱（五线谱）$/.test(nm) && !/^旋律＋/.test(nm)) return m === 'wuxian.qiyue';   /* v70.0 拍板 22 后半：X＋钢琴伴奏谱＝第 10 行 mel › 器乐（ik） */
  if (/功能谱|和弦谱/.test(nm)) return r.pz === 'gongneng';
  if (/教学对照谱/.test(nm)) return r.sub === 'duizhao';
  return true;
}
function switched(d) {
  const s = J(d), vv = Array.isArray(s.voxVoices) ? s.voxVoices : [], dual = Array.isArray(s.voxDual) ? s.voxDual : [], vn = Array.isArray(s.voxNotations) ? s.voxNotations.slice() : [];
  const br = K.groupsOf(s).filter(g => g.type === 'brace'), inBr = i => br.some(g => i >= g.from && i <= g.to);
  let n = 0;
  for (let i = 0; i < vv.length; i++) { if (inBr(i) || dual[i]) continue; n++; vn[i] = K.isStaffNota(vn[i]) ? null : 'staff'; }
  for (let i = 0; i < vv.length; i++) if (vn[i] === undefined) vn[i] = null;
  s.voxNotations = vn;
  return n ? s : null;
}
/* §5 有意改名（按谱面结构核：不许别的谱顺带改名） */
function renameOk(was, now, d) {
  const v = viewOrClean(K, d), k = safe(() => K.stackOf(v), ''), c = safe(() => K.ctxOf(v), null) || {};
  const ik = c.instKey && c.instKey !== 'piano' ? c.instKey : '';
  if ((k === 'J' || k === 'S') && c.nVox > 1 && c.lyr && c.pno === true && /^(简谱|五线谱)合唱谱$/.test(was) && now === was + '（含钢琴伴奏）') return '拍板 11';
  if (k === 'JG' && !c.lyr && ik && was === '钢琴伴奏歌谱' && now === K.instName(ik) + '＋钢琴伴奏谱（简谱）') return '拍板 22 后半';
  if (k === 'SG' && !c.lyr && ik && was === '旋律＋钢琴伴奏谱（五线谱）' && now === K.instName(ik) + '＋钢琴伴奏谱（五线谱）') return '拍板 22 后半';
  return '';
}

/* ---------- MIDI program change（GM program 0 起）：最小 SMF 解析 ---------- */
function midiProgs(buf) {
  const out = []; let p = 0;
  const vlq = q => { let v = 0; do { v = (v << 7) | (buf[q.i] & 0x7f); } while (buf[q.i++] & 0x80); return v; };
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4), len = buf.readUInt32BE(p + 4); p += 8;
    if (id === 'MTrk') {
      const q = { i: p }, end = p + len; let rs = 0;
      while (q.i < end) {
        vlq(q); let st = buf[q.i];
        if (st === 0xFF) { q.i += 2; const l = vlq(q); q.i += l; continue; }   /* 先读长度再前移（q.i += vlq(q) 会用读之前的 q.i） */
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

/* ---------- 真服务端（DEV_OTP 登录 → CLI 任命管理员：管理员发布免审直接上架） ---------- */
const SQLF = (() => { try { require('node:sqlite'); return []; } catch (_) { return ['--experimental-sqlite']; } })();
const PORT = 4100 + (process.pid % 80);
const DB = path.join(TMP, 'v700d.db');
const BASEURL = 'http://127.0.0.1:' + PORT;
const SENV = () => Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB, JWT_SECRET: 'v700data', COOKIE_DOMAIN: '', DEV_OTP: '1' });
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
  for (let i = 0; i < 80; i++) { try { const r = await hreq('GET', '/api/health'); if (r.status === 200) return { p, log: () => log }; } catch (_) {} await new Promise(r => setTimeout(r, 150)); }
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

/* ---------- 编辑器页面里的小工具（evaluate 内用） ---------- */
const PAGE_HELPERS = () => {
  window.__b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  window.__exp = s => { const m = migrate(JSON.parse(JSON.stringify(s))); const r = exportMIDI(m); return { mid: window.__b64(r.bytes || r), mxl: exportMusicXML(migrate(JSON.parse(JSON.stringify(s)))) }; };
};
async function openEditor(b, q) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + ED + (q || '')); await pg.waitForTimeout(1200);
  await pg.evaluate(PAGE_HELPERS);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  pg._ctx = ctx; return pg;
}

/* ========== --write-base：基线 6d8d6f8 的编辑器 / 统一谱名表生成 fixtures/v700data_base.json ========== */
async function writeBase(b) {
  const pg = await openEditor(b);
  const base = await pg.evaluate(() => ({
    nwInsts: NW_INSTS.map(x => ({ k: x.k, name: x.name, fam: x.fam, clef: x.clef || null, tim: x.tim || null, grp: x.grp || null, hint: x.hint || null })),
    instPq: INST_PQ, instIcon: INST_ICON, inst: PQ_KIND.INST, instFam: PQ_KIND.INST_FAM,
    presets: PRESETS.map(p => ({ name: p.name, data: p.make() }))
  }));
  const out = {};
  for (let i = 0; i < base.presets.length; i++) { const e = await pg.evaluate(s => window.__exp(s), base.presets[i].data); out['preset:' + i] = { mid: sha(e.mid), mxl: sha(e.mxl) }; }
  const libSha = {};
  for (const x of LIB) { libSha[x.id] = sha(JSON.stringify(x.data)); const e = await pg.evaluate(s => window.__exp(s), x.data); out['lib:' + x.id] = { mid: sha(e.mid), mxl: sha(e.mxl) }; }
  const kind = {};
  base.presets.forEach((p, i) => { kind['preset:' + i] = kindRec(K, p.data); });
  LIB.forEach(x => { kind['lib:' + x.id] = kindRec(K, x.data); });
  TAXO.GOLD.concat(TAXO.EDGE, TAXO.BAD).forEach(x => { kind['gold:' + x.tag] = kindRec(K, x.d); });
  OLDX.forEach(x => { kind['x:' + x.tag] = kindRec(K, x.d); });
  const ik = {}; ALIAS_ALL().forEach(n => { ik[n] = safe(() => K.ikOf({ voxVoices: [n], voxNotations: ['staff'], measures: [] }) || '', 'ERR'); });
  await pg._ctx.close();
  const json = { commit: BASE_COMMIT, note: '由 node tv_v700data.js --write-base 用 git show ' + BASE_COMMIT.slice(0, 7) + ' 的 muse-tab/index.html 与 api/kindname.js 生成；CI 直接读本文件',
    nwInsts: base.nwInsts, instPq: base.instPq, instIcon: base.instIcon, inst: base.inst, instFam: base.instFam, presets: base.presets, libSha, out, kind, ik };
  fs.writeFileSync(BASE_F, JSON.stringify(json));
  console.log('写入 ' + path.relative(ROOT, BASE_F) + '：预设 ' + base.presets.length + ' · 曲库 ' + LIB.length + ' · 导出摘要 ' + Object.keys(out).length + ' · 谱名 ' + Object.keys(kind).length);
}

/* §4.3 别名：[音轨名, 期望 instKey（''＝不认）] */
const ALIAS = [
  ['Recorder', 'recorder'], ['Recorders', 'recorder'], ['Blockflöte', 'recorder'], ['Blockflote', 'recorder'], ['Flauto dolce', 'recorder'], ['Rec.', 'recorder'], ['Rec 2', 'recorder'],
  ['竖笛', 'recorder'], ['直笛', 'recorder'], ['高音竖笛', 'recorder'],
  ['Melodica', 'melodica'], ['Pianica', 'melodica'], ['口风琴', 'melodica'],
  ['Ocarina', 'ocarina'], ['陶笛', 'ocarina'], ['十二孔陶笛', 'ocarina'],
  ['Xiao', 'xiao'], ['Xiao 2', 'xiao'], ['洞箫', 'xiao'], ['箫', 'xiao'],
  ['Cello', 'cello'], ['Cellos', 'cello'], ['Violoncello', 'cello'], ['Vc.', 'cello'], ['Vlc', 'cello'], ['Cello 1', 'cello'], ['大提琴', 'cello'],
  ['Clarinet', 'clarinet'], ['Clarinet in Bb', 'clarinet'], ['Clarinets', 'clarinet'], ['Cl.', 'clarinet'], ['Clar. 1', 'clarinet'], ['Klarinette', 'clarinet'], ['Clarinetto', 'clarinet'],
  ['单簧管', 'clarinet'], ['黑管', 'clarinet'],
  /* 反例：旧乐器不被新别名吃掉、人声 / 钢琴 / 低音不认 */
  ['Violin', 'violin'], ['Vln.', 'violin'], ['Violino', 'violin'], ['Flute', 'flute'], ['Fl.', 'flute'], ['Flauto', 'flute'], ['Flöte', 'flute'], ['笛子', 'dizi'], ['竹笛', 'dizi'],
  /* 「笛箫」：箫的别名只认 ^xiao / 洞箫 / ^箫，不归箫；笛子的别名（^dizi / 笛子 / 竹笛）本就不含它——基线即不认，照旧 */
  ['笛箫', ''],
  ['Harmonica', 'harmonica'], ['口琴', 'harmonica'], ['葫芦丝', 'hulusi'], ['Horn', 'horn'],
  ['English Horn', ''], ['Voice', ''], ['Soprano', ''], ['Bass', ''], ['Contrabass', ''], ['Piano·右手', ''], ['Piano', ''], ['Celesta', ''], ['Clavinet', ''], ['Vocals', ''], ['旋律', '']
];
const ALIAS_ALL = () => ALIAS.map(x => x[0]);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let srv = null;
  try {
    if (WRITE) { await writeBase(b); return; }
    const pg = await openEditor(b);
    const hasFn = await pg.evaluate(() => ({ gm: typeof gmProgFor === 'function', fix: typeof lbIntentFix === 'function', io: typeof PQ_KIND.intentOf === 'function' }));

    /* ================= D1 乐器表 ================= */
    await guard('D1', async () => {
      const SITE = process.env.MUSETAB_SITE || (fs.existsSync(path.join(path.dirname(ED), 'site/pyq.js')) ? path.join(path.dirname(ED), 'site') : path.join(ROOT, 'muse-tab/site'));
      const py = fs.readFileSync(path.join(SITE, 'pyq.js'), 'utf8');
      const litOf = (src, head, tail) => { const a = src.indexOf(head); if (a < 0) return null; const e = src.indexOf(tail, a + head.length); return new Function('return ' + src.slice(a + head.length - 1, e + 1))(); };
      const site = { I: litOf(py, 'const INST = {', '};'), F: litOf(py, 'const INST_FAM = {', '};') };
      const pgT = await pg.evaluate(() => ({ nw: NW_INSTS.map(x => ({ k: x.k, name: x.name, fam: x.fam, clef: x.clef || null, tim: x.tim || null, grp: x.grp || null, hint: x.hint || null, nx: x.nx || 0 })),
        inst: PQ_KIND.INST, fam: PQ_KIND.INST_FAM, pq: INST_PQ, ic: INST_ICON, nwpInsts: (NWP.INSTS || []).map(x => x.k) }));
      const keysOf = o => Object.keys(o || {});
      const same28 = [pgT.nw.map(x => x.k), keysOf(pgT.inst), keysOf(pgT.fam), keysOf(K.INST), keysOf(K.INST_FAM), keysOf(site.I), keysOf(site.F)].every(a => JSON.stringify(a) === JSON.stringify(KEYS28));
      const icOk = KEYS28.every(k => typeof pgT.pq[k] === 'string' && typeof pgT.ic[k] === 'string') && keysOf(pgT.pq).filter(k => k !== 'vocal').length === 28 && keysOf(pgT.ic).filter(k => k !== 'vocal').length === 28;
      const nmOk = pgT.nw.every(x => pgT.inst[x.k] === x.name && pgT.fam[x.k] === x.fam && K.INST[x.k] === x.name && site.I[x.k] === (x.k === 'other' ? '其他' : x.name) && site.F[x.k] === x.fam);
      T(same28 && icOk && nmOk, 'D1a 乐器表四处 28 键一致：NW_INSTS ＝ 编辑器 / node 端 PQ_KIND.INST · INST_FAM（键序、名字、族）＝ 官网 site/pyq.js 抄本 ＝ 图标表 INST_PQ / INST_ICON（各 28 键＋人声）',
        JSON.stringify({ same28, icOk, nmOk, n: pgT.nw.length }));
      /* 旧 22 键名义：与基线逐项相同（NW_INSTS 行、INST、INST_FAM、两张图标表）；旧清单 NWP.INSTS 仍是基线 20 种 */
      const oldBad = [];
      BASE.nwInsts.forEach(x => { const c = pgT.nw.find(y => y.k === x.k); if (!c || JSON.stringify(Object.assign({}, c, { nx: undefined })) !== JSON.stringify(Object.assign({}, x, { nx: undefined })) || c.nx) oldBad.push('NW_INSTS ' + x.k); });
      Object.keys(BASE.inst).forEach(k => { if (pgT.inst[k] !== BASE.inst[k] || pgT.fam[k] !== BASE.instFam[k] || K.INST[k] !== BASE.inst[k]) oldBad.push('INST ' + k); });
      Object.keys(BASE.instPq).forEach(k => { if (pgT.pq[k] !== BASE.instPq[k]) oldBad.push('INST_PQ ' + k); });
      Object.keys(BASE.instIcon).forEach(k => { if (pgT.ic[k] !== BASE.instIcon[k]) oldBad.push('INST_ICON ' + k); });
      const base20 = BASE.nwInsts.filter(x => x.fam !== 'tab').map(x => x.k);
      T(BASE.nwInsts.length === 22 && !oldBad.length && JSON.stringify(pgT.nwpInsts) === JSON.stringify(base20),
        'D1b 旧 22 个乐器键名义与基线 6d8d6f8 逐项不变（NW_INSTS 行 / INST / INST_FAM / INST_PQ / INST_ICON）；新建面板旧清单 NWP.INSTS 仍是基线 20 种',
        JSON.stringify({ oldBad: oldBad.slice(0, 8), nwp: pgT.nwpInsts }));
      /* 6 种新乐器各建 J / S：谱名 · pzOf（编辑器内联＝node）· 左轨图标 · MIDI / MusicXML program */
      const built = await pg.evaluate(NEW6K => {
        const out = [];
        NEW6K.forEach(k => ['J', 'S'].forEach(st => {
          const it = NW_INSTS.find(x => x.k === k), s = NWB.build(st, { title: k + st, nMea: 2, lyr: 0, instKey: k, clef: st === 'S' ? (it && it.clef) || 'staff' : undefined });
          s.measures[0].voxes[0][0].deg = 1;
          const e = window.__exp(s), m2 = JSON.parse(JSON.stringify(s)); if (m2.mixer && m2.mixer['vox:0']) m2.mixer['vox:0'].inst = 'piano';
          const e2 = window.__exp(m2);
          out.push({ k, st, json: JSON.stringify(s), name: PQ_KIND.nameOf(s), pz: PQ_KIND.pzOf(s), trk: trkInstOf('vox', 0, s), ic: INST_PQ[trkInstOf('vox', 0, s)], kd: NWB.kindOfSong(s).name,
            mid: e.mid, mxl: (e.mxl.match(/<midi-program>(\d+)<\/midi-program>/) || [])[1], mid2: e2.mid, mxl2: (e2.mxl.match(/<midi-program>(\d+)<\/midi-program>/) || [])[1], v0: (s.voxNotations || [])[0] || null });
        }));
        const v = NWB.build('S', { title: 'vn', nMea: 2, lyr: 0, instKey: 'violin' }); v.measures[0].voxes[0][0].deg = 1; const ev = window.__exp(v);
        return { out, violin: { mid: ev.mid, mxl: (ev.mxl.match(/<midi-program>(\d+)<\/midi-program>/) || [])[1] } };
      }, Object.keys(NEW6));
      const bad = [];
      built.out.forEach(x => {
        const [nm, fam, clef, gm] = NEW6[x.k], node = JSON.parse(x.json), nr = K.pzOf(node);
        const wantNm = nm + (x.st === 'J' ? '谱（简谱）' : '谱（五线谱）'), wantPz = '18 ' + (x.st === 'J' ? 'jianpu' : 'wuxian') + '.qiyue 〔' + x.k + '〕';
        const prog = (midiProgs(Buffer.from(x.mid, 'base64')).find(p => p.ch === 0) || {}).prog, prog2 = (midiProgs(Buffer.from(x.mid2, 'base64')).find(p => p.ch === 0) || {}).prog;
        if (x.name !== wantNm || K.nameOf(node) !== wantNm || x.kd !== wantNm) bad.push(x.k + x.st + ' 谱名 ' + x.name);
        if (pzShow(x.pz) !== wantPz || pzShow(nr) !== wantPz) bad.push(x.k + x.st + ' pzOf ' + pzShow(x.pz));
        if (x.trk !== x.k || x.ic !== NEW6_PQ[x.k]) bad.push(x.k + x.st + ' 左轨 ' + x.trk + '/' + x.ic);
        if (prog !== gm || +x.mxl !== gm + 1) bad.push(x.k + x.st + ' program MIDI ' + prog + ' / MusicXML ' + x.mxl + '（期望 ' + gm + '）');
        if (prog2 !== 0 || +x.mxl2 !== 1) bad.push(x.k + x.st + ' 改了音色仍写乐器 program：' + prog2 + ' / ' + x.mxl2);
        if (x.st === 'S' && x.v0 !== (clef || 'staff')) bad.push(x.k + ' 谱号 ' + x.v0);
      });
      const vp = (midiProgs(Buffer.from(built.violin.mid, 'base64')).find(p => p.ch === 0) || {}).prog;
      T(!bad.length && vp === 48 && +built.violin.mxl === 49, 'D1c 6 种新乐器各建 J / S（NWB.build）：谱名 X谱（简谱 / 五线谱）、pzOf 18 行 器乐（X）编辑器＝node、左轨乐器＝instKey 且图标是同族已有图标；'
        + 'MIDI / MusicXML 写乐器本身的 GM program（74 / 22 / 79 / 77 / 42 / 71，MusicXML +1），混音音色改过＝回落原映射；旧乐器（小提琴 strings 48）不变', JSON.stringify({ bad: bad.slice(0, 8), vp, vx: built.violin.mxl }));
      /* 真实音轨区：载入大提琴五线谱 / 陶笛简谱，左栏第一行图标＝INST_PQ（同族已有图标） */
      const rail = [];
      for (const [k, st] of [['cello', 'S'], ['ocarina', 'J'], ['clarinet', 'S'], ['xiao', 'J']]) {
        const x = built.out.find(y => y.k === k && y.st === st);
        await pg.evaluate(j => new Promise(r => addDoc(JSON.parse(j), () => setTimeout(r, 200))), x.json);
        await pg.waitForTimeout(250);
        rail.push(await pg.evaluate(() => { try { FLOW.tree.sync(); } catch (_) {} const e = document.querySelector('.flw-trow .flw-tic svg.pqi') || document.querySelector('#rail .lic svg.pqi');
          return e ? e.getAttribute('data-pq') : null; }));
      }
      T(rail.join() === [NEW6_PQ.cello, NEW6_PQ.ocarina, NEW6_PQ.clarinet, NEW6_PQ.xiao].join(), 'D1d 真实音轨区：大提琴 / 陶笛 / 单簧管 / 箫 的谱载入后左栏第一行乐器图标＝同族已有图标（inst-violin / inst-hulusi / inst-sax / inst-dizi）', JSON.stringify(rail));
      /* 旧谱：基线 16 预设（基线原始 JSON）＋曲库 10 首导出与基线编辑器逐字节相同、没有 pyq-intent */
      const exBad = [], libMiss = [];
      let n = 0, anyIntent = false;
      for (let i = 0; i < BASE.presets.length; i++) {
        const e = await pg.evaluate(s => window.__exp(s), BASE.presets[i].data), w = BASE.out['preset:' + i]; n++;
        if (/pyq-intent/.test(e.mxl)) anyIntent = true;
        if (sha(e.mid) !== w.mid) exBad.push(BASE.presets[i].name + ' MIDI'); if (sha(e.mxl) !== w.mxl) exBad.push(BASE.presets[i].name + ' MusicXML');
      }
      for (const x0 of LIB) {
        /* v70.4 有意迁移：曲库重建后阿特拉斯 / 侏儒带双音震音 col.trem2（新可选字段）——「旧谱」＝去掉 trem2（去掉后与基线种子逐字节相同，导出与基线编辑器逐字节相同）；
           带 trem2 的导出（tremolo start / stop、交替发声）由 tv_trem W9 / W10 验收，基线文件不动 */
        const x = Object.assign({}, x0, { data: JSON.parse(JSON.stringify(x0.data)) });
        x.data.measures.forEach(m => (m.voxes || []).forEach(v => (v || []).forEach(c => { if (c) delete c.trem2; })));
        if (sha(JSON.stringify(x.data)) !== BASE.libSha[x.id]) { libMiss.push(x.id); continue; }
        const e = await pg.evaluate(s => window.__exp(s), x.data), w = BASE.out['lib:' + x.id]; n++;
        if (/pyq-intent/.test(e.mxl)) anyIntent = true;
        if (sha(e.mid) !== w.mid) exBad.push(x.title + ' MIDI'); if (sha(e.mxl) !== w.mxl) exBad.push(x.title + ' MusicXML');
      }
      T(BASE.presets.length === 16 && LIB.length === 10 && !libMiss.length && n === 26 && !exBad.length && !anyIntent,
        'D1e 旧谱（基线 16 预设原始 JSON＋曲库 lib-os-* 10 首，migrate 后）MIDI / MusicXML 与基线 6d8d6f8 编辑器逐字节相同（26 份 × 2），不出现 pyq-intent',
        JSON.stringify({ n, exBad: exBad.slice(0, 8), libMiss, anyIntent }));
    });

    /* ================= D2 按音轨名认乐器 ================= */
    await guard('D2', async () => {
      const mk = n => ({ v: 3, voxVoices: [n], voxNotations: ['staff'], tabVoices: [], measures: [] });
      const ed = await pg.evaluate(names => names.map(n => PQ_KIND.ikOf({ v: 3, voxVoices: [n], voxNotations: ['staff'], tabVoices: [], measures: [] }) || ''), ALIAS_ALL());
      const bad = []; ALIAS.forEach(([n, w], i) => { const nd = K.ikOf(mk(n)) || ''; if (nd !== w || ed[i] !== w) bad.push(n + '：node ' + nd + ' / 编辑器 ' + ed[i] + ' ≠ ' + w); });
      /* 基线里旧乐器的认法不变（反例那一段）；新认出的只能是 6 种新乐器 */
      const drift = ALIAS.filter(([n]) => BASE.ik[n] !== (K.ikOf(mk(n)) || '')).filter(([n]) => !own(NEW6, K.ikOf(mk(n)) || '')).map(([n]) => n);
      T(!bad.length && !drift.length, 'D2a IK_ALIAS 正例 ' + ALIAS.filter(x => own(NEW6, x[1])).length + ' 个认成 6 种新乐器（竖笛排在长笛前：Flauto dolce → 竖笛；箫在笛子后：笛箫仍笛子）；反例 Violin / Vln. / Flute / Fl. / English Horn / Voice / Bass / Piano·右手 等不误判；编辑器内联＝node；对基线只多认出新乐器',
        JSON.stringify({ bad: bad.slice(0, 8), drift }));
      /* 真实导入（新建 → 从已有音乐 → 选择文件 → 按原文件）：音轨名 Violoncello、没写 instKey → 器乐（大提琴），谱名不变、不回写 instKey */
      const xml = await pg.evaluate(() => { const s = NWB.build('S', { title: '大提琴独奏', nMea: 2, lyr: 0, clef: 'bass' }); s.voxVoices = ['Violoncello']; s.measures[0].voxes[0][0].deg = 1; return exportMusicXML(s); });
      await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
      await pg.setInputFiles('#nw-anyfile', { name: 'cello.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
      await pg.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 8000 });
      await pg.click('#nf-impgo'); await pg.waitForFunction(() => !document.querySelector('.nf-modal')); await pg.waitForTimeout(250);
      const r = await pg.evaluate(() => ({ ik: song.instKey || '', name: docTypeLabel(song), pz: PQ_KIND.pzOf(song), json: JSON.stringify(song) }));
      const nd = K.pzOf(JSON.parse(r.json));
      T(r.ik === '' && r.name === '五线谱旋律' && pzShow(r.pz) === '18 wuxian.qiyue 〔cello〕' && pzShow(nd) === pzShow(r.pz) && BASE.kind['x:老导入 Violoncello 独奏（无 instKey）'].pz === '24 wuxian.shichang',
        'D2b 真实导入 Violoncello 独奏（无 instKey）：只读认乐器，不回写 instKey；谱名仍「五线谱旋律」；归属从基线的 五线谱 › 视唱（24 行）改落 五线谱 › 器乐（大提琴）（18 行，§4.3 有意的派生变化），编辑器＝node',
        JSON.stringify({ ik: r.ik, name: r.name, pz: pzShow(r.pz), node: pzShow(nd), base: BASE.kind['x:老导入 Violoncello 独奏（无 instKey）'] }));
    });

    /* ================= D3 谱名规则 ================= */
    await guard('D3', async () => {
      const S3 = [
        ['J 合唱＋钢琴（有词）', V(['女', '男', '右手', '左手'], [null, null, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }, [0, 1]), '简谱合唱谱（含钢琴伴奏）', 'type-choir'],
        ['J 四部合唱＋钢琴（新组合结构，留词位未填）', V(['女高', '女低', '男高', '男低', '右手', '左手'], [null, null, null, null, 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)], lyricLines: 1, intent: 'vocal' }), '简谱合唱谱（含钢琴伴奏）', 'type-choir'],
        ['S SATB＋钢琴（有词）', V(['S', 'A', 'T', 'B', '右手', '左手'], ['staff', 'staff', 'staff', 'bass', 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)] }, true), '五线谱合唱谱（含钢琴伴奏）', 'type-choir'],
        ['J 四部合唱无钢琴（照旧）', V(['S', 'A', 'T', 'B'], [null, null, null, null], { voxGroups: [BR(0, 3)] }, true), '简谱合唱谱', 'type-choir'],
        ['S SATB 无钢琴（照旧）', V(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], null, true), '五线谱合唱谱', 'type-choir'],
        ['S 二声部重奏＋钢琴（无词不加）', V(['旋律1', '旋律2', '右手', '左手'], ['staff', 'staff', 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }), '五线谱重奏谱', 'type-instr'],
        ['J 无词无乐器＋钢琴（不加）', V(['一', '二', '右手', '左手'], [null, null, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }), '简谱重奏谱', 'type-choir'],
        ['J 二胡二重奏＋钢琴（无词带乐器，不加）', V(['二胡一', '二胡二', '右手', '左手'], [null, null, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)], instKey: 'erhu' }), '二胡谱（简谱）', 'type-choir'],
        ['JG 无词＋二胡', V(ACN, ACC, { voxGroups: [BC(1, 2)], instKey: 'erhu' }), '二胡＋钢琴伴奏谱（简谱）', 'type-jg'],
        ['JG 无词＋竖笛', V(['竖笛', '右手伴奏', '左手伴奏'], ACC, { voxGroups: [BC(1, 2)], instKey: 'recorder' }), '竖笛＋钢琴伴奏谱（简谱）', 'type-jg'],
        ['JG 无词 instKey other', V(ACN, ACC, { voxGroups: [BC(1, 2)], instKey: 'other' }), '器乐＋钢琴伴奏谱（简谱）', 'type-jg'],
        ['JG 有词＋二胡（照旧）', V(ACN, ACC, { voxGroups: [BC(1, 2)], instKey: 'erhu' }, [0]), '钢琴伴奏歌谱', 'type-jg'],
        ['JG 无词 instKey piano（照旧）', V(ACN, ACC, { voxGroups: [BC(1, 2)], instKey: 'piano' }), '钢琴伴奏歌谱', 'type-jg'],
        ['JG 无词无乐器（照旧）', V(ACN, ACC, { voxGroups: [BC(1, 2)] }), '钢琴伴奏歌谱', 'type-jg'],
        ['SG 无词＋小提琴', V(['小提琴', '右手伴奏', '左手伴奏'], ACS, { voxGroups: [BC(1, 2)], instKey: 'violin' }), '小提琴＋钢琴伴奏谱（五线谱）', 'type-jg'],
        ['SG 无词＋大提琴（低音谱号）', V(['大提琴', '右手伴奏', '左手伴奏'], ['bass', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'cello' }), '大提琴＋钢琴伴奏谱（五线谱）', 'type-jg'],
        ['SG 无词 instKey other', V(ACN, ACS, { voxGroups: [BC(1, 2)], instKey: 'other' }), '器乐＋钢琴伴奏谱（五线谱）', 'type-jg'],
        ['SG 有词＋小提琴（照旧）', V(ACN, ACS, { voxGroups: [BC(1, 2)], instKey: 'violin' }, [0]), '钢琴伴奏歌谱（五线谱）', 'type-jg'],
        ['SG 无词无乐器（照旧）', V(ACN, ACS, { voxGroups: [BC(1, 2)] }), '旋律＋钢琴伴奏谱（五线谱）', 'type-jg'],
        ['JG 无词 intent=vocal（第 11 行）', V(ACN, ACC, { voxGroups: [BC(1, 2)], intent: 'vocal' }), '钢琴伴奏歌谱', 'type-jg', '11 gangqin.tanchang+jianpu.gequ'],
        ['SG 无词 intent=vocal（第 11 行）', V(ACN, ACS, { voxGroups: [BC(1, 2)], intent: 'vocal' }), '旋律＋钢琴伴奏谱（五线谱）', 'type-jg', '11 gangqin.tanchang+wuxian.gequ'],
        ['JG 无词没写 intent（照旧 12）', V(ACN, ACC, { voxGroups: [BC(1, 2)] }), '钢琴伴奏歌谱', 'type-jg', '12 gangqin.tanchang+jianpu.gequ'],
        ['SG 无词没写 intent（照旧 13）', V(ACN, ACS, { voxGroups: [BC(1, 2)] }), '旋律＋钢琴伴奏谱（五线谱）', 'type-jg', '13 gangqin.banzou+wuxian.qiyue 〔other〕'],
      ].map(([tag, d, nm, ic, pz]) => ({ tag, d: J(d), nm, ic, pz }));
      const ed = await pg.evaluate(L => L.map(d => ({ name: PQ_KIND.nameOf(d), pz: PQ_KIND.pzOf(d), kd: NWB.kindOfSong(d), cc: ccKindIc({}, PQ_KIND.nameOf(d)) })), S3.map(x => x.d));
      const bad = [];
      S3.forEach((x, i) => {
        const nm = K.nameOf(x.d), r = K.pzOf(x.d), e = ed[i];
        if (nm !== x.nm || e.name !== x.nm || e.kd.name !== x.nm) bad.push(x.tag + ' 谱名 ' + nm + ' / ' + e.name);
        if (JSON.stringify(e.pz) !== JSON.stringify(r)) bad.push(x.tag + ' pzOf 编辑器≠node');
        if (x.pz && pzShow(r) !== x.pz) bad.push(x.tag + ' pzOf ' + pzShow(r));
        if (e.kd.ic !== x.ic || (/合唱谱|＋钢琴伴奏谱（/.test(x.nm) && e.cc !== x.ic)) bad.push(x.tag + ' 图标 ' + e.kd.ic + ' / 谱库 ' + e.cc);
        if (!nameOk(nm, r)) bad.push(x.tag + ' 名实不一致 ' + nm + ' → ' + pzShow(r));
        const sw = switched(x.d); if (sw) { const r2 = K.pzOf(sw); if (!mirrorOk(r, r2) && !((r.row === '12' && r2.row === '13') || (r.row === '13' && r2.row === '12'))) bad.push(x.tag + ' 镜像 ' + pzShow(r) + ' ⇄ ' + pzShow(r2)); }
      });
      T(!bad.length, 'D3a 谱名新规则（' + S3.length + ' 例）：拍板 11 J / S 多声部有词＋钢琴「（含钢琴伴奏）」（无词重奏 / X谱（简谱）不加）、拍板 22 后半 JG / SG 无词带乐器「X＋钢琴伴奏谱（简谱 / 五线谱）」（other＝器乐、piano / 有词照旧）、'
        + '第 11 行 intent=vocal 归 钢琴谱 › 弹唱（JG / SG 镜像一致）；编辑器内联＝node、谱类图标与谱库 ccKindIc 认新谱名、名实一致 / 互切镜像成立', JSON.stringify(bad.slice(0, 8)));
      /* kindName 网格：编辑器内联与 node 端逐例相同 */
      const grid = []; ['J', 'S', 'SJ', 'SJG', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'CJ', 'CS', 'C', 'X'].forEach(k => [1, 2, 4].forEach(nVox => [false, true].forEach(lyr => ['', 'piano', 'erhu', 'cello', 'recorder', 'other', 'zzz'].forEach(instKey =>
        [false, true].forEach(pno => ['guitar', 'uku'].forEach(inst => [false, true].forEach(dual => grid.push([k, { nVox, lyr, instKey, pno, inst, dual }]))))))));
      const eg = await pg.evaluate(G => G.map(([k, c]) => PQ_KIND.kindName(k, c)), grid);
      const gBad = grid.filter(([k, c], i) => K.kindName(k, c) !== eg[i]).map(([k, c]) => k + JSON.stringify(c));
      T(!gBad.length, 'D3b kindName 网格 ' + grid.length + ' 例（15 谱行 × 声部数 × 词 × instKey × pno × 吉他 / 尤克里里 × 对照）：编辑器内联＝node 端逐例相同', JSON.stringify(gBad.slice(0, 4)));
      /* 老谱：对基线只许 §5 / §4.3 列明的差异 */
      const corpus = BASE.presets.map((p, i) => ['preset:' + i, p.data]).concat(LIB.map(x => ['lib:' + x.id, x.data]), TAXO.GOLD.concat(TAXO.EDGE, TAXO.BAD).map(x => ['gold:' + x.tag, x.d]), OLDX.map(x => ['x:' + x.tag, x.d]));
      const why = {}, dBad = [], miss = [];
      corpus.forEach(([tag, d]) => {
        const w = BASE.kind[tag]; if (!w) { miss.push(tag); return; }
        const c = kindRec(K, d);
        if (c.name !== w.name) { const r = renameOk(w.name, c.name, d); if (r) why[r] = (why[r] || 0) + 1; else dBad.push(tag + ' 谱名 ' + w.name + ' → ' + c.name); }
        if (c.pz !== w.pz) {
          if (own(NEW6, c.ik) && c.ik !== w.ik && !(d && d.instKey)) why['§4.3 音轨名认新乐器'] = (why['§4.3 音轨名认新乐器'] || 0) + 1;
          else dBad.push(tag + ' pzOf ' + w.pz + ' → ' + c.pz);
        }
      });
      const edK = await pg.evaluate(L => L.map(d => { try { return [PQ_KIND.nameOf(d), JSON.stringify(PQ_KIND.pzOf(d))]; } catch (e) { return ['ERR', '']; } }), corpus.map(x => x[1]).filter(d => d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.measures)));
      const nodeK = corpus.map(x => x[1]).filter(d => d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.measures)).map(d => { try { return [K.nameOf(d), JSON.stringify(K.pzOf(d))]; } catch (e) { return ['ERR', '']; } });
      const eqBad = nodeK.filter((x, i) => x[0] !== edK[i][0] || x[1] !== edK[i][1]).length;
      T(!dBad.length && !miss.length && !eqBad && why['拍板 11'] >= 3 && why['拍板 22 后半'] >= 3 && why['§4.3 音轨名认新乐器'] >= 6,
        'D3c 老谱（基线 16 预设＋曲库 10 首＋tv_taxonomy 金表 ' + (TAXO.GOLD.length + TAXO.EDGE.length + TAXO.BAD.length) + ' 例＋老导入 ' + OLDX.length + ' 例）谱名 / pzOf 对基线只出现 §5 / §4.3 列明的差异；编辑器内联＝node',
        JSON.stringify({ why, dBad: dBad.slice(0, 6), miss: miss.slice(0, 4), eqBad }));
    });

    /* ================= D4 intent 往返 ================= */
    await guard('D4', async () => {
      /* MusicXML 写 / 读、非法值、migrate / 清洗逐字节 */
      const mx = await pg.evaluate(INT => {
        const mk = it => { const s = NWB.build('J', { title: 'io', nMea: 2 }); s.measures[0].voxes[0][0].deg = 1; if (it !== undefined) s.intent = it; return s; };
        const out = { ok: [], bad: [], mig: [], illegal: [], imp: [] };
        INT.forEach(it => { const s = mk(it), x = exportMusicXML(s), n = (x.match(/name="pyq-intent"/g) || []).length;
          const has = x.indexOf('<miscellaneous-field name="pyq-intent">' + it + '</miscellaneous-field>') >= 0, r = importMusicXML(x), got = r && r.song && r.song.intent;
          out.ok.push([it, n === 1 && has, got]);
          const m = migrate(JSON.parse(JSON.stringify(s))), J0 = JSON.stringify(m);
          out.mig.push([it, m.intent === it, JSON.stringify(migrate(JSON.parse(J0))) === J0, JSON.stringify(normalizeSongFields(JSON.parse(J0))) === J0, JSON.stringify(sanitizeUntrusted(JSON.parse(J0))) === J0]); });
        [undefined, '', 'zzz', 'Sight', 5, {}, ['kids'], 'toString', '__proto__'].forEach(it => { const s = mk(it); let x = ''; try { x = exportMusicXML(s); } catch (e) { x = 'ERR ' + e.message; } out.illegal.push([String(JSON.stringify(it)), /pyq-intent/.test(x), /^ERR/.test(x)]); });
        const base = exportMusicXML(mk(undefined)), at = base.indexOf('</miscellaneous>') >= 0 ? base.indexOf('</miscellaneous>') : -1;
        const inject = v => at >= 0 ? base.slice(0, at) + '<miscellaneous-field name="pyq-intent">' + v + '</miscellaneous-field>' + base.slice(at)
          : base.replace('</identification>', '<miscellaneous><miscellaneous-field name="pyq-intent">' + v + '</miscellaneous-field></miscellaneous></identification>');
        [['zzz', null], ['SIGHT', null], [' sight\n', 'sight'], ['kids', 'kids'], ['&lt;b&gt;', null], ['', null]].forEach(([v, w]) => { const r = importMusicXML(inject(v)), got = r && r.song ? (r.song.intent === undefined ? null : r.song.intent) : 'ERR'; out.imp.push([v, got === w, got]); });
        return out;
      }, INTENTS);
      const okAll = mx.ok.every(x => x[1] && x[2] === x[0]) && mx.mig.every(x => x[1] && x[2] && x[3] && x[4]);
      const illOk = mx.illegal.every(x => !x[1] && !x[2]) && mx.imp.every(x => x[1]);
      T(hasFn.io && okAll && illOk, 'D4a MusicXML：11 个用途各写一条 <miscellaneous-field name="pyq-intent">、导入读回同值；非法值（空 / 认不出 / 大小写 / 数字 / 对象 / 数组 / 原型链键）不写、文件里的非法值不读、去空白后合法才读；'
        + 'migrate 幂等且 intent 不变、normalizeSongFields / sanitizeUntrusted 逐字节不变', JSON.stringify({ ok: mx.ok.filter(x => !(x[1] && x[2] === x[0])), mig: mx.mig.filter(x => !(x[1] && x[2] && x[3] && x[4])), ill: mx.illegal.filter(x => x[1] || x[2]), imp: mx.imp.filter(x => !x[1]) }));
      /* 本机保存：当前谱 / 窗口存档 / 我的曲谱；刷新后读回 */
      const loc = await pg.evaluate(() => new Promise(res => {
        const s = NWB.build('JG', { title: '本机往返', nMea: 2 }); s.measures[0].voxes[0][0].deg = 3; s.intent = 'pacc';
        addDoc(s, () => { setTimeout(() => { try { persistNow(); } catch (_) {}
          const cur = JSON.parse(localStorage.getItem(LS_KEY) || '{}'), dd = JSON.parse(localStorage.getItem(LS_DOCS) || '{}');
          try { saveToLibrary(); } catch (_) {}
          setTimeout(() => { try { persistNow(); } catch (_) {} const lib = JSON.parse(localStorage.getItem(LS_LIB) || '[]'), e = lib.find(x => x.data && x.data.title === '本机往返');
            res({ cur: cur.intent, docs: ((dd.docs || []).find(x => x && x.title === '本机往返') || {}).intent, lib: e && e.data.intent, id: song.id || '' }); }, 300); }, 200); });
      }));
      try { await pg.evaluate(() => { try { closeModal(); } catch (_) {} }); } catch (_) {}
      await pg.reload(); await pg.waitForTimeout(1300); await pg.evaluate(PAGE_HELPERS);
      const after = await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} const d = (docs || []).map(x => x.song).find(x => x && x.title === '本机往返'); return { cur: song.title === '本机往返' ? song.intent : (d && d.intent), lib: ((libLoad().find(x => x.data && x.data.title === '本机往返') || {}).data || {}).intent }; });
      T(loc.cur === 'pacc' && loc.docs === 'pacc' && loc.lib === 'pacc' && after.cur === 'pacc' && after.lib === 'pacc', 'D4b 本机保存：当前谱（musetab 当前谱键）/ 窗口存档 / 我的曲谱都带 intent，刷新页面后读回不变', JSON.stringify({ loc, after }));
      /* 存为文件 .mtab.json（exportSong 真下载）→ 新建 → 从已有音乐 → 选择文件 打开 */
      await pg.evaluate(() => { const s = NWB.build('S', { title: '文件往返', nMea: 2, lyr: 0 }); s.measures[0].voxes[0][0].deg = 5; s.intent = 'sight'; return new Promise(r => addDoc(s, () => setTimeout(r, 200))); });
      const [dl] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(() => exportSong(song))]);
      const ftxt = fs.readFileSync(await dl.path(), 'utf8');
      await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
      await pg.setInputFiles('#nw-anyfile', { name: '文件往返.mtab.json', mimeType: 'application/json', buffer: Buffer.from(ftxt) });
      await pg.waitForFunction(() => !document.querySelector('.nf-modal'), null, { timeout: 6000 }); await pg.waitForTimeout(250);
      const mt = await pg.evaluate(() => ({ title: song.title, intent: song.intent, n: docs.filter(d => (d.song || {}).title === '文件往返').length }));
      T(JSON.parse(ftxt).intent === 'sight' && mt.title === '文件往返' && mt.intent === 'sight', 'D4c 存为文件 .mtab.json（真下载）带 intent，经「新建 → 从已有音乐 → 选择文件」打开（sanitizeUntrusted＋migrate）后 intent 不变', JSON.stringify({ file: JSON.parse(ftxt).intent, mt }));
      /* 云同步载荷（scoreCloudPush 的 PUT body）→ 真服务端保存 → 发布 → 谱库卡片 → 观看页数据 sanitizeUntrusted */
      const cloud = await pg.evaluate(async () => {
        const s = NWB.build('S', { title: '云端往返', nMea: 2, lyr: 0 }); s.measures[0].voxes[0][0].deg = 2; s.intent = 'sight'; s.id = 'v700dcloud01';
        const lib = libLoad().filter(x => x.id !== s.id); lib.unshift({ id: s.id, title: s.title, data: s, mtime: Math.floor(Date.now() / 1000), updatedAt: '' }); libSave(lib);
        const f0 = window.fetch, cap = []; window.PYQ_CLOUD = true; try { ACCT = ACCT || { id: 'u1', phone: '1' }; } catch (_) {}
        window.fetch = async (u, init) => { cap.push({ u: String(u), m: init && init.method, b: init && init.body }); return new Response('{"saved":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
        try { await scoreCloudPush(s.id); } finally { window.fetch = f0; window.PYQ_CLOUD = false; }
        const put = cap.find(x => /\/api\/scores\/v700dcloud01$/.test(x.u) && x.m === 'PUT');
        return put ? JSON.parse(put.b) : null;
      });
      T(!!cloud && cloud.data && cloud.data.intent === 'sight', 'D4d 云同步载荷（scoreCloudPush 发出的 PUT /api/scores/:id）data 带 intent', JSON.stringify(cloud && { intent: cloud.data && cloud.data.intent }));
      try { fs.unlinkSync(DB); } catch (_) {}
      srv = await startServer();
      const ad = await adminLogin('13700070001');
      const pubs = {};
      if (ad.ok && cloud) pubs.cloud = await publish(ad.ck, 'v700dcloud01', cloud.data);
      const pubData = {}; for (const it of ['kids', 'vocal', 'sight', 'pacc']) {
        const d = J(cloud ? cloud.data : {}); d.intent = it; d.title = '用途 ' + it; pubData[it] = d; if (ad.ok) pubs[it] = await publish(ad.ck, 'v700dint' + it.padEnd(5, '0'), d); }
      const L = await hreq('GET', '/api/pub/scores'), cards = (L.j && L.j.scores) || [];
      const card = id => cards.find(c => c.id === id) || {};
      const cardOk = card('v700dcloud01').intent === 'sight' && ['kids', 'vocal', 'sight', 'pacc'].every(it => card('v700dint' + it.padEnd(5, '0')).intent === it);
      const one = await hreq('GET', '/api/pub/scores/v700dcloud01'), pd = one.j && (one.j.score || one.j).data;
      const view = pd ? await pg.evaluate(d => { const s = migrate(sanitizeUntrusted(d)); return { intent: s.intent, same: JSON.stringify(sanitizeUntrusted(JSON.parse(JSON.stringify(d)))) === JSON.stringify(d) }; }, pd) : null;
      /* 服务端清洗：intent 带尖括号 / 是对象拒收；认不出的值存得进、卡片当没写 */
      const bad1 = await hreq('PUT', '/api/scores/v700dbad0001', { title: 'x', data: Object.assign(J(cloud ? cloud.data : {}), { intent: '<b>' }), updated_at: 1 }, ad.ck);
      const bad2 = await hreq('PUT', '/api/scores/v700dbad0002', { title: 'x', data: Object.assign(J(cloud ? cloud.data : {}), { intent: {} }), updated_at: 1 }, ad.ck);
      const z = ad.ok ? await publish(ad.ck, 'v700dzzz0001', Object.assign(J(cloud ? cloud.data : {}), { intent: 'zzz', title: '认不出' })) : {};
      const L2 = await hreq('GET', '/api/pub/scores'), cz = ((L2.j && L2.j.scores) || []).find(c => c.id === 'v700dzzz0001') || {};
      T(ad.ok && cardOk && view && view.intent === 'sight' && view.same && bad1.status === 400 && bad2.status === 400 && z.pub && z.pub.status === 200 && cz.intent === '',
        'D4e 真服务端：云同步载荷原样保存 → 发布 → 谱库卡片 intent＝谱面（kids / vocal / sight / pacc 各一）；观看页数据经 sanitizeUntrusted＋migrate 后 intent 不变；intent 带尖括号 / 是对象被拒收（400）、认不出的值存得进且卡片当没写',
        JSON.stringify({ ad: ad.ok, cli: ad.ok ? '' : ad.cli.slice(0, 120), cardOk, cards: cards.filter(c => /^v700d/.test(c.id)).map(c => c.id + ':' + c.intent), view, bad: [bad1.status, bad2.status], z: z.pub && z.pub.status, cz: cz.intent }));
      /* D7 的真服务端部分借用同一会话：发布 6 种新乐器各一首 */
      const insts = await pg.evaluate(() => ['cello', 'clarinet', 'xiao', 'ocarina', 'recorder', 'melodica'].map(k => { const it = NW_INSTS.find(x => x.k === k);
        const s = NWB.build(it.fam === 'staff' ? 'S' : 'J', { title: '乐器 ' + k, nMea: 2, lyr: 0, instKey: k, key: 'C', clef: it.clef }); s.measures[0].voxes[0][0].deg = 1; return s; }));
      for (const s of insts) if (ad.ok) await publish(ad.ck, 'v700dik' + s.instKey.slice(0, 5).padEnd(5, '0'), s);
      pg._d7 = { ok: ad.ok };
    });

    /* ================= D5 换谱类 ================= */
    await guard('D5', async () => {
      const OK = { gtr: ['JT', 'T'], pacc: ['JG', 'SG', 'CG'], vocal: ['J', 'S', 'JG', 'SG'], teach: ['SJ', 'SJG'], sight: ['S', 'J'], solo: ['ST', 'T'], inst: ['G', 'J', 'S', 'SG'], chord: ['C', 'CJ', 'CS'], blank: ['J', 'S'] };
      const DEF = { J: 'vocal', S: 'vocal', SJ: 'teach', SJG: 'teach', JG: 'pacc', SG: 'pacc', CG: 'pacc', JT: 'gtr', T: 'gtr', ST: 'solo', G: 'inst', CJ: 'chord', CS: 'chord', C: 'chord' };
      const exp = (it, to) => (INTENTS.indexOf(it) < 0) ? it : (it === 'kids' || it === 'custom') ? it : (OK[it] || []).indexOf(to) >= 0 ? it : DEF[to];
      const r = await pg.evaluate(INT => {
        const stk = NWB.VALID.slice(), out = [], keep = song;
        const fill = (s, all) => { (s.voxVoices || []).forEach((_, vi) => { if (all || vi === 0) s.measures[0].voxes[vi][0].deg = 1; });
          (s.tabVoices || []).forEach((_, ti) => { if (all || !(s.voxVoices || []).length) s.measures[0].tabs[ti][0].notes = [{ s: 1, f: 0 }]; }); return s; };
        try {
          stk.forEach(from => [0, 1, 2].forEach(full => {   /* 0 空谱（重建）· 1 只有旋律音（多为直接换）· 2 每一行都有音（伴奏 / 六线谱有内容＝另建一份） */
            const b0 = NWB.build(from, { title: 'lb', nMea: 2 }); if (full) fill(b0, full === 2);
            stk.forEach(to => { const p = lbPlan(b0, to); if (p.mode === 'no' || p.mode === 'same') { out.push([from, to, full, p.mode]); return; }
              INT.forEach(it => { const s = JSON.parse(JSON.stringify(b0)); if (it === '') delete s.intent; else s.intent = it; const src = JSON.stringify(s); let res;
                song = s;
                if (p.mode === 'copy') res = lbCopy(s, to); else if (p.mode === 'rebuild') res = lbRebuild(s, to); else { lbApplyDirect(s, from, to); res = s; }
                out.push([from, to, full, p.mode, it, own(res, 'intent') ? res.intent : '∅', NWB.stackOf(res), p.mode === 'copy' ? JSON.stringify(s) === src : true]); });
            });
          }));
        } finally { song = keep; }
        function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
        return { out, n: stk.length };
      }, [''].concat(INTENTS, ['zzz']));
      const bad = [], modes = {};
      r.out.forEach(x => { if (x.length < 5) return; const [from, to, full, mode, it, got, k2, srcSame] = x; modes[mode] = (modes[mode] || 0) + 1;
        const w = it === '' ? '∅' : exp(it, to);
        if (got !== w || k2 !== to || !srcSame) bad.push(from + '→' + to + ['（空）', '（有旋律）', '（每行有音）'][full] + ' ' + mode + ' ' + (it || '无') + '：' + got + ' ≠ ' + w + (k2 !== to ? ' 谱行 ' + k2 : '') + (srcSame ? '' : ' 原谱被改'));
      });
      T(hasFn.fix && r.n === 14 && !bad.length && modes.direct > 300 && modes.rebuild > 300 && modes.copy > 100,
        'D5a 换谱类 14 × 14 × 13（无 / 11 个用途 / 认不出的值）× 空谱 / 有旋律 / 每行有音 表驱动：没写不写、认不出的原样、kids / custom 不改、旧用途能产出目标谱行不改、否则改成目标谱行的默认用途；直接换 / 重建 / 另建一份三种都按规则（另建一份原谱不动）',
        JSON.stringify({ modes, bad: bad.slice(0, 8), n: bad.length }));
      /* 真实换谱类：直接换 / 重建一步撤销连 intent 一起退；另建一份原谱不动 */
      const live = await pg.evaluate(() => new Promise(res => {
        const s = NWB.build('J', { title: '换谱撤销', nMea: 2, instKey: 'erhu', lyr: 0 }); s.measures[0].voxes[0][0].deg = 1; s.intent = 'sight';
        addDoc(s, () => setTimeout(() => {
          const o = {}; o.m1 = lbSwitch('JG', true); o.a1 = [song.intent, NWB.stackOf(song)]; undo(); o.u1 = [song.intent, NWB.stackOf(song)];
          const e = NWB.build('S', { title: '空谱重建', nMea: 2, lyr: 0 }); e.intent = 'solo';
          addDoc(e, () => setTimeout(() => {
            o.m2 = lbSwitch('CJ', true); o.a2 = [song.intent, NWB.stackOf(song)]; undo(); o.u2 = [song.intent, NWB.stackOf(song)];
            const c = NWB.build('JG', { title: '另建一份', nMea: 2 }); c.measures[0].voxes[0][0].deg = 1; c.measures[0].voxes[1][0].deg = 3; c.intent = 'vocal';
            addDoc(c, () => setTimeout(() => { const d0 = curDocI; o.m3 = lbSwitch('CJ', true);
              setTimeout(() => { o.a3 = [song.intent, NWB.stackOf(song)]; o.orig = [docs[d0].song.intent, NWB.stackOf(docs[d0].song)]; res(o); }, 500); }, 200));
          }, 200));
        }, 200));
      }));
      /* 旋律用切换 / setVoxNotation / 加删音轨不改 intent */
      const keepI = await pg.evaluate(() => new Promise(res => {
        const s = NWB.build('J', { title: '不改', nMea: 2 }); s.measures[0].voxes[0][0].deg = 1; s.intent = 'teach';
        addDoc(s, () => setTimeout(() => { const o = {};
          lbMelSet('S'); o.mel = [song.intent, NWB.stackOf(song)];
          sel.row = 'vox'; sel.vi = 0; setVoxNotation(undefined); o.nota = [song.intent, NWB.stackOf(song)];
          addTrackOf('vox'); o.add = [song.intent, (song.voxVoices || []).length];
          try { delVoiceAt('vox', song.voxVoices.length - 1); } catch (_) {} o.del = [song.intent, (song.voxVoices || []).length];
          res(o); }, 200));
      }));
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} });
      T(live.m1 === 'direct' && live.a1.join() === 'pacc,JG' && live.u1.join() === 'sight,J' && live.m2 === 'rebuild' && live.a2.join() === 'chord,CJ' && live.u2.join() === 'solo,S'
        && live.m3 === 'copy' && live.a3.join() === 'chord,CJ' && live.orig.join() === 'vocal,JG'
        && keepI.mel.join() === 'teach,S' && keepI.nota.join() === 'teach,J' && keepI.add.join() === 'teach,2' && keepI.del[0] === 'teach',
        'D5b 真实换谱类（lbSwitch）：直接换 / 空谱重建按规则改 intent，Ctrl+Z 一步撤销连 intent 一起退回；另建一份新窗口按规则、原谱 intent 不动；旋律用切换 / setVoxNotation / 加删音轨不改 intent',
        JSON.stringify({ live, keepI }));
      /* 菜单谱名＝换完谱名（真实点击悬浮条谱类 ▾）：二胡简谱直接换钢琴伴奏歌谱 → 「二胡＋钢琴伴奏谱（简谱）」；合唱＋钢琴的「当前」项带「（含钢琴伴奏）」 */
      const menu = async (s, to) => {
        await pg.evaluate(j => new Promise(r => addDoc(JSON.parse(j), () => { try { LBAR.open({ from: 'switch' }); } catch (_) {} render(); setTimeout(r, 250); })), JSON.stringify(s));
        await pg.evaluate(() => { try { FLOW.tree.sync(); } catch (_) {} });
        const KB = await pg.evaluate(() => (typeof flowOn === 'function' && flowOn()) ? '#flw-sb-kind' : '#lb-wrap .lb-kind');
        const vis = await pg.evaluate(sel => { const e = document.querySelector(sel); const rr = e && e.getBoundingClientRect(); return !!(rr && rr.width > 0 && rr.height > 0); }, KB);
        if (!vis) return { vis, KB };
        await pg.click(KB); await pg.waitForSelector('#lb-menu');
        const it = await pg.evaluate(t => { const x = document.querySelector('#lb-menu .lb-mi[data-sw="' + t + '"]'), c = document.querySelector('#lb-menu .lb-mi.m-same');
          return { name: x && (x.querySelector('b') || x).textContent, mode: x && x.className.replace(/.*m-/, ''), cur: c && (c.querySelector('b') || c).textContent }; }, to);
        const before = await pg.evaluate(() => docTypeLabel(song));
        if (to) { await pg.click('#lb-menu .lb-mi[data-sw="' + to + '"]'); await pg.waitForTimeout(250); } else await pg.keyboard.press('Escape');
        return Object.assign(it, { vis, KB, before, after: await pg.evaluate(() => docTypeLabel(song)) });
      };
      const erhu = J(V(['二胡'], [null], { instKey: 'erhu', layout: { fixed: true } })), choir = J(V(['S', 'A', 'T', 'B', '右手', '左手'], ['staff', 'staff', 'staff', 'bass', 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)] }, true));
      const m1 = await menu(erhu, 'JG'), m2 = await menu(choir, 'J');
      T(m1.vis && m1.mode === 'direct' && m1.name === '二胡＋钢琴伴奏谱（简谱）' && m1.after === m1.name && m1.cur === m1.before && m2.vis && m2.cur === '五线谱合唱谱（含钢琴伴奏）' && m2.before === m2.cur,
        'D5c 换谱类菜单（真实点击谱类 ▾）：二胡简谱直接换成钢琴伴奏歌谱，菜单项写「二胡＋钢琴伴奏谱（简谱）」＝换完谱名（lbCtxFor 直接换 JG / SG 带 instKey）；SATB＋钢琴的「当前」项＝谱面谱名「五线谱合唱谱（含钢琴伴奏）」',
        JSON.stringify({ m1, m2 }));
    });

    /* ================= D6 从已有音乐 ================= */
    await guard('D6', async () => {
      const r = await pg.evaluate(() => {
        const mk = it => { const s = NWB.build('J', { title: '导入做法', nMea: 4 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 3][i % 4]; c.lyrics = ['啊']; })); if (it) s.intent = it; return exportMusicXML(s); };
        const out = {};
        [['plain', ''], ['own', 'kids']].forEach(([tag, it]) => { const x = mk(it), rr = importMusicXML(x), a = NWP.analyze('t.musicxml', rr); out[tag] = { file: rr.song.intent || '∅', dis: a.dis };
          NWP.TARGETS.forEach(([t]) => { if (a.dis && a.dis[t]) { out[tag][t] = 'dis'; return; } const s = NWP.convert(a, t); out[tag][t] = (s && Object.prototype.hasOwnProperty.call(s, 'intent')) ? s.intent : '∅'; }); });
        const ms = NWB.build('J', { title: 'm', nMea: 2 }); ms.measures[0].voxes[0][0].deg = 1; ms.intent = 'kids'; const u8 = exportMIDI(ms).bytes, smf = parseSMF(u8); let mi = '?'; try { const ss = buildSongFromMIDI(smf, { mode: 'single', a: 0 }).song; mi = Object.prototype.hasOwnProperty.call(ss, 'intent') ? ss.intent : '∅'; } catch (e) { mi = 'ERR ' + e.message; }
        return { out, mi, targets: NWP.TARGETS.map(x => x[0]) };
      });
      const W = { plain: { orig: '∅', J: '∅', SJ: 'teach', acc: 'pacc', JT: 'gtr', CJ: 'chord' }, own: { orig: 'kids', J: 'kids', SJ: 'teach', acc: 'pacc', JT: 'gtr', CJ: 'chord' } };
      const bad = []; ['plain', 'own'].forEach(tag => Object.keys(W[tag]).forEach(t => { if (r.out[tag][t] !== W[tag][t]) bad.push(tag + ' ' + t + '：' + r.out[tag][t] + ' ≠ ' + W[tag][t]); }));
      /* 真实点击：导入自家导出（pyq-intent=kids）的 MusicXML，做法「配钢琴伴奏」→ pacc；「按原文件」→ kids */
      const xml = await pg.evaluate(() => { const s = NWB.build('J', { title: '真导入', nMea: 4 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 2, 3, 5][i % 4]; c.lyrics = ['啦']; })); s.intent = 'kids'; return exportMusicXML(s); });
      const ui = {};
      for (const tg of ['acc', 'orig']) {
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} });
        await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
        await pg.setInputFiles('#nw-anyfile', { name: '真导入.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
        await pg.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 8000 });
        await pg.click('#nf-tg-' + tg); await pg.waitForTimeout(300);
        await pg.click('#nf-impgo'); await pg.waitForFunction(() => !document.querySelector('.nf-modal'), null, { timeout: 8000 }); await pg.waitForTimeout(250);
        ui[tg] = await pg.evaluate(() => [song.intent || '∅', NWB.stackOf(song)]);
      }
      T(r.targets.join() === 'orig,J,SJ,acc,JT,CJ' && !bad.length && r.mi === '∅' && ui.acc.join() === 'pacc,JG' && ui.orig.join() === 'kids,J',
        'D6 从已有音乐 6 种做法：配钢琴伴奏 pacc · 五线＋简谱对照 teach · 吉他弹唱 gtr · 功能谱 chord；按原文件 / 转成简谱不写（第三方文件没有、自家导出的 pyq-intent 保留）；真实点击导入同口径；MIDI 导入不写',
        JSON.stringify({ bad, mi: r.mi, ui, targets: r.targets }));
    });

    /* ================= D7 搜索词 ================= */
    await guard('D7', async () => {
      const g = q => { const r = PZQ.parse(q); return [r.words, r.pz, r.sub, r.inst, r.key, r.keySort].join('|'); };
      const CASES = [['竖笛', '|||recorder||'], ['直笛', '|||recorder||'], ['口风琴', '|||melodica||'], ['陶笛', '|||ocarina||'], ['箫', '|||xiao||'], ['洞箫 春江花月夜', '春江花月夜|||xiao||'],
        ['大提琴', '|||cello||'], ['单簧管', '|||clarinet||'], ['黑管', '|||clarinet||'], ['大提琴五线谱', '|wuxian|qiyue|cello||'], ['箫简谱', '|jianpu|qiyue|xiao||'],
        ['G调箫', '|||xiao||G'], ['C调陶笛', '|||ocarina||C'], ['降B调单簧管', '|||clarinet||Bb'], ['竖笛 F调', '|||recorder||F'], ['大提琴 C调', '|||cello|C|'],
        ['笛箫', '|||dizi||'], ['F调巴乌', '|||||F'], ['C调葫芦丝', '|||hulusi||C'], ['二胡曲谱大全', '|||erhu||']];
      const bad = CASES.filter(([q, w]) => g(q) !== w).map(([q, w]) => q + '：' + g(q) + ' ≠ ' + w);
      /* 真服务端（D4 那一会话已发布 6 种新乐器各一首）：?q= 解析出乐器并按乐器筛到 */
      const S = {};
      if (srv) for (const [q, ik] of [['大提琴', 'cello'], ['黑管', 'clarinet'], ['洞箫', 'xiao'], ['C调陶笛', 'ocarina'], ['竖笛', 'recorder'], ['口风琴', 'melodica']]) {
        const rr = await hreq('GET', '/api/pub/scores?q=' + encodeURIComponent(q)), j = rr.j || {};
        S[q] = { st: rr.status, inst: j.parse && j.parse.inst, ids: (j.scores || []).filter(c => /^v700dik/.test(c.id)).map(c => c.inst) };
        if (rr.status !== 200 || !j.parse || j.parse.inst !== ik || !S[q].ids.length || S[q].ids.some(x => x !== ik)) bad.push('服务端 ' + q + '：' + JSON.stringify(S[q]));
      } else bad.push('服务端没起来');
      T(!!PZQ && !bad.length, 'D7 搜索词：竖笛 / 直笛 / 口风琴 / 陶笛 / 箫 / 洞箫 / 大提琴 / 单簧管 / 黑管 → 6 种新乐器；箫 / 陶笛 / 竖笛 / 单簧管的调只排序（大提琴的调照旧筛）、笛箫仍笛子、巴乌照旧只认调；真服务端 ?q= 解析出乐器并只筛出该乐器',
        JSON.stringify(bad.slice(0, 8)));
    });

    await pg._ctx.close();
  } catch (e) {
    T(false, '运行异常', String(e && e.stack || e).slice(0, 400));
  } finally {
    try { if (srv) srv.p.kill(); } catch (_) {}
    await b.close();
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
    if (!WRITE) {
      const pe = errs.filter(e => !/ResizeObserver|favicon|net::ERR/.test(e));
      if (pe.length) console.log('页面错误：' + pe.slice(0, 5).join(' | '));
      console.log('\n' + pass + '/' + total + ' 通过');
      process.exit(pass === total && total > 0 ? 0 : 1);
    }
  }
})();
