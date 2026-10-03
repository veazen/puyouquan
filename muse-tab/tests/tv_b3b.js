/* v65.5 B3b AI 产物入口（2026-10 评审团 §6.3 B3b ①②④：P1-39 MIDI 导入静默丢音）
   T1 同音高重叠 FIFO：C C E E（第二个 on 在第一个 off 之前）→ 1:4 1:4 3:4 3:4（此前第二个 C 成休止 0:4）
   T2 85% 时值清洗：四分 408 tick / 二分 816 tick → 4 4 2，无 16 分碎片与休止
   T3 ±40 tick 抖动：32 个四分 8 小节的旋律，起止都加确定性抖动 → 音数 32、小节 8、序列全同
   T4 songCompare：源谱 vs 导入谱 same=32 missing=0 extra=0 score=1；删一个音 → missing 1 score<1；哼唱路径（legato、无 clean）不受影响：parseSMF 以外的 quantizeToCols 旧行为保留
   突变实证：对 v65.5 之前的文件复跑，T1–T4 全部报红。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(() => {
    guardReplace = (p) => p(); hideStartPad(); blurSel = true;
    /* 极简 SMF format 0 写入：evs=[{t, on, n}]，同 tick 先 off 后 on */
    window.mkSMF = (tpq, evs) => { evs = evs.slice().sort((a, b2) => a.t - b2.t || (a.on ? 1 : 0) - (b2.on ? 1 : 0));
      const vlq = n => { n = Math.max(0, Math.round(n)); const o = [n & 0x7f]; n = Math.floor(n / 128); while (n) { o.unshift((n & 0x7f) | 0x80); n = Math.floor(n / 128); } return o; };
      const bytes = [0, 0xFF, 0x58, 4, 4, 2, 24, 8]; let last = 0;
      evs.forEach(e => { bytes.push(...vlq(e.t - last), e.on ? 0x90 : 0x80, e.n, e.on ? 80 : 0); last = e.t; });
      bytes.push(0, 0xFF, 0x2F, 0); const len = bytes.length;
      return new Uint8Array([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (tpq >> 8) & 255, tpq & 255, 0x4D, 0x54, 0x72, 0x6B, (len >>> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...bytes]); };
    window.colsOf = (s) => s.measures.map(m => m.voxes[0].map(c => c.deg + ':' + c.dur + (c.dotted ? '.' : '') + (c.tie ? '~' : '')).join(' ')).join('|');
    window.imp = (u8) => buildSongFromMIDI(parseSMF(u8), { mode: 'vocal', a: 0 }).song;
    /* 确定性伪随机（LCG） */
    window.rnd = (seed) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(() => { const u8 = mkSMF(480, [{ t: 0, on: true, n: 60 }, { t: 470, on: true, n: 60 }, { t: 480, on: false, n: 60 }, { t: 950, on: false, n: 60 },
      { t: 960, on: true, n: 64 }, { t: 1430, on: true, n: 64 }, { t: 1440, on: false, n: 64 }, { t: 1920, on: false, n: 64 }]);
    const smf = parseSMF(u8); const s = imp(u8); return { n: smf.tracks[0].notes.length, cols: colsOf(s), nMea: s.measures.length }; });
  T(!r.err && r.n === 4 && r.cols === '1:4 1:4 3:4 3:4' && r.nMea === 1, 'T1 同音高重叠 FIFO 配对，不吞音', JSON.stringify(r));

  /* T2 */
  r = await EV(() => { const u8 = mkSMF(480, [{ t: 0, on: true, n: 60 }, { t: 408, on: false, n: 60 }, { t: 480, on: true, n: 62 }, { t: 888, on: false, n: 62 }, { t: 960, on: true, n: 64 }, { t: 1776, on: false, n: 64 }]);
    const s = imp(u8); return { cols: colsOf(s), nMea: s.measures.length }; });
  T(!r.err && r.cols === '1:4 2:4 3:2' && r.nMea === 1, 'T2 85% 时值吸附到干净时值（无碎片）', JSON.stringify(r));

  /* T3 + T4 */
  r = await EV(() => { const degs = [1, 2, 3, 5, 6, 5, 3, 2, 1, 3, 5, 6, 5, 3, 2, 1, 2, 3, 5, 6, 1, 6, 5, 3, 2, 3, 5, 3, 2, 1, 2, 1];
    const midi = degs.map(d => 60 + DEG_SEMI[d]); const R = rnd(7); const evs = [];
    midi.forEach((m, i) => { const t0 = i * 480 + Math.round((R() * 2 - 1) * 40), t1 = i * 480 + 408 + Math.round((R() * 2 - 1) * 40); evs.push({ t: Math.max(0, t0), on: true, n: m }, { t: t1, on: false, n: m }); });
    const s = imp(mkSMF(480, evs)); const seq = s.measures.flatMap(m => m.voxes[0]).filter(c => c.deg).map(c => c.deg + '/' + c.oct + ':' + c.dur).join(' ');
    const want = degs.map(d => d + '/0:4').join(' ');
    const src = createSong('vocal', { title: '源', key: 'C', beats: 4, unit: 4, nMea: 8, nVox: 1, lyr: 0 });
    src.measures.forEach((m, mi) => { m.voxes[0] = degs.slice(mi * 4, mi * 4 + 4).map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false })); });
    const cmp = songCompare(src, s); const dmg = JSON.parse(JSON.stringify(s)); dmg.measures[3].voxes[0][1].deg = 0; const cmp2 = songCompare(src, dmg);
    /* 哼唱路径护栏：不传 clean 的 quantizeToCols 对 85% 四分仍按旧法（4.~ 16 之类碎片），证明清洗只在 MIDI 导入开 */
    const old = quantizeToCols([{ midi: 60, start: 0, dur: 408 }], 480, 4, 4, 60); const oldCols = old.measures[0].map(c => c.deg + ':' + c.dur + (c.dotted ? '.' : '')).join(' ');
    const sa = seq.split(' '), wa = want.split(' '); let di = -1; for (let i = 0; i < Math.max(sa.length, wa.length); i++) if (sa[i] !== wa[i]) { di = i; break; }
    return { n: seq.split(' ').length, nMea: s.measures.length, same: seq === want, seq: di < 0 ? 'eq' : ('@' + di + ' got ' + sa[di] + ' want ' + wa[di] + ' ctx ' + sa.slice(Math.max(0, di - 2), di + 3).join(' ')), cmp, cmp2: { missing: cmp2.missing, score: +cmp2.score.toFixed(3) }, oldCols }; });
  T(!r.err && r.n === 32 && r.nMea === 8 && r.same, 'T3 ±40 tick 抖动：32 音 8 小节序列全同', JSON.stringify({ n: r.n, nMea: r.nMea, same: r.same, seq: r.seq, err: r.err }));
  T(!r.err && r.cmp && r.cmp.same === 32 && r.cmp.missing === 0 && r.cmp.extra === 0 && r.cmp.score === 1 && r.cmp.meaA === 8 && r.cmp.meaB === 8 && r.cmp2.missing === 1 && r.cmp2.score < 1 && /^1:4\. 0:16$|^1:4\./.test(r.oldCols) === false && r.oldCols !== '1:4',
    'T4 songCompare 事件级比对；哼唱路径旧量化行为保留', JSON.stringify({ cmp: r.cmp, cmp2: r.cmp2, oldCols: r.oldCols, err: r.err }));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
