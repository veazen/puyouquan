const { chromium } = require('playwright');
const fs=require('fs'), os=require('os'), path=require('path'), cp=require('child_process');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'mxl-'));
  const CASES = [
    ['弹唱谱(预设)', "loadSong(PRESETS[0].make()); return exportMusicXML(song);"],
    ['歌谱(满符号)', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('vocal',{nVox:1,lyr:2,beats:4,unit:4,key:'G',tempo:88,nMea:3,title:'导出测试'});
      s.measures[0].voxes[0]=[V(1,4,{lyrics:['一','壹'],chord:'G'}),V(2,8,{tup:1}),V(3,8,{tup:1}),V(4,8,{tup:1}),V(4,4,{acc:'#'}),V(5,4)];
      s.measures[0].repeatStart=true;
      s.measures[1].voxes[0]=[V(5,2,{dotted:true,tie:true}),V(5,4)];
      s.measures[1].repeatEnd=true;
      s.measures[2].voxes[0]=[V(1,2,{adds:[{deg:3,acc:'',oct:0},{deg:5,acc:'',oct:0}],chord:'C/E'}),V(0,2)];
      loadSong(s); return exportMusicXML(song);`],
    ['钢琴独奏(双声部)', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('piano',{lyr:0,beats:3,unit:4,key:'Eb',nMea:2});
      s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4)];
      s.measures[0].voxes[1]=[V(1,2,{oct:-1,dotted:true})];
      loadSong(s); return exportMusicXML(song);`],
  ];
  let pass=0;
  for(const [name, code] of CASES){
    const xml = await pg.evaluate(`(()=>{ ${code} })()`);
    let ok = !!xml && !xml.includes('NaN') && !xml.includes('undefined');
    let msg='';
    if(ok){
      const fp=path.join(tmp, name.replace(/[^\w]/g,'')+'.musicxml');
      fs.writeFileSync(fp, xml);
      try{ cp.execSync(`xmllint --noout "${fp}"`); msg='xmllint通过'; }
      catch(e){ ok=false; msg='xmllint失败:'+e.message.slice(0,120); }
    } else msg='空或含NaN/undefined';
    console.log((ok?'✅':'❌')+' '+name+': '+msg+(xml?` 长度=${xml.length}`:''));
    if(ok) pass++;
  }
  // 计数与时值断言（歌谱fixture）
  const t2 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2,title:'计数'});
    s.measures[0].voxes[0]=[V(1,4,{lyrics:['词']}),V(2,4),V(3,4),V(5,4)];
    s.measures[1].voxes[0]=[V(1,2,{adds:[{deg:3,oct:0}]}),V(0,2)];
    loadSong(s);
    const xml=exportMusicXML(song);
    const cnt=(re)=>(xml.match(re)||[]).length;
    const m1=xml.slice(xml.indexOf('<measure number="1">'), xml.indexOf('<measure number="2">'));
    const durSum=[...m1.matchAll(/<duration>(\\d+)<\\/duration>/g)].reduce((a,m)=>a+ +m[1],0);
    return { meas:cnt(/<measure /g), notes:cnt(/<note>/g), rests:cnt(/<rest\\/>/g),
      chordTag:cnt(/<chord\\/>/g), lyrics:cnt(/<lyric /g), durSum, expDur:4*48 };
  })()`);
  const ok2 = t2.meas===2 && t2.notes===7 && t2.rests===1 && t2.chordTag===1 && t2.lyrics===1 && t2.durSum===t2.expDur;
  console.log((ok2?'✅':'❌')+` 计数: 小节=${t2.meas}/2 音符=${t2.notes}/7 休止=${t2.rests}/1 和音chord=${t2.chordTag}/1 歌词=${t2.lyrics}/1 第1小节时值和=${t2.durSum}/${t2.expDur}`);
  if(ok2) pass++;
  // 音高拼写断言：G大调 deg7=F#4 → step F alter 1 octave 4
  const t3 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'G',nMea:1});
    s.measures[0].voxes[0]=[V(7,4),V(1,4),V(1,4,{oct:1}),V(4,4,{acc:'#'})];
    loadSong(s);
    return exportMusicXML(song);
  })()`);
  // keyRef 将主音置于 G3–F#4 窗口：G大调 1=G3、1̇=G4、7=F#4、#4=C#4（与播放/渲染一致）
  const okF = /<step>F<\/step><alter>1<\/alter><octave>4<\/octave>/.test(t3);
  const okG3 = /<step>G<\/step><octave>3<\/octave>/.test(t3);
  const okG4 = /<step>G<\/step><octave>4<\/octave>/.test(t3);
  const okCS = /<step>C<\/step><alter>1<\/alter><octave>4<\/octave>/.test(t3);
  console.log(((okF&&okG3&&okG4&&okCS)?'✅':'❌')+` 音高拼写(G调): F#4=${okF} G3=${okG3} G4(1̇)=${okG4} C#4(#4)=${okCS}`);
  if(okF&&okG3&&okG4&&okCS) pass++;
  // T4 往返一致性：song → export → import → 核心字段逐项一致
  const t4 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:2,beats:4,unit:4,key:'D',tempo:76,nMea:3,title:'往返'});
    s.measures[0].voxes[0]=[V(1,4,{lyrics:['甲','乙'],chord:'D'}),V(2,8,{tup:1}),V(3,8,{tup:1}),V(5,8,{tup:1}),V(4,4,{acc:'#'}),V(5,4)];
    s.measures[1].voxes[0]=[V(5,2,{dotted:true,tie:true}),V(5,4)];
    s.measures[1].repeatEnd=true;
    s.measures[2].voxes[0]=[V(1,2,{adds:[{deg:3,oct:0},{deg:5,oct:0}],chord:'Bm/D'}),V(0,2)];
    loadSong(s);
    const r=importMusicXML(exportMusicXML(song));
    if(r.error) return {error:r.error};
    const a2=song, b2=r.song;
    const flat=x=>x.measures.map(m=>m.voxes[0].map(c=>[c.deg,c.dur,!!c.dotted,!!c.tie,c.tup||0,(c.adds||[]).length,c.chord||'', (c.lyrics||[]).filter(Boolean).join('|')]));
    const midi=x=>{ const o=song; song=x; const ref=keyRef(); const out=x.measures.map(m=>m.voxes[0].map(c=>c.deg? ref+DEG_SEMI[c.deg]+(c.acc==='#'?1:c.acc==='b'?-1:0)+(c.oct||0)*12 : -1)); song=o; return out; };
    return { same: JSON.stringify(flat(a2))===JSON.stringify(flat(b2)),
      midiSame: JSON.stringify(midi(a2))===JSON.stringify(midi(b2)),
      key:b2.key, beats:b2.beats, tempo:b2.tempo, rep:b2.measures[1].repeatEnd,
      skip:r.skip.notes+r.skip.other };
  })()`);
  const ok4 = !t4.error && t4.same && t4.midiSame && t4.key==='D' && t4.beats===4 && t4.tempo===76 && t4.rep && t4.skip===0;
  console.log((ok4?'✅':'❌')+' 往返一致: 结构='+t4.same+' 音高='+t4.midiSame+' key='+t4.key+' beats='+t4.beats+' tempo='+t4.tempo+' 反复='+t4.rep+' 跳过='+t4.skip);
  if(ok4) pass++;
  // T5 第三方风格 fixture（MuseScore 式：divisions=480、显式 type、F谱号、backup 双声部）
  const FIX = '<?xml version="1.0" encoding="UTF-8"?>'+
   '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>'+
   '<part id="P1"><measure number="1"><attributes><divisions>480</divisions><key><fifths>-3</fifths></key>'+
   '<time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>'+
   '<note><pitch><step>E</step><alter>-1</alter><octave>3</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note>'+
   '<note><pitch><step>G</step><octave>3</octave></pitch><duration>720</duration><voice>1</voice><type>quarter</type><dot/></note>'+
   '<note><rest/><duration>240</duration><voice>1</voice><type>eighth</type></note>'+
   '<backup><duration>1440</duration></backup>'+
   '<note><pitch><step>C</step><octave>3</octave></pitch><duration>1440</duration><voice>2</voice><type>half</type><dot/></note>'+
   '</measure></part></score-partwise>';
  const t5 = await pg.evaluate(`(()=>{
    const r=importMusicXML(${JSON.stringify(FIX)});
    if(r.error) return {error:r.error};
    loadSong(r.song);
    const h=document.getElementById('score').innerHTML;
    const c=r.song.measures[0].voxes[0];
    return { key:r.song.key, beats:r.song.beats, clef:r.song.voxNotations[0],
      cols:c.map(x=>x.deg+':'+x.dur+(x.dotted?'.':'')).join(' '),
      skipped:r.skip.notes, renderOK:h.length>1000 && !h.includes('NaN') };
  })()`);
  const ok5 = !t5.error && t5.key==='Eb' && t5.beats===3 && t5.clef==='bass' && t5.cols==='1:4 3:4. 0:8' && t5.skipped===1 && t5.renderOK;
  console.log((ok5?'✅':'❌')+' 第三方fixture: key='+t5.key+'(Eb) beats='+t5.beats+' 谱号='+t5.clef+' 列='+t5.cols+'(期望 1:4 3:4. 0:8) 跳过voice2='+t5.skipped+' 渲染='+t5.renderOK);
  if(ok5) pass++;
  console.log('PASS '+pass+'/7');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
