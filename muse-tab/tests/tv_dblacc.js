/* v42.9 双变音手输（重升 ×/重降 ♭♭）回归：
   T1 accSemi/voxMidi 半音：x→+2、bb→−2；toggleAcc 循环 空→#→x→空 / 空→b→bb→空
   T2 简谱渲染：acc='x' 显示 ×、acc='bb' 显示 ♭♭（含和音 adds）
   T3 五线谱渲染：acc='x'/'bb' 画出 SMuFL 重升/重降字形（accidentalDoubleSharp/Flat 轮廓）+ 播放音高正确 + 无报错
   T4 MusicXML 导出 <alter>2</alter> / <alter>-2</alter>
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

  // T1 半音 + toggleAcc 循环
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false},{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false},{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false},{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false}];
    loadSong(s);
    const base=voxMidi({deg:1,oct:0,acc:''});
    const semi={x:accSemi('x'),bb:accSemi('bb'),sh:accSemi('#'),fl:accSemi('b'),n:accSemi('n'),e:accSemi('')};
    const midiX=voxMidi({deg:1,oct:0,acc:'x'}), midiBB=voxMidi({deg:1,oct:0,acc:'bb'});
    // toggleAcc 循环（sel=首列）
    sel={mi:0,row:'vox',vi:0,ci:0,si:1};
    const cyc=[]; for(let i=0;i<3;i++){ toggleAcc('#'); cyc.push(song.measures[0].voxes[0][0].acc); }
    const cycB=[]; for(let i=0;i<3;i++){ toggleAcc('b'); cycB.push(song.measures[0].voxes[0][0].acc); }
    return {semi, dX:midiX-base, dBB:midiBB-base, cyc:cyc.join(','), cycB:cycB.join(',')}; })()`);
  T(r.semi.x===2 && r.semi.bb===-2 && r.semi.sh===1 && r.semi.fl===-1 && r.semi.n===0 && r.semi.e===0
    && r.dX===2 && r.dBB===-2 && r.cyc==='#,x,' && r.cycB==='b,bb,', 'T1 半音+toggleAcc循环', JSON.stringify(r));

  // T2 简谱渲染 × / ♭♭（含和音）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4,{acc:'x'}),V(2,4,{acc:'bb'}),V(3,4,{acc:'#'}),V(4,4,{acc:'b',adds:[{deg:6,acc:'x',oct:0}]})];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    return {hasX:h.indexOf('>×</text>')>=0, hasBB:h.indexOf('>♭♭</text>')>=0,
      hasSh:h.indexOf('>♯</text>')>=0, clean:h.indexOf('NaN')<0}; })()`);
  T(r.hasX && r.hasBB && r.hasSh && r.clean, 'T2 简谱 ×/♭♭ 渲染', JSON.stringify(r));

  // T3 五线谱重升/重降字形 + 播放音高
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4,{acc:'x'}),V(2,4,{acc:'bb'}),V(3,4),V(4,4)]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const dS=SMUFL.accidentalDoubleSharp.d, dF=SMUFL.accidentalDoubleFlat.d;
    return {ds:h.indexOf(dS)>=0, df:h.indexOf(dF)>=0, clean:h.indexOf('NaN')<0&&h.indexOf('undefined')<0,
      midiX:voxMidi({deg:1,oct:0,acc:'x'})-voxMidi({deg:1,oct:0,acc:''})}; })()`);
  T(r.ds && r.df && r.clean && r.midiX===2, 'T3 五线谱重升重降字形', JSON.stringify(r));

  // T4 MusicXML 导出 alter=±2
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4,{acc:'x'}),V(2,4,{acc:'bb'}),V(3,4),V(4,4)];
    const xml=exportMusicXML(s);
    return {p2:xml.indexOf('<alter>2</alter>')>=0, m2:xml.indexOf('<alter>-2</alter>')>=0}; })()`);
  T(r.p2 && r.m2, 'T4 MusicXML 导出 alter=±2', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
