/* v60.65 顶栏「节奏」组合两件事（用户报告）：
   ①「吉他谱编辑套用节奏时，不要自动出现 X 标记，只要时值节奏，
      否则使用这个节奏编辑了音符还要删除一遍 X 标记」
      —— applyDurCombo 的 TAB 分支原本按当前和弦指法合成整列音符（genTabCol）。
      这些音符的品位正好等于指法，×记谱模式下 render 会逐个显示成 ×（xDisp：品位==指法且 f<=4）。
      改为与简谱分支同口径：只换时值、把原有的音搬过来，不凭空造音。
   ②「吉他使用键盘数字输入音符不灵敏而且有延迟」
      —— 实测 50 小节双吉他谱：#score 是单个 svg，一次 innerHTML 写 1.76MB / 10673 节点约 197ms；
      而**一次数字键会重建两次 DOM**（setFret 的 mutate 一次 + markEntered→moveCol 一次，
      第一次当场被丢弃），两位品位 4 次。holdRender 合并后 1 次 / 2 次。
   T1 空列＋有和弦：套用节奏只出时值，不产生音符/扫弦/×
   T2 **数据丢失回归**：已写好的品位不能被清空（旧版无和弦时 shape=null → 整列被抹掉）
   T3 已有扫弦：原扫弦列保留，不再按指法复制成一整片
   T4 时值序列严格等于 combo.durs
   T5 护栏：简谱分支照旧搬运音高（本版只动 TAB 分支）
   T6 渲染合并：一次数字键只重建一次 #score；两位品位两次
   T7 holdRender 仍是**同步**的——inputDigit 返回时 DOM 已经更新（不是 rAF 拖到之后）
   对 v60.64 旧文件跑：T1/T2/T3/T6 当场红（突变实证）。file:// 直载。 */
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
    window.__mk=()=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0}));
      sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render(); return song;
    };
    window.__dump=()=>song.measures[0].tabs[0].map(c=>({
      d:c.dur, n:(c.notes||[]).map(x=>x.s+':'+x.f).join('+'), st:c.strum||'', pc:c.perc||''}));
  `;

  // T1 空列＋有和弦：只出时值
  let r = await pg.evaluate(HELP + `(()=>{
    __mk();
    song.measures[0].tabs[0][0].chord='Am';
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    applyDurCombo(DUR_COMBOS[0]);            // 八分×2
    const d=__dump();
    return {durs:d.map(c=>c.d).join(','), notes:d.map(c=>c.n).filter(Boolean),
      strums:d.map(c=>c.st).filter(Boolean), chord:song.measures[0].tabs[0][0].chord};
  })()`);
  T(r.notes.length === 0 && r.strums.length === 0 && r.chord === 'Am',
    'T1 套用节奏只出时值：不按指法凭空造音符/扫弦（×记谱下就不会冒出一片 ×）', JSON.stringify(r));

  // T2 数据丢失回归：已写好的品位必须保住
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    song.measures[0].tabs[0][0]=__tc({notes:[{s:3,f:11}]});   // 无和弦
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    const before=JSON.stringify(song.measures[0].tabs[0][0].notes);
    applyDurCombo(DUR_COMBOS[0]);
    const d=__dump();
    return {before, after:d[0].n, all:d.map(c=>c.n).filter(Boolean)};
  })()`);
  T(r.after === '3:11',
    'T2 数据丢失回归：无和弦时已写好的品位不再被静默清空', JSON.stringify(r));

  // T3 已有扫弦：保留，不复制成一整片
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    song.measures[0].tabs[0][0]=__tc({chord:'Am', notes:[{s:5,f:0},{s:4,f:2}], strum:'d'});
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    applyDurCombo(DUR_COMBOS[3]);            // 十六分×4
    const d=__dump().slice(0,4);
    return {first:d[0], rest:d.slice(1).map(c=>c.n+'/'+c.st)};
  })()`);
  T(r.first.n === '5:0+4:2' && r.first.st === 'd' && r.rest.every(x => x === '/'),
    'T3 已有扫弦：原列原样保留，其余列只有时值（不按指法铺满）', JSON.stringify(r));

  // T4 时值序列严格等于 combo.durs
  r = await pg.evaluate(HELP + `(()=>{
    const out={};
    [0,1,3,6].forEach(i=>{
      __mk(); sel={mi:0,row:'tab',vi:0,ci:0,si:3};
      applyDurCombo(DUR_COMBOS[i]);
      const want=DUR_COMBOS[i].durs.map(([d])=>d).join(',');
      const got=__dump().slice(0,DUR_COMBOS[i].durs.length).map(c=>c.d).join(',');
      out[DUR_COMBOS[i].name]={want, got, ok:want===got};
    });
    return out;
  })()`);
  T(Object.values(r).every(x => x.ok), 'T4 时值序列严格按组合落位', JSON.stringify(r));

  // T5 护栏：简谱分支照旧搬运音高
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    song.measures[0].voxes[0][0].deg=5; song.measures[0].voxes[0][0].oct=1;
    sel={mi:0,row:'vox',vi:0,ci:0,si:3};
    applyDurCombo(DUR_COMBOS[0]);
    const c=song.measures[0].voxes[0];
    return {deg:c[0].deg, oct:c[0].oct, durs:c.slice(0,2).map(x=>x.dur).join(',')};
  })()`);
  T(r.deg === 5 && r.oct === 1 && r.durs === '8,8',
    'T5 护栏：简谱分支照旧搬运音高（本版只动六线谱分支）', JSON.stringify(r));

  // T6 渲染合并：一次数字键只重建一次 #score
  r = await pg.evaluate(HELP + `(async ()=>{
    /* 造一份够大的谱，重建代价明显 */
    loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:20,nTab:1,nVox:1,lyr:0}));
    addVoice('tab');
    song.measures.forEach(m=>{ [0,1].forEach(v=>{ m.tabs[v]=[];
      for(let i=0;i<8;i++) m.tabs[v].push(__tc({dur:8,notes:[{s:1+(i%6),f:(i*3)%12}]})); }); });
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render();
    /* v68.4 起 #score 按谱行段增量替换（一次渲染会有多条 childList 变动记录），改数渲染次数本身：RENDER_STAT.n（render() 每次整谱排版 +1） */
    const count=fn=>new Promise(res=>{ const n0=RENDER_STAT.n; fn(); setTimeout(()=>res(RENDER_STAT.n-n0),0); });
    const one=await count(()=>{ sel.ci=0; inputDigit(5); });
    const two=await count(()=>{ sel.ci=0; inputDigit(1); inputDigit(2); });
    return {one, two, adv: autoAdvOn()};
  })()`);
  T(r.one === 1 && r.two === 2,
    'T6 渲染合并：一次数字键只重建一次 #score（旧版 2 次）、两位品位 2 次（旧版 4 次）', JSON.stringify(r));

  // T7 holdRender 仍是同步的
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    inputDigit(7);
    /* 不等任何 rAF/timeout，立刻读 DOM：品位 7 必须已经在谱面上 */
    const txt=[...document.querySelectorAll('#score text')].map(x=>x.textContent);
    return {has7: txt.indexOf('7')>=0, data: song.measures[0].tabs[0][0].notes.map(n=>n.s+':'+n.f).join()};
  })()`);
  T(r.has7 && r.data === '3:7',
    'T7 holdRender 仍是同步的：inputDigit 返回时谱面已更新（不靠 rAF 延后）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
