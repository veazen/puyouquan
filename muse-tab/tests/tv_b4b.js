/* v64.3 B4b 五线谱和弦刻版（2026-10 评审团 §6.3 B4b：P1-14）
   T1 二度错位以符干为轴：符干朝下（高音区）二度的下方音错到符干左侧、朝上（低音区）上方音错到右侧——两种方向符头都骑在符干两侧；加线跨过错位符头
   T2 临时记号分列：六度以内的多个临时记号从最高音起错列，记号彼此不相交、也不压符头
   T3 附点和弦：每个音都有附点（线上音的附点挪到上方间内）
   突变实证：对 v64.3 之前的文件复跑，T1–T3 全部报红（0/3）。 */
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
    window.one=(col)=>{ const s=createSong('instr',{title:'和弦',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[col, V(0,4), V(0,4), V(0,4)].map((c,i)=>i===0? c : Object.assign(c,{dur:col.dotted? (i===1?8:4) : 4}));
      if(col.dotted) s.measures[0].voxes[0]=[col, V(0,8), V(0,4), V(0,4)];
      loadSong(s); render(); return document.getElementById('score'); };
    window.heads=(svg)=>{ const ds=['noteheadBlack','noteheadHalf','noteheadWhole'].map(n=>SMUFL[n].d);
      return [...svg.querySelectorAll('path')].filter(p=>ds.includes(p.getAttribute('d'))).map(p=>p.getBoundingClientRect()); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ const chk=(col)=>{ const svg=one(col); const hs=heads(svg);
      const cx=hs.map(h=>(h.left+h.right)/2);
      const st=[...svg.querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')===1.1 && Math.abs(+l.getAttribute('x1')-+l.getAttribute('x2'))<0.01)
        .map(l=>l.getBoundingClientRect()).filter(rc=>cx.some(x=>Math.abs(rc.left-x)<12));
      const sx=st.length? st[0].left : null;
      const led=[...svg.querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')===0.9).map(l=>l.getBoundingClientRect()).filter(rc=>cx.some(x=>Math.abs((rc.left+rc.right)/2-x)<14));
      return {n:hs.length, cx:cx.map(x=>Math.round(x)), sx:sx==null?null:Math.round(sx), straddle: sx!=null && Math.min(...cx)<sx && Math.max(...cx)>sx,
        ledL: led.length? Math.round(Math.min(...led.map(l=>l.left))) : null, minHeadL: Math.round(Math.min(...hs.map(h=>h.left))) }; };
    return {down:chk(V(6,4,{oct:1, adds:[{deg:7,acc:'',oct:1}]})), up:chk(V(3,4,{adds:[{deg:4,acc:'',oct:0}]}))}; })()`);
  T(!r.err && r.down.n === 2 && r.down.straddle && r.up.straddle && r.down.ledL != null && r.down.ledL <= r.down.minHeadL - 1,
    'T1 二度错位以符干为轴（干朝下错左、朝上错右），加线跨过错位符头', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ const svg=one(V(2,4,{acc:'#', adds:[{deg:4,acc:'#',oct:0},{deg:6,acc:'b',oct:0}]}));
    const ds=['accidentalSharp','accidentalFlat'].map(n=>SMUFL[n].d);
    const ac=[...svg.querySelectorAll('path')].filter(p=>ds.includes(p.getAttribute('d'))).map(p=>p.getBoundingClientRect());
    const hs=heads(svg); let hit=0;
    for(let i=0;i<ac.length;i++) for(let j=i+1;j<ac.length;j++){ const a=ac[i], c=ac[j]; if(Math.min(a.right,c.right)-Math.max(a.left,c.left)>0.3 && Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top)>0.3) hit++; }
    const onHead=ac.some(a=>hs.some(h=>Math.min(a.right,h.right)-Math.max(a.left,h.left)>0.3 && Math.min(a.bottom,h.bottom)-Math.max(a.top,h.top)>0.3));
    return {n:ac.length, hit, onHead, xs:ac.map(a=>Math.round(a.left))}; })()`);
  T(!r.err && r.n === 3 && r.hit === 0 && !r.onHead, 'T2 六度内临时记号错列、互不相交、不压符头', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ const svg=one(V(1,4,{dotted:true, adds:[{deg:3,acc:'',oct:0},{deg:5,acc:'',oct:0}]}));
    const dots=[...svg.querySelectorAll('circle')].filter(c=>+c.getAttribute('r')===1.6).map(c=>+c.getAttribute('cy'));
    return {n:dots.length, uniq:new Set(dots).size}; })()`);
  T(!r.err && r.n === 3 && r.uniq === 3, 'T3 附点和弦每个音都有附点（线上音挪到上方间内）', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
