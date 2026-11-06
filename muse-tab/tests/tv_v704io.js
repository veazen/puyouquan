'use strict';
/* v70.4 互通与编辑组（基石方案 docs/plan-2026-11-foundation.md §3.2 B / D ＋ PROJECT.md §9.0「v70.4 并入（v70.3 验收 minor）」两条）。file:// 直载，真实浏览器。
   B  选区批量改时值保住小节总时值（10-31② 拍板）：
      B1 框选整个空小节改 8 分 → 8 个八分休止、小节仍 4 拍；选区 c2 钉在最后一个改过的列（补出的不进选区）；键盘「r」同效（新外壳 / 旧外壳各一遍）
      B2 改短只补在最后一个选中列之后（「5 6 0 0」选前两格 → 5/8 6/8 0/8 0/8 0/4 0/4）· B3 改长吸收其后的空白列（反过来按回四分＝原样）
      B4 改长后面是音符吸收不够：照 v70.2 只改时值（超拍），提示写「仍不符」· B5 跨小节选区逐小节保住 · B6 六线谱行 · B7 一步撤销 JSON 相等
      B8 弱起首小节不补（允许欠拍）· B9 选中列里有连音组只改时值 · B10 提示：新外壳短文「已改时值」带「撤销」、旧外壳原文
      B11 「自由编辑」（旧外壳 musetab-editmode=free）：批量只改时值（与 v70.2 相同，提示原文逐字）；单格空列改短不补、改长不吸收
      B12 新形态没有两档：预置 free 也照常补列
   D  song.src（D-15）：D1 第三方 MusicXML 导入 → {via:'mxl', sw:<software> 前 40 字（空白归一）}；没写 software → {via:'mxl'}
      D2 导出写 <miscellaneous-field name="pyq-src">、往返逐项相等（含 via 'midi' / 'gp' / 'arr' 与 sw）；没有来源的谱（新建 / 示例 / 自家往返）不写键、导出不含 pyq-src
      D3 MIDI / GP 导入弹窗 → via 'midi' / 'gp' · D4 智能配谱弹窗新窗口产物 via 'arr'（沿用旋律谱的 sw）· D5 清洗：normalizeSongFields / sanitizeUntrusted / 服务端 scoreDataDanger
      D6 坏值规整（srcNorm）：未知 via、非字符串、空串不留
   K  导入报告显示名专业化：SKIP_LBL 14 个名 · 第 4 个起的倚音单列（附首处小节号）· 房子编号逐号点名（按第几房导入、首处小节）且不在「其他记号」里重复
   F  六线谱第一声部 <forward> 留下的空拍按时值补普通休止（小节中间 / 小节末 / 附点时值），导入报告写「六线谱 forward 空拍 N 处补成休止」，不再计「空拍」
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指向 git show 16de944:muse-tab/index.html 复跑 6/34——B1 B2/B3 B5 B6 B7 B10（两外壳）、B4〔旧外壳〕（提示）、B11b、B12 · D1 D2 D3 D4 D5 D6 · K1–K4 · F1–F3 红；
   绿的是「不变」守卫 B4〔新外壳〕、B8/B9（两外壳）、B11a、D2b、E。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=B,D 只跑部分段。单跑约 25 秒 */
const { chromium } = require('playwright');
const path = require('path');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1200) : '')); };
const J = x => JSON.stringify(x);

/* ---------- 夹具：GP5 二进制（同 tv_keydet gp5，一条吉他轨）/ SMF（同 tv_keydet smf） ---------- */
const mkW = () => { const a = [];
  const w = { arr: a, b: v => a.push(v & 255), i: v => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255), sh: v => a.push(v & 255, (v >> 8) & 255),
    z: n => { for (let i = 0; i < n; i++) a.push(0); },
    bss: (s, size) => { const bf = Buffer.from(s, 'utf8'); a.push(Math.min(bf.length, size)); for (let i = 0; i < size; i++) a.push(i < bf.length ? bf[i] : 0); },
    ibs: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length + 1); a.push(bf.length); bf.forEach(x => a.push(x)); },
    iss: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length); bf.forEach(x => a.push(x)); } };
  return w; };
function gp5(bars) {
  const w = mkW();
  w.bss('FICHIER GUITAR PRO v5.10', 30);
  ['来源测试', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
  w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
  w.i(0); w.z(4); w.z(11); w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
  w.ibs(''); w.i(90); w.b(0); w.b(0); w.i(0);
  for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
  w.z(42); w.i(bars.length); w.i(1);
  for (let mi = 0; mi < bars.length; mi++) { if (mi === 0) { w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0); } else { w.z(1); w.b(0); w.z(1); w.b(0); } }
  w.z(1); w.b(0); w.bss('吉他', 40); w.i(6);
  [64, 59, 55, 50, 45, 40, 0].forEach(x => w.i(x));
  w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0); w.z(29); w.i(0); w.i(0); w.i(0); w.i(0); w.z(4); w.ibs(''); w.ibs('');
  w.z(1);
  bars.forEach(beats => { w.i(beats.length);
    beats.forEach(bt => { w.b(0); w.b(0); let sf = 0; bt.forEach(([s]) => { sf |= 1 << (7 - s); }); w.b(sf);
      bt.slice().sort((a, c) => a[0] - c[0]).forEach(([, f]) => { w.b(0x20); w.b(1); w.b(f); w.z(1); }); w.sh(0); });
    w.i(0); w.b(0); });
  return Buffer.from(w.arr);
}
function vlq(n) { const s = [n & 0x7f]; n >>= 7; while (n) { s.push((n & 0x7f) | 0x80); n >>= 7; } return s.reverse(); }
function smf(notes) {
  const tpq = 480, evs = []; let t = 0;
  notes.forEach(([m, q]) => { const d = Math.round(q * tpq); evs.push([t, 0x90, m, 80], [t + d, 0x80, m, 0]); t += d; });
  evs.sort((a, b) => a[0] - b[0] || (a[1] === 0x80 ? -1 : 1));
  const tk = [0, 0xFF, 0x51, 3, 7, 0xA1, 0x20, 0, 0xFF, 0x58, 4, 4, 2, 24, 8];
  let last = 0; evs.forEach(([tick, st, d1, d2]) => { tk.push(...vlq(tick - last), st, d1, d2); last = tick; });
  tk.push(0, 0xFF, 0x2F, 0);
  const trk = [0x4D, 0x54, 0x72, 0x6B, (tk.length >> 24) & 255, (tk.length >> 16) & 255, (tk.length >> 8) & 255, tk.length & 255, ...tk];
  return Buffer.from([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (tpq >> 8) & 255, tpq & 255, ...trk]);
}

/* ---------- 夹具：MusicXML 探针 ---------- */
const HEAD = (sw, body, extra) => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><identification>${sw == null ? '' : `<encoding><software>${sw}</software></encoding>`}${extra || ''}</identification><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
const ATT = clef => `<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>${clef || '<clef><sign>G</sign><line>2</line></clef>'}</attributes>`;
const NT = (st, oc, d, ty, x) => `<note><pitch><step>${st}</step><octave>${oc}</octave></pitch><duration>${d}</duration><voice>1</voice><type>${ty}</type>${x || ''}</note>`;
const GR = st => `<note><grace slash="yes"/><pitch><step>${st}</step><octave>5</octave></pitch><voice>1</voice><type>16th</type></note>`;
const MEL = `<measure number="1">${ATT()}${NT('C', 5, 2, 'quarter')}${NT('D', 5, 2, 'quarter')}${NT('E', 5, 2, 'quarter')}${NT('F', 5, 2, 'quarter')}</measure>`;
const TABATT = ATT('<clef><sign>TAB</sign><line>5</line></clef>' + '<staff-details><staff-lines>6</staff-lines>' + [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([s, o], i) => `<staff-tuning line="${i + 1}"><tuning-step>${s}</tuning-step><tuning-octave>${o}</tuning-octave></staff-tuning>`).join('') + '</staff-details>');
const TN = (s, f, d, ty, dot) => `<note><pitch><step>E</step><octave>3</octave></pitch><duration>${d}</duration><voice>1</voice><type>${ty}</type>${dot ? '<dot/>' : ''}<notations><technical><string>${s}</string><fret>${f}</fret></technical></notations></note>`;
const FW = d => `<forward><duration>${d}</duration></forward>`;
const PROBE = {
  sw: HEAD('MuseScore 3.6.2', MEL),
  swLong: HEAD('  Finale   v27.4 for Mac — export plugin build 2026.11.06-abcdefghijk  ', MEL),
  noSw: HEAD(null, MEL),
  grace5: HEAD('X', `<measure number="1">${ATT()}${NT('C', 5, 8, 'whole')}</measure><measure number="2">${GR('D')}${GR('E')}${GR('F')}${GR('G')}${GR('A')}${NT('C', 5, 8, 'whole')}</measure>`),
  volta: HEAD('X', `<measure number="1">${ATT()}<barline location="left"><repeat direction="forward"/></barline>${NT('C', 5, 8, 'whole')}</measure>` +
    `<measure number="2"><barline location="left"><ending number="1,2" type="start"/></barline>${NT('D', 5, 8, 'whole')}<barline location="right"><ending number="1,2" type="stop"/><repeat direction="backward"/></barline></measure>` +
    `<measure number="3"><barline location="left"><ending number="3" type="start"/></barline>${NT('E', 5, 8, 'whole')}<barline location="right"><ending number="3" type="discontinue"/></barline></measure>` +
    `<measure number="4"><barline location="left"><ending number="3" type="start"/></barline>${NT('F', 5, 8, 'whole')}<barline location="right"><ending number="3" type="stop"/></barline></measure>`),
  voltaMix: HEAD('X', `<measure number="1">${ATT()}<barline location="left"><ending number="3" type="start"/></barline>${NT('C', 5, 8, 'whole', '<notations><articulations><caesura/></articulations></notations>')}<barline location="right"><ending number="3" type="stop"/></barline></measure>`),
  tabMid: HEAD('X', `<measure number="1">${TABATT}${TN(1, 0, 2, 'quarter')}${FW(2)}${TN(1, 1, 2, 'quarter')}${TN(1, 3, 2, 'quarter')}</measure>`),
  tabEnd: HEAD('X', `<measure number="1">${TABATT}${TN(1, 0, 2, 'quarter')}${TN(1, 1, 2, 'quarter')}${TN(1, 3, 2, 'quarter')}${FW(2)}</measure>`),
  tabDot: HEAD('X', `<measure number="1">${TABATT}${FW(3)}${TN(1, 0, 1, 'eighth')}${TN(1, 1, 4, 'half')}</measure>`),
};

const HELP = () => {
  window.__fresh = (o) => { o = o || {}; const k = o.kind || 'vox';
    const s = createSong(k === 'tab' ? 'solo' : 'vox', Object.assign({ title: '批量', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: k === 'tab' ? 0 : 1, lyr: k === 'vox' ? 1 : 0 }, o.opt || {}));
    if (typeof o.setup === 'string') o.setup = (new Function('return ' + o.setup))();
    if (o.setup) o.setup(s); window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
    loadSong(s); undoStack.length = 0; redoStack.length = 0;
    sel = { mi: o.mi || 0, row: k === 'tab' ? 'tab' : 'vox', vi: 0, ci: o.ci || 0, si: o.si || 3 }; lastEnt = null; noteSel = []; selRange = null; clampSel(); render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__f = c => (c.deg != null ? c.deg : ((c.notes || []).map(n => n.s + '.' + n.f).join('+') || '0')) + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '');
  window.__cols = (mi, row) => { const m = song.measures[mi]; if (!m) return null; row = row || sel.row; return row === 'tab' ? m.tabs[0] : m.voxes[0]; };
  window.__dump = (n, row) => song.measures.slice(0, n || 1).map((m, mi) => (__cols(mi, row) || []).map(__f).join(' ')).join(' | ');
  window.__tot = (mi, row) => { const u = meaMeter(mi).unit; return Math.round((__cols(mi, row) || []).reduce((a, c) => a + beatsOf(c, u), 0) * 1000) / 1000; };
  window.__st = (n, row) => ({ m: __dump(n, row), tot: song.measures.slice(0, n || 1).map((_, mi) => __tot(mi, row)), be: beatErrors().length, r: selRange ? [selRange.m1, selRange.c1, selRange.m2, selRange.c2].join(',') : '', rc: selRange ? (rangeCols() || []).length : 0, u: undoStack.length,
    toast: (document.getElementById('toast') || {}).textContent || '', ta: !!document.querySelector('#toast .flw-ta') });
  window.__bat = (R, d) => { selRange = Object.assign({ row: sel.row, vi: 0 }, R); render(); setDur(d); };
  window.__imp = x => { const r = importMusicXML(x); if (!r || r.error) return { err: (r && r.error) || '导入失败' };
    const t = typeof skipText === 'function' ? skipText(r.skip) : '';
    return { src: r.song.src === undefined ? '无' : r.song.src, has: Object.prototype.hasOwnProperty.call(r.song, 'src'), skip: r.skip, txt: t, warn: r.warn || '',
      tab: (r.song.measures || []).map(m => ((m.tabs || [])[0] || []).map(__f).join(' ')), tabTot: (r.song.measures || []).map((m, mi) => { const u = m.unit || r.song.unit; return ((m.tabs || [])[0] || []).reduce((a, c) => a + beatsOf(c, u), 0); }) }; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  if (o.free) await pg.addInitScript(() => { try { localStorage.setItem('musetab-editmode', 'free'); } catch (_) {} });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const pack = o => (o && typeof o.setup === 'function') ? Object.assign({}, o, { setup: o.setup.toString() }) : (o || {});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= B 选区批量改时值 ================= */
    if (want('B')) {
      const R = {};
      for (const sh of ['flow', 'classic']) {
        const A = await open(b, { shell: sh }); const pg = A.pg, tag = sh === 'flow' ? '〔新外壳〕' : '〔旧外壳〕';
        const bat = (o, Rg, d, n, row) => EV(pg, a => { __fresh(a[0]); __bat(a[1], a[2]); return __st(a[3], a[4]); }, [pack(o), Rg, d, n || 1, row || null]);
        const r = R[sh] = {};
        r.b1 = await bat({}, { m1: 0, c1: 0, m2: 0, c2: 3 }, 8);
        /* 键盘：选区在、焦点在谱面，按「r」（八分） */
        await EV(pg, () => { __fresh({}); selRange = { row: 'vox', vi: 0, m1: 0, c1: 0, m2: 0, c2: 3 }; render(); });
        await pg.keyboard.press('r'); await pg.waitForTimeout(60);
        r.b1k = await EV(pg, () => __st(1));
        r.b2 = await bat({ setup: s => { s.measures[0].voxes[0] = [__V(5), __V(6), __V(0), __V(0)]; } }, { m1: 0, c1: 0, m2: 0, c2: 1 }, 8);
        r.b3 = await bat({ setup: s => { s.measures[0].voxes[0] = [__V(5, 8), __V(6, 8), __V(0, 8), __V(0, 8), __V(0), __V(0)]; } }, { m1: 0, c1: 0, m2: 0, c2: 1 }, 4);
        r.b4 = await bat({ setup: s => { s.measures[0].voxes[0] = [__V(5), __V(6), __V(3), __V(1)]; } }, { m1: 0, c1: 0, m2: 0, c2: 1 }, 2);
        r.b5 = await bat({}, { m1: 0, c1: 1, m2: 1, c2: 1 }, 8, 2);
        r.b6 = await bat({ kind: 'tab' }, { row: 'tab', m1: 0, c1: 0, m2: 0, c2: 3 }, 8, 1, 'tab');
        r.b7 = await EV(pg, () => { __fresh({ setup: (s => { s.measures[0].voxes[0] = [__V(5), __V(6), __V(0), __V(0)]; s.measures[1].voxes[0] = [__V(1, 2), __V(0, 2)]; }).toString() });
          const j0 = JSON.stringify(song); __bat({ m1: 0, c1: 0, m2: 1, c2: 0 }, 16); const a = __st(2), u = undoStack.length; undo(); render(); return { a, u, back: JSON.stringify(song) === j0 }; });
        r.b8 = await bat({ setup: s => { s.pickup = true; } }, { m1: 0, c1: 0, m2: 0, c2: 3 }, 8);
        r.b9 = await bat({ setup: s => { s.measures[0].voxes[0] = [__V(1, 8, { tup: 3 }), __V(2, 8, { tup: 3 }), __V(3, 8, { tup: 3 }), __V(0), __V(0, 2)]; } }, { m1: 0, c1: 0, m2: 0, c2: 2 }, 16);
        allErrs.push(...A.errs); await A.ctx.close();
        const E8 = '0/8 0/8 0/8 0/8 0/8 0/8 0/8 0/8';
        T(r.b1.m === E8 && r.b1.tot[0] === 4 && r.b1.be === 0 && r.b1.r === '0,0,0,3' && r.b1.rc === 4 && r.b1.u === 1 && r.b1k.m === E8 && r.b1k.tot[0] === 4,
          'B1' + tag + ' 框选整个空小节改 8 分 → 8 个八分休止、小节仍 4 拍、时值检查 0；选区 c2 钉在最后一个改过的列（4 格，补出的不进选区）；键盘「r」同效', J({ b1: r.b1, k: r.b1k }));
        T(r.b2.m === '5/8 6/8 0/8 0/8 0/4 0/4' && r.b2.tot[0] === 4 && r.b3.m === '5/4 6/4 0/4 0/4' && r.b3.tot[0] === 4,
          'B2/B3' + tag + ' 改短补在最后一个选中列之后（5/8 6/8 0/8 0/8 0/4 0/4）· 改长吸收其后的空白列（5/8 6/8 0/8 0/8 0/4 0/4 选前两格按四分 → 5/4 6/4 0/4 0/4）', J([r.b2, r.b3]));
        T(r.b4.m === '5/2 6/2 3/4 1/4' && r.b4.tot[0] === 6 && (sh === 'flow' ? /不符/.test(r.b4.toast) : /仍不符/.test(r.b4.toast)),
          'B4' + tag + ' 改长后面是音符、吸收不够：照 v70.2 只改时值（不碰真实音符），提示写「不符」', J(r.b4));
        T(r.b5.m === '0/4 0/8 0/8 0/8 0/8 0/8 0/8 | 0/8 0/8 0/8 0/8 0/4 0/4' && r.b5.tot.join() === '4,4' && r.b5.be === 0 && r.b5.r === '0,1,1,1',
          'B5' + tag + ' 跨小节选区（第 1 小节第 2 格 → 第 2 小节第 2 格）逐小节保住 4 拍', J(r.b5));
        T(r.b6.m === E8 && r.b6.tot[0] === 4 && r.b6.be === 0, 'B6' + tag + ' 六线谱行框选空小节改 8 分 → 8 个八分休止、4 拍', J(r.b6));
        T(r.b7.back && r.b7.u === 1 && r.b7.a.tot.join() === '4,4', 'B7' + tag + ' 跨小节批量改 16 分（补列）后撤销一次 → 谱 JSON 与改前逐字节相同（同一步撤销）', J(r.b7));
        T(r.b8.m === '0/8 0/8 0/8 0/8' && r.b9.m === '1/16t3 2/16t3 3/16t3 0/4 0/2', 'B8/B9' + tag + ' 弱起首小节改短不补（允许欠拍，同单格）· 选中列里有连音组只改时值', J([r.b8.m, r.b9.m]));
        T(sh === 'flow' ? (/^已改时值/.test(r.b1.toast) && r.b1.ta) : (/^已批量改时值（空出的补休止、超出的吸收后面的休止，小节时值不变）/.test(r.b1.toast) && !r.b1.ta),
          'B10' + tag + ' 提示：新外壳短文「已改时值」＋「撤销」钮；旧外壳原文写明补休止 / 吸收', J(r.b1.toast));
      }
      /* B11 旧外壳「自由编辑」 */
      { const A = await open(b, { shell: 'classic', free: true }); const pg = A.pg;
        const f = {};
        f.mode = await EV(pg, () => localStorage.getItem('musetab-editmode'));
        f.bat = await EV(pg, () => { __fresh({}); __bat({ m1: 0, c1: 0, m2: 0, c2: 3 }, 8); return __st(1); });
        f.one = await EV(pg, () => { __fresh({}); sel.ci = 0; setDur(8); return __st(1); });
        f.long = await EV(pg, () => { __fresh({}); sel.ci = 0; setDur(2); return __st(1); });
        allErrs.push(...A.errs); await A.ctx.close();
        T(f.mode === 'free' && f.bat.m === '0/8 0/8 0/8 0/8' && f.bat.tot[0] === 2 && f.bat.toast === '已批量替换时值（与拍号不符时会提示，可按需一键修复）',
          'B11a〔旧外壳·自由编辑〕选区批量只改时值、不补不吸收（与 v70.2 相同，提示原文逐字）', J(f));
        T(f.one.m === '0/8 0/4 0/4 0/4' && f.long.m === '0/2 0/4 0/4 0/4', 'B11b〔旧外壳·自由编辑〕单格空列改短不补空列、改长不吸收（10-31②；此前也补 / 吸收）', J([f.one.m, f.long.m])); }
      /* B12 新形态没有两档：预置 free 照常补 */
      { const A = await open(b, { shell: 'flow', free: true }); const pg = A.pg;
        const r = await EV(pg, () => { __fresh({}); __bat({ m1: 0, c1: 0, m2: 0, c2: 3 }, 8); const a = __st(1); __fresh({}); sel.ci = 0; setDur(8); return { a, one: __st(1), nx: flowNx() }; });
        allErrs.push(...A.errs); await A.ctx.close();
        T(r.nx && r.a.tot[0] === 4 && r.one.m === '0/8 0/8 0/4 0/4 0/4', 'B12〔新外壳·预置 free〕新形态没有「自由编辑 / 修复建议」两档：批量与单格照常补列', J(r)); }
    }

    /* ================= D song.src ================= */
    if (want('D')) {
      const A = await open(b, {}); const pg = A.pg;
      const d1 = await EV(pg, P => ({ sw: __imp(P.sw), lg: __imp(P.swLong), no: __imp(P.noSw) }), PROBE);
      T(J(d1.sw.src) === J({ via: 'mxl', sw: 'MuseScore 3.6.2' }) && J(d1.lg.src) === J({ via: 'mxl', sw: 'Finale v27.4 for Mac — export plugin build 2026.11.06-abcdefghijk'.slice(0, 40) }) && J(d1.no.src) === J({ via: 'mxl' }),
        'D1 第三方 MusicXML 导入写 song.src：{via:"mxl", sw:<software> 前 40 字（空白归一）}；没写 software 只有 via', J(d1));
      const d2 = await EV(pg, P => {
        const base = importMusicXML(P.sw).song, out = {};
        const rt = src => { const s = JSON.parse(JSON.stringify(base)); if (src === null) delete s.src; else s.src = src; const x = exportMusicXML(s);
          const m = /<miscellaneous-field name="pyq-src">([^<]*)<\/miscellaneous-field>/.exec(x); const r = importMusicXML(x);
          return { field: m ? m[1] : null, back: Object.prototype.hasOwnProperty.call(r.song, 'src') ? r.song.src : '无' }; };
        out.mxl = rt({ via: 'mxl', sw: 'MuseScore 3.6.2' }); out.midi = rt({ via: 'midi' }); out.gp = rt({ via: 'gp' }); out.arr = rt({ via: 'arr', sw: 'Klangio "AI" <beta>' }); out.none = rt(null);
        const fresh = createSong('vox', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }), xf = exportMusicXML(fresh), rf = importMusicXML(xf).song;
        out.fresh = { has: Object.prototype.hasOwnProperty.call(fresh, 'src'), field: /pyq-src/.test(xf), back: Object.prototype.hasOwnProperty.call(rf, 'src') };
        const all = [].concat(typeof PRESETS !== 'undefined' ? PRESETS : [], typeof EXAMPLES !== 'undefined' ? EXAMPLES : []);
        out.pre = all.map(p => { try { const s = p.make ? p.make() : JSON.parse(JSON.stringify(p.data || p.song || p)); const s2 = migrate(JSON.parse(JSON.stringify(s)));
          return (Object.prototype.hasOwnProperty.call(s2, 'src') || /pyq-src/.test(exportMusicXML(s2))) ? (p.name || '?') : ''; } catch (e) { return ''; } }).filter(Boolean);
        out.nPre = all.length;
        return out; }, PROBE);
      T(d2.mxl.back && J(d2.mxl.back) === J({ via: 'mxl', sw: 'MuseScore 3.6.2' }) && J(d2.midi.back) === J({ via: 'midi' }) && J(d2.gp.back) === J({ via: 'gp' })
        && J(d2.arr.back) === J({ via: 'arr', sw: 'Klangio "AI" <beta>' }) && /&lt;beta&gt;/.test(d2.arr.field || '') && d2.none.field === null && d2.none.back === '无',
        'D2 导出写 <miscellaneous-field name="pyq-src">（JSON、xesc）、往返逐项相等（mxl+sw / midi / gp / arr+带引号尖括号的 sw）；去掉 src 的谱不写这一项、自家往返不长出 src', J(d2));
      T(!d2.fresh.has && !d2.fresh.field && !d2.fresh.back && d2.nPre >= 10 && !d2.pre.length,
        'D2b 没有来源的谱不写键：新建谱没有 src、导出不含 pyq-src、自家往返也没有；' + d2.nPre + ' 份内置预设 / 示例都没有 src、导出不含 pyq-src', J(d2.fresh) + ' ' + J(d2.pre));
      /* D3 MIDI / GP 导入弹窗 */
      const d3 = await EV(pg, a => { const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)); const out = {};
        try { showMidiImport(parseSMF(u8(a.mid))); document.getElementById('mi-go').click(); out.midi = song.src; } catch (e) { out.midi = 'err ' + e.message; }
        try { const r = parseGP(u8(a.gp).buffer); if (r.error) out.gp = 'err ' + r.error; else { showGPTrackModal(r.gp); document.getElementById('gp-go').click(); out.gp = song.src; } } catch (e) { out.gp = 'err ' + e.message; }
        return out; }, { mid: smf([[60, 1], [62, 1], [64, 1], [65, 1], [67, 4]]).toString('base64'), gp: gp5([[[[1, 0]], [[1, 1]], [[1, 3]], [[2, 1]]]]).toString('base64') });
      await pg.waitForTimeout(300);
      T(J(d3.midi) === J({ via: 'midi' }) && J(d3.gp) === J({ via: 'gp' }), 'D3 MIDI 导入弹窗 → song.src {via:"midi"}；GP 导入弹窗 → {via:"gp"}', J(d3));
      /* D5 清洗：编辑器两道 + 服务端 */
      const d5 = await EV(pg, () => { const s = { v: 3, title: 't', src: { via: 'mxl', sw: 'Sib "7" <x>' }, measures: [] };
        const a = normalizeSongFields(JSON.parse(JSON.stringify(s))).src, u = sanitizeUntrusted(JSON.parse(JSON.stringify(s))).src;
        const v2 = normalizeSongFields({ src: { via: '<mxl>' } }).src;
        return { a, u, v2, free: SAN_FREE.has('sw') }; });
      const SD = require(path.join(__dirname, '..', '..', 'api', 'scoredata.js'));
      const sd = { ok: SD.scoreDataDanger({ src: { via: 'mxl', sw: 'Sib "7" <x>' } }, null, 'data', 0), bad: SD.scoreDataDanger({ src: { via: '<mxl>' } }, null, 'data', 0) };
      T(J(d5.a) === J({ via: 'mxl', sw: 'Sib "7" <x>' }) && J(d5.u) === J({ via: 'mxl', sw: 'Sib "7" x' }) && d5.v2.via === 'mxl' && d5.free && sd.ok === null && /via/.test(sd.bad || ''),
        'D5 清洗白名单：sw 是自由文本（SAN_FREE / SD_FREE：载入原样、不可信来源只剥尖括号）、via 是短码（剥 / 拒收尖括号）', J({ d5, sd }));
      const d6 = await EV(pg, () => [srcNorm({ via: 'ai' }), srcNorm({ via: 'mxl', sw: 7 }), srcNorm({ via: 'midi', sw: '   ' }), srcNorm('mxl'), srcNorm({ sw: 'x' }), srcNorm(null)]);
      T(J(d6) === J([null, { via: 'mxl' }, { via: 'midi' }, null, { sw: 'x' }, null]), 'D6 srcNorm 只留合法值：未知 via / 非字符串 sw / 空串 / 非对象一律不留，两项都没有＝null（不写键）', J(d6));
      allErrs.push(...A.errs); await A.ctx.close();
      /* D4 智能配谱弹窗（旧外壳；新外壳主按钮走 FLOW.nx 同一行 srcArr）：新窗口产物 via 'arr'，旋律谱的 sw 沿用 */
      const A2 = await open(b, { shell: 'classic' });
      const d4 = await EV(A2.pg, P => { const r0 = importMusicXML(P.sw).song; r0.voxNotations = [undefined]; loadSong(r0); render();
        const b2 = document.getElementById('b-arrange'); if (!b2) return { err: '无 b-arrange' };
        b2.click(); const o = document.getElementById('arr-out'); if (!o) return { err: '弹窗没开' };
        const opts = [...o.options].map(x => x.value); const nw = opts.find(v => v !== 'fill') || opts[0]; o.value = nw; o.dispatchEvent(new Event('change'));
        const n0 = docs.length; document.getElementById('arr-go').click();
        return { opts, nw, n: docs.length - n0, src: song.src }; }, PROBE);
      await A2.pg.waitForTimeout(300); allErrs.push(...A2.errs); await A2.ctx.close();
      T(d4.n === 1 && J(d4.src) === J({ via: 'arr', sw: 'MuseScore 3.6.2' }), 'D4 智能配谱弹窗新窗口产物 song.src＝{via:"arr", sw 沿用旋律谱}', J(d4));
    }

    /* ================= K 导入报告显示名 ================= */
    if (want('K')) {
      const A = await open(b, {}); const pg = A.pg;
      const k1 = await EV(pg, () => { const W = { mordent: '逆波音', 'inverted-mordent': '顺波音', slide: '滑音', glissando: '刮奏', caesura: '停顿号', 'up-bow': '上弓', 'down-bow': '下弓', bracket: '括线', cue: '提示音符',
          'strong-accent': '强重音', staccatissimo: '短跳音（楔形）', 'other-dynamics': '自定义力度', 'bar-style': '小节线样式' };
        return Object.keys(W).filter(k => SKIP_LBL[k] !== W[k]).map(k => k + '=' + SKIP_LBL[k]); });
      T(Array.isArray(k1) && !k1.length, 'K1 SKIP_LBL：逆波音 / 顺波音、滑音 / 刮奏、停顿号、上弓 / 下弓、括线、提示音符、强重音、短跳音（楔形）、自定义力度、小节线样式', J(k1));
      const k = await EV(pg, P => ({ g: __imp(P.grace5), v: __imp(P.volta), m: __imp(P.voltaMix),
        t6: skipText({ other: 6, otherBy: { mordent: 2, 'inverted-mordent': 1, glissando: 1, slide: 1, 'up-bow': 1 } }) }), PROBE);
      T(k.g.skip.notes === 2 && /第 4 个起的倚音 2 个（第 2 小节）/.test(k.g.txt) && !/音符 2 个/.test(k.g.txt),
        'K2 同组第 4 个起的倚音单列「第 4 个起的倚音 2 个（第 2 小节）」（skip.notes 仍是 2，质量门口径不变）', J([k.g.skip, k.g.txt]));
      T(k.v.skip.other === 3 && k.v.skip.otherBy['房子编号'] === 3 && /「1, 2」房 1 处（按第 1 房导入；第 2 小节）/.test(k.v.txt) && /第 3 房 2 处（按第 2 房导入；首处第 3 小节）/.test(k.v.txt) && !/其他记号/.test(k.v.txt),
        'K3 房子编号逐号点名：「「1, 2」房 1 处（按第 1 房导入；第 2 小节）」「第 3 房 2 处（按第 2 房导入；首处第 3 小节）」；计数仍在 skip.other（3），「其他记号」不重复', J([k.v.skip, k.v.txt]));
      T(/第 3 房 1 处/.test(k.m.txt) && /其他记号 1 处（停顿号 1）/.test(k.m.txt) && /其他记号 6 处（逆波音 2、顺波音 1、刮奏 1、滑音 1、上弓 1 等）|其他记号 6 处（逆波音 2、(顺波音|刮奏|滑音|上弓) 1、/.test(k.t6),
        'K4 房子与别的记号并存：「其他记号」只计别的（停顿号 1）；显示名进报告（逆波音 / 顺波音 / 刮奏 / 滑音 / 上弓）', J([k.m.txt, k.t6]));
      allErrs.push(...A.errs); await A.ctx.close();
    }

    /* ================= F 六线谱 forward 空拍 ================= */
    if (want('F')) {
      const A = await open(b, {}); const pg = A.pg;
      const f = await EV(pg, P => ({ mid: __imp(P.tabMid), end: __imp(P.tabEnd), dot: __imp(P.tabDot) }), PROBE);
      const ob = r => (r.skip.otherBy || {})['空拍'] || 0;
      T(f.mid.tab[0] === '1.0/4 0/4 1.1/4 1.3/4' && f.mid.tabTot[0] === 4 && !ob(f.mid) && /六线谱 forward 空拍 1 处补成休止/.test(f.mid.warn),
        'F1 小节中间的 forward 按时值补四分休止：后面的音不再提前（1.0 ‖ 0 ‖ 1.1 1.3）、小节 4 拍；报告写「六线谱 forward 空拍 1 处补成休止」，不再计「空拍」', J(f.mid));
      T(f.end.tab[0] === '1.0/4 1.1/4 1.3/4 0/4' && f.end.tabTot[0] === 4 && !ob(f.end), 'F2 小节末的 forward 补在末尾（小节不再欠拍）', J(f.end));
      T(f.dot.tab[0] === '0/4. 1.0/8 1.1/2' && f.dot.tabTot[0] === 4 && !ob(f.dot), 'F3 附点时值的 forward（1½ 拍）补附点四分休止', J(f.dot));
      allErrs.push(...A.errs); await A.ctx.close();
    }
  } catch (e) { console.log('❌ 运行异常 ' + (e.stack || e)); total++; fails.push('异常'); }
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' | '));
  await b.close();
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
