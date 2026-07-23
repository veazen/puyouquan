/* v43.1 震音 tremolo 回归：
   T1 五线谱：col.trem=1/2/3 在符干上画 1/2/3 条斜杠（八分/十六分/三十二分轮奏）；全音符画符头上方；无报错
   T2 简谱：数字上方画对应条数斜杠
   T3 toggleTrem 循环：无→1→2→3→无；仅对有音高音符
   T4 播放实音不变（voxMidi 不读 trem）
   斜杠唯一标识：stroke-width="1.9"。file:// 直载；每次载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const slashN = h => (h.match(/stroke-width="1\.9"/g) || []).length;

  // T1 五线谱：1/2/3 杠 + 全音符
  let r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(trem,dur)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(1,dur,{trem}),...(dur===4?[V(2,4),V(3,4),V(4,4)]:dur===2?[V(2,2)]:[])]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const h1=mk(1,4), h2=mk(2,4), h3=mk(3,4), hw=mk(2,1);
    const n=(h)=>(h.match(/stroke-width="1.9"/g)||[]).length;
    return {n1:n(h1), n2:n(h2), n3:n(h3), nw:n(hw), clean:h3.indexOf('NaN')<0}; })()`);
  T(r.n1===1 && r.n2===2 && r.n3===3 && r.nw===2 && r.clean, 'T1 五线谱 1/2/3 杠+全音符', JSON.stringify(r));

  // T2 简谱：数字上方斜杠
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4,{trem:3}),V(2,4),V(3,4),V(5,4,{trem:1,oct:1})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {n:(h.match(/stroke-width="1.9"/g)||[]).length, clean:h.indexOf('NaN')<0}; })()`);
  T(r.n===4 && r.clean, 'T2 简谱数字上方斜杠(3+1)', JSON.stringify(r));

  // T3 toggleTrem 循环 + 仅对有音高
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(0,4),V(3,4),V(4,4)]; loadSong(s);
    sel={mi:0,row:'vox',vi:0,ci:0,si:1};
    const cyc=[]; for(let i=0;i<4;i++){ toggleTrem(); cyc.push(song.measures[0].voxes[0][0].trem||0); }
    // 休止（deg=0）不加 trem
    sel={mi:0,row:'vox',vi:0,ci:1,si:1}; toggleTrem();
    const restTrem=song.measures[0].voxes[0][1].trem||0;
    return {cyc:cyc.join(','), restTrem}; })()`);
  T(r.cyc==='1,2,3,0' && r.restTrem===0, 'T3 toggleTrem 循环+休止豁免', JSON.stringify(r));

  // T4 播放实音不变
  r = await pg.evaluate(`(()=>{ const base=voxMidi({deg:1,oct:0,acc:''}); return {same:voxMidi({deg:1,oct:0,acc:'',trem:3})===base}; })()`);
  T(r.same, 'T4 震音不改实音', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
