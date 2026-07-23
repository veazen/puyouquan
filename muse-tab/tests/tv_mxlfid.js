/* v43.4 MusicXML 互操作保真回归：
   T1 八度记号 octave-shift 导出（8va=down/8vb=up + stop）+ 往返（ott 落 span 每列、ottTo 首列）
   T2 震音 tremolo 导出 <tremolo type="single">N</tremolo> + 往返 col.trem
   T3 双变音导入拼写保真：往返 acc='x'/'bb' 不再归一为升号系，且音高一致
   file:// 直载；guardReplace 直通；载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 octave-shift 导出 + 往返
  let r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(ott)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(1,4,{oct:1}),V(3,4,{oct:1}),V(5,4,{oct:1}),V(1,4,{oct:2})];
      s.measures[0].voxes[0].forEach((c,i)=>{ c.ott=ott; if(i===0) c.ottTo={mi:0,ci:3}; });
      loadSong(s); return song; };
    const s1=mk('8va'), xml1=exportMusicXML(s1);
    const s2=mk('8vb'), xml2=exportMusicXML(s2);
    const r1=importMusicXML(xml1).song;
    const col=r1.measures[0].voxes[0];
    return {
      down8:xml1.indexOf('<octave-shift type="down" size="8"')>=0,
      up8:xml2.indexOf('<octave-shift type="up" size="8"')>=0,
      stop:xml1.indexOf('<octave-shift type="stop"')>=0,
      rtAll:col.every(c=>c.ott==='8va'), rtTo:!!(col[0].ottTo)&&col[0].ottTo.ci===3,
      rtMidNoTo:!col[1].ottTo }; })()`);
  T(r.down8 && r.up8 && r.stop && r.rtAll && r.rtTo && r.rtMidNoTo, 'T1 octave-shift 导出+往返', JSON.stringify(r));

  // T2 tremolo 导出 + 往返
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,2,{trem:2}),V(5,2,{trem:3})]; loadSong(s);
    const xml=exportMusicXML(song);
    const r2=importMusicXML(xml).song; const col=r2.measures[0].voxes[0];
    return {exp2:xml.indexOf('<tremolo type="single">2</tremolo>')>=0, exp3:xml.indexOf('<tremolo type="single">3</tremolo>')>=0,
      rt2:col[0].trem===2, rt3:col[1].trem===3}; })()`);
  T(r.exp2 && r.exp3 && r.rt2 && r.rt3, 'T2 tremolo 导出+往返', JSON.stringify(r));

  // T3 双变音导入拼写保真（往返 x/bb + 音高一致）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
    // F##(deg4 x)、B♭♭(deg7 bb)
    s.measures[0].voxes[0]=[V(4,4,{acc:'x'}),V(7,4,{acc:'bb'}),V(1,4),V(2,4)]; loadSong(s);
    const midiA=voxMidi(s.measures[0].voxes[0][0]), midiB=voxMidi(s.measures[0].voxes[0][1]);
    const xml=exportMusicXML(song);
    const r3=importMusicXML(xml).song; const col=r3.measures[0].voxes[0];
    // 用导入结果重新载入以复用 voxMidi（依赖 song.key）
    if(typeof undoStack!=='undefined')undoStack.length=0; loadSong(r3);
    const mA=voxMidi(song.measures[0].voxes[0][0]), mB=voxMidi(song.measures[0].voxes[0][1]);
    return {accX:col[0].acc==='x', degX:col[0].deg===4, accBB:col[1].acc==='bb', degBB:col[1].deg===7,
      pitchA:mA===midiA, pitchB:mB===midiB,
      expAlter2:xml.indexOf('<alter>2</alter>')>=0, expAlterM2:xml.indexOf('<alter>-2</alter>')>=0}; })()`);
  T(r.accX && r.degX && r.accBB && r.degBB && r.pitchA && r.pitchB && r.expAlter2 && r.expAlterM2, 'T3 双变音往返拼写保真', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
