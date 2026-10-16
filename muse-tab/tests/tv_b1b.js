/* v63.7 B1 录入零陷阱（二）（2026-10 评审团 §6.3 B1 ⑥–⑩：P2-17 / P2-26 / P3-16 / P3-17 / P3-18 / P2-25 可选档）
   T1 声部间移动：Alt+↓/↑ 逐个声部走、按拍位对齐；SATB 在 B 声部按 ↑ 到 T（不再跳回 S）
   T2 跨声部批量记号：SATB 同一拍多选后点延长号，4 个声部一次标完，一次 Ctrl+Z 全部撤回
   T3 套用技法后清空多选（后续操作不会覆盖刚标好的技法）；节奏型库提示写「Shift + 点小节上方条带可区域选择」
   T4 记号面板八度钮：没有选区时先确认，确认前谱面不变，确认后整个声部移八度
   T5 「智能编辑」改名「修复建议」；配和弦工作台候选显示「契合度」而不是原始分值
   T6 末尾空小节：打印弹窗与发布菜单都提示并可一键删除
   T7 GP / 简谱大师键位档（默认关闭）：关闭时「-」仍是降八度；开启后「-」＝增时线、六线谱 H＝击弦、Shift+点击＝区域选择
   T8 （v67.8）键位档走界面路径：T7 的开 / 关改为真实点击顶栏「偏好设置」里的开关（此前宿主 #hint-body 不存在，只能直接写本机键）；
      对 v67.7 原版复跑 T7 / T8 红（没有 #b-prefs，开不了 GP 档）
   突变实证：对 v63.7 之前的文件复跑，T1–T7 全部报红（0/7）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); localStorage.removeItem('musetab-keymap'); window.__toasts=[]; const ot=toast; toast=(m)=>{ __toasts.push(String(m)); try{ ot(m); }catch(_){} }; })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));
  const SATB_BODY = `const s=createSong('vox',{title:'合唱',key:'C',beats:4,unit:4,nMea:2,nVox:4,lyr:0});
    s.voxVoices=['S','A','T','B']; s.measures.forEach(m=>m.voxes.forEach((cs,vi)=>cs.forEach((c,ci)=>{ c.deg=[5,3,1,1][vi]; })));
    s.measures[0].voxes[2]=[{dur:2,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false},{dur:2,dotted:false,deg:2,acc:'',oct:0,lyrics:[],tie:false}];
    loadSong(s); undoStack.length=0; noteSel=[]; selRange=null; lastEnt=null; render(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();`;
  const SATB = '(()=>{ ' + SATB_BODY + ' })()';

  /* ---------- T1 ---------- */
  {
    await EV(SATB);
    await EV(`(()=>{ sel={mi:0,row:'vox',vi:0,ci:3,si:1}; render(); })()`);
    await pg.keyboard.press('Alt+ArrowDown'); const a = await EV(`sel.vi+':'+sel.ci`);
    await pg.keyboard.press('Alt+ArrowDown'); const b2 = await EV(`sel.vi+':'+sel.ci`);   // T 声部只有两个二分：第 4 拍落在第 2 列
    await EV(`(()=>{ sel={mi:0,row:'vox',vi:3,ci:1,si:1}; render(); })()`);
    await pg.keyboard.press('ArrowUp'); const up = await EV(`sel.vi+':'+sel.ci`);
    T(a === '1:3' && b2 === '2:1' && up === '2:0', 'T1 Alt+↓ 逐声部按拍位对齐；SATB 在 B 按 ↑ 到 T', JSON.stringify({ a, b2, up }));
  }

  /* ---------- T2 ---------- */
  {
    const r = await EV(`(()=>{ ${SATB_BODY}
      sel={mi:0,row:'vox',vi:0,ci:0,si:1};
      noteSel=[0,1,3].map(vi=>({row:'vox',vi,mi:0,ci:2,si:0})).concat([{row:'vox',vi:2,mi:0,ci:1,si:0}]);
      document.getElementById('b-ferm-v').onclick();
      const on=song.measures[0].voxes.map((cs,vi)=>cs[vi===2?1:2].ferm?1:0).join('');
      const steps=undoStack.length; undo();
      const off=song.measures[0].voxes.map((cs,vi)=>cs[vi===2?1:2].ferm?1:0).join('');
      return {on, steps, off}; })()`);
    T(r.on === '1111' && r.steps === 1 && r.off === '0000', 'T2 SATB 多选后延长号一次标完 4 声部、一步撤销', JSON.stringify(r));
  }

  /* ---------- T3 ---------- */
  {
    const r = await EV(`(()=>{ const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
      const s=createSong('solo',{title:'技法',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
      s.measures[0].tabs[0]=[mk({notes:[{s:1,f:5}]}),mk({notes:[{s:1,f:7}]}),mk({notes:[{s:1,f:8}]}),mk({notes:[{s:1,f:5}]})];
      loadSong(s); sel={mi:0,row:'tab',vi:0,ci:0,si:1};
      noteSel=[{row:'tab',vi:0,mi:0,ci:0,si:1},{row:'tab',vi:0,mi:0,ci:1,si:1}];
      techFromBar('v');
      const titles=[...document.querySelectorAll('.rg-title')].map(x=>x.textContent).filter(x=>/节奏型 ·/.test(x));
      return {n:noteSel.length, t:song.measures[0].tabs[0].slice(0,2).map(c=>c.notes[0].tech).join(','), titles}; })()`);
    T(r.n === 0 && /^v,/.test(r.t) && r.titles.length >= 2 && r.titles.every(x => /Shift \+ 点小节上方条带可区域选择/.test(x)),
      'T3 套用技法后清空多选；节奏型库提示改为区域选择说法', JSON.stringify(r));
  }

  /* ---------- T4 ---------- */
  {
    const r = await EV(`(async()=>{ const s=createSong('vox',{title:'八度',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
      s.measures.forEach(m=>m.voxes[0].forEach(c=>{ c.deg=3; })); loadSong(s); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; noteSel=[]; selRange=null;
      document.getElementById('b-octup').onclick(); await new Promise(r=>setTimeout(r,30));
      const asked=!!document.getElementById('oc-yes'), before=song.measures[0].voxes[0][0].oct||0;
      if(asked) document.getElementById('oc-yes').click(); await new Promise(r=>setTimeout(r,30));
      return {asked, before, after:song.measures.map(m=>m.voxes[0].map(c=>c.oct||0).join('')).join('|')}; })()`);
    T(r.asked && r.before === 0 && r.after === '1111|1111', 'T4 无选区八度钮先确认、确认后整个声部移八度', JSON.stringify(r));
  }

  /* ---------- T5 ---------- */
  {
    const r = await EV(`(async()=>{ const em=[...document.querySelectorAll('#em-toggle button')].map(x=>x.textContent.trim());
      loadSong(PRESETS[0].make()); render();
      const lb=document.getElementById('rt-lab')||document.getElementById('va-lab'); if(lb) lb.click(); await new Promise(r=>setTimeout(r,200));
      const sc=[...document.querySelectorAll('.cl-sc')].map(x=>x.textContent).slice(0,3); closeModal();
      return {em, sc}; })()`);
    T(r.em && r.em.includes('修复建议') && !r.em.includes('智能编辑') && r.sc && r.sc.length && r.sc.every(x => /^契合 (\d+%|—)$/.test(x)),
      'T5 「智能编辑」改名「修复建议」；候选显示契合度', JSON.stringify(r));
  }

  /* ---------- T6 ---------- */
  {
    const r = await EV(`(async()=>{ const s=createSong('vox',{title:'空尾',key:'C',beats:4,unit:4,nMea:8,nVox:1,lyr:0});
      s.measures.slice(0,2).forEach(m=>m.voxes[0].forEach(c=>{ c.deg=1; })); loadSong(s); render();
      document.getElementById('b-print').onclick(); await new Promise(r=>setTimeout(r,40));
      const note=(document.querySelector('.te-note')||{}).textContent||'';
      const tb=document.getElementById('ex-trim'); if(tb) tb.click(); await new Promise(r=>setTimeout(r,30));
      const n=song.measures.length; closeModal();
      /* 发布菜单 */
      const d2=createSong('vox',{title:'空尾2',key:'C',beats:4,unit:4,nMea:8,nVox:1,lyr:0}); d2.measures.slice(0,2).forEach(m=>m.voxes[0].forEach(c=>{ c.deg=1; }));
      const le={id:'libx1', title:'空尾', data:d2};   // 独立数据：上面的打印用例已把 s 本身裁掉了
      showPublishMenu(le, {left:100, top:100, bottom:110, right:110, width:10}); await new Promise(r=>setTimeout(r,30));
      const pt=!!document.getElementById('pub-trim'); closePop();
      return {note, n, pt}; })()`);
    T(/末尾有 6 个空小节/.test(r.note || '') && r.n === 2 && r.pt, 'T6 打印与发布前提示删除末尾空小节', JSON.stringify(r));
  }

  /* ---------- T7 ---------- */
  {
    const fresh = `(()=>{ loadSong(createSong('vox',{title:'键位',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0})); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; lastEnt=null; render(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); })()`;
    await EV(fresh); await pg.keyboard.press('5'); await pg.keyboard.press('-');
    const off = await EV(`song.measures[0].voxes[0][0].oct+'/'+song.measures[0].voxes[0][0].dur`);
    /* v67.8 UI 路径：键位档从顶栏「偏好设置」真实点击开启（原宿主 #hint-body 自 v56.6 起不存在，此前本套件只能直接写本机键） */
    const prefRow = async (want) => { await pg.click('#b-prefs', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(120);
      const before = await EV(`(document.querySelector('#modal-mask .prf-row[data-prf="keymap"]')||{getAttribute:()=>''}).getAttribute('aria-checked')`);
      if (before !== String(want)) await pg.click('#modal-mask .prf-row[data-prf="keymap"]', { timeout: 2500 }).catch(() => {});
      await pg.waitForTimeout(60);
      const r = await EV(`({ ls: localStorage.getItem('musetab-keymap'), on: gpKeysOn(), sw: (document.querySelector('#modal-mask .prf-row[data-prf="keymap"]')||{getAttribute:()=>''}).getAttribute('aria-checked') })`);
      await pg.click('#prf-ok', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(60); return r; };
    const uiOn = await prefRow(true);
    await EV(fresh); await pg.keyboard.press('5'); await pg.keyboard.press('-');
    const on = await EV(`(song.measures[0].voxes[0][0].oct||0)+'/'+song.measures[0].voxes[0][0].dur`);
    const tab = await EV(`(()=>{ const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
      const s=createSong('solo',{title:'h',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
      s.measures[0].tabs[0]=[mk({notes:[{s:1,f:5}]}),mk({notes:[{s:1,f:7}]}),mk({notes:[{s:1,f:8}]}),mk({notes:[{s:1,f:5}]})];
      loadSong(s); sel={mi:0,row:'tab',vi:0,ci:0,si:1}; render(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); return 1; })()`);
    await pg.keyboard.press('h');
    const h = await EV(`song.measures[0].tabs[0][0].notes[0].tech||''`);
    const rg = await EV(`(()=>{ sel={mi:0,row:'tab',vi:0,ci:0,si:1}; noteSel=[]; selRange=null; render();
      const cell=(ci)=>[...document.querySelectorAll('#score .strcell')].find(c=>+c.dataset.mi===0&&+c.dataset.ci===ci&&+c.dataset.si===1);
      const c2=cell(2); if(c2) c2.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,shiftKey:true,pointerType:'mouse',button:0}));
      return {r: selRange? selRange.m1+':'+selRange.c1+'-'+selRange.m2+':'+selRange.c2 : '', n:noteSel.length}; })()`);
    /* 上面区域选择用的是合成 pointerdown（没有真实按下）：谱面在这之后会吞掉下一次真实点击（真实 Shift+点击不会，已另测）——
       先在顶栏空白处点一下消化掉，再真点「偏好设置」 */
    { const g = await EV(`(()=>{ const r=document.querySelector('#top .main-bar .grow').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; })()`);
      if (g && g.x) { await pg.mouse.click(g.x, g.y); await pg.waitForTimeout(40); } }
    const uiOff = await prefRow(false);
    await EV(fresh); await pg.keyboard.press('5'); await pg.keyboard.press('-');
    const off2 = await EV(`song.measures[0].voxes[0][0].oct+'/'+song.measures[0].voxes[0][0].dur`);
    await EV(`localStorage.removeItem('musetab-keymap')`);
    T(off === '-1/4' && on === '0/2' && h === 'h' && rg.r === '0:0-0:2' && rg.n === 0,
      'T7 键位档默认关（- 降八度）；开启后 - 增时线、H 击弦、Shift+点击区域选择', JSON.stringify({ off, on, h, rg }));
    T(uiOn && uiOn.ls === 'gp' && uiOn.on === true && uiOn.sw === 'true' && uiOff && uiOff.ls === null && uiOff.on === false && uiOff.sw === 'false' && off2 === '-1/4',
      'T8 键位档走界面路径（v67.8）：顶栏「偏好设置」点开关＝写 musetab-keymap=gp（gpKeysOn 为真，上面 T7 的 - / H / Shift 行为即由此开启）；再点＝删除键，「-」回到降八度', JSON.stringify({ uiOn, uiOff, off2 }));
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
