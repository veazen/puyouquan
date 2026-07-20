const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
/* 构造最小 SMF：format0 单轨 */
function vlq(n){ const out=[]; let s=[n&0x7f]; n>>=7; while(n){ s.push((n&0x7f)|0x80); n>>=7; } return s.reverse(); }
function smf({tpq=480, tempo=500000, ts=[4,4], key=null, evs=[]}){
  const tk=[];
  tk.push(0,0xFF,0x51,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255);
  tk.push(0,0xFF,0x58,4,ts[0],Math.log2(ts[1]),24,8);
  if(key!=null) tk.push(0,0xFF,0x59,2,key&255,0);
  let last=0;
  evs.forEach(([tick,st,d1,d2])=>{ tk.push(...vlq(tick-last), st, d1, d2); last=tick; });
  tk.push(0,0xFF,0x2F,0);
  const trk=[0x4D,0x54,0x72,0x6B,(tk.length>>24)&255,(tk.length>>16)&255,(tk.length>>8)&255,tk.length&255,...tk];
  return Buffer.from([0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(tpq>>8)&255,tpq&255,...trk]).toString('base64');
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  const run=(b64,selJs)=>pg.evaluate(`(()=>{
    const u8=Uint8Array.from(atob(${JSON.stringify('X')}.replace('X','')+'${''}'+'${''}'+atob? '':''), c=>0);
    return null; })()`); // placeholder
  const call = async (b64, sel)=> await pg.evaluate(`(()=>{
    const u8=Uint8Array.from(atob('${'${B64}'}'), c=>c.charCodeAt(0));
    const smf=parseSMF(u8);
    if(smf.error) return {error:smf.error};
    const r=buildSongFromMIDI(smf, ${'${SEL}'});
    loadSong(r.song);
    const h=document.getElementById('score').innerHTML;
    return { skipped:r.skipped, key:r.song.key, beats:r.song.beats, tempo:r.song.tempo,
      nMea:r.song.measures.length, nVox:r.song.voxVoices.length, notations:r.song.voxNotations||null,
      cols:r.song.measures.map(m=>m.voxes.map(v=>v.map(c=>c.deg+':'+c.dur+(c.dotted?'.':'')+(c.tie?'~':'')+((c.adds||[]).length?'+'+c.adds.length:'')).join(' '))),
      renderOK:h.length>1000 && !h.includes('NaN') };
  })()`.replace('${B64}',b64).replace('${SEL}',JSON.stringify(sel)));
  let pass=0;
  // T1 四个四分音符 C4 D4 E4 G4（C大调）→ 1:4 2:4 3:4 5:4
  const b1=smf({key:0, evs:[[0,0x90,60,80],[480,0x80,60,0],[480,0x90,62,80],[960,0x80,62,0],[960,0x90,64,80],[1440,0x80,64,0],[1440,0x90,67,80],[1920,0x80,67,0]]});
  const t1=await call(b1,{mode:'single',a:0});
  const ok1=!t1.error && t1.cols[0][0]==='1:4 2:4 3:4 5:4' && t1.nMea===1 && t1.tempo===120 && t1.renderOK;
  console.log((ok1?'✅':'❌')+' T1 四分旋律: '+(t1.error||t1.cols[0][0]+' 小节='+t1.nMea+' ♩='+t1.tempo));
  if(ok1) pass++;
  // T2 和弦 C4+E4+G4 全音符 → 主音5(最高) adds2
  const b2=smf({key:0, evs:[[0,0x90,60,80],[0,0x90,64,80],[0,0x90,67,80],[1920,0x80,60,0],[1920,0x80,64,0],[1920,0x80,67,0]]});
  const t2=await call(b2,{mode:'single',a:0});
  const ok2=!t2.error && t2.cols[0][0]==='5:1+2';
  console.log((ok2?'✅':'❌')+' T2 和弦全音符: '+(t2.error||t2.cols[0][0]+'(期望 5:1+2)'));
  if(ok2) pass++;
  // T3 附点四分(720)+八分(240)+二分(960) → 1:4. 2:8 3:2
  const b3=smf({key:0, evs:[[0,0x90,60,80],[720,0x80,60,0],[720,0x90,62,80],[960,0x80,62,0],[960,0x90,64,80],[1920,0x80,64,0]]});
  const t3=await call(b3,{mode:'single',a:0});
  const ok3=!t3.error && t3.cols[0][0]==='1:4. 2:8 3:2';
  console.log((ok3?'✅':'❌')+' T3 附点时值: '+(t3.error||t3.cols[0][0]+'(期望 1:4. 2:8 3:2)'));
  if(ok3) pass++;
  // T4 跨小节：第3拍起二分音符(跨1拍进下小节... 用第4拍起的二分) → 4拍处 rest补齐+连音线拆分
  //    起点=第3拍(tick 1440)长2拍 → 本小节1拍(4分~)+次小节1拍(4分)
  const b4=smf({key:0, evs:[[0,0x90,60,80],[1440,0x80,60,0],[1440,0x90,67,80],[2400,0x80,67,0]]});
  const t4=await call(b4,{mode:'single',a:0});
  const ok4=!t4.error && t4.cols[0][0]==='1:2. 5:4~' && t4.cols[1][0].startsWith('5:4');
  console.log((ok4?'✅':'❌')+' T4 跨小节连音: '+(t4.error||t4.cols[0][0]+' | '+t4.cols[1][0]+'(期望 1:2. 5:4~ | 5:4…)'));
  if(ok4) pass++;
  // T5 running status（后续事件省略状态字节）
  const tk5=[0,0xFF,0x51,3,7,0xA1,0x20, 0,0xFF,0x58,4,4,2,24,8, 0,0x90,60,80, ...vlq(480),60,0, 0,62,80, ...vlq(480),62,0, 0,0xFF,0x2F,0];
  const trk5=[0x4D,0x54,0x72,0x6B,(tk5.length>>24)&255,(tk5.length>>16)&255,(tk5.length>>8)&255,tk5.length&255,...tk5];
  const b5=Buffer.from([0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xE0,...trk5]).toString('base64');
  const t5=await call(b5,{mode:'single',a:0});
  const ok5=!t5.error && t5.cols[0][0].startsWith('1:4 2:4');
  console.log((ok5?'✅':'❌')+' T5 running status: '+(t5.error||t5.cols[0][0]));
  if(ok5) pass++;
  // T6 分手：C3(48)+E4(64) 同时整音 → 钢琴双声部 右手3:1 左手1(oct-1):1
  const b6=smf({key:0, evs:[[0,0x90,48,80],[0,0x90,64,80],[1920,0x80,48,0],[1920,0x80,64,0]]});
  const t6=await call(b6,{mode:'split',a:0});
  const okN = t6.notations && t6.notations.join()==='staff,bass';
  const ok6=!t6.error && okN && t6.cols[0][0]==='3:1' && t6.cols[0][1]==='1:1' && t6.nVox===2;
  console.log((ok6?'✅':'❌')+' T6 按中央C分手: '+(t6.error||('右手='+t6.cols[0][0]+' 左手='+t6.cols[0][1]+' 记谱='+t6.notations)));
  if(ok6) pass++;
  console.log('PASS '+pass+'/6');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
