const { chromium } = require('playwright');
const F = 'file://' + require('path').resolve(__dirname, 'redesign-proposal.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1360, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(500);
  let pass=0,total=0; const T=(ok,n,d)=>{total++;if(ok)pass++;console.log((ok?'✅':'❌')+' '+n+(d?': '+d:''));};

  // 结构互斥（[hidden] 曾被 .frame{display:flex} 盖掉）
  let r = await pg.evaluate(() => {
    const vis = id => { const e=document.getElementById(id); return e.getBoundingClientRect().height>0; };
    const out={};
    setDesk('before'); setMob('before');
    out.b={dB:vis('deskBefore'),dA:vis('deskAfter'),mB:vis('mobBefore'),mA:vis('mobAfter')};
    setDesk('after'); setMob('after');
    out.a={dB:vis('deskBefore'),dA:vis('deskAfter'),mB:vis('mobBefore'),mA:vis('mobAfter')};
    setDesk('before'); setMob('before');
    return out;
  });
  T(r.b.dB&&!r.b.dA&&r.b.mB&&!r.b.mA && !r.a.dB&&r.a.dA&&!r.a.mB&&r.a.mA,
    '现状/提案互斥显示（同一时刻只有一个样机可见）', JSON.stringify(r));

  // 配色切换器横排不折行
  r = await pg.evaluate(() => [...document.querySelectorAll('.toggle.palsw')].map(t=>{
    const bs=[...t.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
    return {rows:new Set(bs.map(x=>Math.round(x.top))).size, w:Math.round(t.getBoundingClientRect().width)};
  }));
  T(r.every(x=>x.rows===1), '配色切换器单行排布（不再竖着堆）', JSON.stringify(r));

  // 四套配色实际作用到样机 + 谱面朱砂恒定
  const acc={};
  for(const k of ['now','a','b','c']){
    await pg.evaluate(x=>setPal(x),k); await pg.waitForTimeout(60);
    acc[k]=await pg.evaluate(()=>{
      const g=(s,p)=>getComputedStyle(document.querySelector(s))[p];
      return {chip:g('#deskBefore .chip.on','backgroundColor'), paper:g('#deskBefore .mk-paper','backgroundColor'),
        err:g('#deskBefore .errm','backgroundColor'), mnum:g('#deskBefore .mnum','color'),
        lab:g('#deskBefore .mk-lab','color'), canvas:g('#deskBefore','backgroundColor'),
        stP:g('.st.p','backgroundColor'), sel:[...document.querySelectorAll('.pals .pal.sel')].map(c=>c.id).join()};
    });
  }
  T(new Set(Object.values(acc).map(v=>v.canvas)).size===4,
    '四套配色各自作用到样机外壳（画布 4 种互异）',
    Object.entries(acc).map(([k,v])=>k+' '+v.canvas).join(' | '));
  T(Object.values(acc).every(v=>v.mnum==='rgb(195, 58, 41)'),
    '谱面重音在四套方案里恒为朱砂（文档明确声称的一点）',
    Object.entries(acc).map(([k,v])=>k+':'+v.mnum).join(' '));
  T(Object.values(acc).every(v=>v.stP===v.chip),
    '选中态样例跟随所选配色（与样机同源）');
  T(Object.entries(acc).every(([k,v])=>v.sel==='pal-'+k), '方案卡选中状态同步');

  // 谱面重音↔批注 色相差：卡片上写的 19/113/145/113 必须与样机真实取色一致
  const HU = c => { const m=c.match(/\d+/g).slice(0,3).map(Number).map(x=>x/255);
    const mx=Math.max(...m), mn=Math.min(...m), d=mx-mn; let h=0;
    if(d){ if(mx===m[0]) h=((m[1]-m[2])/d)%6; else if(mx===m[1]) h=(m[2]-m[0])/d+2; else h=(m[0]-m[1])/d+4;
      h*=60; if(h<0)h+=360; } return h; };
  const dh = (a,b)=>{ const x=Math.abs(HU(a)-HU(b)); return Math.round(Math.min(x,360-x)); };
  const hues = Object.fromEntries(Object.entries(acc).map(([k,v])=>[k, dh(v.mnum, v.err)]));
  T(hues.now===19 && hues.a===112 && hues.b===144 && hues.c===112,
    '谱面重音↔批注色相差与卡片标称一致（19 / 112 / 144 / 112）', JSON.stringify(hues));

  // 辅助文字对比：三方案达 AA，现状不达
  const CR = await pg.evaluate(() => {
    const L=c=>{const m=c.match(/\d+/g).slice(0,3).map(Number);
      const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
      return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);};
    const cr=(a,b)=>{const x=L(a),y=L(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+0.05)/(lo+0.05);};
    const out={};
    ['now','a','b','c'].forEach(k=>{ setPal(k);
      const lab=getComputedStyle(document.querySelector('#deskBefore .mk-lab')).color;
      const pan=getComputedStyle(document.querySelector('#deskBefore .mk-panel')).backgroundColor;
      const canv=getComputedStyle(document.getElementById('deskBefore')).backgroundColor;
      const bar=getComputedStyle(document.querySelector('#deskBefore .mk-bar')).backgroundColor;
      out[k]={faintOnPanel:+cr(lab,pan).toFixed(2), canvasToBar:+cr(canv,bar).toFixed(3)};});
    setPal('now'); return out;
  });
  T(CR.now.faintOnPanel<3 && ['a','b','c'].every(k=>CR[k].faintOnPanel>=4.5)
    && CR.now.canvasToBar<1.05 && ['a','b','c'].every(k=>CR[k].canvasToBar>=1.06),
    '实测复核：现状辅助文字/表面层级不达标，三方案全部达标', JSON.stringify(CR));

  // 样机几何：样机比例必须与它自己标称的数字一致（等比示意，不是随手画）
  const geo = await pg.evaluate(() => {
    const H = e => e.getBoundingClientRect().height, W = e => e.getBoundingClientRect().width;
    const out = {};
    setMob('before'); setDesk('before');
    let f = document.getElementById('mobBefore');
    let kids = [...f.children];
    out.mobBefore = +(kids.slice(2).reduce((a,e)=>a+H(e),0) / H(f) * 100).toFixed(1);
    let d = document.getElementById('deskBefore');
    out.deskBefore = +(W(d.querySelector('.staff')) / W(d) * 100).toFixed(0);
    setMob('after'); setDesk('after');
    f = document.getElementById('mobAfter'); kids = [...f.children];
    out.mobAfter = +(kids.slice(2).reduce((a,e)=>a+H(e),0) / H(f) * 100).toFixed(1);
    d = document.getElementById('deskAfter');
    out.deskAfter = +(W(d.querySelector('.staff')) / W(d) * 100).toFixed(0);
    out.gain = +((W(document.querySelector('#deskAfter .staff'))/423 - 1)*100).toFixed(0);
    out.fits = [...document.querySelectorAll('.bench')].every(bn => bn.scrollWidth <= bn.clientWidth + 1);
    setMob('before'); setDesk('before');
    return out;
  });
  T(Math.abs(geo.mobBefore - 30) <= 1 && Math.abs(geo.mobAfter - 18.5) <= 1
    && Math.abs(geo.deskBefore - 51) <= 2 && Math.abs(geo.deskAfter - 72) <= 2 && geo.fits,
    '样机等比且不被裁切：移动底部 30%/18.5%、桌面谱面 51%/72%、+41%', JSON.stringify(geo));

  // 指板六弦不被裁切
  const fb = await pg.evaluate(() => {
    setMob('after');
    const box = document.querySelector('.fb').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.fbr')].map(r=>r.getBoundingClientRect());
    const out = { n: rows.length,
      inside: rows.every(r => r.top >= box.top - .5 && r.bottom <= box.bottom + .5) };
    const lab = document.querySelector('#mobAfter .plabel').getBoundingClientRect();
    const st = document.querySelector('#mobAfter .staff').getBoundingClientRect();
    out.labelClear = +(st.top - lab.bottom).toFixed(1);
    setMob('before'); return out;
  });
  T(fb.n === 6 && fb.inside && fb.labelClear >= 0,
    '指板 6 弦全部在面板内不被裁切 · 谱面标签不压第一行谱线', JSON.stringify(fb));

  // 版面
  r = await pg.evaluate(()=>({ ovf: document.documentElement.scrollWidth>window.innerWidth,
    secs: document.querySelectorAll('section').length, tocs: document.querySelectorAll('.toc a').length,
    cards: document.querySelectorAll('.pals .pal').length,
    palRows: new Set([...document.querySelectorAll('.pals .pal')].map(c=>Math.round(c.getBoundingClientRect().top))).size }));
  T(!r.ovf && r.secs===8 && r.tocs===8 && r.cards===4 && r.palRows===2,
    '版面：8 节 / 目录 8 条 / 方案卡 4 张 2×2 / 无横向溢出', JSON.stringify(r));

  // 深色
  await pg.emulateMedia({colorScheme:'dark'}); await pg.waitForTimeout(120);
  r = await pg.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,
    fg:getComputedStyle(document.body).color,
    frame:getComputedStyle(document.querySelector('.frame')).backgroundColor}));
  T(r.body==='rgb(16, 19, 24)' && r.frame!=='rgb(16, 19, 24)',
    '深色模式：文档转深色、样机作为标本保持浅色', JSON.stringify(r));
  await pg.emulateMedia({colorScheme:'light'});

  T(errs.length===0, '无页面报错', errs.join('|')||'none');

  await pg.evaluate(()=>{setPal('now');window.scrollTo(0,0)}); await pg.waitForTimeout(150);
  await pg.screenshot({path:'shot-top.png',clip:{x:0,y:0,width:1360,height:1000}});
  await pg.evaluate(()=>document.getElementById('s3').scrollIntoView()); await pg.waitForTimeout(200);
  await pg.screenshot({path:'shot-pal.png',clip:{x:0,y:0,width:1360,height:1000}});
  for(const k of ['now','a','b','c']){
    await pg.evaluate(x=>{setPal(x);document.getElementById('s5').scrollIntoView();},k);
    await pg.waitForTimeout(200);
    await pg.screenshot({path:'shot-desk-'+k+'.png',clip:{x:0,y:0,width:1360,height:1000}});
  }
  await pg.evaluate(()=>{setPal('a');setDesk('after');setMob('after');document.getElementById('s6').scrollIntoView();});
  await pg.waitForTimeout(220);
  await pg.screenshot({path:'shot-mob.png',clip:{x:0,y:0,width:1360,height:1000}});
  console.log('PASS '+pass+'/'+total);
  await b.close(); process.exit(pass===total?0:1);
})();
