'use strict';
/* v69.6「纠错二」伴奏织体与和声组（五线谱全面复核 N7 / F6，不新增 song 字段）。file:// 直载、真实浏览器；曲库谱读 api/seed-library.json，新建谱用 createSong。
   HL  织体左手音区（H1）：HL1 新外壳主按钮「配伴奏」（先断言在屏上再点）：《小星星》8 小节 4/4「抒情分解」第 2 小节 Am→G 第 3 拍弹 G 根音（G2 / G3，此前五音 D4）、左手全程不越过中央 C ·
       HL2 22 套织体 × 12 根音 × 大三 / 小三 / 属七：左手（非斜线）全 ≤ C4，低音型的三 / 五音槽 ≤ E3（落到根音下方）、密集型（含高八度根音 / 阿尔贝蒂）整组降八度形状不变 ·
       HL3 小节中途换和弦：每套织体换和弦后第一个左手音是新和弦根音（chgRoot 默认开；斜线和弦＝斜线低音）· HL4 斜线和弦低音照旧落在 F2–E3 且在最低处
   HR  织体右手（H2）：HR1 旋律在 C5 以上：每个右手音都低于同时响的旋律音 · HR2 旋律在 C4–A4：右手不再整组高过旋律（《小星星》m2 后半 / m4 顶音 ≤ B4，此前 G5）·
       HR3 声部进行：C（C4 E4 G4）→ G 取 D4 G4 B4（最近转位，不整组上跳）· HR4 两手间隔 ≥ 小三度、右手 ≥ C4（全部织体）· HR5 钢琴弹唱谱（没有要让的旋律）右手照旧原位 ·
       HR6 停留预览＝写入（accTexPlan 与织体条点卡写入逐字节相同）
   HS  建议和弦（H3）：HS1 曲库 10 首按伴奏音级（时值加权）对拍：主 / 属和弦判对比例 ≥ 90%（修前 62.6%），《摇篮曲》《土拨鼠》各 ≥ 90% · HS2《阿特拉斯》m4 Gm、m6 D/D7；《城市》m6/m7 Cm、m8 G/G7 ·
       HS3 纯旋律小调谱：旋律里有 ♯5 的小节不落 v / ♭VII（《阿特拉斯》去掉伴奏行后 m6 仍是 D/D7）· HS4 纯旋律谱（大调 / 无导音小调 / 3/4）建议与修前逐字相同 ·
       HS5 副属和弦：伴奏里没有那个导音时不升级（《圣母颂》m5 B♭，不是 C7）；去掉伴奏行照旧 C7
   HD  和弦列重打数字（H4，两套外壳）：HD1《圣母颂》m1 右手 D+F 上按 5：删掉同音的和音 F、提示（新外壳短文 + 撤销钮，旧外壳原文）、撤销还原 ·
       HD2《阿特拉斯》m6 ♯5 上按 3 得 3（不是 ♯3）· HD3 自建简谱 5 → ♯ → 回到这列按 3 得 3 · HD4 休止列先按 ♯ 再按 4 得 ♯4（前置升降号保留）· HD5 五线谱行覆盖一律清变化音 · HD6 不同音的和音保留、不提示
   RL  数据红线：生成的伴奏列只用既有字段；HD 各步不新增字段
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=HL,HR,HS,HD,RL 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'seed-library.json'), 'utf8'));
const LIBD = Object.fromEntries(LIB.map(x => [x.id, x.data]));
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);

const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; barSel = null; measureSel = null; measureRange = null; render(); return song.measures.length; };
  /* 钢琴伴奏歌谱（旋律五线 / 右手伴奏 / 左手伴奏，钢琴两行花括号）——同 tv_fillacc 的 __jg */
  window.__jg = o => { o = Object.assign({ title: '小星星', key: 'C', beats: 4, unit: 4, nMea: 8, nVox: 1, lyr: 0, clef: 'staff' }, o || {});
    const s = createSong('instr', o);
    s.voxVoices = ['旋律', '右手伴奏', '左手伴奏']; s.voxNotations = ['staff', 'staff', 'bass'];
    s.voxGroups = [{ type: 'brace', from: 1, to: 2 }];
    s.measures.forEach(m => { m.voxes = [m.voxes[0], blankVoxCols(s.beats, s.unit), blankVoxCols(s.beats, s.unit)]; });
    return s; };
  /* 《小星星》8 小节 4/4（复核 s18 / v11 的同一份：C | Am G | F C | G C | G7 | C G | G7 | C G），sh＝旋律整体移八度 */
  window.__tw = (sh, kind) => { const s = kind === 'pacc' ? createSong('pianoacc', { lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 8, title: '弹唱' }) : __jg({});
    const M = [[[1, 4, 'C'], [1, 4], [5, 4], [5, 4]], [[6, 4, 'Am'], [6, 4], [5, 2, 'G']], [[4, 4, 'F'], [4, 4], [3, 4, 'C'], [3, 4]], [[2, 4, 'G'], [2, 4], [1, 2, 'C']],
      [[5, 4, 'G7'], [5, 4], [4, 4], [4, 4]], [[3, 4, 'C'], [3, 4], [2, 2, 'G']], [[5, 4, 'G7'], [5, 4], [4, 4], [4, 4]], [[3, 4, 'C'], [3, 4], [2, 2, 'G']]];
    s.measures.forEach((m, mi) => { m.voxes[0] = M[mi].map(x => __V(x[0], x[1], Object.assign({ oct: sh || 0 }, x[2] ? { chord: x[2] } : {}))); });
    return s; };
  /* 一列的写谱音高（主音 + 和音），与伴奏生成同一把尺子 */
  window.__mid = (c, mi) => c && c.deg ? [keyRefAt(mi) + DEG_SEMI[c.deg] + accSemi(c.acc) + 12 * (c.oct || 0)].concat((c.adds || []).filter(a => a && a.deg).map(a => keyRefAt(mi) + DEG_SEMI[a.deg] + accSemi(a.acc) + 12 * (a.oct || 0))) : [];
  /* 一行的事件：[{a 起拍, b 止拍, m:[音高]}] */
  window.__evs = (m, vi, mi) => { let a = 0; const u = meaMeter(mi).unit; return (m.voxes[vi] || []).map(c => { const b = a + beatsOf(c, u), e = { a, b, m: __mid(c, mi) }; a = b; return e; }); };
  window.__nm = x => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((x % 12) + 12) % 12] + (Math.floor(x / 12) - 1);
  window.__says = []; window.__wrapSay = () => { if (typeof toastSay === 'function' && !window.__sayW) { window.__sayW = 1; const os = toastSay; toastSay = function (m, o) { try { __says.push({ m: String(m), t: (o && o.t) || '', k: (o && o.k) || '' }); } catch (_) {} return os.apply(this, arguments); }; } return 1; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} __wrapSay(); });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= HL 织体左手音区 ================= */
    if (want('HL')) {
      const A = await open(b, {});
      /* HL1 新外壳主按钮（真实点击）：先断言主按钮在屏上、是「配伴奏」 */
      await EV(A.pg, () => { addDoc(__tw(0)); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; });
      await A.pg.waitForTimeout(400);
      const go = await EV(A.pg, () => { const g = document.getElementById('flw-sb-go'); if (!g) return { vis: false };
        const r = g.getBoundingClientRect(); return { vis: !!g.offsetParent && r.width > 0 && r.height > 0, txt: g.innerText.replace(/\s+/g, ''), tit: g.title || '' }; });
      let clicked = false;
      if (go.vis) { await A.pg.click('#flw-sb-go'); clicked = true; await A.pg.waitForTimeout(1500); }
      const h1 = await EV(A.pg, () => { const out = { tex: song.texId, lh: [], hi: 0, m2: null, rhm2: 0, rhm4: 0 };
        song.measures.forEach((m, mi) => { const L = __evs(m, 2, mi); out.lh.push(L.map(e => e.m.map(__nm).join('+') || 'r').join(' '));
          L.forEach(e => e.m.forEach(x => { out.hi = Math.max(out.hi, x); })); });
        const L2 = __evs(song.measures[1], 2, 1), g3 = L2.find(e => Math.abs(e.a - 2) < 1e-6);
        out.m2 = g3 ? g3.m : null;
        const R = (mi, a) => Math.max(...__evs(song.measures[mi], 1, mi).filter(e => e.a >= a - 1e-6).map(e => Math.max(-1, ...e.m)));
        out.rhm2 = R(1, 2); out.rhm4 = R(3, 0);
        return out; });
      T(go.vis && clicked && h1.tex === 'slow' && h1.m2 && h1.m2.length === 1 && (h1.m2[0] === 43 || h1.m2[0] === 55) && h1.hi <= 60,
        'HL1 新外壳主按钮「配伴奏」（' + (go.txt || '') + '，在屏上再点）：《小星星》4/4「抒情分解」第 2 小节 Am→G 第 3 拍左手弹 G 根音（G2 / G3，此前 D4）；左手全程不越过中央 C',
        J({ go, m2: h1.m2 && h1.m2.map(x => x), hi: h1.hi, lh: h1.lh.slice(0, 4) }));
      /* HL2 / HL3 全部织体 × 根音 × 性质 */
      const h2 = await EV(A.pg, () => {
        const ROOT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], Q = ['', 'm', '7'];
        const bad = [], badC = [], badChg = []; let n = 0, nChg = 0;
        PIANO_TEX.forEach(t => { const u = texUnit(t), close = !!t.lhClose || t.L.some(e => e.t === '8');
          const chs = []; ROOT.forEach(r => Q.forEach(q => chs.push(r + q)));
          const s = __jg({ beats: t.beats, unit: u, nMea: chs.length + 1 });
          s.measures.forEach((m, mi) => { const bl = blankVoxCols(t.beats, u); bl[0].deg = 1; bl[0].chord = mi < chs.length ? chs[mi] : 'C';
            /* 最后一小节：半小节换和弦（C→G），测 chgRoot */
            if (mi === chs.length) { const h = Math.floor(bl.length / 2); if (bl[h]) bl[h].chord = 'G'; }
            m.voxes[0] = bl; });
          const o = song; song = s;
          try {
            genAccompaniment(t.id, 0, s.measures.length - 1, { chordVi: 0, rhVi: 1, lhVi: 2 });
            s.measures.forEach((m, mi) => { const L = __evs(m, 2, mi);
              if (mi < chs.length) { const ct = chordTones(chs[mi]);
                L.forEach(e => e.m.forEach(x => { n++; if (x > 60) bad.push(t.id + ':' + chs[mi] + ':' + __nm(x));
                  const rel = (((x - ct.pc) % 12) + 12) % 12;
                  /* 低音型：根音以外的音（三 / 五音槽）都 ≤ E3 */
                  if (!close && rel !== 0 && x > 52) badC.push(t.id + ':' + chs[mi] + ':' + __nm(x)); })); }
              else { const bl = m.voxes[0], h = Math.floor(bl.length / 2), hb = bl.slice(0, h).reduce((a, c) => a + beatsOf(c, u), 0);
                const f = L.find(e => e.m.length && e.a >= hb - 1e-6);
                if (f && hb > 1e-6) { nChg++; if (((f.m[0] % 12) + 12) % 12 !== 7) badChg.push(t.id + ':' + __nm(f.m[0])); } } });
          } finally { song = o; } });
        /* 密集型整组降八度、形状不变：流行八分琶音 G＝G2 D3 G3 D3、阿尔贝蒂 G＝G2 D3 B2 D3 */
        const shape = (tid, ch) => { const t = PIANO_TEX.find(x => x.id === tid), s = __jg({ beats: t.beats, unit: texUnit(t), nMea: 1 }); s.measures[0].voxes[0][0].chord = ch; s.measures[0].voxes[0][0].deg = 1;
          const o = song; song = s; try { genAccompaniment(tid, 0, 0, { chordVi: 0, rhVi: 1, lhVi: 2 }); return __evs(s.measures[0], 2, 0).slice(0, 4).map(e => e.m.map(__nm).join('+')).join(' '); } finally { song = o; } };
        return { n, nb: bad.length, bad: bad.slice(0, 6), nc: badC.length, badC: badC.slice(0, 6), nChg, badChg, arp8: shape('arp8', 'G'), alb: shape('alberti', 'G'), slowG: shape('slow', 'G'), kidsF: shape('kids', 'F') };
      });
      T(h2.n > 3000 && h2.nb === 0 && h2.nc === 0 && h2.arp8 === 'G2 D3 G3 D3' && h2.alb === 'G2 D3 B2 D3' && h2.slowG === 'G3 D3' && h2.kidsF === 'F3 C3 A2 C3',
        'HL2 22 套织体 × 12 根音 × 大三 / 小三 / 属七共 ' + h2.n + ' 个左手音：全部 ≤ C4；低音型三 / 五音槽 ≤ E3（抒情分解 G＝G3 D3，儿歌伴奏 F＝F3 C3 A2 C3）；密集型整组降八度形状不变（流行八分 G＝' + h2.arp8 + '，阿尔贝蒂 G＝' + h2.alb + '）',
        J({ bad: h2.bad, badC: h2.badC, arp8: h2.arp8, alb: h2.alb, slowG: h2.slowG, kidsF: h2.kidsF }));
      T(h2.nChg >= 18 && h2.badChg.length === 0,
        'HL3 小节中途 C→G：' + h2.nChg + ' 套织体换和弦后第一个左手音都是 G 根音（chgRoot 对所有织体默认开，此前只有 2/4 儿歌伴奏）', J(h2.badChg));
      /* HL4 斜线和弦：低音落在 F2–E3、在左手最低处（路径未动） */
      const h4 = await EV(A.pg, () => { const CH = ['C/E', 'G/B', 'Am/G', 'F/C', 'D/F#', 'Bb/D']; const bad = [];
        ['slow', 'kids', 'arp8', 'alberti', 'march'].forEach(tid => { const s = __jg({ nMea: CH.length });
          s.measures.forEach((m, mi) => { m.voxes[0][0].chord = CH[mi]; m.voxes[0][0].deg = 1; });
          const o = song; song = s; try { genAccompaniment(tid, 0, CH.length - 1, { chordVi: 0, rhVi: 1, lhVi: 2 });
            s.measures.forEach((m, mi) => { const L = __evs(m, 2, mi).filter(e => e.m.length), l0 = L[0].m[0], lo = Math.min(...L.map(e => e.m[0]));
              if (!(l0 >= 41 && l0 <= 52 && l0 === lo)) bad.push(tid + ':' + CH[mi] + ':' + L.map(e => __nm(e.m[0])).join(' ')); }); } finally { song = o; } });
        return bad; });
      T(Array.isArray(h4) && h4.length === 0, 'HL4 斜线和弦（5 套织体 × 6 个转位）：左手第一拍＝斜线低音、落在 F2–E3、是本小节左手最低音（斜线路径不动）', J(h4));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= HR 织体右手 ================= */
    if (want('HR')) {
      const A = await open(b, {});
      const fill = (sh, tex) => EV(A.pg, ([sh, tex]) => { const s = __tw(sh); const p = accFillPlan(s, tex, {}); if (!p) return null;
        const o = song; song = p.ns; try { return p.ns.measures.map((m, mi) => ({ mel: __evs(m, 0, mi), R: __evs(m, 1, mi), L: __evs(m, 2, mi) })); } finally { song = o; } }, [sh, tex]);
      /* HR1 旋律在 C5 以上：每个右手音低于同时响的旋律音 */
      /* 窗口 [C4（且比同时响的左手高 ≥ 小三度）, 本拍旋律音 − 1]：左手流动＋柱式的 C 和弦左手到 C4、右手下限 E♭4，C 的三个音放不进 B4 以下——按规格放宽到不高于本小节旋律最高音（与旋律同度、不高过） */
      const hr1 = {}, STRICT = ['slow', 'block', 'arp8', 'kids', 'march'];
      for (const tex of STRICT.concat(['flow8', 'alberti', 'basswalk'])) {
        const M = await fill(1, tex); const bad = [];
        (M || []).forEach((m, mi) => m.R.forEach(e => { const ov = m.mel.filter(x => x.a < e.b - 1e-6 && x.b > e.a + 1e-6 && x.m.length); if (!ov.length) return;
          const ce = Math.min(...ov.map(x => x.m[0])); e.m.forEach(x => { if (STRICT.includes(tex) ? x >= ce : x > ce) bad.push((mi + 1) + ':' + __nmN(x) + (STRICT.includes(tex) ? '≥' : '>') + __nmN(ce)); }); }));
        hr1[tex] = M ? bad.slice(0, 4) : ['null'];
      }
      T(Object.values(hr1).every(x => x.length === 0), 'HR1 旋律在 C5–A5（《小星星》高八度）：5 套织体每个右手音都低于同时响的旋律音；左手流动＋柱式 / 阿尔贝蒂 / 低音行走不高过旋律', J(hr1));
      /* HR2 旋律在 C4–A4：右手不再整组高过旋律 */
      const M2 = await fill(0, 'slow');
      const top = (mi, a) => Math.max(...M2[mi].R.filter(e => e.a >= a - 1e-6).map(e => Math.max(-1, ...e.m)));
      const mx = M2 ? M2.map((m, mi) => Math.max(...m.R.map(e => Math.max(-1, ...e.m)))) : [];
      const melMax = M2 ? M2.map(m => Math.max(...m.mel.map(e => Math.max(-1, ...e.m)))) : [];
      T(M2 && top(1, 2) <= 71 && top(3, 0) <= 71 && mx.every((x, i) => x <= Math.max(melMax[i], 71)),
        'HR2 旋律在 C4–A4（《小星星》原调）：右手顶音不高于本小节旋律最高音（放不下时取超出最少的转位）——m2 后半 G 顶音 ' + __nmN(top(1, 2)) + '、m4 ' + __nmN(top(3, 0)) + '（此前都是 G5）',
        J({ top: mx.map(__nmN), mel: melMax.map(__nmN) }));
      /* HR3 声部进行：旋律高（C5 以上）时柱式 C → G 取最近转位 D4 G4 B4 */
      const M3 = await fill(1, 'block');
      const set = (mi, a) => M3 ? [...new Set(M3[mi].R.filter(e => Math.abs(e.a - a) < 1e-6).flatMap(e => e.m))].sort((x, y) => x - y) : [];
      T(J(set(0, 0)) === '[60,64,67]' && J(set(1, 2)) === '[62,67,71]' && J(set(4, 0)) === '[62,67,71]',
        'HR3 声部进行（柱式，旋律在上方）：C＝C4 E4 G4，换到 G 取最近的转位 D4 G4 B4（此前原位 G4 B4 D5，整组上跳）', J({ c: set(0, 0).map(__nmN), g: set(1, 2).map(__nmN), g7: set(4, 0).map(__nmN) }));
      /* HR4 全部织体：两手间隔 ≥ 小三度、右手 ≥ C4（有旋律时） */
      const hr4 = await EV(A.pg, () => { const bad = []; let n = 0;
        PIANO_TEX.forEach(t => { const u = texUnit(t), CH = ['C', 'Am', 'F', 'G7', 'Dm', 'E', 'Bb', 'D'];
          const s = __jg({ beats: t.beats, unit: u, nMea: CH.length });
          s.measures.forEach((m, mi) => { const bl = blankVoxCols(t.beats, u); bl.forEach((c, i) => { c.deg = [5, 3, 1, 6][i % 4]; }); bl[0].chord = CH[mi]; m.voxes[0] = bl; });
          const o = song; song = s; try { genAccompaniment(t.id, 0, CH.length - 1, { chordVi: 0, rhVi: 1, lhVi: 2 });
            s.measures.forEach((m, mi) => { const R = __evs(m, 1, mi), L = __evs(m, 2, mi);
              R.forEach(e => { if (!e.m.length) return; n++; const lo = Math.min(...e.m), lh = L.filter(x => x.a < e.b - 1e-6 && x.b > e.a + 1e-6).flatMap(x => x.m);
                if (lo < 60 || (lh.length && lo - Math.max(...lh) < 3)) bad.push(t.id + ':' + CH[mi] + ':' + __nm(lo) + '/' + (lh.length ? __nm(Math.max(...lh)) : '-')); }); }); } finally { song = o; } });
        return { n, bad: bad.slice(0, 8), nb: bad.length }; });
      T(hr4.n > 300 && hr4.nb === 0, 'HR4 22 套织体 × 8 个和弦（有旋律）共 ' + hr4.n + ' 个右手事件：右手最低音 ≥ C4，且比同时响的左手最高音高 ≥ 小三度（不整组降八度去撞左手）', J(hr4));
      /* HR5 钢琴弹唱谱（和弦行＝右手行，右手被伴奏整行替换，没有要让的旋律）：右手照旧原位 */
      const hr5 = await EV(A.pg, () => { const s = __tw(0, 'pacc'); __ld(s); let r; mutate(() => { r = genAccompaniment('block', 0, 7); });
        const f = mi => [...new Set(__evs(song.measures[mi], 0, mi).flatMap(e => e.m))].sort((a, b) => a - b);
        return { done: r.done, c: f(0), g7: f(4) }; });
      T(hr5.done === 8 && J(hr5.c) === '[60,64,67]' && J(hr5.g7) === '[67,71,74]', 'HR5 钢琴弹唱谱（没有旋律行）：右手照旧原位（C＝C4 E4 G4，G7＝G4 B4 D5）', J(hr5));
      /* HR6 停留预览＝写入：accTexPlan（停留预览 / 缩略图同一份）与织体条点卡写入后谱面逐字节相同 */
      const hr6 = await EV(A.pg, () => { const s = __tw(0); s.measures.forEach(m => { m.voxes[1] = blankVoxCols(4, 4); m.voxes[2] = blankVoxCols(4, 4); }); __ld(s);
        const rows = accTexRowsOf(song), o = { sc: 'all', mi: 0, accSt: rows.accSt, accRows: rows.accRows };
        const p = accTexPlan(song, 'slow', o); const pv = JSON.stringify(p.ns.measures.map(m => m.voxes));
        mutate(() => { accTexBody('slow', o); }); const w = JSON.stringify(song.measures.map(m => m.voxes));
        return { same: pv === w, done: p.r && p.r.done }; });
      T(hr6.same && hr6.done === 8, 'HR6 停留预览（accTexPlan）与写入（accTexBody）逐字节相同——预览纯函数与写入同一份 genAccompaniment', J(hr6));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= HS 建议和弦 ================= */
    if (want('HS')) {
      const A = await open(b, { shell: 'classic' });
      /* 对拍口径：伴奏行（钢琴花括号）每小节音级按时值加权，与 12 根音 × 大三 / 小三 / 属七 / 减三模板比（覆盖占比 − 七和弦 0.08 + 根音占比 × 0.1）＝复核取证同一把尺子；
         建议＝suggestChordPlan 首个和弦位；性质按大 / 小 / 减三族比（V7 与 V 同族） */
      const cmp = async (id, strip) => EV(A.pg, ([d, strip]) => { const s = JSON.parse(JSON.stringify(d));
        const br = (s.voxGroups || []).filter(g => g.type === 'brace' && g.to === g.from + 1), rows = br.length ? [br[br.length - 1].from, br[br.length - 1].to] : [1, 2];
        __ld(s);
        const PCN = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };
        const gt = song.measures.map((m, mi) => { const w = new Array(12).fill(0), k = KEY_PC[keyAt(mi)] || 0;
          rows.forEach(vi => (m.voxes[vi] || []).forEach(c => { if (c.grace) return; const bt = beatsOf(c, meaMeter(mi).unit); [c].concat(c.adds || []).forEach(n => { if (n && n.deg) w[(k + DEG_SEMI[n.deg] + accSemi(n.acc) + 120) % 12] += bt; }); }));
          const tot = w.reduce((a, x) => a + x, 0); if (!tot) return null; let best = null;
          for (let r = 0; r < 12; r++) for (const [q, iv] of [['', [0, 4, 7]], ['m', [0, 3, 7]], ['7', [0, 4, 7, 10]], ['dim', [0, 3, 6]]]) {
            const sc = iv.reduce((a, x) => a + w[(r + x) % 12], 0) / tot - (iv.length === 4 ? 0.08 : 0) + 0.1 * w[r] / tot; if (!best || sc > best.sc) best = { sc, r, q }; }
          return best; });
        if (strip) { song.voxVoices = [song.voxVoices[0]]; song.voxNotations = [song.voxNotations[0]]; delete song.voxGroups; song.measures.forEach(m => { m.voxes = [m.voxes[0]]; }); }
        const minor = detectMinorMode(song, 0), ton = ((KEY_PC[song.key] || 0) + (minor ? 9 : 0)) % 12, dom = (ton + 7) % 12;
        const plan = suggestChordPlan(song, 0);
        const fam = q => /^m(?!aj)/.test(q) ? 'm' : /dim|m7b5/.test(q) ? 'd' : 'M';
        const parse = ch => { const mm = /^([A-G](?:#|b)?)([^/]*)/.exec(ch || ''); return mm ? { r: PCN[mm[1]], q: mm[2] } : null; };
        let td = 0, tdHit = 0, all = 0, allHit = 0; const bad = [];
        song.measures.forEach((m, mi) => { const g = gt[mi], p = plan[mi] && plan[mi][0] && parse(plan[mi][0].chord); if (!g || !p) return;
          all++; const ok = g.r === p.r && fam(g.q) === fam(p.q); if (ok) allHit++;
          if ((g.r === ton && fam(g.q) === (minor ? 'm' : 'M')) || (g.r === dom && fam(g.q) === 'M')) { td++; if (ok) tdHit++; else bad.push(mi + 1); } });
        return { minor, td, tdHit, all, allHit, bad: bad.slice(0, 8), ch: plan.map(x => (x[0] || {}).chord || '') }; }, [LIBD[id], !!strip]);
      const R = {}; let td = 0, tdHit = 0, all = 0, allHit = 0;
      for (const it of LIB) { const r = await cmp(it.id); R[it.id] = r; if (r && !r.err) { td += r.td; tdHit += r.tdHit; all += r.all; allHit += r.allHit; } }
      const pc = (a, b2) => b2 ? (100 * a / b2).toFixed(1) : '0';
      console.log('   对拍明细：' + LIB.map(it => it.title.split('（')[0] + ' ' + (R[it.id] ? R[it.id].tdHit + '/' + R[it.id].td : '?')).join(' · ') + '；全部和弦根音＋性质 ' + allHit + '/' + all + '（' + pc(allHit, all) + '%）');
      const yl = R['lib-os-lc5701612'] || {}, md = R['lib-os-lc6491461'] || {};
      T(td > 150 && tdHit / td >= 0.9 && yl.tdHit / yl.td >= 0.9 && md.tdHit / md.td >= 0.9 && allHit / all >= 0.55,
        'HS1 曲库 10 首按原作伴奏音级对拍：主 / 属和弦判对 ' + tdHit + '/' + td + '（' + pc(tdHit, td) + '%，修前 102/163＝62.6%）；《摇篮曲》' + yl.tdHit + '/' + yl.td + '（修前 8/15）、《土拨鼠》' + md.tdHit + '/' + md.td + '（修前 7/10）；全部和弦 ' + pc(allHit, all) + '%（修前 35.7%）',
        J({ td, tdHit, all, allHit }));
      const at = R['lib-os-lc4985985'] || {}, ci = R['lib-os-lc4985973'] || {};
      T(at.ch && at.ch[3] === 'Gm' && /^D7?$/.test(at.ch[5]) && ci.ch && ci.ch[5] === 'Cm' && ci.ch[6] === 'Cm' && /^G7?$/.test(ci.ch[7]),
        'HS2 有伴奏行先按伴奏识别：《阿特拉斯》m4 Gm（此前 E♭）、m6 ' + (at.ch || [])[5] + '（此前 Dm）；《城市》m6 / m7 Cm（此前 Fm / Gm）、m8 ' + (ci.ch || [])[7] + '（此前 Cm）',
        J({ at: (at.ch || []).slice(0, 8), ci: (ci.ch || []).slice(0, 9) }));
      /* HS3 纯旋律小调谱的导音护栏 */
      const at0 = await cmp('lib-os-lc4985985', true);
      T(at0 && at0.minor && /^D7?$/.test(at0.ch[5]),
        'HS3 纯旋律小调谱（《阿特拉斯》去掉伴奏行，m6 旋律 F♯ F♯ D）：有小调导音的小节不落 v / ♭VII——m6 ' + (at0 && at0.ch[5]) + '（此前套路「VI-i-v」强写成 Dm）', J(at0 && at0.ch.slice(0, 8)));
      /* HS4 纯旋律谱（大调 / 无导音小调 / 3/4）建议与修前（a077b50）逐字相同 */
      const hs4 = await EV(A.pg, () => {
        const mk = (key, beats, M) => { const s = createSong('instr', { title: 't', key, beats, unit: 4, nMea: M.length, nVox: 1, clef: 'staff', lyr: 0 });
          s.measures.forEach((m, mi) => { m.voxes[0] = M[mi].map(x => __V(x[0], x[1], x[2] || {})); }); return s; };
        const TW = [[[1, 4], [1, 4], [5, 4], [5, 4]], [[6, 4], [6, 4], [5, 2]], [[4, 4], [4, 4], [3, 4], [3, 4]], [[2, 4], [2, 4], [1, 2]], [[5, 4], [5, 4], [4, 4], [4, 4]], [[3, 4], [3, 4], [2, 2]], [[5, 4], [5, 4], [4, 4], [4, 4]], [[3, 4], [3, 4], [2, 2]],
          [[1, 4], [1, 4], [5, 4], [5, 4]], [[6, 4], [6, 4], [5, 2]], [[4, 4], [4, 4], [3, 4], [3, 4]], [[2, 4], [2, 4], [1, 2]]];
        const AM = [[[6, 4], [6, 4], [1, 4, { oct: 1 }], [1, 4, { oct: 1 }]], [[7, 4], [7, 4], [6, 2]], [[3, 4], [3, 4], [6, 4], [6, 4]], [[5, 4], [5, 4], [3, 2]], [[6, 4], [1, 4, { oct: 1 }], [7, 4], [6, 4]], [[4, 4], [4, 4], [3, 2]], [[2, 4], [3, 4], [1, 4], [7, 4, { oct: -1 }]], [[6, 1]]];
        const F34 = [[[1, 4], [3, 4], [5, 4]], [[4, 4], [6, 4], [1, 4, { oct: 1 }]], [[5, 4], [7, 4], [2, 4, { oct: 1 }]], [[1, 2, { dotted: true }]]];
        const f = s => { __ld(s); return suggestChordPlan(song, 0).map(p => p.map(x => x.beat + ':' + x.chord).join(',')).join(' '); };
        return { tw: f(mk('C', 4, TW)), am: f(mk('C', 4, AM)), f34: f(mk('F', 3, F34)) }; });
      T(hs4.tw === '0:C 0:Am,2:G 0:F,2:C 0:G,2:C 0:G7 0:C,2:G 0:G7 0:C,2:G 0:C 0:Am,2:G 0:F,2:C 0:C' && hs4.am === '0:Am 0:G,2:Am 0:Am 0:Em 0:Am 0:Dm,2:Am 0:E7,2:Am 0:Am' && hs4.f34 === '0:F 0:Bb 0:C 0:F',
        'HS4 纯旋律谱（大调《小星星》12 小节 / 无导音的 a 小调 / 3/4 F 调）建议与修前逐字相同（伴奏证据与导音护栏只在有伴奏行 / 有 ♯5 时起作用）', J(hs4));
      /* HS5 副属和弦要伴奏里也有那个导音 */
      const av = R['lib-os-lc6389103'] || {}, av0 = await cmp('lib-os-lc6389103', true);
      T(av.ch && av.ch[4] === 'Bb' && av0 && av0.ch[4] === 'C7',
        'HS5 《圣母颂》m5（旋律末尾经过性 ♯4、伴奏全是 B♭ 和弦）：有伴奏行时不再升级成副属 C7、保持 B♭；去掉伴奏行（纯旋律）照旧 C7', J({ acc: av.ch && av.ch[4], mel: av0 && av0.ch[4] }));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= HD 和弦列重打数字（两套外壳） ================= */
    if (want('HD')) {
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : '' });
        const tag = shell === 'classic' ? '（旧外壳）' : '（新外壳）';
        const keyAt = async (vi, mi, ci, k) => { await EV(A.pg, ([vi, mi, ci]) => { sel = { mi, row: 'vox', vi, ci, si: 1 }; lastEnt = null; selRange = null; noteSel = []; render(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 1; }, [vi, mi, ci]);
          await A.pg.keyboard.press(k); await A.pg.waitForTimeout(150); };
        const col = (vi, mi, ci) => EV(A.pg, ([vi, mi, ci]) => { const c = song.measures[mi].voxes[vi][ci]; return { deg: c.deg, acc: c.acc || '', oct: c.oct || 0, adds: (c.adds || []).map(a => (a.acc || '') + a.deg + ':' + (a.oct || 0)), keys: Object.keys(c).sort().join(','), mid: __mid(c, mi) }; }, [vi, mi, ci]);
        /* HD1《圣母颂》m1 右手第 2 列 D+F（主音 3、和音 5）上按 5 */
        await EV(A.pg, d => { __ld(d); __says.length = 0; return 1; }, LIBD['lib-os-lc6389103']);
        const c0 = await col(1, 0, 1);
        await keyAt(1, 0, 1, '5');
        const c1 = await col(1, 0, 1);
        const ts = await EV(A.pg, () => { const e = document.getElementById('toast'), bt = e && e.querySelector('.flw-ta'); const c = e ? e.cloneNode(true) : null; if (c) c.querySelectorAll('.flw-ta').forEach(x => x.remove());
          return { says: __says.slice(), txt: c ? c.textContent : '', k: e ? e.dataset.k || '' : '', ta: bt ? bt.dataset.ta : '' }; });
        await EV(A.pg, () => { undo(); return 1; });
        const c2 = await col(1, 0, 1);
        const say = ts.says[ts.says.length - 1] || { t: '' };
        const toastOk = shell === 'classic' ? /同音高.*已删去重复的和音/.test(ts.txt) : (ts.txt === '已删重复和音' && ts.k === 'res' && ts.ta === 'undo' && [...say.t].length <= 12);
        T(J(c0.mid) === '[62,65]' && c1.deg === 5 && c1.adds.length === 0 && J(c1.mid) === '[65]' && toastOk && J(c2.mid) === '[62,65]',
          'HD1 ' + tag + '《圣母颂》m1 右手 D+F 上按 5：主音变 F、删掉同音的和音 F（不留同度）、提示' + (shell === 'classic' ? '原文' : '「已删重复和音」+ 撤销钮') + '；撤销还原 D+F', J({ c0: c0.mid, c1: c1.mid, ts: { txt: ts.txt, k: ts.k, ta: ts.ta }, c2: c2.mid }));
        /* HD2《阿特拉斯》人声 m6 第 1 列 ♯5（F♯）上按 3 */
        await EV(A.pg, d => { __ld(d); return 1; }, LIBD['lib-os-lc4985985']);
        const a0 = await col(0, 5, 0); await keyAt(0, 5, 0, '3'); const a1 = await col(0, 5, 0);
        T(a0.deg === 5 && a0.acc === '#' && a1.deg === 3 && a1.acc === '' && a1.mid[0] === a0.mid[0] - 4,
          'HD2 ' + tag + '《阿特拉斯》m6 ♯5（F♯）上按 3 得 3（D，调内音），不是 ♯3（D♯）', J({ a0: [a0.acc + a0.deg, a0.mid], a1: [a1.acc + a1.deg, a1.mid] }));
        /* HD3 / HD4 自建简谱：5 → ♯ → 回到这列按 3；休止列先 ♯ 再 4 */
        await EV(A.pg, () => { const s = createSong('vocal', { title: '简谱', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 }); __ld(s); return 1; });
        await keyAt(0, 0, 0, '5');
        await EV(A.pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; toggleAcc('#'); return 1; });
        const j0 = await col(0, 0, 0); await keyAt(0, 0, 0, '3'); const j1 = await col(0, 0, 0);
        await EV(A.pg, () => { sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; toggleAcc('#'); return 1; });
        const r0 = await col(0, 1, 0); await keyAt(0, 1, 0, '4'); const r1 = await col(0, 1, 0);
        T(j0.deg === 5 && j0.acc === '#' && j1.deg === 3 && j1.acc === '', 'HD3 ' + tag + '自建简谱：5 → ♯（♯5）→ 回到这列按 3 得 3（此前 ♯3）', J({ j0: j0.acc + j0.deg, j1: j1.acc + j1.deg }));
        T(r0.deg === 0 && r0.acc === '#' && r1.deg === 4 && r1.acc === '#', 'HD4 ' + tag + '简谱前置升降号：休止列先按 ♯ 再按 4 得 ♯4（空列上的升降号保留）', J({ r0: r0.acc + r0.deg, r1: r1.acc + r1.deg }));
        /* HD5 五线谱行：♯ 加在已有音上，覆盖时一律清（含残留在休止列上的变化音） */
        await EV(A.pg, () => { const s = createSong('instr', { title: '五线', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, clef: 'staff', lyr: 0 });
          s.measures[0].voxes[0] = [__V(5, 4, { acc: '#' }), __V(0, 4, { acc: 'b' }), __V(1, 4), __V(1, 4)]; __ld(s); return 1; });
        await keyAt(0, 0, 0, '6'); await keyAt(0, 0, 1, '2');
        const s0 = await col(0, 0, 0), s1 = await col(0, 0, 1);
        T(s0.deg === 6 && s0.acc === '' && s1.deg === 2 && s1.acc === '', 'HD5 ' + tag + '五线谱行：♯5 上按 6 得 6；休止列残留的 ♭ 也不带进新音（五线谱没有前置升降号录入）', J({ s0: s0.acc + s0.deg, s1: s1.acc + s1.deg }));
        /* HD6 和音与新主音不同音：保留、不提示 */
        await EV(A.pg, () => { const s = createSong('instr', { title: '五线', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, clef: 'staff', lyr: 0 });
          s.measures[0].voxes[0] = [__V(3, 4, { adds: [{ deg: 5, acc: '', oct: 0 }] }), __V(1, 4), __V(1, 4), __V(1, 4)]; __ld(s); __says.length = 0; return 1; });
        await keyAt(0, 0, 0, '1'); const d1 = await col(0, 0, 0); const n6 = await EV(A.pg, () => __says.filter(x => /和音/.test(x.m)).length);
        T(d1.deg === 1 && J(d1.mid) === '[60,67]' && n6 === 0, 'HD6 ' + tag + '和弦列 E+G 上按 1：C+G，不同音的和音保留、不提示', J({ d1: d1.mid, n6 }));
        if (shell === 'flow') {
          /* RL：HD 各步不新增字段（列上的键都是既有字段） */
          const OK = new Set(['dur', 'dotted', 'deg', 'acc', 'oct', 'lyrics', 'tie', 'adds', 'chord', 'dyn']);
          const ks = [c1, a1, j1, r1, s0, s1, d1].flatMap(c => c.keys.split(','));
          T(ks.every(k => OK.has(k) || /^(tup|tupM|grace|orn|art|ferm|slur|beam|stem|lyr|staffLine|chords|fing|tech|ottTo|dynTo|irr|keyTo)/.test(k)), 'RL1 重打数字后列上只有既有字段', J([...new Set(ks)]));
        }
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= RL 数据红线：生成的伴奏列只用既有字段 ================= */
    if (want('RL')) {
      const A = await open(b, {});
      const rl = await EV(A.pg, () => { const OK = ['dur', 'dotted', 'deg', 'acc', 'oct', 'lyrics', 'tie', 'adds', 'chord', 'dyn']; const extra = new Set(); let n = 0;
        PIANO_TEX.forEach(t => { const u = texUnit(t), s = __jg({ beats: t.beats, unit: u, nMea: 3 }); ['C', 'G/B', 'Am7'].forEach((ch, mi) => { const bl = blankVoxCols(t.beats, u); bl.forEach(c => { c.deg = 5; c.oct = 1; }); bl[0].chord = ch; s.measures[mi].voxes[0] = bl; });
          const o = song; song = s; try { genAccompaniment(t.id, 0, 2, { chordVi: 0, rhVi: 1, lhVi: 2 }); s.measures.forEach(m => [1, 2].forEach(vi => m.voxes[vi].forEach(c => { n++; Object.keys(c).forEach(k => { if (OK.indexOf(k) < 0) extra.add(k); });
            (c.adds || []).forEach(a => Object.keys(a).forEach(k => { if (['deg', 'acc', 'oct'].indexOf(k) < 0) extra.add('adds.' + k); })); }))); } finally { song = o; } });
        return { n, extra: [...extra] }; });
      T(rl.n > 200 && rl.extra.length === 0, 'RL2 22 套织体生成的 ' + rl.n + ' 个伴奏列只用既有字段（dur / dotted / deg / acc / oct / lyrics / tie / adds / chord / dyn），不新增 song 字段', J(rl));
      allErrs.push(...A.errs); await A.close();
    }
  } catch (e) { T(false, 'EXC 运行异常', String(e && e.stack || e).slice(0, 400)); }
  T(allErrs.length === 0, 'ERR 无页面报错', J(allErrs.slice(0, 4)));
  await b.close();
  console.log((fails.length ? '❌ ' : '✅ ') + 'PASS ' + pass + '/' + total + (fails.length ? '  失败：' + fails.join(' ') : '') + (allErrs.length ? '' : '  NO ERRORS'));
  process.exit(fails.length ? 1 : 0);
})();
function __nmN(x) { return x == null || !isFinite(x) ? String(x) : ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((x % 12) + 12) % 12] + (Math.floor(x / 12) - 1); }
