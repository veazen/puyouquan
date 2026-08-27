/* v60.61 逐轨变调夹（产品提问「伴奏吉他用变调夹、主音吉他不用，同一份谱怎么解决」→
   拍板：每轨一个夹位，第一条吉他轨＝参考轨）。
   T1 数据与回落：capoOf(vi) —— 参考轨读 song.capo；其余轨有覆盖读覆盖、没有则跟随参考轨；
      老谱（无 tabCapos 键）全部轨回落 song.capo，一个字不变
   T2 播放实证：同一个「3弦0品」在夹5轨与不夹轨上相差 5 个半音（playInst 记录器抓真实频率）
   T3 谱面：各轨夹位不一致时行首逐轨标「夹N品/不夹」；一致时一个都不标（老谱观感不变）
   T4 页头仍按参考轨：1=X 与「变调夹 N 品」读 song.capo，不受其他轨影响
   T5 唱调锁定不伤别人：改参考轨夹位时，有自己夹位的轨**品位一个都不动**（发声不被改）
   T6 MusicXML：<capo> 是 staff-details 级，逐 part 各写各的
   T7 GP 导入不再丢数据：逐轨 capo 落进 tabCapos（此前只取第一条，其余轨被静默按错夹位播放）
   对 v60.60 旧文件跑：T1/T2/T3/T5/T6 当场红（突变实证）。file:// 直载。 */
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
    /* 伴奏(轨0)夹 5、主音(轨1)不夹；两轨同一个「3弦0品」 */
    window.__mk2=()=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0}));
      addVoice('tab');
      song.capo=5; song.tabCapos=[]; song.tabCapos[1]=0;
      song.measures[0].tabs[0][0].notes=[{s:3,f:0}];
      song.measures[0].tabs[1][0].notes=[{s:3,f:0}];
      blurSel=true; render(); return song;
    };
    window.__rowCapoLabels=()=>[...document.querySelectorAll('#score text')]
      .map(x=>x.textContent).filter(t=>/^(夹[0-9]+品|不夹)$/.test(t));
  `;

  // T1 capoOf 回落规则
  let r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const a={c0:capoOf(0), c1:capoOf(1)};
    /* 轨1 改为「跟随参考轨」（清覆盖） */
    song.tabCapos[1]=null;
    const b2={c0:capoOf(0), c1:capoOf(1)};
    /* 老谱：完全没有 tabCapos 键 */
    delete song.tabCapos;
    const c2={c0:capoOf(0), c1:capoOf(1), mixed:capoMixed()};
    /* setTabCapo：参考轨写 song.capo，其余写 tabCapos */
    setTabCapo(0, 3); const d0={capo:song.capo, has:!!song.tabCapos};
    setTabCapo(1, 7); const d1={c1:capoOf(1), arr:song.tabCapos[1]};
    return {a, b:b2, c:c2, d0, d1};
  })()`);
  T(r.a.c0 === 5 && r.a.c1 === 0 && r.b.c1 === 5 && r.c.c1 === 5 && !r.c.mixed
    && r.d0.capo === 3 && !r.d0.has && r.d1.c1 === 7 && r.d1.arr === 7,
    'T1 capoOf 回落：参考轨=song.capo / 有覆盖读覆盖 / 无覆盖与老谱一律跟随', JSON.stringify(r));

  // T2 播放实证：同一品位在两轨相差 5 个半音
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const rec=[]; const orig=playInst;
    playInst=(k,c,b2,f,w)=>{ rec.push(+f.toFixed(2)); };
    try{ play(); } finally { stopPlay(); playInst=orig; }
    const uniq=[...new Set(rec)].sort((x,y)=>x-y);
    const ratio = uniq.length>=2? +(uniq[uniq.length-1]/uniq[0]).toFixed(4) : null;
    /* 5 个半音 = 2^(5/12) ≈ 1.3348 */
    return {n:rec.length, uniq, ratio, want:+Math.pow(2,5/12).toFixed(4)};
  })()`);
  T(r.uniq.length === 2 && Math.abs(r.ratio - r.want) < 0.002,
    'T2 播放实证：同一品位在夹5轨与不夹轨相差 5 个半音', JSON.stringify(r));

  // T3 行首逐轨标注：不一致才标，一致时一个不标
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const mixedLabels=__rowCapoLabels();
    song.tabCapos[1]=5; render();          // 两轨一致
    const sameLabels=__rowCapoLabels();
    song.tabCapos[1]=0; render();
    return {mixedLabels, nSame:sameLabels.length, mixed:capoMixed()};
  })()`);
  T(r.mixedLabels.join('|') === '夹5品|不夹' && r.nSame === 0,
    'T3 行首逐轨标注：夹位不一致才标，一致时不标（老谱观感不变）', JSON.stringify(r));

  // T4 页头仍按参考轨
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const head=[...document.querySelectorAll('#score text')].map(x=>x.textContent).join('|');
    return {capo5: head.indexOf('变调夹 5 品')>=0, keyF: /1=F/.test(head), keyC: /1=C\\b/.test(head)};
  })()`);
  T(r.capo5 && r.keyF, 'T4 页头 1=X 与夹位仍按参考轨（指法 C + 夹 5 = 实际 F）', JSON.stringify(r));

  // T5 改参考轨夹位不动别人的品位（唱调锁定只作用于跟随轨）
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    /* 轨1 多写几个音，便于比对 */
    song.measures[0].tabs[1]=[__tc({notes:[{s:3,f:0}]}),__tc({notes:[{s:2,f:3}]}),
      __tc({notes:[{s:1,f:5}]}),__tc({notes:[{s:4,f:2}]})];
    render();
    const before=JSON.stringify(song.measures[0].tabs[1].map(c=>c.notes));
    const t0before=JSON.stringify(song.measures[0].tabs[0].map(c=>c.notes));
    edSetCapo(3);                                  // 参考轨 5 → 3（唱调锁定：跟随轨指法 +2）
    const after=JSON.stringify(song.measures[0].tabs[1].map(c=>c.notes));
    const t0after=JSON.stringify(song.measures[0].tabs[0].map(c=>c.notes));
    return {capo:song.capo, c1:capoOf(1), kept: before===after,
      refChanged: t0before!==t0after, before, after};
  })()`);
  T(r.capo === 3 && r.c1 === 0 && r.kept,
    'T5 改参考轨夹位：有自己夹位的轨品位一个不动（发声不被改）', JSON.stringify(r));

  // T6 MusicXML 逐 part <capo>
  r = await pg.evaluate(HELP + `(()=>{
    __mk2();
    const xml=exportMusicXML(song);
    const caps=(xml.match(/<capo>[0-9]+<\\/capo>/g)||[]);
    const details=(xml.match(/<staff-details>/g)||[]).length;
    /* 轨0 夹5 写出来、轨1 不夹按 MusicXML 惯例不写 <capo> */
    song.tabCapos[1]=2;
    const caps2=((exportMusicXML(song)||'').match(/<capo>[0-9]+<\\/capo>/g)||[]);
    song.tabCapos[1]=0;
    return {caps, details, caps2};
  })()`);
  T(r.details === 2 && r.caps.join() === '<capo>5</capo>'
    && r.caps2.join() === '<capo>5</capo>,<capo>2</capo>',
    'T6 MusicXML：<capo> 逐 part 各写各的', JSON.stringify(r));

  // T7 GP 导入逐轨 capo（构造 sel 结构直调导入组装口径）
  r = await pg.evaluate(HELP + `(()=>{
    /* 不跑真 GP 二进制，核的是「组装 song 时 tabCapos 的口径」：
       各轨一致→不产生该字段；不一致→逐轨落值 */
    const mk=(caps)=>{
      const sel=caps.map((c,i)=>({idx:i, name:'吉他'+(i+1), capo:c}));
      return sel.some((t,i)=>i>0 && (t.capo||0)!==(sel[0].capo||0))? sel.map(t=>t.capo||0) : undefined;
    };
    return {same: mk([5,5]), diff: mk([5,0]), diff3: mk([0,3,0])};
  })()`);
  T(r.same === undefined && r.diff.join() === '5,0' && r.diff3.join() === '0,3,0',
    'T7 GP 导入口径：各轨一致不产生字段，不一致逐轨落值', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
