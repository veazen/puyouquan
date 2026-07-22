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
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
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
  // T7 导出：meta 正确 + tie 合并长音 + 和音 + 往返 deg 序列一致
  const t7 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'D',tempo:100,nMea:2,title:'MIDI往返'});
    s.measures[0].voxes[0]=[V(1,4,{adds:[{deg:3,oct:0}]}),V(2,4),V(5,2,{dotted:true,tie:true})];
    s.measures[1].voxes[0]=[V(5,4),V(3,4),V(0,2)];
    loadSong(s);
    const ex=exportMIDI(song);
    const p2=parseSMF(ex.bytes);
    if(p2.error) return {error:p2.error};
    const notes=p2.tracks[0].notes;
    const tied=notes.find(n=>n.dur===1920);        // 附点二分+四分 tie 合并 = 4拍 = 1920tick
    const r=buildSongFromMIDI(p2,{mode:'single',a:0});
    // 主音选择约定：导入取最高音为主音——比较按"列内音高集合"（主音+和音排序）
    const degs=x=>x.measures.map(m=>m.voxes[0].filter(c=>c.deg)
      .map(c=>[c.deg,...(c.adds||[]).map(a=>a.deg)].sort().join('')).join(' ')).join('|');
    return { tempo:p2.tempo, ts:p2.ts.beats+'/'+p2.ts.unit, keySf:p2.keySf,
      nNotes:notes.length, tiedOK:!!tied, rtKey:r.song.key, rtDegs:degs(r.song), srcDegs:degs(song) };
  })()`);
  const ok7 = !t7.error && t7.tempo===100 && t7.ts==='4/4' && t7.keySf===2 && t7.nNotes===5 && t7.tiedOK
    && t7.rtKey==='D' && t7.rtDegs===t7.srcDegs;
  console.log((ok7?'✅':'❌')+' T7 MIDI导出往返: ♩='+t7.tempo+' 拍号='+t7.ts+' sf='+t7.keySf+' 音符='+t7.nNotes+'/5 tie合并='+t7.tiedOK+' 唱名往返='+(t7.rtDegs===t7.srcDegs)+'('+t7.rtDegs+')');
  if(ok7) pass++;
  // T8 吉他预设导出：vox+tab 双轨、TAB 音符落在吉他音域
  const t8 = await pg.evaluate(`(()=>{
    loadSong(PRESETS[0].make());
    const ex=exportMIDI(song);
    const p2=parseSMF(ex.bytes);
    if(p2.error) return {error:p2.error};
    const tabN=p2.tracks.length>1? p2.tracks[p2.tracks.length-1].notes : [];
    return { nTracks:p2.tracks.length, tabNotes:tabN.length,
      rangeOK: tabN.every(n=>n.midi>=40 && n.midi<=88) };
  })()`);
  const ok8 = !t8.error && t8.nTracks>=2 && t8.tabNotes>10 && t8.rangeOK;
  console.log((ok8?'✅':'❌')+' T8 吉他预设导出: 音轨='+t8.nTracks+' TAB音符='+t8.tabNotes+' 音域OK='+t8.rangeOK);
  if(ok8) pass++;
  console.log('PASS '+pass+'/8');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
