/* v60.69 简谱装饰音发声 + 六线谱双倚音技巧链（产品报告四项）。
   T1 装饰音**发声**（此前 col.orn 在整个播放调度里一次都没出现过——只画不响）：
      上波音 主→上邻→主、下波音 主→下邻→主、回音 上→主→下→主
   T2 邻音是**随调的自然音级**，不是一律全音：C 大调里 1 的下邻＝7（小二度）、
      3 的上邻＝4（小二度）；这是简谱惯例，写死半音数就错了
   T3 颤音铺满时值：主音与上邻快速交替，次数随时值走
   T4 装饰音不吃掉主音时值：装饰音在拍头快速奏出，主音占满剩余并接回延音链
   T5 六线谱双倚音：逐音相连——N 个倚音应有 N 条弧、N 个技巧字母
      （此前无论几个倚音都只画一条「组→主音」的弧和一个字母）
   T6 技巧字母不再压住倚音数字（此前双倚音 5h7：字母 h 在 x=106.8、数字 7 在 x=107）
   T7 占位与渲染同源：带技巧的双倚音步距变宽，排版预留必须同步变宽，
      否则倚音会溢出到相邻列（渲染 STEPG 与排版 8+7n 此前是两个各写的字面量）
   对 v60.68 旧文件跑：T1–T7 当场红（突变实证）。file:// 直载。 */
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
    window.__vc=o=>Object.assign({dur:4,dotted:false,deg:0,acc:'',oct:0,lyrics:[],tie:false},o);
    window.__tc=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
    /* 单音符小节，只带一个装饰记号，抓它排出的所有发声事件 */
    window.__runOrn=(orn,deg)=>{
      loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
      song.measures[0].voxes[0]=[__vc({deg:deg||1, orn}), __vc({deg:0}), __vc({deg:0}), __vc({deg:0})];
      render();
      const ev=[]; const o=playInst;
      playInst=(k,c,bus,f,when,dur)=>ev.push({t:when, m:Math.round(69+12*Math.log2(f/440)), d:dur||0});
      try{ play(); } finally { stopPlay(); playInst=o; }
      ev.sort((a,b2)=>a.t-b2.t);
      const t0=ev.length? ev[0].t : 0;
      return ev.map(e=>({dt:Math.round((e.t-t0)*1000), m:e.m, d:+e.d.toFixed(3)}));
    };
    /* 六线谱倚音渲染取样 */
    window.__runGrace=(gnotes,tk)=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0}));
      const cs=song.measures[0].tabs[0];
      cs[0]=__tc({notes:[{s:3,f:9}], grace:{notes:gnotes, dur:16, tk}});
      cs[1]=__tc({notes:[{s:3,f:7}]});
      blurSel=true; render();
      const tx=[...document.querySelectorAll('#score text')].map(x=>({
        t:x.textContent, x:+x.getAttribute('x'), fs:x.getAttribute('font-size'),
        it:x.getAttribute('font-style')||''}));
      return {
        nums: tx.filter(x=>x.fs==='8').map(x=>({t:x.t, x:x.x})),
        letters: tx.filter(x=>x.it==='italic').map(x=>({t:x.t, x:x.x})),
        arcs: [...document.querySelectorAll('#score path')]
          .filter(x=>(x.getAttribute('d')||'').indexOf('Q')>0).length,
        hit: [...document.querySelectorAll('[data-tabgrace]')]
          .map(x=>({w:+x.getAttribute('width'), x:+x.getAttribute('x')}))[0]
      };
    };
  `;

  // T1 装饰音发声
  let r = await pg.evaluate(HELP + `(()=>({
    plain:__runOrn(undefined), up:__runOrn('up'), down:__runOrn('down'), turn:__runOrn('turn')
  }))()`);
  T(r.plain.length === 1 && r.up.length === 3 && r.down.length === 3 && r.turn.length === 4
    && r.up.map(x => x.m).join() === '60,62,60'
    && r.down.map(x => x.m).join() === '60,59,60'
    && r.turn.map(x => x.m).join() === '62,60,59,60',
    'T1 装饰音发声：上波音 主→上邻→主、下波音 主→下邻→主、回音 上→主→下→主', JSON.stringify(r));

  // T2 邻音是自然音级（随调），不是一律全音
  r = await pg.evaluate(HELP + `(()=>({
    up1:__runOrn('up',1).map(x=>x.m), down1:__runOrn('down',1).map(x=>x.m),
    up3:__runOrn('up',3).map(x=>x.m), down3:__runOrn('down',3).map(x=>x.m),
    seq:{ up1:ornSeqMidis({deg:1,oct:0,orn:'up'},60), turn3:ornSeqMidis({deg:3,oct:0,orn:'turn'},60) }
  }))()`);
  T(r.up1[1] - r.up1[0] === 2          // 1→2 全音
    && r.up1[0] - r.down1[1] === 1     // 1→7 小二度（不是全音）
    && r.up3[1] - r.up3[0] === 1       // 3→4 小二度
    && r.up3[0] - r.down3[1] === 2,    // 3→2 全音
    'T2 邻音随调取自然音级：1 的下邻是小二度、3 的上邻是小二度（写死半音数就错）', JSON.stringify(r));

  // T3 颤音铺满时值
  r = await pg.evaluate(HELP + `(()=>{
    const tr=__runOrn('tr');
    const ms=[...new Set(tr.map(x=>x.m))].sort((a,b2)=>a-b2);
    const alt=tr.every((x,i)=>i===0 || x.m!==tr[i-1].m);
    return {n:tr.length, ms, alt, span:tr[tr.length-1].dt};
  })()`);
  T(r.n >= 6 && r.ms.join() === '60,62' && r.alt && r.span >= 400,
    'T3 颤音：主音与上邻快速交替铺满时值', JSON.stringify(r));

  // T4 装饰音不吃掉主音时值
  r = await pg.evaluate(HELP + `(()=>{
    const p0=__runOrn(undefined), up=__runOrn('up');
    return {plainDur:p0[0].d, ornHeadDur:up[0].d, ornMainDur:up[2].d, ornMainAt:up[2].dt,
      total:+(up[2].dt/1000 + up[2].d).toFixed(3)};
  })()`);
  T(r.ornHeadDur < 0.12 && r.ornMainDur > 0.4
    && Math.abs(r.total - r.plainDur) < 0.02,
    'T4 装饰音在拍头快速奏出，主音占满剩余时值（总长与无装饰时一致）', JSON.stringify(r));

  // T5 双倚音逐音相连：N 个倚音 → N 条弧、N 个字母
  r = await pg.evaluate(HELP + `(()=>({
    one:__runGrace([{s:3,f:7}],'h'),
    two:__runGrace([{s:3,f:5},{s:3,f:7}],'h'),
    three:__runGrace([{s:3,f:5},{s:3,f:7},{s:3,f:9}],'p'),
    twoNoTk:__runGrace([{s:3,f:5},{s:3,f:7}],'')
  }))()`);
  T(r.one.arcs === 1 && r.one.letters.length === 1
    && r.two.arcs === 2 && r.two.letters.length === 2
    && r.three.arcs === 3 && r.three.letters.length === 3
    && r.twoNoTk.arcs === 2 && r.twoNoTk.letters.length === 0,
    'T5 倚音逐音相连：N 个倚音 N 条弧 N 个技巧字母（无技巧时只有弧）', JSON.stringify(r));

  // T6 技巧字母不再压住倚音数字
  r = await pg.evaluate(HELP + `(()=>{
    const g=__runGrace([{s:3,f:5},{s:3,f:7}],'h');
    const minGap=Math.min(...g.letters.map(L=>Math.min(...g.nums.map(n=>Math.abs(L.x-n.x)))));
    return {nums:g.nums, letters:g.letters, minGap:+minGap.toFixed(1)};
  })()`);
  T(r.minGap >= 5,
    'T6 技巧字母与倚音数字不再撞在一起（旧版最近仅 0.2px）', JSON.stringify(r));

  // T7 占位与渲染同源：带技巧的双倚音要占更宽，热区/预留同步
  r = await pg.evaluate(HELP + `(()=>{
    const noTk=__runGrace([{s:3,f:5},{s:3,f:7}],'');
    const tk=__runGrace([{s:3,f:5},{s:3,f:7}],'h');
    const step=g=>g.nums.length>1? +(g.nums[1].x-g.nums[0].x).toFixed(1) : null;
    return {stepNoTk:step(noTk), stepTk:step(tk), hitNoTk:noTk.hit.w, hitTk:tk.hit.w,
      wFn:{plain:tabGraceW({notes:[1,2],tk:''}), withTk:tabGraceW({notes:[1,2],tk:'h'})}};
  })()`);
  T(r.stepTk > r.stepNoTk && r.hitTk > r.hitNoTk
    && r.wFn.withTk > r.wFn.plain
    && r.hitTk === r.stepTk + 14,
    'T7 带技巧的倚音步距变宽，热区与排版预留同源跟随（不再两处各写字面量）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
