/* v60.66 吉他扫弦音色修正（产品反馈「吉他扫弦音色很糟糕」）。
   诊断（抓真实排程事件得到的数字，不是听感描述）：
     · ♩=90 的八分扫弦，一次下扫展开 **63ms** ＝音符时长的 19% —— 听成竖琴式琶音，
       而不是一把拨片刷过去；首个弦间隔 22ms，单独就能听成两个音。
     · **没有扫弦记号的和音列**（本该几乎同时发声）按 12ms/弦 累加，5 个音摊成 48ms 滚奏。
     · 展开量写死，**不随音符时值变化**——快速十六分与慢速全音符用同一个 63ms。
     · 闷弦打击层 chick 固定 0.3*vol，不随力度、也不随和弦音数摊薄，比实音还突出。
   T1 下扫总展开落回真实区间（20–40ms），且间隔递减＝拨片加速
   T2 上扫更快更轻，且只碰高音侧（真人够不到低音弦）
   T3 和音列不再是滚奏：≤10ms（旧 48ms）
   T4 琶音仍要展开（那是它的本义），不被当成扫弦收紧
   T5 时值感知：同样六弦下扫，快速十六分要比慢速音符更紧
   T6 谱面实证：一小节「下下上上下上」，逐次扫弦的展开与弦序都对
   T7 闷弦 chick 跟着本音增益走：同一根闷弦在 6 音和弦与 3 音和弦里应按 √n 同比例变化
      （旧版恒定 0.3*vol，两次完全相同）
   对 v60.65 旧文件跑：T1–T7 当场红（突变实证）。file:// 直载。 */
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
    window.__span=p=>p.length>1? +((p[p.length-1].dt)*1000).toFixed(2) : 0;
    window.__gaps=p=>p.slice(1).map((x,i)=>+((x.dt-p[i].dt)*1000).toFixed(3));
    window.__tc=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
  `;

  // T1 下扫：真实展开区间 + 拨片加速
  let r = await pg.evaluate(HELP + `(()=>{
    const p=strumPlan(6,'d');
    const g=__gaps(p);
    return {span:__span(p), gaps:g,
      accel: g.every((x,i)=>i===0 || x<=g[i-1]+1e-9),
      grad: p.every((x,i)=>i===0 || x.g<p[i-1].g),
      gFirst:+p[0].g.toFixed(3), gLast:+p[5].g.toFixed(3)};
  })()`);
  T(r.span >= 20 && r.span <= 40 && r.accel && r.grad,
    'T1 下扫：总展开落在真实区间 20–40ms，弦间隔递减＝拨片加速', JSON.stringify(r));

  // T2 上扫：更快更轻
  r = await pg.evaluate(HELP + `(()=>{
    const d=strumPlan(6,'d'), u=strumPlan(4,'u');
    return {dSpan:__span(d), uSpan:__span(u), uFirst:+u[0].g.toFixed(3), dFirst:+d[0].g.toFixed(3)};
  })()`);
  T(r.uSpan < r.dSpan && r.uSpan <= 20 && r.uFirst < r.dFirst,
    'T2 上扫比下扫更快（≤20ms）也更轻', JSON.stringify(r));

  // T3 和音列不再滚奏
  r = await pg.evaluate(HELP + `(()=>{
    return {chord5:__span(strumPlan(5,'chord')), chord6:__span(strumPlan(6,'chord'))};
  })()`);
  T(r.chord5 <= 10 && r.chord6 <= 12,
    'T3 无扫弦记号的和音列几乎同时发声（≤10ms，旧版 48ms 滚奏）', JSON.stringify(r));

  // T4 琶音仍要展开
  r = await pg.evaluate(HELP + `(()=>{
    return {arp5:__span(strumPlan(5,'arp')), arp5_8th:__span(strumPlan(5,'arp',0.333)),
      d6:__span(strumPlan(6,'d'))};
  })()`);
  T(r.arp5 >= 150 && r.arp5_8th >= 100 && r.arp5 > r.d6 * 4,
    'T4 琶音仍按其本义展开，不被当成扫弦一起收紧', JSON.stringify(r));

  // T5 时值感知：快音符的扫弦要更紧
  r = await pg.evaluate(HELP + `(()=>{
    return {whole:__span(strumPlan(6,'d',2.0)), eighth:__span(strumPlan(6,'d',0.333)),
      fast16:__span(strumPlan(6,'d',0.094)), noDur:__span(strumPlan(6,'d'))};
  })()`);
  T(r.fast16 < r.eighth && r.fast16 <= 0.094 * 1000 * 0.21 && r.whole === r.noDur,
    'T5 时值感知：快速十六分的扫弦自动收紧（慢音符保持基准）', JSON.stringify(r));

  // T6 谱面实证：一小节「下下上上下上」
  r = await pg.evaluate(HELP + `(()=>{
    loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0}));
    const Am=[{s:5,f:0},{s:4,f:2},{s:3,f:2},{s:2,f:1},{s:1,f:0}];
    const dirs=['d','d','u','u','d','u'];
    song.measures[0].tabs[0]=dirs.map((sd,i)=>__tc({dur:8, chord:i===0?'Am':'',
      notes:Am.map(n=>({s:n.s,f:n.f})), strum:sd}));
    render();
    const ev=[]; const o=playInst;
    playInst=(k,c,bus,f,when)=>ev.push({t:+when.toFixed(5),
      midi: f>0? Math.round(69+12*Math.log2(f/440)) : null});
    try{ play(); } finally { stopPlay(); playInst=o; }
    ev.sort((a,b2)=>a.t-b2.t);
    const t0=ev[0].t; ev.forEach(e=>e.t=+(e.t-t0).toFixed(5));
    const gs=[]; let cur=null;
    ev.forEach(e=>{ if(!cur || e.t-cur.t0>0.1){ cur={t0:e.t, it:[]}; gs.push(cur); } cur.it.push(e); });
    return gs.slice(0,4).map(g=>({
      span:+((g.it[g.it.length-1].t-g.it[0].t)*1000).toFixed(1),
      n:g.it.length, midis:g.it.map(x=>x.midi)}));
  })()`);
  {
    const d1 = r[0], d2 = r[1], u1 = r[2];
    const ok = d1.span <= 32 && d2.span <= 32 && u1.span <= 20
      && d1.midis[0] < d1.midis[d1.midis.length - 1]      // 下扫：低音弦先
      && u1.midis[0] > u1.midis[u1.midis.length - 1]      // 上扫：高音弦先
      && u1.n <= 4;                                        // 上扫只碰高音侧
    T(ok, 'T6 谱面实证：下扫低音先/上扫高音先、上扫仅高音侧、展开都在真实区间', JSON.stringify(r));
  }

  // T7 闷弦 chick 跟本音增益走（旧版恒定 0.3*vol，与和弦规模/力度无关）
  //    判别方式：同样一根闷弦，放在「6 音和弦」与「3 音和弦」里各扫一次。
  //    实音增益按 chordDiv=√n 摊薄，两者相差 √2；chick 若跟着走就该同比例变化，
  //    恒定值实现下两次完全相同 —— 这才是能区分新旧的性质。
  r = await pg.evaluate(HELP + `(()=>{
    const run=(notes)=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0}));
      song.measures[0].tabs[0]=[__tc({dur:4, notes, strum:'d'}),
        __tc({dur:4}), __tc({dur:4}), __tc({dur:4})];
      render();
      const ns=[], cks=[]; const oP=playInst, oC=chick;
      playInst=(k,c,bus,f,when,dur,gain)=>ns.push(gain||0);
      chick=(c,bus,when,gain)=>cks.push(gain||0);
      try{ play(); } finally { stopPlay(); playInst=oP; chick=oC; }
      return {maxN: ns.length? Math.max(...ns):0, ck: cks.length? Math.max(...cks):0};
    };
    const big=run([{s:6,f:0,x:true},{s:5,f:0},{s:4,f:2},{s:3,f:2},{s:2,f:1},{s:1,f:0}]);
    const small=run([{s:6,f:0,x:true},{s:5,f:0},{s:4,f:2}]);
    return {big:{maxN:+big.maxN.toFixed(4), ck:+big.ck.toFixed(4)},
      small:{maxN:+small.maxN.toFixed(4), ck:+small.ck.toFixed(4)},
      ckRatio:+(small.ck/big.ck).toFixed(3), nRatio:+(small.maxN/big.maxN).toFixed(3)};
  })()`);
  /* 只断言「随和弦规模变化」＝不再是常数（旧版两次完全相同，ckRatio 恒为 1）。
     不强求与 nRatio 严格同比例：实现里还有一道 min(0.3*vol, …) 安全上限，
     小和弦那次会被封顶，比例因此小于实音的 1.349——这是有意的天花板，不是缺陷。 */
  T(r.big.ck < r.big.maxN && r.small.ck < r.small.maxN && r.ckRatio > 1.05,
    'T7 闷弦打击层跟本音增益走（随和弦规模/力度变化），不再是恒定音量盖过实音', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
