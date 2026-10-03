/* v63.9 B5 ⑤⑥（2026-10 评审团 §6.3 B5：P2-27 无需拍板部分 / P3-23）
   T1 六线谱 Ctrl+K：弹出和弦输入框，空列输入框为空（不继承前一个和弦）；输入 Am7 回车写到光标列；留空回车清除
   T2 简谱 Ctrl+K：级数写法 6m 换算成 Am 并锚定到该音符
   T3 和弦图位置随谱保存：Ctrl+K 面板点「曲首」→ song.diagPos='top'、谱面用曲首和弦图；JSON 往返后仍是曲首；可撤销；老谱无字段＝随行
   T4 尤克里里节奏型库：标题「尤克里里节奏型库」、型名弦序按四弦改写（53231323→43231323、5323 4323→4323 3323、5·32·1·32→4·32·1·32），
      图示画 4 条线；吉他谱不变（吉他节奏型库、53231323、6 条线）；面板卡标题随乐器
   突变实证：对 v63.9 之前的文件复跑，T1–T4 全部报红（0/4）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad();
    window.TC=(o)=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o||{});
    window.mkG=()=>{ const s=createSong('guitar',{title:'和弦',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0});
      s.measures[0].tabs[0]=[TC({chord:'Cmaj7',notes:[{s:5,f:3}]}),TC({notes:[{s:3,f:0}]}),TC({notes:[{s:2,f:1}]}),TC({notes:[{s:1,f:0}]})];
      return s; };
    window.blurAll=()=>{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  await EV(`(()=>{ loadSong(mkG()); sel={mi:0,row:'tab',vi:0,ci:2,si:2}; render(); blurAll(); })()`);
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(60);
  let r1 = await EV(`(()=>{ const i=document.getElementById('ck-in'); return {open:!!i, val:i?i.value:null, focus:document.activeElement===i}; })()`);
  if (r1.open) { await pg.keyboard.type('Am7'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(60); }
  let r = await EV(`({ch:song.measures[0].tabs[0][2].chord||'', open:!!document.getElementById('ck-in')})`);
  await EV(`(()=>{ sel={mi:0,row:'tab',vi:0,ci:2,si:2}; render(); blurAll(); })()`);
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(60);
  const pre = await EV(`(document.getElementById('ck-in')||{}).value`);
  await EV(`(()=>{ const i=document.getElementById('ck-in'); if(i) i.value=''; })()`);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(60);
  const cleared = await EV(`song.measures[0].tabs[0][2].chord||''`);
  T(r1.open && r1.val === '' && r1.focus && r.ch === 'Am7' && !r.open && pre === 'Am7' && cleared === '',
    'T1 六线谱 Ctrl+K 输入和弦：空列不继承前一个和弦，回车写入，留空清除', JSON.stringify({ r1, r, pre, cleared }));

  /* T2 */
  await EV(`(()=>{ const s=createSong('vocal',{title:'级数',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0].forEach((c,i)=>{ c.deg=[6,1,3,1][i]; }); loadSong(s); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; render(); blurAll(); })()`);
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(60);
  const op2 = await EV(`!!document.getElementById('ck-in')`);
  if (op2) { await pg.keyboard.type('6m'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(60); }
  r = await EV(`({ch:song.measures[0].voxes[0][0].chord||'', other:song.measures[0].voxes[0].slice(1).map(c=>c.chord||'').join('')})`);
  T(op2 && r.ch === 'Am' && r.other === '', 'T2 简谱 Ctrl+K：6m 换算为 Am 并锚定该音符', JSON.stringify({ op2, r }));

  /* T3 */
  await EV(`(()=>{ loadSong(mkG()); undoStack.length=0; sel={mi:0,row:'tab',vi:0,ci:0,si:5}; render(); blurAll(); })()`);
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(60);
  r = await EV(`(()=>{ const b2=document.querySelector('#ck-diag [data-ckd="top"]'); if(!b2) return {btn:false};
    b2.click(); closePop(); const out={btn:true, dp:song.diagPos, mode:diagMode};
    const j=JSON.parse(JSON.stringify(song)); loadSong(mkG()); out.fresh=diagMode; loadSong(j); render(); out.round=diagMode;
    out.lab=document.getElementById('b-diag').textContent;
    loadSong(mkG()); undoStack.length=0; setDiagPos('off'); out.off=diagMode; undo(); out.undo=diagMode;
    return out; })()`);
  T(r.btn && r.dp === 'top' && r.mode === 'top' && r.fresh === 'inline' && r.round === 'top' && r.lab === '图:曲首' && r.off === 'off' && r.undo === 'inline',
    'T3 和弦图位置存进 song.diagPos：往返保留、老谱随行、可撤销', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const out={};
    const peek=(inst)=>{ const s=createSong(inst,{title:'节奏',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0}); loadSong(s);
      sel={mi:0,row:'tab',vi:0,ci:0,si:1}; render(); try{ syncInputs(); }catch(_){}
      showPatternLib('tab'); const m=document.querySelector('.modal'); const nm=[...m.querySelectorAll('.pat-card:not(.cpat):not(.cpat-new) .nm')].map(x=>x.textContent);
      const svg=m.querySelector('.pat-card:not(.cpat):not(.cpat-new) svg');
      const o={h3:m.querySelector('h3').textContent, n0:nm[0], alt:nm.find(x=>/交替低音/.test(x)), slow:nm.find(x=>/^慢速/.test(x)), meter:nm.some(x=>/（4\\/4）/.test(x)),
        lines:svg? svg.querySelectorAll('line[stroke-width="0.6"]').length : 0,
        panel:(document.querySelector('#panel-tab-pat .rg-title')||{}).textContent||''};
      closeModal(); return o; };
    out.uku=peek('uku'); out.gtr=peek('guitar'); return out; })()`);
  const u = r.uku || {}, g = r.gtr || {};
  T(u.h3 === '尤克里里节奏型库' && u.n0 === '43231323 经典分解' && u.alt === '交替低音 4323 3323' && u.slow === '慢速 4·32·1·32' && u.meter && u.lines === 4 && /^尤克里里节奏型/.test(u.panel)
    && g.h3 === '吉他节奏型库' && g.n0 === '53231323 经典分解' && g.alt === '交替低音 5323 4323' && g.lines === 6 && /^吉他节奏型/.test(g.panel),
    'T4 尤克里里节奏型库标题/型名/四线图示随乐器，吉他不变', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
