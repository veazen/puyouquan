/* v54.0 歌词系统回归：
   - 段序号只标在歌词最前面（首系统），后续系统不再重复
   - 点击歌词字：lyrSel 选中高亮 + 编辑浮条（前移/后移/空格/删除/替换）
   - 移位/删除在下一个空音位处吸收截止（乐句局部），后移无空位时末字挤出提醒 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const mkSong = (nMea, lyr) => `(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('vocal',{title:'l',beats:4,unit:4,key:'C',nMea:${nMea},nVox:1,lyr:${lyr}});
    for(let m=0;m<${nMea};m++)
      s.measures[m].voxes[0]=Array.from({length:4},(_,i)=>({dur:4,dotted:false,deg:(i%7)+1,acc:'',oct:0,lyrics:[],tie:false}));
    return s; })()`;

  // T1 段序号仅首系统：2 段歌词 × ≥2 系统 → data-lyrsel 元素只出现 2段×2件（text+rect）=4 处
  let r = await pg.evaluate(`(()=>{
    const s=${mkSong(14, 2)}; loadSong(s); blurSel=true; render();
    const nSys=layoutSystems().length;
    const n=(document.getElementById('score').innerHTML.match(/data-lyrsel/g)||[]).length;
    return { nSys, n }; })()`);
  T(r.nSys >= 2 && r.n === 4, 'T1 段序号仅首系统(2段=4件)', JSON.stringify(r));

  // T2 点击歌词字 → lyrSel 选中 + 高亮框 + 编辑浮条五按钮
  r = await pg.evaluate(`(()=>{
    const s=${mkSong(2, 1)};
    '一闪一闪'.split('').forEach((ch,i)=>{ s.measures[0].voxes[0][i].lyrics=[ch]; });
    loadSong(s); blurSel=true; render();
    document.querySelector('[data-zone="lyric"][data-mi="0"][data-ci="1"]')
      .dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    const pm=document.getElementById('popmenu');
    const btns=['ly-left','ly-right','ly-blank','ly-del','ly-rep'].every(id=>pm&&pm.querySelector('#'+id));
    const hl=(document.getElementById('score').innerHTML.match(/fill-opacity="0\\.13"/g)||[]).length;
    return { sel: lyrSel? lyrSel.mi+':'+lyrSel.ci : 'null', btns, hl }; })()`);
  T(r.sel === '0:1' && r.btns && r.hl === 1, 'T2 点击歌词=选中+高亮+浮条', JSON.stringify(r));

  // T3 后移：[一,闪,一,闪,×4空] 选第2字后移 → [一,空,闪,一,闪]（移位在空位吸收，无字丢失）
  const lyrics = () => `song.measures.flatMap(m=>m.voxes[0]).map(c=>(c.lyrics&&c.lyrics[0])||'').join(',')`;
  r = await pg.evaluate(`(()=>{
    document.getElementById('popmenu').querySelector('#ly-right').click();
    return ${lyrics()}; })()`);
  T(r === '一,,闪,一,闪,,,', 'T3 后移(空位吸收)', r);

  // T4 前移：选第3字（闪）前移 → 还原 [一,闪,一,闪]
  const open = (mi, ci) => `document.querySelector('[data-zone="lyric"][data-mi="${mi}"][data-ci="${ci}"]')
      .dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));`;
  r = await pg.evaluate(`(()=>{ ${open(0, 2)}
    document.getElementById('popmenu').querySelector('#ly-left').click();
    return ${lyrics()}; })()`);
  T(r === '一,闪,一,闪,,,,', 'T4 前移(填回空位)', r);

  // T5 空格（仅置空不移位）+ 删除（前提补位、空位截止）
  r = await pg.evaluate(`(()=>{ ${open(0, 1)}
    document.getElementById('popmenu').querySelector('#ly-blank').click();
    const afterBlank=${lyrics()};
    ${open(0, 3)}
    document.getElementById('popmenu').querySelector('#ly-del').click();
    return { afterBlank, afterDel: ${lyrics()} }; })()`);
  T(r.afterBlank === '一,,一,闪,,,,' && r.afterDel === '一,,一,,,,,', 'T5 空格置空+删除补位', JSON.stringify(r));

  // T6 替换：askText 弹窗改字（多字也可）
  r = await pg.evaluate(`(()=>{ ${open(0, 2)}
    document.getElementById('popmenu').querySelector('#ly-rep').click();
    const inp=document.querySelector('#ask-in'); inp.value='星星';
    document.querySelector('#ask-ok').click();
    return ${lyrics()}; })()`);
  T(r === '一,,星星,,,,,', 'T6 替换（askText 多字）', r);

  // T7 全满时后移：末字被挤出（可撤销）；撤销后恢复
  r = await pg.evaluate(`(()=>{
    const s=${mkSong(1, 1)};
    '好山好水'.split('').forEach((ch,i)=>{ s.measures[0].voxes[0][i].lyrics=[ch]; });
    loadSong(s); blurSel=true; render();
    ${open(0, 1)}
    document.getElementById('popmenu').querySelector('#ly-right').click();
    const after=${lyrics()};
    undo();
    return { after, undone: ${lyrics()} }; })()`);
  T(r.after === '好,,山,好' && r.undone === '好,山,好,水', 'T7 后移挤出末字+撤销恢复', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
