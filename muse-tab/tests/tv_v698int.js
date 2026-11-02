'use strict';
/* v69.8 集成：四组（D 录入 · A 歌词与倚音 · B 播放与速度 · C 记谱与首行名）各自基于 cd08ca0 开发、在同一批大函数（renderCore / play / importMusicXML /
   exportMusicXML / layoutSystems）里各改一块——本套件只测「组与组之间」的接缝，各组自己的功能由 tv_v698in / lyr / play / nota 管。
   file:// 直载、真实浏览器；数值断言（播放事件记录器、MIDI 解析、data-g 几何、导出文本 + 官方 XSD）。
   I1 长倚音端到端：MusicXML <grace/>（A 组导入记 slash:false）→ 播放 / MIDI 拍上奏出、主音推后（B 组读同一字段）；<grace slash="yes"/> 照旧拍前短促；导出往返
   I2 同一份谱同时带首行声部名（C）、曲中速度与 E8 首行速度（B）、歌词连字符 / 延长线（A）、长倚音与同音重奏（A / B）、八度谱号与移调声部（C）：
      碰撞普查（geom_census，含新类别 lyrhy / lyrext / rowname / tempo）各类组 0 处、新类别确有元素；速度标记在首行名右侧、不与名字 / 括号相交
   I3 移调声部（voxTransp −2）与男高八度谱号（voxClefOct −1）上：倚音符头 y ＝同音高主音符头 y（stGrace 走声部级 K＝staffKeyInfoV）；
      同音重奏弧（tieSlur）两端在符头中心 ±0.5、离符头 6.5±0.6（B 组圆滑线几何跟着 C 组的谱表位置走）
   I4 录入时值沿用（D）落在男高八度谱号行（C）：键盘「r 1 2 3」→ 三个八分、实音 C3 D3 E3；鼠标点第三间（记谱 C5）→ 实音 C4、同样八分（两外壳）
   I5 一份谱同时带 syl / grace.slash / tempos / tieSlur / voxTransp / voxClefOct / rowNames 导出：过 MusicXML 4.0 官方 XSD；再导入这些字段逐项相同
   I6 首行声部名续行不变窄：曲库带花括号「Pno.」/ 方括号「Wom.」的续行缩进 0（简称统一缩字号 ≥9 放进页边距，左缘 ≥ 纸边 16px）、首系统全称左缘 ≥20px；
      夏威夷骊歌开着首行名与关掉时行数 / 页数相同（此前续行缩进 7–10px，多出只有 1 小节的末行）
   E  页面脚本错误 0
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=I1,I3 只跑部分段。 */
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
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'seed-library.json'), 'utf8'));
const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1200) : '')); };
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));

const HELP = () => {
  window.J = x => JSON.stringify(x);
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; blurSel = true; render(); return song.measures.length; };
  /* 播放调度记录（同 tv_v698play：四个发声函数 + 分窗排程余下的；时间相对起播原点） */
  window.__play = () => { const rec = []; const o = { p: window.playInst, c: window.chick, h: window.percHit, m: window.metroClick };
    const R = x => Math.round(x * 1e6) / 1e6;
    window.playInst = (k, c, b2, f, w, ring, g) => rec.push(['p', f, w, ring, g]);
    window.chick = () => {}; window.percHit = () => {}; window.metroClick = () => {};
    let t0 = 0;
    try { sel.mi = 0; sel.ci = 0; play(); t0 = audio.prog ? audio.prog.t : 0;
      const S = audio.schedQ; if (S) S.q.slice(S.i).forEach(ev => { const a = ev.a; if (ev.k === 'playInst') rec.push(['p', a[3], a[4], a[5], a[6]]); }); }
    finally { stopPlay(); window.playInst = o.p; window.chick = o.c; window.percHit = o.h; window.metroClick = o.m; }
    return rec.map(r => ({ m: r[1] ? Math.round(69 + 12 * Math.log2(r[1] / 440)) : 0, w: R(r[2] - t0), d: R(r[3]) })).sort((a, b) => a.w - b.w || a.m - b.m); };
  /* MIDI 音符事件 [{tick, on, k}]（各轨合并） */
  window.__mnotes = () => { const bytes = [...exportMIDI(song).bytes], out = []; let i = 14;
    while (i < bytes.length) { if (bytes[i] !== 0x4D) break; const len = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7]; let j = i + 8, end = j + len, tick = 0, run = 0;
      while (j < end) { let d = 0, b; do { b = bytes[j++]; d = (d << 7) | (b & 0x7f); } while (b & 0x80); tick += d;
        let st = bytes[j]; if (st & 0x80) j++; else st = run; run = st;
        if (st === 0xFF) { j++; let L = 0; do { b = bytes[j++]; L = (L << 7) | (b & 0x7f); } while (b & 0x80); j += L; }
        else if (st === 0xF0 || st === 0xF7) { let L = 0; do { b = bytes[j++]; L = (L << 7) | (b & 0x7f); } while (b & 0x80); j += L; }
        else { const hi = st & 0xF0; if (hi === 0x90 || hi === 0x80) { const k = bytes[j], v = bytes[j + 1]; if (hi === 0x90 && v > 0) out.push({ tick, k }); j += 2; }
          else if (hi === 0xC0 || hi === 0xD0) j += 1; else j += 2; } }
      i = end; }
    return out.sort((a, b) => a.tick - b.tick || a.k - b.k); };
  /* 编辑器谱面（#score）开标记重排：各类 data-g 元素在谱面坐标里的外框（同 tv_v698nota __geo） */
  window.__geo = (cats) => { window.__pyqGeom = true; try { render(); } finally { window.__pyqGeom = false; }
    const svg = document.getElementById('score'), inv = svg.getScreenCTM().inverse(), out = {};
    const box = el => { const M = inv.multiply(el.getScreenCTM()), b = el.getBBox();
      const ps = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(M));
      return { x0: Math.min(...ps.map(p => p.x)), y0: Math.min(...ps.map(p => p.y)), x1: Math.max(...ps.map(p => p.x)), y1: Math.max(...ps.map(p => p.y)), q: el.getAttribute('data-gq') || '', d: el.getAttribute('d') || '' }; };
    cats.forEach(k => { out[k] = [...svg.querySelectorAll('[data-g="' + k + '"]')].map(box); });
    out.names = [...svg.querySelectorAll('[data-rown]')].map(e => Object.assign(box(e), { t: e.textContent, fs: +e.getAttribute('font-size') }));
    out.pages = [...svg.querySelectorAll('.pagebg')].map(r => +r.getAttribute('x'));
    render(); return out; };
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  /* I2 / I3 / I5 共用的接缝谱：SATB（NWB 新建：rowNames 1、男高 voxClefOct −1、纯五线谱 → E8 首行速度）＋ 女低按 F 调圆号显示（voxTransp −7）；
     女高第 1 小节「A-ve Ma-ri-a」带连字符、末音节延长线拖过第 2 小节首音；第 2 小节第 3 拍、第 3 小节拍首两个曲中速度点；
     男高 / 女低第 2 小节前两格同音重奏（tie + tieSlur）、第 3 小节首格长倚音（单个八分，与主音同音高）；女高第 3 小节首格短倚音 */
  window.__seam = () => { const s = NWB.build('S', { title: '接缝', key: 'C', nVox: 4, lyr: 1, nMea: 6 });
    s.voxTransp = [null, -7, null, null];
    const M = (mi, vi) => s.measures[mi].voxes[vi];
    const q4 = (deg, oct, x) => __V(deg, 4, Object.assign({ oct }, x || {}));
    s.measures.forEach((m, mi) => { m.voxes[0] = [q4(5, 0), q4(6, 0), q4(5, 0), q4(3, 0)]; m.voxes[1] = [q4(3, 0), q4(4, 0), q4(3, 0), q4(1, 0)];
      m.voxes[2] = [q4(1, 0), q4(2, 0), q4(1, 0), q4(5, -1)]; m.voxes[3] = [q4(1, -1), q4(4, -1), q4(5, -1), q4(1, -1)]; });
    ['A', 've', 'Ma', 'ri', 'a'].forEach((t, i) => { const c = i < 4 ? M(0, 0)[i] : M(1, 0)[0]; c.lyrics = [t]; if (i === 0 || i === 2 || i === 3) c.syl = [1]; if (i === 4) c.syl = [2]; });
    M(1, 0)[1].lyrics = []; M(1, 0)[2].lyrics = ['Gra'];
    s.measures[1].tempos = [{ q: 2, bpm: 72, text: 'Più mosso' }]; s.measures[2].tempos = [{ q: 0, bpm: 60 }];
    [2, 1].forEach(vi => { const a = M(1, vi)[0], b = M(1, vi)[1]; b.deg = a.deg; b.oct = a.oct; a.tie = true; a.tieSlur = true;
      const g = M(2, vi)[0]; g.grace = { notes: [{ deg: g.deg, oct: g.oct }], dur: 8, slash: false }; });
    M(2, 0)[0].grace = { notes: [{ deg: 6, oct: 0 }], dur: 8 };
    return s; };
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
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 400) }));
async function keys(pg, seq) { for (const k of seq.split(' ').filter(Boolean)) { await pg.keyboard.press(k); await pg.waitForTimeout(15); } }

/* I1 夹具：一个人声 part，♩=60，第 1 小节「C5 四分 · [倚音 E5 八分] D5 四分 · E5 二分」（倚音放在第 2 拍：拍前短促的老口径要有前一拍才看得出） */
const FX_GRACE = sl => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>60</per-minute></metronome></direction-type><sound tempo="60"/></direction>
<note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
<note>${sl}<pitch><step>E</step><octave>5</octave></pitch><voice>1</voice><type>eighth</type></note>
<note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
</measure></part></score-partwise>`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= I1 长倚音：A 组导入 → B 组播放 / MIDI ================= */
    if (want('I1')) {
      const A = await open(b); const pg = A.pg;
      const one = sl => EV(pg, x => { const im = importMusicXML(x); __ld(im.song); const c = song.measures[0].voxes[0][1];
        const ev = __play(), mn = __mnotes(), ex = exportMusicXML(song);
        return { slash: c.grace && c.grace.slash, g: J(c.grace), ev: ev.slice(0, 4), mn: mn.slice(0, 4), ppq: (() => { const by = [...exportMIDI(song).bytes]; return (by[12] << 8) | by[13]; })(),
          long: (ex.match(/<grace\/>/g) || []).length, short: (ex.match(/<grace slash="yes"\/>/g) || []).length }; }, FX_GRACE(sl));
      const L = await one('<grace/>'), S = await one('<grace slash="yes"/>');
      /* 第 2 拍（♩=60 → 1 秒处）：倚音 E5（76）、主音 D5（74） */
      const gL = L.ev && L.ev.find(e => e.m === 76), mL = L.ev && L.ev.find(e => e.m === 74), gS = S.ev && S.ev.find(e => e.m === 76), mS = S.ev && S.ev.find(e => e.m === 74);
      T(!L.err && L.slash === false && S.slash === undefined, 'I1a 导入：<grace/> → grace.slash false（A 组）；<grace slash="yes"/> → 无键', J({ L: L.g, S: S.g, err: L.err || S.err }));
      T(!L.err && gL && mL && Math.abs(gL.w - 1) < 0.005 && Math.abs(gL.d - 0.5) < 0.01 && Math.abs(mL.w - 1.5) < 0.005,
        'I1b 播放：导入的长倚音在第 2 拍拍上奏出、占八分（♩=60 下 0.5 秒），主音 D5 推后到 1.5 秒（B 组读 A 组字段，经真导入而不是手造数据）', J(L.ev));
      T(!S.err && gS && mS && gS.w <= mS.w && gS.d < 0.2 && mS.w - 1 < 0.15 && mS.w >= 1 - 0.005, 'I1c 播放：短倚音照旧短促（≤0.2 秒）、主音只让出一点（<0.15 秒，老口径不变）', J(S.ev));
      const ppq = L.ppq, tG = L.mn && L.mn.find(e => e.k === 76), tM = L.mn && L.mn.find(e => e.k === 74), sG = S.mn && S.mn.find(e => e.k === 76), sM = S.mn && S.mn.find(e => e.k === 74);
      T(tG && tM && tG.tick === ppq && tM.tick === ppq * 1.5 && sG && sM && sM.tick - ppq < ppq / 4, 'I1d MIDI：长倚音 note-on 在第 2 拍、主音推后半拍（PPQ/2）；短倚音的主音让出不到 1/4 拍（老口径）', J({ ppq, L: L.mn, S: S.mn }));
      T(L.long === 1 && L.short === 0 && S.long === 0 && S.short === 1, 'I1e 导出往返：长倚音写 <grace/>、短倚音写 <grace slash="yes"/>', J({ L: [L.long, L.short], S: [S.long, S.short] }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= I2 同一份谱的四组记号：碰撞普查（含新类别）＋ 首行速度 × 首行名 ================= */
    if (want('I2')) {
      const A = await open(b); const pg = A.pg;
      const seam = await EV(pg, () => __seam());
      const lib = ['lib-os-lc4985973', 'lib-os-lc6650166', 'lib-os-lc5100543', 'lib-os-lc6389103'].map(id => { const it = LIB.find(x => x.id === id); return { name: it.title, song: it.data, kind: 'lib' }; });
      const R = await GC.census(pg, [{ name: '接缝谱', song: seam, kind: 'stress' }].concat(lib), { paperW: 870, presets: false });
      const G = GC.groupCounts(R);
      const bad = Object.keys(G).filter(k => k !== 'C17' && k !== 'M11' && G[k].n).map(k => k + ' ' + G[k].n + ' ' + J(G[k].ex || []).slice(0, 200));
      const cnt = await EV(pg, x => { const o = {}; x.forEach(s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); window.__pyqGeom = true;
        try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s.song))), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
        const n = k => svg.querySelectorAll('[data-g="' + k + '"]').length; o[s.name] = { lyrhy: n('lyrhy'), lyrext: n('lyrext'), rowname: n('rowname'), tempo: n('tempo') }; svg.remove(); }); return o; }, [{ name: '接缝谱', song: seam }].concat(lib));
      const nn = Object.values(cnt).reduce((a, o) => { for (const k in o) a[k] = (a[k] || 0) + o[k]; return a; }, {});
      T(!bad.length && nn.lyrhy > 20 && nn.lyrext > 0 && nn.rowname > 10 && nn.tempo > 5,
        'I2a 接缝谱 + 曲库 4 首（连字符 / 延长线 / 首行名 / 曲中速度齐全）：碰撞普查含新类别 lyrhy / lyrext / rowname，各类组 0 处（C17 圆滑线 later 组不计），新类别确有元素', J({ bad, cnt }));
      /* 首行（E8）速度标记与首行声部名 / 括号：速度墨迹左缘在名字右缘与谱线起点之右、不相交；曲中速度标记在谱表上方 */
      const g = await EV(pg, s => { __ld(s); const o = __geo(['tempo', 'bracket', 'head']); return o; }, seam);
      const sys0T = (g.tempo || []).filter(t => t.y1 < 200), nm0 = (g.names || []).slice(0, 4);   /* 首系统 4 个全称先画 */
      const nmR = Math.max(...nm0.map(n => n.x1)), hit = sys0T.filter(t => nm0.some(n => !(t.x1 < n.x0 || t.x0 > n.x1 || t.y1 < n.y0 || t.y0 > n.y1)));
      T(!g.err && sys0T.length >= 1 && nm0.length === 4 && !hit.length && Math.min(...sys0T.map(t => t.x0)) > nmR,
        'I2b 纯五线谱 SATB（首行名 + E8 首行速度）：首系统速度标记在 4 个声部全称右侧、与名字不相交', J({ tempo: sys0T.map(t => [t.x0, t.y0, t.x1, t.y1].map(v => +v.toFixed(1))), nm: nm0.map(n => [n.t, n.x0, n.y0, n.x1, n.y1].map(v => typeof v === 'number' ? +v.toFixed(1) : v)), err: g.err }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= I3 移调 / 八度谱号声部上的倚音与同音重奏弧 ================= */
    if (want('I3')) {
      const A = await open(b); const pg = A.pg;
      const r = await EV(pg, () => { __ld(__seam());
        const g = __geo(['head', 'grace', 'tie']); const out = {};
        const hd = q => g.head.filter(h => h.q === q).map(h => ({ cx: (h.x0 + h.x1) / 2, cy: (h.y0 + h.y1) / 2 }));
        [2, 1].forEach(vi => {
          /* 倚音：第 3 小节首格，grace 的符头类（data-g grace 里取最小的近似圆块：noteheadBlack 0.62 倍） */
          const gr = g.grace.filter(x => x.q === vi + ':2:0' && x.x1 - x.x0 < 8 && x.y1 - x.y0 < 6 && x.y1 - x.y0 > 3), mh = hd(vi + ':2:0');
          /* 同音重奏弧：第 2 小节首格起的 tie 路径，M x1 y1 Q mx qy x2 y2 */
          const ti = g.tie.filter(x => x.q === vi + ':1:0').map(x => { const n = x.d.match(/-?[\d.]+/g).map(Number); return { x1: n[0], y1: n[1], x2: n[4], y2: n[5] }; });
          out[vi] = { grY: gr.map(x => (x.y0 + x.y1) / 2), mainY: mh.map(h => h.cy), h0: hd(vi + ':1:0'), h1: hd(vi + ':1:1'), tie: ti };
        });
        out.K = { t: J(staffKeyInfoV(2, 2).c8 || 0), a: voxTranspOf(1) };
        return out; });
      const okG = vi => r[vi] && r[vi].grY.length === 1 && r[vi].mainY.length === 1 && Math.abs(r[vi].grY[0] - r[vi].mainY[0]) <= 0.6;
      T(!r.err && okG(2) && okG(1), 'I3a 倚音符头 y ＝同音高主音符头 y ±0.6：男高八度谱号行（voxClefOct −1）与女低移调行（voxTransp −7）——stGrace 用声部级 K', J(r));
      const okT = vi => { const o = r[vi]; if (!o || o.tie.length !== 1 || o.h0.length !== 1 || o.h1.length !== 1) return false; const t = o.tie[0];
        return Math.abs(t.x1 - o.h0[0].cx) <= 0.5 && Math.abs(t.x2 - o.h1[0].cx) <= 0.5 && Math.abs(Math.abs(t.y1 - o.h0[0].cy) - 6.5) <= 0.6; };
      T(!r.err && okT(2) && okT(1), 'I3b 同音重奏弧（tieSlur）在男高八度谱号行 / 女低移调行：两端在符头中心 ±0.5、离符头 6.5±0.6（圆滑线几何跟着声部级谱表位置）', J({ t: r[2], a: r[1] }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= I4 录入时值沿用 × 男高八度谱号（两外壳） ================= */
    if (want('I4')) {
      const res = {};
      for (const sh of ['flow', 'classic']) {
        const A = await open(b, { shell: sh }); const pg = A.pg, tag = '〔' + (sh === 'flow' ? '新外壳' : '旧外壳') + '〕';
        await EV(pg, () => { const s = NWB.build('S', { title: '合', key: 'C', nVox: 4, lyr: 1, nMea: 3 }); __ld(s);
          sel = { mi: 0, row: 'vox', vi: 2, ci: 0, si: 1 }; blurSel = false; lastEnt = null; render(); try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} });
        await keys(pg, 'r 1 2 3');
        const k = await EV(pg, () => ({ co: J(song.voxClefOct), c: song.measures[0].voxes[2].map(c => (c.deg ? voxMidi(c, 0) : 0) + '/' + c.dur).join(' '), be: beatErrors().length }));
        /* 鼠标：第 2 小节第 1 格（空格）先点选中、再点第三间（谱表底线 + 5 步＝记谱 C5，八度谱号下实音 C4） */
        const pt = async () => EV(pg, () => { const rect = document.querySelector('[data-row="vox"][data-vi="2"][data-mi="1"][data-ci="0"][data-staffb]'); if (!rect) return null; rect.scrollIntoView({ block: 'center' });
          const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.height / svg.viewBox.baseVal.height, bb = rect.getBoundingClientRect();
          const x = bb.x + bb.width / 2, y = R.top + (+rect.dataset.staffb - 3.75 * 5) * k, h = document.elementFromPoint(x, y);
          return { x, y, hit: !!(h && h.dataset && h.dataset.staffb !== undefined && +h.dataset.mi === 1 && +h.dataset.vi === 2) }; });
        let p = await pt(), ok = !!(p && p.hit);
        if (ok) { await pg.mouse.click(p.x, p.y); await W(520); p = await pt(); ok = !!(p && p.hit); if (ok) { await pg.mouse.click(p.x, p.y); await W(120); } }
        const m = await EV(pg, () => { const c = song.measures[1].voxes[2][0]; return { c: (c.deg ? voxMidi(c, 1) : 0) + '/' + c.dur, be: beatErrors().length }; });
        res[sh] = { k, m, ok };
        T(!k.err && k.co === J([null, null, -1, null]) && /^48\/8 50\/8 52\/8 0\/8 /.test(k.c + ' ') && k.be === 0,
          'I4a' + tag + ' 男高八度谱号行键入「r 1 2 3」→ 三个八分（D 组沿用），实音 C3 D3 E3（C 组按显示谱表取八度）', J(k));
        T(ok && m.c === '60/8' && m.be === 0, 'I4b' + tag + ' 鼠标点男高第三间（记谱 C5）→ 实音 C4、时值沿用八分（staffClickPitch 走声部级 K、落音走沿用）', J({ ok, m }));
        allErrs.push(...A.errs); await A.close();
      }
      T(res.flow && res.classic && J(res.flow.k.c) === J(res.classic.k.c) && res.flow.m.c === res.classic.m.c, 'I4c 两外壳结果相同', J(res));
    }

    /* ================= I5 全部新字段同时导出：XSD + 往返 ================= */
    if (want('I5')) {
      const A = await open(b); const pg = A.pg;
      const r = await EV(pg, () => { __ld(__seam()); const x = exportMusicXML(song), im = importMusicXML(x), s2 = im.song;
        const pick = s => { const o = { co: J(s.voxClefOct || null), tr: J(s.voxTransp || null), rn: s.rowNames || 0, tp: [], syl: [], ts: [], gs: [] };
          s.measures.forEach((m, mi) => { (m.tempos || []).forEach(t => o.tp.push(mi + ':' + t.q + ':' + t.bpm + ':' + (t.text || '') + (t.hide ? 'h' : '')));
            (m.voxes || []).forEach((r, vi) => (r || []).forEach((c, ci) => { if (!c) return; const k = vi + ':' + mi + ':' + ci;
              if (c.syl) o.syl.push(k + '=' + J(c.syl)); if (c.tieSlur) o.ts.push(k); if (c.grace && c.grace.slash === false) o.gs.push(k); })); });
          o.tp = o.tp.join(' '); o.syl = o.syl.join(' '); o.ts = o.ts.join(' '); o.gs = o.gs.join(' '); return o; };
        return { xml: x, a: pick(song), b: pick(s2), tags: ['<syllabic>begin', '<extend type="start"/>', '<metronome', '<sound tempo', '<transpose>', '<clef-octave-change>', 'pyq-rownames', '<grace/>', '<slur'].map(t => t + ' ' + (x.split(t).length - 1)) }; });
      const tagsOk = r.tags && r.tags.every(t => +t.split(' ').pop() > 0);
      T(!r.err && tagsOk, 'I5a 接缝谱导出同时含 syllabic / extend / metronome / sound tempo / transpose / clef-octave-change / pyq-rownames / <grace/> / slur', J(r.tags || r.err));
      let xsdOk = null, xsdMsg = '';
      try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); if (fs.existsSync(XSD)) {
        const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'v698int_')), 'seam.xml'); fs.writeFileSync(f, r.xml || '');
        try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); xsdOk = true; } catch (e) { xsdOk = false; xsdMsg = String(e.stderr || e).slice(0, 600); } } } catch (_) {}
      if (xsdOk === null) console.log('⚠️ I5b 跳过：没有 xmllint 或 XSD'); else T(xsdOk, 'I5b 导出过 MusicXML 4.0 官方 XSD（fixtures/xsd，xmllint）', xsdMsg);
      const keysEq = ['co', 'tr', 'rn', 'tp', 'syl', 'ts', 'gs'].filter(k => r.a && r.b && r.a[k] !== r.b[k]);
      T(!r.err && !keysEq.length && r.a.syl && r.a.tp && r.a.ts && r.a.gs, 'I5c 再导入：voxClefOct / voxTransp / rowNames / tempos / syl / tieSlur / 长倚音逐项相同', J({ diff: keysEq, a: r.a, b: r.b }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= I6 首行声部名续行不变窄（曲库） ================= */
    if (want('I6')) {
      const A = await open(b); const pg = A.pg;
      const out = [];
      for (const id of ['lib-os-lc6650166', 'lib-os-lc6389103', 'lib-os-lc4985973']) {
        const it = LIB.find(x => x.id === id);
        out.push(Object.assign({ t: it.title.replace(/（.*/, '') }, await EV(pg, s => { __ld(s); const P = rowNamesPlan(), g = __geo([]), L = n => { const px = g.pages.filter(x => x <= n.x0 + 0.01).sort((a, b) => b - a)[0] || 0; return n.x0 - px; };
          const sh = g.names.filter(n => /\.$/.test(n.t)), full = g.names.filter(n => !/\.$/.test(n.t));
          return { ind0: P.ind0, ind1: P.ind1, rows: layoutSystems().length, pages: document.querySelectorAll('#score .pagebg').length, minS: Math.min(...sh.map(L)), minF: Math.min(...full.map(L)), fsS: [...new Set(sh.map(n => n.fs))], fsF: [...new Set(full.map(n => n.fs))] }; }, it.data)));
      }
      const bad = out.filter(o => o.err || o.ind1 !== 0 || !(o.minS >= 15.5) || !(o.minF >= 19.5) || o.fsS.length !== 1 || !(o.fsS[0] >= 9));
      T(!bad.length, 'I6a 曲库续行：缩进 0、简称统一一个字号（≥9）、左缘 ≥ 纸边 16px；首系统全称左缘 ≥20px（按实际继承的 --font-ui 量宽）', J(out));
      /* 首行名不贡献页数：夏威夷骊歌开着首行名与关掉的页数 / 行数相同（续行缩进 7–10px 时多 1–2 页：本机 Inter 7→8、DejaVu Sans 8→9） */
      const al = out[0], off = await EV(pg, s => { s = JSON.parse(JSON.stringify(s)); delete s.rowNames; __ld(s); return { rows: layoutSystems().length, pages: document.querySelectorAll('#score .pagebg').length }; }, LIB.find(x => x.id === 'lib-os-lc6650166').data);
      T(al && !off.err && al.pages === off.pages && al.rows === off.rows, 'I6b 夏威夷骊歌：开着首行声部名与关掉时行数 / 页数相同（首行名只让首系统缩进，续行不变窄）', J({ on: al, off }));
      allErrs.push(...A.errs); await A.close();
    }
  } catch (e) { T(false, 'ZZ 运行异常', String(e && e.stack || e).slice(0, 600)); }
  T(!allErrs.length, 'E 页面脚本错误 0', J(allErrs.slice(0, 5)));
  console.log(`\nPASS ${pass}/${total}` + (fails.length ? '  红：' + fails.join(' ') : ''));
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
