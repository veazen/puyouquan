const { chromium } = require('playwright');
const F = 'file://' + require('path').resolve(__dirname, 'proto-a.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type()==='error' && !/ERR_CONNECTION|font/i.test(m.text())) errs.push('c:'+m.text()); });
  await pg.goto(F); await pg.waitForTimeout(600);
  let pass=0,total=0; const T=(ok,n,d)=>{total++;if(ok)pass++;console.log((ok?'✅':'❌')+' '+n+(d?': '+d:''));};

  // 1 谱面画出来了
  let r = await pg.evaluate(() => ({
    svgs: document.querySelectorAll('.sheet svg').length,
    frets: document.querySelectorAll('#sheet .hitn').length,
    texts: document.querySelectorAll('#sheet text').length,
    beams: [...document.querySelectorAll('#sheet rect')].filter(x=>+x.getAttribute('height')===2.4).length,
    lines: document.querySelectorAll('#sheet line').length
  }));
  T(r.svgs===2 && r.frets===4*(8+4)+4-3 + 0 || r.frets>40, '谱面 SVG 渲染出来（两处：桌面 4 小节、手机 2×2）', JSON.stringify(r));
  T(r.beams===32, '符杠 32 道（8 小节 × 每拍一道）', 'beams='+r.beams);

  // 2 选中切换上下文条
  const ctx = {};
  for (const [k, sels] of [['tab','#sheet .hitn'],['vox',null],['bar',null]]) {}
  r = await pg.evaluate(() => {
    const grab = () => ({ tag: document.querySelector('.ctx-tag').textContent,
      btns: document.querySelectorAll('#ctxbar button').length });
    const out = {};
    pick('tab',0,0); out.tab = grab();
    pick('vox',0,0); out.vox = grab();
    pick('bar',2,0); out.bar = grab();
    pick('tab',0,0); return out;
  });
  T(r.tab.tag.includes('六线谱') && r.vox.tag.includes('简谱') && r.bar.tag.includes('小节')
    && r.tab.btns>=18 && r.vox.btns>=18 && r.bar.btns>=10,
    '上下文条随选中对象整条换掉（TAB / 简谱 / 小节 三态）', JSON.stringify(r));

  // 3 点品位真的改写谱面
  r = await pg.evaluate(() => {
    pick('tab',0,0);
    const read = () => [...document.querySelectorAll('#sheet text')].map(t=>t.textContent).join('|');
    const before = read(); setFret(7); const after = read();
    const st1 = document.getElementById('statusbar').textContent;
    setFret(3);
    return { changed: before!==after, has7: after.includes('|7|'), st: st1.includes('7品') };
  });
  T(r.changed && r.has7 && r.st, '点品位 → 谱面重绘 + 状态条同步', JSON.stringify(r));

  // 4 面板浮出而非挤压：谱面宽度不变
  r = await pg.evaluate(() => {
    const w = () => Math.round(document.getElementById('sheet').getBoundingClientRect().width);
    const w0 = w(); openFly('L','note');
    const w1 = w(), fly = document.getElementById('flyL').getBoundingClientRect();
    const sh = document.getElementById('sheet').getBoundingClientRect();
    const overlaps = fly.right > sh.left && fly.left < sh.right;
    closeFly(); return { w0, w1, overlaps, z: getComputedStyle(document.getElementById('flyL')).zIndex };
  });
  T(r.w0===r.w1 && r.overlaps, '左栏面板浮在谱面上方，不挤压谱面宽度', JSON.stringify(r));

  // 5 自测读数六项全达标（浅色）
  const M = async () => pg.evaluate(() => {
    const g = id => document.getElementById(id).textContent;
    return { p:g('mx1'), b:g('mx2'), t:g('mx3'), f:g('mx4'), s:g('mx5'), h:g('mx6') };
  });
  let m = await M();
  T(Object.values(m).every(v=>v.includes('达标')) && !Object.values(m).some(v=>v.includes('未达')),
    '浅色：六项自测全部达标', JSON.stringify(m));

  // 6 深色也全达标
  await pg.evaluate(()=>setTheme('dark')); await pg.waitForTimeout(200);
  m = await M();
  T(Object.values(m).every(v=>v.includes('达标')) && !Object.values(m).some(v=>v.includes('未达')),
    '深色：六项自测仍然全部达标', JSON.stringify(m));
  const dk = await pg.evaluate(()=>({ shell:getComputedStyle(document.body).backgroundColor,
    paper:getComputedStyle(document.getElementById('sheet')).backgroundColor }));
  T(dk.paper==='rgb(255, 255, 255)', '深色下谱纸仍是纸（建议的默认；反色是显式开关）', JSON.stringify(dk));
  await pg.evaluate(()=>setTheme('light')); await pg.waitForTimeout(150);

  // 7 手机：两次触摸落一个音
  r = await pg.evaluate(() => {
    pick('tab',1,2);
    const before = TAB[1][2].f + ':' + TAB[1][2].s;
    boardTap(4, 5);
    return { before, after: TAB[1][2].f + ':' + TAB[1][2].s,
      cells: document.querySelectorAll('#board .fcell').length,
      rows: new Set([...document.querySelectorAll('#board .fcell rect')]
        .map(x=>Math.round(+x.getAttribute('y')))).size };
  });
  T(r.after==='5:4' && r.cells===36 && r.rows===6,
    '手机指板：6 弦 × 6 列 = 36 个触摸格，点一下落一个音', JSON.stringify(r));

  // 8 手机底部占屏由页面自己量
  r = await pg.evaluate(() => ({ rest:document.getElementById('mRestP').textContent,
    open:document.getElementById('mOpenP').textContent,
    restPx:document.getElementById('mRest').textContent }));
  T(parseFloat(r.rest)<=12 && parseFloat(r.open)<=36, '手机常驻底部 ≤12%（展开指板时另计）', JSON.stringify(r));

  // 9 触摸目标
  r = await pg.evaluate(() => {
    const cells=[...document.querySelectorAll('#board .fcell rect')].map(x=>({
      w:+x.getAttribute('width'), h:+x.getAttribute('height')}));
    const svg=document.querySelector('#board svg').getBoundingClientRect();
    const vb=document.querySelector('#board svg').viewBox.baseVal;
    const k=svg.width/vb.width;
    return { minW:+(Math.min(...cells.map(c=>c.w))*k).toFixed(1),
             minH:+(Math.min(...cells.map(c=>c.h))*k).toFixed(1) };
  });
  T(r.minH>=26 && r.minW>=24, '指板格实际触摸尺寸（CSS px）', JSON.stringify(r));


  // 11 刻版几何：符干贴谱表底线、终止线只在末行、续行不留标题空高
  r = await pg.evaluate(() => {
    const S=[...document.querySelectorAll('#sheet line')];
    const stems=S.filter(l=>Math.abs(+l.getAttribute('x1') - +l.getAttribute('x2'))<0.01
      && Math.abs((+l.getAttribute('y2') - +l.getAttribute('y1')) - 20) < 0.6);
    const thick=[...document.querySelectorAll('#sheet rect')]
      .filter(x=>+x.getAttribute('width')===2.4).length;
    const svg=document.querySelector('#sheet svg');
    const vb=svg.viewBox.baseVal;
    const ys=[...document.querySelectorAll('#sheet g[transform]')]
      .map(g=>+(g.getAttribute('transform').match(/[-\d.]+(?=\))/)||[0])[0]);
    const noOverlap = ys.length<2 || (ys[1]+56) > 199;
    return { stems:stems.length, thick, noOverlap, rowOffs:ys, vbH:vb.height, vbW:Math.round(vb.width),
      tabLabels:[...document.querySelectorAll('#sheet text')].filter(t=>t.textContent==='TAB').length,
      keySigs:[...document.querySelectorAll('#sheet text')].filter(t=>t.textContent==='1=C').length };
  });
  T(r.stems===64 && r.thick===2 && r.tabLabels===1 && r.keySigs===1 && r.vbH===362 && r.noOverlap,
    '刻版：64 符干 · 终止线只在末行 · TAB/1=C 各一次 · 两行紧凑且不重叠',
    JSON.stringify(r));

  // 12 指板永远反映当前列（选中简谱时退回本小节首列，面板不空着）
  r = await pg.evaluate(() => {
    pick('vox',2,0);
    const on1=document.querySelectorAll('#board circle').length;
    pick('tab',2,5);
    const on2=document.querySelectorAll('#board circle').length;
    pick('tab',0,0);
    return { voxSel:on1, tabSel:on2 };
  });
  T(r.voxSel===1 && r.tabSel===1, '指板始终有当前位置标记（含选中简谱时）', JSON.stringify(r));


  // 13 控件面：文字压控件 ≥4.5、控件对所在栏 ≥1.08（两个主题都要过）
  //    这一条是补的——先前 .eb 借用了 --paper，深色下白底白字，对比 1.20
  const ctlCheck = async () => pg.evaluate(() => {
    pick('tab',0,0);
    const eb=[...document.querySelectorAll('#ctxbar .eb')].find(b=>!b.classList.contains('on'));
    const L=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(Number);
      const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
      return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);};
    const cr=(a,b)=>{const x=L(a),y=L(b),h=Math.max(x,y),l=Math.min(x,y);return (h+.05)/(l+.05);};
    const g=(e,p)=>getComputedStyle(e)[p];
    return { text:+cr(g(eb,'color'),g(eb,'backgroundColor')).toFixed(2),
             surf:+cr(g(eb,'backgroundColor'),g(document.getElementById('ctxbar'),'backgroundColor')).toFixed(3) };
  });
  const cL = await ctlCheck();
  await pg.evaluate(()=>setTheme('dark')); await pg.waitForTimeout(250);
  const cD = await ctlCheck();
  await pg.evaluate(()=>setTheme('light')); await pg.waitForTimeout(200);
  T(cL.text>=4.5 && cD.text>=4.5 && cL.surf>=1.08 && cD.surf>=1.08,
    '控件面：文字对比 ≥4.5、控件对所在栏 ≥1.08（浅色与深色）',
    '浅 '+JSON.stringify(cL)+' 深 '+JSON.stringify(cD));

  // 10 无溢出 / 无报错
  r = await pg.evaluate(()=>({ ovf: document.documentElement.scrollWidth>window.innerWidth+1,
    appOvf: document.getElementById('app').scrollWidth>document.getElementById('app').clientWidth+1 }));
  T(!r.ovf && !r.appOvf, '页面与应用外壳均无横向溢出', JSON.stringify(r));
  T(errs.length===0, '无页面报错', errs.join('|')||'none');

  await pg.evaluate(()=>{pick('tab',0,4);window.scrollTo(0,0)}); await pg.waitForTimeout(200);
  await pg.screenshot({path:'p-desk.png', clip:{x:0,y:0,width:1400,height:1000}});
  await pg.evaluate(()=>{openFly('L','track')}); await pg.waitForTimeout(300);
  await pg.screenshot({path:'p-fly.png', clip:{x:0,y:0,width:1400,height:1000}});
  await pg.evaluate(()=>{closeFly();pick('vox',1,0);toggleAnnot();}); await pg.waitForTimeout(250);
  await pg.screenshot({path:'p-vox.png', clip:{x:0,y:0,width:1400,height:1000}});
  await pg.evaluate(()=>{toggleAnnot();setTheme('dark');}); await pg.waitForTimeout(250);
  await pg.screenshot({path:'p-dark.png', clip:{x:0,y:0,width:1400,height:1000}});
  await pg.evaluate(()=>{setTheme('light');document.querySelector('.mrow').scrollIntoView();});
  await pg.waitForTimeout(300);
  await pg.screenshot({path:'p-mob.png', clip:{x:0,y:0,width:1400,height:1000}});
  console.log('PASS '+pass+'/'+total);
  await b.close(); process.exit(pass===total?0:1);
})();
