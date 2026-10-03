/* v65.0 B2c 速度单位与八度基准（2026-10 评审团 §6.3 B2c：P1-11 余项 / P1-12；D-08 ②）
   T1 6/8 新谱：页头写 ♪=90，播放按八分=90（单位音符 0.667s），MusicXML beat-unit eighth、sound tempo 45，MIDI 速度 45（四分口径）——三处一致
   T2 x/8 选 ♩.=60：页头 ♩.=60，播放八分 0.333s，MusicXML quarter+beat-unit-dot/60、sound 90，MIDI 90
   T3 4/4 ♩=90 不变（护栏：新旧都绿）
   T4 refOct：C→G（+7）音高上行到 67 且 oct 不动、1=G 的 do 在谱表内（step0=39）；回 C 还原；F→G（+2）65→67；♯F→G（+1）66→67
   T5 编辑器变调弹窗路径（ekMove）：F 升 2 到 G 音高上行，再降 2 回 F 零损失，恢复原调也回 F
   T6 song.mode 往返：MusicXML 写 <mode>minor</mode>，导入回 song.mode='minor'、音级序列不变；mode 字段不改谱面几何（配和弦工作台写过 mode 的谱）
   T7 速度弹窗：数值＋单位（♩ / ♪ / ♩.），选 ♪ 填 100 回车 → tempo 100、tempoUnit 'e'
   T8 MusicXML 导入：<metronome> eighth/90 → tempoUnit 'e'；只有 sound tempo 45 → tempoUnit 'q'（两者播放速度相同）
   突变实证：对 v65.0 之前的文件复跑，T1/T2/T4–T8 报红（T3 为护栏）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); blurSel=true;
    window.V=(d,u,o)=>Object.assign({dur:u,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.hdr=()=>{ const t=[...document.getElementById('score').querySelectorAll('text')].map(x=>x.textContent).find(x=>/[♩♪]\\.?=\\d+/.test(x))||''; return (t.match(/[♩♪]\\.?=\\d+/)||[''])[0]; };
    window.midiTempo=(s)=>{ const out=exportMIDI(s||song); const smf=parseSMF(out&&out.bytes? out.bytes : out); return smf&&smf.tempo!=null? smf.tempo : 'err:'+(smf&&smf.error)+' bytes:'+(out&&out.bytes? out.bytes.length : typeof out); };
    window.us=()=>+(typeof unitSeconds==='function'? unitSeconds(song,1) : 60/song.tempo).toFixed(3);
    window.fill=()=>{ song.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=[1,2,3,5][i%4]; })); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ loadSong(createSong('vocal',{title:'六八',key:'C',beats:6,unit:8,nMea:2,nVox:1,lyr:0,tempo:90})); song.tempo=90; fill(); render();
    const xml=exportMusicXML(song); return {hdr:hdr(), us:us(), bu:/<beat-unit>eighth<\\/beat-unit>/.test(xml), snd:(xml.match(/sound tempo="([\\d.]+)"/)||[])[1], midi:midiTempo()}; })()`);
  T(!r.err && r.hdr === '♪=90' && r.us === 0.667 && r.bu && +r.snd === 45 && r.midi === 45, 'T1 6/8 页头 ♪=90、播放八分=90、MusicXML/MIDI 四分口径 45', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ song.tempo=60; song.tempoUnit='dq'; render(); const xml=exportMusicXML(song);
    return {hdr:hdr(), us:us(), bu:/<beat-unit>quarter<\\/beat-unit><beat-unit-dot\\/><per-minute>60<\\/per-minute>/.test(xml), snd:(xml.match(/sound tempo="([\\d.]+)"/)||[])[1], midi:midiTempo()}; })()`);
  T(!r.err && r.hdr === '♩.=60' && r.us === 0.333 && r.bu && +r.snd === 90 && r.midi === 90, 'T2 ♩.=60：页头、播放、MusicXML、MIDI 一致', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ loadSong(createSong('vocal',{title:'四四',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0})); song.tempo=90; fill(); render(); const xml=exportMusicXML(song);
    return {hdr:hdr(), us:us(), bu:/<beat-unit>quarter<\\/beat-unit><per-minute>90/.test(xml), snd:(xml.match(/sound tempo="([\\d.]+)"/)||[])[1], midi:midiTempo()}; })()`);
  T(!r.err && r.hdr === '♩=90' && r.us === 0.667 && r.bu && +r.snd === 90 && r.midi === 90, 'T3 4/4 ♩=90 不变（护栏）', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const mk=k=>{ const s=createSong('instr',{title:'八度',key:k,beats:4,unit:4,nMea:1,nVox:1,lyr:0}); s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(1,4)]; loadSong(s); return s; };
    const m=()=>voxMidi(song.measures[0].voxes[0][0],0); const out={};
    mk('C'); out.c=m(); mutate(()=>{ transposeSong(song,7); }); out.g={midi:m(), key:song.key, ro:song.refOct, oct:song.measures[0].voxes[0].map(c=>c.oct).join(''), step0:staffKeyInfoAt(0).step0};
    mutate(()=>{ transposeSong(song,-7); }); out.back={midi:m(), key:song.key, ro:song.refOct|0};
    mk('F'); out.f=m(); mutate(()=>{ transposeSong(song,2); }); out.fg=m();
    mk('F#'); out.fs=m(); mutate(()=>{ transposeSong(song,1); }); out.fsg=m(); return out; })()`);
  T(!r.err && r.c === 60 && r.g.midi === 67 && r.g.key === 'G' && r.g.ro === 1 && r.g.oct === '0000' && r.g.step0 === 39 && r.back.midi === 60 && r.back.ro === 0 && r.f === 65 && r.fg === 67 && r.fs === 66 && r.fsg === 67,
    'T4 refOct：换调跨 ♯F/G 边界时音高朝换调方向走、oct 不动、do 在谱表内', JSON.stringify(r));

  /* T5 */
  r = await EV(`(()=>{ const s=createSong('instr',{title:'弹窗',key:'F',beats:4,unit:4,nMea:1,nVox:1,lyr:0}); s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(5,4)]; loadSong(s); undoStack.length=0;
    const m=()=>voxMidi(song.measures[0].voxes[0][0],0); const o=JSON.stringify(song.measures);
    const p=document.getElementById('ekey-pop'); if(p) p.classList.remove('on'); openEdKeyPop();
    edTranspose(2); const up={midi:m(), key:song.key, ro:song.refOct|0}; edTranspose(-2); const back={midi:m(), key:song.key, ro:song.refOct|0, same:JSON.stringify(song.measures)===o};
    edTranspose(2); edKeyReset(); const rst={midi:m(), key:song.key, ro:song.refOct|0}; if(p) p.classList.remove('on'); return {up, back, rst}; })()`);
  T(!r.err && r.up.midi === 67 && r.up.key === 'G' && r.up.ro === 1 && r.back.midi === 65 && r.back.ro === 0 && r.back.same && r.rst.midi === 65 && r.rst.ro === 0, 'T5 变调弹窗：F 升 2 上行、反向零损失、恢复原调', JSON.stringify(r));

  /* T6 */
  r = await EV(`(()=>{ const s=createSong('vocal',{title:'小调',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1}); s.mode='minor'; s.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=[6,1,3,6][i]; c.lyrics=['啊']; })); loadSong(s); render();
    const seq=s2=>s2.measures.map(m=>m.voxes[0].map(c=>c.deg+(c.acc||'')+'/'+c.oct).join(' ')).join('|'); const q0=seq(song);
    const hA=document.getElementById('score').innerHTML; const xml=exportMusicXML(song); const has=/<mode>minor<\\/mode>/.test(xml);
    delete song.mode; render(); const hB=document.getElementById('score').innerHTML; song.mode='minor';
    const res=importMusicXML(xml); if(!res.song) return {has, err:res.error};
    return {has, geomSame:hA===hB, mode:res.song.mode, key:res.song.key, same:seq(res.song)===q0}; })()`);
  T(!r.err && r.has && r.geomSame && r.mode === 'minor' && r.key === 'C' && r.same, 'T6 song.mode 往返 MusicXML <mode>；mode 不改谱面几何', JSON.stringify(r));

  /* T7 */
  await EV(`(()=>{ loadSong(createSong('vocal',{title:'速度',key:'C',beats:6,unit:8,nMea:1,nVox:1,lyr:0})); render(); showHeadMenu('tempo', 300, 120); })()`);
  await pg.waitForTimeout(80);
  const t7a = await EV(`({inp:!!document.getElementById('tp-val'), units:document.querySelectorAll('#popmenu [data-tu]').length})`);
  if (t7a.inp) { await EV(`document.querySelector('#popmenu [data-tu="e"]').click()`); await pg.keyboard.press('Control+a'); await pg.keyboard.type('100'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(60); }
  r = await EV(`({tempo:song.tempo, tu:song.tempoUnit, closed:!document.getElementById('popmenu'), hdr:hdr()})`);
  T(t7a.inp && t7a.units === 3 && r.tempo === 100 && r.tu === 'e' && r.closed && r.hdr === '♪=100', 'T7 速度弹窗：数值＋单位，♪ 100 回车生效', JSON.stringify({ t7a, r }));

  /* T8 */
  r = await EV(`(()=>{ loadSong(createSong('vocal',{title:'导入',key:'C',beats:6,unit:8,nMea:2,nVox:1,lyr:0})); song.tempo=90; const xml=exportMusicXML(song);
    const a=importMusicXML(xml).song; const xml2=xml.replace(/<direction placement="above"><direction-type><metronome>[\\s\\S]*?<\\/direction>/,'<direction placement="above"><sound tempo="45"/></direction>');
    const c=importMusicXML(xml2).song; const sec=s2=>+unitSeconds(s2,1).toFixed(3);
    return {a:{t:a.tempo, u:a.tempoUnit, s:sec(a)}, c:{t:c.tempo, u:c.tempoUnit, s:sec(c)}}; })()`);
  T(!r.err && r.a.t === 90 && r.a.u === 'e' && r.c.t === 45 && r.c.u === 'q' && r.a.s === r.c.s && r.a.s === 0.667, 'T8 MusicXML 导入：节拍器单位 / 仅 sound tempo 两种来源播放速度一致', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
