/* v60.56 双吉他（多 TAB 声部）排版与选中（用户截图报告三项）。全部几何/命中断言，不看截图：
   T1 吉他1 的时值线（beatzone）四拍全部点得中——旧版被吉他2 的「列上方 18px 热区」整条盖住
      （实测吉他1 的 229–251 被吉他2 的 231–249 吃掉，后画的赢命中测试）
   T2 吉他2 的连音线弧不压吉他1 的时值线区（旧版 −18px，弧顶直接画进上一条的符杠区）
   T3 TAB 连音数字与简谱连音数字净距（旧版 −0.8px；括线数字挂在 stemY+9.5，
      而每条 TAB 声部只留到 stemY+6，溢出 3.5px 顶进下一行）
   T4 护栏：单吉他谱（只有一条 TAB 声部）行高一分不变——本版加的预留只对第二条起及有连音时生效
   T5 护栏：第二条 TAB 声部没有上方元素时不白加行距
   对 v60.55 旧文件跑：T1/T2/T3 当场红（突变实证）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const HELP = `
    window.__tc=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
    window.__vc=(deg,o)=>Object.assign({dur:4,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.__bb=el=>{const q=el.getBBox();
      return {x:+q.x.toFixed(1), y:+q.y.toFixed(1), r:+(q.x+q.width).toFixed(1), b:+(q.y+q.height).toFixed(1)};};
    /* 复刻用户截图情形：吉他1 整小节 16 分扫弦；吉他2 = 1 弦连音线 + 6 连音；简谱同拍也有 6 连音 */
    window.__mk2=()=>{
      const s=createSong('guitar',{beats:4,unit:4,key:'Am',nMea:1,nTab:1,nVox:1,lyr:0});
      loadSong(s); addVoice('tab');
      const m=song.measures[0];
      m.tabs[0]=Array.from({length:16},()=>__tc({dur:16,notes:[{s:5,f:0,x:true}],strum:'d'}));
      const g2=[];
      g2.push(__tc({dur:16,notes:[{s:1,f:11,tk:{mi:0,ci:3,si:1}}]}));
      for(let i=1;i<3;i++) g2.push(__tc({dur:16,notes:[{s:1,f:12}]}));
      g2.push(__tc({dur:16,notes:[{s:1,f:11}]}));
      for(let i=0;i<4;i++) g2.push(__tc({dur:16,notes:[{s:3,f:6}]}));
      for(let i=0;i<6;i++) g2.push(__tc({dur:16,tup:6,notes:[{s:2,f:13}]}));
      for(let i=0;i<4;i++) g2.push(__tc({dur:16,notes:[{s:1,f:8}]}));
      m.tabs[1]=g2;
      const v=[__vc(1),__vc(1)];
      for(let i=0;i<6;i++) v.push(__vc(3+(i%3),{dur:16,tup:6}));
      v.push(__vc(5));
      m.voxes[0]=v;
      blurSel=true; render();
      return song;
    };
    window.__arcs=()=>[...document.querySelectorAll('#score path')]
      .filter(x=>!x.getAttribute('transform'))
      .filter(x=>{const d=x.getAttribute('d')||''; return d.slice(0,2)==='M ' && d.indexOf(' Q ')>0;})
      .map(__bb);
    window.__tupNums=()=>[...document.querySelectorAll('#score text')]
      .filter(x=>x.getAttribute('font-size')==='8.5' && /^[0-9]+(:[0-9]+)?$/.test(x.textContent))
      .map(x=>({t:x.textContent, ...__bb(x)})).sort((a,c)=>a.y-c.y);
  `;

  // T1 吉他1 时值线四拍全部点得中（命中测试，非 bbox 推断）
  let r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const svg=document.getElementById('score');
    const hit=[0,1,2,3].map(bt=>{
      const z=svg.querySelector('[data-beatsel="0:0:'+bt+'"]');
      if(!z) return 'missing';
      const rr=z.getBoundingClientRect();
      const h=document.elementFromPoint(rr.x+rr.width/2, rr.y+rr.height/2);
      return h? (h.dataset.beatsel || ('OTHER:'+JSON.stringify(h.dataset))) : 'none';
    });
    return {hit, want:['0:0:0','0:0:1','0:0:2','0:0:3'].join()};
  })()`);
  T(r.hit.join() === r.want, 'T1 吉他1 时值线四拍全部命中自己（旧版全被吉他2 的列热区截走）', JSON.stringify(r));

  // T2 吉他2 的连音线弧不压吉他1 的时值线区
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const bz0=__bb(document.querySelector('[data-beatsel="0:0:0"]'));
    const arcs=__arcs();
    const arcTop=arcs.length? Math.min(...arcs.map(a=>a.y)) : null;
    return {bz0b:bz0.b, arcTop, clear: arcTop!=null? +(arcTop-bz0.b).toFixed(1) : null, nArc:arcs.length};
  })()`);
  T(r.nArc > 0 && r.clear > 2,
    'T2 吉他2 连音线不压吉他1 时值线区（旧版 −18px）', JSON.stringify(r));

  // T3 TAB 连音数字 vs 简谱连音数字净距
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const n=__tupNums();
    return {n, clear: n.length>=2? +(n[1].y-n[0].b).toFixed(1) : null};
  })()`);
  T(r.n.length >= 2 && r.clear > 2,
    'T3 TAB 连音数字与简谱连音数字不重叠（旧版 −0.8px）', JSON.stringify(r));

  // T4 护栏：单吉他谱行高一分不变（本版预留只对第二条 TAB 声部/有连音时生效）
  r = await pg.evaluate(HELP + `(()=>{
    const mk=(withTup)=>{
      const s=createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0});
      loadSong(s);
      song.measures[0].tabs[0]=Array.from({length:8},(_,i)=>__tc({dur:8,notes:[{s:3,f:5}]}));
      blurSel=true; render();
      return document.getElementById('score').getBBox().height;
    };
    const plain=mk(false);
    /* 同谱加 6 连音：只应多出括线数字的预留，不应爆量 */
    const s2=createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0});
    loadSong(s2);
    song.measures[0].tabs[0]=Array.from({length:8},()=>__tc({dur:8,tup:6,notes:[{s:3,f:5}]}));
    blurSel=true; render();
    const withTup=document.getElementById('score').getBBox().height;
    return {plain:+plain.toFixed(1), withTup:+withTup.toFixed(1), d:+(withTup-plain).toFixed(1)};
  })()`);
  T(r.plain > 0 && r.d >= 0 && r.d <= 26,
    'T4 护栏：单吉他谱加连音只多出括线预留（≤26px，不爆量）', JSON.stringify(r));

  // T5 护栏：第二条 TAB 声部没有上方元素（无和弦名/连音线/技法）时不白加行距
  r = await pg.evaluate(HELP + `(()=>{
    const build=(withTie)=>{
      const s=createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0});
      loadSong(s); addVoice('tab');
      const m=song.measures[0];
      m.tabs[0]=Array.from({length:4},()=>__tc({notes:[{s:5,f:0}]}));
      m.tabs[1]=Array.from({length:4},(_,i)=>__tc({notes:[{s:1,f:10}]}));
      if(withTie) m.tabs[1][0].notes[0].tk={mi:0,ci:2,si:1};
      blurSel=true; render();
      const t0=__bb(document.querySelector('.strcell[data-vi="0"][data-ci="0"][data-si="1"]'));
      const t1=__bb(document.querySelector('.strcell[data-vi="1"][data-ci="0"][data-si="1"]'));
      return +(t1.y-t0.y).toFixed(1);
    };
    const bare=build(false), tied=build(true);
    return {bare, tied, grew:+(tied-bare).toFixed(1)};
  })()`);
  T(r.bare > 0 && r.grew >= 20 && r.grew <= 34,
    'T5 行距按需增：无上方元素不加，有连音线才让出弧位（+20~34px）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
