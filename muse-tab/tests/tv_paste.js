/* tv_paste — 复制粘贴按小节 / 按时值正确落位（v67.3）
   负责人报告：「复制前面四小节粘贴到后面出现错误」（截图《快乐的小星星》4/4，第 5–8 小节标红 3/4 拍）。
   根因：简谱单声部谱没有小节号热区，按住从第 1 小节第一个音拖到第 4 小节最后一个音＝列级片段；
   复制时被拍平成一串列，粘贴按**目标小节原有列数**逐格硬塞（空小节＝4 个四分休止列）→ 6 列的小节只放进 4 列＝3 拍、后面一路错位。
   全程走真实鼠标拖选 / 点选 / Ctrl+点小节线 + 真实键盘 Ctrl+C / Ctrl+V / Ctrl+Z；数据形状用数值断言（拍数/列签名/引用坐标）。
   T1  用户截图同形：拖音符选第 1–4 小节 → 第 5 小节 Ctrl+V → 5–8＝1–4、每小节 4 拍、无节拍错误；渐强 dynTo 随内容平移；Ctrl+Z 一步撤回
   T2  Ctrl+点小节线连选第 1–4 小节 → 粘贴同样正确（整声部剪贴板回归）
   T3  局部列片段跨小节线按时值覆盖：从目标第 3 拍起铺 4 拍，顺延进下一小节，两小节都 4 拍
   T4  跨小节线的音拆成整时值并用连音线相连；歌词只留前半；末尾被截断的原音补休止
   T5  连音组：放得下＝整组原样；会跨小节线＝整次拒绝（谱面不变、不进撤销栈、提示含「连音」）
   T6  吉他谱 TAB：拖音符选 2 小节（八分）→ 粘贴逐小节替换；击弦 tk 平移到新小节，指向复制范围外的连音线 tk 作废
   T7  吉他谱 TAB 拖小节号整小节粘贴（measureRange）：tk 同样平移
   T8  吉他谱 TAB 局部片段跨小节线：二分音符拆成两拍，后半逐音 tieIn 且 tabTieMap 判定有效
   T9  钢琴大谱表：只替换所拖的右手，左手不动；五线谱从光标所在音按住拖选＝建立选区（不再按下即改音高），单击仍定音高
   T10 𝄎 小节反复：拖选含 𝄎 的两小节复制＝取实际演奏内容；粘贴进 𝄎 小节先展开为实写（不被 𝄎 盖住）
   T11 𝄎 整小节复制（拖小节号）：𝄎 的源小节也在复制范围内 → 粘贴后保留 𝄎
   T12 连音线跨小节（简谱 tie）在复制范围内保留；歌词随音粘贴
   T13 多声部只改所拖声部；光标落在连音组中间时从组首开始按时值覆盖
   ——— 验收补（对抗式验收发现逐条回归，修前红 / 修后绿）———
   T14 相邻同型三连音各自成块（每 N 个一块，与刻版同口径）：两组可逐组铺开；粘一拍只盖一组、旁边那组保留
   T15 弹唱谱跨行拖选简谱 1–4 小节：列选不被吉他谱框选改写
   T16 拖选 → Ctrl+C → 方向键移光标 → Ctrl+V：落在光标处（方向键放下选区）
   T17 五线谱有选区时单击光标音仍定音高
   T18 双吉他轨跨行框选：复制范围只按起点所在轨算
   T19 源含变拍小节：先问拍号；保留＝按时值铺开无错、应用＝改拍号按小节替换
   T20 弱起 + 3 小节按片段复制，光标放目标弱拍粘贴即对齐
   T21 默认键位「点首音 + Shift+点末音」复制两点之间
   T22 拆音：拍位和弦落到所在段、延长记号在末段
   T23 整小节剪贴板光标在小节中间：从小节开头替换并提示
   T24 框选后 Ctrl+点增减音：不再按旧框复制
   T25 𝄎² 展开实例的跨小节 tk 按演奏顺序换算
   ——— 第二轮验收补（修复者改动的独立验收发现，修前红 / 修后绿）———
   T26 方向键「无处可去」（单声部按 ↑/↓）不放下选区、画面与状态一致：随后 . 作用于整个选区、Ctrl+C 复制选区；光标真动了才放下并重绘
   T27 撤销 / 删小节后残留的 Ctrl 多选、TAB 框选：Ctrl+C 不抛异常、剪贴板照常更新，Ctrl+V 不粘出上一次的内容
   T28 不等时值连音（摇摆 [四分三连 八分三连]）按实际时值断块：粘两个八分到第1拍成功；[q3 e3]×2 从第4拍起逐组铺开
   T29 光标已隐藏（点谱面空白）时真实键盘 Shift+点：不从看不见的旧光标处复制区间
   T30 弱起：Ctrl+点小节线含弱起＝片段剪贴板；拖小节号含弱起＝弱起补前置休止成整小节；整小节声部剪贴板粘到弱起小节＝拒绝
   T31 拆音时音头在 3.5 拍：拍位和弦落到不晚于它的拍位、且不超出该段增时线数
   T32 TAB 按住拖选、按下 / 松手点偏离格心 3px：复制范围仍是整段（首末列不丢），粘贴逐小节相同
   T33 单小节声部剪贴板（clipRow）先认光标行：简谱剪贴板点吉他格粘贴＝拒绝；目标谱没有该声部＝拒绝、不写孤儿数据
   突变实证（第二轮）：MUSETAB_URL=scratchpad/v673/r3/before-r3.html（第二轮修复前的合并树）→ PASS 38/49，T26–T33 新增 11 项全红、原 38 项全绿 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); try { localStorage.setItem('musetab-autoadv', 'on'); } catch (_) {} });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  /* ---- 真实 UI 工具 ---- */
  const center = async (sel) => {
    const loc = pg.locator(sel).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await loc.boundingBox();
    if (!bb) throw new Error('no box: ' + sel);
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  };
  const cell = (row, mi, ci, vi, si) => `[data-row="${row}"][data-vi="${vi || 0}"][data-mi="${mi}"][data-ci="${ci}"]` + (si ? `[data-si="${si}"]` : '');
  const click = async (sel, mod) => {
    const p = await center(sel);
    if (mod) await pg.keyboard.down(mod);
    await pg.mouse.click(p.x, p.y);
    if (mod) await pg.keyboard.up(mod);
    await pg.waitForTimeout(40);
  };
  const drag = async (selA, selB) => {
    const a = await center(selA), z = await center(selB);
    await pg.mouse.move(a.x, a.y); await pg.mouse.down();
    await pg.mouse.move((a.x + z.x) / 2, (a.y + z.y) / 2, { steps: 6 });
    await pg.mouse.move(z.x, z.y, { steps: 6 });
    await pg.mouse.up(); await pg.waitForTimeout(40);
  };
  const key = async (k) => { await pg.keyboard.press(k); await pg.waitForTimeout(60); };
  const load = (src) => pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined'){ undoStack.length=0; redoStack.length=0; }
    clipMeasure=null; clipMeasures=null; clipRow=null; clipCols=null; selRange=null; measureRange=null; measureSel=null; barSel=null; noteSel=[];
    const s=(${src})(); loadSong(s); blurSel=true; render(); return true; })()`);
  /* 页内签名：简谱列 deg[,|']/dur[.][~]，TAB 列 s:f.../dur[.] */
  await pg.evaluate(() => {
    window.__sigV = (mi, vi) => ((song.measures[mi] || {}).voxes || [])[vi || 0].map(c => (c.deg || 0) + (c.oct < 0 ? ',' : c.oct > 0 ? "'" : '') + '/' + c.dur + (c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '') + (c.tie ? '~' : '')).join(' ');
    window.__sigT = (mi, vi) => ((song.measures[mi] || {}).tabs || [])[vi || 0].map(c => (c.notes || []).map(n => n.s + ':' + n.f + (n.tieIn ? '^' : '')).join('+') + '/' + c.dur + (c.dotted ? '.' : '')).join(' ');
    window.__beats = (mi, row, vi) => (((song.measures[mi] || {})[row === 'tab' ? 'tabs' : 'voxes'] || [])[vi || 0] || []).reduce((a, c) => a + beatsOf(c, meaMeter(mi).unit), 0);
  });

  /* 《快乐的小星星》同形：1=B 4/4，单旋律声部，8 小节（后 4 小节为新建默认空小节） */
  const STAR = `()=>{ const s=createSong('vocal',{title:'快乐的小星星',beats:4,unit:4,key:'B',nVox:1,nMea:8,lyr:1});
    const V=(deg,dur,dotted,oct,ly)=>({dur,dotted:!!dotted,deg,acc:'',oct:oct||0,lyrics:ly?[ly]:[],tie:false});
    s.measures[0].voxes[0]=[V(1,4,0,0,'一'),V(5,4,0,0,'闪'),V(1,8,1),V(1,16),V(5,8,1),V(1,16)];
    s.measures[1].voxes[0]=[V(5,4,0,-1),V(5,4),V(5,8,1),V(5,16),V(6,8,1),V(5,16)];
    s.measures[2].voxes[0]=[V(6,4,0,-1),V(5,4),V(6,8,1,-1),V(6,16),V(1,8,1),V(6,16,0,-1)];
    s.measures[3].voxes[0]=[V(4,4,0,0,'满'),V(4,4,0,0,'天'),V(5,2,0,0,'星')];
    s.measures[0].voxes[0][0].dyn='<'; s.measures[0].voxes[0][0].dynTo={mi:0,ci:3};
    return s; }`;

  // ---------- T1 用户截图同形：拖音符选 1–4 小节 → 第 5 小节 Ctrl+V ----------
  await load(STAR);
  await drag(cell('vox', 0, 0), cell('vox', 3, 2));
  let r = await pg.evaluate(() => JSON.stringify(selRange));
  await key('Control+c');
  await click(cell('vox', 4, 0));
  const und0 = await pg.evaluate(() => undoStack.length);
  await key('Control+v');
  r = await pg.evaluate((und0) => {
    const same = [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k));
    return { sel: '', same, beats: [4, 5, 6, 7].map(m => __beats(m, 'vox')), errs: beatErrors().length, nMea: song.measures.length,
      m5: __sigV(4), dynTo: JSON.stringify(song.measures[4].voxes[0][0].dynTo || null), undo: undoStack.length - und0 };
  }, und0);
  T(r.same && r.beats.join(',') === '4,4,4,4' && r.errs === 0 && r.nMea === 8 && r.undo === 1,
    'T1 拖音符选第1–4小节→第5小节粘贴：5–8＝1–4、每小节4拍、无节拍错误、一步撤销', JSON.stringify(r));
  T(r.dynTo === '{"mi":4,"ci":3}', 'T1b 渐强 dynTo 随内容平移到第5小节', r.dynTo);
  await key('Control+z');
  r = await pg.evaluate(() => ({ m5: __sigV(4), m8: __sigV(7), m1: __sigV(0) }));
  T(r.m5 === '0/4 0/4 0/4 0/4' && r.m8 === '0/4 0/4 0/4 0/4' && r.m1.startsWith('1/4 5/4 1/8.'), 'T1c Ctrl+Z 一步撤回整次粘贴', JSON.stringify(r));

  // ---------- T2 Ctrl+点小节线连选第 1–4 小节 ----------
  await load(STAR);
  await click('[data-bar="-1:0:vox:0"]', 'Control');
  await click('[data-bar="2:3:vox:0"]', 'Control');
  r = await pg.evaluate(() => JSON.stringify(selRange));
  await key('Control+c');
  await click(cell('vox', 4, 0));
  await key('Control+v');
  r = await pg.evaluate((s0) => ({ s0, same: [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k)), errs: beatErrors().length }), r);
  T(r.same && r.errs === 0, 'T2 Ctrl+点小节线连选1–4小节→粘贴正确', JSON.stringify(r));

  // ---------- T3 局部列片段跨小节线：按时值覆盖 ----------
  await load(STAR);
  await drag(cell('vox', 0, 2), cell('vox', 1, 1));   // 1·1 5·1 | 5̣ 5 ＝ 4 拍
  await key('Control+c');
  await click(cell('vox', 5, 2));                      // 第 6 小节第 3 拍
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), m7: __sigV(6), b: [5, 6].map(m => __beats(m, 'vox')), errs: beatErrors().length }));
  T(r.m6 === '0/4 0/4 1/8. 1/16 5/8. 1/16' && r.m7 === '5,/4 5/4 0/4 0/4' && r.b.join(',') === '4,4' && r.errs === 0,
    'T3 跨小节列片段按时值覆盖（从第3拍起顺延进下一小节，两小节都4拍）', JSON.stringify(r));

  // ---------- T4 跨小节线拆音 + 连音线；歌词只留前半；被截断的原音补休止 ----------
  await load(`()=>{ const s=(${STAR})(); s.measures[6].voxes[0]=[{dur:1,dotted:false,deg:3,acc:'',oct:0,lyrics:['长'],tie:false}]; return s; }`);
  await drag(cell('vox', 3, 1), cell('vox', 3, 2));   // 4 5– ＝ 3 拍（第 4 小节后两列）
  await key('Control+c');
  await click(cell('vox', 5, 2));                      // 第 6 小节第 3 拍：4 占第 3 拍，5– 跨线
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), m7: __sigV(6), ly6: (song.measures[5].voxes[0][3].lyrics || []).join(''),
    ly7: ((song.measures[6].voxes[0][0] || {}).lyrics || []).join(''), b: [5, 6].map(m => __beats(m, 'vox')), errs: beatErrors().length }));
  T(r.m6 === '0/4 0/4 4/4 5/4~' && r.m7 === '5/4 0/2.' && r.ly6 === '星' && r.ly7 === '' && r.b.join(',') === '4,4' && r.errs === 0,
    'T4 跨小节线的音拆开并连音线相连、歌词只留前半、截断的全音符余3拍补休止', JSON.stringify(r));

  // ---------- T5 连音组：整组不拆；会跨小节线则拒绝 ----------
  const TUP = `()=>{ const s=(${STAR})();
    const V=(deg,dur,tup)=>{ const c={dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false}; if(tup) c.tup=tup; return c; };
    s.measures[1].voxes[0]=[V(1,8,3),V(2,8,3),V(3,8,3),V(5,4),V(5,2)];
    s.measures[6].voxes[0]=[V(0,4),V(0,4),V(0,4),V(0,8),V(0,8)];
    return s; }`;
  await load(TUP);
  await drag(cell('vox', 1, 0), cell('vox', 1, 3));   // 三连音组(1拍) + 5(1拍)
  await key('Control+c');
  await click(cell('vox', 5, 3));                      // 第 6 小节第 4 拍：三连音整组放进第 4 拍，5 顺延
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), m7: __sigV(6), b: [5, 6].map(m => __beats(m, 'vox')) }));
  T(r.m6 === '0/4 0/4 0/4 1/8t3 2/8t3 3/8t3' && r.m7.startsWith('5/4 ') && r.b.join(',') === '4,4',
    'T5 连音组整组原样落进一拍、其后顺延', JSON.stringify(r));
  const before = await pg.evaluate(() => ({ j: JSON.stringify(song), u: undoStack.length }));
  await click(cell('vox', 6, 4));                      // 第 7 小节最后一个八分：只剩半拍，三连音放不下
  await key('Control+v');
  r = await pg.evaluate((b0) => ({ same: JSON.stringify(song) === b0.j, undo: undoStack.length - b0.u,
    toast: (document.getElementById('toast') || {}).textContent || '' }), before);
  T(r.same && r.undo === 0 && /连音/.test(r.toast), 'T5b 连音组会跨小节线→整次拒绝（谱面不变、不进撤销栈、提示）', JSON.stringify(r));

  // ---------- T6 吉他谱 TAB：拖音符选 2 小节 → 逐小节替换；tk 平移 / 范围外作废 ----------
  const GTR = `()=>{ const s=createSong('guitar',{title:'g',beats:4,unit:4,key:'C',nMea:6,nTab:1,lyr:0});
    const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
    s.measures[0].tabs[0]=[0,2,3,5,7,5,3,2].map(f=>t(f,8));
    s.measures[0].tabs[0][0].notes[0].tech='h'; s.measures[0].tabs[0][0].notes[0].tk={mi:0,ci:1,si:3};
    s.measures[1].tabs[0]=[t(5,4),t(7,4),t(9,4),t(9,4)];
    s.measures[1].tabs[0][3].notes[0].tk={mi:2,ci:0,si:3};   // 纯连音线连到第 3 小节（复制范围外）
    s.measures[2].tabs[0]=[t(9,4),t(0,4),t(0,4),t(0,4)];
    return s; }`;
  await load(GTR);
  await drag(cell('tab', 0, 0, 0, 3), cell('tab', 1, 3, 0, 3));
  await key('Control+c');
  await click(cell('tab', 3, 0, 0, 3));
  await key('Control+v');
  r = await pg.evaluate(() => ({ same: __sigT(3) === __sigT(0) && __sigT(4) === __sigT(1), b: [3, 4].map(m => __beats(m, 'tab')),
    tk0: JSON.stringify(((song.measures[3].tabs[0][0] || {}).notes || [])[0]?.tk || null), tk3: JSON.stringify(((song.measures[4].tabs[0][3] || {}).notes || [])[0]?.tk || null),
    src: JSON.stringify(song.measures[0].tabs[0][0].notes[0].tk) }));
  T(r.same && r.b.join(',') === '4,4', 'T6 TAB 拖音符选2小节→逐小节替换、每小节4拍', JSON.stringify(r));
  T(r.tk0 === '{"mi":3,"ci":1,"si":3}' && r.tk3 === 'null' && r.src === '{"mi":0,"ci":1,"si":3}',
    'T6b TAB 击弦 tk 平移到粘贴小节、指向复制范围外的连音线 tk 作废、源小节不受影响', JSON.stringify(r));

  // ---------- T7 TAB 拖小节号整小节粘贴（measureRange）：tk 同样平移 ----------
  await load(GTR);
  await drag('[data-measuresel="0"]', '[data-measuresel="1"]');
  r = await pg.evaluate(() => JSON.stringify(measureRange));
  await key('Control+c');
  await click('[data-measuresel="3"]');
  await key('Control+v');
  r = await pg.evaluate((mr) => ({ mr, same: __sigT(3) === __sigT(0) && __sigT(4) === __sigT(1),
    tk0: JSON.stringify(((song.measures[3].tabs[0][0] || {}).notes || [])[0]?.tk || null), tk3: JSON.stringify(((song.measures[4].tabs[0][3] || {}).notes || [])[0]?.tk || null) }), r);
  T(r.mr === '{"m1":0,"m2":1}' && r.same && r.tk0 === '{"mi":3,"ci":1,"si":3}' && r.tk3 === 'null',
    'T7 拖小节号整小节粘贴：击弦 tk 平移、范围外 tk 作废', JSON.stringify(r));

  // ---------- T8 TAB 局部片段跨小节线：后半逐音 tieIn 且有效 ----------
  await load(`()=>{ const s=(${GTR})(); const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:2,f}],strum:'',tech:''});
    s.measures[1].tabs[0]=[t(5,4),t(7,2),t(8,4)]; delete s.measures[0].tabs[0][0].notes[0].tk; s.measures[0].tabs[0][0].notes[0].tech=''; return s; }`);
  await drag(cell('tab', 1, 1, 0, 2), cell('tab', 1, 2, 0, 2));   // 二分 7 + 四分 8 ＝ 3 拍
  await key('Control+c');
  await click(cell('tab', 3, 3, 0, 2));                            // 第 4 小节第 4 拍
  await key('Control+v');
  r = await pg.evaluate(() => { const tm = tabTieMap(song, 0);
    return { m4: __sigT(3), m5: __sigT(4), b: [3, 4].map(m => __beats(m, 'tab')), tie: JSON.stringify(tm.from['4:0:2'] || null) }; });
  T(r.m4 === '/4 /4 /4 2:7/4' && r.m5 === '2:7^/4 2:8/4 /4 /4' && r.b.join(',') === '4,4' && r.tie === '{"mi":3,"ci":3,"s":2}',
    'T8 TAB 二分音符跨小节线拆成两拍、后半 tieIn 有效（tabTieMap）', JSON.stringify(r));

  // ---------- T9 钢琴大谱表：只替换所拖的右手 ----------
  await load(`()=>{ const s=createSong('pianoacc',{title:'p',beats:4,unit:4,key:'C',nMea:6,lyr:0});
    const V=(deg,dur)=>({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false});
    s.measures[0].voxes[0]=[1,2,3,4,5,4,3,2].map(d=>V(d,8)); s.measures[1].voxes[0]=[V(1,2),V(5,8),V(4,8),V(3,4)];
    s.measures.forEach(m=>{ m.voxes[1]=[V(1,1)]; m.voxes[1][0].oct=-1; });
    return s; }`);
  await drag(cell('vox', 0, 0, 0), cell('vox', 1, 3, 0));
  await key('Control+c');
  await click(cell('vox', 3, 0, 0));
  await key('Control+v');
  r = await pg.evaluate(() => ({ rh: __sigV(3, 0) === __sigV(0, 0) && __sigV(4, 0) === __sigV(1, 0), lh: [3, 4].map(m => __sigV(m, 1)).join('|'),
    b: [3, 4].map(m => __beats(m, 'vox', 0)), errs: beatErrors().length, first: __sigV(0, 0).split(' ')[0] }));
  T(r.rh && r.lh === "1,/1|1,/1" && r.b.join(',') === '4,4' && r.errs === 0, 'T9 钢琴：只替换右手 2 小节、左手不动', JSON.stringify(r));
  /* 五线谱「再点已选中的音＝按线/间定音高」改为松手且未移动时才生效：从光标所在的音按住拖选不再改它的音高（上面 T9 起点＝初始光标列） */
  T(r.first === '1/8', 'T9b 五线谱从光标所在音按住拖选：建立选区、不改该音音高', r.first);
  r = await pg.evaluate(() => { sel = { mi: 5, row: 'vox', vi: 0, ci: 0, si: 1, q: 0 }; blurSel = false; render();
    const rect = document.querySelector('[data-row="vox"][data-vi="0"][data-mi="5"][data-ci="0"][data-staffb]');
    const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.height / svg.viewBox.baseVal.height, bb = rect.getBoundingClientRect();
    return { x: bb.x + bb.width / 2, y: R.top + (+rect.dataset.staffb - 3.75 * 4) * k, d0: song.measures[5].voxes[0][0].deg };
  });
  await pg.mouse.click(r.x, r.y); await pg.waitForTimeout(80);
  r = await pg.evaluate((d0) => ({ d0, d1: song.measures[5].voxes[0][0].deg }), r.d0);
  T(r.d0 === 0 && r.d1 > 0, 'T9c 五线谱再点已选中的空拍（点击不移动）仍按线/间定音高', JSON.stringify(r));

  // ---------- T10 𝄎 小节反复：复制取演奏内容；粘贴进 𝄎 小节先展开 ----------
  const SIM = `()=>{ const s=(${STAR})(); s.measures[1].simile=1; s.measures[6].simile=1; return s; }`;   // 第 2 小节＝𝄎（奏第 1 小节）；第 7 小节也是 𝄎
  await load(SIM);
  await drag(cell('vox', 0, 0), cell('vox', 1, 0));    // 第 1 小节 + 𝄎 小节（𝄎 热区只有一格）
  await key('Control+c');
  await click(cell('vox', 4, 0));
  await key('Control+v');
  r = await pg.evaluate(() => ({ m5: __sigV(4) === __sigV(0), m6: __sigV(5) === __sigV(0), sim6: song.measures[5].simile || 0, errs: beatErrors().length }));
  T(r.m5 && r.m6 && r.sim6 === 0 && r.errs === 0, 'T10 拖选含 𝄎 的两小节→粘贴出实际演奏内容（两小节都是第1小节）', JSON.stringify(r));
  await click(cell('vox', 6, 0));                       // 点 𝄎 小节（第 7 小节）
  await key('Control+v');
  r = await pg.evaluate(() => ({ sim7: song.measures[6].simile || 0, m7: __sigV(6) === __sigV(0), m8: __sigV(7) === __sigV(0),
    svg: !!document.querySelector('[data-row="vox"][data-mi="6"][data-ci="5"]') }));
  T(r.sim7 === 0 && r.m7 && r.m8 && r.svg, 'T10b 粘贴进 𝄎 小节：先展开为实写，粘贴内容可见（不被 𝄎 盖住）', JSON.stringify(r));

  // ---------- T11 𝄎 整小节复制（拖小节号）：源小节在复制范围内 → 保留 𝄎 ----------
  await load(`()=>{ const s=(${GTR})(); s.measures[1].simile=1; s.measures[1].tabs[0]=[0,0,0,0].map(()=>({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''})); return s; }`);
  await drag('[data-measuresel="0"]', '[data-measuresel="1"]');
  await key('Control+c');
  await click('[data-measuresel="3"]');
  await key('Control+v');
  r = await pg.evaluate(() => ({ m4: __sigT(3) === __sigT(0), sim5: song.measures[4].simile || 0, play5: simileSrc(4) }));
  T(r.m4 && r.sim5 === 1 && r.play5 === 3, 'T11 整小节复制含 𝄎（源在范围内）→ 粘贴后保留 𝄎 且奏粘贴的前一小节', JSON.stringify(r));

  // ---------- T12 连音线跨小节（简谱 tie）在复制范围内保留；歌词随音粘贴 ----------
  await load(`()=>{ const s=(${STAR})(); const L=s.measures[0].voxes[0]; L[5].deg=5; L[5].tie=true; s.measures[1].voxes[0][0].oct=0; s.measures[1].voxes[0][0].deg=5; return s; }`);
  await drag(cell('vox', 0, 0), cell('vox', 1, 5));
  await key('Control+c');
  await click(cell('vox', 4, 0));
  await key('Control+v');
  r = await pg.evaluate(() => ({ tie: !!(song.measures[4].voxes[0][5] || {}).tie, ly: song.measures[4].voxes[0].map(c => (c.lyrics || []).join('')).join(''), same: __sigV(5) === __sigV(1) }));
  T(r.tie && r.ly === '一闪' && r.same, 'T12 跨小节连音线与歌词随音粘贴', JSON.stringify(r));

  // ---------- T13 多声部（合唱两声部简谱）：只改所拖声部；光标落在连音组中间时从组首开始 ----------
  await load(`()=>{ const s=createSong('vocal',{title:'c',beats:4,unit:4,key:'C',nVox:2,nMea:6,lyr:0});
    const V=(deg,dur,tup)=>{ const c={dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false}; if(tup) c.tup=tup; return c; };
    s.measures[0].voxes[1]=[V(3,8),V(4,8),V(5,4),V(6,2)];
    s.measures[0].voxes[0]=[V(1,1)]; s.measures[1].voxes[0]=[V(2,1)]; s.measures[2].voxes[0]=[V(3,1)];
    s.measures[2].voxes[1]=[V(1,8,3),V(2,8,3),V(3,8,3),V(5,4),V(6,2)];
    return s; }`);
  await drag(cell('vox', 0, 0, 1), cell('vox', 0, 2, 1));   // 第二声部 3 4 5 ＝ 2 拍（局部）
  await key('Control+c');
  await click(cell('vox', 2, 1, 1));                         // 第 3 小节第二声部三连音的第 2 个音
  await key('Control+v');
  r = await pg.evaluate(() => ({ v2: __sigV(2, 1), v1: __sigV(2, 0), b: __beats(2, 'vox', 1), other: __sigV(1, 1) }));
  T(r.v2 === '3/8 4/8 5/4 6/2' && r.v1 === '3/1' && r.b === 4 && r.other === '0/4 0/4 0/4 0/4',
    'T13 多声部只改第二声部；光标在三连音中间→从组首按时值覆盖（三连音整组被盖掉、余下不动）', JSON.stringify(r));

  /* ================= 验收补（对抗式验收发现逐条回归）================= */
  const toastTxt = () => pg.evaluate(() => (document.getElementById('toast') || {}).textContent || '');

  // ---------- T14 相邻的同型三连音各自成块（与刻版「每 N 个一块」同口径）----------
  const TUP2 = `()=>{ const s=createSong('vocal',{title:'tup',beats:4,unit:4,key:'C',nVox:1,nMea:8,lyr:0});
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    s.measures[0].voxes[0]=[V(1,8,{tup:3}),V(2,8,{tup:3}),V(3,8,{tup:3}),V(4,8,{tup:3}),V(5,8,{tup:3}),V(6,8,{tup:3}),V(5,2)];
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[2].voxes[0]=[V(1,8),V(2,8),V(3,4),V(4,2)];
    s.measures[5].voxes[0]=[V(7,8,{tup:3}),V(7,8,{tup:3}),V(7,8,{tup:3}),V(6,8,{tup:3}),V(6,8,{tup:3}),V(6,8,{tup:3}),V(5,2)];
    return s; }`;
  await load(TUP2);
  await drag(cell('vox', 0, 0), cell('vox', 0, 5));    // 两组三连音（每组 1 拍，共 2 拍）
  await key('Control+c');
  await click(cell('vox', 4, 3));                       // 第 5 小节第 4 拍：第一组放进第 4 拍，第二组顺延进第 6 小节
  await key('Control+v');
  r = await pg.evaluate(() => ({ m5: __sigV(4), m6: __sigV(5), b: [4, 5].map(m => __beats(m, 'vox')) }));
  T(r.m5 === '0/4 0/4 0/4 1/8t3 2/8t3 3/8t3' && r.m6 === '4/8t3 5/8t3 6/8t3 6/8t3 6/8t3 6/8t3 5/2' && r.b.join(',') === '4,4',
    'T14 两组相邻三连音逐组铺开（第4拍放一组、第二组顺延进下一小节，不误判跨线拒绝）', JSON.stringify(r));
  await load(TUP2);
  await drag(cell('vox', 1, 0), cell('vox', 1, 1));    // 1 2（两个四分）
  await key('Control+c');
  await click(cell('vox', 5, 3));                       // 第 6 小节第二组三连音的第 1 个音
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), b: __beats(5, 'vox') }));
  T(r.m6 === '7/8t3 7/8t3 7/8t3 1/4 2/4 0/4' && r.b === 4, 'T14b 光标在第二组三连音开头：第一组原样保留，从第 2 拍起覆盖', JSON.stringify(r));
  await load(TUP2);
  await drag(cell('vox', 2, 0), cell('vox', 2, 1));    // 两个八分＝1 拍
  await key('Control+c');
  await click(cell('vox', 5, 0));
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), b: __beats(5, 'vox') }));
  T(r.m6 === '1/8 2/8 6/8t3 6/8t3 6/8t3 5/2' && r.b === 4, 'T14c 只覆盖第一组三连音：旁边没选中的第二组保留（不再被换成休止）', JSON.stringify(r));

  // ---------- T15 弹唱谱（吉他谱在上、简谱在下）跨行拖选简谱第 1–4 小节：不被吉他谱框选抢走 ----------
  const TC = `()=>{ const s=createSong('guitar',{title:'弹唱',beats:4,unit:4,key:'C',nMea:12,nTab:1,nVox:1,lyr:1});
    const V=(deg,dur,dotted,oct,ly)=>({dur,dotted:!!dotted,deg,acc:'',oct:oct||0,lyrics:ly?[ly]:[],tie:false});
    const t=(f,dur,s2)=>({dur,dotted:false,chord:'',notes:[{s:s2||3,f}],strum:'',tech:''});
    for(let m=0;m<4;m++){
      s.measures[m].voxes[0]=[V(1+m,4,0,0,'字'),V(5,4),V(1,8,1),V(1,16),V(5,8,1),V(1,16)];
      s.measures[m].tabs[0]=[t(m,8),t(2,8),t(3,8),t(5,8),t(7,4,2),t(5,4,2)];
    }
    return s; }`;
  await load(TC);
  const ys = await pg.evaluate(() => [0, 3].map(m => Math.round(document.querySelector('[data-row="vox"][data-vi="0"][data-mi="' + m + '"][data-ci="0"]').getBoundingClientRect().y)));
  await drag(cell('vox', 0, 0), cell('vox', 3, 5));
  r = await pg.evaluate(() => ({ sr: JSON.stringify(selRange), ns: noteSel.length }));
  await key('Control+c');
  await click(cell('vox', 6, 0));
  await key('Control+v');
  r = await pg.evaluate((r0) => Object.assign(r0, { vox: [0, 1, 2, 3].every(k => __sigV(k + 6) === __sigV(k)),
    tab: [6, 7, 8, 9].map(m => __sigT(m)).join('|'), errs: beatErrors().length }), r);
  T(ys[1] > ys[0] && r.sr === '{"row":"vox","vi":0,"m1":0,"c1":0,"m2":3,"c2":5}' && r.ns === 0 && r.vox && r.errs === 0
    && r.tab === '/4 /4 /4 /4|/4 /4 /4 /4|/4 /4 /4 /4|/4 /4 /4 /4',
    'T15 弹唱谱跨行拖选简谱 1–4 小节：保持简谱列选（框选不改写），粘贴到第7小节＝1–4、吉他谱不动', JSON.stringify(Object.assign({ ys }, r)));

  // ---------- T16 拖选 → Ctrl+C → 方向键移光标到目标 → Ctrl+V：落在光标处（方向键放下选区，GP 式）----------
  await load(STAR);
  await drag(cell('vox', 0, 0), cell('vox', 3, 2));
  await key('Control+c');
  for (let i = 0; i < 21; i++) await pg.keyboard.press('ArrowRight');   // 第1小节第1列 → 第5小节第1列
  r = await pg.evaluate(() => ({ at: sel.mi + ':' + sel.ci, sr: selRange }));
  await key('Control+v');
  r = await pg.evaluate((r0) => Object.assign(r0, { same: [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k)), errs: beatErrors().length }), r);
  T(r.at === '4:0' && r.sr === null && r.same && r.errs === 0, 'T16 方向键移到第5小节后粘贴：5–8＝1–4（不再粘回源选区）', JSON.stringify(r));
  await load(STAR);
  await drag(cell('vox', 0, 2), cell('vox', 1, 1));    // 局部片段
  await key('Control+c');
  for (let i = 0; i < 23; i++) await pg.keyboard.press('ArrowRight');   // → 第6小节第1列
  await key('Control+v');
  r = await pg.evaluate(() => ({ at: sel.mi + ':' + sel.ci, m6: __sigV(5), m1: __sigV(0) }));
  T(r.at === '5:0' && r.m6 === '1/8. 1/16 5/8. 1/16 5,/4 5/4' && r.m1.startsWith('1/4 5/4 1/8.'), 'T16b 局部片段同样落在方向键移到的光标处', JSON.stringify(r));

  // ---------- T17 五线谱：有拖选选区时单击光标所在的音，仍按线/间定音高 ----------
  await load(`()=>{ const s=createSong('staff',{title:'五线谱',beats:4,unit:4,key:'C',nVox:1,nMea:6,lyr:0});
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)]; s.measures[1].voxes[0]=[V(5,4),V(6,4),V(7,4),V(1,4,{oct:1})]; return s; }`);
  await click(cell('vox', 0, 0));
  await drag(cell('vox', 0, 2), cell('vox', 1, 2));
  r = await pg.evaluate(() => { const rect = document.querySelector('[data-row="vox"][data-vi="0"][data-mi="0"][data-ci="2"][data-staffb]');
    const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.height / svg.viewBox.baseVal.height, bb = rect.getBoundingClientRect();
    return { x: bb.x + bb.width / 2, y: R.top + (+rect.dataset.staffb - 3.75 * 9) * k, d0: song.measures[0].voxes[0][2].deg, sr: !!selRange, u0: undoStack.length }; });
  await pg.mouse.click(r.x, r.y); await pg.waitForTimeout(80);
  r = await pg.evaluate((r0) => ({ sr0: r0.sr, d0: r0.d0, d1: song.measures[0].voxes[0][2].deg, undo: undoStack.length - r0.u0, toast: (document.getElementById('toast') || {}).textContent || '' }), r);
  T(r.sr0 && r.d0 === 3 && r.d1 === 5 && r.undo === 1 && /音高/.test(r.toast), 'T17 有选区时单击光标音（选区起点）→ 定音高、一步可撤', JSON.stringify(r));

  // ---------- T18 双吉他轨跨行框选第 1–4 小节：范围只按起点所在轨算 ----------
  const GT2 = `()=>{ const s=createSong('guitar',{title:'g2',beats:4,unit:4,key:'C',nMea:8,nTab:2,nVox:0,lyr:0});
    const t=(f,dur,s2)=>({dur,dotted:false,chord:'',notes:[{s:s2||3,f}],strum:'',tech:''});
    for(let m=0;m<4;m++){ s.measures[m].tabs[0]=[t(m,8),t(2,8),t(3,8),t(5,8),t(7,4),t(5,4)]; s.measures[m].tabs[1]=[t(m+1,1,6)]; }
    return s; }`;
  await load(GT2);
  const ys2 = await pg.evaluate(() => [0, 3].map(m => Math.round(document.querySelector('[data-row="tab"][data-vi="0"][data-mi="' + m + '"][data-ci="0"][data-si="3"]').getBoundingClientRect().y)));
  await drag(cell('tab', 0, 0, 0, 3), cell('tab', 3, 5, 0, 3));
  r = await pg.evaluate(() => ({ mq: (typeof mqSpan !== 'undefined' && mqSpan) ? JSON.stringify(mqSpan.r) : null }));
  await key('Control+c');
  r.clip = await pg.evaluate(() => clipCols ? clipCols.row + ':' + clipCols.whole + ':' + clipCols.meas.length : (clipMeasure ? 'measure' : 'none'));
  await click(cell('tab', 4, 0, 0, 3));
  await key('Control+v');
  r.res = await pg.evaluate(() => ({ t1: [0, 1, 2, 3].every(k => __sigT(k + 4, 0) === __sigT(k, 0)), t2: [4, 5, 6, 7].map(m => __sigT(m, 1)).join('|'), errs: beatErrors().length }));
  T(ys2[1] > ys2[0] && r.mq === '{"row":"tab","vi":0,"m1":0,"c1":0,"m2":3,"c2":5}' && r.clip === 'tab:true:4' && r.res.t1
    && r.res.t2 === '/4 /4 /4 /4|/4 /4 /4 /4|/4 /4 /4 /4|/4 /4 /4 /4' && r.res.errs === 0,
    'T18 双轨谱跨行框选轨1第1–4小节 → 复制4小节、粘到5–8（轨2不动）', JSON.stringify(Object.assign({ ys2 }, r)));

  // ---------- T19 源含变拍小节：整小节声部粘贴先问拍号；保留＝按时值铺开、应用＝改拍号后按小节替换 ----------
  const MTR = `()=>{ const s=createSong('vocal',{title:'m',beats:4,unit:4,key:'C',nVox:1,nMea:9,lyr:0});
    const V=(deg,dur)=>({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[1].beats=3; s.measures[1].voxes[0]=[V(5,4),V(6,4),V(7,4)];
    s.measures[2].voxes[0]=[V(1,2),V(7,4),V(6,4)];
    return s; }`;
  await load(MTR);
  await drag(cell('vox', 0, 0), cell('vox', 2, 2));
  await key('Control+c');
  await click(cell('vox', 5, 0));
  await key('Control+v');
  await pg.waitForTimeout(80);
  r = await pg.evaluate(() => ({ modal: !!document.getElementById('pm-keep'), txt: ((document.getElementById('modal-mask') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 60) }));
  if (r.modal) { await click('#pm-keep'); await pg.waitForTimeout(60); }
  r.keep = await pg.evaluate(() => ({ s: [5, 6, 7, 8].map(m => __sigV(m)), b: [5, 6, 7].map(m => __beats(m, 'vox')), meters: [5, 6, 7].map(m => meaMeter(m).beats).join(','), errs: beatErrors().length }));
  T(r.modal && /3\/4/.test(r.txt) && r.keep.s[0] === '1/4 2/4 3/4 4/4' && r.keep.s[1] === '5/4 6/4 7/4 1/4~' && r.keep.s[2] === '1/4 7/4 6/4 0/4'
    && r.keep.meters === '4,4,4' && r.keep.errs === 0, 'T19 源含 3/4 小节→先问拍号；「保留目标拍号」＝按时值铺开、跨线拆音连线、无节拍错误', JSON.stringify(r));
  await key('Control+z');
  await click(cell('vox', 5, 0));
  await key('Control+v');
  await pg.waitForTimeout(80);
  if (await pg.evaluate(() => !!document.getElementById('pm-apply'))) { await click('#pm-apply'); await pg.waitForTimeout(60); }
  r = await pg.evaluate(() => ({ same: [0, 1, 2].every(k => __sigV(k + 5) === __sigV(k)), meters: [5, 6, 7].map(m => meaMeter(m).beats + '/' + meaMeter(m).unit).join(','), errs: beatErrors().length }));
  T(r.same && r.meters === '4/4,3/4,4/4' && r.errs === 0, 'T19b 「应用源拍号」＝第7小节改 3/4、6–8＝1–3、无节拍错误', JSON.stringify(r));

  // ---------- T20 弱起谱：拖选「弱起 + 3 小节」＝片段（弱起不算整小节），光标放到目标弱拍粘贴即对齐 ----------
  await load(`()=>{ const s=createSong('vocal',{title:'pk',beats:4,unit:4,key:'C',nVox:1,nMea:10,lyr:0}); s.pickup=true;
    const V=(deg,dur)=>({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false});
    s.measures[0].voxes[0]=[V(5,4)]; s.measures[1].voxes[0]=[V(1,4),V(1,4),V(5,4),V(5,4)];
    s.measures[2].voxes[0]=[V(6,4),V(6,4),V(5,2)]; s.measures[3].voxes[0]=[V(4,4),V(4,4),V(3,4),V(3,4)]; return s; }`);
  await drag(cell('vox', 0, 0), cell('vox', 3, 3));
  await key('Control+c');
  r = await pg.evaluate(() => ({ whole: clipCols ? clipCols.whole : null, t: (document.getElementById('toast') || {}).textContent || '' }));
  await click(cell('vox', 5, 3));                       // 目标第 5 小节（索引 5）的第 4 拍＝弱拍
  await key('Control+v');
  r.res = await pg.evaluate(() => ({ m5: __sigV(5), eq: [1, 2, 3].every(k => __sigV(k + 5) === __sigV(k)), errs: beatErrors().length }));
  T(r.whole === false && /弱起/.test(r.t) && r.res.m5 === '0/4 0/4 0/4 5/4' && r.res.eq && r.res.errs === 0,
    'T20 弱起+3小节按片段复制；光标放目标弱拍粘贴＝弱起落第4拍、其后3小节逐小节对齐、无节拍错误', JSON.stringify(r));

  // ---------- T21 默认键位「点首音 + Shift+点末音」→ Ctrl+C 复制两点之间 ----------
  await load(STAR);
  await click(cell('vox', 0, 0));
  await click(cell('vox', 3, 2), 'Shift');
  await key('Control+c');
  r = await pg.evaluate(() => ({ clip: clipCols ? clipCols.whole + ':' + clipCols.meas.length : (clipMeasure ? 'measure' : 'none') }));
  await click(cell('vox', 4, 0));
  await key('Control+v');
  r.same = await pg.evaluate(() => [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k)));
  T(r.clip === 'true:4' && r.same, 'T21 点首音 + Shift+点末音 → 复制第1–4小节 → 粘到5–8', JSON.stringify(r));

  // ---------- T22 拆音时拍位和弦落到所在那段、延长记号放在末段 ----------
  const JP = `()=>{ const s=createSong('vocal',{title:'jp',beats:4,unit:4,key:'C',nVox:1,nMea:8,lyr:2});
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    s.measures[0].voxes[0]=[V(1,4,{lyrics:['一','A']}),V(2,4,{lyrics:['二','B']}),V(3,2,{chord:'C',chords:[{q:1,chord:'G'}],lyrics:['三','C']})];
    s.measures[1].voxes[0]=[V(5,1,{lyrics:['四','D'],ferm:true})];
    return s; }`;
  await load(JP);
  await drag(cell('vox', 0, 1), cell('vox', 0, 2));    // 2（四分）+ 3–（二分，列头 C、第 2 拍 G）
  await key('Control+c');
  await click(cell('vox', 5, 2));                       // 第 6 小节第 3 拍：3– 跨线拆成两拍
  await key('Control+v');
  r = await pg.evaluate(() => { const a = song.measures[5].voxes[0][3], z = song.measures[6].voxes[0][0];
    return { m6: __sigV(5), m7: __sigV(6), a: [a.chord || '', JSON.stringify(a.chords || null)], z: [z.chord || '', JSON.stringify(z.chords || null)] }; });
  T(r.m6 === '0/4 0/4 2/4 3/4~' && r.a[0] === 'C' && r.a[1] === 'null' && r.z[0] === 'G' && r.z[1] === 'null',
    'T22 拆开的二分音符：列头和弦 C 留前半、第2拍和弦 G 成为后半的列头和弦', JSON.stringify(r));
  await load(JP);
  await drag(cell('vox', 0, 2), cell('vox', 1, 0));    // 3–（2 拍）+ 5 全音符（延长记号）
  await key('Control+c');
  await click(cell('vox', 5, 0));
  await key('Control+v');
  r = await pg.evaluate(() => ({ m6: __sigV(5), m7: __sigV(6), f6: song.measures[5].voxes[0].map(c => c.ferm ? 1 : 0).join(''), f7: song.measures[6].voxes[0].map(c => c.ferm ? 1 : 0).join('') }));
  T(r.m6 === '3/2 5/2~' && r.m7 === '5/2 0/4 0/4' && r.f6 === '00' && r.f7 === '100', 'T22b 全音符跨线拆开：延长记号在末段（第7小节第1拍）、前半不带', JSON.stringify(r));

  // ---------- T23 整小节剪贴板、光标点在目标小节中间：从该小节开头替换并明确提示 ----------
  await load(STAR);
  await drag(cell('vox', 0, 0), cell('vox', 3, 2));
  await key('Control+c');
  await click(cell('vox', 4, 2));
  await key('Control+v');
  r = await pg.evaluate(() => ({ same: [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k)), t: (document.getElementById('toast') || {}).textContent || '' }));
  T(r.same && /开头替换/.test(r.t), 'T23 光标在第5小节第3列粘整小节剪贴板：从第5小节开头替换，提示写明', JSON.stringify(r));

  // ---------- T24 TAB 框选后再 Ctrl+点追加音：Ctrl+C 不再按旧框复制 ----------
  await load(`()=>{ const s=createSong('guitar',{title:'g',beats:4,unit:4,key:'C',nMea:6,nTab:1,nVox:0,lyr:0});
    const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
    s.measures[0].tabs[0]=[t(1,4),t(2,4),t(3,4),t(5,4)]; s.measures[1].tabs[0]=[t(5,4),t(7,4),t(8,4),t(10,4)]; return s; }`);
  await drag(cell('tab', 0, 0, 0, 3), cell('tab', 0, 3, 0, 3));
  const ns0 = await pg.evaluate(() => noteSel.length);
  await click(cell('tab', 1, 1, 0, 3), 'Control');
  await key('Control+c');
  r = await pg.evaluate((ns0) => ({ ns0, ns: noteSel.length, clipRow: clipRow ? clipRow.cols.length : 0, cc: clipCols ? clipCols.whole + ':' + (clipCols.meas[0] || []).length : null }), ns0);
  T(r.ns0 >= 3 && r.ns === r.ns0 + 1 && r.clipRow === 0 && r.cc === 'false:6', 'T24 框选第1小节后 Ctrl+点第2小节的音 → 复制范围含追加的音（第1小节第1列–第2小节第2列＝6 列）', JSON.stringify(r));

  // ---------- T25 𝄎² 展开实例的跨小节 tk 按演奏顺序换算 ----------
  const SIM2 = `()=>{ const s=createSong('guitar',{title:'g',beats:4,unit:4,key:'C',nMea:10,nTab:1,nVox:0,lyr:0});
    const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
    s.measures[0].tabs[0]=[t(1,4),t(2,4),t(3,4),t(5,4)]; s.measures[0].tabs[0][3].notes[0].tk={mi:1,ci:0,si:3};
    s.measures[1].tabs[0]=[t(5,4),t(7,4),t(8,4),t(10,4)];
    s.measures[2].simile=2; s.measures[3].simile=2; return s; }`;
  await load(SIM2);
  await drag('[data-measuresel="1"]', '[data-measuresel="3"]');   // [B][𝄎²→A][𝄎²→B]
  await key('Control+c');
  await click('[data-measuresel="6"]');
  await key('Control+v');
  r = await pg.evaluate(() => ({ tk: JSON.stringify((((song.measures[7].tabs[0][3] || {}).notes || [])[0] || {}).tk || null) }));
  T(r.tk === 'null' || JSON.parse(r.tk).mi > 7, 'T25 拖小节号复制 [B][𝄎²][𝄎²]：A 实写末音的 tk 不再指回前面的小节', JSON.stringify(r));
  await load(SIM2);
  await pg.evaluate(() => { sel.row = 'tab'; sel.vi = 0; sel.mi = 2; sel.ci = 0; blurSel = false; setRange('tab', 0, { mi: 2, ci: 0 }, { mi: 3, ci: 0 }); render(); });   // 两个 𝄎² 小节（演奏 A、B）
  await key('Control+c');
  await click(cell('tab', 6, 0, 0, 3));
  await key('Control+v');
  r = await pg.evaluate(() => ({ m7: __sigT(6), m8: __sigT(7), tk: JSON.stringify((((song.measures[6].tabs[0][3] || {}).notes || [])[0] || {}).tk || null), tie: !!tabTieMap(song, 0) }));
  T(r.m7 === '3:1/4 3:2/4 3:3/4 3:5/4' && r.m8 === '3:5/4 3:7/4 3:8/4 3:10/4' && r.tk === '{"mi":7,"ci":0,"si":3}',
    'T25b 复制两个 𝄎²（奏 A、B）：粘出实写 A B，A 末音的 tk 落到其后的 B（第8小节）', JSON.stringify(r));

  /* ======== 第二轮验收补 ======== */
  const toastT = () => pg.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  // ---------- T26 方向键无处可去：不放下选区、画面不过期 ----------
  await load(STAR);
  await drag(cell('vox', 0, 2), cell('vox', 1, 1));
  await key('ArrowDown');                                  // 单声部简谱：↓ 无处可去
  r = await pg.evaluate(() => { const a = document.getElementById('score').innerHTML; render(); return { sr: !!selRange, stale: a !== document.getElementById('score').innerHTML }; });
  await key('.');
  r.m1 = await pg.evaluate(() => __sigV(0)); r.m2 = await pg.evaluate(() => __sigV(1));
  T(r.sr && !r.stale && r.m1 === '1/4 5/4 1/8. 1/16. 5/8. 1/16.' && r.m2.startsWith('5,/4. 5/4.'),
    'T26 单声部拖选后按 ↓（无处可去）：选区保留且画面一致；随后 . 给选区内全部音加附点（不只光标音）', JSON.stringify(r));
  await load(STAR);
  await drag(cell('vox', 0, 0), cell('vox', 3, 2));
  await key('ArrowUp'); await key('Control+c');
  r = await pg.evaluate(() => ({ cc: clipCols ? clipCols.whole + ':' + clipCols.meas.length : (clipMeasure ? 'measure' : 'none') }));
  await click(cell('vox', 4, 0)); await key('Control+v');
  r.same = await pg.evaluate(() => [0, 1, 2, 3].every(k => __sigV(k + 4) === __sigV(k)));
  await load(STAR);
  await drag(cell('vox', 0, 2), cell('vox', 1, 1));
  await key('ArrowRight');                                 // 光标真动了：放下选区并重绘
  r.mv = await pg.evaluate(() => { const a = document.getElementById('score').innerHTML; render(); return { sr: !!selRange, stale: a !== document.getElementById('score').innerHTML, ci: sel.ci }; });
  T(r.cc === 'true:4' && r.same && !r.mv.sr && !r.mv.stale, 'T26b 拖选1–4小节 → ↑（无处可去）→ Ctrl+C 仍复制四小节；→ 真移动光标＝放下选区且画面同步', JSON.stringify(r));

  // ---------- T27 撤销后残留的多选 / 框选坐标 ----------
  const grow = async (src, row) => {
    await load(src);
    await click(`[data-bar="-1:0:${row}:0"]`, 'Control'); await click(`[data-bar="2:3:${row}:0"]`, 'Control'); await key('Control+c');
    const bars = await pg.evaluate((row) => [...document.querySelectorAll('[data-bar^="7:"]')].map(e => e.dataset.bar).filter(b2 => b2.endsWith(':' + row + ':0')), row);
    await click(`[data-bar="${bars[0]}"]`); await key('Control+v');
    return pg.evaluate(() => song.measures.length);
  };
  { const out = {};
    out.n1 = await grow(STAR, 'vox');
    await click(cell('vox', 9, 0)); await click(cell('vox', 9, 1), 'Control'); await click(cell('vox', 10, 2), 'Control');
    await key('Control+z'); let e0 = errs.length; await key('Control+c');
    out.N2 = { newErrs: errs.slice(e0).length, t: await toastT(), n: await pg.evaluate(() => song.measures.length), cm: await pg.evaluate(() => !!clipMeasure) };
    const GT = `()=>{ const s=createSong('guitar',{title:'g',beats:4,unit:4,key:'C',nMea:8,nTab:1,nVox:0,lyr:0});
      const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
      for(let m=0;m<4;m++) s.measures[m].tabs[0]=[t(m,4),t(2,4),t(3,4),t(5,4)]; return s; }`;
    out.n3 = await grow(GT, 'tab');
    { const a = await center(cell('tab', 9, 0, 0, 3)), z = await center(cell('tab', 10, 3, 0, 3));
      await pg.mouse.move(a.x - 5, a.y - 8); await pg.mouse.down(); await pg.mouse.move(z.x + 6, z.y + 8, { steps: 10 }); await pg.mouse.up(); await pg.waitForTimeout(80); }
    await key('Control+z'); e0 = errs.length; await key('Control+c');
    const t3 = await toastT();
    await pg.waitForTimeout(350); await click(cell('tab', 5, 0, 0, 3)); await key('Control+v');
    out.N3 = { newErrs: errs.slice(e0).length, t: t3, n: await pg.evaluate(() => song.measures.length) };
    T(out.n1 === 12 && out.N2.newErrs === 0 && /^已复制/.test(out.N2.t) && out.N2.cm && out.n3 === 12 && out.N3.newErrs === 0 && /^已复制/.test(out.N3.t) && out.N3.n === 8,
      'T27 插入 4 小节后多选 / 框选第10–11小节 → Ctrl+Z → Ctrl+C：不报错、剪贴板更新（再 Ctrl+V 不粘出撤销前的 4 小节）', JSON.stringify(out)); }
  if (errs.length) errs.splice(0, errs.length, ...errs.filter(x => !/voxes|tabs|not valid JSON/.test(x)));   // 修前此处会抛（由 T27 记红），不再让它拖垮整套的 NO ERRORS 判定

  // ---------- T28 不等时值连音按实际时值断块 ----------
  await load(`()=>{ const s=createSong('vocal',{title:'swing',beats:4,unit:4,key:'C',nVox:1,nMea:8,lyr:0});
    const V=(deg,dur,tup)=>{ const c={dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false}; if(tup) c.tup=tup; return c; };
    s.measures[0].voxes[0]=[V(7,8),V(7,8),V(6,4),V(5,2)];
    s.measures[1].voxes[0]=[V(1,4,3),V(2,8,3),V(3,4,3),V(4,8,3),V(5,2)];
    s.measures[4].voxes[0]=[V(1,4,3),V(2,8,3),V(3,4,3),V(4,8,3),V(5,4,3),V(6,8,3),V(1,4,3),V(2,8,3)];
    return s; }`);
  await drag(cell('vox', 0, 0), cell('vox', 0, 1)); await key('Control+c');      // 两个八分＝1 拍
  await click(cell('vox', 4, 0));
  let u0 = await pg.evaluate(() => undoStack.length);
  await key('Control+v');
  r = await pg.evaluate((u0) => ({ m5: __sigV(4), undo: undoStack.length - u0, errs: beatErrors().length }), u0);
  await drag(cell('vox', 1, 0), cell('vox', 1, 3)); await key('Control+c');      // [q3 e3]×2＝2 拍
  await click(cell('vox', 6, 3)); await key('Control+v');                         // 第 7 小节第 4 拍：第一对放得下，第二对顺延
  r.b = await pg.evaluate(() => ({ m7: __sigV(6), m8: __sigV(7), errs: beatErrors().length }));
  T(r.m5 === '7/8 7/8 3/4t3 4/8t3 5/4t3 6/8t3 1/4t3 2/8t3' && r.undo === 1 && r.errs === 0
    && r.b.m7 === '0/4 0/4 0/4 1/4t3 2/8t3' && r.b.m8 === '3/4t3 4/8t3 0/4 0/4 0/4' && r.b.errs === 0,
    'T28 摇摆 [四分三连 八分三连]：两个八分盖掉第一组（其余三组保留）；两组从第4拍起逐组铺开、跨线顺延', JSON.stringify(r));

  // ---------- T29 光标已隐藏时真实键盘 Shift+点 ----------
  await load(STAR);
  await click(cell('vox', 0, 1));
  { const p = await pg.evaluate(() => { const R = document.getElementById('score').getBoundingClientRect();
      for (let y = R.bottom - 4; y > R.top; y -= 7) for (let x = R.left + 4; x < R.right; x += 23) { const el = document.elementFromPoint(x, y);
        if (el && el.closest('#score') && !el.dataset.mi && !el.closest('[data-hd],[data-sysact],[data-meahandle],[data-bar],[data-measuresel],[data-beatsel],[data-lyrsel]')) return { x, y }; } return null; });
    await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(60); }
  r = { blur: await pg.evaluate(() => blurSel) };
  await click(cell('vox', 1, 3), 'Shift'); await key('Control+c');
  r.t = await toastT(); r.cc = await pg.evaluate(() => clipCols ? 'cols' : (clipMeasure ? 'measure' : 'none'));
  T(r.blur && r.cc === 'measure' && /^已复制第2小节/.test(r.t), 'T29 点空白隐藏光标 → 按住 Shift 点第2小节第4列 → Ctrl+C＝复制第2小节（不从隐藏的旧光标处拉区间）', JSON.stringify(r));

  // ---------- T30 弱起：Ctrl+点小节线 / 拖小节号 / 粘到弱起 ----------
  const PK = `()=>{ const s=createSong('guitar',{title:'pk',beats:4,unit:4,key:'C',nMea:10,nTab:1,nVox:1,lyr:0}); s.pickup=true;
    const V=(deg,dur)=>({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false});
    const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
    s.measures[0].voxes[0]=[V(5,4)]; s.measures[0].tabs[0]=[t(5,4)];
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)]; s.measures[1].tabs[0]=[t(1,4),t(2,4),t(3,4),t(4,4)];
    s.measures[2].voxes[0]=[V(5,2),V(3,2)]; s.measures[2].tabs[0]=[t(5,2),t(3,2)];
    return s; }`;
  await load(PK);
  await click('[data-bar="-1:0:vox:0"]', 'Control'); await click('[data-bar="1:2:vox:0"]', 'Control');
  await key('Control+c');
  r = { a: await pg.evaluate(() => ({ whole: clipCols ? clipCols.whole : null, t: (document.getElementById('toast') || {}).textContent || '' })) };
  await load(PK);
  await drag('[data-measuresel="0"]', '[data-measuresel="1"]'); await key('Control+c');
  r.bt = await toastT();
  await click(cell('tab', 5, 0, 0, 3)); await key('Control+v');
  r.b = await pg.evaluate(() => ({ v5: __sigV(5), t5: __sigT(5), eq: __sigV(6) === __sigV(1) && __sigT(6) === __sigT(1), errs: beatErrors().length }));
  await load(PK);
  await drag(cell('vox', 1, 0), cell('vox', 2, 1)); await key('Control+c');      // 第1–2小节整小节声部剪贴板
  await click(cell('vox', 0, 0)); u0 = await pg.evaluate(() => undoStack.length); await key('Control+v');
  r.c = await pg.evaluate((u0) => ({ v0: __sigV(0), t0: __sigT(0), undo: undoStack.length - u0, t: (document.getElementById('toast') || {}).textContent || '' }), u0);
  T(r.a.whole === false && /弱起/.test(r.a.t), 'T30 Ctrl+点小节线选「弱起＋第1小节」＝片段剪贴板（弱起不按整小节），提示含弱起', JSON.stringify(r.a));
  T(r.b.v5 === '0/2. 5/4' && r.b.t5 === '/2. 3:5/4' && r.b.eq && r.b.errs === 0 && /补休止/.test(r.bt),
    'T30b 拖小节号选「弱起＋第1小节」→ 粘到第6小节：弱起在前面补休止成整小节（弱起音落在小节末）、其后对齐、无节拍错误', JSON.stringify({ bt: r.bt, b: r.b }));
  T(r.c.v0 === '5/4' && r.c.t0 === '3:5/4' && r.c.undo === 0 && /弱起/.test(r.c.t), 'T30c 整小节声部剪贴板粘到弱起小节＝拒绝并提示（此前简谱变满拍、吉他谱仍 1 拍）', JSON.stringify(r.c));

  // ---------- T31 拆音音头在 3.5 拍：拍位和弦不晚于其时值位置、不超出增时线 ----------
  await load(`()=>{ const s=createSong('vocal',{title:'f',beats:4,unit:4,key:'C',nVox:1,nMea:8,lyr:0});
    const V=(deg,dur,dotted,o)=>Object.assign({dur,dotted:!!dotted,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    s.measures[0].voxes[0]=[V(5,2,1,{chord:'C',chords:[{q:1,chord:'F'},{q:2,chord:'G'}]}),V(1,8),V(2,8)];
    s.measures[4].voxes[0]=[V(1,4),V(1,4),V(1,4),V(1,8),V(1,8)];
    return s; }`);
  await pg.evaluate(() => { try { localStorage.setItem('musetab-keymap', 'gp'); } catch (_) {} });
  await click(cell('vox', 0, 0)); await click(cell('vox', 0, 1), 'Shift');
  await key('Control+c');
  await click(cell('vox', 4, 4)); await key('Control+v');
  await pg.evaluate(() => { try { localStorage.removeItem('musetab-keymap'); } catch (_) {} });
  r = await pg.evaluate(() => { const at = [], over = []; for (let mi = 4; mi <= 5; mi++) { let b2 = 0; const u = meaMeter(mi).unit;
      song.measures[mi].voxes[0].forEach(c => { const len = beatsOf(c, 4); if (c.chord) at.push(mi + '@' + b2 + ':' + c.chord);
        (c.chords || []).forEach(x => { at.push(mi + '@' + (b2 + x.q) + ':' + x.chord); if (!(x.q >= 1 && x.q <= Math.floor(len + 1e-6) - 1)) over.push(mi + ':' + x.q); }); b2 += beatsOf(c, u); }); }
    return { at: at.join(' '), over }; });
  T(r.at === '4@3.5:C 5@0:F 5@1:G' && !r.over.length, 'T31 附点二分（列头 C、拍位 F/G）从 3.5 拍粘入拆成 5/8 | 5/2：F、G 落在不晚于原时值的拍位（5@0、5@1），且都在增时线上', JSON.stringify(r));

  // ---------- T32 TAB 按住拖选、按下/松手偏离格心 3px ----------
  await load(`()=>{ const s=createSong('guitar',{title:'g',beats:4,unit:4,key:'C',nMea:10,nTab:1,nVox:0,lyr:0});
    const t=(s2,f)=>({dur:8,dotted:false,chord:'',notes:[{s:s2,f}],strum:'',tech:''});
    for(let m=0;m<4;m++) s.measures[m].tabs[0]=[t(5,0),t(4,2),t(3,m),t(2,1),t(3,2),t(4,3),t(3,0),t(4,m+1)]; return s; }`);
  { const a = await center(cell('tab', 0, 0, 0, 5)), z = await center(cell('tab', 3, 7, 0, 4));
    await pg.mouse.move(a.x + 3, a.y + 3); await pg.mouse.down();
    await pg.mouse.move((a.x + z.x) / 2, (a.y + z.y) / 2, { steps: 8 }); await pg.mouse.move(z.x - 3, z.y - 3, { steps: 8 });
    await pg.mouse.up(); await pg.waitForTimeout(80); }
  await key('Control+c');
  r = { t: await toastT() };
  await pg.waitForTimeout(350);
  await click(cell('tab', 5, 0, 0, 5)); await key('Control+v');
  r.eq = await pg.evaluate(() => [0, 1, 2, 3].map(k => __sigT(k + 5) === __sigT(k) ? 1 : 0).join(''));
  r.errs = await pg.evaluate(() => beatErrors().length);
  T(r.eq === '1111' && r.errs === 0 && /第1–4小节/.test(r.t), 'T32 TAB 从首音（偏右下 3px）拖到末音（偏左上 3px）→ Ctrl+C＝第1–4小节整段（首末列不丢）→ 粘到第6小节逐小节相同', JSON.stringify(r));

  // ---------- T33 单小节声部剪贴板先认光标行 ----------
  const GV = `()=>{ const s=createSong('guitar',{title:'gv',beats:4,unit:4,key:'C',nMea:8,nTab:1,nVox:1,lyr:0});
    const V=(deg,dur)=>({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false});
    const t=(f,dur)=>({dur,dotted:false,chord:'',notes:[{s:3,f}],strum:'',tech:''});
    s.measures[0].voxes[0]=[V(1,4),V(5,4),V(1,8),V(1,8),V(5,4)]; s.measures[0].tabs[0]=[t(1,4),t(2,4),t(3,4),t(4,4)]; return s; }`;
  await load(GV);
  await drag(cell('vox', 0, 0), cell('vox', 0, 4)); await key('Control+c');      // 简谱第1小节整小节＝clipRow
  r = { cr: await pg.evaluate(() => clipRow ? clipRow.row : null) };
  const tab4 = await pg.evaluate(() => __sigT(4));
  await click(cell('tab', 4, 0, 0, 3)); u0 = await pg.evaluate(() => undoStack.length); await key('Control+v');
  r.a = await pg.evaluate(([u0, tab4]) => ({ same: __sigT(4) === tab4, undo: undoStack.length - u0, t: (document.getElementById('toast') || {}).textContent || '' }), [u0, tab4]);
  /* 换成没有简谱声部的纯吉他谱（剪贴板保留），点吉他格 Ctrl+V */
  await pg.evaluate(() => { const s = createSong('guitar', { title: 'g2', beats: 4, unit: 4, key: 'C', nMea: 8, nTab: 1, nVox: 0, lyr: 0 }); loadSong(s); blurSel = true; render(); });
  await click(cell('tab', 4, 0, 0, 3)); u0 = await pg.evaluate(() => undoStack.length); await key('Control+v');
  r.b = await pg.evaluate((u0) => ({ voxV: (song.voxVoices || []).length, orphan: song.measures.filter(m => (m.voxes || []).length).length, undo: undoStack.length - u0, t: (document.getElementById('toast') || {}).textContent || '' }), u0);
  T(r.cr === 'vox' && r.a.same && r.a.undo === 0 && /先把光标放到对应声部/.test(r.a.t) && r.b.voxV === 0 && r.b.orphan === 0 && r.b.undo === 0 && /没有简谱声部/.test(r.b.t),
    'T33 简谱整小节剪贴板：点吉他格粘贴＝拒绝（不覆盖吉他轨）；目标谱没有简谱声部＝拒绝、不写孤儿 voxes', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
