'use strict';
/* v69.4 纠错一 · 播放、编辑与渲染小改（五线谱全面复核 F2 / F3 / T4 / F6 / F8 / F10 / E2 / T11，不新增 song 字段）。
   file:// 直载、真实浏览器；曲库谱读 api/seed-library.json（10 首 OpenScore 公版谱），新建谱用 createSong / PRESETS。
   RF  插删小节后的跨小节引用（C1）：RF1 曲库 10 首 × 删第 2 小节 / 第 2 小节后插入 / 点小节线插入粘贴——每个引用（dynTo · ottTo · TAB tk）终点−起点不变、
       终点列存在；导出 MusicXML 的 wedge / octave-shift 开始与结束个数相等；撤销逐字节还原 · RF2 新建谱（两外壳按钮 #b-insmea / #b-delmea）：跨小节发夹 / 8va
       跨度不变，终点落在被删小节的引用去掉、dyn 留单音记号 · RF3 TAB 预设（指弹技法示例 / 行板）tk 平移，被删目标的 tk 去掉、技法字母保留、渲染无异常
   PB  播放（C2）：PB1 同一花括号组共用力度线（圣母颂 / 骊歌左手跟右手）· PB2 sf 只作用于本音、fp 本音按 f 之后 p（合成谱逐音 + 土拨鼠 sf 之后不再整段偏响）·
       PB3 六线谱播放音高 = exportMIDI（E2…E5）、自然 / 人工泛音、输入回响 · PB4 移调乐器的和音 / 倚音 / 装饰音邻音补上 transp
   ED  编辑（C3）：ED1 中途改本小节拍号变短不删音（两外壳）· ED2 弱起 / irr 各行不齐报「与其他声部不齐」、补休止只补到对齐、measureSeconds 取最长行 ·
       ED3 删第 0 小节后新首小节满拍清 pickup · ED4 有原作伴奏的谱上点织体卡先出确认条「覆盖原伴奏 N 小节」（新外壳，不弹窗），写过一次后不再问；空伴奏谱直接写
   JR  简谱二分 / 全休止按拍补写 0（C4）：JR1 简谱声部 · JR2 教学对照简谱行 · JR3 附点四分「0·」不变 · JR4 补写的 0 间距 ≥ 数字墨迹宽
   WR  弱起与不完整小节不画整小节全休止（C5）：WR1 曲库 5 首弱起 / irr 空行改画实际时值休止 · WR2 满拍空行仍是居中全休止（个数 = 满拍空行数）
   MN  小节号（C6）：MN1 骊歌末小节 20、去会情人 60，X1 / X2 不编号，弱起互补末小节不受影响 · MN2 导出 number / implicit · MN3 弱起谱时值提示按印出来的号
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=RF,PB,ED,JR,WR,MN 只跑部分段。 */
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
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; barSel = null; measureSel = null; measureRange = null; render(); return song.measures.length; };
  /* 全部跨小节引用：[行, 声部, 起点小节, 起点列, 弦, 字段, 终点小节, 终点列, 终点弦] */
  window.__refs = () => { const out = []; song.measures.forEach((m, mi) => {
    (m.tabs || []).forEach((cols, vi) => (cols || []).forEach((c, ci) => (c.notes || []).forEach(n => { if (n && n.tk) out.push(['tab', vi, mi, ci, n.s, 'tk', n.tk.mi, n.tk.ci, n.tk.si]); })));
    (m.voxes || []).forEach((cols, vi) => (cols || []).forEach((c, ci) => ['dynTo', 'ottTo'].forEach(k => { if (c[k]) out.push(['vox', vi, mi, ci, 0, k, c[k].mi, c[k].ci, c[k].si]); }))); }); return out; };
  window.__refOk = () => __refs().every(r => { const m = song.measures[r[6]]; const cols = m && (r[0] === 'tab' ? m.tabs : m.voxes)[r[1]]; return !!(cols && r[7] >= 0 && r[7] < cols.length); });
  window.__wedge = x => ({ ws: (x.match(/<wedge type="(crescendo|diminuendo)"/g) || []).length, we: (x.match(/<wedge type="stop"/g) || []).length,
    os: (x.match(/<octave-shift type="(down|up)"/g) || []).length, oe: (x.match(/<octave-shift type="stop"/g) || []).length });
  /* 播放调度记录：截获 playInst（含 audio.schedQ 余下的）→ {trk:'vox:1', m:MIDI, w:起奏, vel} */
  window.__play = (from) => { const rec = []; const orig = window.playInst;
    window.playInst = (k, c, b2, f, w, ring, g, mute, opt) => { rec.push([b2, f, w, ring, g, opt || null]); };
    let tr = {}, t0 = 0;
    try { sel.mi = from || 0; play(); tr = Object.assign({}, audio.tracks); t0 = audio.prog ? audio.prog.t : 0; window.__starts = audio.prog ? audio.prog.starts.slice() : []; window.__order = audio.prog ? audio.prog.order.slice() : [];
      const S = audio.schedQ; if (S) S.q.slice(S.i).forEach(ev => { if (ev.k === 'playInst') { const a = ev.a; rec.push([a[2], a[3], a[4], a[5], a[6], a[8] || null]); } }); }
    finally { stopPlay(); window.playInst = orig; }
    const name = b => { for (const k in tr) if (tr[k] === b) return k; return '?'; };
    return rec.map(r => ({ trk: name(r[0]), m: +(69 + 12 * Math.log2(r[1] / 440)).toFixed(2), w: +(r[2] - t0).toFixed(4), vel: r[5] && r[5].vel != null ? +r[5].vel.toFixed(4) : null, g: +(+r[4]).toFixed(4) })).sort((a, b) => a.w - b.w || a.m - b.m); };
  /* 第 mi 小节在本次播放里第一次出现的起点（相对播放原点，同 audio.prog.starts） */
  window.__mStart = (mi) => { const k = (window.__order || []).indexOf(mi); return k >= 0 ? window.__starts[k] : Infinity; };
  /* 第 mi 小节第 ci 列（vox vi 行）的起奏时刻 */
  window.__colT = (vi, mi, ci) => { const spb = unitSeconds(song, playRate); const u = meaMeter(mi).unit; let t = __mStart(mi); (song.measures[mi].voxes[vi] || []).slice(0, ci).forEach(c => { t += beatsOf(c, u) * spb; }); return t; };
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

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= RF 插删小节后的跨小节引用 ================= */
    if (want('RF')) {
      const A = await open(b, { shell: 'classic' });
      /* 一次操作的对拍：op＝del / ins / paste；P＝操作位置（删：被删小节；插：新小节下标）。返回 {bad 跨度不对的引用数, n 引用总数, …} */
      const R = await EV(A.pg, lib => {
        const out = [];
        const map = (r, f) => [r[0], r[1], f(r[2]), r[3], r[4], r[5], f(r[6]), r[7], r[8]].join('|');
        const ids = Object.keys(lib);
        for (const id of ids) {
          for (const op of ['del', 'ins', 'paste']) {
            __ld(lib[id]);
            const j0 = JSON.stringify(song), N0 = song.measures.length, before = __refs();
            let exp, P;
            if (op === 'del') { P = 1; sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-delmea').click();
              exp = before.filter(r => r[2] !== P && r[6] !== P).map(r => map(r, x => x > P ? x - 1 : x)); }
            else if (op === 'ins') { P = 2; sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-insmea').click();
              exp = before.map(r => map(r, x => x >= P ? x + 1 : x)); }
            else { P = 2; measureSel = 1; copyMeasure(); measureSel = null; barSel = { L: 1, R: 2 }; pasteMeasure();
              exp = before.map(r => map(r, x => x >= P ? x + 1 : x)); }
            const N1 = song.measures.length;
            let got = __refs(); if (op === 'paste') got = got.filter(r => r[2] !== P);
            const gs = got.map(r => r.join('|')).sort(), es = exp.slice().sort();
            const bad = es.filter((x, i) => x !== gs[i]).length + Math.abs(es.length - gs.length);
            const x = exportMusicXML(song), w = __wedge(x);
            undo(); const back = JSON.stringify(song) === j0;
            out.push({ id, op, n: before.length, bad, dN: N1 - N0, ok: __refOk(), w, back, dropped: before.length - (op === 'del' ? exp.length : before.length) });
          }
        }
        return out;
      }, LIBD);
      if (R.err) T(false, 'RF1 曲库 10 首插删小节', R.err);
      else {
        const withRef = R.filter(o => o.n > 0);
        const bad = R.filter(o => o.bad || !o.back || o.w.ws !== o.w.we || o.w.os !== o.w.oe || o.dN !== (o.op === 'del' ? -1 : 1));
        T(!bad.length && withRef.length >= 24, 'RF1 曲库 10 首 × 删第 2 小节 / 第 2 小节后插入 / 点小节线插入粘贴：每个引用（dynTo · ottTo · tk）仍指着原来的音（起点 / 终点各按插删位置平移，不跨插删点的终点−起点不变；' + withRef.length + ' 次操作带引用、共 ' + R.reduce((a, o) => a + o.n, 0) + ' 个引用）、'
          + '导出 wedge / octave-shift 开始 = 结束、撤销逐字节还原', bad.length ? J(bad.slice(0, 4)) : R.filter(o => o.op === 'del' && o.n).map(o => o.id.slice(-4) + ':' + o.n + '−' + o.dropped).join(' '));
      }
      /* RF2 新建谱：两外壳都用按钮 */
      for (const sh of ['classic', 'flow']) {
        const P = sh === 'classic' ? A : await open(b);
        const r = await EV(P.pg, () => {
          const s = createSong('vox', { title: '引用', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 0 });
          s.voxNotations = ['staff'];
          s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 4].map(d => Object.assign(vcol(), { dur: 4, deg: d })); });
          const M = s.measures;
          M[1].voxes[0][2].dyn = '<'; M[1].voxes[0][2].dynTo = { mi: 3, ci: 1 };   // 跨 2 小节
          M[2].voxes[0][0].dyn = '>'; M[2].voxes[0][0].dynTo = { mi: 2, ci: 3 };   // 小节内
          M[4].voxes[0][1].ott = 1; M[4].voxes[0][1].ottTo = { mi: 5, ci: 2 };
          M[0].voxes[0][3].dyn = '<'; M[0].voxes[0][3].dynTo = { mi: 1, ci: 0 };   // 终点在第 2 小节（删它时去掉）
          __ld(s); const R = {};
          sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-insmea').click();
          R.ins = __refs().map(r => [r[2], r[5], r[6] - r[2], r[7]].join(':')).join(' ');
          undo();
          sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-delmea').click();
          R.del = __refs().map(r => [r[2], r[5], r[6] - r[2], r[7]].join(':')).join(' ');
          R.m0 = { dyn: song.measures[0].voxes[0][3].dyn, to: song.measures[0].voxes[0][3].dynTo || null };
          R.n = song.measures.length; R.svg = document.getElementById('score').innerHTML.length > 1000;
          return R; });
        T(!r.err && r.ins === '0:dynTo:1:0 1:dynTo:3:1 3:dynTo:0:3 5:ottTo:1:2' && r.del === '1:dynTo:0:3 3:ottTo:1:2' && r.m0.dyn === '<' && !r.m0.to && r.n === 5 && r.svg,
          'RF2 新建五线谱（' + (sh === 'classic' ? '?shell=classic' : '新外壳') + '，按钮 #b-insmea / #b-delmea）：插入后发夹 / 8va 仍指着原来的音（跨过插入点的跨度 +1，其余不变）；删第 2 小节——终点在它里面的渐强去掉 dynTo、留单音「<」，其后的引用 mi−1', J(r));
        if (sh !== 'classic') { allErrs.push(...P.errs); await P.close(); }
      }
      /* RF3 TAB 技法预设 */
      const r3 = await EV(A.pg, () => {
        const out = [];
        for (const nm of ['指弹技法示例', '指弹练习曲']) {
          const pr = PRESETS.find(p => p.name.indexOf(nm) === 0); if (!pr) { out.push({ nm, err: 'no preset' }); continue; }
          for (const D of [0, 1]) {
            __ld(pr.make()); const before = __refs().filter(r => r[0] === 'tab'); const mp = x => x > D ? x - 1 : x;
            const exp = before.filter(r => r[2] !== D && r[6] !== D).map(r => [r[0], r[1], mp(r[2]), r[3], r[4], r[5], mp(r[6]), r[7], r[8]].join('|')).sort();
            const techD = before.filter(r => r[6] === D && r[2] !== D).map(r => song.measures[r[2]].tabs[r[1]][r[3]].notes.find(n => n.s === r[4]).tech || '');
            sel = { mi: D, row: 'tab', vi: 0, ci: 0, si: 1 }; document.getElementById('b-delmea').click();
            const got = __refs().filter(r => r[0] === 'tab').map(r => r.join('|')).sort();
            const techKept = techD.filter(t => t).length;
            const techNow = song.measures.reduce((a, m) => a + (m.tabs || []).reduce((b2, cols) => b2 + (cols || []).reduce((c2, c) => c2 + (c.notes || []).filter(n => n.tech && !n.tk).length, 0), 0), 0);
            out.push({ nm, D, n: before.length, same: JSON.stringify(got) === JSON.stringify(exp), ok: __refOk(), techKept, techNow, svg: document.getElementById('score').innerHTML.length > 1000 });
          }
        }
        /* 合成：第 1 小节末音击弦 h 连到第 2 小节首音（tk 跨小节），删第 2 小节 → tk 去掉、h 留着，画得出来 */
        { const s = createSong('solo', { title: '技法', key: 'C', beats: 4, unit: 4, nMea: 3, nTab: 1, lyr: 0 });
          const N = (f, o) => Object.assign({ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [Object.assign({ s: 3, f }, o || {})] });
          s.measures.forEach(m => { m.tabs[0] = [N(2), N(4), N(5), N(7)]; });
          s.measures[0].tabs[0][3].notes[0].tech = 'h'; s.measures[0].tabs[0][3].notes[0].tk = { mi: 1, ci: 0, si: 3 };
          s.measures[2].tabs[0][0].notes[0].tech = 'p'; s.measures[2].tabs[0][0].notes[0].tk = { mi: 2, ci: 1, si: 3 };
          __ld(s); sel = { mi: 1, row: 'tab', vi: 0, ci: 0, si: 3 }; document.getElementById('b-delmea').click();
          const n0 = song.measures[0].tabs[0][3].notes[0], n1 = song.measures[1].tabs[0][0].notes[0];
          out.push({ nm: '合成', D: 1, n: 2, same: !n0.tk && n0.tech === 'h' && n1.tech === 'p' && !!n1.tk && n1.tk.mi === 1 && n1.tk.ci === 1, ok: __refOk(), svg: document.getElementById('score').innerHTML.length > 1000, m: song.measures.length }); }
        return out; });
      T(!r3.err && r3.length === 5 && r3.every(o => !o.err && o.same && o.ok && o.svg) && r3.some(o => o.n > 0),
        'RF3 TAB 预设（指弹技法示例 / 指弹练习曲）删第 1 / 2 小节：击 / 勾 / 滑 / 推 / 连音线的 tk 跟着平移；合成谱里终点在被删小节的 h 去掉 tk、字母留着，画得出来、其后的 p 仍连到原来的音', J(r3));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= PB 播放 ================= */
    if (want('PB')) {
      const A = await open(b);
      /* PB1 花括号组共用力度线 */
      const r1 = await EV(A.pg, lib => {
        const res = {};
        /* 合成：钢琴伴奏歌谱三行，力度只写在右手行（同源谱写在两行之间、导入后归到右手），两手同节奏 → 左手逐音力度 = 右手 */
        const s = createSong('vox', { title: '组', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: 3, lyr: 0 });
        s.voxVoices = ['旋律', '右手伴奏', '左手伴奏']; s.voxNotations = ['staff', 'staff', 'bass']; s.voxGroups = [{ type: 'brace', from: 1, to: 2 }];
        s.measures.forEach(m => { m.voxes = [0, 1, 2].map(v => [1, 3, 5, 3].map(d => Object.assign(vcol(), { dur: 4, deg: d, oct: v === 2 ? -1 : 0 }))); });
        s.measures[0].voxes[1][0].dyn = 'pp'; s.measures[1].voxes[1][2].dyn = 'f'; s.measures[2].voxes[1][0].dyn = 'sfz';
        __ld(s); { const ev = __play(0); const v = k => ev.filter(e => e.trk === 'vox:' + k && e.vel != null).map(e => e.vel);
          res.syn = { rh: v(1).join(' '), lh: v(2).join(' '), mel: v(0).slice(0, 2).join(' '), same: v(1).join(' ') === v(2).join(' ') && v(1).length === 12 }; }
        for (const [id, rh, lh, m2] of [['lib-os-lc6389103', 1, 2, 5], ['lib-os-lc6650166', 3, 4, 3]]) {
          __ld(lib[id]); const ev = __play(0), tEnd = __mStart(m2);
          const mean = k => { const a = ev.filter(e => e.trk === 'vox:' + k && e.vel != null && e.w < tEnd); return a.length ? +(a.reduce((x, e) => x + e.vel, 0) / a.length).toFixed(3) : null; };
          res[id] = { rh: mean(rh), lh: mean(lh), lhMarks: song.measures.slice(0, m2).reduce((a, m) => a + (m.voxes[lh] || []).filter(c => c.dyn && DYN_GAIN[c.dyn]).length, 0) };
        }
        return res; }, LIBD);
      const am = r1['lib-os-lc6389103'] || {};
      T(!r1.err && r1.syn.same && /^1\.?/.test(r1.syn.mel.split(' ')[0]) && am.lhMarks === 0 && am.lh < 0.6 && (r1['lib-os-lc6650166'] || {}).lhMarks === 0,
        'PB1 同一花括号组共用力度线：力度只写在右手行时左手逐音力度 = 右手（pp / f / sfz 都跟，旋律行不受影响）；圣母颂开头左手没有记号，平均力度 ' + am.lh + '（pp 档，修前约 0.96 按 mf）', J(r1));
      /* PB2 sf / fp */
      const r2 = await EV(A.pg, () => {
        const s = createSong('vox', { title: '力度', key: 'C', beats: 4, unit: 4, nMea: 4, nVox: 1, lyr: 0 });
        s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 4].map(d => Object.assign(vcol(), { dur: 4, deg: d })); });
        s.measures[0].voxes[0][0].dyn = 'p'; s.measures[1].voxes[0][0].dyn = 'sf'; s.measures[3].voxes[0][0].dyn = 'fp';
        __ld(s); const ev = __play(0).filter(e => e.trk === 'vox:0' && e.vel != null);
        const exp = []; for (let mi = 0; mi < 4; mi++) for (let ci = 0; ci < 4; ci++) {
          const lv = mi === 0 || mi === 2 ? DYN_GAIN.p : mi === 1 ? (ci === 0 ? DYN_GAIN.p * DYN_GAIN.sf : DYN_GAIN.p) : (ci === 0 ? DYN_GAIN.f : DYN_GAIN.p);
          exp.push(+(lv * beatAcc(ci, 4)).toFixed(4)); }
        const got = ev.map(e => e.vel);
        return { n: got.length, bad: got.map((v, i) => Math.abs(v - exp[i]) < 2e-3 ? null : i + ':' + v + '≠' + exp[i]).filter(Boolean), got: got.join(' ') }; });
      T(!r2.err && r2.n === 16 && !r2.bad.length, 'PB2a 合成谱逐音：p 之后 sf 只给这一音乘 1.28、下一音回到 p；fp 这一音按 f、之后 p（16 音逐个对拍 DYN_GAIN × 拍点重音）', J(r2));
      const r2b = await EV(A.pg, lib => { __ld(lib['lib-os-lc6491461']);
        const ev = __play(0).filter(e => e.trk === 'vox:0' && e.vel != null), t10 = __mStart(10), t17 = __mStart(17);
        const sfT = []; for (let mi = 10; mi < 17; mi++) (song.measures[mi].voxes[0] || []).forEach((c, ci) => { if (c.dyn === 'sf') sfT.push(__colT(0, mi, ci)); });
        const seg = ev.filter(e => e.w >= t10 - 1e-3 && e.w < t17 - 1e-3), plain = seg.filter(e => !sfT.some(t => Math.abs(t - e.w) < 1e-3)), acc = seg.filter(e => sfT.some(t => Math.abs(t - e.w) < 1e-3));
        return { n: seg.length, sf: sfT.length, accN: acc.length, maxPlain: Math.max(...plain.map(e => e.vel)), minAcc: Math.min(...acc.map(e => e.vel)) }; }, LIBD);
      T(!r2b.err && r2b.n > 10 && r2b.maxPlain <= 0.68 * 1.33 + 1e-3 && r2b.accN === r2b.sf && r2b.minAcc > 0.68 * 0.85,
        'PB2b 土拨鼠第 9 小节 sf 之后：第 11–17 小节人声不带 sf 的音都回到 p（最大 ' + r2b.maxPlain + ' ≤ p × 强拍重音，修前 1.09–1.70），只有 sf 那几个音本身加重', J(r2b));
      /* PB3 六线谱音高 = exportMIDI */
      const r3 = await EV(A.pg, () => {
        const s = createSong('solo', { title: '音高', key: 'C', beats: 4, unit: 4, nMea: 3, nTab: 1, nVox: 0, lyr: 0 });
        const N = (s2, f, o) => Object.assign({ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [Object.assign({ s: s2, f }, o || {})] });
        s.measures[0].tabs[0] = [N(6, 0), N(6, 3), N(5, 2), N(4, 2)];
        s.measures[1].tabs[0] = [N(3, 0), N(2, 0), N(1, 0), N(1, 12)];
        s.measures[2].tabs[0] = [N(6, 12, { tech: 'hm' }), N(6, 5, { tech: 'hm', hmT: 'A' }), N(5, 0), N(5, 0)];
        __ld(s); s.capo = 0; song.capo = 0;
        const ev = __play(0).filter(e => e.trk === 'tab:0');
        const smf = parseSMF(exportMIDI(song).bytes); const mid = []; smf.tracks.forEach(t => (t.notes || []).forEach(n => mid.push(n.midi)));
        const pm = ev.map(e => Math.round(e.m));
        let echo = null; { const orig = window.playInst; window.playInst = (k, c, b2, f) => { echo = +(69 + 12 * Math.log2(f / 440)).toFixed(2); }; try { pingCol('tab', 0, 0, song.measures[0].tabs[0][0], 6); } finally { window.playInst = orig; } }
        return { play: pm.slice(0, 8).join(' '), midi: mid.slice(0, 8).join(' '), hm: pm.slice(8, 10).join(' '), echo }; });
      T(!r3.err && r3.play === '40 43 47 52 55 59 64 76' && r3.play === r3.midi && r3.hm === '52 57' && Math.round(r3.echo) === 40,
        'PB3 六线谱播放音高 = 导出 MIDI（E2…E5：40 43 47 52 55 59 64 76，修前低 12）；6 弦 12 品自然泛音 52、5 品人工泛音 57；输入回响 6 弦空弦 40', J(r3));
      /* PB4 移调乐器 */
      const r4 = await EV(A.pg, () => {
        const s = createSong('vox', { title: '移调', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 0 });
        s.voxNotations = ['staff']; s.transp = -2;
        const c0 = Object.assign(vcol(), { dur: 4, deg: 1, adds: [{ deg: 3, acc: '', oct: 0 }] }), c1 = Object.assign(vcol(), { dur: 4, deg: 3, grace: 5 }), c2 = Object.assign(vcol(), { dur: 4, deg: 1, orn: 'up' });
        s.measures[0].voxes[0] = [c0, c1, c2, Object.assign(vcol(), { dur: 4 })];
        __ld(s); const ev = __play(0).filter(e => e.trk === 'vox:0'); const main = voxMidi(song.measures[0].voxes[0][0], 0);
        const ms = ev.map(e => Math.round(e.m));
        return { main, ms: ms.join(' '), add: ms.includes(main + 4), grace: ms.includes(main + 7), nb: ms.includes(main + 2), noRaw: !ms.includes(main + 6) && !ms.includes(main + 9) }; });
      T(!r4.err && r4.main === 58 && r4.add && r4.grace && r4.nb && r4.noRaw,
        'PB4 移调乐器（transp −2）：和音 adds、倚音、波音邻音与主音同一套实音公式 soundMidi（大三度 / 纯五度 / 大二度都按实音，不再高出一个移调音程）', J(r4));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= ED 编辑 ================= */
    if (want('ED')) {
      for (const sh of ['flow', 'classic']) {
        const A = await open(b, { shell: sh === 'classic' ? 'classic' : null });
        const r = await EV(A.pg, () => {
          const s = createSong('vox', { title: '拍号', key: 'C', beats: 4, unit: 4, nMea: 5, nVox: 1, lyr: 1 });
          s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 4].map(d => Object.assign(vcol(), { dur: 4, deg: d, lyrics: ['字'] })); });
          const m3 = s.measures[3].voxes[0]; m3[1].deg = 0; m3[1].lyrics = []; m3[3].tie = true; m3[3].lyrics = ['星']; m3[3].deg = 5;
          s.measures[4].voxes[0][0].deg = 5;
          __ld(s); sel = { mi: 3, row: 'vox', vi: 0, ci: 0, si: 1 };
          showMeaMeterMenu(); const btn = document.querySelector('#popmenu [data-mt="3/4"]'); if (!btn) return { err: 'no 3/4' }; btn.click();
          const cols = song.measures[3].voxes[0];
          const e = beatErrors().filter(x => x.mi === 3), sg = suggestFix(3, 'vox', 0);
          return { n: cols.length, tie: !!(cols[3] && cols[3].tie), ly: cols[3] ? cols[3].lyrics[0] : null, meter: song.measures[3].beats, be: e.map(x => x.b + '/' + x.target).join(','), sg: sg && sg.kind, toast: (document.getElementById('toast') || {}).textContent || '' }; });
        T(!r.err && r.n === 4 && r.tie && r.ly === '星' && r.meter === 3 && r.be === '4/3' && (r.sg === 'carry' || r.sg === 'trim') && /多出的音留着/.test(r.toast),
          'ED1 中途把第 4 小节改成 3/4（' + (sh === 'classic' ? '?shell=classic' : '新外壳') + '）：不删末尾带连音线和歌词「星」的音，超拍留给时值检查（4/3 拍、修复建议顺延 / 删多余）', J(r));
        allErrs.push(...A.errs); await A.close();
      }
      const A = await open(b);
      const r2 = await EV(A.pg, lib => {
        const R = {};
        __ld(lib['lib-os-lc5701612']);
        const sp = unitSeconds(song, 1);
        song.measures[0].voxes[0].forEach(c => { c.dur = 2; c.dotted = false; }); song.measures[0].voxes[0].length = 1; render(); syncInputs();
        const e0 = beatErrors().filter(x => x.mi === 0);
        R.pk = e0.map(x => x.row + x.vi + ':' + x.b + '/' + x.target + (x.uneven ? 'U' : '')).join(',');
        R.sec = +(measureSeconds(0, sp) / sp).toFixed(3);
        const d = [...document.querySelectorAll('#err-drop .err-desc')].map(x => x.textContent).join(' | ');
        R.desc = /弱起小节/.test(d) && /与其他声部不齐/.test(d);
        mutate(() => autoFixMeasure(0, 'vox', 1));
        R.fill = +song.measures[0].voxes[1].reduce((a, c) => a + beatsOf(c, 3 === 0 ? 4 : song.unit), 0).toFixed(3);
        __ld(lib['lib-os-lc5701612']);
        const m18 = song.measures[18]; m18.voxes[0] = [Object.assign(vcol(), { dur: 4, deg: 1 })]; render();
        R.irr = beatErrors().filter(x => x.mi === 18).map(x => x.row + x.vi + ':' + x.b + '/' + x.target + (x.uneven ? 'U' : '')).join(',');
        __ld(lib['lib-os-lc5701612']); R.libErr = beatErrors().length;
        /* 新谱勾弱起：伴奏两行还是整小节休止，旋律写 1 拍——不报（只比有音的行），播放这一小节按 1 拍 */
        { const s = createSong('vox', { title: '弱起', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 3, lyr: 0 }); s.pickup = true; s.voxNotations = ['staff', 'staff', 'bass']; s.voxGroups = [{ type: 'brace', from: 1, to: 2 }];
          s.measures[0].voxes[0] = [Object.assign(vcol(), { dur: 4, deg: 5 })]; __ld(s); R.fresh = beatErrors().length; R.freshSec = +(measureSeconds(0, sp) / sp).toFixed(3); }
        return R; }, LIBD);
      T(!r2.err && r2.pk === 'vox1:0.5/2U,vox2:0.5/2U' && r2.sec === 2 && r2.desc && r2.fill === 2 && r2.irr === 'vox0:1/2.5U' && r2.libErr === 0 && r2.fresh === 0 && r2.freshSec === 1,
        'ED2 摇篮曲弱起人声改成二分（[2, 0.5, 0.5]）：另两行报「与其他声部不齐」（0.5/2 拍，提示写「弱起小节」）、measureSeconds 取最长行 2 拍、补休止只补到 2 拍；第 19 小节（irr）人声只剩 1 拍报 1/2.5；原谱 0 处；新谱勾弱起、伴奏行仍整小节休止时旋律 1 拍不报', J(r2));
      const r3 = await EV(A.pg, lib => {
        const R = {};
        __ld(lib['lib-os-lc5701612']); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-delmea').click();
        R.a = { pk: !!song.pickup, no0: meaNo(0), n: song.measures.length };
        const s = createSong('vox', { title: '弱起', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: 1, lyr: 0 }); s.pickup = true;
        s.measures[0].voxes[0] = [Object.assign(vcol(), { dur: 4, deg: 5 })]; s.measures[1].voxes[0] = [Object.assign(vcol(), { dur: 2, deg: 1 })]; s.measures[1].irr = 1;
        __ld(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; document.getElementById('b-delmea').click();
        R.b = { pk: !!song.pickup, toast: (document.getElementById('toast') || {}).textContent || '' };
        return R; }, LIBD);
      T(!r3.err && r3.a.pk === false && r3.a.no0 === '1' && r3.a.n === 18 && r3.b.pk === true && /仍按弱起/.test(r3.b.toast),
        'ED3 摇篮曲删掉弱起小节：新的首小节满拍 3/4 → 清掉 pickup，第 1 小节重新编号「1」；新首小节不满拍时保留弱起并提示', J(r3));
      /* ED4 换织体覆盖确认（新外壳） */
      const r4 = await EV(A.pg, async lib => {
        const R = {}; const raf = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
        __ld(lib['lib-os-lc6389103']); await raf();
        const j0 = JSON.stringify(song);
        if (!FLOW.nx.tbar.open({ mode: 'tex' })) return { err: 'tbar' };
        await raf();
        const cards = [...document.querySelectorAll('#flw-nx-tbar [role="option"]')]; if (!cards.length) return { err: 'no cards' };
        cards[0].click(); await raf();
        const cf = document.getElementById('flw-nx-cf');
        R.same = JSON.stringify(song) === j0; R.cf = !!cf; R.msg = cf ? (cf.querySelector('.flw-nx-cfm') || {}).textContent || '' : ''; R.u0 = undoStack.length;
        R.modal = !!document.querySelector('#modal-mask:not(.hidden), .modal.show');
        const wb = cf && cf.querySelector('[data-fa="nx:write"]'); if (wb) wb.click(); await raf();
        R.wrote = JSON.stringify(song) !== j0 && !!song.texId; R.cfGone = !document.getElementById('flw-nx-cf');
        const cards2 = [...document.querySelectorAll('#flw-nx-tbar [role="option"]')];
        const j1 = JSON.stringify(song); const c2 = cards2.find(c => c.dataset.v !== song.texId); if (c2) { c2.click(); await raf(); }
        R.second = JSON.stringify(song) !== j1 && !document.getElementById('flw-nx-cf');
        FLOW.nx.tbar.close(false); undo(); undo(); R.back = JSON.stringify(song) === j0;
        /* 空伴奏的钢琴伴奏歌谱：直接写 */
        const s = createSong('vox', { title: '空伴奏', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 3, lyr: 0 });
        s.voxVoices = ['旋律', '右手伴奏', '左手伴奏']; s.voxNotations = ['staff', 'staff', 'bass']; s.voxGroups = [{ type: 'brace', from: 1, to: 2 }];
        s.measures.forEach(m => { m.voxes[0] = [1, 3, 5, 1].map(d => Object.assign(vcol(), { dur: 4, deg: d })); m.voxes[0][0].chord = 'C'; });
        __ld(s); await raf(); const k0 = JSON.stringify(song);
        FLOW.nx.tbar.open({ mode: 'tex' }); await raf();
        const c3 = document.querySelector('#flw-nx-tbar [role="option"]'); if (c3) { c3.click(); await raf(); }
        R.empty = { wrote: JSON.stringify(song) !== k0, cf: !!document.getElementById('flw-nx-cf'), pas: isPianoAccStack(song) };
        FLOW.nx.tbar.close(false);
        return R; }, LIBD);
      T(!r4.err && r4.same && r4.cf && /^覆盖原伴奏 \d+ 小节$/.test(r4.msg) && +r4.msg.match(/\d+/)[0] > 0 && !r4.modal && r4.wrote && r4.cfGone && r4.second && r4.back
        && r4.empty.pas && r4.empty.wrote && !r4.empty.cf,
        'ED4 圣母颂（原作伴奏、无 texId）点织体卡：谱不动、出确认条「' + (r4.msg || '…') + '」（不弹窗）→「写入」才换、记 texId；之后换卡直接写；撤销还原；空伴奏的钢琴伴奏歌谱点卡直接写', J(r4));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= JR 简谱长休止按拍补 0 ================= */
    if (want('JR')) {
      for (const sh of ['flow', 'classic']) {
        const A = await open(b, { shell: sh === 'classic' ? 'classic' : null });
        const r = await EV(A.pg, () => {
          const R = {};
          const zeros = (vi, mi) => { const svg = document.getElementById('score'); const cb = Object.keys(colBoxes).filter(k => k.startsWith('v' + vi + ':' + mi + ':')).map(k => colBoxes[k]);
            if (!cb.length) return null; const x0 = Math.min(...cb.map(b2 => b2.x)), x1 = Math.max(...cb.map(b2 => b2.x + b2.w)), y0 = Math.min(...cb.map(b2 => b2.y)), y1 = Math.max(...cb.map(b2 => b2.y + b2.h));
            const ts = [...svg.querySelectorAll('text[font-size="17"]')].filter(t => t.textContent === '0').map(t => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y') })).filter(t => t.x >= x0 - 1 && t.x <= x1 + 1 && t.y >= y0 && t.y <= y1);
            ts.sort((a, b2) => a.x - b2.x); let gap = 99; for (let i = 1; i < ts.length; i++) gap = Math.min(gap, ts[i].x - ts[i - 1].x); return { n: ts.length, gap: +gap.toFixed(1) }; };
          const V = (d, dur, dt) => Object.assign(vcol(), { dur, dotted: !!dt, deg: d });
          const fill = s => { const M = s.measures;
            M[0].voxes[0] = [V(0, 2), V(0, 4), V(0, 4)]; M[1].voxes[0] = [V(0, 1)]; M[2].voxes[0] = [V(0, 2, 1), V(0, 4)];
            M[3].voxes[0] = [V(1, 4), V(2, 4), V(0, 2)]; M[4].voxes[0] = [V(5, 2), V(0, 2)]; M[5].voxes[0] = [V(0, 4, 1), V(1, 8), V(2, 2)]; };
          const s1 = createSong('vox', { title: '休止', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 0 }); fill(s1); __ld(s1);
          R.jp = [0, 1, 2, 3, 4, 5].map(mi => { const z = zeros(0, mi); return z && z.n; }).join(',');
          R.gap = Math.min(...[0, 1, 2].map(mi => zeros(0, mi).gap));
          R.dot = (() => { const m = song.measures[5]; return !!m; })();
          const s2 = createSong('vox', { title: '对照', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 0 }); fill(s2); s2.voxNotations = ['staff']; s2.voxDual = [true]; __ld(s2);
          R.dual = [0, 1, 2, 3, 4, 5].map(mi => { const z = zeros(0, mi); return z && z.n; }).join(',');
          const s3 = createSong('vox', { title: '五线', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 0 }); fill(s3); s3.voxNotations = ['staff']; __ld(s3);
          R.staff0 = [...document.getElementById('score').querySelectorAll('text[font-size="17"]')].filter(t => t.textContent === '0').length;
          R.be = beatErrors().length;
          return R; });
        T(!r.err && r.jp === '4,4,4,2,2,1' && r.dual === '4,4,4,2,2,1' && r.staff0 === 0 && r.gap >= 9.2 && r.be === 0,
          'JR1–4（' + (sh === 'classic' ? '?shell=classic' : '新外壳') + '）简谱声部与教学对照简谱行的长休止按拍补写 0：r2 r4 r4 / r1 / r2. r4 → 4 个、1 2 r2 / 5– r2 → 2 个、附点四分「0·」仍 1 个；补写的 0 间距 ≥ 9.2（数字墨迹宽）；纯五线谱不出 0', J(r));
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= WR 弱起 / irr 空行不画全休止 ================= */
    if (want('WR')) {
      const A = await open(b);
      const r = await EV(A.pg, lib => {
        const out = {};
        const D = n => SMUFL[n].d;
        for (const id of ['lib-os-lc5701612', 'lib-os-lc6650166', 'lib-os-lc5705406', 'lib-os-lc6491461', 'lib-os-lc5654485', 'lib-os-lc6389103']) {
          __ld(lib[id]);
          const paths = [...document.getElementById('score').querySelectorAll('path')].map(p => ({ d: p.getAttribute('d'), x: +((p.getAttribute('transform') || '').match(/translate\(([\d.-]+),([\d.-]+)/) || [0, 0])[1], y: +((p.getAttribute('transform') || '').match(/translate\(([\d.-]+),([\d.-]+)/) || [0, 0, 0])[2] }));
          const inBox = (p, vi, mi) => { const cb = Object.keys(colBoxes).filter(k => k.startsWith('v' + vi + ':' + mi + ':')).map(k => colBoxes[k]); if (!cb.length) return false;
            const x0 = Math.min(...cb.map(b2 => b2.x)) - 2, x1 = Math.max(...cb.map(b2 => b2.x + b2.w)) + 2, y0 = Math.min(...cb.map(b2 => b2.y)) - 40, y1 = Math.max(...cb.map(b2 => b2.y + b2.h)) + 10; return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1; };
          let badPk = 0, okPk = 0, full = 0, fullHit = 0;
          song.measures.forEach((m, mi) => (m.voxes || []).forEach((cols, vi) => {
            if (!isStaffNota((song.voxNotations || [])[vi]) || simileSrc(mi) != null) return;
            if (!cols.length || cols.some(c => c.deg)) return;
            const whole = paths.filter(p => p.d === D('restWhole') && inBox(p, vi, mi)).length;
            const sum = cols.reduce((a, c) => a + beatsOf(c, meaMeter(mi).unit), 0), fb = Math.abs(sum - meaMeter(mi).beats) < 1e-3;
            if (fb) { full++; if (whole === 1) fullHit++; }
            else { const hasDur1 = cols.some(c => c.dur === 1); if (whole && !hasDur1) badPk++; else okPk++; }
          }));
          out[id.slice(-7)] = { badPk, okPk, full, fullHit };
        }
        return out; }, LIBD);
      const v = Object.values(r || {});
      T(!r.err && v.every(o => o.badPk === 0) && v.reduce((a, o) => a + o.okPk, 0) >= 20,
        'WR1 曲库弱起首小节与不完整小节（irr）的空五线行：不再画整小节全休止（' + v.reduce((a, o) => a + o.okPk, 0) + ' 处改按列里的实际时值画 r8 / r4 / r2 r4）', J(r));
      T(!r.err && v.every(o => o.full === o.fullHit) && v.reduce((a, o) => a + o.full, 0) > 50,
        'WR2 满拍的空五线行照旧画一个居中全休止（' + v.reduce((a, o) => a + o.full, 0) + ' 处，个数 = 满拍空行数）', J(r));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= MN 小节号 ================= */
    if (want('MN')) {
      for (const sh of ['flow', 'classic']) {
        const A = await open(b, { shell: sh === 'classic' ? 'classic' : null });
        const r = await EV(A.pg, lib => {
          const R = {};
          __ld(lib['lib-os-lc6650166']); R.lh = { last: meaNo(song.measures.length - 1), x1: meaNo(5), x2: meaNo(14), m4: meaNo(4), m6: meaNo(6), m15: meaNo(15), m0: meaNo(0) };
          { const x = exportMusicXML(song), d = new DOMParser().parseFromString(x, 'application/xml'); const p = d.querySelector('part');
            const ms = [...p.querySelectorAll(':scope > measure')]; R.lhX = { nums: ms.map(m => m.getAttribute('number')).join(','), imp: ms.filter(m => m.getAttribute('implicit') === 'yes').map(m => m.getAttribute('number')).join(',') }; }
          __ld(lib['lib-os-lc5705406']); R.qh = { last: meaNo(song.measures.length - 1), x1: meaNo(31), m30: meaNo(30), m32: meaNo(32) };
          __ld(lib['lib-os-lc5701612']); R.yl = { last: meaNo(18), m17: meaNo(17) };
          /* 弱起谱的时值提示：第 18 个小节（印 17）超拍 */
          song.measures[17].voxes[0].push(Object.assign(vcol(), { dur: 4 })); render(); syncInputs();
          R.desc = [...document.querySelectorAll('#err-drop .err-desc')].map(x => x.textContent.trim()).join(' | ');
          R.lbl = typeof meaLbl === 'function' ? meaLbl(17, true) : null;
          __ld(lib['lib-os-lc6389103']); R.am = { last: meaNo(song.measures.length - 1), n: song.measures.length };
          return R; }, LIBD);
        const ok = !r.err && r.lh.last === '20' && r.lh.x1 === '' && r.lh.x2 === '' && r.lh.m4 === '4' && r.lh.m6 === '5' && r.lh.m15 === '13' && r.lh.m0 === ''
          && r.qh.last === '60' && r.qh.x1 === '' && r.qh.m30 === '30' && r.qh.m32 === '31' && r.yl.last === '18' && r.yl.m17 === '17' && r.am.last === String(r.am.n);
        T(ok, 'MN1（' + (sh === 'classic' ? '?shell=classic' : '新外壳') + '）骊歌末小节 20（X1 / X2 不编号）、去会情人 60（X1 不编号）、摇篮曲末小节（弱起互补）18 不受影响、无弱起无拆分的圣母颂照旧', J(r && (r.lh || r.err)) + ' ' + J(r && r.qh));
        T(!r.err && /^0,1,2,3,4,X1,5,.*,12,X2,13,.*,20$/.test(r.lhX.nums) && r.lhX.imp === '0,X1,X2',
          'MN2 导出 MusicXML（' + sh + '）：骊歌 measure number 0…4,X1,5…12,X2,13…20，弱起与 X1 / X2 写 implicit="yes"', J(r.lhX));
        T(!r.err && /第17小节/.test(r.desc) && !/第18小节/.test(r.desc) && r.lbl === '第 17 小节',
          'MN3（' + sh + '）弱起谱时值提示按印出来的小节号：摇篮曲印 17 的那一小节超拍写「第17小节」（修前「第18小节」）', J({ desc: r.desc, lbl: r.lbl }));
        allErrs.push(...A.errs); await A.close();
      }
    }
  } catch (e) { T(false, '套件异常', String(e && e.stack || e).slice(0, 400)); }
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '\n失败：' + fails.join(' | ') : ''));
  const real = allErrs.filter(e => !/ResizeObserver/.test(e));
  console.log(real.length ? 'ERRORS:\n' + real.slice(0, 10).join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !real.length ? 0 : 1);
})();
