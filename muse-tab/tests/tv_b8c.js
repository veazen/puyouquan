/* v64.7 B8 ③ 纯和弦谱按乐句断行（2026-10 评审团 §6.3 B8 ③：P3-08）
   T1 16 小节纯和弦谱在 1440 / 1100 / 1920 桌面宽下：每行小节数都是 4 的倍数（或 2 的倍数），末行除外——不再 3+3+3+3+3+1
   T2 段落标记处断行不受罚：第 6 小节起标「B 段」时，第 6 小节落在行首
   T3 只作用于纯和弦谱：同样 16 小节的歌谱断行与改前一致
   突变实证：对 v64.7 之前的文件复跑，T1–T2 报红（T3 为歌谱不回归护栏，新旧都绿）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const MK = `window.mkC=(label)=>{ const s=createSong('func',{title:'和弦',key:'C',beats:4,unit:4,nMea:16,nVox:1,lyr:0,ftype:'chord'});
  const ch=['C','Am7','Fmaj7','G7sus4','Em7','A7','Dm7','G7','Cmaj7','E7/G#','Am','C/G','F','Fm6','C/E','G'];
  s.measures.forEach((m,mi)=>{ (m.voxes[0]||[]).forEach((c,i)=>{ if(i===0) c.chord=ch[mi]; else if(i===2 && mi%3===1) c.chord=ch[(mi+5)%16]; }); });
  if(label) s.measures[5].label='B'; return s; };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = []; const out = {};
  for (const w of [1100, 1440, 1920]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 } }); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(900);
    out[w] = await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); ${MK}
      const rows=s=>{ loadSong(s); render(); return layoutSystems().map(x=>x.measures.length); };
      const a=rows(mkC(false)); const lb=(()=>{ loadSong(mkC(true)); render(); return layoutSystems().map(x=>x.measures[0].mi); })();
      const v=createSong('vocal',{title:'歌',key:'C',beats:4,unit:4,nMea:16,nVox:1,lyr:1}); v.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=1+i; c.lyrics=['啊']; }));
      return {chord:a, labelStarts:lb, vocal:rows(v)}; })()`).catch(e => ({ err: e.message }));
    await pg.close();
  }
  const okRows = a => a && a.slice(0, -1).every(k => k % 2 === 0) && a.slice(0, -1).filter(k => k % 4 !== 0).length <= 1;
  T([1100, 1440, 1920].every(w => !out[w].err && okRows(out[w].chord)), 'T1 纯和弦谱每行按乐句（4 或 2 的倍数）断行', JSON.stringify(Object.fromEntries([1100, 1440, 1920].map(w => [w, out[w].chord]))));
  T([1100, 1440, 1920].every(w => !out[w].err && out[w].labelStarts.includes(5)), 'T2 段落标记处断行（B 段落在行首）', JSON.stringify(Object.fromEntries([1100, 1440, 1920].map(w => [w, out[w].labelStarts]))));
  const base = { 1100: process.env.B8C_VOC1100, 1440: process.env.B8C_VOC1440, 1920: process.env.B8C_VOC1920 };
  T([1100, 1440, 1920].every(w => !out[w].err && (!base[w] || base[w] === JSON.stringify(out[w].vocal))), 'T3 歌谱断行不变', JSON.stringify(Object.fromEntries([1100, 1440, 1920].map(w => [w, out[w].vocal]))));
  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
