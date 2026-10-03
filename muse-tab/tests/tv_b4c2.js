/* v64.9 B4c 间距与避让（二）（2026-10 评审团 §6.3 B4c ①④：P2-03 / P2-14）
   T1 对照谱（五线谱＋简谱行）1=G 低音区：谱表下方加线与符头不压简谱数字（净距 ≥2px）
   T2 力度避让：简谱力度不压歌词；五线谱低音区加线音的力度不压符头与加线
   T3 延长号不压和弦名框（简谱、五线谱）
   突变实证：对 v64.9 之前的文件复跑，T1–T3 全部报红（0/3）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad();
    window.V=(d,u,o)=>Object.assign({dur:u,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.R=e=>{ const r=e.getBoundingClientRect(); return e.tagName==='line'? {left:r.left,right:r.right,top:r.top-0.5,bottom:r.bottom+0.5} : r; };   // 横线几何高度为 0，按线宽补半像素
    window.hit=(a,c)=>Math.min(a.right,c.right)-Math.max(a.left,c.left)>0.3 && Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top)>0.3;
    window.heads=svg=>{ const ds=['noteheadBlack','noteheadHalf','noteheadWhole'].map(n=>SMUFL[n].d); return [...svg.querySelectorAll('path')].filter(p=>ds.includes(p.getAttribute('d'))).map(R); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ const s=createSong('teach',{title:'对照',key:'G',beats:4,unit:4,nMea:2,nVox:1,lyr:0}); s.voxDual=[true];
    s.measures[0].voxes[0]=[V(1,4,{oct:-1}),V(2,4,{oct:-1}),V(3,4,{oct:-1}),V(5,4,{oct:-1})]; loadSong(s); render(); const svg=document.getElementById('score');
    const hs=heads(svg); const led=[...svg.querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')===0.9).map(R);
    const digs=[...svg.querySelectorAll('text')].filter(t=>/^[1-7]$/.test(t.textContent) && t.getAttribute('font-size')==='17').map(R);   // 简谱数字（17 号）
    const low=Math.max(...hs.map(h=>h.bottom), ...led.map(l=>l.bottom)); const top=Math.min(...digs.map(d=>d.top));
    return {low:Math.round(low), top:Math.round(top), clear:+(top-low).toFixed(1), n:digs.length}; })()`);
  T(!r.err && r.n >= 4 && r.clear >= 2, 'T1 对照谱低音区符头/加线不压简谱数字', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ const s=createSong('vocal',{title:'力度',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1});
    s.measures[0].voxes[0]=[V(1,16,{oct:-1,dyn:'mf',lyrics:['春']}),V(2,16,{lyrics:['眠']}),V(3,16,{dyn:'p',lyrics:['不']}),V(5,16,{oct:-1,lyrics:['觉']}),V(1,4),V(2,4),V(3,4)]; loadSong(s); render();   // 十六分＋低音点：力度被压到更低
    let svg=document.getElementById('score'); const dy=[...svg.querySelectorAll('text')].filter(t=>/^(mf|p)$/.test(t.textContent)).map(R);
    const ly=[...svg.querySelectorAll('text')].filter(t=>/^[春眠不觉]$/.test(t.textContent)).map(R);
    const a=dy.some(d=>ly.some(l=>hit(d,l)));
    const s2=createSong('instr',{title:'低音力度',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s2.measures[0].voxes[0]=[V(3,4,{oct:-1,dyn:'f'}),V(1,4,{oct:-1}),V(5,4,{oct:-2}),V(1,4)]; loadSong(s2); render(); svg=document.getElementById('score');
    const fd=[...svg.querySelectorAll('text')].filter(t=>t.textContent==='f').map(R); const ink=heads(svg).concat([...svg.querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')===0.9).map(R));
    const b2=fd.some(d=>ink.some(i=>hit(d,i)));
    return {dyN:dy.length, lyN:ly.length, jpHit:a, fN:fd.length, stHit:b2}; })()`);
  T(!r.err && r.dyN === 2 && r.lyN === 4 && !r.jpHit && r.fN === 1 && !r.stHit, 'T2 力度不压歌词/不压低音区符头与加线', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ const chk=(type)=>{ const s=createSong(type,{title:'延长',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[V(5,4,{chord:'C',ferm:true}),V(5,4),V(6,4),V(5,4,{chord:'G',ferm:true})]; loadSong(s); render(); const svg=document.getElementById('score');
      const fe=[...svg.querySelectorAll('path')].filter(p=>p.getAttribute('d')===SMUFL.fermataAbove.d).map(R);
      const bx=[...svg.querySelectorAll('[data-vchord] rect')].map(R);
      return {fe:fe.length, bx:bx.length, hit:fe.some(f=>bx.some(x=>hit(f,x)))}; };
    return {jp:chk('vocal'), st:chk('instr')}; })()`);
  T(!r.err && r.jp.fe === 2 && r.jp.bx === 2 && !r.jp.hit && r.st.fe === 2 && r.st.bx === 2 && !r.st.hit, 'T3 延长号不压和弦名框', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
