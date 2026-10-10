const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  let pass=0;
  // T1 三种谱类出卡：结构完整、无 NaN/undefined、含品牌与二维码占位
  for(const [name, code] of [
    ['弹唱谱', "loadSong(PRESETS[0].make());"],
    ['钢琴弹唱', "const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:2}); s.measures[0].voxes[0][0].chord='C'; loadSong(s); mutate(()=>genAccompaniment('slow',0,1));"],
    ['和弦谱', "const s=createSong('func',{ftype:'chord',nVox:1,lyr:0,beats:4,unit:4,key:'G',nMea:2}); s.measures[0].voxes[0][0].chord='G'; loadSong(s);"],
  ]){
    const r = await pg.evaluate(`(()=>{ ${code}
      const xml=buildShareCardSVG();
      return { len:xml.length, nan:xml.includes('NaN'), undef:xml.includes('undefined'),
        brand:xml.includes('谱友圈')&&xml.includes('puyouquan.com'),
        nested:/<svg x="25" y="96"/.test(xml), qr:/微信扫码看谱|扫码上谱友圈制谱/.test(xml),
        title:xml.includes('viewBox="0 0 750 1000"') };
    })()`);
    const ok = r.len>3000 && !r.nan && !r.undef && r.brand && r.nested && r.qr && r.title;
    console.log((ok?'✅':'❌')+' T1 出卡·'+name+': 长度='+r.len+' 品牌='+r.brand+' 谱面嵌套='+r.nested+' 二维码占位='+r.qr);
    if(ok) pass++;
  }
  // T2 光栅化冒烟：SVG 能被 Image 加载并画上 canvas（非空像素）
  const t2 = await pg.evaluate(`(new Promise(res=>{
    loadSong(PRESETS[0].make());
    let xml=buildShareCardSVG();
    xml=svgResolveVars(xml);   /* v66.5：走页面真实的印刷色表（原为测试自带的旧蓝/暖米替换表，与成品路径脱节） */
    const img=new Image();
    img.onload=()=>{ const cv=document.createElement('canvas'); cv.width=750; cv.height=1000;
      const g=cv.getContext('2d'); g.drawImage(img,0,0);
      const d=g.getImageData(370,500,8,8).data;
      let dark=0; for(let i=0;i<d.length;i+=4){ if(d[i+3]>0) dark++; }
      res({ok:true, painted:dark>0}); };
    img.onerror=e=>res({ok:false});
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
  }))`);
  const ok2 = t2.ok && t2.painted;
  console.log((ok2?'✅':'❌')+' T2 光栅化冒烟: 加载='+t2.ok+' 有像素='+t2.painted);
  if(ok2) pass++;
  // T3 弹窗入口 + 快照不留痕（生成后编辑态还原）
  const t3 = await pg.evaluate(()=>{
    loadSong(PRESETS[0].make());
    sel.row='vox'; sel.mi=0; sel.ci=0; blurSel=false; render();
    const before=document.getElementById('score').innerHTML.length;
    buildShareCardSVG();
    const after=document.getElementById('score').innerHTML.length;
    document.getElementById('b-print').click();
    const btn=!!document.getElementById('ex-card');
    document.getElementById('ex-cancel').click();
    return { restore:Math.abs(before-after)<50, btn };
  });
  const ok3 = t3.restore && t3.btn;
  console.log((ok3?'✅':'❌')+' T3 入口与快照还原: 按钮='+t3.btn+' 编辑态还原='+t3.restore);
  if(ok3) pass++;
  console.log('PASS '+pass+'/5');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
