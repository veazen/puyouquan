'use strict';
/* v69.8 C 组「记谱与首行名」（规格 docs/spec-2026-11-v698.md §3.6–§3.8；复核 docs/review-2026-10-staff-audit.md T4 / N4 / E5）：
   新可选字段 song.voxClefOct（按声部八度谱号）/ song.voxTransp（按声部移调，存实音、五线谱显示记谱音）/ song.rowNames + song.voxShort（首行声部名）。
   file:// 直载、真实浏览器；位置一律数值几何（window.__pyqGeom 的 data-g 标记 + getScreenCTM 换算到谱面坐标）。
   O   八度谱号：O1 男高 C4（实音）画在第三间、谱号下有 clef8 且水平居中（修前在下加一线、无 8）· O2 导入 clef-octave-change −1 → 字段、音高不变、导出往返 ·
       O3 新建四部合唱男高 voxClefOct 精确、首音「1」按显示谱表取八度（规格 §3.6 正文：本调 do 显示在 C4–B4＝实音 C3–B3；与 O3 测试要点「落 C4」相左，按正文）·
       O4 行首谱号弹窗（旧外壳）与音轨「⋯」（新外壳）两入口同结果、一步撤销 · O5 插删声部数组对齐、migrate 丢弃失配数组 · O6 播放事件 / MIDI 与无字段时逐字节同
   X   移调：X1「♭B 单簧管 + 钢琴」（C 大调）导入：钢琴音高不变、单簧管存实音、voxTransp −2、谱表调号 2♯、符头在记谱音（第四线）（修前调号 0、低大二度）·
       X2 导出单簧管 part 的 key / transpose / 音高与源谱同 · X3 MIDI 与把单簧管当实音写的谱逐字节同 · X4 古典吉他（octave-change −1）+ 人声：吉他存实音 E3（修前 E4 高八度）、显示同源谱 ·
       X5 换调后记谱调同步 · X6 分谱带 voxTransp 且是记谱调
   R   首行声部名：R1 新建 SATB 首系统 4 个全称、续行 4 个简称（英文名 S. A. T. B.），名字右缘 < 方括号左缘 −3、左缘 ≥ 纸边 20px（左页边距按需加宽：放不进原页边距才缩进）· R2 钢琴伴奏歌曲花括号组只 1 个名字、纵向中心与两谱表中线差 ≤2 ·
       R3 首系统首小节与谱线起点右移 ind0、续行 ind1 · R4 关掉后与 cd08ca0 逐字节同 · R5 排版浮层开关两外壳同结果、一步撤销 ·
       R6 导出 / 导入 part-abbreviation 与 pyq-rownames 往返；第三方多声部文件默认开、print-object="no" 不开 · R7 16 预设不写 rowNames
   Z   老谱零变化（与 cd08ca0 逐字节）：16 预设 + 曲库 10 首 + 压力小样的离屏谱面、MusicXML、MIDI；新建谱去掉新字段后的离屏谱面
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V698C_REF 基线页（缺省 git show cd08ca0）· ONLY=O,X,R,Z 只跑部分。
   修前红：MUSETAB_URL 指向 cd08ca0 导出的页面复跑（Z 段对拍自身照绿，其余逐项红）。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const GC = require('./geom_census');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = 'cd08ca0';   /* v69.8 第 0 步（v69.7 行为） */
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + String(d).slice(0, 600) : '')); };
const J = x => JSON.stringify(x);

const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; blurSel = true; render(); return true; };
  window.__off = (s, geom) => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
    window.__pyqGeom = !!geom; let h = null;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { window.__pyqGeom = false; svg.remove(); }
    return h; };
  /* 编辑器谱面（#score）开标记重排，返回各类元素在谱面坐标里的外框 */
  window.__geo = (cats) => { window.__pyqGeom = true; try { render(); } finally { window.__pyqGeom = false; }
    const svg = document.getElementById('score'), inv = svg.getScreenCTM().inverse(), out = {};
    const box = el => { const M = inv.multiply(el.getScreenCTM()), b = el.getBBox();
      const ps = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(M));
      return { x0: Math.min(...ps.map(p => p.x)), y0: Math.min(...ps.map(p => p.y)), x1: Math.max(...ps.map(p => p.x)), y1: Math.max(...ps.map(p => p.y)), q: el.getAttribute('data-gq') || '' }; };
    cats.forEach(k => { out[k] = [...svg.querySelectorAll('[data-g="' + k + '"]')].map(box); });
    out.staffB = {}; svg.querySelectorAll('[data-row="vox"][data-staffb]').forEach(r => { const k = r.dataset.vi + ':' + r.dataset.mi; if (out.staffB[k] == null) out.staffB[k] = +r.dataset.staffb; });
    out.names = [...svg.querySelectorAll('[data-rown]')].map(e => { const b = box(e); return { t: e.textContent, vi: +e.getAttribute('data-rown'), x: +e.getAttribute('x'), y: +e.getAttribute('y'), b }; });
    out.brk = [...svg.querySelectorAll('[data-grp="bracket"]')].map(e => ({ x: +e.getAttribute('x'), y: +e.getAttribute('y'), h: +e.getAttribute('height') }));
    render(); return out; };
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__midiB = s => { const r = exportMIDI0(JSON.parse(JSON.stringify(s))); return Array.from(r.bytes).join(','); };
  window.__xml = s => exportMusicXML(JSON.parse(JSON.stringify(s)));
  window.J0 = x => JSON.stringify(x == null ? null : x);
  window.J = x => JSON.stringify(x);
};
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const refUrl = () => {
  if (process.env.V698C_REF) return toUrl(process.env.V698C_REF);
  try { const t = path.join(os.tmpdir(), 'v698c_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28 }));
    return 'file://' + t; } catch (_) { return null; }
};

/* ---- MusicXML 夹具（第三方写法：<software> 不是谱友圈） ---- */
const MX = (parts, opt) => {
  opt = opt || {};
  const pl = parts.map((p, i) => `<score-part id="P${i + 1}"><part-name${p.hide ? ' print-object="no"' : ''}>${p.name}</part-name>${p.abbr ? `<part-abbreviation>${p.abbr}</part-abbreviation>` : ''}</score-part>`).join('');
  const body = parts.map((p, i) => `<part id="P${i + 1}"><measure number="1"><attributes><divisions>1</divisions><key><fifths>${p.fifths || 0}</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>`
    + `<clef><sign>${p.sign || 'G'}</sign><line>${p.line || 2}</line>${p.co ? `<clef-octave-change>${p.co}</clef-octave-change>` : ''}</clef>${p.tr || ''}</attributes>`
    + p.notes.map(n => `<note><pitch><step>${n[0]}</step>${n[2] ? `<alter>${n[2]}</alter>` : ''}<octave>${n[1]}</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')
    + `</measure></part>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><identification><encoding><software>${opt.sw || 'MuseScore 4.2'}</software></encoding></identification><part-list>${pl}</part-list>${body}</score-partwise>`;
};
const FX_TENOR = MX([{ name: 'Tenor', co: -1, notes: [['C', 4], ['D', 4], ['E', 4], ['C', 4]] }, { name: 'Bass', sign: 'F', line: 4, notes: [['C', 3], ['G', 2], ['C', 3], ['C', 3]] }]);
const FX_CLAR = MX([{ name: 'Clarinet in B♭', abbr: 'Cl.', fifths: 2, tr: '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>', notes: [['D', 5], ['E', 5], ['F', 5, 1], ['D', 5]] },
  { name: 'Piano', notes: [['C', 4], ['E', 4], ['G', 4], ['C', 4]] }]);
const FX_GTR = MX([{ name: 'Voice', notes: [['C', 5], ['D', 5], ['E', 5], ['C', 5]] },
  { name: 'Classical Guitar', tr: '<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>', notes: [['E', 4], ['G', 4], ['B', 4], ['E', 4]] }]);
const FX_HIDE = MX([{ name: 'Soprano', hide: true, notes: [['C', 5], ['D', 5], ['E', 5], ['C', 5]] }, { name: 'Alto', hide: true, notes: [['C', 4], ['D', 4], ['E', 4], ['C', 4]] }]);

/* v69.8 集成：去掉全部 v69.8 新字段（col.syl / grace.slash / mea.tempos / col.tieSlur / song.voxClefOct / voxTransp / rowNames / voxShort）＝老谱 */
/* v70.0 集成迁移：种子多了 C 组示例（两只老虎（儿歌弹唱）kids、视唱谱例 C / G / F sight），带 v70.0 新字段 intent——导出 MusicXML 有意多写 pyq-intent（规格 docs/spec-2026-11-v700.md §3.6，
   有 intent 时另写 pyq-instkey），不是老谱；对拍前与 v69.8 新字段一并去掉＝还原成「老谱」 */
const STRIP698 = s0 => { const s = JSON.parse(JSON.stringify(s0)); ['voxClefOct', 'voxTransp', 'rowNames', 'voxShort', 'intent'].forEach(k => delete s[k]);
  (s.measures || []).forEach(m => { delete m.tempos; [m.voxes, m.tabs].forEach(R => (R || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; delete c.syl; delete c.tieSlur;
    ['grace', 'graceA'].forEach(k => { if (c[k] && typeof c[k] === 'object') delete c[k].slash; }); }))); });
  return s; };
/* 样本特征：pure＝纯五线谱（E8 生效）· stGr＝五线谱行有倚音（T9）· f3＝带跳音 / 重音 / 延长号 / 踏板 / 渐强渐弱（F3 播放 / MIDI 变化）——同 tv_v698play 的分类 */
const STAFFN = n => n === 'staff' || n === 'bass' || n === 'alto';   /* 同编辑器 isStaffNota */
const FEAT698 = s => { const vv = s.voxVoices || [], vn = s.voxNotations || [], du = s.voxDual || [];
  const pure = !(s.tabVoices || []).length && vv.length > 0 && vv.every((_, i) => STAFFN(vn[i]) && !du[i]);
  let stGr = false, f3 = false;
  (s.measures || []).forEach(m => { (m.voxes || []).forEach((cs, vi) => (cs || []).forEach(c => { if (!c) return;
    if (STAFFN(vn[vi]) && (c.grace || c.graceA)) stGr = true;
    if (c.ferm || c.ped || ['stacc', 'staccatissimo', 'accent', 'marcato'].includes(c.artic) || (c.dyn && /^(<|>|cresc|dim|decresc)/.test(String(c.dyn)))) f3 = true; }));
    (m.tabs || []).forEach(cs => (cs || []).forEach(c => { if (c && c.ferm) f3 = true; })); });
  return { pure, stGr, f3 }; };
/* E8 剥离（与 tv_v698play Z2 同一套正则）：cur＝本页（首行谱表上方的速度记号 + 热区），否则＝基线页（页头 ♩= 文本 + 热区） */
const E8STRIP = (h, cur) => { let s = String(h);
  if (cur) s = s.replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-style="italic" font-weight="700" font-family="Georgia,serif" fill="var\(--ink\)">[^<]*<\/text>/, '')
    .replace(/<path d="[^"]*" transform="translate\([^)]*\) scale\(4\.300\)" fill="var\(--ink\)"><\/path>/g, '')
    .replace(/<line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="var\(--ink\)" stroke-width="0\.95"><\/line>/g, '')
    .replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-weight="700" fill="var\(--ink\)">= \d+<\/text>/g, '')
    .replace(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="19" fill="transparent" data-hd="tempo"[^>]*>(<title>[^<]*<\/title>)?<\/rect>/, '');
  else s = s.replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-weight="700" fill="var\(--ink\)">(<tspan[^>]*>[^<]*<\/tspan>　)?[♩♪][.]?=\d+<\/text>/, '')
    .replace(/(<rect x="[^"]*" y="[^"]*" width="[^"]*" height="18(\.0)?" fill="transparent" data-hd="tempo"[^>]*>(<title>[^<]*<\/title>)?<\/rect>)+/g, '');
  return s; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= O 八度谱号 ================= */
    if (want('O')) {
      const A = await open(b); const pg = A.pg;
      /* O1 新建四部合唱，男高第 1 小节首音 1（C 调，实音 C4） */
      const o1 = await EV(pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 4 });
        Object.assign(s.measures[0].voxes[2][0], { deg: 1, oct: 0 }); __ld(s);
        const g = __geo(['head', 'clef', 'clef8']), sb = g.staffB['2:0'];
        const h = g.head.find(x => x.q === '2:0:0'), c = g.clef.find(x => x.q.startsWith('2:0:')), e = g.clef8.filter(x => x.q.startsWith('2:'));
        return { sb, hy: h ? (h.y0 + h.y1) / 2 : null, cx: c ? (c.x0 + c.x1) / 2 : null, cy1: c ? c.y1 : null, e8: e[0] || null, n8: e.length, n8other: g.clef8.filter(x => !x.q.startsWith('2:')).length, midi: voxMidi(song.measures[0].voxes[2][0], 0) }; });
      T(o1.sb != null && o1.hy != null && Math.abs(o1.hy - (o1.sb - 18.75)) <= 0.5 && o1.midi === 60, 'O1a 男高 C4（实音 60）画在第三间（谱表底线 −18.75 ±0.5；修前在下加一线 +7.5）', J(o1));
      T(o1.n8 >= 1 && o1.e8 && Math.abs((o1.e8.x0 + o1.e8.x1) / 2 - o1.cx) <= 0.5 && o1.e8.y0 >= o1.cy1 && o1.e8.y0 - o1.cy1 <= 2 && o1.n8other === 0,
        'O1b 男高谱号下有小号「8」（clef8）、水平居中于谱号 ±0.5、紧贴谱号下缘（≤2px）；其余声部没有', J(o1));
      /* O2 导入 clef-octave-change −1 */
      const o2 = await EV(pg, x => { const r = importMusicXML(x); const s = r.song; __ld(s);
        const xml = exportMusicXML(song), r2 = importMusicXML(xml);
        return { co: s.voxClefOct, n: s.voxNotations, c0: s.measures[0].voxes[0].map(c => c.deg + '/' + (c.oct || 0)), midi: s.measures[0].voxes[0].map((c, ci) => voxMidi(c, 0)),
          xmlCo: (xml.match(/<clef-octave-change>-1<\/clef-octave-change>/g) || []).length, xmlP: (/<part id="P1">[\s\S]*?<step>C<\/step><octave>(\d)<\/octave>/.exec(xml) || [])[1],
          rt: J(r2.song.voxClefOct), rtNotes: J(r2.song.measures[0].voxes[0].map(c => c.deg + '/' + (c.oct || 0))) }; }, FX_TENOR);
      T(J(o2.co) === J([-1, null]) && J(o2.midi) === J([60, 62, 64, 60]), 'O2a 导入 Tenor（G 谱号 clef-octave-change −1）→ voxClefOct [−1, null]、音高照收（C4 D4 E4 C4 实音）', J(o2));
      T(o2.xmlCo === 1 && o2.xmlP === '4' && o2.rt === J([-1, null]) && o2.rtNotes === J(o2.c0), 'O2b 导出写 <clef-octave-change>−1、<pitch> 仍是实音八度（C4）；再导入字段与音符不变', J(o2));
      /* O3 新建四部合唱字段 + 首音八度 */
      const o3 = await EV(pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 3 }); __ld(s);
        const f = { co: song.voxClefOct, rn: song.rowNames, n: song.voxNotations };
        sel = { mi: 0, row: 'vox', vi: 2, ci: 0, si: 1 }; blurSel = false; setDeg(1); const t = voxMidi(song.measures[0].voxes[2][0], 0);
        sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; setDeg(1); const sop = voxMidi(song.measures[0].voxes[0][0], 0);
        const s3 = NWB.build('S', { title: '合', key: 'C', nVox: 3, lyr: 1, nMea: 2 }), sj = NWB.build('SJ', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }), j4 = NWB.build('J', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }),
          s4i = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 0, nMea: 2 }), g = NWB.build('G', { title: '钢', nMea: 2 }), sg = NWB.build('SG', { title: '伴', nMea: 2 });
        return { f, t, sop, s3: J(s3.voxClefOct || null), sj: J(sj.voxClefOct || null), j4: J(j4.voxClefOct || null), s4i: J(s4i.voxClefOct || null), rn: [s3.rowNames, sj.rowNames, j4.rowNames, s4i.rowNames, g.rowNames, sg.rowNames] }; });
      T(J(o3.f.co) === J([null, null, -1, null]) && o3.f.rn === 1 && o3.s3 === 'null' && o3.sj === J([null, null, -1, null]) && o3.j4 === 'null' && o3.s4i === 'null',
        'O3a 新建四部五线合唱（含教学对照）男高 voxClefOct [null, null, −1, null]；三部 / 简谱合唱 / 无词重奏不写', J(o3));
      T(o3.t === 48 && o3.sop === 60, 'O3b 男高首音「1」按显示谱表取八度：实音 C3（显示在 C4 位置，同高音谱表口径；规格 §3.6）；女高 C4 不变', J(o3));
      T(Array.isArray(o3.rn) && J(o3.rn.map(x => x == null ? null : x)) === J([1, 1, null, 1, null, 1]),
        'O3c 新建多声部五线谱写 rowNames:1（三部 / 对照 / 重奏 / 旋律＋钢琴）；简谱合唱（无五线谱行）、钢琴独奏（一份声部）不写', J(o3.rn));
      await A.close();
      /* O4 两入口同结果、一步撤销：旧外壳点行首谱号弹窗 / 新外壳音轨「⋯」 */
      const base = await (async () => { const P = await open(b); const r = await EV(P.pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 0, nMea: 2 }); return s; }); await P.close(); return r; })();
      const res = {};
      for (const sh of ['classic', 'flow']) {
        const P = await open(b, { shell: sh }); const p = P.pg;
        await EV(p, s => __ld(s), base);
        if (sh === 'classic') {
          const z = await EV(p, () => { const el = document.querySelector('[data-clefhead="vox:1"]'); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
          if (z) { await p.mouse.click(z.x, z.y); await p.waitForTimeout(150); }
          const vis = await EV(p, () => { const b = document.querySelector('#popmenu [data-chd="tenor8"]'); return !!(b && b.getClientRects().length); });
          if (vis) await p.click('#popmenu [data-chd="tenor8"]');
          res[sh] = { vis };
        } else {
          await p.hover('#flw-tr-vox-1', { position: { x: 20, y: 18 } }).catch(() => {});
          await p.click('#flw-tr-vox-1 [data-fa="tree:more"]').catch(() => {}); await p.waitForTimeout(150);
          const vis = await EV(p, () => { const b = document.querySelector('#popmenu [data-fa="tree:clefset"][data-v="t8"]'); return !!(b && b.getClientRects().length); });
          if (vis) await p.click('#popmenu [data-fa="tree:clefset"][data-v="t8"]');
          res[sh] = { vis };
        }
        await p.waitForTimeout(150);
        Object.assign(res[sh], await EV(p, () => ({ co: J0(song.voxClefOct), n: J0(song.voxNotations), u: undoStack.length })).catch(() => null) || {});
        const after = await EV(p, () => { const j = JSON.stringify(song); undo(); return { j, co: JSON.stringify(song.voxClefOct || null), u: undoStack.length }; });
        res[sh].undo = after.co; res[sh].j = after.j;
        await P.close();
      }
      T(res.classic.vis && res.flow.vis && res.classic.j === res.flow.j && /-1/.test(res.classic.j) && res.classic.undo === 'null' && res.flow.undo === 'null',
        'O4 行首谱号弹窗（旧外壳）与音轨「⋯」（新外壳）「男高音谱号」同一结果（voxClefOct[1]＝−1），一步撤销回到无字段', J({ c: res.classic.vis, f: res.flow.vis, same: res.classic.j === res.flow.j, u: [res.classic.undo, res.flow.undo] }));
      /* O5 插删声部与 migrate */
      const P5 = await open(b); const p5 = P5.pg;
      const o5 = await EV(p5, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }); s.voxTransp = [null, -2, null, null]; s.voxShort = ['S', null, null, null]; __ld(s);
        const r = {}; sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 };
        addVoice('vox'); r.add = [J0(song.voxClefOct), J0(song.voxTransp), J0(song.voxShort), song.voxVoices.length];
        delVoiceAt('vox', 0); r.del0 = [J0(song.voxClefOct), J0(song.voxTransp), J0(song.voxShort)];
        delVoiceAt('vox', 1); r.del1 = [J0(song.voxClefOct), J0(song.voxTransp)];
        const bad = JSON.parse(JSON.stringify(NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }))); bad.voxClefOct = [null, -1]; bad.voxTransp = [-2, null, null, null]; bad.voxShort = ['x'];
        const m = migrate(bad); r.mig = [J0(m.voxClefOct), J0(m.voxTransp), J0(m.voxShort)];
        const ok = migrate(JSON.parse(JSON.stringify(NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 })))); r.ok = J0(ok.voxClefOct);
        return r; });
      T(o5.add && o5.add[0] === J([null, null, -1, null, null]) && o5.add[1] === J([null, -2, null, null, null]) && o5.add[2] === J(['S', null, null, null, null])
        && o5.del0[0] === J([null, -1, null, null]) && o5.del0[1] === J([-2, null, null, null]) && o5.del0[2] === 'null' && o5.del1[0] === 'null' && o5.del1[1] === J([-2, null, null]),
        'O5a 加 / 删声部：voxClefOct / voxTransp / voxShort 随行对齐（末尾补 null；删到全空即删键）', J(o5));
      T(o5.mig && o5.mig[0] === 'null' && o5.mig[1] === J([-2, null, null, null]) && o5.mig[2] === 'null' && o5.ok === J([null, null, -1, null]), 'O5b migrate：长度≠声部数的数组丢弃（旧页面增删过声部），等长的原样保留', J(o5));
      /* O6 播放 / MIDI 不变 */
      const o6 = await EV(p5, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 });
        [0, 1, 2, 3].forEach(v => s.measures[0].voxes[v].forEach((c, i) => Object.assign(c, { deg: (i + v) % 7 + 1, oct: v >= 2 ? -1 : 0 })));
        const s0 = JSON.parse(JSON.stringify(s)); delete s0.voxClefOct;
        return { mid: __midiB(s) === __midiB(s0) }; });
      T(o6.mid === true, 'O6 MIDI 与去掉 voxClefOct 的同一首谱逐字节相同（八度谱号只改显示）', J(o6));
      allErrs.push(...A.errs, ...P5.errs); await P5.close();
    }

    /* ================= X 移调 ================= */
    if (want('X')) {
      const A = await open(b); const pg = A.pg;
      const x1 = await EV(pg, x => { const r = importMusicXML(x); const s = r.song; __ld(s);
        const g = __geo(['head', 'keysig']), sb = g.staffB['0:0'];
        const h = g.head.find(q => q.q === '0:0:0'), ks0 = g.keysig.filter(q => q.q === '0:0:-1').length, ks1 = g.keysig.filter(q => q.q === '1:0:-1').length;
        const svg = document.getElementById('score');
        const sharps = vi => { window.__pyqGeom = true; render(); window.__pyqGeom = false; const n = [...document.querySelectorAll('#score [data-g="keysig"][data-gq="' + vi + ':0:-1"]')].length; render(); return n; };
        return { tr: s.voxTransp, key: s.key, transp: s.transp, warn: r.warn, cl: s.measures[0].voxes[0].map(c => c.deg + (c.acc || '') + '/' + (c.oct || 0)), pn: s.measures[0].voxes[1].map(c => c.deg + '/' + (c.oct || 0)),
          midi: s.measures[0].voxes[0].map(c => voxMidi(c, 0)), sb, hy: h ? (h.y0 + h.y1) / 2 : null, ks0: sharps(0), ks1: sharps(1), short: s.voxShort, rn: s.rowNames }; }, FX_CLAR);
      T(x1.tr && J(x1.tr) === J([-2, null]) && x1.key === 'C' && !x1.transp && J(x1.pn) === J(['1/0', '3/0', '5/0', '1/0']) && J(x1.midi) === J([72, 74, 76, 72]),
        'X1a 「♭B 单簧管 + 钢琴」导入：钢琴音高不变、单簧管存实音（C5 D5 E5 C5）、voxTransp [−2, null]、不写 song.transp', J(x1));
      T(x1.hy != null && Math.abs(x1.hy - (x1.sb - 22.5)) <= 0.5 && x1.ks0 === 2 && x1.ks1 === 0, 'X1b 单簧管谱表调号 2♯、首音符头在记谱音 D5（第四线：底线 −22.5 ±0.5）；钢琴调号 0（修前单簧管调号 0、符头在 C5 第三间）', J(x1));
      T(/移调乐器按记谱音显示/.test(x1.warn || ''), 'X1c 导入提示改为「移调乐器按记谱音显示」', x1.warn);
      const x2 = await EV(pg, x => { const s = importMusicXML(x).song; const xml = exportMusicXML(s);
        const p1 = (/<part id="P1">([\s\S]*?)<\/part>/.exec(xml) || [])[1] || '', p2 = (/<part id="P2">([\s\S]*?)<\/part>/.exec(xml) || [])[1] || '';
        const notes = t => [...t.matchAll(/<pitch><step>([A-G])<\/step>(?:<alter>(-?\d)<\/alter>)?<octave>(\d)<\/octave><\/pitch>/g)].map(m => m[1] + (m[2] || '') + m[3]);
        const r2 = importMusicXML(xml).song;
        return { f1: (/<fifths>(-?\d+)<\/fifths>/.exec(p1) || [])[1], tr1: (/<transpose>[\s\S]*?<\/transpose>/.exec(p1) || [''])[0], n1: notes(p1), f2: (/<fifths>(-?\d+)<\/fifths>/.exec(p2) || [])[1], tr2: /<transpose>/.test(p2), n2: notes(p2),
          ab: /<part-abbreviation>Cl\.<\/part-abbreviation>/.test(xml), rt: J(r2.voxTransp), rtm: J(r2.measures[0].voxes[0].map(c => c.deg + '/' + (c.oct || 0))), src: J(s.measures[0].voxes[0].map(c => c.deg + '/' + (c.oct || 0))) }; }, FX_CLAR);
      T(x2.f1 === '2' && /<diatonic>-1<\/diatonic><chromatic>-2<\/chromatic>/.test(x2.tr1) && J(x2.n1) === J(['D5', 'E5', 'F15', 'D5']) && x2.f2 === '0' && !x2.tr2 && J(x2.n2) === J(['C4', 'E4', 'G4', 'C4']),
        'X2a 导出单簧管 part：<fifths>2、<transpose> diatonic −1 chromatic −2、音高按记谱 D5 E5 F♯5 D5（与源谱逐字段同）；钢琴不带 transpose', J(x2));
      T(x2.rt === J([-2, null]) && x2.rtm === x2.src && x2.ab, 'X2b 再导入 voxTransp 与音符不变、part-abbreviation 往返', J(x2));
      const x3 = await EV(pg, x => { const s = importMusicXML(x).song; const s0 = JSON.parse(JSON.stringify(s)); delete s0.voxTransp; return __midiB(s) === __midiB(s0); }, FX_CLAR);
      T(x3 === true, 'X3 MIDI 与把单簧管当实音写（去掉 voxTransp）的谱逐字节相同', x3);
      const x4 = await EV(pg, x => { const r = importMusicXML(x), s = r.song; __ld(s);
        const g = __geo(['head']), sb = g.staffB['1:0'], h = g.head.find(q => q.q === '1:0:0');
        return { tr: s.voxTransp, transp: s.transp, midi: s.measures[0].voxes[1].map(c => voxMidi(c, 0)), vox: s.measures[0].voxes[0].map(c => voxMidi(c, 0)), sb, hy: h ? (h.y0 + h.y1) / 2 : null }; }, FX_GTR);
      T(J(x4.tr) === J([null, -12]) && J(x4.midi) === J([52, 55, 59, 52]) && J(x4.vox) === J([72, 74, 76, 72]) && !x4.transp,
        'X4a 古典吉他（transpose octave-change −1）+ 人声：吉他存实音 E3 G3 B3 E3（修前 E4… 高八度）、voxTransp [null, −12]、人声不变', J(x4));
      T(x4.hy != null && Math.abs(x4.hy - x4.sb) <= 0.5, 'X4b 吉他显示同源谱：首音 E4 记谱位置（底线 ±0.5）', J(x4));
      const x5 = await EV(pg, x => { const s = importMusicXML(x).song; __ld(s); mutate(() => { transposeSong(song, 2); });
        const cnt = vi => { window.__pyqGeom = true; render(); window.__pyqGeom = false; const n = document.querySelectorAll('#score [data-g="keysig"][data-gq="' + vi + ':0:-1"]').length; render(); return n; };
        return { key: song.key, wk: voxWrittenKey(0, 0), ks0: cnt(0), ks1: cnt(1), tr: J(song.voxTransp) }; }, FX_CLAR);
      T(x5.key === 'D' && x5.wk === 'E' && x5.ks0 === 4 && x5.ks1 === 2 && x5.tr === J([-2, null]), 'X5 整曲换到 D 调：单簧管记谱调同步成 E（4♯）、钢琴 2♯，voxTransp 不变', J(x5));
      const x6 = await EV(pg, x => { const s = importMusicXML(x).song; __ld(s); const pl = partsPlan(song), pt = pl.parts.find(p => (p.vox || []).length === 1 && p.vox[0] === 0);
        if (!pt) return { err: 'no part', pl: pl.parts.map(p => p.kind + ':' + J0(p.vox)) };
        const c = partSong(pt).song; const xml = exportMusicXML(c);
        return { tr: J(c.voxTransp), f: (/<fifths>(-?\d+)<\/fifths>/.exec(xml) || [])[1], rn: c.rowNames != null ? c.rowNames : null, on: rowNamesOn(c) }; }, FX_CLAR);
      T(x6.tr === J([-2]) && x6.f === '2' && x6.on === false, 'X6 单簧管分谱：voxTransp [−2] 随行带入、导出记谱调 2♯；单声部分谱不印声部名', J(x6));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= R 首行声部名 ================= */
    if (want('R')) {
      const A = await open(b); const pg = A.pg;
      const r1 = await EV(pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 16 }); s.voxVoices = ['Soprano', 'Alto', 'Tenor', 'Bass']; __ld(s);
        const g = __geo(['clef']), sys = layoutSystems();
        const first = g.names.slice(0, 4), rest = g.names.slice(4, 8);
        const bx = g.brk.length ? Math.min(...g.brk.map(x => x.x)) : null;
        return { n: g.names.length, nsys: sys.length, first: first.map(n => n.t), rest: rest.map(n => n.t), maxR: Math.max(...g.names.map(n => n.b.x1)), brkL: bx, brkAll: g.brk.map(x => x.x), names: g.names.map(n => [n.t, +n.b.x1.toFixed(1)]) }; });
      T(r1.nsys >= 2 && r1.n === 4 * r1.nsys && J(r1.first) === J(['Soprano', 'Alto', 'Tenor', 'Bass']) && J(r1.rest) === J(['S.', 'A.', 'T.', 'B.']),
        'R1a 新建 SATB：首系统 4 个全称、续行 4 个简称（S. A. T. B.），每个系统都印', J(r1));
      /* 每个名字右缘 < 本系统方括号左缘 −3：方括号 x 按系统不同（首行 ind0、续行 ind1），逐名字找同一纵向范围的方括号 */
      const r1b = await EV(pg, () => { const g = __geo([]); return g.names.map(n => { const br = g.brk.find(b => n.y >= b.y - 2 && n.y <= b.y + b.h + 6); return br ? +(br.x - 3 - n.b.x1).toFixed(2) : null; }); });
      T(r1b.length && r1b.every(d => d != null && d > 0), 'R1b 名字右缘 < 方括号左缘 −3（逐个名字）', J(r1b));
      /* 左页边距按需加宽：名字左缘不进纸边 20px（打印不可印区）；全称放不进原页边距的首系统才缩进，简称放得下的续行不缩进 */
      const r1c = await EV(pg, () => { const g = __geo([]), pl = rowNamesPlan(); return { minL: Math.min(...g.names.map(n => n.b.x0)), ind0: pl.ind0, ind1: pl.ind1 }; });
      T(r1c.minL >= 19.5 && r1c.ind0 > 0 && r1c.ind1 === 0, 'R1c 名字左缘 ≥ 纸边 20px；首系统（Soprano 放不进 56px 页边距）缩进、续行（S. 放得下）不缩进', J(r1c));
      const r2 = await EV(pg, () => { const s = NWB.build('SG', { title: '伴', key: 'C', nMea: 12, lyr: 1 }); __ld(s);
        const g = __geo([]), sb1 = g.staffB['1:0'], sb2 = g.staffB['2:0'];
        const n0 = g.names.filter(n => n.y < sb2 + 40);
        const pn = n0.find(n => n.vi === 2), mid = (sb1 - 30 + sb2) / 2;
        return { names: n0.map(n => n.t + '@' + n.vi), pc: pn ? (pn.b.y0 + pn.b.y1) / 2 : null, mid, plan: J0(rowNamesPlan().units.map(u => [u.vi, u.type, u.f, u.sh])) }; });
      T(r2.names && r2.names.length === 2 && r2.names.some(x => /^钢琴@2$/.test(x)) && r2.pc != null && Math.abs(r2.pc - r2.mid) <= 2,
        'R2 钢琴伴奏歌曲（旋律＋右手 / 左手伴奏）：花括号组只 1 个名字「钢琴」，纵向中心与两谱表中线差 ≤2', J(r2));
      const r3 = await EV(pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 16 }); s.voxVoices = ['Soprano', 'Alto', 'Tenor', 'Bass']; __ld(s);
        const on = layoutSystems().map(y => ({ ind: y.ind, x0: y.measures[0].x, mi: y.measures[0].mi })), pl = rowNamesPlan();
        const lines = [...document.querySelectorAll('#score line')].filter(l => l.getAttribute('stroke-width') === '0.8').map(l => +l.getAttribute('x1'));
        const off = (() => { mutate(() => { delete song.rowNames; }); const r = layoutSystems().map(y => ({ ind: y.ind, x0: y.measures[0].x })); const l2 = [...document.querySelectorAll('#score line')].filter(l => l.getAttribute('stroke-width') === '0.8').map(l => +l.getAttribute('x1')); undo(); return { r, l2 }; })();
        return { on, ind0: pl.ind0, ind1: pl.ind1, M: MARGIN, minL: Math.min(...lines), lineXs: [...new Set(lines)].sort((a, b) => a - b), off }; });
      T(!r3.err && r3.ind0 > 0 && r3.on[0].ind === r3.ind0 && r3.on[0].x0 === r3.ind0 && r3.on.slice(1).every(y => y.ind === r3.ind1 && y.x0 === r3.ind1) && r3.off.r.every(y => y.ind == null && y.x0 === 0),
        'R3a 首系统首小节 x 右移 ind0、续行 ind1（关着时恒 0、不记 ind）', J(r3));
      T(!r3.err && r3.lineXs.includes(r3.M + r3.ind0) && r3.lineXs.includes(r3.M + r3.ind1) && r3.off.l2.every(x => x === r3.M), 'R3b 谱线起点＝页边距 + ind（首行 ind0、续行 ind1）；关着时都在页边距', J(r3.err ? r3 : { on: r3.lineXs, off: [...new Set(r3.off.l2)] }));
      /* R5 排版浮层开关（两外壳，一步撤销） */
      const r5 = {};
      for (const sh of ['classic', 'flow']) {
        const P = await open(b, { shell: sh }); const p = P.pg;
        await EV(p, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 4 }); delete s.rowNames; __ld(s); });
        await EV(p, () => { if (flowOn()) { try { setMode('engrave'); } catch (_) {} } else layToggle(true); });
        await p.waitForTimeout(900);
        if (sh === 'flow') { const st = await EV(p, () => { const e = document.querySelector('#flw-rstrip [data-fa="rd:tab"][data-p="lay"]'); return !!(e && e.getClientRects().length); });
          if (st) { await p.click('#flw-rstrip [data-fa="rd:tab"][data-p="lay"]'); await p.waitForTimeout(400); } }
        const vis = await EV(p, () => { const b = document.querySelector('#lp-rown [data-rn="1"]'); return !!(b && b.getClientRects().length && b.offsetParent); });
        if (vis) await p.click('#lp-rown [data-rn="1"]'); else await EV(p, () => document.querySelector('#lp-rown [data-rn="1"]').click());
        await p.waitForTimeout(150);
        await EV(p, () => { if (flowOn()) { try { setMode('write'); } catch (_) {} } render(); });
        await p.waitForTimeout(300);
        r5[sh] = await EV(p, () => { const a = { rn: song.rowNames, n: document.querySelectorAll('#score [data-rown]').length, on: document.querySelector('#lp-rown [data-rn="1"]').classList.contains('on') }; undo(); a.after = song.rowNames == null ? null : song.rowNames; a.n2 = document.querySelectorAll('#score [data-rown]').length; return a; });
        r5[sh].vis = vis;
        allErrs.push(...P.errs); await P.close();
      }
      T(r5.classic.rn === 1 && r5.flow.rn === 1 && r5.classic.n > 0 && r5.classic.n === r5.flow.n && r5.classic.on && r5.flow.on && r5.classic.after === null && r5.flow.after === null && r5.classic.n2 === 0 && r5.flow.n2 === 0,
        'R5 排版浮层「声部名」开关：两外壳同结果（rowNames 1、谱面出名字、按钮亮），一步撤销回到无键', J(r5));
      /* R6 往返与第三方默认 */
      const r6 = await EV(pg, a => { const [fxC, fxH, fxT] = a;
        const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }); s.voxShort = ['Sop.', null, null, null];
        const xml = exportMusicXML(s), back = importMusicXML(xml).song;
        const s2 = JSON.parse(JSON.stringify(s)); delete s2.rowNames; delete s2.voxShort; const xml2 = exportMusicXML(s2), back2 = importMusicXML(xml2).song;
        return { misc: /pyq-rownames">1</.test(xml), ab: /<part-abbreviation>Sop\.<\/part-abbreviation>/.test(xml), back: [back.rowNames, J0(back.voxShort)], misc2: /pyq-rownames/.test(xml2), back2: back2.rowNames == null ? null : back2.rowNames,
          tp: importMusicXML(fxC).song.rowNames, hide: importMusicXML(fxH).song.rowNames == null ? null : 1, ten: importMusicXML(fxT).song.rowNames }; }, [FX_CLAR, FX_HIDE, FX_GTR]);
      T(r6.misc && r6.ab && r6.back[0] === 1 && r6.back[1] === J(['Sop.', null, null, null]) && !r6.misc2 && r6.back2 === null,
        'R6a 自家导出：开着写 pyq-rownames、voxShort 写 part-abbreviation，导入原样读回；关着不写、导回仍关', J(r6));
      T(r6.tp === 1 && r6.ten === 1 && r6.hide === null, 'R6b 第三方多声部文件默认开（单簧管＋钢琴、人声＋吉他）；part-name print-object="no" 不开', J(r6));
      /* R8 新元素过 MusicXML 4.0 官方 XSD（同 tv_xsd：xmllint --schema fixtures/xsd/musicxml.xsd；没有 xmllint 时跳过） */
      { const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
        let has = false; try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); has = fs.existsSync(XSD); } catch (_) {}
        if (!has) console.log('⚠️ R8 跳过：没有 xmllint 或 XSD');
        else {
          const xs = await EV(pg, a => { const [fc, ft, fg] = a; const out = [];
            const s1 = importMusicXML(fc).song; out.push(['单簧管＋钢琴', exportMusicXML(s1)]);
            out.push(['男高＋男低', exportMusicXML(importMusicXML(ft).song)]); out.push(['人声＋吉他', exportMusicXML(importMusicXML(fg).song)]);
            const s4 = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 2 }); s4.voxShort = ['S.', null, null, null]; s4.voxTransp = [null, null, null, -12]; out.push(['新建 SATB', exportMusicXML(s4)]);
            return out; }, [FX_CLAR, FX_TENOR, FX_GTR]);
          const TMPD = fs.mkdtempSync(path.join(os.tmpdir(), 'v698n_'));
          const bad = [], seen = { co: 0, tr: 0, ab: 0, rn: 0 };
          (Array.isArray(xs) ? xs : []).forEach(([n, x], i) => { const f = path.join(TMPD, i + '.xml'); fs.writeFileSync(f, x);
            if (/<clef-octave-change>/.test(x)) seen.co++; if (/<transpose>/.test(x)) seen.tr++; if (/<part-abbreviation>/.test(x)) seen.ab++; if (/pyq-rownames/.test(x)) seen.rn++;
            try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); }
            catch (e) { bad.push(n + ': ' + String(e.stderr || e.message || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | ')); } });
          T(Array.isArray(xs) && xs.length === 4 && !bad.length && seen.co >= 1 && seen.tr >= 3 && seen.ab >= 2 && seen.rn >= 3, 'R8 新元素（clef-octave-change / 声部级 transpose / part-abbreviation / pyq-rownames）导出过 MusicXML 4.0 XSD', J({ bad, seen }));
        } }
      const r7 = await EV(pg, () => PRESETS.map(p => { const s = p.make(); return s.rowNames == null && s.voxClefOct == null && s.voxTransp == null && s.voxShort == null; }));
      T(r7.length >= 16 && r7.every(Boolean), 'R7 16 个示例预设不写 rowNames / voxClefOct / voxTransp / voxShort', J(r7));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= Z 老谱零变化（与 cd08ca0 对拍） + R4 ================= */
    if (want('Z') || want('R')) {
      const ru = refUrl();
      if (!ru) T(false, 'Z0 基线页（git show ' + REF_COMMIT + '）取不到');
      else {
        const N = await open(b), R = await open(b, { url: ru });
        const presets = await EV(N.pg, () => PRESETS.map((p, i) => ({ name: '预设' + i + '·' + p.name, song: p.make() })));
        /* v69.8 集成迁移：曲库 seed 已重建（带 rowNames / syl / tempos / tieSlur / 长倚音），对拍前去掉全部 v69.8 新字段＝还原成「老谱」 */
        const samples = presets.concat(GC.libSamples().map(x => Object.assign({}, x, { song: STRIP698(x.song) })), GC.stressSamples());
        const run = async (pg, list) => EV(pg, L => L.map(x => { const h = __off(x.song); let xml = null, mid = null;
          try { xml = __xml(migrate(JSON.parse(JSON.stringify(x.song)))); } catch (e) { xml = 'ERR ' + e.message; }
          try { mid = __midiB(migrate(JSON.parse(JSON.stringify(x.song)))); } catch (e) { mid = 'ERR ' + e.message; }
          return { h, xml, mid }; }), list.map(x => ({ song: x.song })));
        if (want('Z')) {
          const a = await run(N.pg, samples), r = await run(R.pg, samples);
          /* v69.8 集成迁移：四组合并后，别组已拍板的观感 / 听感变化（规格 §7）按类放行、逐项列出——
             谱面：纯五线谱去掉 E8（B 组：页头 ♩= → 首行谱表上方，两边用 tv_v698play 同一套正则剥掉）后须相同；带五线谱倚音的放行（A 组 T9 按时值画符尾 / 符杠）；
             MIDI：带跳音 / 重音 / 延长号 / 踏板 / 渐强渐弱的放行（B 组 F3）；MusicXML 一律逐字节相同。其余样本仍须与 cd08ca0 逐字节相同（C 组本身零差异） */
          const bad = { h: [], xml: [], mid: [] }, allow = { e8: [], t9: [], f3: [] };
          samples.forEach((s, i) => { if (!a[i] || !r[i]) { bad.h.push(s.name); return; }
            const ft = FEAT698(s.song);
            if (a[i].h !== r[i].h) { if (ft.stGr) allow.t9.push(s.name); else if (ft.pure && E8STRIP(a[i].h, true) === E8STRIP(r[i].h, false)) allow.e8.push(s.name); else bad.h.push(s.name); }
            if (a[i].xml !== r[i].xml) bad.xml.push(s.name);
            if (a[i].mid !== r[i].mid) { if (ft.f3) allow.f3.push(s.name); else bad.mid.push(s.name); } });
          console.log('ℹ️ Z 放行（别组拍板的变化）：E8 ' + allow.e8.length + ' 份 ' + J(allow.e8) + '；T9 ' + allow.t9.length + ' 份 ' + J(allow.t9) + '；F3（MIDI）' + allow.f3.length + ' 份 ' + J(allow.f3));
          T(!bad.h.length, 'Z1 老谱离屏谱面与 ' + REF_COMMIT + ' 逐字节相同（16 预设 + 曲库 10 首去掉新字段 + 压力小样，共 ' + samples.length + ' 份；E8 / T9 按类放行）', J(bad.h.slice(0, 6)));
          T(!bad.xml.length, 'Z2 老谱 MusicXML 导出与 ' + REF_COMMIT + ' 逐字节相同', J(bad.xml.slice(0, 6)));
          T(!bad.mid.length, 'Z3 老谱 MIDI 与 ' + REF_COMMIT + ' 逐字节相同（F3 记号按类放行）', J(bad.mid.slice(0, 6)));
        }
        if (want('R')) {
          /* R4 新建谱去掉新字段（rowNames / voxClefOct）后离屏谱面与 cd08ca0 新建的同一首（去掉同样字段）逐字节相同；编辑器 #score 同 */
          const kinds = [['S', { nVox: 4, lyr: 1 }], ['SG', { lyr: 1 }], ['SJ', { nVox: 4, lyr: 1 }], ['S', { nVox: 2, lyr: 0 }]];
          const mk = (pg) => EV(pg, K => K.map(([k, o]) => { const s = NWB.build(k, Object.assign({ title: '对拍', key: 'C', nMea: 12 }, o));
            delete s.rowNames; delete s.voxClefOct; delete s.voxShort; delete s.voxTransp; return { off: __off(s), j: JSON.stringify(s) }; }), kinds);
          const a = await mk(N.pg), r = await mk(R.pg);
          /* v69.8 集成迁移：新建的纯五线谱（四部合唱 / 旋律＋钢琴 / 二部重奏）页头速度按 E8 挪到首行谱表上方（B 组）——两边剥掉 E8 再比；对照四部（含简谱行）不剥 */
          const eqR = (x, i) => x.j === r[i].j && (x.off === r[i].off || (FEAT698(JSON.parse(x.j)).pure && E8STRIP(x.off, true) === E8STRIP(r[i].off, false)));
          T(a.length === r.length && a.every(eqR), 'R4 新建谱关掉声部名 / 去掉八度谱号后与 ' + REF_COMMIT + ' 逐字节相同（四部合唱 / 旋律＋钢琴 / 对照四部 / 二部重奏；纯五线谱剥掉 E8 后比）',
            J(a.map((x, i) => [x.off === r[i].off, x.j === r[i].j, eqR(x, i)])));
        }
        allErrs.push(...N.errs); await N.close(); await R.close();
      }
    }
  } catch (e) { T(false, 'EXC ' + (e.stack || e).toString().slice(0, 400)); }
  finally {
    T(!allErrs.length, 'E 无页面报错', J(allErrs.slice(0, 5)));
    await b.close();
    console.log(`\n${pass}/${total} 通过` + (fails.length ? '；未过：' + fails.join(' ') : ''));
    process.exit(fails.length ? 1 : 0);
  }
})();
