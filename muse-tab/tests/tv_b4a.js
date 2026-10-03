/* v64.2 B4a 刻版小修（一）（2026-10 评审团 §6.3 B4a ①–③：P1-13 / P1-15 / P2-04）
   T1 教学对照谱（五线谱＋简谱行）页头有 1=X 与拍号、调号热区可点；转调后 1=X 跟着变
   T2 对照谱的简谱行有自己的小节线、延音弧、三连音弧（与同谱关掉简谱行相比各多一套）
   T3 首小节反复开始：反复点在拍号包围盒右侧（五线谱 / 六线谱 / 联排五线谱）；联排五线谱画出反复结束与终止线
   T4 行内和弦图带只在本行有和弦图时预留：歌谱 diagH=12；弹唱谱有和弦的行 56、无和弦的行 12
   突变实证：对 v64.2 之前的文件复跑，T1–T4 全部报红（0/4）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad();
    window.V=(d,u,o)=>Object.assign({dur:u,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.TC=(o)=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o||{});
    window.mkTeach=(dual)=>{ const s=createSong('teach',{title:'对照',key:'G',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
      s.voxDual=[!!dual];
      s.measures[0].voxes[0]=[V(1,4,{tie:true}),V(1,4),V(2,8,{tup:3}),V(3,8,{tup:3}),V(4,8,{tup:3}),V(5,4)];
      s.measures[0].voxes[0]=s.measures[0].voxes[0].map(c=>c.tup? Object.assign(c,{dur:8}) : c);
      s.measures[1].voxes[0]=[V(5,4),V(3,4),V(1,2)];
      return s; };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ loadSong(mkTeach(true)); render(); const svg=document.getElementById('score');
    const key=[...svg.querySelectorAll('text')].map(t=>t.textContent).find(t=>/^1=/.test(t))||'';
    const hz=!!svg.querySelector('[data-hd="key"]'), mt=!!svg.querySelector('[data-hd="meter"]');
    mutate(()=>{ transposeSong(song, 2); }); render();
    const key2=[...document.getElementById('score').querySelectorAll('text')].map(t=>t.textContent).find(t=>/^1=/.test(t))||'';
    return {dt:docType(song), key, hz, mt, key2}; })()`);
  T(r.dt === 'teach' && r.key === '1=G' && r.hz && r.mt && r.key2 === '1=A', 'T1 对照谱页头 1=X/拍号/调号热区，转调跟随', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ const cnt=(dual)=>{ loadSong(mkTeach(dual)); render(); const svg=document.getElementById('score');
      const vl=[...svg.querySelectorAll('line')].filter(l=>Math.abs(+l.getAttribute('x1')-+l.getAttribute('x2'))<0.01 && Math.abs(+l.getAttribute('y2')-+l.getAttribute('y1'))>8 && Math.abs(+l.getAttribute('y2')-+l.getAttribute('y1'))<40).length;
      const fills=[...svg.querySelectorAll('path')].filter(p=>{ const d=p.getAttribute('d')||''; return /Q/.test(d) && /Z\\s*$/.test(d.trim()); }).length;
      const tup=[...svg.querySelectorAll('text')].filter(t=>t.textContent==='3' && t.getAttribute('font-style')==='italic').length;
      return {vl, ties:fills, tup}; };
    return {off:cnt(false), on:cnt(true)}; })()`);
  T(!r.err && r.on.vl >= r.off.vl + 2 && r.on.ties > r.off.ties && r.on.tup === r.off.tup * 2 && r.off.tup >= 1,
    'T2 对照谱简谱行补小节线、延音弧、三连音弧', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ const out={};
    const chk=(s, dotR)=>{ s.measures[0].repeatStart=true; s.measures[1].repeatEnd=true; loadSong(s); render(); const svg=document.getElementById('score');
      const dts=[...svg.querySelectorAll('circle')].filter(c=>+c.getAttribute('r')===dotR).map(c=>c.getBoundingClientRect());
      const d4=SMUFL['timeSig4'].d; const ts=[...svg.querySelectorAll('path')].filter(p=>p.getAttribute('d')===d4).map(p=>p.getBoundingClientRect());
      return {dots:dts.length, minDot:dts.length? Math.round(Math.min(...dts.map(r2=>r2.left))) : null, tsR:ts.length? Math.round(Math.max(...ts.filter(t=>t.left<(dts.length?Math.min(...dts.map(r2=>r2.left))+40:1e9)).map(t=>t.right))) : null}; };
    out.staff=chk(createSong('instr',{title:'反复',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0}), 1.4);
    /* 六线谱：拍号是文字（粗体 14 号）；量反复点与首小节拍号文字右缘 */
    { const s=createSong('guitar',{title:'反复T',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0}); s.measures[0].repeatStart=true; loadSong(s); render();
      const svg=document.getElementById('score'); const dts=[...svg.querySelectorAll('circle')].filter(c=>+c.getAttribute('r')===1.8).map(c=>c.getBoundingClientRect());
      const tsT=[...svg.querySelectorAll('text')].filter(t=>t.textContent==='4' && t.getAttribute('font-weight')==='bold').map(t=>t.getBoundingClientRect());
      out.tab={dots:dts.length, minDot:dts.length? Math.round(Math.min(...dts.map(r2=>r2.left))) : null, tsR:tsT.length? Math.round(Math.min(...tsT.map(t=>t.right))) : null}; }
    /* 联排：TAB 上方五线谱 */
    { const s=createSong('solo',{title:'联排',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0}); s.tabStaff=true;
      s.measures[0].tabs[0]=[TC({notes:[{s:1,f:0}]}),TC({notes:[{s:1,f:1}]}),TC({notes:[{s:1,f:3}]}),TC({notes:[{s:1,f:5}]})];
      out.joint=chk(s, 1.4); out.joint.rects=[...document.getElementById('score').querySelectorAll('rect[fill="var(--ink)"]')].filter(x=>+x.getAttribute('width')===2).length; }
    return out; })()`);
  const okD = o => o && o.dots >= 2 && o.minDot != null && o.tsR != null && o.minDot > o.tsR;
  T(!r.err && okD(r.staff) && okD(r.tab) && okD(r.joint) && r.joint.rects >= 2, 'T3 首小节反复点在拍号右侧（五线谱/六线谱/联排）；联排画反复线', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const dh=()=>layoutSystems().map(sys=>{ const e=systemExtras(sys); return sysMetrics(e.topExtra, e.botExtra, e.tabExtra, e.tabGap2, e.diagExtra, e.tabBotPad, e.diagOn).diagH; });
    loadSong(createSong('vocal',{title:'歌',key:'C',beats:4,unit:4,nMea:4,nVox:1,lyr:1})); render(); const voc=dh();
    const s=createSong('guitar',{title:'弹唱',key:'C',beats:4,unit:4,nMea:16,nTab:1,nVox:1,lyr:1}); s.measures[0].tabs[0][0].chord='C'; loadSong(s); render(); const gtr=dh();
    return {voc, gtr}; })()`);
  T(!r.err && r.voc.every(x => x === 12) && r.gtr[0] === 56 && r.gtr.length > 1 && r.gtr.slice(1).every(x => x === 12), 'T4 和弦图带只在本行有图时预留 56', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
