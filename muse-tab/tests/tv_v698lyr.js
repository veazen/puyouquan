'use strict';
/* v69.8 A 组 · 歌词音节 + 倚音斜线（规格 docs/spec-2026-11-v698.md §3.1 / §3.2；复核 docs/review-2026-10-staff-audit.md T10 / T9）。file:// 直载，真实浏览器。
   L1 MusicXML 导入：begin / middle / end → col.syl 位 1、<extend/> / extend start → 位 2；只含 extend stop / continue 的 <lyric> 不建空词、不计 skip；
      syl / slash 经 migrate 与 sanitizeUntrusted 原样保留
   L2 往返：曲库《摇篮曲》《圣母颂》源谱与「导入 → 再导出」逐段 syllabic 序列、extend start 个数相同；没有 syl 的谱仍全写 single；带音节 / 延长线 / 长倚音的导出过官方 XSD
   L3 几何（五线谱 + 简谱）：同行连字符 x1 ≥ 前音节右缘 +2、x2 ≤ 后音节左缘 −2、y＝基线 −5.2；跨行只在上一行末出现一个；延长线 y＝基线 +1、x1＝音节右缘 +1.5、
      x2＝拖腔终点符头右缘（简谱＝数字右缘）；跨行续到行尾、下一行续到终点
   L4 填词框（两外壳）：整句「hap-py love _ me」→ lyrics / syl 精确值；逐字键入同结果；「love」之后单独键入「_」给前一音节加延长线；西文原词后接「-」记连字符；「花 _ 儿」不出 syl
   L5 智能填词（两外壳）：预载拼回「Ma-ri-a love _ me」，原样「填入」song 逐字节不变、不进撤销栈；加一个空格再填 syl 不变；新填「Stil-le」写位 1
   L6 歌词浮条（两外壳）：后移 / 前移 / 删除时 syl 跟字走，一步撤销
   L7 落地页节选（api/server.js lyricExcerpt，源码取函数求值）：「A-ve Ma-ri-a」→「Ave Maria」；无 syl 的老数据与此前相同；只认同一声部、坏 syl 不抛错
   L8 老谱零变化：16 预设没有 syl / slash 键、刻版无连字符 / 延长线、导出全 single、倚音全 slash="yes"（v69.8 集成：曲库 seed 已重建，改由 L8c 核记数 461 / 19 / 11）；
      设 V698_BASE＝基线 index.html（如 git show cd08ca0）时另与基线逐字节对拍：谱面（带五线谱倚音的谱按 T9 放行，列名）与 MusicXML 导出
   G1 导入 <grace/> / slash="no" → slash:false，slash="yes" → 无键 · G2 导出往返 · G3 刻版：长倚音无斜线、短倚音 1 条；单个十六分倚音带 flag16thUp、
      两音十六分 2 道符杠且符干够到符杠（修前符尾 0 / 符杠 1）· G4 倚音弹窗「短倚音 / 长倚音」（两外壳，点谱面倚音热区打开）写入 / 删除 slash、一步撤销、改时值不丢
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指向 git show cd08ca0:muse-tab/index.html、V698_SERVER 指向 git show cd08ca0:api/server.js 复跑：红 39/48（「不变」守卫 L1c / L2b / L4e / L5b / L7b / L8a / E 在修前也绿）。
   env：MUSETAB_URL 被测页 · V698_BASE 对拍基线页 · V698_SERVER server.js 路径 · ONLY=L3,G3 只跑部分段 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const BASE = process.env.V698_BASE ? toUrl(process.env.V698_BASE) : null;
const SERVER = process.env.V698_SERVER ? path.resolve(process.env.V698_SERVER) : path.resolve(__dirname, '../../api/server.js');
const LIB = path.resolve(__dirname, '../../deploy/library/openscore');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 900) : '')); };
const NOTE = s => console.log('   ' + s);
const J = x => JSON.stringify(x);

const HELP = () => {
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); lastEnt = null; selRange = null; noteSel = []; blurSel = false; render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  /* 两字母西文音节（各不相同，便于按文字找元素） */
  window.__SY = (() => { const a = []; 'bdfgklmnprstvz'.split('').forEach(c => 'aeiou'.split('').forEach(v => a.push(c + v))); return a; })();
  /* L3 样谱：16 小节、每小节两个二分音符（列宽由时值定，歌词带有无不改断行），每个音一个音节、全部带位 1（一个长词） */
  window.__L3 = nota => { const s = createSong('vocal', { title: 'syl', beats: 4, unit: 4, key: 'C', nMea: 16, nTab: 0, nVox: 1, lyr: 1 });
    if (nota) s.voxNotations = [nota];
    let k = 0; s.measures.forEach((m, mi) => { m.voxes[0] = [0, 1].map(i => { const c = __V([5, 6, 5, 3][(mi * 2 + i) % 4], 2, { lyrics: [__SY[k]], syl: [1] }); k++; return c; }); });
    return s; };
  window.__off = (s, w) => { window.__pyqGeom = true;
    let sv = document.getElementById('v698sv');
    if (!sv) { sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.id = 'v698sv'; sv.setAttribute('style', 'position:fixed;left:-6000px;top:0'); document.body.appendChild(sv); }
    sv.innerHTML = ''; let o; try { o = renderOffscreen({ song: s, target: sv, paperW: w || 870 }); } finally { window.__pyqGeom = false; }
    return { o, sv }; };
  /* 刻版几何：五线谱声部按 data-g；简谱按字号 / 线宽 + 基线（简谱行不打普查标记） */
  window.__geo = sv => {
    const num = (e, a) => +e.getAttribute(a), gq = e => e.getAttribute('data-gq');
    const lyr = [...sv.querySelectorAll('text[font-size="16"]')].map(e => { const b = e.getBBox(); return { gq: gq(e), t: e.textContent, L: b.x, R: b.x + b.width, y: num(e, 'y') }; });
    const lines = [...sv.querySelectorAll('line')].map(e => ({ g: e.getAttribute('data-g'), gq: gq(e), x1: num(e, 'x1'), x2: num(e, 'x2'), y1: num(e, 'y1'), y2: num(e, 'y2'), w: e.getAttribute('stroke-width') }));
    const heads = {}; sv.querySelectorAll('path[data-g="head"]').forEach(e => { const m = /translate\(([-\d.]+),([-\d.]+)\) scale\(([\d.]+)\)/.exec(e.getAttribute('transform') || ''); if (!m) return;
      const b = e.getBBox(), R = +m[1] + (+m[3]) * (b.x + b.width), k = gq(e); heads[k] = Math.max(heads[k] == null ? -1e9 : heads[k], R); });
    const digs = [...sv.querySelectorAll('text[font-size="17"]')].map(e => { const b = e.getBBox(); return { x: num(e, 'x'), y: num(e, 'y'), R: b.x + b.width, t: e.textContent }; });
    /* 行尾＝该行歌词基线上方 150 内最右的线端（五线谱谱线 / 简谱小节线） */
    const rowEnd = y => Math.max(...lines.filter(l => !l.g || !/^lyr/.test(l.g)).filter(l => Math.min(l.y1, l.y2) > y - 150 && Math.max(l.y1, l.y2) < y - 5).map(l => Math.max(l.x1, l.x2)));
    return { rowEnd, lyr, hy: lines.filter(l => l.g === 'lyrhy' || (!l.g && l.w === '1.1' && Math.abs(l.y1 - l.y2) < 0.01 && lyr.some(t => Math.abs(l.y1 - (t.y - 5.2)) < 0.06))),
      ex: lines.filter(l => l.g === 'lyrext' || (!l.g && l.w === '0.9' && Math.abs(l.y1 - l.y2) < 0.01 && lyr.some(t => Math.abs(l.y1 - (t.y + 1)) < 0.06))), heads, digs }; };
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
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));

/* ---------- L1 / G1 导入夹具 ---------- */
const NOTE_X = (step, oct, typ, dur, inner) => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${typ}</type>${inner || ''}</note>`;
const LY = (n, syl, text, ext) => `<lyric number="${n}">${syl ? `<syllabic>${syl}</syllabic>` : ''}${text != null ? `<text>${text}</text>` : ''}${ext || ''}</lyric>`;
const GR = (attr, step, oct) => `<note><grace${attr}/><pitch><step>${step}</step><octave>${oct}</octave></pitch><voice>1</voice><type>16th</type></note>`;
const FIX = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1">'
  + '<measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
  + NOTE_X('G', 4, 'quarter', 1, LY(1, 'begin', 'Ma') + LY(2, 'single', 'la'))
  + NOTE_X('A', 4, 'quarter', 1, LY(1, 'middle', 'ri'))
  + NOTE_X('G', 4, 'quarter', 1, LY(1, 'end', 'a', '<extend/>'))
  + NOTE_X('F', 4, 'quarter', 1, '')
  + '</measure><measure number="2">'
  + NOTE_X('E', 4, 'quarter', 1, LY(1, null, null, '<extend type="stop"/>'))
  + GR('', 'D', 5) + NOTE_X('C', 5, 'quarter', 1, LY(1, 'single', 'love', '<extend type="start"/>'))
  + GR(' slash="yes"', 'C', 5) + NOTE_X('B', 4, 'quarter', 1, LY(1, null, null, '<extend type="continue"/>'))
  + GR(' slash="no"', 'B', 4) + NOTE_X('A', 4, 'quarter', 1, LY(1, null, null, '<extend type="stop"/>'))
  + '</measure><measure number="3">'
  + NOTE_X('G', 4, 'whole', 4, LY(1, 'single', 'me'))
  + '<barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>';

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const allErrs = [];
  try {
    const A = await open(b), pg = A.pg;
    /* ================= L1 / G1 导入 ================= */
    if (want('L1') || want('G1')) {
      const r = await EV(pg, x => { const im = importMusicXML(x); if (!im || !im.song) return { err: 'import' };
        const cs = im.song.measures.flatMap(m => m.voxes[0]);
        /* 存取口径：.mtab / 云端经 migrate（normalizeSongFields），看别人发布的谱经 sanitizeUntrusted——syl / slash 原样保留 */
        const key = sg => J(sg.measures.flatMap(m => m.voxes[0]).map(c => [c.syl, c.grace && c.grace.slash]));
        const keep = key(migrate(JSON.parse(J(im.song)))) === key(im.song) && key(sanitizeUntrusted(JSON.parse(J(im.song)))) === key(im.song);
        return { ly: cs.map(c => J(c.lyrics || [])), syl: cs.map(c => c.syl === undefined ? '-' : J(c.syl)), lines: im.song.lyricLines, skipL: im.skip.lyrics,
          gr: cs.filter(c => c.grace).map(c => J(c.grace)), keep };
        function J(v) { return JSON.stringify(v); } }, FIX);
      if (want('L1')) {
        T(!r.err && r.syl.join(' ') === '[1] [1] [2] - - [2] - - -', 'L1a 导入 syllabic begin / middle → 位 1、<extend/> 与 extend start → 位 2（与 lyrics 按段对齐：第 2 段 single 不写）', J(r));
        T(!r.err && r.ly.join('|') === '["Ma","la"]|["ri"]|["a"]|[]|[]|["love"]|[]|[]|["me"]' && r.skipL === 0 && r.lines === 2, 'L1b 只含 <extend type="stop|continue"/> 的 <lyric> 不建空词、不计 skip（歌词段数仍按有字的段）', J(r));
      }
      if (want('L1')) T(!r.err && r.keep, 'L1c syl / grace.slash 经 migrate（.mtab / 云端）与 sanitizeUntrusted（看别人发布的谱）原样保留', J(r));
      if (want('G1')) T(!r.err && r.gr.join(' ') === '{"notes":[{"deg":2,"oct":1}],"dur":16,"slash":false} {"notes":[{"deg":1,"oct":1}],"dur":16} {"notes":[{"deg":7,"oct":0}],"dur":16,"slash":false}',
        'G1 导入 <grace/>（无 slash）/ slash="no" → grace.slash:false（长倚音），slash="yes" → 无键', J(r.gr));
    }
    /* ================= L2 往返 ================= */
    if (want('L2')) {
      const src = ['lc5701612', 'lc6389103'].map(f => ({ f, x: fs.readFileSync(path.join(LIB, f + '.musicxml'), 'utf8') }));
      const r = await EV(pg, src => src.map(({ f, x }) => {
        const seq = xs => { const d = new DOMParser().parseFromString(xs, 'application/xml'), S = {};
          d.querySelectorAll('note').forEach(n => n.querySelectorAll(':scope > lyric').forEach(l => { if (!l.querySelector('text')) return;
            const k = l.getAttribute('number') || '1', sy = [...l.querySelectorAll('syllabic')].pop(); (S[k] = S[k] || []).push(sy ? sy.textContent.trim() : 'single'); }));
          const ex = [...d.querySelectorAll('lyric > extend')].filter(e => !e.getAttribute('type') || e.getAttribute('type') === 'start').length;
          return { S: Object.keys(S).sort().map(k => k + ':' + S[k].join(',')).join(' | '), ex, n: Object.values(S).reduce((a, v) => a + v.length, 0) }; };
        const im = importMusicXML(x); loadSong(im.song); const out = exportMusicXML(song);
        const a = seq(x), c = seq(out);
        /* 同一份谱去掉 syl 再导出：全写 single、没有 extend（老谱口径不变） */
        const s0 = JSON.parse(JSON.stringify(song)); s0.measures.forEach(m => m.voxes.forEach(cs => cs.forEach(cc => { delete cc.syl; })));
        const o0 = exportMusicXML(s0), c0 = seq(o0);
        return { f, out, same: a.S === c.S, exA: a.ex, exC: c.ex, n: a.n, nC: c.n, d: a.S === c.S ? '' : a.S.slice(0, 200) + ' ≠ ' + c.S.slice(0, 200),
          plain: !/<extend/.test(o0) && !/<syllabic>(begin|middle|end)/.test(o0) && c0.n === c.n }; }), src);
      T(!r.err && r.every(x => x.same && x.exA === x.exC && x.exA > 0 && x.n > 50), 'L2a 曲库《摇篮曲》《圣母颂》：源谱与「导入 → 再导出」逐段 syllabic 序列相同、extend start 个数相同（修前导出全 single）', J(r));
      T(!r.err && r.every(x => x.plain), 'L2b 同一份谱去掉 syl 再导出：全写 single、没有 <extend>（老谱导出口径不变）', J(r.map ? r.map(x => Object.assign({}, x, { out: undefined })) : r));
      /* L2c 带音节 / 延长线 / 长倚音的导出过 MusicXML 4.0 官方 XSD（同 tv_xsd：fixtures/xsd 离线 + xmllint） */
      const XSD = path.resolve(__dirname, 'fixtures/xsd/musicxml.xsd');
      let lint = true; try { require('child_process').execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); } catch (_) { lint = false; }
      if (lint && fs.existsSync(XSD) && !r.err) {
        const fx = await EV(pg, x => { const im = importMusicXML(x); return exportMusicXML(im.song); }, FIX);
        const os = require('os'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v698_'));
        const bad = [...r.map(x => [x.f, x.out]), ['L1 夹具', fx]].map(([n, x], i) => { const f = path.join(tmp, i + '.musicxml'); fs.writeFileSync(f, typeof x === 'string' ? x : '');
          try { require('child_process').execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); return null; }
          catch (e) { return n + '：' + String(e.stderr || e.message || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | '); } }).filter(Boolean);
        const hasEx = typeof fx === 'string' && /<extend type="stop"\/>/.test(fx) && /<grace\/>/.test(fx);
        T(!bad.length && hasEx, 'L2c 带 begin / middle / end、extend start / stop、<grace/> 的导出（摇篮曲 / 圣母颂 / L1 夹具往返）过 MusicXML 4.0 官方 XSD', J({ bad, hasEx }));
      } else NOTE('L2c XSD 校验跳过（没有 xmllint 或 fixtures/xsd）');
    }
    /* ================= L3 几何 ================= */
    if (want('L3')) for (const nota of ['staff', '']) {
      const tag = nota ? '五线谱' : '简谱';
      const r = await EV(pg, nota => {
        const yOK = (l, y, d) => Math.abs(l.y1 - (y + d)) <= 0.3 && Math.abs(l.y2 - (y + d)) <= 0.3;
        const s = __L3(nota); let { o, sv } = __off(s); const sm = o.sysMea; let G = __geo(sv);
        /* 音节 k → 文字元素（按文字找）；系统号按小节 */
        const sysOf = mi => sm.findIndex(x => mi >= x[0] && mi <= x[1]);
        const sy = k => { const mi = k >> 1, ci = k & 1, t = G.lyr.find(e => e.t === __SY[k]); return { k, mi, ci, si: sysOf(mi), t }; };
        const N = 32, S = Array.from({ length: N }, (_, k) => sy(k));
        const between = (a, c) => G.hy.filter(l => Math.abs(l.y1 - (a.t.y - 5.2)) <= 0.3 && l.x1 >= a.t.R - 1 && l.x2 <= c.t.L + 1);
        const bad = [];
        let pairs = 0;
        for (let k = 0; k + 1 < N; k++) { const a = S[k], c = S[k + 1]; if (!a.t || !c.t) { bad.push('缺字' + k); continue; }
          if (a.si !== c.si) continue; pairs++;
          const h = between(a, c); if (!h.length) { bad.push('无连字符' + k); continue; }
          h.forEach(l => { if (!(l.x1 >= a.t.R + 2 - 0.05 && l.x2 <= c.t.L - 2 + 0.05 && l.x2 > l.x1 && yOK(l, a.t.y, -5.2) && l.w === '1.1')) bad.push('位置' + k + ':' + [l.x1, l.x2, a.t.R, c.t.L, l.y1, a.t.y].map(v => +(+v).toFixed(1))); }); }
        /* 跨行：上一行末音节后只一个、到行尾前 4；下一行首音节前没有 */
        const last0 = S.filter(x => x.si === 0).pop(), first1 = S.find(x => x.si === 1);
        const row0 = G.rowEnd(last0.t.y);
        const tail = G.hy.filter(l => Math.abs(l.y1 - (last0.t.y - 5.2)) <= 0.3 && l.x1 >= last0.t.R - 1);
        const lead = G.hy.filter(l => Math.abs(l.y1 - (first1.t.y - 5.2)) <= 0.3 && l.x2 <= first1.t.L + 1);
        const cross = { tail: tail.length, lead: lead.length, x1ok: tail.length === 1 && tail[0].x1 >= last0.t.R + 2 - 0.05, x2ok: tail.length === 1 && isFinite(row0) && tail[0].x2 <= row0 - 4 + 0.05 && tail[0].x2 >= row0 - 4 - 30,
          tagged: !nota || tail.every(l => l.gq === '0:' + last0.mi + ':' + last0.ci) };
        const nHy = G.hy.length;
        /* 第二遍：延长线（同行：第 1 小节首音节拖到同小节第 2 个音；跨行：第 0 行末音节拖到下一行第一小节第 2 个音） */
        const a = sm[0][1];
        s.measures[1].voxes[0][0].syl = [2]; s.measures[1].voxes[0][1].lyrics = [];
        s.measures[a].voxes[0][1].syl = [2]; s.measures[a + 1].voxes[0].forEach(c => { c.lyrics = []; });
        ({ o, sv } = __off(s)); const sm2 = o.sysMea; G = __geo(sv);
        const hdR = (mi, ci, row) => { if (nota) return G.heads['0:' + mi + ':' + ci];
          const ds = G.digs.filter(d => Math.abs(d.y - row) < 40).sort((p, q) => p.x - q.x), i0 = sm2[sysOf(mi)][0]; const d = ds[(mi - i0) * 2 + ci]; return d ? { f: d.x + 5.4, ink: d.R } : null; };
        const tA = G.lyr.find(e => e.t === __SY[2]), tB = G.lyr.find(e => e.t === __SY[a * 2 + 1]);
        const eA = G.ex.filter(l => yOK(l, tA.y, 1) && l.x1 > tA.L && l.x1 < tA.R + 10);
        const exB = G.ex.filter(l => yOK(l, tB.y, 1) && l.x1 > tB.L && l.x1 < tB.R + 10), nxt = G.ex.filter(l => l.y1 > tB.y + 20);
        const hA = hdR(1, 1, tA.y - 30), hB = hdR(a + 1, 1, nxt.length ? nxt[0].y1 - 30 : 0);
        const row0b = G.rowEnd(tB.y);
        const near = (v, w, t) => v != null && w != null && Math.abs(v - w) <= t;
        const ext = { same: J(sm) === J(sm2), nA: eA.length, nB: exB.length, nN: nxt.length,
          a1: eA[0] && near(eA[0].x1, tA.R + 1.5, 0.5), a2: eA[0] && (nota ? near(eA[0].x2, hA, 0.5) : (near(eA[0].x2, hA && hA.f, 0.05) && near(eA[0].x2, hA && hA.ink, 1.2))),
          b1: exB[0] && near(exB[0].x1, tB.R + 1.5, 0.5), b2: exB[0] && isFinite(row0b) && near(exB[0].x2, row0b - 2, 0.5),
          n2: nxt[0] && (nota ? near(nxt[0].x2, hB, 0.5) : (near(nxt[0].x2, hB && hB.f, 0.05) && near(nxt[0].x2, hB && hB.ink, 1.2))) && nxt[0].x1 < nxt[0].x2 - 4,
          w: G.ex.every(l => l.w === '0.9'), dbg: [eA[0], hA, exB[0], row0b, nxt[0], hB].map(v => J(v)).join(' ') };
        return { sys: sm.length, pairs, bad: bad.slice(0, 6), cross, nHy, ext };
        function J(v) { return JSON.stringify(v); } }, nota);
      T(!r.err && r.sys >= 3 && r.pairs >= 20 && !r.bad.length && r.nHy >= r.pairs + 1,
        'L3a' + tag + ' 同行连字符：每对音节之间都有，x1 ≥ 前音节右缘 +2、x2 ≤ 后音节左缘 −2、y＝基线 −5.2±0.3、线宽 1.1（修前 0 个）', J(r));
      T(!r.err && r.cross.tail === 1 && r.cross.lead === 0 && r.cross.x1ok && r.cross.x2ok && r.cross.tagged, 'L3b' + tag + ' 跨行连字符只在上一行末音节后画一个（到行尾前 4px），下一行首音节前没有', J(r.cross));
      T(!r.err && r.ext.same && r.ext.nA === 1 && r.ext.a1 && r.ext.a2 && r.ext.w, 'L3c' + tag + ' 同行延长线：y＝基线 +1、x1＝音节右缘 +1.5、x2＝拖腔终点' + (nota ? '符头右缘 ±0.5' : '数字右缘（nx+5.4，墨迹 ±1.2）') + '、线宽 0.9', J(r.ext));
      T(!r.err && r.ext.nB === 1 && r.ext.b1 && r.ext.b2 && r.ext.nN >= 1 && r.ext.n2, 'L3d' + tag + ' 跨行延长线：上一行续到行尾（−2），下一行自首小节起续到拖腔终点', J(r.ext));
    }
    /* ================= L4–L6 / G4 两外壳 ================= */
    for (const sh of ['flow', 'classic']) {
      const tag = sh === 'flow' ? '（新外壳）' : '（旧外壳）';
      const B = sh === 'flow' ? A : await open(b, { shell: 'classic' }), p2 = B.pg;
      const mk = () => p2.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); s.measures.forEach(m => { m.voxes[0] = [5, 6, 5, 3].map(d => __V(d)); }); __ld(s); activeLyr = 0; });
      const cells = () => p2.evaluate(() => song.measures.flatMap(m => m.voxes[0]).map(c => ((c.lyrics || [])[0] || '') + (c.syl ? JSON.stringify(c.syl) : '')).join('|'));
      const focusLyr = async () => { await p2.evaluate(() => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await p2.keyboard.press('Enter'); await p2.waitForTimeout(150);
        return p2.evaluate(() => (document.activeElement || {}).id || ''); };
      if (want('L4')) {
        await mk(); const f1 = await focusLyr();
        await p2.evaluate(() => { const el = document.getElementById('i-lyric'); el.value = 'hap-py love _ me'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        const c1 = await cells();
        await mk(); const f2 = await focusLyr(); await p2.keyboard.type('hap-py love_ me ', { delay: 15 }); await p2.waitForTimeout(100);
        const c2 = await cells();
        await mk(); await focusLyr(); await p2.keyboard.type('la love ', { delay: 15 }); await p2.keyboard.type('_', { delay: 15 }); await p2.waitForTimeout(100);
        const c3 = await cells(), u3 = await p2.evaluate(() => { const n = undoStack.length; undo(); return { n, after: song.measures.flatMap(m => m.voxes[0]).map(c => ((c.lyrics || [])[0] || '') + (c.syl ? JSON.stringify(c.syl) : '')).slice(0, 3).join('|') }; });
        const W1 = 'hap[1]|py|love[2]||me|||||||';
        T(f1 === 'i-lyric' && c1 === W1, 'L4a' + tag + ' 填词框整句「hap-py love _ me」→ hap 位 1、love 位 2、「_」跳过一个音（lyrics / syl 精确值）', J({ f1, c1 }));
        T(f2 === 'i-lyric' && c2 === W1, 'L4b' + tag + ' 逐字键入「hap-py love_ me 」同结果', J({ c2 }));
        T(c3 === 'la|love[2]||||||||||' && /^la\|love\|/.test(u3.after), 'L4c' + tag + ' 「love」写完前进后再键入单独的「_」：前一音节 love 加延长线、当前音跳过；撤销一步回到 love 无位', J({ c3, u3 }));
        /* 改词：原词后接「-」＝连字符、前进一个音（原词不动） */
        await p2.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); s.measures.forEach(m => { m.voxes[0] = [5, 6, 5, 3].map(d => __V(d)); });
          s.measures[0].voxes[0][0].lyrics = ['Stil']; s.measures[0].voxes[0][1].lyrics = ['le']; __ld(s); activeLyr = 0; });
        await focusLyr(); await p2.keyboard.press('End'); await p2.keyboard.type('-', { delay: 15 }); await p2.waitForTimeout(80);
        const c4 = await cells(), s4 = await p2.evaluate(() => sel.mi + ':' + sel.ci);
        T(c4 === 'Stil[1]|le||||||||||' && s4 === '0:1', 'L4d' + tag + ' 已有西文词后接「-」：原词不动、记连字符、光标前进一个音', J({ c4, s4 }));
        /* 中文：「花 _ 儿」照旧只跳过，不出 syl */
        await mk(); await focusLyr();
        await p2.evaluate(() => { const el = document.getElementById('i-lyric'); el.value = '花 _ 儿'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        const c5 = await cells(), j5 = await p2.evaluate(() => /"syl"/.test(JSON.stringify(song)));
        T(c5 === '花||儿|||||||||' && !j5, 'L4e' + tag + ' 「花 _ 儿」：中文后的「_」照旧只跳过一个音，song 里没有 syl 键（同 v69.7）', J({ c5, j5 }));
        await p2.evaluate(() => { try { document.activeElement.blur(); } catch (_) {} try { if (!flowOn()) closeFlyout(); } catch (_) {} });
      }
      if (want('L5')) {
        const r = await p2.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 });
          const L = [['Ma', 1], ['ri', 1], ['a', 0], ['love', 2], ['', 0], ['me', 0]];
          s.measures.forEach((m, mi) => { m.voxes[0] = [5, 6, 5, 3].map((d, i) => { const k = mi * 4 + i, x = L[k]; return __V(d, 4, x ? Object.assign({ lyrics: [x[0]] }, x[1] ? { syl: [x[1]] } : {}) : {}); }); });
          __ld(s); activeLyr = 0; const before = JSON.stringify(song);
          document.getElementById('b-fill').onclick(); const v0 = document.getElementById('fill-text').value, u0 = undoStack.length;
          document.getElementById('fill-ok').click(); const same0 = JSON.stringify(song) === before, noUndo = undoStack.length === u0;
          document.getElementById('b-fill').onclick(); const ta = document.getElementById('fill-text'); ta.value += ' '; ta.dispatchEvent(new Event('input', { bubbles: true }));
          document.getElementById('fill-ok').click(); const same1 = JSON.stringify(song.measures) === JSON.stringify(JSON.parse(before).measures);
          /* 新填 */
          const s2 = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); s2.measures.forEach(m => { m.voxes[0] = [5, 6, 5, 3].map(d => __V(d)); }); __ld(s2); activeLyr = 0;
          document.getElementById('b-fill').onclick(); const t2 = document.getElementById('fill-text'); t2.value = 'Stil-le Nacht, hei-li-ge Nacht! love _ me'; t2.dispatchEvent(new Event('input', { bubbles: true }));
          document.getElementById('fill-ok').click();
          const nw = song.measures.flatMap(m => m.voxes[0]).map(c => ((c.lyrics || [])[0] || '') + (c.syl ? JSON.stringify(c.syl) : '')).join('|');
          try { closeModal(); } catch (_) {}
          return { v0, same0, noUndo, same1, nw }; });
        T(r.v0 === 'Ma-ri-a love _ me' && r.same0 && r.noUndo, 'L5a' + tag + ' 智能填词预载按音节位拼回「Ma-ri-a love _ me」；原样「填入」song 逐字节不变、不进撤销栈', J(r));
        T(r.same1, 'L5b' + tag + ' 预载文本加一个空格再「填入」：歌词与 syl 不变', J(r));
        T(r.nw === 'Stil[1]|le|Nacht,|hei[1]|li[1]|ge|Nacht!|love[2]||me||', 'L5c' + tag + ' 新填「Stil-le Nacht, hei-li-ge Nacht! love _ me」写音节位', J(r));
      }
      if (want('L6')) {
        const r = await p2.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 2, lyr: 1 });
          const L = [['x', 0], ['Ma', 1], ['ri', 1], ['a', 2]];
          s.measures.forEach((m, mi) => { m.voxes[0] = [5, 6, 5, 3].map((d, i) => { const x = mi === 0 ? L[i] : null; return __V(d, 4, x ? Object.assign({ lyrics: [x[0]] }, x[1] ? { syl: [x[1]] } : {}) : {}); }); });
          __ld(s); activeLyr = 0; blurSel = true; render();
          const cells = () => song.measures.flatMap(m => m.voxes[0]).map(c => ((c.lyrics || [])[0] || '') + (c.syl ? JSON.stringify(c.syl) : '')).join('|');
          const openM = ci => { const z = document.querySelector('#score [data-zone="lyric"][data-mi="0"][data-ci="' + ci + '"]'); if (!z) return false;
            z.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 })); window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return !!document.getElementById('popmenu'); };
          const o1 = openM(1); document.querySelector('#popmenu #ly-right').click(); const right = cells(); undo(); const back1 = cells();
          const o2 = openM(2); document.querySelector('#popmenu #ly-left').click(); const left = cells(); undo();
          const o3 = openM(1); document.querySelector('#popmenu #ly-del').click(); const del = cells(); undo(); const back3 = cells();
          return { o: o1 && o2 && o3, right, back1, left, del, back3 }; });
        const S0 = 'x|Ma[1]|ri[1]|a[2]||||';
        T(r.o && r.right === 'x||Ma[1]|ri[1]|a[2]|||' && r.back1 === S0, 'L6a' + tag + ' 歌词浮条「后移」：syl 跟着文字整体后移，一步撤销', J(r));
        T(r.left === 'x|ri[1]|a[2]|||||' && r.del === 'x|ri[1]|a[2]|||||' && r.back3 === S0, 'L6b' + tag + ' 「前移」「删除」：syl 跟着文字前提补位（覆盖 / 删掉的音节连同它的位一起去掉）', J(r));
      }
      if (want('G4')) {
        /* 功能保全：点谱面上的倚音热区（先断言可见且在最上层）打开弹窗 */
        const zone = async gq => { const p = await p2.evaluate(gq => { const z = document.querySelector('#score rect[data-grace="' + gq + '"]'); if (!z) return null; z.scrollIntoView({ block: 'center' });
          const r = z.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, h = document.elementFromPoint(x, y); return { x, y, top: h === z, w: r.width }; }, gq);
          if (p && p.top) { await p2.mouse.click(p.x, p.y); await p2.waitForTimeout(120); } return p; };
        await p2.evaluate(() => { const s = NWB.build('S', { title: 'gr', key: 'C', nMea: 2, lyr: 0 });
          s.measures[0].voxes[0] = [__V(5, 4, { grace: { notes: [{ deg: 6, oct: 0 }], dur: 8 } }), __V(6), __V(5, 4, { graceA: { notes: [{ deg: 6, oct: 0 }], dur: 8 } }), __V(3)];
          __ld(s); blurSel = true; render(); });
        const z1 = await zone('0:0:0:pre');
        const r = await p2.evaluate(() => { const pm = document.getElementById('popmenu'); if (!pm) return { err: '弹窗没开' };
          const btn = v => document.querySelector('#popmenu [data-gsl="' + v + '"]');
          const lbl = [btn(1), btn(0)].map(x => x && x.textContent.trim()).join('/'), onS = !!btn(1) && btn(1).classList.contains('on');
          const G = () => JSON.stringify(song.measures[0].voxes[0][0].grace);
          if (!btn(0) || !btn(1)) { try { closePop(); } catch (_) {} return { err: '弹窗里没有「短倚音 / 长倚音」' }; }
          const u0 = undoStack.length; btn(0).click(); const g1 = G(), onL = !!btn(0) && btn(0).classList.contains('on'), u1 = undoStack.length;
          document.querySelector('#popmenu [data-gt="16"]').click(); const g2 = G();
          undo(); undo(); const g3 = G();
          redo(); redo(); const g3b = G();
          try { closePop(); } catch (_) {}
          return { lbl, onS, g1, onL, du: u1 - u0, g2, g3, g3b }; });
        /* 撤销 / 重做后弹窗里的列已是旧对象：收起重开再点「短倚音」 */
        const z1b = await zone('0:0:0:pre');
        r.g4 = await p2.evaluate(() => { const b1 = document.querySelector('#popmenu [data-gsl="1"]'), on = !!document.querySelector('#popmenu [data-gsl="0"].on'); if (b1) b1.click();
          const g = JSON.stringify(song.measures[0].voxes[0][0].grace); try { closePop(); } catch (_) {} return on? g : 'noL:' + g; });
        r.z1b = !!(z1b && z1b.top);
        const z2 = await zone('0:2:0:post');
        const postNo = await p2.evaluate(() => { const pm = document.getElementById('popmenu'); const ok = !!pm && !pm.querySelector('[data-gsl]'); try { closePop(); } catch (_) {} return ok; });
        T(z1 && z1.top && !r.err && r.lbl === '短倚音/长倚音' && r.onS && r.g1 === '{"notes":[{"deg":6,"oct":0}],"dur":8,"slash":false}' && r.onL && r.du === 1,
          'G4a' + tag + ' 点谱面前倚音（热区可见、在最上层）打开倚音弹窗：「短倚音 / 长倚音」，点「长倚音」写 slash:false、一步撤销', J({ z1, r }));
        T(!r.err && r.g2 === '{"notes":[{"deg":6,"oct":0}],"dur":16,"slash":false}' && r.g3 === '{"notes":[{"deg":6,"oct":0}],"dur":8}' && r.g3b === r.g2 && r.g4 === '{"notes":[{"deg":6,"oct":0}],"dur":16}' && z2 && z2.top && postNo,
          'G4b' + tag + ' 改时值 slash 不丢（normGrace 往返）；撤销回无键；点「短倚音」删键；后倚音弹窗没有这对按钮', J({ r, z2, postNo }));
      }
      allErrs.push(...B.errs.map(x => sh + ': ' + x));
      if (B !== A) await B.ctx.close();
    }
    /* ================= L7 落地页节选 ================= */
    if (want('L7')) {
      const src = fs.readFileSync(SERVER, 'utf8');
      const pick = re => { const m = re.exec(src); return m ? m[0] : ''; };
      const fn = pick(/^function lyricExcerpt\(d, cap\) \{[\s\S]*?\n\}\n/m), ar = pick(/^const arr = .*$/m), ss = pick(/^const sStr = .*$/m);
      let r;
      try { const LE = new Function(ar + '\n' + ss + '\n' + fn + '\nreturn lyricExcerpt;')();
        const V = (t, sy) => Object.assign({ lyrics: [t] }, sy != null ? { syl: [sy] } : {});
        const d1 = { measures: [{ voxes: [[V('A', 1), V('ve', 0), V('Ma', 1), V('ri', 1)]] }, { voxes: [[V('a!', 0), V('Jung', 1), V('frau', 0), V('mild', 0)]] }] };
        const d0 = JSON.parse(JSON.stringify(d1)); d0.measures.forEach(m => m.voxes.forEach(cs => cs.forEach(c => { delete c.syl; })));
        const d2 = { measures: [{ voxes: [[V('一'), V('闪')], [V('Ave', 1), V('x')]] }, { voxes: [[V('A', 1)], [V('ve')]] }] };
        const bad = { measures: [{ voxes: [[{ lyrics: ['A'], syl: [{ toString: 1 }] }, { lyrics: ['b'], syl: 'x' }, { lyrics: ['c'], syl: [1] }, { lyrics: ['d'] }]] }] };
        r = { a: LE(d1, 140), z: LE(d0, 140), m: LE(d2, 140), cap: LE(d1, 7), cap0: LE(d0, 7), bad: LE(bad, 140) };
      } catch (e) { r = { err: String(e.message || e) }; }
      T(!r.err && r.a === 'Ave Maria! Jungfrau mild' && r.cap === 'Ave Mar', 'L7a 落地页节选：带连字符位的音节后不补空格（A-ve Ma-ri-a! Jung-frau → Ave Maria! Jungfrau mild；截断照旧）', J(r));
      T(!r.err && r.z === 'A ve Ma ri a! Jung frau mild' && r.cap0 === 'A ve Ma', 'L7b 没有 syl 的老数据输出与此前相同（含截断）', J(r));
      T(!r.err && r.m === '一闪Avex A ve' && r.bad === 'A b cd', 'L7c 连字符只认同一声部的上一个音节；坏 syl（对象 / 字符串）不抛错、按无位处理', J(r));
    }
    /* ================= L8 老谱零变化 ================= */
    if (want('L8')) {
      /* v70.0 集成迁移：种子从 OpenScore 10 首扩到 29 份（C 组示例 16＋手工 3，规格 docs/spec-2026-11-v700.md §7.3），本断言的对象是曲库 10 首艺术歌曲——只取 lib-os-*（同 tv_taxonomy X2 / tv_v700data 口径；基线 6d8d6f8 编辑器在 29 份种子上同样红）；示例 / 手工谱另由 tv_v700ex E3 / tv_v700int I6 守（L8c 记数 461 / 19 / 11 也是这 10 首的口径） */
      const lib = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../api/seed-library.json'), 'utf8')).filter(x => /^lib-os-/.test(String(x.id || ''))).map(x => ({ t: x.title, d: typeof x.data === 'string' ? x.data : JSON.stringify(x.data) }));
      const SNAP = lib => { const out = [];
        const one = (nm, s) => { const js = JSON.stringify(s); const { sv } = __off(JSON.parse(js)); const svg = sv.innerHTML;
          const x = exportMusicXML(JSON.parse(js));
          const stGr = (s.voxVoices || []).some((_, vi) => ['staff', 'bass', 'alto'].includes((s.voxNotations || [])[vi]) && s.measures.some(m => ((m.voxes || [])[vi] || []).some(c => c && (c.grace || c.graceA))));
          window.__pyqGeom = false; const sv2 = document.getElementById('v698sv'); sv2.innerHTML = ''; renderOffscreen({ song: JSON.parse(js), target: sv2, paperW: 870 }); const plain = sv2.innerHTML;
          out.push({ nm, key: /"syl"|"slash"/.test(js), conn: (svg.match(/data-g="lyr(hy|ext)"/g) || []).length, ext: /<extend/.test(x), nsy: (x.match(/<syllabic>(begin|middle|end)/g) || []).length,
            grOk: (x.match(/<grace/g) || []).length === (x.match(/<grace slash="yes"\/>/g) || []).length, stGr, svg: plain, xml: x }); };
        PRESETS.forEach(p => one(p.name, migrate(p.make())));
        lib.forEach(({ t, d }) => one(t, migrate(JSON.parse(d))));
        return out; };
      const cur = await EV(pg, SNAP, lib);
      /* v69.8 集成迁移：曲库 seed 已按本组导入重建（规格 §6 ②），曲库 10 首不再是「老谱」——L8a 只管 16 预设；曲库改由 L8c 核重建后的记数（复核 461 / 19 / 11） */
      const pre = Array.isArray(cur) ? cur.slice(0, 16) : cur;
      const ok = Array.isArray(cur) && cur.length === 26 && pre.every(x => !x.key && !x.conn && !x.ext && !x.nsy && x.grOk);
      T(ok, 'L8a 16 预设：没有 syl / slash 键、刻版无连字符 / 延长线、导出全写 single 无 <extend>、倚音全写 slash="yes"', Array.isArray(cur) ? J(pre.filter(x => x.key || x.conn || x.ext || x.nsy || !x.grOk).map(x => x.nm)) : J(cur));
      { let hy = 0, ex = 0, lg = 0; lib.forEach(({ d }) => JSON.parse(d).measures.forEach(m => (m.voxes || []).forEach(r => (r || []).forEach(c => { if (!c) return;
          (c.syl || []).forEach(v => { if (v & 1) hy++; if (v & 2) ex++; }); if (c.grace && c.grace.slash === false) lg += (c.grace.notes || []).length || 1; }))));
        const L = Array.isArray(cur) ? cur.slice(16) : [], conn = L.reduce((n, x) => n + x.conn, 0), nsy = L.reduce((n, x) => n + x.nsy, 0);
        T(hy === 461 && ex === 19 && lg === 11 && conn > 400 && nsy > 400 && L.every(x => x.grOk || /<grace\/>/.test(x.xml)),
          'L8c 曲库重建后（seed）：连字符位 461、延长线位 19、长倚音 11 个（复核记数），刻版画出连字符 / 延长线、导出写 begin / middle / end', J({ hy, ex, lg, conn, nsy })); }
      if (BASE && Array.isArray(cur)) {
        const R = await open(b, { url: BASE }); const ref = await EV(R.pg, SNAP, lib); await R.ctx.close();
        if (Array.isArray(ref) && ref.length === cur.length) {
          const xb = cur.filter((x, i) => x.xml !== ref[i].xml).map(x => x.nm);
          const sb = cur.filter((x, i) => x.svg !== ref[i].svg && !x.stGr).map(x => x.nm), allow = cur.filter(x => x.stGr).map(x => x.nm);
          const allowDiff = cur.filter((x, i) => x.stGr && x.svg !== ref[i].svg).map(x => x.nm);
          T(!xb.length && !sb.length, 'L8b 与基线逐字节对拍：26 份 MusicXML 导出全同；谱面除带五线谱倚音的（T9 按时值画符尾 / 符杠，放行 ' + allow.length + ' 份：' + allow.join('、') + '）外全同', J({ xb, sb, allow, allowDiff }));
        } else T(false, 'L8b 基线取不到', J(ref).slice(0, 200));
      } else NOTE('L8b 与基线逐字节对拍跳过（设 V698_BASE＝基线 index.html 时执行）');
    }
    /* ================= G2 / G3 ================= */
    if (want('G2') || want('G3')) {
      const r = await EV(pg, () => { const s = createSong('vocal', { title: 'gr', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 }); s.voxNotations = ['staff'];
        s.measures[0].voxes[0] = [__V(5, 4, { grace: { notes: [{ deg: 6, oct: 0 }], dur: 16, slash: false } }), __V(6, 4, { grace: { notes: [{ deg: 1, oct: 1 }], dur: 16 } }),
          __V(5, 4, { grace: { notes: [{ deg: 6, oct: 0 }, { deg: 7, oct: 0 }], dur: 16 } }), __V(3, 4, { grace: { notes: [{ deg: 4, oct: 0 }, { deg: 5, oct: 0 }, { deg: 4, oct: 0 }], dur: 32 } })];
        s.measures[1].voxes[0] = [__V(5, 4, { grace: { notes: [{ deg: 6, oct: 0 }], dur: 8 } }), __V(6, 4, { grace: { notes: [{ deg: 6, oct: 0 }], dur: 4 } }), __V(5, 2)];
        const js = JSON.stringify(s);
        /* G2 往返 */
        const x = exportMusicXML(JSON.parse(js)), im = importMusicXML(x);
        const q4 = JSON.parse(js).measures.flatMap(m => m.voxes[0]).map(c => !!c.grace && normGrace(c.grace).dur === 4);   /* 四分倚音导出写 eighth（v69.4 既有口径），不在本项 */
        const gOf = sg => sg.measures.flatMap(m => m.voxes[0]).map((c, i) => c.grace && !q4[i] ? JSON.stringify(normGrace(c.grace)) : '').filter(Boolean).join(' ');
        const g2 = { nNo: (x.match(/<grace\/>/g) || []).length, nYes: (x.match(/<grace slash="yes"\/>/g) || []).length, same: gOf(JSON.parse(js)) === gOf(im.song), a: gOf(JSON.parse(js)), b: gOf(im.song) };
        /* G3 刻版 */
        const { sv } = __off(JSON.parse(js));
        const gr = gq => [...sv.querySelectorAll('[data-g="grace"][data-gq="' + gq + '"]')];
        const info = gq => { const els = gr(gq), ln = els.filter(e => e.tagName === 'line');
          const slash = ln.filter(e => e.getAttribute('x1') !== e.getAttribute('x2') && e.getAttribute('y1') !== e.getAttribute('y2')).length;
          const beams = ln.filter(e => e.getAttribute('stroke-width') === '1.6').map(e => +e.getAttribute('y1'));
          const stems = ln.filter(e => e.getAttribute('x1') === e.getAttribute('x2')).map(e => Math.min(+e.getAttribute('y1'), +e.getAttribute('y2')));
          const flags = els.filter(e => e.tagName === 'path').map(e => Object.keys(SMUFL).find(k => /^flag/.test(k) && SMUFL[k].d === e.getAttribute('d'))).filter(Boolean);
          return { slash, nB: beams.length, beamTop: beams.length ? Math.min(...beams) : null, stemTops: stems, flags }; };
        return { g2, long: info('0:0:0'), s16: info('0:0:1'), b16: info('0:0:2'), b32: info('0:0:3'), s8: info('0:1:0'), q4: info('0:1:1') }; });
      if (want('G2')) T(!r.err && r.g2.nNo === 1 && r.g2.nYes === 8 && r.g2.same, 'G2 导出：slash:false → <grace/>、其余 <grace slash="yes"/>；自家导出再导入 grace 逐字段相同', J(r.g2 || r));
      if (want('G3')) {
        T(!r.err && r.long.slash === 0 && r.s16.slash === 1 && r.b16.slash === 1, 'G3a 长倚音（slash:false）不画斜线；短倚音 1 条', J(r));
        T(!r.err && r.s16.flags.join() === 'flag16thUp' && r.long.flags.join() === 'flag16thUp' && r.s8.flags.join() === 'flag8thUp' && !r.q4.flags.length && r.s16.nB === 0,
          'G3b 单个倚音按时值画小号符尾：十六分 flag16thUp、八分 flag8thUp、四分无符尾（修前 0 个）', J(r));
        T(!r.err && r.b16.nB === 2 && r.b32.nB === 3 && !r.b16.flags.length && r.b16.stemTops.every(y => Math.abs(y - r.b16.beamTop) < 0.05) && r.b32.stemTops.every(y => Math.abs(y - r.b32.beamTop) < 0.05),
          'G3c 多个倚音：十六分 2 道、三十二分 3 道符杠，各符干都够到符杠（修前一律 1 道、低处符干够不着）', J({ b16: r.b16, b32: r.b32 }));
      }
    }
    allErrs.push(...A.errs.filter(x => !allErrs.includes('flow: ' + x)).map(x => 'main: ' + x));
    await A.ctx.close();
  } catch (e) { console.log('❌ 运行异常 ' + (e && e.stack || e)); fails.push('EXC'); total++; }
  const errs = [...new Set(allErrs.map(x => x.replace(/^\w+: /, '')))];
  T(!errs.length, 'E 页面脚本错误 0', errs.slice(0, 5).join(' / '));
  await b.close();
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '  失败：' + fails.join(' ') : ''));
  console.log(errs.length ? 'ERRORS' : 'NO ERRORS');
  process.exit(fails.length ? 1 : 0);
})();
