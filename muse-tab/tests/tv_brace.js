const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  pg.on('pageerror',e=>console.log('PAGEERR:',e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  // 默认新建钢琴谱（Eb调复刻用户场景）：花括线必须精确跨接高音谱表顶线→低音谱表底线
  const r = await pg.evaluate(()=>{
    const s=createSong('piano',{title:'',beats:4,unit:4,key:'Eb',nMea:4,lyr:0});
    loadSong(s); blurSel=true; render();
    const el=[...document.querySelectorAll('#score path')].find(p2=>p2.getAttribute('d')===SMUFL.brace.d);
    if(!el) return {found:false};
    const bb=el.getBBox(), m=el.getAttribute('transform');
    // 期望跨度 = 低音谱底线y − 高音谱顶线y
    const ys=[...document.getElementById('score').innerHTML.matchAll(/<line x1="\d+" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="var\(--ink\)" stroke-width="0.8"/g)].map(x=>+x[1]);
    const tm=/translate\(([\d.-]+),([\d.-]+)\)\s*(?:scale\(([\d.]+),([\d.]+)\)|scale\(([\d.]+)\))/.exec(m);
    const yBot=+tm[2], sy=tm[4]!=null? +tm[4] : +tm[5];
    const h=(SMUFL.brace.bb[3]-SMUFL.brace.bb[1])*sy, yTop=yBot-h;
    // 断言：花括线上端=本系统高音谱顶线、下端=本系统低音谱底线（两端都必须落在谱线上）
    const hitTop=ys.some(y=>Math.abs(y-yTop)<1.2), hitBot=ys.some(y=>Math.abs(y-yBot)<1.2);
    // 且跨度=同系统内 5线×2 谱表的外沿距（取距 yBot 最近的10条线验证）
    const sysYs=ys.filter(y=>y>=yTop-2&&y<=yBot+2);
    const span=Math.max(...sysYs)-Math.min(...sysYs);
    return {found:true, braceH:+h.toFixed(1), span:+span.toFixed(1), hitTop, hitBot, nLines:sysYs.length, transform:m};
  });
  const ok = r.found && r.hitTop && r.hitBot && Math.abs(r.braceH-r.span)<1.5 && r.nLines===10;
  console.log('花括线跨度: 实际='+r.braceH+' 系统内10线外沿='+r.span+' 两端落线='+r.hitTop+'/'+r.hitBot+' 线数='+r.nLines, ok?'✅':'❌');
  await pg.waitForTimeout(200);
  const g=await pg.evaluate(()=>{ const r2=document.getElementById('score').getBoundingClientRect(); return {x:r2.x,y:r2.y,w:r2.width}; });
  await pg.screenshot({path:'v371-brace.png', clip:{x:Math.max(0,g.x), y:Math.max(0,g.y+130), width:Math.min(1100,g.w), height:330}});
  await b.close();
})();
