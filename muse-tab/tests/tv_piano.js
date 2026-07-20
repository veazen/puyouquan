const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);

  // T1: 新建钢琴谱（右手旋律 + 左手低音）
  const t1 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('piano',{title:'钢琴大谱表测试',beats:4,unit:4,key:'C',tempo:90,nMea:2,lyr:0});
    s.measures[0].voxes[0]=[V(3,4),V(5,4),V(1,8,{oct:1}),V(7,8),V(5,4)];
    s.measures[0].voxes[1]=[V(1,2,{oct:-1}),V(5,2,{oct:-1})];
    s.measures[1].voxes[0]=[V(6,4),V(5,4),V(3,2)];
    s.measures[1].voxes[1]=[V(4,2,{oct:-1}),V(1,2,{oct:-1})];
    loadSong(s);
    const svg=document.getElementById('score').innerHTML;
    return { voices:song.voxVoices.join('/'), notations:(song.voxNotations||[]).join('/'),
      type:docType(song),
      staffLines:(svg.match(/stroke-width="0\.8"/g)||[]).length,
      brace:svg.includes('stroke-width="1.7"'),
      bassClefDots:(svg.match(/r="1\.5"/g)||[]).length };
  });
  console.log('T1 钢琴谱:', JSON.stringify(t1));
  await pg.waitForTimeout(250);
  const y=await pg.evaluate(()=>{ const svg=document.getElementById('score'); const r=svg.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width}; });
  await pg.screenshot({path:'piano-1.png', clip:{x:Math.max(0,y.x), y:Math.max(0,y.y+120), width:Math.min(1280,y.w), height:400}});

  // T2: 低音谱表点击定音高（选左手第1音，点低音谱中线 D3 → deg=2 oct=-1）
  await pg.evaluate(()=>{ sel.row='vox'; sel.vi=1; sel.mi=0; sel.ci=0; blurSel=false; render(); });
  const pt=await pg.evaluate(()=>{
    const svg=document.getElementById('score'); const r=svg.getBoundingClientRect();
    const sc=r.width/svg.viewBox.baseVal.width;
    const rect=[...svg.querySelectorAll('rect[data-sbot="25"]')][0];
    const b2=colBoxes['v1:0:0']; const sb=+rect.dataset.staffb;
    return {cx:r.left+(b2.x+b2.w/2)*sc, top:r.top, sc, sb};
  });
  await pg.mouse.click(pt.cx, pt.top+(pt.sb-15)*pt.sc); await pg.waitForTimeout(200);   // 中线 D3 = step29 → y=sb-15
  const t2=await pg.evaluate(()=>({deg:song.measures[0].voxes[1][0].deg, oct:song.measures[0].voxes[1][0].oct}));
  console.log('T2 低音谱点击中线:', JSON.stringify(t2), '(期望 deg2 oct-1 = D3)');

  // T3: 三态切换按钮
  const t3=await pg.evaluate(()=>{ sel.vi=1; syncInputs();
    return { bs:document.getElementById('vn-bs').classList.contains('on'),
             st:document.getElementById('vn-st').classList.contains('on') }; });
  console.log('T3 低音声部按钮态:', JSON.stringify(t3), '(期望 bs:true st:false)');

  // T4: 回归——普通五线谱与吉他谱
  const t4=await pg.evaluate(()=>{ const s=PRESETS[0].make(); loadSong(s); return document.getElementById('score').innerHTML.length>2000; });
  console.log('T4 吉他谱回归:', t4);
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
