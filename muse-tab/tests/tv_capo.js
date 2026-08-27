/* v53.4 页头直改 + 变调夹联动简谱回归：
   - 页头热区：标题区(meta)/调号(key)/拍号(meter)/速度(tempo)/变调夹(capo>0) data-hd 可点
   - 变调夹显示联动：1=X 标实际调（指法调+capo）、变调夹位注明按什么指法；capo=0 谱面无变调夹残留
   - 播放联动：voxCapo——有 TAB 声部时简谱 midi +capo（与吉他实际音高一致）；纯人声谱不受影响
   - 页头菜单：调号（自动移调）/拍号/变调夹一键设置；速度走 askText
   - 曲谱信息弹窗实时预览：标题输入即上谱、取消恢复、确定可一次撤销 */
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

  const mkGuitar = `(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('guitar',{title:'页头测试',beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:1,lyr:0});
    const mk=(f,st)=>({dur:4,dotted:false,chord:'',notes:[{s:st,f}],strum:'',tech:''});
    s.measures[0].tabs[0]=[mk(0,3),mk(2,3),mk(0,2),mk(1,2)];
    s.measures[0].tabs[0][0].chord='C';
    s.measures[0].voxes[0]=Array.from({length:4},(_,i)=>({dur:4,dotted:false,deg:i+1,acc:'',oct:0,lyrics:[],tie:false}));
    return s; })()`;

  // T1 页头热区 + capo 显示联动：capo=3 → 1=Eb + 变调夹注指法 + capo 热区；capo=0 → 1=C 无变调夹
  let r = await pg.evaluate(`(()=>{
    const s=${mkGuitar}; s.capo=3; loadSong(s); blurSel=true; render();
    const h3=document.getElementById('score').innerHTML;
    const z=(k)=>!!document.querySelector('[data-hd="'+k+'"]');
    const withCapo={ eb:h3.indexOf('1=Eb')>=0, note:h3.indexOf('变调夹 3 品（按 1=C 指法）')>=0,
      zMeta:z('meta'), zKey:z('key'), zMeter:z('meter'), zTempo:z('tempo'), zCapo:z('capo') };
    song.capo=0; render();
    /* v60.55：调号热区的 tooltip 里现在写着「…变调夹 / 夹位选指法…」，
       原先拿 innerHTML 找「变调夹」会把提示文字也算进去。本项要断言的是**谱面上不画**变调夹标注，
       故改扫可见文本节点（<text>），不再匹配 <title> 提示。 */
    const vis0=[...document.querySelectorAll('#score text')].map(x=>x.textContent).join('|');
    return { ...withCapo, c0:vis0.indexOf('1=C')>=0 && vis0.indexOf('变调夹')<0, nan:h3.includes('NaN') }; })()`);
  T(r.eb && r.note && r.zMeta && r.zKey && r.zMeter && r.zTempo && r.zCapo && r.c0 && !r.nan,
    'T1 页头热区+实际调显示', JSON.stringify(r));

  // T2 播放联动：有 TAB 声部时 voxMidi +capo；纯人声谱 capo 不生效
  r = await pg.evaluate(`(()=>{
    const s=${mkGuitar}; s.capo=0; loadSong(s);
    const m0=voxMidi({deg:1,oct:0,acc:''});
    song.capo=3;
    const m3=voxMidi({deg:1,oct:0,acc:''});
    if(typeof undoStack!=='undefined')undoStack.length=0;
    const v=createSong('vocal',{title:'v',beats:4,unit:4,key:'C',nMea:1,nTab:0,nVox:1,lyr:0});
    v.measures[0].voxes[0]=[{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false}];
    loadSong(v); song.capo=3;
    const mv=voxMidi({deg:1,oct:0,acc:''});
    song.capo=0;
    const mv0=voxMidi({deg:1,oct:0,acc:''});
    return { dGuitar:m3-m0, dVocal:mv-mv0 }; })()`);
  T(r.dGuitar === 3 && r.dVocal === 0, 'T2 voxCapo播放联动(+3/纯人声0)', JSON.stringify(r));

  /* T3 页头菜单：变调夹 5 品 / 拍号 3/4 / 调号 C→D（和弦自动移调）
     v60.55 起「调号」不再是平铺 12 个调名的 popmenu，而是就地弹出变调弹窗（#ekey-pop）——
     断言跟随：改经弹窗的唱调 ♯ 连点两次升 2 个半音到 D，顺带核对弹窗确实开了、popmenu 不再产生 */
  r = await pg.evaluate(`(()=>{
    const s=${mkGuitar}; s.capo=3; loadSong(s);
    showHeadMenu('capo', 200, 200);
    document.querySelector('#popmenu [data-c="5"]').click();
    const capo5=song.capo;
    showHeadMenu('meter', 200, 200);
    document.querySelector('#popmenu [data-m="3:4"]').click();
    const m34=song.beats+'/'+song.unit;
    song.capo=0;                                   // 夹位不参与本项换调核对
    showHeadMenu('key', 200, 200);
    const popOn=document.getElementById('ekey-pop').classList.contains('on');
    const noMenu=!document.getElementById('popmenu');
    document.getElementById('ek-up').click();
    document.getElementById('ek-up').click();
    const keyD=song.key, chD=song.measures[0].tabs[0][0].chord;
    return { capo5, m34, keyD, chD, popOn, noMenu }; })()`);
  T(r.capo5 === 5 && r.m34 === '3/4' && r.keyD === 'D' && r.chD === 'D' && r.popOn && r.noMenu,
    'T3 页头菜单设置 + 调号改走变调弹窗换调移调', JSON.stringify(r));

  // T4 速度：askText 输入 120；热区点击路由（pointerdown 到 data-hd="tempo" 弹输入框）
  r = await pg.evaluate(`(()=>{
    const s=${mkGuitar}; loadSong(s); blurSel=true; render();
    const z=document.querySelector('[data-hd="tempo"]');
    z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:300,clientY:200}));
    const inp=document.getElementById('ask-in');
    if(!inp) return {noPopup:true};
    inp.value='120'; document.getElementById('ask-ok').click();
    return { tempo:song.tempo }; })()`);
  T(r.tempo === 120, 'T4 速度热区+输入', JSON.stringify(r));

  // T5 曲谱信息实时预览：输入即上谱；取消恢复；确定后一次撤销回原值
  r = await pg.evaluate(`(()=>{
    const s=${mkGuitar}; loadSong(s);
    const fire=(el)=>el.dispatchEvent(new Event('input',{bubbles:true}));
    document.getElementById('b-meta').onclick();
    let inp=document.getElementById('mm-title');
    inp.value='实时预览A'; fire(inp);
    const live=song.title==='实时预览A' && document.getElementById('score').innerHTML.indexOf('实时预览A')>=0;
    document.getElementById('mm-cancel').click();
    const canceled=song.title==='页头测试';
    document.getElementById('b-meta').onclick();
    inp=document.getElementById('mm-title');
    inp.value='最终标题B'; fire(inp);
    document.getElementById('mm-ok').click();
    const applied=song.title==='最终标题B';
    undo();
    const undone=song.title==='页头测试';
    return { live, canceled, applied, undone }; })()`);
  T(r.live && r.canceled && r.applied && r.undone, 'T5 曲谱信息实时预览+撤销', JSON.stringify(r));

  // T6 heta 区点击 → 曲谱信息弹窗（data-hd="meta" 路由）
  r = await pg.evaluate(`(()=>{
    closeModal&&closeModal();
    const s=${mkGuitar}; loadSong(s); blurSel=true; render();
    const z=document.querySelector('[data-hd="meta"]');
    z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:400,clientY:120}));
    const open=!!document.getElementById('mm-title');
    if(open) document.getElementById('mm-cancel').click();
    return { open }; })()`);
  T(r.open, 'T6 标题区点击开曲谱信息', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
