/* v64.8 B4c 间距与避让（一）（2026-10 评审团 §6.3 B4c ②③⑤：P2-03 / P2-05）
   T1 只有女高写词的四声部合唱：无词声部之间的行距等于全曲没有歌词时的行距；女高仍留两行
   T2 无词声部不印段序号（段序号只出现在有词的声部）
   T3 编辑器切到「歌词」图层时所有声部的歌词行展开（方便点选填词），切回后收起
   T4 增时线画成几何线段；只有增时线的拍不再被挤窄（「5 –」不挤成一团）
   T5 简谱小节号 song.barNums：不印 / 行首（非首行）/ 每小节（第 1 小节除外）
   突变实证：对 v64.8 之前的文件复跑，T1–T5 全部报红（0/5）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad();
    window.satb=(nL, withLyr)=>{ const s=createSong('vocal',{title:'合唱',key:'C',beats:4,unit:4,nMea:4,nVox:4,lyr:nL});
      s.measures.forEach(m=>m.voxes.forEach((cols,vi)=>cols.forEach((c,i)=>{ c.deg=[1,3,5,1][i]; c.lyrics=(withLyr && vi===0)? ['春','秋'].slice(0,nL) : []; }))); return s; };
    window.gaps=()=>{ const M=sysMetrics(); return [1,2,3].map(i=>+(M.voxYs[i]-M.voxYs[i-1]).toFixed(1)); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ loadSong(satb(2,true)); setRibbon('vox'); render(); const a=gaps(); loadSong(satb(0,false)); render(); const none=gaps(); return {a, none}; })()`);
  T(!r.err && r.a[1] === r.none[1] && r.a[2] === r.none[2] && r.a[0] > r.none[0], 'T1 无词声部之间行距＝无歌词行距；有词声部照留', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ loadSong(satb(2,true)); render(); const t=document.getElementById('score').querySelectorAll('text[data-lyrsel]').length; return {labels:t}; })()`);
  T(!r.err && r.labels === 2, 'T2 段序号只印在有词声部', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ loadSong(satb(2,true)); setRibbon('lyr'); render(); const on=gaps(); setRibbon('vox'); render(); const off=gaps(); return {on, off}; })()`);
  T(!r.err && r.on[1] > r.off[1] && r.on[2] > r.off[2], 'T3 歌词图层展开所有声部歌词行，切回收起', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const s=createSong('vocal',{title:'增时',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[{dur:2,dotted:false,deg:5,acc:'',oct:0,lyrics:[],tie:false},{dur:4,dotted:false,deg:6,acc:'',oct:0,lyrics:[],tie:false},{dur:4,dotted:false,deg:7,acc:'',oct:0,lyrics:[],tie:false}];
    loadSong(s); render(); const svg=document.getElementById('score');
    const ds=[...svg.querySelectorAll('line.jdash')]; const txt=[...svg.querySelectorAll('text')].filter(t=>t.textContent==='–').length;
    const L=measureLayout(song.measures[0]); const xs=L.voxes[0].xs, dx=ds.length? +ds[0].getAttribute('data-x') : null;
    const mx=layoutSystems()[0].measures[0].x + MARGIN + STAFF_HEAD_W;
    const g1=dx-(mx+xs[0]), g2=(mx+xs[1])-dx;
    return {n:ds.length, txt, g1:+g1.toFixed(1), g2:+g2.toFixed(1), ratio:+(Math.min(g1,g2)/Math.max(g1,g2)).toFixed(2)}; })()`);
  T(!r.err && r.n === 1 && r.txt === 0 && r.ratio >= 0.45, 'T4 增时线为几何线段、增时线拍不被挤窄', JSON.stringify(r));

  /* T5 */
  r = await EV(`(()=>{ const s=createSong('vocal',{title:'小节号',key:'C',beats:4,unit:4,nMea:24,nVox:1,lyr:1}); s.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=1+i; })); loadSong(s); render();
    const cnt=()=>document.getElementById('score').querySelectorAll('.jbarno').length; const rows=layoutSystems().length;
    const off=cnt(); song.barNums='row'; render(); const row=cnt(); song.barNums='all'; render(); const all=cnt(); delete song.barNums; render();
    const lp=!!document.querySelector('#lp-bar [data-bn="row"]'); return {rows, off, row, all, lp}; })()`);
  T(!r.err && r.off === 0 && r.row === r.rows - 1 && r.all === 23 && r.lp, 'T5 简谱小节号 不印/行首/每小节', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
