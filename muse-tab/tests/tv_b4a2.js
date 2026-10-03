/* v64.3 B4a 刻版小修（二）（2026-10 评审团 §6.3 B4a ④–⑦：P2-11 / P3-01 / P3-02 / P3-09）
   T1 和弦扩展音数字上标：Am7→Am⁷、Bm7b5→Bm⁷♭⁵、57→5⁷；C7/E 的斜杠落回基线；无数字的 G/B、Dm 不变
   T2 跨小节延音：被延长过来的音不重复写变音记号；本小节后面再出现同音照样重写
   T3 TAB＋简谱联排行：有技法字母时简谱行与 TAB 之间多留 14px 独立标注带，技法字母不与简谱数字相交；无技法时不变
   T4 联排谱非首行：行首小节号只出现一处（五线谱左侧），TAB 下方同一小节号不再重复显示
   突变实证：对 v64.3 之前的文件复跑，T1–T4 全部报红（0/4）。（文件名 tv_b4a2：B4a 第二批） */
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
    window.TC=(o)=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o||{}); })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ const sv=(n)=>{ const g=document.createElementNS('http://www.w3.org/2000/svg','text'); g.innerHTML=chordSvgLabel(n,12);
      const sups=[...g.querySelectorAll('tspan')].filter(t=>parseFloat(t.getAttribute('dy'))<0).map(t=>t.textContent);
      const dy=[...g.querySelectorAll('tspan')].reduce((a,t)=>a+(parseFloat(t.getAttribute('dy'))||0),0);
      return {txt:g.textContent, sups, net:+dy.toFixed(2)}; };
    return {am7:sv('Am7'), b75:sv('Bm7b5'), deg:sv('57'), c7e:sv('C7/E'), gb:sv('G/B'), dm:sv('Dm'), fs7:sv('F#7')}; })()`);
  T(!r.err && r.am7.sups.join() === '7' && r.b75.txt === 'Bm7♭5' && r.b75.sups.join() === '7♭5' && r.deg.sups.join() === '7'
    && r.c7e.sups.join() === '7' && r.c7e.net === 0 && r.gb.sups.length === 0 && r.dm.sups.length === 0 && r.fs7.sups.join() === '♯,7',
    'T1 扩展音数字上标、斜杠落回基线', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ const n=(m1)=>{ const s=createSong('instr',{title:'延音',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4,{acc:'#',tie:true})]; s.measures[1].voxes[0]=m1; loadSong(s); render();
      const d=SMUFL.accidentalSharp.d; return [...document.getElementById('score').querySelectorAll('path')].filter(p=>p.getAttribute('d')===d).length; };
    return {a:n([V(4,4,{acc:'#'}),V(5,4),V(6,4),V(7,4)]), b:n([V(4,4,{acc:'#'}),V(5,4),V(4,4,{acc:'#'}),V(6,4)])}; })()`);
  T(!r.err && r.a === 1 && r.b === 2, 'T2 跨小节延音不重复写变音；本小节后面同音照样重写', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ const gap=(tech)=>{ const s=createSong('solo',{title:'联排',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0}); s.tabJp=true;
      s.measures[0].tabs[0]=[TC({notes:[{s:2,f:1,tech:tech||undefined,tk:tech?{mi:0,ci:1,si:2}:undefined}]}),TC({notes:[{s:2,f:3}]}),TC({notes:[{s:1,f:0}]}),TC({notes:[{s:1,f:1}]})];
      loadSong(s); render(); const sys=layoutSystems()[0], e=systemExtras(sys), m=sysMetrics(e.topExtra,e.botExtra,e.tabExtra,e.tabGap2,e.diagExtra,e.tabBotPad,e.diagOn);
      const svg=document.getElementById('score');
      const h=[...svg.querySelectorAll('text')].find(t=>t.textContent==='h'); const hb=h? h.getBoundingClientRect() : null;
      const digs=[...svg.querySelectorAll('text')].filter(t=>/^[1-7]$/.test(t.textContent) && t.getAttribute('font-family')==='var(--font-num)').map(t=>t.getBoundingClientRect());
      const hit=hb? digs.some(d=>Math.min(d.right,hb.right)-Math.max(d.left,hb.left)>0.5 && Math.min(d.bottom,hb.bottom)-Math.max(d.top,hb.top)>0.5) : null;
      return {gap:+(m.tabTops[0]-m.tabJpB[0]).toFixed(1), hit}; };
    return {plain:gap(''), tech:gap('h')}; })()`);
  T(!r.err && r.tech.gap >= r.plain.gap + 14 && r.tech.hit === false, 'T3 联排简谱行与 TAB 之间留技法标注带，字母不压简谱数字', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const s=createSong('solo',{title:'联排号',key:'C',beats:4,unit:4,nMea:16,nTab:1,nVox:0,lyr:0}); s.tabStaff=true;
      s.measures.forEach(m=>{ m.tabs[0]=[TC({notes:[{s:1,f:0}]}),TC({notes:[{s:1,f:1}]}),TC({notes:[{s:2,f:0}]}),TC({notes:[{s:2,f:1}]})]; });
      loadSong(s); render(); const sys=layoutSystems(); if(sys.length<2) return {rows:sys.length};
      const no=meaNo(sys[1].measures[0].mi);
      const vis=[...document.getElementById('score').querySelectorAll('text')].filter(t=>t.textContent===no && getComputedStyle(t).opacity!=='0' && t.getAttribute('opacity')!=='0').length;
      return {rows:sys.length, no, vis}; })()`);
  T(!r.err && r.rows >= 2 && r.vis === 1, 'T4 联排谱行首小节号只出现一处', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
