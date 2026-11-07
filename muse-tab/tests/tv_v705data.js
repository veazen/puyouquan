/* v70.5 A 组（规格 docs/spec-2026-11-v705.md §1–§3、§8、§10.3「tv_v705data」）：同谱表双声部的数据层——字段与清洗、改声部路径、谱表级同步、伴奏拒绝、分谱、分类、
   旧版本（v70.4 页面）编辑后再开、旧版回落剥字段、无层谱零差异。浏览器侧（真实编辑器）补 api/kindname.test.js 的 node 侧。
   G0 计数闸（§0.13）：三个主 grep（N voxNotations||[])[ · B type==='brace' · L voxVoices||[]).length）在 index.html 的行数 ≤ fixtures/v705_grep.json；
      共享段两份（index.html 与 api/kindname.js 的 @pq-kindname 段）B / L 行数相等且＝夹具 shared；allow 的锚点各只出现一次；
      16 预设、21 示例、曲库种子的歌曲数据里没有叫 hid / voxLayer / lay 的键（SAN_NUM 按键名全局生效）
   D  字段与清洗（§1.2 / §1.3 / §1.7）：SAN_NUM / SD_NUM 含三键；"1"→1；合法分层谱经 normalizeSongFields / sanitizeUntrusted / migrate 逐字节不变；
      migrate 只删长度失配（含非数组）的 voxLayer 与全部见证，记谱法 / 八度 / 移调不一致、缺见证的原样留；
      hid 不变式：键盘录入 / 按时值粘贴 / 任意 mutate 写了音之后被清扫、再删回休止是普通休止；改时值命令（单格 / 选区批量 / 附点 / 联动邻格 / 增时线）删所改列的 hid
   S  改声部路径（§3）：§3.2 表 9 个用例（voxMetaSplice / voxMetaV，每例连带断言见证只在 voxLayer=1 的行上）＋真实路径：加旋律轨（末尾追加、旋律带层时插在钢琴前、
      左手带层时仍插在钢琴前、addLyrVoice 同）、插入点顺延 voxInsAt、删宿主（层转独立）、删层（钢琴谱 delVoiceAt 放行，宿主仍拒删）、失配数组改声部时收掉、
      上限按谱表计（层不占 MAX_VOICES，总轨数照数）、配伴奏重排（restruct 收掉残留）、换谱类直接换 / 重建（[S,A(层),B]→SG 行数不变）/ 另建一份、配伴奏新窗口产物
   Y  谱表级同步（§1.4）：记谱法 / 谱号（含男高音）/ 移调 / 简谱对照，从宿主、从层各点一次，两行同值、一步撤销；新外壳音轨树「谱号 / 对照」同；
      R-clef / R-ott 按起拍对齐的正反例与清除、层行上标反向同步；新外壳层行提示条 data-k=sync、宿主行不出、旧外壳不出；
      反例：一致对不成立（八度谱号不同的旧链接、staff＋bass）不联动；宿主与层一起切简谱再切回五线谱，层恢复
   C  伴奏取行（§3.6）：伴奏单元（右手 / 左手谱表）带层 → accTexRows null、accFillable false、accRowsUsed []；旋律单元带层 → 织体 / 填进当前谱写进映射后的行，层行不动
   P  分谱（§8）：钢琴独奏带层＝单演奏者；闭合 SATB＝4 choir＋2 merge；小提琴带层＝单演奏者；有词二重唱同谱表＝2 份 voice；器乐层随宿主同一份；
      抽出的层份无 voxLayer、无 hid；合并份 / 器乐单元份保留 voxLayer 与 hid
   K  分类（编辑器侧）：分层夹具的编辑器谱名（NWB.kindOfSong）＝服务端 pubNameOf、谱类 docType＝pubKindOf.type；音轨图标 trkInstOf 按单元（旋律单元的层不是钢琴）
   O  v70.4 页面编辑后再开（§1.9 / D-15，十种路径）：基线页（git show 579ada0）上做「末尾加轨 · 删宿主 · 插行 · 改宿主谱号 · 删一行再加一行 · 加一行再删一行 ·
      换谱类重建 · 换谱类另建一份 · 配伴奏新窗口 · →钢琴伴奏直接换」后的谱（--write-base 时生成进 fixtures/v705data_base.json，CI 读文件），用新版打开：
      退回独立谱表或挂对（每个生效层都挂在原来的宿主名上）、不抛、音符完整
   R  旧版回落（STRIP705：删 voxLayer、hid、mixer 的 lay）：多出一行谱表、音符完整、hid 处是普通休止；有显式分组的分层谱离屏谱面＝剥字段后的谱面（v70.5 谱面零改动，D-5）
   Z  零差异：无层谱（16 预设＋21 示例）载入后 JSON、MusicXML、MIDI 字节、播放事件与基线 579ada0 相等（摘要在 fixtures/v705data_base.json）；
      离屏谱面在拿得到基线页时（本机有 git 历史）逐份对拍，CI 浅克隆没有基线页时由 tv_inplace Z / tv_parts PAZ / tv_pgbrk 的基线对拍兜底（本段不计数）
   修前红：MUSETAB_URL=file://<git show a73fecc:muse-tab/index.html 的副本> MUSETAB_API=<a73fecc 的 api/kindname.js 所在目录>/kindname.js 复跑——G0 以外各段都有红。
   基线：node tv_v705data.js --write-base 用 git show 579ada0（线上 v70.4）的 muse-tab/index.html 生成 fixtures/v705data_base.json（O 段旧页面产物、Z 段摘要）。
   env：MUSETAB_URL 编辑器、MUSETAB_API 服务端 kindname.js（默认仓库 api/kindname.js）、CHROMIUM_PATH、ONLY=G0,D,S… 只跑部分段。 */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const WRITE = process.argv.includes('--write-base');
const BASE_COMMIT = '579ada0ea545da67b2a8c24001b62e483c003394';
const BASE_F = path.join(__dirname, 'fixtures/v705data_base.json');
const GREP_F = path.join(__dirname, 'fixtures/v705_grep.json');
const toFile = u => (u || '').startsWith('file://') ? u.slice(7) : u;
const ED = process.env.MUSETAB_URL ? toFile(process.env.MUSETAB_URL) : path.resolve(__dirname, '../index.html');
const API_KN = process.env.MUSETAB_API ? path.resolve(process.env.MUSETAB_API) : path.join(ROOT, 'api/kindname.js');
const K = require(API_KN);
const SD = (() => { try { return require(path.join(path.dirname(API_KN), 'scoredata.js')); } catch (_) { return require(path.join(ROOT, 'api/scoredata.js')); } })();
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(x => x.trim())) : null;
const on = k => !ONLY || ONLY.has(k);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pyq_v705d_'));
const gitShow = p => execFileSync('git', ['show', BASE_COMMIT + ':' + p], { cwd: ROOT, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
const BASE_ED = (() => { try { const f = path.join(TMP, 'v704.html'); fs.writeFileSync(f, gitShow('muse-tab/index.html')); return f; } catch (_) { return null; } })();
const BASE = WRITE ? null : (() => { try { return JSON.parse(fs.readFileSync(BASE_F, 'utf8')); } catch (_) { return null; } })();

let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d && !ok ? ': ' + String(d).slice(0, 900) : '')); };
const errs = [];
const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name + '（运行异常）', String(e && e.stack || e).slice(0, 500)); } };
const J = x => JSON.stringify(x);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ---------- 夹具：分层谱（names 声部名、nota 记谱法、lay＝voxLayer（undefined＝不写键）、o 覆盖顶层字段、ly 有词的行） ----------
   每行 2 小节 × 4 个四分（宿主：1 2 3 4 级；层：5 · 隐形休止 · 6 · 隐形休止），低音谱表行 oct −1；见证 mixer['vox:i'].lay=1 写在 lay[i]===1 的行（o.w 指定行、o.w=[] 不写） */
const C = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
function LV(names, nota, lay, o, ly) {
  o = Object.assign({}, o); const w = o.w; delete o.w; ly = ly || [];
  const wr = w || (Array.isArray(lay) ? lay.map((x, i) => (x === 1 ? i : -1)).filter(i => i >= 0) : []);
  const isL = i => Array.isArray(lay) && lay[i] === 1;
  const row = (i, mi) => { const oc = nota[i] === 'bass' ? -1 : 0, L = ly.includes(i) ? ['啊'] : [];
    if (isL(i)) return [C(5, 4, { oct: oc, lyrics: L.slice() }), C(0, 4, { hid: 1 }), C(6, 4, { oct: oc, lyrics: L.slice() }), C(0, 4, { hid: 1 })];
    return [1, 2, 3, 4].map(d => C(((d + i + mi) % 7) + 1, 4, { oct: oc, lyrics: L.slice() })); };
  const mixer = {}; names.forEach((_, i) => { mixer['vox:' + i] = { on: true, solo: false, inst: o.inst0 || 'piano', vol: 1, pan: null }; if (wr.includes(i)) mixer['vox:' + i].lay = 1; });
  delete o.inst0;
  const d = { v: 3, title: '分层夹具', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: names.slice(), voxNotations: nota.slice(), lyricLines: ly.length ? 1 : 0, customChords: {}, mixer,
    measures: [0, 1].map(mi => ({ tabs: [], voxes: names.map((_, i) => row(i, mi)), repeatStart: false, repeatEnd: false })) };
  if (lay !== undefined) d.voxLayer = lay;
  return Object.assign(d, o);
}
const BC = (a, b) => ({ type: 'brace', from: a, to: b }), BR = (a, b) => ({ type: 'bracket', from: a, to: b });
const ST2 = ['staff', 'staff'], ST3 = ['staff', 'staff', 'staff'], ACS = ['staff', 'staff', 'staff', 'bass'];
const FX = {
  pno: () => LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(0, 2)], instKey: 'piano' }),
  pno4: () => LV(['右手', '右手·2', '左手', '左手·2'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1], { voxGroups: [BC(0, 3)] }),
  vn: () => LV(['小提琴', '小提琴·2'], ST2, [null, 1], { instKey: 'violin', inst0: 'violin' }),
  vnfl: () => LV(['小提琴', '小提琴·2', '长笛'], ST3, [null, 1, null], { inst0: 'violin' }),
  satb: () => LV(['S', 'A', 'T', 'B'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1], { voxGroups: [BR(0, 3)], inst0: 'ah' }, [0, 1, 2, 3]),
  duet: () => LV(['女高', '女低'], ST2, [null, 1], { inst0: 'ah' }, [0, 1]),
  accMel: () => LV(['旋律', '旋律·2', '右手伴奏', '左手伴奏'], ACS, [null, 1, null, null], { voxGroups: [BC(2, 3)] }),
  accRH: () => LV(['旋律', '右手伴奏', '右手伴奏·2', '左手伴奏'], ACS, [null, null, 1, null], { voxGroups: [BC(1, 3)] }),
  accLH: () => LV(['旋律', '右手伴奏', '左手伴奏', '左手伴奏·2'], ['staff', 'staff', 'bass', 'bass'], [null, null, null, 1], { voxGroups: [BC(1, 3)] }),
};
/* 剥字段（STRIP705，仿 tv_v698nota STRIP698）：删 voxLayer、列上的 hid、mixer 的 lay——等于 v70.4 看到的谱 */
const STRIP705 = s0 => { const s = JSON.parse(J(s0)); delete s.voxLayer;
  if (s.mixer && typeof s.mixer === 'object') Object.values(s.mixer).forEach(e => { if (e && typeof e === 'object') delete e.lay; });
  (s.measures || []).forEach(m => ((m && m.voxes) || []).forEach(cols => (cols || []).forEach(c => { if (c) delete c.hid; })));
  return s; };
const keysIn = (x, set, out, p) => { if (!x || typeof x !== 'object') return out; for (const k of Object.keys(x)) { if (set.has(k)) out.push((p || '') + '.' + k); keysIn(x[k], set, out, (p || '') + '.' + k); } return out; };

/* ---------- 页面 ---------- */
const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.guardReplace = p => p();
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; render(); return true; };
  window.__J = x => JSON.stringify(x);
  window.__S = () => JSON.parse(JSON.stringify(song));
  window.__lay = s => Object.keys((s || song).mixer || {}).filter(k => (s || song).mixer[k] && typeof (s || song).mixer[k] === 'object' && 'lay' in (s || song).mixer[k]).sort();
  window.__ok = s => { try { return PQ_KIND.voxLayerOk(s || song); } catch (e) { return 'ERR:' + e.message; } };
  window.__play = () => { const rec = []; const o = { p: window.playInst, c: window.chick, h: window.percHit, m: window.metroClick };
    const R = x => Math.round(x * 1e6) / 1e6;
    window.playInst = (k, c, b2, f, w, ring, g, mute) => rec.push(['p', f, w, ring, g, !!mute]);
    window.chick = (c, b2, w, g) => rec.push(['c', 0, w, 0, g, false]);
    window.percHit = (c, b2, w, ty, g) => rec.push(['h', 0, w, 0, g, false]);
    window.metroClick = (c, b2, w, a, s2) => rec.push(['m', 0, w, 0, s2 || 0, !!a]);
    let t0 = 0;
    try { sel.mi = 0; sel.ci = 0; play(); t0 = audio.prog ? audio.prog.t : 0;
      const S = audio.schedQ; if (S) S.q.slice(S.i).forEach(ev => { const a = ev.a;
        if (ev.k === 'playInst') rec.push(['p', a[3], a[4], a[5], a[6], !!a[7]]);
        else if (ev.k === 'chick') rec.push(['c', 0, a[2], 0, a[3], false]);
        else if (ev.k === 'percHit') rec.push(['h', 0, a[2], 0, a[4], false]);
        else rec.push(['m', 0, a[2], 0, a[4] || 0, !!a[3]]); }); }
    finally { stopPlay(); window.playInst = o.p; window.chick = o.c; window.percHit = o.h; window.metroClick = o.m; }
    /* 集成修：全键排序（时间 · 音高 · 种类 · 余音 · 增益 · 闷音）。同一时刻同音高的两个事件（如 #4 小星星（尤克里里）第 1.8 拍两个 G4）此前次序不定——
       哪些事件在 play() 里直接发出、哪些还留在排程队列里随泵定时器的时序变，平票后的次序跟着变，Z1 偶发红（单跑 2 次红 1 次） */
    return rec.map(r => [r[0], r[1] ? R(69 + 12 * Math.log2(r[1] / 440)) : 0, R(r[2] - t0), R(r[3]), R(r[4]), r[5]])
      .sort((a, b) => a[2] - b[2] || a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0) || a[3] - b[3] || a[4] - b[4] || (a[5] === b[5] ? 0 : a[5] ? 1 : -1)); };
  window.__b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  window.__exp = s => { const o0 = song; try { const m = migrate(JSON.parse(JSON.stringify(s))); const r = exportMIDI(m); return { mid: window.__b64(r.bytes || r), mxl: exportMusicXML(migrate(JSON.parse(JSON.stringify(s)))) }; } finally { song = o0; } };
  window.__off = s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); let h = null;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { svg.remove(); }
    return h; };
  window.__toastK = () => { const t = document.getElementById('toast'); return t ? { k: t.dataset.k || '', t: t.textContent || '' } : null; };
};
async function openEditor(b, file, q) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + file + (q || '')); await pg.waitForTimeout(1200);
  await pg.evaluate(HELP);
  await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} });
  pg._ctx = ctx; return pg;
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg);
const wait = (pg, ms) => pg.waitForTimeout(ms);

/* ========== O 段：v70.4 页面上的十种编辑（--write-base 时在基线页上跑；产物写进 fixtures/v705data_base.json） ========== */
const O_CASES = [
  /* [名, 起始谱, 页面里的操作（旧页面上执行，返回 {song} 或 {song, nw:新窗口的谱}）, 生效层期望挂的「层名→宿主名」] */
  ['末尾加轨', 'vn', 'addVoice("vox")'],
  ['删宿主', 'vnfl', 'delVoiceAt("vox", 0)'],
  ['插行（旋律＋钢琴伴奏加旋律轨插在钢琴前）', 'accMel', 'addVoice("vox")'],
  ['改宿主谱号', 'vn', 'voxClefSet(0, "bass")'],
  ['删一行再加一行', 'satb', 'delVoiceAt("vox", 0); addVoice("vox")'],
  ['加一行再删一行', 'satb', 'addVoice("vox"); delVoiceAt("vox", 0)'],
  ['换谱类重建', 'satbEmpty', 'mutate(()=>{ const ns=lbRebuild(song, "SG"); Object.keys(song).forEach(k=>{ delete song[k]; }); Object.assign(song, ns); })'],
  ['换谱类另建一份', 'vnSG', 'window.__nw = lbCopy(song, "SG")'],
  ['配伴奏新窗口', 'vn3', 'window.__nw = arrangeAccompaniment(song, {suggest:true}).song'],
  ['→钢琴伴奏直接换', 'vn3', 'mutate(()=>{ lbApplyDirect(song, "S", "SG"); })'],
];
const O_SRC = {
  vn: FX.vn, vnfl: FX.vnfl, accMel: FX.accMel, satb: FX.satb,
  satbEmpty: () => { const s = LV(['S', 'A', 'B'], ['staff', 'staff', 'bass'], [null, 1, null]); s.measures.forEach(m => m.voxes.forEach(cols => cols.forEach(c => { c.deg = 0; c.oct = 0; delete c.hid; }))); return s; },   /* 空谱（lbAllBare：八度 0）＝换谱类走重建 */
  vnSG: () => LV(['旋律', '旋律·2'], ST2, [null, 1]),
  vn3: () => LV(['旋律', '旋律·2', '长笛'], ST3, [null, 1, null]),
};
async function oRun(pg) {
  const out = [];
  for (const [name, src, op] of O_CASES) {
    const s0 = O_SRC[src]();
    const r = await EV(pg, ({ s0, op }) => { try { __ld(s0); window.__nw = null; (0, eval)(op); return { song: JSON.parse(JSON.stringify(song)), nw: window.__nw ? JSON.parse(JSON.stringify(window.__nw)) : null }; }
      catch (e) { return { err: String(e && e.message || e) }; } }, { s0, op });
    out.push({ name, src, s0, r });
  }
  return out;
}

/* Z 段摘要：在一个新开、没做过别的事的页面上跑（播放事件读本机偏好与混音状态，前面的段改过会带偏） */
async function zRun(b, file) {
  const pg = await openEditor(b, file);
  const songs = await EV(pg, () => EXAMPLES.map((p, i) => ({ name: (i < 16 ? '预设' : '示例') + i + '·' + p.name, data: p.make() })));
  const Z = {};
  /* 载入后等音色解码等异步收尾（实测不等的话，前一首谱触发的异步解码会让后一首六线谱的发声时长随时序变）再取摘要 */
  for (const x of songs) {
    await EV(pg, s => { __ld(s); }, x.data); await wait(pg, 400);
    const r = await EV(pg, s => { const j = JSON.stringify(song); const e = __exp(s); return { j, mid: e.mid, mxl: e.mxl, play: JSON.stringify(__play()) }; }, x.data);
    await wait(pg, 400);
    Z[x.name] = { json: sha(r.j), mid: sha(r.mid), mxl: sha(r.mxl), play: sha(r.play) };
  }
  await pg._ctx.close();
  return { songs, Z };
}

/* ========== --write-base ========== */
async function writeBase(b) {
  if (!BASE_ED) throw new Error('拿不到基线页 git show ' + BASE_COMMIT);
  const pg = await openEditor(b, BASE_ED);
  const O = await oRun(pg);
  await pg._ctx.close();
  const { Z } = await zRun(b, BASE_ED);
  fs.writeFileSync(BASE_F, JSON.stringify({ commit: BASE_COMMIT, note: '由 node tv_v705data.js --write-base 用 git show ' + BASE_COMMIT.slice(0, 7) + ':muse-tab/index.html（线上 v70.4）生成：O＝旧页面编辑后的谱，Z＝无层谱的载入 JSON / MIDI / MusicXML / 播放事件摘要；CI 直接读本文件', O, Z }));
  console.log('写入 ' + path.relative(ROOT, BASE_F) + '：O ' + O.length + ' 例（出错 ' + O.filter(x => x.r.err).length + '）· Z ' + Object.keys(Z).length + ' 份');
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    if (WRITE) { await writeBase(b); return; }
    const html = fs.readFileSync(ED, 'utf8');

    /* ================= G0 计数闸 ================= */
    if (on('G0')) await guard('G0', async () => {
      const G = JSON.parse(fs.readFileSync(GREP_F, 'utf8')), kn = fs.readFileSync(API_KN, 'utf8');
      const cut = s => { const a = s.indexOf('/* @pq-kindname begin'), e = s.indexOf('/* @pq-kindname end */'); return a >= 0 && e > a ? s.slice(a, e) : ''; };
      const cnt = (s, pat) => s.split('\n').filter(l => l.includes(pat)).length;
      const got = {}, shH = {}, shK = {};
      for (const k of ['N', 'B', 'L']) { got[k] = cnt(html, G.patterns[k]); shH[k] = cnt(cut(html), G.patterns[k]); shK[k] = cnt(cut(kn), G.patterns[k]); }
      const over = ['N', 'B', 'L'].filter(k => got[k] > G[k]);
      T(!over.length, 'G0a 三个主 grep 行数不超过 v705_grep.json（N ' + got.N + '≤' + G.N + ' · B ' + got.B + '≤' + G.B + ' · L ' + got.L + '≤' + G.L + '）',
        '增加了：' + over.join(',') + '——新增的一行在规格 §0 清单补结论后，把 ref 与 allow 一起改');
      T(['N', 'B', 'L'].every(k => shH[k] === shK[k] && shH[k] === G.shared[k]), 'G0b 共享段两份行数相等且＝夹具 shared（' + J(shH) + '）', J({ shH, shK, ref: G.shared }));
      const badA = [];
      for (const k of ['N', 'B', 'L']) for (const a of (G.allow[k] || [])) {
        const n1 = html.split(a.anchor).length - 1; if (n1 !== 1) badA.push(k + ' ' + a.fn + ' 在 index.html 出现 ' + n1 + ' 次');
        if (a.shared !== false && cut(html).includes(a.anchor)) { const n2 = kn.split(a.anchor).length - 1; if (n2 !== 1) badA.push(k + ' ' + a.fn + ' 在 kindname.js 出现 ' + n2 + ' 次'); }
        if (!a.anchor.includes(G.patterns[k])) badA.push(k + ' ' + a.fn + ' 锚点不含模式');
      }
      T(!badA.length, 'G0c allow 的锚点（' + ['N', 'B', 'L'].map(k => (G.allow[k] || []).length).join(' / ') + '）各只出现一次、含所记模式', badA.join('；'));
    });

    const pg = await openEditor(b, ED);
    const hasFn = await EV(pg, () => typeof PQ_KIND.voxLayerOk === 'function' && typeof voxStaffRows === 'function');

    if (on('G0')) await guard('G0d', async () => {
      const set = new Set(['hid', 'voxLayer', 'lay']);
      const pre = await EV(pg, () => EXAMPLES.map((p, i) => ({ name: (i < 16 ? '预设' : '示例') + i, data: p.make() })));
      const lib = JSON.parse(fs.readFileSync(path.join(ROOT, 'api/seed-library.json'), 'utf8'));
      const hits = [];
      pre.forEach(x => { const k = keysIn(x.data, set, []); if (k.length) hits.push(x.name + ':' + k.slice(0, 3).join(',')); });
      lib.forEach(x => { const k = keysIn(x.data, set, []); if (k.length) hits.push(x.id + ':' + k.slice(0, 3).join(',')); });
      T(pre.length === 21 && lib.length >= 10 && !hits.length, 'G0d 16 预设＋21 示例＋曲库种子 ' + lib.length + ' 首的歌曲数据里没有叫 hid / voxLayer / lay 的键（SAN_NUM 按键名全局生效，碰不到既有数据）', J({ n: pre.length, hits }));
    });

    /* ================= D 字段与清洗 ================= */
    if (on('D')) await guard('D', async () => {
      const r = await EV(pg, FXp => {
        const out = {};
        out.san = ['voxLayer', 'hid', 'lay'].map(k => SAN_NUM.has(k));
        const s = FXp; const j = JSON.stringify(s);
        out.norm = JSON.stringify(normalizeSongFields(JSON.parse(j))) === j;
        out.sanU = JSON.stringify(sanitizeUntrusted(JSON.parse(j))) === j;
        out.mig = JSON.stringify(migrate(JSON.parse(j))) === j;
        const str = JSON.parse(j); str.voxLayer = str.voxLayer.map(x => x === 1 ? '1' : x); str.mixer['vox:1'].lay = '1'; str.measures[0].voxes[1][1].hid = '1';
        out.str1 = JSON.stringify(migrate(normalizeSongFields(str))) === j;
        return out;
      }, FX.pno());
      T(r.san.every(Boolean) && ['voxLayer', 'hid', 'lay'].every(k => SD.SD_NUM.has(k)), 'D1 SAN_NUM / SD_NUM 都登记 voxLayer / hid / lay', J(r.san));
      T(r.norm && r.sanU && r.mig && r.str1, 'D2 合法分层谱经 normalizeSongFields / sanitizeUntrusted / migrate 逐字节不变；"1" 串规整成 1 后＝原谱', J(r));
      /* migrate：只删长度失配 / 非数组（连同全部见证）；其余不成立的原样留 */
      const cases = [
        ['长度长', s => { s.voxLayer = [null, 1, null, null]; }, true], ['长度短', s => { s.voxLayer = [null, 1]; }, true], ['非数组', s => { s.voxLayer = { 1: 1 }; }, true],
        ['null', s => { s.voxLayer = null; }, true],
        ['记谱法不一致', s => { s.voxNotations = ['staff', 'bass', 'bass']; }, false], ['八度谱号不一致', s => { s.voxClefOct = [null, -1, null]; }, false],
        ['移调不一致', s => { s.voxTransp = [-2, null, null]; }, false], ['缺见证', s => { delete s.mixer['vox:1'].lay; }, false], ['值是 true', s => { s.voxLayer = [null, true, null]; }, false],
      ];
      const bad = [];
      for (const [nm, f, drop] of cases) {
        const s = FX.pno(); f(s); s.mixer['vox:2'].lay = 1;   /* 再放一个错位的见证：失配时也得删 */
        const m = await EV(pg, x => JSON.parse(JSON.stringify(migrate(JSON.parse(JSON.stringify(x))))), s);
        const lays = Object.keys(m.mixer).filter(k => 'lay' in m.mixer[k]);
        if (drop && ('voxLayer' in m || lays.length)) bad.push(nm + ' 没删：' + J([m.voxLayer, lays]));
        if (!drop && (J(m.voxLayer) !== J(s.voxLayer) || J(m.mixer) !== J(s.mixer) || J(m.voxNotations) !== J(s.voxNotations))) bad.push(nm + ' 被改了');
      }
      T(!bad.length, 'D3 migrate 只删长度失配 / 非数组的 voxLayer 与全部见证；记谱法 / 八度 / 移调不一致、缺见证、坏值的原样留（宿主切回来能复原）', bad.join('；'));
      /* hid 不变式：键盘录入、按时值粘贴、任意 mutate 写了音 → 清扫；再删回休止＝普通休止 */
      const h = await EV(pg, s => {
        const o = {}; const at = (vi, mi, ci) => song.measures[mi].voxes[vi][ci];
        __ld(s); sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; clampSel(); render();
        inputDigit(3); o.key = { deg: at(1, 0, 1).deg, hid: 'hid' in at(1, 0, 1) };
        sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; inputDigit(0); o.key0 = { deg: at(1, 0, 1).deg, hid: 'hid' in at(1, 0, 1) };
        __ld(s); pstPasteTimed('vox', 1, 0, 3, [{ dur: 4, dotted: false, deg: 4, acc: '', oct: 0, lyrics: [], tie: false }], false, '');
        o.paste = { deg: at(1, 0, 3).deg, hid: 'hid' in at(1, 0, 3) };
        __ld(s); mutate(() => { song.measures[1].voxes[1][1].deg = 2; }); o.any = 'hid' in at(1, 1, 1);
        mutate(() => { song.measures[1].voxes[1][1].deg = 0; }); o.anyBack = 'hid' in at(1, 1, 1);
        o.keep = 'hid' in at(1, 1, 3) && at(1, 1, 3).hid === 1;   /* 没动的隐形休止留着 */
        return o;
      }, FX.vn());
      T(h.key.deg === 3 && !h.key.hid && h.key0.deg === 0 && !h.key0.hid && h.paste.deg === 4 && !h.paste.hid && !h.any && !h.anyBack && h.keep,
        'D4 hid 不变式（D-17）：键盘录入 / 按时值粘贴 / 任意 mutate 写了音之后 hid 被清扫，再删回休止是普通休止；没动的隐形休止留着', J(h));
      const d = await EV(pg, s => {
        const o = {}; const col = (mi, ci) => song.measures[mi].voxes[1][ci];
        __ld(s); sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; setDur(8); o.setDur = 'hid' in col(0, 1) || col(0, 2).hid === 1 && col(0, 2).deg === 0 && col(0, 2).dur === 8;
        __ld(s); sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; toggleDot(); o.dot = 'hid' in col(0, 1);
        __ld(s); sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; toggleDot(); o.link = 'hid' in col(0, 1);   /* 附点联动邻格（dotLink 改了第 1 列的时值） */
        __ld(s); selRange = { row: 'vox', vi: 1, m1: 1, c1: 1, m2: 1, c2: 3 }; setDur(8); o.batch = song.measures[1].voxes[1].some(c => 'hid' in c);
        /* 增时线：层行改成「5 · 隐形休止 · 空休止 · 空休止」，延长第 1 列（吸收第 2 列）；缩短第 2 小节的隐形二分休止 */
        const s2 = JSON.parse(JSON.stringify(s)); s2.measures[0].voxes[1] = [s.measures[0].voxes[1][0], { dur: 4, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [], tie: false, hid: 1 },
          { dur: 4, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [], tie: false }, { dur: 4, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [], tie: false }];
        s2.measures[1].voxes[1] = [{ dur: 2, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [], tie: false, hid: 1 }, { dur: 2, dotted: false, deg: 5, acc: '', oct: 0, lyrics: [], tie: false }];
        __ld(s2); sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; extendBeat_(1); o.ext2 = { dur: col(0, 1).dur, hid: 'hid' in col(0, 1) };
        __ld(s2); sel = { mi: 1, row: 'vox', vi: 1, ci: 0, si: 1 }; extendBeat_(-1); o.ext = { dur: col(1, 0).dur, hid: 'hid' in col(1, 0), n: song.measures[1].voxes[1].length };
        return o;
      }, FX.vn());
      T(!d.setDur && !d.dot && !d.link && !d.batch && d.ext2.dur === 2 && !d.ext2.hid && d.ext.dur === 4 && !d.ext.hid && d.ext.n === 3, 'D5 改时值命令删所改列的 hid：单格改时值（补出的休止不带 hid）、附点、附点联动的邻格、选区批量改时值、增时线延长', J(d));
    });

    /* ================= S 改声部路径 ================= */
    if (on('S')) await guard('S', async () => {
      /* §3.2 表：在 voxMetaSplice / voxMetaV 上直接跑（调用约定同现行：voxVoices 已增删完） */
      const TB = [
        ['层之后插行', ['A', 'A·2', 'B'], [null, 1, null], [1], 'ins', 2, [null, 1, null, null], ['vox:1']],
        ['宿主与层之间硬插（调用方没顺延）', ['A', 'A·2', 'B'], [null, 1, null], [1], 'ins', 1, undefined, []],
        ['删宿主', ['P', 'A', 'A·2'], [null, null, 1], [2], 'del', 1, undefined, []],
        ['删首行宿主', ['A', 'A·2', 'B'], [null, 1, null], [1], 'del', 0, undefined, []],
        ['删层', ['A', 'A·2', 'B', 'B·2'], [null, 1, null, 1], [1, 3], 'del', 1, [null, null, 1], ['vox:2']],
        ['删宿主前面的行', ['X', 'A', 'A·2'], [null, null, 1], [2], 'del', 0, [null, 1], ['vox:1']],
        ['末尾追加（voxMetaV 路径）', ['A', 'A·2'], [null, 1], [1], 'app', 2, [null, 1, null], ['vox:1']],
        ['原本失配', ['A', 'A·2', 'B'], [null, 1], [1], 'app', 3, undefined, []],
        ['坏数据链', ['A', 'A·2', 'A·3'], [null, 1, 1], [1, 2], 'del', 1, undefined, []],
      ];
      const bad = [];
      for (const [nm, names, lay, w, op, at, want, wantW] of TB) {
        const s = LV(names, names.map(() => 'staff'), lay, { w });
        const r = await EV(pg, ({ s, op, at }) => {
          const n = s.voxVoices.length;
          if (op === 'ins') { s.voxVoices.splice(at, 0, '新'); s.measures.forEach(m => m.voxes.splice(at, 0, [])); voxMetaSplice(s, at, 0, 1, 'staff'); }
          else if (op === 'del') { s.voxVoices.splice(at, 1); s.measures.forEach(m => m.voxes.splice(at, 1)); voxMetaSplice(s, at, 1, 0); }
          else { s.voxVoices.push('新'); s.measures.forEach(m => m.voxes.push([])); voxMetaV(s, n, 0, 1); voxLayWSync(s); }
          return { lay: s.voxLayer, w: __lay(s), n: s.voxVoices.length };
        }, { s, op, at });
        if (J(r.lay) !== J(want) || J(r.w) !== J(wantW)) bad.push(nm + '：' + J(r) + ' ≠ ' + J([want, wantW]));
      }
      T(!bad.length, 'S1 §3.2 表 9 例（层之后插行 / 硬插 / 删宿主 / 删首行宿主 / 删层 / 删宿主前面的行 / 末尾追加 / 原本失配 / 坏数据链）：voxLayer 结果对、见证只在 voxLayer=1 的行上', bad.join('；'));

      /* 真实路径 */
      const p = await EV(pg, FXs => {
        const o = {};
        const names = () => song.voxVoices.slice();
        /* 末尾追加（非伴奏谱） */
        __ld(FXs.vn); addVoice('vox'); o.app = { names: names(), lay: song.voxLayer, w: __lay(), ok: __ok() };
        /* 旋律带层的伴奏歌谱：加旋律轨插在钢琴前，层仍挂旋律 */
        __ld(FXs.accMel); addVoice('vox'); o.mel = { names: names(), lay: song.voxLayer, w: __lay(), ok: __ok(), g: song.voxGroups };
        /* 左手带层：加旋律轨仍插在钢琴前（accStackRows 不拒绝带层），层仍挂左手 */
        __ld(FXs.accLH); addVoice('vox'); o.lh = { names: names(), lay: song.voxLayer, w: __lay(), ok: __ok(), g: song.voxGroups };
        __ld(FXs.accLH); const at = addLyrVoice(0); o.lyr = { at, names: names(), ok: __ok() };
        /* 插入点顺延 */
        __ld(FXs.accMel); o.ins = [0, 1, 2, 3, 4].map(a => voxInsAt(song, a));
        /* 删宿主（非钢琴谱）：层转独立 */
        __ld(FXs.vnfl); delVoiceAt('vox', 0); o.delH = { names: names(), lay: song.voxLayer, w: __lay() };
        /* 钢琴谱删层放行、删宿主拒绝 */
        __ld(FXs.pno); o.pdt = docType(song); delVoiceAt('vox', 1); o.delL = { names: names(), lay: song.voxLayer, w: __lay(), g: song.voxGroups };
        __ld(FXs.pno); delVoiceAt('vox', 0); o.delH0 = names();
        /* 失配数组（绕过 migrate）在改声部时收掉 */
        __ld(FXs.vnfl); song.voxLayer = [null, 1]; addVoice('vox'); o.mis = { has: 'voxLayer' in song, w: __lay() };
        return o;
      }, { vn: FX.vn(), accMel: FX.accMel(), accLH: FX.accLH(), vnfl: FX.vnfl(), pno: FX.pno() });
      T(J(p.app.names) === J(['小提琴', '小提琴·2', '旋律3']) && J(p.app.lay) === J([null, 1, null]) && J(p.app.w) === J(['vox:1']) && J(p.app.ok) === J([0, 1, 0]),
        'S2 末尾加旋律轨：[Vn, Vn·2]＋追加 → voxLayer [null,1,null]、见证留在 vox:1', J(p.app));
      T(J(p.mel.names) === J(['旋律', '旋律·2', '旋律5', '右手伴奏', '左手伴奏']) && J(p.mel.ok) === J([0, 1, 0, 0, 0]) && J(p.mel.w) === J(['vox:1']) && J(p.mel.g) === J([BC(3, 4)]),
        'S3 旋律带层的伴奏歌谱加旋律轨：插在钢琴前、层仍挂旋律、花括号随行平移', J(p.mel));
      T(J(p.lh.names) === J(['旋律', '旋律5', '右手伴奏', '左手伴奏', '左手伴奏·2']) && J(p.lh.ok) === J([0, 0, 0, 0, 1]) && J(p.lh.w) === J(['vox:4']) && J(p.lh.g) === J([BC(2, 4)])
        && p.lyr.at === 1 && J(p.lyr.ok) === J([0, 0, 0, 0, 1]),
        'S4 左手带层时加旋律轨 / 智能填词＋声部仍插在钢琴前（v70.4 判定认不出 → 追加在左手层后面），层仍挂左手、组覆盖层', J([p.lh, p.lyr]));
      T(J(p.ins) === J([0, 2, 2, 3, 4]), 'S5 插入点顺延 voxInsAt：插在层行上 → 顺延到层之后，其余不动', J(p.ins));
      T(J(p.delH.names) === J(['小提琴·2', '长笛']) && p.delH.lay === undefined && !p.delH.w.length, 'S6 删宿主：层转独立（voxLayer 删键、见证清掉），不会挂到别的行上', J(p.delH));
      T(p.pdt === 'piano' && J(p.delL.names) === J(['右手', '左手']) && p.delL.lay === undefined && !p.delL.w.length && J(p.delL.g) === J([BC(0, 1)]) && p.delH0.length === 3,
        'S7 钢琴谱删层行放行（删层不改谱型、花括号随行收），删宿主行照旧拒删', J([p.pdt, p.delL, p.delH0]));
      T(!p.mis.has && !p.mis.w.length, 'S8 失配的 voxLayer（绕过 migrate）在改声部时被删，见证一并清掉', J(p.mis));
      /* 上限按谱表计（§3.5）：7 宿主＋2 层＝9 行仍能加旋律轨；8 宿主＋7 层＝15 行（总轨数满）不能 */
      const lim = await EV(pg, ([a, c]) => { __ld(a); const r1 = trackRoom('vox'); __ld(c); const r2 = trackRoom('vox'), r3 = trackRoom('tab'); return [r1, r2, r3]; },
        [LV(['A', 'A·2', 'B', 'B·2', 'C', 'D', 'E', 'F', 'G'], Array(9).fill('staff'), [null, 1, null, 1, null, null, null, null, null]),
          LV(Array.from({ length: 15 }, (_, i) => 'v' + i), Array(15).fill('staff'), Array.from({ length: 15 }, (_, i) => (i % 2 && i < 15 ? 1 : null)))]);
      T(J(lim) === J([true, false, false]), 'S9 上限按谱表计：层不占 MAX_VOICES（7 宿主＋2 层能再加），总轨数 MAX_TRACKS 照数全部行（15 行满）', J(lim));
      /* 配伴奏重排 restruct：单旋律谱上的残留 voxLayer / 见证收掉 */
      const fill = await EV(pg, s => { __ld(s); const tex = (texAvail(song.beats, song.unit)[0] || {}).id; const r = fillAccompaniment(tex, true);
        return { applied: r && r.applied, n: song.voxVoices.length, has: 'voxLayer' in song, w: __lay() }; },
        Object.assign(LV(['旋律'], ['staff'], [1], { w: [0] })));
      T(fill.applied && fill.n === 3 && !fill.has && !fill.w.length, 'S10 填进当前谱（单旋律补成 3 行）：残留的 voxLayer 与见证收掉', J(fill));
      /* 换谱类 */
      const lb = await EV(pg, FXs => {
        const o = {};
        __ld(FXs.empty); o.rbPlan = lbPlan(song, 'SG').mode; lbSwitch('SG'); o.rb = { names: song.voxVoices.slice(), has: 'voxLayer' in song, w: __lay() };
        __ld(FXs.vn); o.dPlan = lbPlan(song, 'J').mode; lbSwitch('J'); o.dJ = { nota: song.voxNotations, lay: song.voxLayer, ok: __ok() }; lbSwitch('S'); o.dS = { nota: song.voxNotations, ok: __ok() };
        __ld(FXs.accMel); const d0 = docs.length; o.cPlan = lbPlan(song, 'J').mode; lbSwitch('J');
        o.cp = { newDoc: docs.length === d0 + 1, names: song.voxVoices.slice(), has: 'voxLayer' in song, w: __lay(), row0: song.measures[0].voxes[0].map(c => c.deg) };
        return o;
      }, { empty: O_SRC.satbEmpty(), vn: FX.vn(), accMel: FX.accMel() });
      const acc0 = FX.accMel().measures[0].voxes[0].map(c => c.deg);
      T(lb.rbPlan === 'rebuild' && lb.rb.names.length === 3 && !lb.rb.has && !lb.rb.w.length, 'S11 换谱类重建（空谱 [S,A(层),B]→SG，行数不变）：新谱不带旧 voxLayer（LB_STRUCT）与见证', J(lb.rb));
      T(lb.dPlan === 'direct' && (lb.dJ.nota === undefined || J(lb.dJ.nota) === J([null, null])) && J(lb.dJ.lay) === J([null, 1]) && lb.dJ.ok === null && J(lb.dS.ok) === J([0, 1]),
        'S12 换谱类直接换（小提琴双声部 S→J→S）：两行一起换记谱法，切简谱层失效、voxLayer 不动，切回五线谱自动恢复', J([lb.dPlan, lb.dJ, lb.dS]));
      T(lb.cPlan === 'copy' && lb.cp.newDoc && J(lb.cp.names) === J(['旋律1']) && !lb.cp.has && !lb.cp.w.length && J(lb.cp.row0) === J(acc0),
        'S13 换谱类另建一份（带层的伴奏歌谱 → 简谱）：新谱按单元建（器乐层不占行）、带旋律宿主的音、不写 voxLayer / 见证', J(lb.cp));
      const ar = await EV(pg, s => { __ld(s); const r = arrangeAccompaniment(song, { suggest: true }); return { names: r.song.voxVoices, has: 'voxLayer' in r.song, w: __lay(r.song), row0: r.song.measures[0].voxes[0].map(c => c.deg) }; }, FX.vnfl());
      T(J(ar.names) === J(['旋律', '右手伴奏', '左手伴奏']) && !ar.has && !ar.w.length && J(ar.row0) === J(FX.vnfl().measures[0].voxes[0].map(c => c.deg)),
        'S14 配伴奏新窗口（arrangeAccompaniment）：产物只含旋律宿主、无 voxLayer、无见证（否则「右手伴奏」挂成旋律的层）', J(ar));
    });

    /* ================= Y 谱表级同步 ================= */
    if (on('Y')) await guard('Y', async () => {
      const y = await EV(pg, FXs => {
        const o = {}; const at = vi => { sel = { mi: 0, row: 'vox', vi, ci: 0, si: 1 }; clampSel(); };
        const st = () => ({ n: (song.voxNotations || []).slice(0, 2), co: (song.voxClefOct || []).slice(0, 2), tr: (song.voxTransp || []).slice(0, 2), du: (song.voxDual || []).slice(0, 2) });
        for (const from of [0, 1]) {
          const r = {};
          __ld(FXs.vn); at(from); const u0 = undoStack.length; setVoxNotation('alto'); r.nota = st().n; r.nU = undoStack.length - u0; undo(); r.nUndo = st().n;
          __ld(FXs.vn); voxClefSet(from, 'tenor8'); r.t8 = st(); undo(); r.t8u = st();
          __ld(FXs.vn); voxTranspSet(from, -2); r.tr = st().tr; undo(); r.tru = st().tr;
          __ld(FXs.vn); at(from); toggleVoxDual(); r.du = st().du; undo(); r.duu = st().du;
          /* 新外壳音轨树：谱号 ▾（tree:clefset）与「简谱层」（tree:eye jp → 对照） */
          __ld(FXs.vn); FLOW.act('tree:clefset', { dataset: { k: 'vox', i: String(from), v: 'bs' } }, null); r.tree = st().n;
          __ld(FXs.vn); FLOW.act('tree:eye', { dataset: { k: 'vox', i: String(from), v: 'jp' } }, null); r.eye = st().du;
          o['from' + from] = r;
        }
        /* 宿主与层一起切简谱、再切回五线谱：层恢复 */
        __ld(FXs.vn); at(0); setVoxNotation('jianpu'); o.jp = { lay: song.voxLayer, ok: __ok(), n: st().n }; setVoxNotation('staff'); o.back = __ok();
        /* 反例：一致对不成立的旧链接（T 的八度谱号与 A 不同）改 A 的谱号不写 T；staff＋bass 的 [null,1]（带见证）不联动 */
        __ld(FXs.oldAT); voxClefSet(0, 'bass'); o.neg1 = { n: st().n, co: st().co };
        __ld(FXs.sb); voxClefSet(0, 'alto'); o.neg2 = st().n;
        return o;
      }, { vn: FX.vn(), oldAT: LV(['A', 'T'], ST2, [null, 1], { voxClefOct: [null, -1] }), sb: LV(['甲', '乙'], ['staff', 'bass'], [null, 1]) });
      const okRow = r => J(r.nota) === J(['alto', 'alto']) && r.nU === 1 && J(r.nUndo) === J(['staff', 'staff']) && J(r.t8.n) === J(['staff', 'staff']) && J(r.t8.co) === J([-1, -1]) && J(r.t8u.co) === J([])
        && J(r.tr) === J([-2, -2]) && J(r.tru) === J([]) && J(r.du) === J([true, true]) && r.duu.every(x => !x) && J(r.tree) === J(['bass', 'bass']) && J(r.eye) === J([true, true]);
      T(okRow(y.from0), 'Y1 从宿主行改：记谱法 / 男高音谱号（八度谱号）/ 移调 / 简谱对照 / 音轨树谱号 / 音轨树简谱层——两行同值，一步撤销两行一起退', J(y.from0));
      T(okRow(y.from1), 'Y2 从层行改：同上（写入走宿主并同步到层）', J(y.from1));
      T(J(y.jp.n) === J([null, null]) && J(y.jp.lay) === J([null, 1]) && y.jp.ok === null && J(y.back) === J([0, 1]), 'Y3 宿主与层一起切简谱（层失效、voxLayer 不动）再切回五线谱，层自动恢复', J([y.jp, y.back]));
      T(J(y.neg1.n) === J(['bass', 'staff']) && J(y.neg1.co) === J([null, -1]) && J(y.neg2) === J(['alto', 'bass']),
        'Y4 反例：一致对不成立（八度谱号不同的旧链接 / staff＋bass）改宿主谱号不写另一行——同步写不制造新的合法对', J([y.neg1, y.neg2]));
      /* R-clef / R-ott：宿主 4 个四分，层「二分 · 四分 · 四分」（起拍 0 / 2 / 3）；第 2 小节层是一个全音符（起拍 0） */
      const rc = LV(['甲', '甲·2'], ST2, [null, 1]);
      rc.measures[0].voxes[1] = [C(5, 2), C(6, 4), C(7, 4)]; rc.measures[1].voxes[1] = [C(5, 1)];
      const z = await EV(pg, s => {
        const o = {}; const clk = (sela, q) => { sel = Object.assign({ row: 'vox', si: 1 }, sela); clampSel(); return q; };
        const pick = (mi, vi, ci, sl) => { sel = { mi, row: 'vox', vi, ci, si: 1 }; clampSel(); noteSel = []; showClefMenu(10, 10); const b2 = document.querySelector('#popmenu [data-cl="' + sl + '"]'); b2.click(); };
        const cl = (mi, vi) => song.measures[mi].voxes[vi].map(c => c.clef || '');
        __ld(s); pick(0, 0, 2, 'bass'); o.sameBeat = [cl(0, 0), cl(0, 1)];            /* 宿主第 3 拍（起拍 2）↔ 层第 2 列（起拍 2）＝同一拍 */
        __ld(s); pick(0, 0, 1, 'bass'); o.nextCol = [cl(0, 0), cl(0, 1)];             /* 宿主起拍 1：层那一拍没有起拍 → 同小节其后第一列（起拍 2） */
        __ld(s); pick(1, 0, 1, 'alto'); o.none = [cl(1, 0), cl(1, 1)];                /* 第 2 小节层只有全音符：起拍 1 之后没有列 → 不写 */
        pick(1, 0, 1, ''); o.noneClr = [cl(1, 0), cl(1, 1)];
        __ld(s); pick(0, 1, 1, 'bass'); o.fromLayer = [cl(0, 0), cl(0, 1)];           /* 层上标（起拍 2）→ 宿主起拍 2 的列 */
        pick(0, 1, 1, ''); o.clr = [cl(0, 0), cl(0, 1)];
        /* R-ott：宿主选第 0–2 列（起拍 0–2）标 8va → 层取起拍落在 [0, 2] 的列（第 0、1 列），首列 ottTo 指末列；清除同区间一起清 */
        const ot = (mi, vi) => song.measures[mi].voxes[vi].map(c => (c.ott || '') + (c.ottTo ? '>' + c.ottTo.mi + ':' + c.ottTo.ci : ''));
        const ott = (mi, vi, ci, picks, d) => { sel = { mi, row: 'vox', vi, ci, si: 1 }; clampSel(); noteSel = picks; showOttavaMenu(10, 10); document.querySelector('#popmenu [data-ot="' + d + '"]').click(); };
        __ld(s); ott(0, 0, 0, [{ row: 'vox', vi: 0, mi: 0, ci: 0 }, { row: 'vox', vi: 0, mi: 0, ci: 2 }], '8va'); o.ott = [ot(0, 0), ot(0, 1)];
        ott(0, 1, 1, [], ''); o.ottClr = [ot(0, 0), ot(0, 1)];
        __ld(s); ott(0, 1, 2, [], '8vb'); o.ottL = [ot(0, 0), ot(0, 1)];               /* 层行上标（起拍 3）→ 宿主起拍 3 的列 */
        return o;
      }, rc);
      T(J(z.sameBeat) === J([['', '', 'bass', ''], ['', 'bass', '']]) && J(z.nextCol) === J([['', 'bass', '', ''], ['', 'bass', '']]) && J(z.none) === J([['', 'alto', '', ''], ['']])
        && J(z.noneClr) === J([['', '', '', ''], ['']]) && J(z.fromLayer) === J([['', '', 'bass', ''], ['', 'bass', '']]) && J(z.clr) === J([['', '', '', ''], ['', '', '']]),
        'Y5 R-clef 曲中换谱号：另一行按小节内起拍对齐（同一拍 / 那一拍没起拍写其后第一列 / 其后没有列不写），清除一起清，层行上标反向同步到宿主', J(z));
      T(J(z.ott) === J([['8va>0:2', '8va', '8va', ''], ['8va>0:1', '8va', '']]) && J(z.ottClr) === J([['', '', '', ''], ['', '', '']]) && J(z.ottL) === J([['', '', '', '8vb>0:3'], ['', '', '8vb>0:2']]),
        'Y6 R-ott 八度线：另一行取起拍落在 [首列起拍, 末列起拍] 的列、首列 ottTo 指末列；清除同区间一起清；层行上标反向同步到宿主', J(z));
      /* 提示条：新外壳层行 data-k=sync、宿主行不出；旧外壳不出 */
      const tk = async (p2) => EV(p2, s => new Promise(res => {
        const ks = []; const o0 = toastSay; toastSay = function(m, o){ ks.push(o && o.k || ''); return o0.apply(this, arguments); };   /* 记下每次提示条的种类 */
        __ld(s); voxClefSet(1, 'bass'); setTimeout(() => { const a = __toastK(), k1 = ks.splice(0); __ld(s); voxClefSet(0, 'alto');
          setTimeout(() => { toastSay = o0; res([a, k1, ks.slice(), typeof flowOn === 'function' && flowOn()]); }, 60); }, 60); }), FX.vn());
      const nw = await tk(pg);
      const pc = await openEditor(b, ED, '?shell=classic'); const cl = await tk(pc); await pc._ctx.close();
      T(nw[3] && nw[0].k === 'sync' && /两个声部一起改/.test(nw[0].t) && nw[1].includes('sync') && !nw[2].includes('sync') && !cl[3] && cl[0].k !== 'sync' && !/两个声部一起改/.test(cl[0].t) && !cl[1].includes('sync'),
        'Y7 新外壳在层行上改谱表级属性：提示条「两个声部一起改」（data-k=sync），宿主行不出；旧外壳不提示', J({ nw, cl }));
    });

    /* ================= C 伴奏取行 ================= */
    if (on('C')) await guard('C', async () => {
      const c = await EV(pg, FXs => {
        const o = {};
        for (const k of ['accRH', 'accLH']) { __ld(FXs[k]); o[k] = { stack: isPianoAccStack(song), rows: accTexRows(song), fill: accFillable(song), used: accRowsUsed(song), tex: accTexRowsOf(song) }; }
        const blank = JSON.parse(JSON.stringify(FXs.accMel)); blank.measures.forEach(m => [2, 3].forEach(i => m.voxes[i].forEach(c => { c.deg = 0; c.oct = 0; })));
        __ld(blank); const before = JSON.parse(JSON.stringify(song));
        o.mel = { stack: isPianoAccStack(song), rows: accTexRows(song), fill: accFillable(song) };
        const tex = (texAvail(song.beats, song.unit)[0] || {}).id; const r = fillAccompaniment(tex, true);
        const J = x => JSON.stringify(x);
        o.melFill = { applied: r && r.applied, lay1: J(song.measures.map(m => m.voxes[1])) === J(before.measures.map(m => m.voxes[1])),
          rh: song.measures[0].voxes[2].some(c => c.deg), lh: song.measures[0].voxes[3].some(c => c.deg), mix: [2, 3].map(i => (song.mixer['vox:' + i] || {}).inst), ok: __ok(), w: __lay() };
        __ld(blank); const rows = accTexRowsOf(song); mutate(() => { accTexBody(tex, { sc: 'all', accSt: rows.accSt, accRows: rows.accRows, auto: true }); });
        o.melTex = { lay1: J(song.measures.map(m => m.voxes[1])) === J(before.measures.map(m => m.voxes[1])), rh: song.measures[1].voxes[2].some(c => c.deg), ok: __ok() };
        return o;
      }, { accRH: FX.accRH(), accLH: FX.accLH(), accMel: FX.accMel() });
      T(['accRH', 'accLH'].every(k => c[k].stack && c[k].rows === null && !c[k].fill && J(c[k].used) === '[]' && c[k].tex === null),
        'C1 伴奏单元（右手 / 左手谱表）带层：仍认作钢琴伴奏歌谱，但织体 accTexRows null、填进当前谱 accFillable false、accRowsUsed []（覆盖宿主会留下旧的第二声部）', J([c.accRH, c.accLH]));
      T(c.mel.stack && J(c.mel.rows) === J({ chordVi: 0, rhVi: 2, lhVi: 3, acc: true }) && c.mel.fill && c.melFill.applied && c.melFill.lay1 && c.melFill.rh && c.melFill.lh
        && J(c.melFill.mix) === J(['piano', 'piano']) && J(c.melFill.ok) === J([0, 1, 0, 0]) && J(c.melFill.w) === J(['vox:1']) && c.melTex.lay1 && c.melTex.rh && J(c.melTex.ok) === J([0, 1, 0, 0]),
        'C2 旋律单元带层：取行映射到右手 2 / 左手 3，填进当前谱与织体写进映射后的行，旋律的层行与见证不动', J([c.mel, c.melFill, c.melTex]));
    });

    /* ================= P 分谱 ================= */
    if (on('P')) await guard('P', async () => {
      const P = await EV(pg, FXs => {
        const o = {}; const sh = r => r.solo ? 'solo' : r.parts.map(p => p.id + ':' + p.kind + '[' + p.vox.join(',') + ']').join(' ');
        for (const k of ['pno', 'pno4', 'vn', 'satb', 'duet', 'vnfl']) { __ld(FXs[k]); o[k] = sh(partsPlan(song)); }
        o.duetStrip = sh(partsPlan(FXs.duetStrip));
        __ld(FXs.satb); const pl = partsPlan(song).parts;
        const one = id => { const r = partSong(pl.find(p => p.id === id)); return { names: r.song.voxVoices, lay: r.song.voxLayer, hid: r.song.measures.some(m => (m.voxes || []).some(cols => (cols || []).some(c => 'hid' in c))), w: __lay(r.song), g: r.song.voxGroups }; };
        o.satbA = one('v1'); o.satbM = one('m0-1');
        __ld(FXs.vnfl); const pv = partsPlan(song).parts;
        const two = id => { const r = partSong(pv.find(p => p.id === id)); return { names: r.song.voxVoices, lay: r.song.voxLayer, hid: r.song.measures.some(m => (m.voxes || []).some(cols => (cols || []).some(c => c.hid === 1))) }; };
        o.vn0 = two('v0'); o.fl = two('v2');
        return o;
      }, Object.assign(Object.fromEntries(Object.keys(FX).map(k => [k, FX[k]()])), { duetStrip: STRIP705(FX.duet()) }));
      T(P.pno === 'solo' && P.pno4 === 'solo' && P.vn === 'solo', 'P1 钢琴独奏带层（右手 / 双手）、小提琴双声部：单演奏者（份数按分类视图单元计）', J([P.pno, P.pno4, P.vn]));
      T(P.satb === 'v0:choir[0] v1:choir[1] m0-1:merge[0,1] v2:choir[2] v3:choir[3] m2-3:merge[2,3]', 'P2 闭合 SATB（声乐层）：4 份 choir＋2 份 merge，合并的 [S,A] / [T,B] 恰是两张物理谱表', P.satb);
      T(P.duet === 'v0:choir[0] v1:choir[1]' && P.duet === P.duetStrip, 'P3 有词二重唱写在同一谱表（声乐层）：两个声部各一份，与 v70.4 打开同一份 JSON（独立两行、推断方括号）相同', J([P.duet, P.duetStrip]));
      T(P.vnfl === 'v0:choir[0,1] v2:choir[2]', 'P4 器乐层随宿主同一份（vox＝[宿主, 层]），长笛一份', P.vnfl);
      T(J(P.satbA.names) === J(['A']) && P.satbA.lay === undefined && !P.satbA.hid && !P.satbA.w.length, 'P5 抽出的层份（A）：无 voxLayer、无 hid、无见证——单声部分谱的空拍印成普通休止', J(P.satbA));
      T(J(P.satbM.lay) === J([null, 1]) && P.satbM.hid && J(P.satbM.w) === J(['vox:1']) && J(P.satbM.g) === J([BR(0, 1)]) && J(P.vn0.lay) === J([null, 1]) && P.vn0.hid && P.fl.lay === undefined && !P.fl.hid,
        'P6 合并份 [S,A] 与器乐单元份 [Vn, Vn·2]：宿主＋层成对留下 voxLayer、hid 与见证；长笛份不带', J([P.satbM, P.vn0, P.fl]));
    });

    /* ================= K 分类（编辑器侧） ================= */
    if (on('K')) await guard('K', async () => {
      const keys = ['pno', 'pno4', 'vn', 'vnfl', 'satb', 'duet', 'accMel', 'accRH', 'accLH'];
      const ed = await EV(pg, ({ FXs, keys }) => keys.map(k => { __ld(FXs[k]); return { k, name: NWB.kindOfSong(song).name, dt: docType(song), data: JSON.parse(JSON.stringify(song)),
        ic: song.voxVoices.map((_, i) => trkInstOf('vox', i)) }; }), { FXs: Object.fromEntries(keys.map(k => [k, FX[k]()])), keys });
      const bad = [];
      ed.forEach(x => { const pk = K.pubKindOf(x.data), pn = K.pubNameOf(x.data); if (pn !== x.name || pk.typeLabel !== x.name || pk.type !== x.dt) bad.push(x.k + '：编辑器 ' + x.name + '/' + x.dt + ' ≠ 服务端 ' + pn + '/' + pk.type); });
      const want = { pno: '钢琴独奏谱', vn: '小提琴谱（五线谱）', satb: '五线谱合唱谱', duet: '五线谱合唱谱', accMel: '旋律＋钢琴伴奏谱（五线谱）' };
      Object.entries(want).forEach(([k, w]) => { const x = ed.find(y => y.k === k); if (x.name !== w) bad.push(k + ' 谱名 ' + x.name + ' ≠ ' + w); });
      T(!bad.length, 'K1 分层夹具 ' + ed.length + ' 份：编辑器谱名 / 谱类＝服务端 pubNameOf / pubKindOf（器乐层折叠、声乐层照独立声部算）', bad.join('；'));
      const ic = Object.fromEntries(ed.map(x => [x.k, x.ic]));
      T(J(ic.accMel.slice(0, 2)) !== J(['piano', 'piano']) && ic.accMel[1] !== 'piano' && ic.accMel[2] === 'piano' && ic.accMel[3] === 'piano' && ic.accRH[2] === 'piano',
        'K2 音轨图标 trkInstOf 按单元：旋律单元的层行不是钢琴，伴奏单元（含层）是钢琴', J(ic));
    });

    /* ================= O v70.4 页面编辑后再开 ================= */
    if (on('O')) await guard('O', async () => {
      let O = BASE && BASE.O;
      if (!O && BASE_ED) { const po = await openEditor(b, BASE_ED); O = await oRun(po); await po._ctx.close(); }
      if (!O) { T(false, 'O 拿不到 v70.4 页面产物（fixtures/v705data_base.json 缺 O，也没有基线页）'); return; }
      const bad = [], seen = [];
      for (const x of O) {
        if (x.r.err) { bad.push(x.name + ' 旧页面出错 ' + x.r.err); continue; }
        for (const out of [x.r.song, x.r.nw].filter(Boolean)) {
          const r = await EV(pg, s => { try { __ld(s); return { ok: __ok(), names: song.voxVoices.slice(), measures: JSON.parse(JSON.stringify(song.measures)), lay: song.voxLayer, err: null }; }
            catch (e) { return { err: String(e && e.message || e) }; } }, out);
          if (r.err) { bad.push(x.name + ' 新版打开抛错 ' + r.err); continue; }
          /* 挂对：每个生效层（ok[i]=1）在源谱里也是层，且宿主名相同 */
          const s0 = x.s0, srcHost = {}; (s0.voxLayer || []).forEach((v, i) => { if (v === 1) srcHost[s0.voxVoices[i]] = s0.voxVoices[i - 1]; });
          const links = [];
          (r.ok || []).forEach((v, i) => { if (!v) return; const nm = r.names[i], h = r.names[i - 1]; links.push(nm + '→' + h); if (srcHost[nm] !== h) bad.push(x.name + ' 挂错：' + nm + ' 挂到 ' + h); });
          /* 音符完整：同名行（层名带「·2」、宿主名）内容与源谱同名行逐列相同（被重建的谱只核第 0 行旋律） */
          const rebuilt = /重建|另建|配伴奏|直接换/.test(x.name);
          r.names.forEach((nm, i) => { const j = s0.voxVoices.indexOf(nm); if (j < 0 || (rebuilt && i > 0)) return;
            const a = J(r.measures.map(m => (m.voxes[i] || []).map(c => [c.deg, c.dur, c.oct]))), b2 = J(s0.measures.map(m => (m.voxes[j] || []).map(c => [c.deg, c.dur, c.oct])));
            if (a !== b2 && !(rebuilt && i === 0 && J(r.measures.map(m => (m.voxes[0] || []).filter(c => c.deg).map(c => c.deg))) === J(s0.measures.map(m => (m.voxes[0] || []).filter(c => c.deg).map(c => c.deg)))))
              bad.push(x.name + ' 行「' + nm + '」音符不完整'); });
          seen.push(x.name + (out === x.r.nw ? '（新窗口）' : '') + '：' + (links.join(',') || '独立') + (r.lay === undefined ? '·已删键' : ''));
        }
      }
      console.log("· O 各路径：" + seen.join(" · "));
      T(O.length === 10 && !bad.length, 'O v70.4 页面上做十种编辑后保存、v70.5 打开：退回独立谱表或挂对（生效层都挂在原宿主上）、不抛、音符完整（D-15）', (bad.join('；') || '') + ' ｜ ' + seen.join(' · '));
    });

    /* ================= R 旧版回落（剥字段） ================= */
    if (on('R')) await guard('R', async () => {
      const keys = ['pno', 'pno4', 'satb', 'vnfl', 'accMel'];
      const r = await EV(pg, ({ A, B }) => A.map((s, i) => { __ld(B[i]); const st = JSON.parse(JSON.stringify(song)); return {
        rows: st.voxVoices.length, hid: st.measures.some(m => m.voxes.some(cols => cols.some(c => 'hid' in c))), restAt: st.measures[0].voxes[1].map(c => c.deg),
        offA: __off(s), offB: __off(B[i]) }; }), { A: keys.map(k => FX[k]()), B: keys.map(k => STRIP705(FX[k]())) });
      const bad = [];
      r.forEach((x, i) => { const s = FX[keys[i]](); if (x.rows !== s.voxVoices.length || x.hid) bad.push(keys[i] + ' 行数 / hid');
        if (s.voxLayer[1] === 1 && J(x.restAt) !== J([5, 0, 6, 0])) bad.push(keys[i] + ' 层行音符 / 休止 ' + J(x.restAt));
        if (x.offA !== x.offB) bad.push(keys[i] + ' 离屏谱面与剥字段不同'); });
      T(!bad.length, 'R STRIP705（删 voxLayer / hid / 见证）：多出的一行照常显示、音符完整、hid 处是普通休止；带显式分组的分层谱离屏谱面＝剥字段后的谱面（v70.5 谱面零改动）', bad.join('；'));
    });

    /* ================= Z 零差异 ================= */
    if (on('Z')) await guard('Z', async () => {
      if (!BASE || !BASE.Z) { T(false, 'Z 缺基线摘要 fixtures/v705data_base.json'); return; }
      const { songs, Z } = await zRun(b, ED);
      const bad = [];
      for (const x of songs) {
        const z = BASE.Z[x.name]; if (!z) { bad.push(x.name + ' 基线里没有'); continue; }
        for (const k of ['json', 'mid', 'mxl', 'play']) if (Z[x.name][k] !== z[k]) bad.push(x.name + '·' + k);
      }
      T(songs.length === 21 && !bad.length, 'Z1 无层谱（16 预设＋21 示例）载入 JSON / MIDI / MusicXML / 播放事件与基线 v70.4 逐字节相同', bad.join('、'));
      if (BASE_ED && !process.env.CI) {
        const po = await openEditor(b, BASE_ED); const badS = [];
        for (const x of songs) { const a = await EV(pg, s => __off(s), x.data), c2 = await EV(po, s => __off(s), x.data); if (a !== c2) badS.push(x.name); }
        await po._ctx.close();
        T(!badS.length, 'Z2 无层谱离屏谱面与基线页（git show 579ada0）逐份相同（' + songs.length + ' 份）', badS.join('、'));
      } else console.log('· Z2 跳过：没有基线页（CI 浅克隆）——谱面零差异由 tv_inplace Z / tv_parts PAZ / tv_pgbrk 的基线对拍兜底');
    });

    if (!hasFn) console.log('（被测页没有 PQ_KIND.voxLayerOk / voxStaffRows：修前副本）');
    await pg._ctx.close();
  } finally {
    await b.close();
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  }
  const pe = errs.filter(e => !/ResizeObserver|AudioContext|NotAllowedError/.test(e));
  if (pe.length) console.log('页面错误：' + pe.slice(0, 5).join(' | '));
  console.log('PASS ' + pass + '/' + total);
  if (pass === total && !pe.length) console.log('NO ERRORS');
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
