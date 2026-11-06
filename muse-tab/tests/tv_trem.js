/* v43.1 震音 tremolo 回归：
   T1 五线谱：col.trem=1/2/3 在符干上画 1/2/3 条斜杠（八分/十六分/三十二分轮奏）；全音符画符头上方；无报错
   T2 简谱：数字上方画对应条数斜杠
   T3 toggleTrem 循环：无→1→2→3→无；仅对有音高音符
   T4 播放实音不变（voxMidi 不读 trem）
   斜杠唯一标识：stroke-width="1.9"。file:// 直载；每次载入前清 undoStack。
   v70.4 起另有 W 段（双音震音 col.trem2，见文件末 trem2Suite 的说明）；env V704_REF＝v70.3 基线页（缺省 git show 16de944，W12b 用）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const slashN = h => (h.match(/stroke-width="1\.9"/g) || []).length;

  // T1 五线谱：1/2/3 杠 + 全音符
  let r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(trem,dur)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(1,dur,{trem}),...(dur===4?[V(2,4),V(3,4),V(4,4)]:dur===2?[V(2,2)]:[])]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const h1=mk(1,4), h2=mk(2,4), h3=mk(3,4), hw=mk(2,1);
    const n=(h)=>(h.match(/stroke-width="1.9"/g)||[]).length;
    return {n1:n(h1), n2:n(h2), n3:n(h3), nw:n(hw), clean:h3.indexOf('NaN')<0}; })()`);
  T(r.n1===1 && r.n2===2 && r.n3===3 && r.nw===2 && r.clean, 'T1 五线谱 1/2/3 杠+全音符', JSON.stringify(r));

  // T2 简谱：数字上方斜杠
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4,{trem:3}),V(2,4),V(3,4),V(5,4,{trem:1,oct:1})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {n:(h.match(/stroke-width="1.9"/g)||[]).length, clean:h.indexOf('NaN')<0}; })()`);
  T(r.n===4 && r.clean, 'T2 简谱数字上方斜杠(3+1)', JSON.stringify(r));

  // T3 toggleTrem 循环 + 仅对有音高
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(0,4),V(3,4),V(4,4)]; loadSong(s);
    sel={mi:0,row:'vox',vi:0,ci:0,si:1};
    const cyc=[]; for(let i=0;i<4;i++){ toggleTrem(); cyc.push(song.measures[0].voxes[0][0].trem||0); }
    // 休止（deg=0）不加 trem
    sel={mi:0,row:'vox',vi:0,ci:1,si:1}; toggleTrem();
    const restTrem=song.measures[0].voxes[0][1].trem||0;
    return {cyc:cyc.join(','), restTrem}; })()`);
  T(r.cyc==='1,2,3,0' && r.restTrem===0, 'T3 toggleTrem 循环+休止豁免', JSON.stringify(r));

  // T4 播放实音不变
  r = await pg.evaluate(`(()=>{ const base=voxMidi({deg:1,oct:0,acc:''}); return {same:voxMidi({deg:1,oct:0,acc:'',trem:3})===base}; })()`);
  T(r.same, 'T4 震音不改实音', JSON.stringify(r));

  await trem2Suite(b, pg, T);

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();

/* ===================== v70.4 双音震音 col.trem2（基石方案 docs/plan-2026-11-foundation.md §3.2 A 验收「震音」各条） =====================
   样本：曲库《阿特拉斯》（lc4985985，3 杠 51 对）《侏儒》（lc6838113，2 杠 188 对）的种子与源谱 deploy/library/openscore/*.musicxml；合成小样（全音符 / 升降 / 同音 / 和音）。
   W1 数据与导入：种子成对数＝源谱 start 数、杠数＝源谱值；importMusicXML(源谱) 得到同样的 trem2、导入报告不再有「震音」；没写 time-modification 的 start / stop（duration＝type 一半）按 2:1 收
   W2 五线谱：一对上的连音数字（含「2」）与括弧 0 处（离屏排版 data-g="tup" 的组起点不落在对上；其余连音照印）；简谱行同样 0 处（tupArcSVG 调用数＝非对连音组数）
   W3 杠数＝源谱（3 / 2）、对数 51 / 188
   W4 杠端点在两符干之间；四分 / 二分时杠端与符干外缘空隙 ≥0.5 线距；全音符（合成）杠悬在两符头之间、离符头 ≥0.5 线距
   W5 斜度跟着音程走：上行杠右端高、下行右端低、同音水平（合成）
   W6 符头字形＝源谱 type（half → noteheadHalf、quarter → noteheadBlack）
   W7 碰撞普查「震音 × 墨迹」（geom_census C20）0 处：两首 ＋ 合成小样，版宽 840 / 870
   W8 播放：音符事件（不同起奏时刻）数＝交替音数（二分一对 3 杠＝16 次），两音交替、和音随行
   W9 MIDI：同一小样 note-on 起奏时刻数＝交替音数、步长＝TPQ/2^杠数
   W10 MusicXML 往返：两首导出 tremolo start / stop 对数相等（＝51 / 188）、带 time-modification 2:1；再导入 trem2 逐列相同
   W11 简谱：一对按实际时值画（二分 2:1 不画增时线）、两数字之间画杠数条斜杠且不碰数字；逐小节「简谱拍长」总和＝拍号
   W12 老谱不变：曲库其余 27 首与预设不含 trem2，migrate 后 JSON 逐字节不变；（有基线页时）去掉 trem2 的两首、其余各首的离屏谱面与 MusicXML 导出与 v70.3（16de944）逐字节相同 */
async function trem2Suite(b, pg0, T) {
  const path = require('path'), fs = require('fs');
  const ROOT = path.resolve(__dirname, '..', '..');
  const LIB = JSON.parse(fs.readFileSync(process.env.V704_SEED || path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));   /* V704_SEED：换一份种子（修前跑红用 16de944 的种子） */
  const SRC = { 'lib-os-lc4985985': { n: 3, pairs: 51 }, 'lib-os-lc6838113': { n: 2, pairs: 188 } };
  Object.keys(SRC).forEach(id => { SRC[id].xml = fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'openscore', id.replace('lib-os-', '') + '.musicxml'), 'utf8'); SRC[id].song = LIB.find(x => x.id === id).data; });
  const J = x => JSON.stringify(x);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => { try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {} });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  await pg.evaluate(() => {
    window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    /* 页面里的 trem2Roles / trem2JpCol（修前页没有：退回同口径的测试内实现，让修前页跑红而不是抛错） */
    window.__t2R = typeof trem2Roles === 'function' ? trem2Roles : cols => { if (!cols || !cols.some(c => c && c.trem2)) return null; const R = cols.map(() => 0);
      for (let i = 0; i + 1 < cols.length; i++) { const a = cols[i], b2 = cols[i + 1], ok = c => c && c.deg > 0 && c.tup === 2 && c.tupM === 1; if (a.trem2 >= 1 && a.trem2 <= 4 && ok(a) && ok(b2)) { R[i] = 1; R[i + 1] = 2; i++; } } return R; };
    window.__t2J = typeof trem2JpCol === 'function' ? trem2JpCol : c => { const o = Object.assign({}, c, { dur: Math.min(64, (c.dur || 4) * 2) }); delete o.tup; delete o.tupM; return o; };
    /* 源谱：part P2（钢琴）的 tremolo start / stop，按（小节序号, 谱表）列出 {ty, n, type} */
    window.__srcTrem = x => { const d = new DOMParser().parseFromString(x, 'application/xml'); const out = {};
      const parts = [...d.querySelectorAll('score-partwise > part')];
      parts.forEach((pt, pi) => [...pt.querySelectorAll(':scope > measure')].forEach((m, mi) => [...m.querySelectorAll(':scope > note')].forEach(n => {
        const tr = n.querySelector(':scope > notations > ornaments > tremolo'); if (!tr || n.querySelector(':scope > chord')) return;
        const st = +((n.querySelector(':scope > staff') || {}).textContent || 1), k = mi + ':' + (pi === 0 ? 0 : st);
        (out[k] = out[k] || []).push({ ty: tr.getAttribute('type') || 'single', n: +tr.textContent.trim(), type: (n.querySelector(':scope > type') || {}).textContent }); })));
      return out; };
    window.__pairs = s => { const L = []; (s.measures || []).forEach((m, mi) => (m.voxes || []).forEach((cols, vi) => { const R = __t2R(cols);
      (cols || []).forEach((c, ci) => { if (R ? R[ci] === 1 : !!(c && c.trem2)) L.push({ mi, vi, ci, n: c.trem2 }); }); })); return L; };
    window.__off = (s, o) => { o = o || {}; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
      window.__pyqGeom = !!o.geom; let r = null;
      try { r = renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: o.paperW || 870, crop: true }); } finally { window.__pyqGeom = false; }
      return { svg, r }; };
    window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    window.__mk = (cols, o) => { o = o || {}; const s = createSong('instr', { title: 'trem2', key: 'C', beats: o.beats || 4, unit: 4, nMea: 1, nVox: 1, lyr: 0, clef: 'staff' });
      s.tempo = o.tempo || 60; s.measures[0].voxes[0] = cols; if (o.jp) s.voxNotations = [null]; return s; };
  });

  /* ---------- W1 数据与导入 ---------- */
  let r = await pg.evaluate(([S]) => { const out = {};
    Object.entries(S).forEach(([id, o]) => {
      const src = __srcTrem(o.xml), st = Object.values(src).flat(), nStart = st.filter(t => t.ty === 'start').length, nStop = st.filter(t => t.ty === 'stop').length;
      const seed = __pairs(o.song), im = importMusicXML(o.xml), imp = im && im.song ? __pairs(im.song) : [];
      out[id] = { nStart, nStop, srcN: [...new Set(st.filter(t => t.ty === 'start').map(t => t.n))], seed: seed.length, seedN: [...new Set(seed.map(p => p.n))],
        imp: imp.length, same: J(imp) === J(seed), rep: (im && im.skip && im.skip.otherBy && im.skip.otherBy['震音']) || 0, txt: (typeof skipText === 'function' && im && im.skip) ? /震音/.test(skipText(im.skip)) : null };
    });
    /* 没写 time-modification 的一对（duration＝type 一半）：按 2:1 收 */
    const x = '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
      + '<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><notations><ornaments><tremolo type="start">2</tremolo></ornaments></notations></note>'
      + '<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><notations><ornaments><tremolo type="stop">2</tremolo></ornaments></notations></note>'
      + '<note><pitch><step>G</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note></measure></part></score-partwise>';
    const im2 = importMusicXML(x), c = im2 && im2.song ? im2.song.measures[0].voxes[0] : [];
    out.noTm = c.map(k => [k.dur, k.tup || 0, k.tupM || 0, k.trem2 || 0].join('/')).join(' ');
    out.noTmBeats = c.reduce((a, k) => a + beatsOf(k, 4), 0);
    return out;
    function J(v) { return JSON.stringify(v); }
  }, [SRC]);
  { const a = r['lib-os-lc4985985'], z = r['lib-os-lc6838113'];
    T(a.nStart === 51 && a.nStop === 51 && a.seed === 51 && J(a.seedN) === '[3]' && J(a.srcN) === '[3]' && z.nStart === 188 && z.nStop === 188 && z.seed === 188 && J(z.seedN) === '[2]' && J(z.srcN) === '[2]',
      'W1a 种子：阿特拉斯 51 对 3 杠、侏儒 188 对 2 杠（＝源谱 tremolo start / stop 数与杠数，trem2Roles 成对）', J({ a, z }));
    T(a.imp === 51 && a.same && !a.rep && a.txt === false && z.imp === 188 && z.same && !z.rep && z.txt === false,
      'W1b importMusicXML(源谱)：trem2 与种子逐对相同；skip.otherBy / 导入报告不再有「震音」', J({ a: [a.imp, a.same, a.rep, a.txt], z: [z.imp, z.same, z.rep, z.txt] }));
    T(r.noTm === '2/2/1/2 2/2/1/0 2/0/0/0' && Math.abs(r.noTmBeats - 4) < 1e-6, 'W1c 没写 time-modification 的一对（duration＝type 一半）按 2:1 收、trem2 记在第一个音、小节 4 拍', r.noTm + ' · ' + r.noTmBeats); }

  /* ---------- W2–W6 五线谱几何（离屏 870 · 调试标记） ---------- */
  const geoFn = ([s, srcXml]) => {
    const { svg } = __off(s, { geom: true });
    const pairs = __pairs(s), PK = new Set(pairs.map(p => p.vi + ':' + p.mi + ':' + p.ci)), P2 = new Set(pairs.map(p => p.vi + ':' + p.mi + ':' + (p.ci + 1)));
    const byKey = {}; svg.querySelectorAll('[data-g]').forEach(e => { const k = e.getAttribute('data-gq'), g = e.getAttribute('data-g'); ((byKey[k] = byKey[k] || {})[g] = byKey[k][g] || []).push(e); });
    /* 期望的连音组起点（同渲染分组口径，跳过一对）：本小节内连续同比例连音每 N 个一组 */
    const expTup = new Set();
    s.measures.forEach((m, mi) => (m.voxes || []).forEach((cols, vi) => { const R = __t2R(cols) || []; const tN = c => c.tup === 1 ? 3 : c.tup, key = c => tN(c) + ':' + (c.tupM || 0);
      let a = 0; while (a < cols.length) { if (cols[a].tup && !R[a]) { let e = a; while (e < cols.length - 1 && cols[e + 1].tup && !R[e + 1] && key(cols[e + 1]) === key(cols[a])) e++; for (let k = a; k <= e; k += tN(cols[a])) expTup.add(vi + ':' + mi + ':' + k); a = e + 1; } else a++; } }));
    const isStaffV = vi => ['staff', 'bass', 'alto'].includes((s.voxNotations || [])[vi]);
    const tupKeys = new Set(Object.keys(byKey).filter(k => byKey[k].tup)), expStaff = [...expTup].filter(k => isStaffV(+k.split(':')[0]));
    const tupOnPair = [...tupKeys].filter(k => PK.has(k) || P2.has(k));
    const tupMiss = expStaff.filter(k => !tupKeys.has(k)), tupExtra = [...tupKeys].filter(k => !expTup.has(k));
    const SG = 7.5, res = { pairs: pairs.length, nChk: 0, nG: 0, nT2: svg.querySelectorAll('[data-g="trem2"]').length, tupOnPair, tupMiss: tupMiss.length, tupExtra, nBad: [], endBad: [], gapMin: 99, glyphBad: [], nStrokes: {} };
    const src = srcXml ? __srcTrem(srcXml) : null, GL = { half: 'noteheadHalf', quarter: 'noteheadBlack', whole: 'noteheadWhole', eighth: 'noteheadBlack' };
    const seen = {};
    pairs.forEach(p => { const k = p.vi + ':' + p.mi + ':' + p.ci, kB = p.vi + ':' + p.mi + ':' + (p.ci + 1), o = byKey[k] || {}, oB = byKey[kB] || {};
      const st = o.trem2 || []; res.nStrokes[st.length] = (res.nStrokes[st.length] || 0) + 1;
      if (st.length !== p.n) res.nBad.push(k + ' ' + st.length);
      const sA = (o.stem || [])[0], sB = (oB.stem || [])[0];
      st.forEach(e => { res.nChk++; const m = /M ([\d.-]+) [\d.-]+ L ([\d.-]+)/.exec(e.getAttribute('d')); const x0 = +m[1], x1 = +m[2];
        if (!sA || !sB) { res.endBad.push(k + ' 缺符干'); return; }
        const xa = +sA.getAttribute('x1'), xb = +sB.getAttribute('x1'), w = 0.55;
        const g0 = x0 - (xa + w), g1 = (xb - w) - x1; res.gapMin = Math.min(res.gapMin, g0, g1);
        if (!(xa < x0 && x1 < xb) || g0 < SG * 0.5 - 0.05 || g1 < SG * 0.5 - 0.05) res.endBad.push(k + ' ' + [xa, x0, x1, xb].map(v => v.toFixed(1)).join(',')); });
      /* 符头字形对源谱 type（同小节同谱表第 j 对 ↔ 源谱第 j 个 start） */
      if (src) { res.nG += 2; const sk = p.mi + ':' + p.vi, j = seen[sk] = (seen[sk] || 0) + 1, L = (src[sk] || []).filter(t => t.ty === 'start'), Ls = (src[sk] || []).filter(t => t.ty === 'stop');
        const want = [GL[(L[j - 1] || {}).type], GL[(Ls[j - 1] || {}).type]], got = [o.head, oB.head].map(hs => { const d = hs && hs[0] && hs[0].getAttribute('d'); return Object.keys(GL).map(t => GL[t]).find(g => SMUFL[g].d === d) || '?'; });
        if (want[0] !== got[0] || want[1] !== got[1]) res.glyphBad.push(k + ' ' + J(want) + '≠' + J(got)); } });
    svg.remove(); return res;
    function J(v) { return JSON.stringify(v); } };
  const G = {};
  for (const id of Object.keys(SRC)) G[id] = await pg.evaluate(geoFn, [SRC[id].song, SRC[id].xml]);
  /* 简谱行：tupArcSVG 调用数（＝非对连音组数）——全部声部改简谱 */
  const jpTup = await pg.evaluate(([S]) => { const out = {};
    Object.entries(S).forEach(([id, o]) => { const s = JSON.parse(JSON.stringify(o.song)); s.voxNotations = s.voxNotations.map(() => null);
      let n = 0; const orig = tupArcSVG; window.tupArcSVG = function () { n++; return orig.apply(this, arguments); };
      try { __off(s).svg.remove(); } finally { window.tupArcSVG = orig; }
      let exp = 0; s.measures.forEach(m => (m.voxes || []).forEach(cols => { const R = __t2R(cols) || []; const tN = c => c.tup === 1 ? 3 : c.tup, key = c => tN(c) + ':' + (c.tupM || 0);
        let a = 0; while (a < cols.length) { if (cols[a].tup && !R[a]) { let e = a; while (e < cols.length - 1 && cols[e + 1].tup && !R[e + 1] && key(cols[e + 1]) === key(cols[a])) e++; exp += Math.ceil((e - a + 1) / tN(cols[a])); a = e + 1; } else a++; } }));
      out[id] = { n, exp }; }); return out; }, [SRC]);
  { const a = G['lib-os-lc4985985'], z = G['lib-os-lc6838113'];
    T(a.pairs === 51 && z.pairs === 188 && !a.tupOnPair.length && !z.tupOnPair.length && !a.tupMiss && !z.tupMiss && !a.tupExtra.length && !z.tupExtra.length
      && jpTup['lib-os-lc4985985'].n === jpTup['lib-os-lc4985985'].exp && jpTup['lib-os-lc6838113'].n === jpTup['lib-os-lc6838113'].exp,
      'W2 一对上的连音数字（含「2」）与括弧 0 处：五线谱连音标记只落在非对的连音组上（一组不少）、简谱行连音弧数＝非对连音组数',
      J({ a: [a.tupOnPair.slice(0, 3), a.tupMiss, a.tupExtra.slice(0, 3)], z: [z.tupOnPair.slice(0, 3), z.tupMiss, z.tupExtra.slice(0, 3)], jp: jpTup }));
    T(!a.nBad.length && !z.nBad.length && J(a.nStrokes) === '{"3":51}' && J(z.nStrokes) === '{"2":188}', 'W3 每对的震音杠数＝源谱（阿特拉斯 3 杠 × 51、侏儒 2 杠 × 188）', J({ a: [a.nStrokes, a.nBad.slice(0, 3)], z: [z.nStrokes, z.nBad.slice(0, 3)] }));
    T(!a.endBad.length && !z.endBad.length && a.nChk === 153 && z.nChk === 376 && a.gapMin >= 3.7 && z.gapMin >= 3.7, 'W4a 杠端点在两符干之间；四分 / 二分时杠端与符干外缘空隙 ≥0.5 线距（3.75）',
      J({ a: [a.gapMin.toFixed(2), a.endBad.slice(0, 3)], z: [z.gapMin.toFixed(2), z.endBad.slice(0, 3)] }));
    T(!a.glyphBad.length && !z.glyphBad.length && a.nG === 102 && z.nG === 376, 'W6 一对两个音的符头字形＝源谱 type（half → noteheadHalf、quarter → noteheadBlack）', J({ a: a.glyphBad.slice(0, 3), z: z.glyphBad.slice(0, 3) })); }

  /* W4b 全音符 · W5 斜度（合成） */
  r = await pg.evaluate(() => { const SG = 7.5, V = __V, t2 = (deg, dur, n, o) => V(deg, dur, Object.assign({ tup: 2, tupM: 1 }, n ? { trem2: n } : {}, o || {}));
    const strokes = s => { const { svg } = __off(s); const L = [...svg.querySelectorAll('path.trem2')].map(e => { const m = /M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)/.exec(e.getAttribute('d')); return m.slice(1).map(Number); });
      const heads = [...svg.querySelectorAll('path')].filter(e => e.getAttribute('d') === SMUFL.noteheadWhole.d).map(e => { const m = /translate\(([\d.-]+),([\d.-]+)\)/.exec(e.getAttribute('transform')); return +m[1]; });
      svg.remove(); return { L, heads }; };
    const w = strokes(__mk([t2(1, 1, 3), t2(5, 1)]));
    const hw = (SMUFL.noteheadWhole.bb[2] - SMUFL.noteheadWhole.bb[0]) * SG, hb0 = SMUFL.noteheadWhole.bb[0] * SG;
    const wOk = w.L.length === 3 && w.heads.length === 2 && w.L.every(([x0, , x1]) => x0 >= w.heads[0] + hb0 + hw + SG * 0.5 - 0.05 && x1 <= w.heads[1] + hb0 - SG * 0.5 + 0.05 && x1 - x0 > SG);
    const slope = (a, bb) => { const L = strokes(__mk([t2(a, 2, 2), t2(bb, 2), V(1, 2)])).L; return L.map(([, y0, , y1]) => +(y1 - y0).toFixed(2)); };
    return { wOk, w: J(w), up: slope(1, 5), dn: slope(5, 1), eq: slope(3, 3) };
    function J(v) { return JSON.stringify(v); } });
  T(r.wOk, 'W4b 全音符一对（合成，3 杠）：杠悬在两个符头之间，离两符头各 ≥0.5 线距', r.w);
  T(r.up.length === 2 && r.up.every(d => d < -1) && r.dn.length === 2 && r.dn.every(d => d > 1) && r.eq.length === 2 && r.eq.every(d => Math.abs(d) < 0.05),
    'W5 杠的斜度跟着音程走：上行右端高、下行右端低、同音水平', JSON.stringify({ up: r.up, dn: r.dn, eq: r.eq }));

  /* W7 碰撞普查「震音 × 墨迹」C20 */
  { const GC = require('./geom_census');
    const syn = await pg.evaluate(() => { const V = __V, t2 = (deg, dur, n, o) => V(deg, dur, Object.assign({ tup: 2, tupM: 1 }, n ? { trem2: n } : {}, o || {}));
      return [
        { name: '合成·全音符 3 杠', song: __mk([t2(1, 1, 3), t2(5, 1)]) },
        { name: '合成·二分升号和音 4 杠', song: __mk([t2(1, 2, 4, { adds: [{ deg: 3, acc: '#', oct: 0 }] }), t2(6, 2, 0, { acc: 'b' }), t2(5, 2, 1, { oct: 1 }), t2(2, 2, 0, { oct: -1 })]) },
        { name: '合成·四分附点', song: __mk([t2(1, 4, 3, { dotted: true }), t2(5, 4, 0, { dotted: true }), V(1, 4), t2(3, 4, 2), t2(5, 4), V(1, 8)], { beats: 4 }) },
      ]; });
    const S2 = Object.keys(SRC).map(id => ({ name: id, song: SRC[id].song })).concat(syn);
    const c870 = GC.groupCounts(await GC.census(pg, S2, { presets: false, paperW: 870 })).C20, c900 = GC.groupCounts(await GC.census(pg, S2, { presets: false, paperW: 900 })).C20;
    T(c870.n === 0 && c900.n === 0 && G['lib-os-lc4985985'].nT2 === 153 && G['lib-os-lc6838113'].nT2 === 376, 'W7 碰撞普查「震音 × 墨迹」（C20）0 处：两首 ＋ 3 份合成小样，版宽 840 / 870', J({ 840: [c870.n, c870.cats, c870.ex.slice(0, 3)], 870: [c900.n, c900.cats, c900.ex.slice(0, 3)] })); }

  /* W8 播放 · W9 MIDI：二分一对 3 杠（A＝C4+E4 和音、B＝G4），4/4、♩=60 → 一对 2 秒、步长 1/8 秒 → 16 次交替 */
  r = await pg.evaluate(() => { const V = __V, t2 = (deg, dur, n, o) => V(deg, dur, Object.assign({ tup: 2, tupM: 1 }, n ? { trem2: n } : {}, o || {}));
    const s = __mk([t2(1, 2, 3, { adds: [{ deg: 3, acc: '', oct: 0 }] }), t2(5, 2), V(1, 2)], { tempo: 60 });
    undoStack.length = 0; loadSong(s); render();
    window.SF_PLAYWAIT = false;   /* 不等高保真音色包（同 tv_v697col） */
    const rec = [], orig = playInst;
    playInst = (ik, c2, b3, f, w, d) => { rec.push({ m: Math.round(12 * Math.log2(f / 440) + 69), w, d }); };
    try { play(); } finally { stopPlay(); playInst = orig; }
    rec.sort((a, b2) => a.w - b2.w || a.m - b2.m);
    const t0 = rec.length ? rec[0].w : 0, inPair = rec.filter(e => e.w - t0 < 2 - 1e-3), on = [...new Set(inPair.map(e => +(e.w - t0).toFixed(3)))];
    const seq = on.map(t => inPair.filter(e => Math.abs(e.w - t0 - t) < 1e-3).map(e => e.m).join('+'));
    const alt = seq.every((x, i) => x === (i % 2 ? '67' : '60+64'));
    const steps = on.slice(1).map((t, i) => +(t - on[i]).toFixed(3)), stepOk = steps.every(d => Math.abs(d - 0.125) < 0.004);
    /* MIDI */
    const by = exportMIDI(song).bytes; let p = 14; const trk = [];
    while (p < by.length) { const len = (by[p + 4] << 24) | (by[p + 5] << 16) | (by[p + 6] << 8) | by[p + 7]; trk.push(by.slice(p + 8, p + 8 + len)); p += 8 + len; }
    const ons = []; { const t = trk[1]; let i = 0, tk = 0, rs = 0;
      const vlq = () => { let v = 0, c; do { c = t[i++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };
      while (i < t.length) { tk += vlq(); let st = t[i]; if (st & 0x80) i++; else st = rs; rs = st;
        if (st === 0xff) { i++; const l = vlq(); i += l; continue; }
        const hi = st & 0xf0; if (hi === 0x90) { const n = t[i++], v = t[i++]; if (v) ons.push({ tk, n }); } else if (hi === 0x80 || hi === 0xa0 || hi === 0xb0 || hi === 0xe0) i += 2; else if (hi === 0xc0 || hi === 0xd0) i += 1; } }
    const mOn = [...new Set(ons.filter(e => e.tk < 960).map(e => e.tk))];
    const mSeq = mOn.map(tk => ons.filter(e => e.tk === tk).map(e => e.n).sort((a, b2) => a - b2).join('+'));
    return { n: on.length, alt, stepOk, seq: seq.slice(0, 4), steps: steps.slice(0, 3), tail: rec.filter(e => e.w - t0 >= 2 - 1e-3).map(e => e.m),
      mN: mOn.length, mAlt: mSeq.every((x, i) => x === (i % 2 ? '67' : '60+64')), mStep: mOn.slice(1).every((tk, i) => Math.abs(tk - mOn[i] - 60) <= 1), mSeq: mSeq.slice(0, 4) }; });
  T(r.n === 16 && r.alt && r.stepOk && JSON.stringify(r.tail) === '[60]', 'W8 播放：二分一对 3 杠＝16 次交替（和音 C4+E4 ↔ G4，步长 1/8 秒＝三十二分），一对之后照常', JSON.stringify(r).slice(0, 400));
  T(r.mN === 16 && r.mAlt && r.mStep, 'W9 MIDI：同一小样 note-on 起奏时刻 16 个、两音交替、步长 TPQ/8＝60 tick', JSON.stringify({ mN: r.mN, mAlt: r.mAlt, mStep: r.mStep, mSeq: r.mSeq }));

  /* W10 MusicXML 往返 */
  r = await pg.evaluate(([S]) => { const out = {};
    Object.entries(S).forEach(([id, o]) => { const x = exportMusicXML(JSON.parse(JSON.stringify(o.song)));
      const d = new DOMParser().parseFromString(x, 'application/xml'), tr = [...d.querySelectorAll('note > notations > ornaments > tremolo')];
      const st = tr.filter(t => t.getAttribute('type') === 'start'), sp = tr.filter(t => t.getAttribute('type') === 'stop');
      const tm = tr.every(t => { const n = t.closest('note'); return n.querySelector('time-modification > actual-notes').textContent === '2' && n.querySelector('time-modification > normal-notes').textContent === '1'; });
      const im = importMusicXML(x), a = JSON.stringify(__pairs(o.song)), b2 = JSON.stringify(__pairs(im.song));
      out[id] = { st: st.length, sp: sp.length, nv: [...new Set(tr.map(t => t.textContent))], tm, same: a === b2 }; }); return out; }, [SRC]);
  { const a = r['lib-os-lc4985985'], z = r['lib-os-lc6838113'];
    T(a.st === 51 && a.sp === 51 && JSON.stringify(a.nv) === '["3"]' && a.tm && a.same && z.st === 188 && z.sp === 188 && JSON.stringify(z.nv) === '["2"]' && z.tm && z.same,
      'W10 MusicXML 往返：tremolo start / stop 对数相等（51 / 188）、杠数照写、time-modification 2:1 保留；再导入 trem2 逐对相同', JSON.stringify(r)); }

  /* W11 简谱 */
  r = await pg.evaluate(([S]) => { const out = {};
    Object.entries(S).forEach(([id, o]) => { const s = JSON.parse(JSON.stringify(o.song)); s.voxNotations = s.voxNotations.map(() => null);
      const { svg } = __off(s);
      const sl = [...svg.querySelectorAll('line.jptrem2')], dash = svg.querySelectorAll('line.jdash').length;
      /* 斜杠与数字：每组斜杠（同 x 中心）左右最近的数字墨迹净距——数字墨迹用 canvas measureText 的 actualBoundingBox（真实字墨，同 geom_census；getBBox 给的是整个字框，宽 1.25em） */
      const cv = document.createElement('canvas').getContext('2d');
      const digits = [...svg.querySelectorAll('text')].filter(t => /^[0-7]$/.test(t.textContent.trim()) && +t.getAttribute('font-size') >= 15).map(t => { const cs = getComputedStyle(t), fz = parseFloat(cs.fontSize) || 17;
        cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + (fz * 16) + 'px ' + cs.fontFamily; cv.textAlign = 'center'; cv.textBaseline = 'alphabetic';
        const m = cv.measureText(t.textContent.trim()), x = +t.getAttribute('x'), y = +t.getAttribute('y'), l = m.actualBoundingBoxLeft / 16, rr = m.actualBoundingBoxRight / 16;
        return { x: x - l, width: l + rr, y: y - m.actualBoundingBoxAscent / 16, height: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 16 }; });
      let minGap = 99, nGrp = 0; const grp = [];
      const cOf = b => Math.round((b.x + b.width / 2) * 10);
      sl.map(l => l.getBBox()).sort((p, q) => cOf(p) - cOf(q) || p.y - q.y).forEach(b => {
        const c = cOf(b), G0 = grp[grp.length - 1];
        if (G0 && G0.c === c && Math.abs(b.y - G0.L[G0.L.length - 1].y) < 6) G0.L.push(b); else grp.push({ c, L: [b] }); });
      grp.forEach(({ L }) => { nGrp++; const x0 = Math.min(...L.map(b => b.x)) - 0.95, x1 = Math.max(...L.map(b => b.x + b.width)) + 0.95, y0 = Math.min(...L.map(b => b.y)), y1 = Math.max(...L.map(b => b.y + b.height));
        digits.filter(d => d.y < y1 && d.y + d.height > y0).forEach(d => { const g = d.x >= x1 ? d.x - x1 : (d.x + d.width <= x0 ? x0 - (d.x + d.width) : -1); if (g < 15) minGap = Math.min(minGap, g); }); });
      /* 期望增时线数：简谱画法的列（对里 trem2JpCol）逐列 floor(q4)−1；拍长＝简谱画法的时值（对里不带 2:1：4/dur×附点），只核满拍小节（实际拍数＝拍号的） */
      let expDash = 0, beatBad = 0;
      s.measures.forEach((m, mi) => (m.voxes || []).forEach(cols => { const R = __t2R(cols) || [], u = m.unit || s.unit, bt = m.beats || s.beats;
        let sum = 0, real = 0; (cols || []).forEach((c, ci) => { const jc = R[ci] ? __t2J(c) : c; if (jc.dur <= 2 && c.deg) expDash += Math.max(0, Math.floor((4 / jc.dur) * dotFactor(jc) + 1e-4) - 1);
          sum += R[ci] ? (4 / jc.dur) * dotFactor(jc) * (u / 4) : beatsOf(c, u); real += beatsOf(c, u); });
        if ((cols || []).length && Math.abs(real - bt) < 1e-6 && Math.abs(sum - bt) > 1e-6) beatBad++; }));
      const pairs = __pairs(s), nExp = pairs.reduce((a, p) => a + p.n, 0);
      out[id] = { sl: sl.length, nExp, grp: nGrp, pairs: pairs.length, minGap: +minGap.toFixed(2), dash, expDash, beatBad }; svg.remove(); }); return out; }, [SRC]);
  { const a = r['lib-os-lc4985985'], z = r['lib-os-lc6838113'];
    T(a.sl === a.nExp && z.sl === z.nExp && a.grp === 51 && z.grp === 188 && a.minGap >= 1 && z.minGap >= 1,
      'W11a 简谱：每对两数字之间画杠数条震音斜杠（阿特拉斯 51 组 × 3、侏儒 188 组 × 2），与两侧数字净距 ≥1px', JSON.stringify(r));
    T(a.pairs === 51 && z.pairs === 188 && a.dash === a.expDash && z.dash === z.expDash && !a.beatBad && !z.beatBad,
      'W11b 简谱按实际时值画：增时线数＝按实际时值（二分 2:1 不画增时线）；逐小节简谱拍长总和＝拍号', JSON.stringify({ a: [a.dash, a.expDash, a.beatBad], z: [z.dash, z.expDash, z.beatBad] })); }

  /* W12 老谱不变 */
  r = await pg.evaluate(([L]) => { const bad = [];
    L.forEach(x => { if (/lc4985985|lc6838113/.test(x.id)) return; const j = JSON.stringify(x.data); if (/"trem2"/.test(j)) bad.push(x.id + ' 含 trem2'); if (JSON.stringify(migrate(JSON.parse(j))) !== j) bad.push(x.id + ' migrate 改了'); });
    PRESETS.forEach((p, i) => { const j = JSON.stringify(p.make()); if (/"trem2"/.test(j)) bad.push('预设' + i); });
    return bad; }, [LIB]);
  T(!r.length, 'W12a 曲库其余 27 首与 16 个预设不含 trem2，migrate 后 JSON 逐字节不变', r.join('、'));
  { const REF = '16de944'; let refU = process.env.V704_REF ? (/^file:/.test(process.env.V704_REF) ? process.env.V704_REF : 'file://' + path.resolve(process.env.V704_REF)) : null;
    if (!refU) try { const t = path.join(require('os').tmpdir(), 'v704_ref_' + REF + '.html');
      if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, require('child_process').execFileSync('git', ['-C', ROOT, 'show', REF + ':muse-tab/index.html'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
      refU = 'file://' + t; } catch (_) { refU = null; }
    if (!refU || refU === F) console.log('⚠️ W12b 跳过：拿不到 v70.3 基线页（git show ' + REF + ' 失败；可设 env V704_REF）');
    else {
      const strip = s => { const c = JSON.parse(JSON.stringify(s)); c.measures.forEach(m => (m.voxes || []).forEach(v => (v || []).forEach(k => { if (k) delete k.trem2; }))); return c; };
      const ALL = LIB.map(x => ({ id: x.id, song: /lc4985985|lc6838113/.test(x.id) ? strip(x.data) : x.data }));
      const dump = async u => { const p2 = await ctx.newPage(); await p2.goto(u); await p2.waitForTimeout(800);
        const o = await p2.evaluate(A => A.map(x => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
          renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(x.song))), target: svg, paperW: 870, crop: true }); const h = svg.innerHTML; svg.remove();
          return { id: x.id, h, x: exportMusicXML(JSON.parse(JSON.stringify(x.song))) }; }), ALL); await p2.close(); return o; };
      const A1 = await dump(F), B1 = await dump(refU);
      const dif = A1.filter((x, i) => x.h !== B1[i].h || x.x !== B1[i].x).map(x => x.id + (x.h !== B1[A1.indexOf(x)].h ? '·谱面' : '') + (x.x !== B1[A1.indexOf(x)].x ? '·导出' : ''));
      T(!dif.length, 'W12b 没用到 trem2 的谱（曲库其余 27 首；两首去掉 trem2＝旧版本打开的样子）离屏谱面与 MusicXML 导出与 v70.3（' + REF + '）逐字节相同', dif.join('、') || A1.length + ' / ' + A1.length);
    } }
  T(!errs.length, 'W 段页面脚本错误 0', errs.join(' | '));
  await ctx.close();
}
