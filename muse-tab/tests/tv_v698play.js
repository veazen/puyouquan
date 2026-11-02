'use strict';
/* v69.8 B 组 · 播放与速度（复核 T6 / T3② / F3 后半 / E8 前半；规格 docs/spec-2026-11-v698.md §3.3–§3.5）。
   file:// 直载、真实浏览器；基线页＝git show cd08ca0（v69.8 第 0 步）——Z / P6 对拍用；曲库读 api/seed-library.json，预设用 PRESETS。
   Z  老谱零差异：16 预设 + 曲库 10 首离屏谱面与 MusicXML 导出与基线逐字节相同（纯五线谱谱面只差 E8：页头 ♩= 挪到首行谱表上方，逐项列出）；
      播放事件 / MIDI 只在带延长号 / 跳音类 / 重音类 / 踏板 / 渐强渐弱的谱上变化（列出变化类别与数量），其余逐条相同
   T  曲中速度 mea.tempos：T1 导入（metronome / 裸 sound tempo / 带 words）· T2 往返 · T2b 各种写法过 MusicXML 4.0 XSD · T3 播放分段变速、D.C. 回初速、中途起播 ·
      T3b 变速谱里六线谱技法的绝对时刻（glide.at / fx.end）随映射 · T4 MIDI FF 51 ·
      T5 刻版位置（五线谱上方净空、x 对起拍列、简谱行、hide 不画）· T6 E8 纯五线谱页头速度挪到首行谱表上方（热区可见可点，两外壳）· T7「此处变速」/ 点速度点改删（两外壳一步撤销）
   S  同音重奏 col.tieSlur：S1 导入只标圆滑线来源的同音环 · S2 播放 / MIDI 重奏 · S3 导出 slur 不写 tie、往返 · S4 弧端在符头中心
   P  播放真实化：P1 真踏板延音 · P2 渐强逐音插值（播放 + MIDI）· P3 跳音 0.5×、重音 ×1.2 · P4 延长号 min(列长, 2 秒)、同拍只延一次 · P5 长倚音拍上占时值
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V698_REF 基线页（缺省 git show cd08ca0）· ONLY=Z,T,S,P 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = 'cd08ca0';   /* v69.8 第 0 步（四组共同的起点） */
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'seed-library.json'), 'utf8'));
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);
const refUrl = () => {
  if (process.env.V698_REF) return toUrl(process.env.V698_REF);
  try { const t = path.join(os.tmpdir(), 'v698_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
    return 'file://' + t; } catch (_) { return null; }
};

/* v69.8 集成：去掉全部 v69.8 新字段（col.syl / grace.slash / mea.tempos / col.tieSlur / song.voxClefOct / voxTransp / rowNames / voxShort）＝老谱 */
const STRIP698 = s0 => { const s = JSON.parse(JSON.stringify(s0)); ['voxClefOct', 'voxTransp', 'rowNames', 'voxShort'].forEach(k => delete s[k]);
  (s.measures || []).forEach(m => { delete m.tempos; [m.voxes, m.tabs].forEach(R => (R || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; delete c.syl; delete c.tieSlur;
    ['grace', 'graceA'].forEach(k => { if (c[k] && typeof c[k] === 'object') delete c[k].slash; }); }))); });
  return s; };

const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; render(); return song.measures.length; };
  /* 播放调度全记录（四个发声函数，含分窗排程里余下的）：时间相对起播原点 t（audio.prog.t），保留 6 位 */
  window.__play = (from) => { const rec = []; const o = { p: window.playInst, c: window.chick, h: window.percHit, m: window.metroClick };
    const R = x => Math.round(x * 1e6) / 1e6;
    window.playInst = (k, c, b2, f, w, ring, g, mute, opt) => rec.push(['p', b2, f, w, ring, g, !!mute, opt || null]);
    window.chick = (c, b2, w, g) => rec.push(['c', b2, 0, w, 0, g, false, null]);
    window.percHit = (c, b2, w, ty, g) => rec.push(['h', b2, 0, w, 0, g, false, null]);
    window.metroClick = (c, b2, w, a, s2) => rec.push(['m', b2, 0, w, 0, s2 || 0, !!a, null]);
    let tr = {}, t0 = 0;
    try { sel.mi = from || 0; sel.ci = 0; play(); tr = Object.assign({}, audio.tracks); t0 = audio.prog ? audio.prog.t : 0;
      window.__prog = audio.prog ? { starts: audio.prog.starts.slice(), dur: audio.prog.dur, order: audio.prog.order.slice() } : null;
      window.__evs = (audio.events || []).map(e => ({ tm: R(e.tm), mi: e.mi, ci: e.ci }));
      const S = audio.schedQ; if (S) S.q.slice(S.i).forEach(ev => { const a = ev.a;
        if (ev.k === 'playInst') rec.push(['p', a[2], a[3], a[4], a[5], a[6], !!a[7], a[8] || null]);
        else if (ev.k === 'chick') rec.push(['c', a[1], 0, a[2], 0, a[3], false, null]);
        else if (ev.k === 'percHit') rec.push(['h', a[1], 0, a[2], 0, a[4], false, null]);
        else rec.push(['m', a[1], 0, a[2], 0, a[4] || 0, !!a[3], null]); }); }
    finally { stopPlay(); window.playInst = o.p; window.chick = o.c; window.percHit = o.h; window.metroClick = o.m; }
    const name = b => { for (const k in tr) if (tr[k] === b) return k; return '?'; };
    /* opt 里的绝对时刻（技法 fx.end / fx.glide.at）同样相对起播原点 */
    const ro = x => { if (x == null) return null; const y = JSON.parse(JSON.stringify(x)); if (y.fx) { if (y.fx.end != null) y.fx.end -= t0; if (y.fx.glide && y.fx.glide.at != null) y.fx.glide.at -= t0; }
      return JSON.parse(JSON.stringify(y, (k, v) => typeof v === 'number' ? R(v) : v)); };
    return rec.map(r => ({ k: r[0], trk: r[0] === 'p' ? name(r[1]) : r[0], m: r[2] ? R(69 + 12 * Math.log2(r[2] / 440)) : 0, w: R(r[3] - t0), d: R(r[4]), g: R(r[5]), mu: r[6], opt: ro(r[7]) }))
      .sort((a, b) => a.w - b.w || a.m - b.m || (a.trk < b.trk ? -1 : a.trk > b.trk ? 1 : 0) || a.d - b.d); };
  window.J = x => JSON.stringify(x);
  /* 元素在 #score 坐标系里的外框（含 transform；getBBox 对带 transform 的字形给的是局部坐标） */
  window.__bb = e => { const sv = document.getElementById('score'), r = e.getBoundingClientRect(), R = sv.getBoundingClientRect(), k = sv.viewBox.baseVal.width / R.width;
    return { x: (r.x - R.x) * k, y: (r.y - R.y) * k, width: r.width * k, height: r.height * k }; };
  /* 墨迹框：文字按字墨（同刻版避让 avTextBox 的量法——字体 em 框比字墨高，不能拿来判净空），其余按外框 */
  window.__ink = e => { if (e.tagName !== 'text') return __bb(e); const A = n => e.getAttribute(n);
    const font = (A('font-style') === 'italic' ? 'italic ' : '') + (A('font-weight') || '400') + ' # ' + AV_FAM(A('font-family'));
    const q = avTextBox(+A('x'), +A('y'), parseFloat(A('font-size')) || 10, A('text-anchor') || 'start', font, e.textContent); return { x: q[0], y: q[1], width: q[2] - q[0], height: q[3] - q[1] }; };
  window.__midi = s => [...exportMIDI(s || song).bytes];
  /* MIDI 解析：各轨 [{tick, ty:'on'|'off'|'tempo', ch, k, v}] */
  window.__mparse = bytes => { const out = []; let i = 14;
    while (i < bytes.length) { if (bytes[i] !== 0x4D) break; const len = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7]; let j = i + 8, end = j + len, tick = 0, run = 0; const ev = [];
      while (j < end) { let d = 0, b; do { b = bytes[j++]; d = (d << 7) | (b & 0x7f); } while (b & 0x80); tick += d;
        let st = bytes[j]; if (st & 0x80) j++; else st = run; run = st;
        if (st === 0xFF) { const ty = bytes[j++]; let L = 0; do { b = bytes[j++]; L = (L << 7) | (b & 0x7f); } while (b & 0x80);
          if (ty === 0x51) ev.push({ tick, ty: 'tempo', v: (bytes[j] << 16) | (bytes[j + 1] << 8) | bytes[j + 2] }); j += L; }
        else { const hi = st & 0xF0; if (hi === 0x90 || hi === 0x80) { const k = bytes[j], v = bytes[j + 1]; ev.push({ tick, ty: hi === 0x90 && v > 0 ? 'on' : 'off', ch: st & 15, k, v }); j += 2; }
          else if (hi === 0xC0 || hi === 0xD0) j += 1; else j += 2; } }
      out.push(ev); i = end; }
    return out; };
  window.__off = s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); let h = null;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { svg.remove(); }
    return h; };
  window.__xml = s => { const o0 = song; try { return exportMusicXML(migrate(JSON.parse(JSON.stringify(s)))); } finally { song = o0; } };
  /* 夹具：单声部五线谱，tempo 60，n 小节 × 4 个四分音符（1 2 3 4） */
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__mk = (n, o) => { o = o || {}; const nv = o.nv || 1, nts = o.nts || Array(nv).fill('staff');
    return { v: 3, title: '夹具', key: 'C', beats: 4, unit: 4, tempo: o.tempo || 60, capo: 0, tabVoices: [], voxVoices: Array.from({ length: nv }, (_, i) => o.names ? o.names[i] : '声部' + (i + 1)), voxNotations: nts, lyricLines: 1, customChords: {},
      measures: Array.from({ length: n }, () => ({ tabs: [], voxes: Array.from({ length: nv }, (_, v) => [1, 2, 3, 4].map(d => __V(nts[v] === 'bass' ? d + 2 : d, 4, nts[v] === 'bass' ? { oct: -1 } : {}))), repeatStart: false, repeatEnd: false })) }; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));

/* 曲中速度夹具（MusicXML）：起始 ♩=60；m3 第 2 拍 ♩=120；m5 裸 sound tempo 50；m6 words + metronome（八分 =144） */
const NOTE = (st, oct, ty, dur) => `<note><pitch><step>${st}</step><octave>${oct}</octave></pitch><duration>${dur || 1}</duration><voice>1</voice><type>${ty || 'quarter'}</type></note>`;
const XHEAD = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list><part id="P1">`;
const ATTR = `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`;
const MT = (u, n, dot) => `<direction-type><metronome><beat-unit>${u}</beat-unit>${dot ? '<beat-unit-dot/>' : ''}<per-minute>${n}</per-minute></metronome></direction-type>`;
const FIX_T = XHEAD
  + `<measure number="1">${ATTR}<direction placement="above">${MT('quarter', 60)}<sound tempo="60"/></direction>${NOTE('C', 4)}${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}</measure>`
  + `<measure number="2">${NOTE('C', 4)}${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}</measure>`
  + `<measure number="3">${NOTE('C', 4)}<direction placement="above">${MT('quarter', 120)}<sound tempo="120"/></direction>${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}</measure>`
  + `<measure number="4">${NOTE('C', 4)}${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}</measure>`
  + `<measure number="5"><sound tempo="50"/>${NOTE('C', 4)}${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}</measure>`
  + `<measure number="6"><direction placement="above"><direction-type><words>Più mosso</words></direction-type>${MT('eighth', 144)}<sound tempo="72"/></direction>${NOTE('C', 4)}${NOTE('D', 4)}${NOTE('E', 4)}${NOTE('F', 4)}<barline location="right"><bar-style>light-heavy</bar-style></barline></measure>`
  + `</part></score-partwise>`;
/* 同音重奏夹具：m1 圆滑线里 E E（同音）+ 真连音线 G~G；m2 圆滑线里 A A（同音）+ C D */
const SL = (t) => `<notations><slur type="${t}" number="1"/></notations>`;
const NS = (st, oct, extra, nt) => `<note><pitch><step>${st}</step><octave>${oct}</octave></pitch><duration>1</duration>${extra || ''}<voice>1</voice><type>quarter</type>${nt || ''}</note>`;
const FIX_S = XHEAD
  + `<measure number="1">${ATTR}<direction placement="above">${MT('quarter', 60)}<sound tempo="60"/></direction>${NS('E', 4, '', SL('start'))}${NS('E', 4, '', SL('stop'))}${NS('G', 4, '<tie type="start"/>', '<notations><tied type="start"/></notations>')}${NS('G', 4, '<tie type="stop"/>', '<notations><tied type="stop"/></notations>')}</measure>`
  + `<measure number="2">${NS('A', 4, '', SL('start'))}${NS('A', 4, '', SL('stop'))}${NS('C', 5)}${NS('D', 5)}<barline location="right"><bar-style>light-heavy</bar-style></barline></measure>`
  + `</part></score-partwise>`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= Z 老谱零差异（对拍基线 cd08ca0） ================= */
    if (want('Z')) {
      const RU = refUrl();
      if (!RU) console.log('⚠️ Z 跳过：拿不到基线页（git show ' + REF_COMMIT + ' 失败；可设 env V698_REF）');
      else {
        const A = await open(b), B = await open(b, { url: RU });
        const P = await EV(A.pg, () => PRESETS.map((p, i) => ({ name: '预设' + i + '·' + (p.name || ''), song: p.make() })));
        /* v69.8 集成迁移：曲库 seed 已重建（带 rowNames / syl / tempos / tieSlur / 长倚音），对拍前去掉全部 v69.8 新字段＝还原成「老谱」 */
        const ALL = P.concat(LIB.map(x => ({ name: '曲库·' + (x.data.title || x.id), song: STRIP698(x.data) })));
        /* 每份谱有没有「播放会变」的记号（按规格 §7：跳音 / 延长号 / 渐强渐弱 / 踏板 / 重音类） */
        const cats = await EV(A.pg, L => L.map(x => { const c = { ferm: 0, stacc: 0, accent: 0, ped: 0, ramp: 0, longGrace: 0, tempos: 0, tieSlur: 0 };
          (x.song.measures || []).forEach(m => { if (m.tempos) c.tempos += m.tempos.length;
            (m.voxes || []).forEach(cs => (cs || []).forEach(col => { if (!col) return; if (col.ferm) c.ferm++; if (col.artic === 'stacc' || col.artic === 'staccatissimo') c.stacc++;
              if (col.artic === 'accent' || col.artic === 'marcato') c.accent++; if (col.ped) c.ped++; if (col.dyn && /^(<|>|cresc|dim|decresc)/.test(String(col.dyn))) c.ramp++; if (col.tieSlur) c.tieSlur++;
              if (col.grace && col.grace.slash === false) c.longGrace++; }));
            (m.tabs || []).forEach(cs => (cs || []).forEach(col => { if (col && col.ferm) c.ferm++; })); });
          return c; }), ALL);
        const pure = await EV(A.pg, L => L.map(x => !(x.song.tabVoices || []).length && (x.song.voxVoices || []).length > 0 && x.song.voxVoices.every((_, i) => isStaffNota((x.song.voxNotations || [])[i]) && !(x.song.voxDual || [])[i])), ALL);
        const offA = await EV(A.pg, L => L.map(x => __off(x.song)), ALL), offB = await EV(B.pg, L => L.map(x => __off(x.song)), ALL);
        const xA = await EV(A.pg, L => L.map(x => __xml(x.song)), ALL), xB = await EV(B.pg, L => L.map(x => __xml(x.song)), ALL);
        const badX = ALL.filter((_, i) => xA[i] !== xB[i]).map(x => x.name);
        T(!offA.err && !xA.err && !badX.length, 'Z1 MusicXML 导出：' + ALL.length + ' 份（16 预设 + 曲库 ' + LIB.length + '）与基线逐字节相同（没有 tempos / tieSlur 的谱不多写一个字）', badX.join('、') || ALL.length + ' / ' + ALL.length);
        /* 谱面：非纯五线谱逐字节同；纯五线谱只差 E8（基线页头那条 ♩= / 术语文字 + 热区 ↔ 现在首行谱表上方的速度记号 + 热区），其余元素逐个相同 */
        const E8strip = (h, cur) => { let s = String(h);
          if (cur) s = s.replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-style="italic" font-weight="700" font-family="Georgia,serif" fill="var\(--ink\)">[^<]*<\/text>/, '')
            .replace(/<path d="[^"]*" transform="translate\([^)]*\) scale\(4\.300\)" fill="var\(--ink\)"><\/path>/g, '')
            .replace(/<line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="var\(--ink\)" stroke-width="0\.95"><\/line>/g, '')
            .replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-weight="700" fill="var\(--ink\)">= \d+<\/text>/g, '')
            .replace(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="19" fill="transparent" data-hd="tempo"[^>]*>(<title>[^<]*<\/title>)?<\/rect>/, '');
          else s = s.replace(/<text x="[^"]*" y="[^"]*" font-size="12.5" font-weight="700" fill="var\(--ink\)">(<tspan[^>]*>[^<]*<\/tspan>　)?[♩♪][.]?=\d+<\/text>/, '')
            .replace(/(<rect x="[^"]*" y="[^"]*" width="[^"]*" height="18(\.0)?" fill="transparent" data-hd="tempo"[^>]*>(<title>[^<]*<\/title>)?<\/rect>)+/g, '');
          return s; };
        const badS = [], e8 = [], t9 = [];
        /* v69.8 集成迁移：带五线谱倚音的谱另有 A 组 T9（按时值画符尾 / 符杠，规格 §7 已拍板）——放行并列出 */
        const stGr = await EV(A.pg, L => L.map(x => (x.song.voxVoices || []).some((_, vi) => isStaffNota((x.song.voxNotations || [])[vi]) && (x.song.measures || []).some(m => ((m.voxes || [])[vi] || []).some(c => c && (c.grace || c.graceA))))), ALL);
        ALL.forEach((x, i) => { if (offA[i] === offB[i]) return; if (stGr[i]) { t9.push(x.name); return; }
          if (!pure[i]) { badS.push(x.name); return; }
          const a = E8strip(offA[i], true), bb = E8strip(offB[i], false);
          if (a === bb) e8.push(x.name); else badS.push(x.name + '（纯五线谱 · 去掉 E8 后仍不同）'); });
        T(!badS.length, 'Z2 离屏谱面：非纯五线谱 ' + pure.filter(v => !v).length + ' 份与基线逐字节相同；纯五线谱 ' + pure.filter(Boolean).length + ' 份只差 E8（页头 ♩= → 首行谱表上方）；带五线谱倚音的按 T9 放行',
          badS.join('、') || ('E8 生效：' + e8.join('、') + '｜T9 放行：' + t9.join('、')));
        /* 播放事件 / MIDI：没有「会变」记号的谱逐条 / 逐字节相同；有的列出类别与变化条数 */
        const KEYS = ['ferm', 'stacc', 'accent', 'ped', 'ramp', 'longGrace', 'tempos', 'tieSlur'];
        const plA = [], plB = [], mA = [], mB = [];
        for (const x of ALL) {
          plA.push(J(await EV(A.pg, s => { __ld(s); return __play(0); }, x.song)));
          plB.push(J(await EV(B.pg, s => { __ld(s); return __play(0); }, x.song)));
          mA.push(J(await EV(A.pg, s => __midi(migrate(JSON.parse(JSON.stringify(s)))), x.song)));
          mB.push(J(await EV(B.pg, s => __midi(migrate(JSON.parse(JSON.stringify(s)))), x.song)));
        }
        const bad = [], chg = [], tally = {};
        ALL.forEach((x, i) => { const has = KEYS.filter(k => cats && cats[i] && cats[i][k] > 0);
          const dP = plA[i] !== plB[i], dM = mA[i] !== mB[i];
          if (!has.length && (dP || dM)) bad.push(x.name + (dP ? '·播放' : '') + (dM ? '·MIDI' : ''));
          if (dP || dM) { const ea = JSON.parse(plA[i]), eb = JSON.parse(plB[i]); let n = 0; const L = Math.max(ea.length, eb.length);
            for (let k = 0; k < L; k++) if (J(ea[k]) !== J(eb[k])) n++;
            chg.push(x.name.replace(/^曲库·|^预设\d+·/, '') + '[' + has.map(k => k + cats[i][k]).join(' ') + '：播放 ' + n + ' 条' + (dM ? '、MIDI 变' : '') + ']');
            has.forEach(k => { tally[k] = (tally[k] || 0) + 1; }); } });
        T(!bad.length && plA.every(s => !/"err"/.test(s.slice(0, 10))), 'Z3 播放事件与 MIDI：' + ALL.length + ' 份里不带跳音类 / 重音类 / 延长号 / 踏板 / 渐强渐弱的谱与基线逐条 / 逐字节相同；变化的 ' + chg.length + ' 份全部带这些记号（类别：' + J(tally) + '）',
          bad.join('、') || chg.join(' · '));
        allErrs.push(...A.errs, ...B.errs); await A.close(); await B.close();
      }
    }

    /* ================= T 曲中速度 ================= */
    if (want('T')) {
      const A = await open(b, { shell: 'classic' });
      /* T1 导入 */
      const t1 = await EV(A.pg, x => { const r = importMusicXML(x); if (!r || r.error) return { err: r && r.error }; const s = r.song;
        return { tempo: s.tempo, unit: s.tempoUnit, tp: s.measures.map(m => m.tempos || null), anno6: s.measures[5].voxes[0][0].anno || null, dyn6: s.measures[5].voxes[0][0].dyn || null }; }, FIX_T);
      T(!t1.err && t1.tempo === 60 && J(t1.tp) === J([null, null, [{ q: 1, bpm: 120 }], null, [{ q: 0, bpm: 50, hide: true }], [{ q: 0, bpm: 144, tempoUnit: 'e', text: 'Più mosso' }]]) && !t1.anno6 && !t1.dyn6,
        'T1 MusicXML 导入：m3 第 2 拍 ♩=120 → {q:1, bpm:120}；m5 裸 sound tempo → {bpm:50, hide}；m6 words + 八分 metronome → text / tempoUnit e；起始 ♩=60 不重复进点、words 不再进标注 / 力度', J(t1));
      /* T2 往返 */
      const t2 = await EV(A.pg, x => { const s = importMusicXML(x).song; const x2 = exportMusicXML(s); const s2 = importMusicXML(x2).song;
        return { a: J(s.measures.map(m => m.tempos || null)), b: J(s2.measures.map(m => m.tempos || null)), sounds: (x2.match(/<sound tempo="[^"]*"/g) || []).length, metro: (x2.match(/<metronome>/g) || []).length, tempo: s2.tempo }; }, FIX_T);
      T(!t2.err && t2.a === t2.b && t2.sounds === 4 && t2.metro === 3 && t2.tempo === 60, 'T2 自家导出再导入 tempos 逐字节同（4 个 sound tempo＝起始 + 3 点；印出的 metronome 3 个＝起始 + 2 个非 hide）', J(t2));
      /* T2b 速度点的各种写法（列上 / 两列之间带 offset / hide 裸 sound 带 offset / 整小节休止里 / 大谱表）导出过 MusicXML 4.0 官方 XSD，再导入逐字节同 */
      { const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
        let has = false; try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); has = fs.existsSync(XSD); } catch (_) {}
        if (!has) console.log('⚠️ T2b 跳过：没有 xmllint 或 XSD');
        else {
          const xs = await EV(A.pg, () => { const s = __mk(4, { nv: 2, nts: ['staff', 'bass'], names: ['右手', '左手'] });
            s.measures[1].tempos = [{ q: 1, bpm: 100, text: 'Più mosso' }, { q: 2.5, bpm: 90 }, { q: 3.5, bpm: 70, hide: true }];
            s.measures[2].voxes[0] = [__V(0, 1)]; s.measures[2].voxes[1] = [__V(0, 1)]; s.measures[2].tempos = [{ q: 2, bpm: 60, tempoUnit: 'dq' }];
            s.measures[3].tempos = [{ q: 0, bpm: 132, tempoUnit: 'e' }];
            const x = exportMusicXML(s); const s2 = importMusicXML(x).song;
            return { x, a: J(s.measures.map(m => m.tempos || null)), b: J(s2.measures.map(m => m.tempos || null)) }; });
          let bad = '';
          if (xs && xs.x) { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'v698p_')), 'tp.xml'); fs.writeFileSync(f, xs.x);
            try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { bad = String(e.stderr || e.message || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | '); } }
          T(xs && !xs.err && !bad && xs.a === xs.b, 'T2b 速度点写法（列上 / 列间 offset / hide 裸 sound / 整小节休止 / 大谱表 P1）导出过 MusicXML 4.0 XSD，再导入 tempos 逐字节同', bad || (xs && (xs.err || (xs.a === xs.b ? 'ok' : xs.a + ' ≠ ' + xs.b))));
        } }
      /* T3 播放：♩=60 → m2 ♩=120（第 2 小节起拍）；D.C. 回首；从 m2 起播 */
      const t3 = await EV(A.pg, () => { const s = __mk(3); s.measures[1].tempos = [{ q: 0, bpm: 120 }]; __ld(s);
        const on = (ev) => ev.filter(e => e.k === 'p').map(e => e.w);
        const a = on(__play(0));
        const s2 = __mk(3); s2.measures[1].tempos = [{ q: 0, bpm: 120 }]; s2.measures[2].dc = true; __ld(s2); const c = on(__play(0)); const ord = __prog.order;
        __ld(s); const d = on(__play(1));
        return { a, c, ord, d }; });
      const gaps = a => a.slice(1).map((x, i) => +(x - a[i]).toFixed(4));
      const ga = t3.err ? [] : gaps(t3.a), gc = t3.err ? [] : gaps(t3.c), gd = t3.err ? [] : gaps(t3.d);
      T(!t3.err && ga.slice(0, 3).every(g => Math.abs(g - 1) < 0.005) && ga.slice(4, 7).every(g => Math.abs(g - 0.5) < 0.005) && Math.abs(ga[3] - 1) < 0.005
        && J(t3.ord) === J([0, 1, 2, 0, 1, 2]) && gc.slice(12, 15).every(g => Math.abs(g - 1) < 0.005) && gd.slice(0, 3).every(g => Math.abs(g - 0.5) < 0.005),
        'T3 播放：m2 ♩=120 相邻四分起点间隔 0.5 秒（m1 仍 1.0）；D.C. 回首后间隔回到 1.0；从 m2 起播第一拍间隔即 0.5', J({ ga, gc: gc.slice(10, 16), gd: gd.slice(0, 4) }));
      /* T3b 技法的绝对时刻（fx.glide.at / fx.end）随映射走：六线谱技法示例在第 2 小节起变成两倍速——滑弦到达时刻仍＝目标音起点、技法终点不早于起奏 */
      const t3b = await EV(A.pg, () => { const i = PRESETS.findIndex(p => /指弹技法示例/.test(p.name)); const s = PRESETS[i].make();
        const sp = +s.tempo || 90; s.measures[1].tempos = [{ q: 0, bpm: sp * 2 }]; __ld(s);
        const ev = __play(0).filter(e => e.k === 'p'); const st = new Set(ev.map(e => e.w.toFixed(4)));
        const gl = ev.filter(e => e.opt && e.opt.fx && e.opt.fx.glide), fe = ev.filter(e => e.opt && e.opt.fx && e.opt.fx.end != null);
        return { n: ev.length, gl: gl.length, glBad: gl.filter(e => !st.has((+e.opt.fx.glide.at).toFixed(4))).map(e => [e.w, e.opt.fx.glide.at]), fe: fe.length, feBad: fe.filter(e => !(e.opt.fx.end > e.w)).length,
          late: gl.filter(e => e.w >= __prog.starts[1]).length }; });
      T(!t3b.err && t3b.gl >= 2 && t3b.late >= 1 && !t3b.glBad.length && t3b.fe >= 2 && !t3b.feBad, 'T3b 变速谱里六线谱技法：滑弦 glide.at 都落在某个音的实际起点上（' + (t3b.gl || 0) + ' 处，变速后 ' + (t3b.late || 0) + ' 处）、技法终点 fx.end 都晚于起奏', J(t3b));
      /* T4 MIDI */
      const t4 = await EV(A.pg, () => { const s = __mk(4); s.measures[1].tempos = [{ q: 2, bpm: 90 }]; s.measures[3].tempos = [{ q: 0, bpm: 120, tempoUnit: 'e' }];
        const tr = __mparse(__midi(migrate(s))); return tr[0].filter(e => e.ty === 'tempo').map(e => [e.tick, e.v]); });
      T(!t4.err && J(t4) === J([[0, 1000000], [2880, 666667], [5760, 1000000]]), 'T4 MIDI FF 51：tick 0 ♩=60（1000000µs）· m2 第 3 拍 ♩=90（tick 2880 · 666667µs）· m4 八分=120＝♩=60（tick 5760 · 1000000µs，与前一点不同才写）', J(t4));
      /* T5 刻版位置（五线谱 + 简谱 + hide） */
      const t5 = await EV(A.pg, () => { const s = __mk(4); s.measures[1].tempos = [{ q: 1, bpm: 120, text: 'Più mosso' }, { q: 3, bpm: 50, hide: true }]; s.measures[2].tempos = [{ q: 0, bpm: 72, tempoUnit: 'dq' }];
        s.measures[1].voxes[0][1] = __V(5, 4, { oct: 1 });   /* 高音 G5：上加线，速度记号要让 */
        window.__pyqGeom = true; __ld(s); window.__pyqGeom = false;
        const sc = document.getElementById('score');
        const box = sel2 => { const els = [...sc.querySelectorAll(sel2)].filter(e => e.getAttribute('fill') !== 'transparent'); if (!els.length) return null;
          const bs = els.map(e => __ink(e)); return { n: els.length, x0: Math.min(...bs.map(q => q.x)), y0: Math.min(...bs.map(q => q.y)), y1: Math.max(...bs.map(q => q.y + q.height)) }; };
        const mk = box('[data-g="tempo"][data-gq="0:1:0"]'), head = box('[data-g="head"][data-gq="0:1:1"]');
        const lines = [...sc.querySelectorAll('line[stroke-width="0.8"]')].map(l => +l.getAttribute('y1')).filter(y => mk && y > mk.y1 && y < mk.y1 + 60);
        const stT = lines.length ? Math.min(...lines) : null;
        const hz = sc.querySelectorAll('[data-tmp]').length, hzk = [...sc.querySelectorAll('[data-tmp]')].map(e => e.dataset.tmp);
        /* 简谱行 */
        const s2 = __mk(3, { nts: [undefined] }); s2.voxNotations = []; s2.measures[1].tempos = [{ q: 2, bpm: 100 }]; __ld(s2);
        const tx = [...sc.querySelectorAll('text')].filter(e => e.textContent === '= 100');
        const cb = colBoxes['v0:1:2'];
        const dig = cb ? [...sc.querySelectorAll('text')].filter(e => e.textContent === '3' && (+e.getAttribute('x')) > cb.x && (+e.getAttribute('x')) < cb.x + cb.w) : [];
        const jt = tx.length ? __ink(tx[0]) : null, dg = dig.length ? dig.map(e => __ink(e)) : [];
        const hzJ = [...sc.querySelectorAll('[data-tmp]')].map(e => e.getBBox());
        return { mk, head, stT, hz, hzk, jp: jt ? { y1: jt.y + jt.height } : null, digTop: dg.length ? Math.min(...dg.map(q => q.y)) : null, hzJ: hzJ.length ? hzJ[0].x : null, colX: dig.length ? +dig[0].getAttribute('x') : null }; });
      T(!t5.err && t5.mk && t5.head && t5.stT != null && t5.mk.y1 < t5.stT - 1.5 && t5.mk.y1 < t5.head.y0 - 1.5 && Math.abs(t5.mk.x0 - t5.head.x0) <= 1 && t5.hz === 2 && J(t5.hzk) === J(['1:0', '2:0'])
        && t5.jp && t5.digTop != null && t5.jp.y1 < t5.digTop - 1.5 && Math.abs(t5.hzJ + 2 - (t5.colX - 4.4)) <= 1,
        'T5 刻版：五线谱速度点墨迹底 < 谱表顶线 −1.5 且让过上加线符头、左缘＝起拍列符头左缘 ±1；hide 点不出元素（热区 2 个）；简谱行的点在数字之上、x 对起拍列', J(t5));
      /* T6 E8：纯五线谱（小步舞曲）页头 ♩= 0 个、首系统上方 1 个；热区可见可点（两外壳）；弹唱 / 简谱 / 六线谱页头不变见 Z2 */
      const e8 = async (shell) => { const X = await open(b, { shell });
        const r = await EV(X.pg, () => { const i = PRESETS.findIndex(p => /小步舞曲/.test(p.name)); __ld(PRESETS[i].make()); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
          const sc = document.getElementById('score');
          const head = [...sc.querySelectorAll('text')].filter(e => /[♩♪]\.?=\d/.test(e.textContent)).length;
          const mk = [...sc.querySelectorAll('text')].filter(e => e.textContent === '= ' + song.tempo);
          const hz = sc.querySelector('[data-hd="tempo"]'); const hb = hz && hz.getBoundingClientRect();
          const st = [...sc.querySelectorAll('line[stroke-width="0.8"]')].map(l => +l.getAttribute('y1')).sort((a, b) => a - b)[0];
          const my = mk.length ? mk[0].getBBox() : null;
          return { head, mk: mk.length, below: my ? my.y + my.height < st - 1.5 : false, hz: hb ? { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 } : null, top: hb ? (document.elementFromPoint(hb.x + hb.width / 2, hb.y + hb.height / 2) === hz) : false }; });
        let opened = null;
        if (r && r.hz && r.top) { await X.pg.mouse.click(r.hz.x, r.hz.y); await X.pg.waitForTimeout(300);
          opened = await EV(X.pg, () => { const d = document.getElementById('popmenu'); const v = document.getElementById('tp-val'); return d ? { val: v && v.value, flow: d.classList.contains('flw-hdm-tempo') } : null; }); }
        allErrs.push(...X.errs); await X.close(); return Object.assign({}, r, { opened }); };
      const e8c = await e8('classic'), e8f = await e8();
      T(!e8c.err && !e8f.err && [e8c, e8f].every(r => r.head === 0 && r.mk === 1 && r.below && r.top && r.opened && r.opened.val === '120') && !e8c.opened.flow && e8f.opened.flow,
        'T6 E8 纯五线谱：页头不再有 ♩=、首行谱表上方 1 个速度记号；热区先断言可见（elementFromPoint 命中）再点——旧外壳速度弹窗 / 新外壳速度小面板，值＝整曲速度', J({ e8c, e8f }));
      /* T7 界面：「此处变速」加点 · 点速度点改 / 删 · 一步撤销（两外壳同结果） */
      const ui = async (shell) => { const X = await open(b, { shell });
        const pg = X.pg; const r = {};
        await EV(pg, () => { __ld(__mk(3)); sel = { mi: 1, row: 'vox', vi: 0, ci: 1, si: 1 }; render(); showHeadMenu('tempo', 400, 300); });
        await pg.waitForTimeout(200);
        r.btn = await EV(pg, () => { const b2 = [...document.querySelectorAll('#popmenu button')].find(x => x.textContent.trim() === '此处变速'); if (b2) b2.click(); return !!b2; });
        r.init = await EV(pg, () => (document.getElementById('tp-val') || {}).value);
        await pg.fill('#tp-val', '120');
        await EV(pg, () => { const ok = document.querySelector('#popmenu #tp-ok, #popmenu [data-fa="hd:tempo"]'); ok.click(); });
        await pg.waitForTimeout(200);
        r.add = await EV(pg, () => J(song.measures[1].tempos || null));
        r.u1 = await EV(pg, () => { undo(); const a = J(song.measures[1].tempos || null); redo(); return a; });
        await pg.waitForTimeout(150);
        const hz = await EV(pg, () => { const e = document.querySelector('#score [data-tmp="1:0"]'); if (!e) return null; const q = e.getBoundingClientRect(); e.scrollIntoView({ block: 'center' }); const q2 = e.getBoundingClientRect(); return { x: q2.x + q2.width / 2, y: q2.y + q2.height / 2, top: document.elementFromPoint(q2.x + q2.width / 2, q2.y + q2.height / 2) === e }; });
        r.hz = hz;
        if (hz && hz.top) { await pg.mouse.click(hz.x, hz.y); await pg.waitForTimeout(250);
          r.edit = await EV(pg, () => (document.getElementById('tp-val') || {}).value);
          await pg.fill('#tp-val', '100');
          await EV(pg, () => { const ok = document.querySelector('#popmenu #tp-ok, #popmenu [data-fa="hd:tempo"]'); ok.click(); });
          await pg.waitForTimeout(200);
          r.mod = await EV(pg, () => J(song.measures[1].tempos || null));
          const hz2 = await EV(pg, () => { const e = document.querySelector('#score [data-tmp="1:0"]'); const q2 = e.getBoundingClientRect(); return { x: q2.x + q2.width / 2, y: q2.y + q2.height / 2 }; });
          await pg.mouse.click(hz2.x, hz2.y); await pg.waitForTimeout(250);
          r.del = await EV(pg, () => { const b2 = [...document.querySelectorAll('#popmenu button')].find(x => x.textContent.trim() === '删除'); if (!b2) return 'no-btn'; b2.click(); return J(song.measures[1].tempos || null); });
          r.u2 = await EV(pg, () => { undo(); const a = J(song.measures[1].tempos || null); return a; });
        }
        /* 第 0 小节第 0 列：没有「此处变速」 */
        r.none = await EV(pg, () => { closePop(); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; showHeadMenu('tempo', 400, 300); const b2 = [...document.querySelectorAll('#popmenu button')].some(x => x.textContent.trim() === '此处变速'); closePop(); return !b2; });
        allErrs.push(...X.errs); await X.close(); return r; };
      const uc = await ui('classic'), uf = await ui();
      const okU = r => r.btn && r.init === '60' && r.add === J([{ q: 1, bpm: 120 }]) && r.u1 === 'null' && r.hz && r.hz.top && r.edit === '120' && r.mod === J([{ q: 1, bpm: 100 }]) && r.del === 'null' && r.u2 === J([{ q: 1, bpm: 100 }]) && r.none;
      T(okU(uc) && okU(uf), 'T7 界面（两外壳同结果）：光标在 m2 第 2 拍点「此处变速」（初值＝该处生效速度 60）填 120 → {q:1, bpm:120}，一步撤销；点谱面速度点（热区可见）改成 100、再点「删除」，各一步撤销；第 0 小节第 0 列不出「此处变速」', J({ uc, uf }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= S 同音重奏 col.tieSlur ================= */
    if (want('S')) {
      const A = await open(b, { shell: 'classic' });
      const s1 = await EV(A.pg, x => { const s = importMusicXML(x).song; window.__S = s;
        return s.measures.map(m => m.voxes[0].map(c => [c.deg, !!c.tie, !!c.tieSlur])); }, FIX_S);
      T(!s1.err && J(s1) === J([[[3, true, true], [3, false, false], [5, true, false], [5, false, false]], [[6, true, true], [6, false, false], [1, false, false], [2, false, false]]]),
        'S1 导入：圆滑线里的同音环（m1 E–E、m2 A–A）带 tieSlur，真连音线 G~G 不带（v65.1 的 tie 打标不动）', J(s1));
      const s2 = await EV(A.pg, () => { __ld(window.__S); const ev = __play(0).filter(e => e.k === 'p');
        const cnt = m => ev.filter(e => Math.abs(e.m - m) < 0.01).length;
        const mid = __mparse(__midi(song)); const on = k => mid.slice(1).reduce((a, tr) => a + tr.filter(e => e.ty === 'on' && e.k === k).length, 0);
        return { pE: cnt(64), pG: cnt(67), pA: cnt(69), mE: on(64), mG: on(67), mA: on(69) }; });
      T(!s2.err && s2.pE === 2 && s2.pA === 2 && s2.pG === 1 && s2.mE === 2 && s2.mA === 2 && s2.mG === 1, 'S2 播放 / MIDI：圆滑线里的同音各发 2 次，真连音线 G~G 仍只发 1 次', J(s2));
      const s3 = await EV(A.pg, () => { const x = exportMusicXML(window.__S); const n = x.split('<note>'); const s = importMusicXML(x).song;
        return { e1: /<slur type="start"/.test(n[1]) && !/<tie /.test(n[1]), g1: /<tie type="start"\/>/.test(n[3]), rt: J(s.measures.map(m => m.voxes[0].map(c => [!!c.tie, !!c.tieSlur]))) === J(window.__S.measures.map(m => m.voxes[0].map(c => [!!c.tie, !!c.tieSlur]))) }; });
      T(!s3.err && s3.e1 && s3.g1 && s3.rt, 'S3 导出：同音圆滑线写 slur 不写 tie、真连音线照写 tie；再导入 tie / tieSlur 逐列相同', J(s3));
      const s4 = await EV(A.pg, () => { window.__pyqGeom = true; __ld(window.__S); window.__pyqGeom = false; const sc = document.getElementById('score');
        const hc = gq => { const e = sc.querySelector('[data-g="head"][data-gq="' + gq + '"]'); const q = __bb(e); return q.x + q.width / 2; };
        const tx = gq => { const e = sc.querySelector('[data-g="tie"][data-gq="' + gq + '"]'); if (!e) return null; const m = e.getAttribute('d').match(/^M ([\d.]+) [\d.]+ Q [\d.]+ [\d.]+ ([\d.]+)/); return m ? [+m[1], +m[2]] : null; };
        return { slur: tx('0:0:0'), h0: hc('0:0:0'), h1: hc('0:0:1'), tie: tx('0:0:2'), h2: hc('0:0:2'), h3: hc('0:0:3') }; });
      T(!s4.err && s4.slur && Math.abs(s4.slur[0] - s4.h0) <= 0.5 && Math.abs(s4.slur[1] - s4.h1) <= 0.5 && s4.tie && s4.tie[0] > s4.h2 + 3 && s4.tie[1] < s4.h3 - 3,
        'S4 刻版：同音圆滑线两端落在符头中心 ±0.5；真连音线仍在符头右缘 → 下一符头左侧', J(s4));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= P 播放真实化 ================= */
    if (want('P')) {
      const A = await open(b, { shell: 'classic' });
      /* 钢琴夹具：右手 C D E F（四分）、左手同节奏；ped 写在左手（m1 第 1 列 on、第 4 列 off） */
      const pf = await EV(A.pg, () => { const s = __mk(2, { nv: 2, nts: ['staff', 'bass'], names: ['右手', '左手'] }); s.mixer = { 'vox:0': { inst: 'piano' }, 'vox:1': { inst: 'piano' } };   /* 钢琴音色（人声等持续音色不受踏板影响） */
        const base = (() => { __ld(s); return __play(0).filter(e => e.k === 'p' && e.trk === 'vox:0').map(e => [e.w, +(e.w + e.d).toFixed(4)]); })();
        s.measures[0].voxes[1][0].ped = 'on'; s.measures[0].voxes[1][3].ped = 'off'; __ld(s);
        const ev = __play(0).filter(e => e.k === 'p' && e.trk === 'vox:0').map(e => [e.w, +(e.w + e.d).toFixed(4)]);
        return { base, ev, dt: docType(song) }; });
      T(!pf.err && pf.dt === 'piano' && pf.ev.slice(0, 4).every(e => Math.abs(e[1] - 4) < 1e-3) && Math.abs(pf.ev[4][1] - pf.base[4][1]) < 1e-3 && Math.abs(pf.base[0][1] - 1) < 1e-3,
        'P1 真踏板：左手 Ped.（m1 第 1 拍踩、第 4 拍尾抬）下右手四个音的结束时刻＝抬起时刻 4.0 秒（修前＝各自时值 1.0 / 2.0 / 3.0…）；抬起后的音照旧', J({ ev: pf.ev.slice(0, 6), base: pf.base.slice(0, 6) }));
      /* P2 渐强：C(p) D(< 到 F) E F | G(f) */
      const p2 = await EV(A.pg, () => { const s = __mk(2); const c = s.measures[0].voxes[0];
        c[0].dyn = 'p'; c[1].dyn = '<'; c[1].dynTo = { mi: 0, ci: 3 }; s.measures[1].voxes[0][0].dyn = 'f'; __ld(s);
        const ev = __play(0).filter(e => e.k === 'p'); const acc = [0, 1, 2, 3, 0, 1, 2, 3].map(bp => beatAcc(bp, 4));
        const g = ev.slice(0, 5).map((e, i) => +(e.opt.vel / acc[i]).toFixed(4));
        const mid = __mparse(__midi(song))[1].filter(e => e.ty === 'on').map(e => e.v).slice(0, 5);
        return { g, mid, p: DYN_GAIN.p, f: DYN_GAIN.f }; });
      const inc = a => a.slice(1).every((x, i) => x > a[i]);
      T(!p2.err && Math.abs(p2.g[0] - p2.p) < 1e-3 && Math.abs(p2.g[1] - p2.p) < 1e-3 && inc(p2.g.slice(1)) && Math.abs(p2.g[4] - p2.f) < 1e-3
        && p2.mid[0] === 54 && p2.mid[1] === 54 && inc(p2.mid.slice(1)) && p2.mid[4] === 94,
        'P2 渐强逐音插值：p 之后 < 到第 4 拍、下一小节 f——渐强段（第 2 拍起）播放增益与 MIDI 力度严格递增，首＝p（0.68 / 54）、末＝f（1.18 / 94）', J(p2));
      /* P3 跳音 / 重音 */
      const p3 = await EV(A.pg, () => { const s = __mk(1); __ld(s); const e0 = __play(0).filter(e => e.k === 'p'); const m0 = __mparse(__midi(song))[1];
        s.measures[0].voxes[0][0].artic = 'stacc'; s.measures[0].voxes[0][1].artic = 'staccatissimo'; s.measures[0].voxes[0][2].artic = 'accent'; s.measures[0].voxes[0][3].artic = 'marcato'; __ld(s);
        const e1 = __play(0).filter(e => e.k === 'p'); const m1 = __mparse(__midi(song))[1];
        const len = (m, k) => { const on = m.filter(e => e.ty === 'on'), off = m.filter(e => e.ty === 'off'); return off[k].tick - on[k].tick; };
        return { d0: e0.map(e => e.d), d1: e1.map(e => e.d), v0: e0.map(e => e.opt.vel), v1: e1.map(e => e.opt.vel), ml0: [0, 1].map(k => len(m0, k)), ml1: [0, 1].map(k => len(m1, k)),
          mv0: m0.filter(e => e.ty === 'on').map(e => e.v), mv1: m1.filter(e => e.ty === 'on').map(e => e.v) }; });
      T(!p3.err && Math.abs(p3.d1[0] - 0.5) < 1e-6 && Math.abs(p3.d1[1] - 0.3) < 1e-6 && Math.abs(p3.d0[0] - 1) < 1e-6 && Math.abs(p3.v1[2] / p3.v0[2] - 1.2) < 1e-6 && Math.abs(p3.v1[3] / p3.v0[3] - 1.3) < 1e-6
        && J(p3.ml1) === J([240, 144]) && J(p3.ml0) === J([480, 480]) && p3.mv1[2] === 96 && p3.mv1[3] === 104 && p3.mv0[2] === 80,
        'P3 演奏法：跳音发声 0.5×、断音 0.3×（阻尼，修前延到下一音 1.0）；重音力度 ×1.2、顿强 ×1.3；MIDI 同口径（时值 240 / 144 tick、力度 96 / 104）', J(p3));
      /* P4 延长号 */
      const p4 = await EV(A.pg, () => { const on = () => __play(0).filter(e => e.k === 'p').map(e => e.w).filter((w, i, a) => a.indexOf(w) === i);
        const s = __mk(2); __ld(s); const a0 = on();
        s.measures[0].voxes[0][1].ferm = true; __ld(s); const a1 = on();
        const s3 = __mk(2, { nv: 3, nts: ['staff', 'staff', 'bass'] }); [0, 1, 2].forEach(v => { s3.measures[0].voxes[v][1].ferm = true; }); __ld(s3); const a3 = on();
        const sw = __mk(2); sw.measures[0].voxes[0] = [__V(1, 1, { ferm: true })]; __ld(sw); const aw = on();
        const mid = __mparse(__midi(sw))[0].filter(e => e.ty === 'tempo').map(e => [e.tick, e.v]);
        return { a0, a1, a3, aw, mid }; });
      T(!p4.err && Math.abs(p4.a1[2] - p4.a0[2] - 1) < 1e-6 && Math.abs(p4.a1[1] - p4.a0[1]) < 1e-6 && Math.abs(p4.a3[2] - p4.a0[2] - 1) < 1e-6 && Math.abs(p4.aw[1] - 6) < 1e-6
        && J(p4.mid) === J([[0, 1000000], [0, 1500000], [1920, 1000000]]),
        'P4 延长号：四分音符（1 秒）上的延长号让下一音后移 1 秒；三个声部同拍各一个只延一次；全音符（4 秒）只多 2 秒（封顶）；MIDI 区间两端 FF 51 降速 / 回速', J(p4));
      /* P5 长倚音 */
      const p5 = await EV(A.pg, () => { const s = __mk(1); s.measures[0].voxes[0][1].grace = { notes: [{ deg: 3, oct: 0 }], dur: 8, slash: false }; __ld(s);
        const ev = __play(0).filter(e => e.k === 'p' && e.w > 0.5 && e.w < 2).map(e => [e.m, e.w, e.d]);
        const mid = __mparse(__midi(song))[1].filter(e => e.ty === 'on').map(e => [e.k, e.tick]);
        const s2 = __mk(1); s2.measures[0].voxes[0][1].grace = { notes: [{ deg: 3, oct: 0 }], dur: 8 }; __ld(s2);
        const short = __play(0).filter(e => e.k === 'p' && e.w > 0.5 && e.w < 2).map(e => [e.m, e.w]);
        return { ev, mid, short }; });
      T(!p5.err && J(p5.ev) === J([[64, 1, 0.5], [62, 1.5, 0.5]]) && J(p5.mid.slice(1, 3)) === J([[64, 480], [62, 720]]) && J(p5.short) === J([[62, 1], [64, 1]]),
        'P5 长倚音（slash:false）：拍上奏出、占八分时值 0.5 秒，主音推后到 1.5 秒；MIDI 同（480 / 720 tick）；短倚音（无键）照旧', J(p5));
      allErrs.push(...A.errs); await A.close();
    }
  } finally {
    await b.close();
  }
  const errs = [...new Set(allErrs)];
  T(!errs.length, 'E 页面无脚本错误', errs.join(' | ').slice(0, 300));
  console.log(`\n${pass}/${total} 通过` + (fails.length ? '　失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
