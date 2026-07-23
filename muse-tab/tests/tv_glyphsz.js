/* v43.0 显示优化回归：
   T1 简谱变化音放大左置：单变音 ♯/♭/× font-size 14、双变音 ♭♭ font-size 12，均在数字左侧（x<数字 nx）
   T2 吉他分解/闷音 × 放大：TAB 内 × font-size 12.5（此前 10）
   file:// 直载；每次载入前清 undoStack 绕过 guardReplace。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 简谱变化音放大（font-size 14 单 / 12 双）+ 左置
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(4,4,{acc:'#'}),V(5,4,{acc:'b'}),V(1,4,{acc:'x'}),V(3,4,{acc:'bb'})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const sharp14=/font-size="14"[^>]*>♯<\\/text>/.test(h);
    const flat14=/font-size="14"[^>]*>♭<\\/text>/.test(h);
    const x14=/font-size="14"[^>]*>×<\\/text>/.test(h);
    const bb12=/font-size="12"[^>]*>♭♭<\\/text>/.test(h);
    // 左置：♯ 文本 x 应小于同列数字 4 的 x（取首个 ♯ 与首个数字 4）
    const mAcc=h.match(/<text x="([\\d.-]+)" y="[\\d.-]+" font-size="14"[^>]*>♯<\\/text>/);
    const mNum=h.match(/<text x="([\\d.-]+)" y="[\\d.-]+" font-size="16.5"[^>]*>4<\\/text>/);
    const leftOf = mAcc&&mNum? (+mAcc[1] < +mNum[1]-4) : false;
    const noOld=h.indexOf('font-size="10" text-anchor="middle" fill="var(--ink)">♯</text>')<0;   // 旧 10 号已无
    return {sharp14, flat14, x14, bb12, leftOf, noOld}; })()`);
  T(r.sharp14 && r.flat14 && r.x14 && r.bb12 && r.leftOf && r.noOld, 'T1 简谱变化音放大左置', JSON.stringify(r));

  // T2 吉他分解 × 放大（font-size 12.5）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('guitar',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:1,lyr:0});
    s.measures[0].tabs[0]=[{dur:8,dotted:false,chord:'C',notes:[{s:5,f:3}],strum:'',tech:''},
      {dur:8,dotted:false,chord:'',notes:[{s:2,f:1}],strum:'',tech:''},
      {dur:8,dotted:false,chord:'',notes:[{s:4,f:2}],strum:'',tech:''},
      {dur:8,dotted:false,chord:'',notes:[{s:1,f:0}],strum:'',tech:''},
      {dur:2,dotted:false,chord:'',notes:[{s:3,f:0}],strum:'',tech:''}];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    const x125=/font-size="12.5"[^>]*>×<\\/text>/.test(h);
    const noOldX=h.indexOf('font-size="10" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="var(--paper)" stroke-width="2.4" stroke-linejoin="round" fill="var(--ink)">×</text>')<0;
    return {x125, noOldX, anyX:h.indexOf('>×</text>')>=0}; })()`);
  T(r.x125 && r.noOldX && r.anyX, 'T2 吉他分解 × 放大', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
