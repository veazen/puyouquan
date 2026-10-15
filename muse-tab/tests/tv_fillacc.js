/* v67.5 / v67.6 新建流程方案的引擎先行项（docs/design-2026-10e，拍板 6）：
   F1 一键配伴奏「填进当前谱」：钢琴伴奏歌谱（JG：简谱旋律 / 右手伴奏五线 / 左手伴奏低音，钢琴两行花括号，儿歌弹唱默认 1=F 2/4 ♩=104）——
      真实点击右栏「一键配伴奏…」：上一条提示条收起；产出默认「填进当前谱（简谱旋律＋大谱表伴奏，可撤销）」，织体默认「儿歌伴奏 2/4」；
      点「生成」后不开新窗口，伴奏写进右手 / 左手两行，旋律音与歌词逐字段不动、只在空小节补和弦名；Ctrl+Z 一步回到生成前（逐字节）、Ctrl+Y 重做
   F2 不勾「空小节自动配和弦」＋已有部分和弦：旋律声部逐字节不动；和弦沿用到后续小节（引擎既有口径）；首个和弦之前的小节伴奏行保留原样并在提示里报「无和弦跳过」
   F3 变拍子小节（2/4 谱中一小节 3/4）与织体不符：该小节伴奏行保留原样；一小节都配不了（无旋律）时不入撤销栈、谱面不动、给出原因
   F4 单旋律谱（简谱 / 五线谱 / 教学对照）：选项在但默认仍是新窗口产出（点生成＝新窗口，原谱不动）；改选「填进当前谱」→ 原地补成 3 行钢琴伴奏歌谱结构（只写既有字段），一步撤销回单旋律
   F5 判定 isPianoAccStack：JG / SG / SJG / v45 起一键配伴奏产物（无显式分组）＝是；三部合唱（方括号 / 推断）、钢琴独奏、钢琴弹唱、功能谱、吉他谱＝否；
      吉他谱 / 合唱弹窗里没有「填进当前谱」；钢琴伴奏歌谱 4/4 默认织体＝上次用的（song.texId）
   F6 生成六线谱复用空轨：吉他弹唱「先写旋律」（唯一一条吉他轨是空的）→ 真实点击「六」灯 → 低把位：仍是 1 条轨、改名「吉他·旋律1」、逐音音高等价、光标落 TAB；Ctrl+Z 回到空轨原名；
      已有品位 / 和弦 / 扫弦的单轨、两条空轨 → 照旧另加一条；简谱联排逐轨开关（tabJpVoices）与老谱整曲 tabJp 复用后不变；尤克里里同理
   F7 2/4「儿歌伴奏」织体（v67.6）：库里有、入门级、两手各 2 拍；12 调 × 22 种和弦（含七和弦、半减七、挂留、转位 / 斜线和弦）逐小节：
      右手 [休止, 三音＋五音]、左手 [低音（斜线和弦＝斜线低音，否则根音）, 五音]，全部四分、每小节 2 拍、beatErrors 0；左手第一拍是全小节最低音
   F8 斜线和弦低音（全部织体）：4/4 儿歌伴奏 C/E → 左手 E-G-G-G 的第一拍是 E（在 C 下方），非斜线和弦与 v67.3 生成逐字节相同（设 MUSETAB_REF 时对拍全部 22 套织体）
   验收收尾补（每条修前红、修后绿）：
   F6c 复用空轨边界：TAB 上有标注（anno）/ 延长号（ferm）不算空轨；改过的轨名保留；静音轨照实提示；「六」灯与弹窗文案写「写进当前的空吉他轨」
   F9  伴奏两行已有内容不静默覆盖：导入的人声＋钢琴 MusicXML 默认改回新窗口产出、选项与弹窗写明覆盖；生成后手改再配：默认填进但提示覆盖
   F10 斜线低音落在 F2–E3（1=F 下行低音线级进、卡农 C B A G F E F G、C/E→F 不再跨 20 半音）
   F11 中途转调 keyTo 后伴奏按本小节生效调（此前整体高一个全音）
   F12 变化音按和弦字母拼写（1=G 的 F 和弦左手 ♭7 而非 ♯6＝E♯；9 调 × 3 织体 × 20 和弦 6480 音字母全对）
   F13 弱起小节伴奏两行＝等长休止（2/4 一拍、4/4 八分；填进当前谱与新窗口产出同口径）
   F14 2/4 儿歌伴奏：第 2 拍换和弦弹新根音、七和弦 3·7、曲末小节根音＋1·3·5 收束
   F15 尾部未写旋律的小节不配并提示；单旋律谱填进后 funcNames 不变；伴奏行混音音色（默认人声→钢琴，调过的保留；新窗口产出同）
   突变实证：对 v67.3 原版（MUSETAB_URL=…/v673.html）跑 1/21——F1～F15 全部报红，只有「无页面报错」绿；对实现者交付版（收尾修复前）跑 8/21，
   F1b F2 F6b F6c F7～F15 报红（即上面各条验收补的断言）。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const REF = process.env.MUSETAB_REF || '';

const HELP = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false; try{ hideStartPad(); }catch(_){}
  window.__V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  /* 钢琴伴奏歌谱（README 可行性映射 JG：createSong('vocal') 后改 3 行 + 花括号；SG：五线谱旋律；SJG：再加 voxDual） */
  window.__jg=(o, kind)=>{ o=Object.assign({title:'小星星', key:'F', beats:2, unit:4, tempo:104, nMea:4, nVox:1, lyr:2}, o||{});
    const s=createSong(kind==='J'||!kind? 'vocal' : 'instr', Object.assign({clef:'staff'}, o));
    s.voxVoices=['旋律','右手伴奏','左手伴奏']; s.voxNotations=[kind==='S'||kind==='SJ'? 'staff' : undefined, 'staff', 'bass'];
    if(kind==='SJ') s.voxDual=[true,false,false];
    s.voxGroups=[{type:'brace', from:1, to:2}]; s.funcNames=true;
    s.measures.forEach(m=>{ m.voxes=[m.voxes[0], blankVoxCols(s.beats, s.unit), blankVoxCols(s.beats, s.unit)]; });
    return s; };
  /* 《小星星》2/4：1 1 | 5 5 | 6 6 | 5 - ，两段词 */
  window.__twinkle24=s=>{ const M=[[1,1],[5,5],[6,6],[[5,2]]], L1=[['一','闪'],['一','闪'],['亮','晶'],['晶']], L2=[['挂','在'],['天','上'],['放','光'],['明']];
    s.measures.forEach((m,mi)=>{ const r=M[mi%4]; m.voxes[0]=r.map((x,i)=>{ const a=Array.isArray(x)?x:[x,4]; return __V(a[0],a[1],{lyrics:[L1[mi%4][i], L2[mi%4][i]]}); }); }); return s; };
  window.__mel=()=>JSON.stringify(song.measures.map(m=>(m.voxes[0]||[]).map(c=>[c.deg,c.dur,c.dotted,c.oct,c.acc,c.tie,c.lyrics,(c.adds||null)])));
  window.__ofs=()=>{ const e=document.getElementById('toast'); return e? e.style.opacity : ''; };
  return 1; })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(HELP);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));
  const openArr = async () => { await pg.click('#rt-arr'); await pg.waitForTimeout(120); };
  const modalInfo = () => EV(`(()=>{ const o=document.getElementById('arr-out'); if(!o) return {modal:false};
    return {modal:true, out:o.value, opts:[...o.options].map(x=>x.value), fillTxt:(o.querySelector('option[value="fill"]')||{}).textContent||'',
      tex:(document.querySelector('input[name="arr-tex"]:checked')||{}).value, ofs:__ofs()}; })()`);

  /* ===== F1 钢琴伴奏歌谱 2/4：默认填进当前谱 + 儿歌伴奏 2/4 + 收起提示条 + 一步撤销 ===== */
  {
    await EV(`(()=>{ const s=__twinkle24(__jg()); addDoc(s); toast('上一条提示：已新建钢琴伴奏歌谱'); window.__pre=JSON.stringify(song); window.__mel0=__mel(); window.__nd=docs.length; window.__u0=undoStack.length; })()`);
    const before = await EV(`({ofs:__ofs(), vis:getComputedStyle(document.getElementById('rt-arr')).display!=='none'})`);
    await openArr();
    const m = await modalInfo();
    T(before.ofs === '1' && m.modal && m.out === 'fill' && m.opts[0] === 'fill' && m.fillTxt === '填进当前谱（简谱旋律＋大谱表伴奏，可撤销）' && m.tex === 'kids2' && m.ofs === '0',
      'F1a 真实点击「一键配伴奏…」：提示条收起（opacity ' + before.ofs + '→' + m.ofs + '）、产出默认「' + m.fillTxt + '」、织体默认 ' + m.tex, J(m));
    await pg.click('#arr-go'); await pg.waitForTimeout(200);
    const r = await EV(`(()=>{ const out={docs:[__nd, docs.length], undo:[__u0, undoStack.length], mel:__mel()===__mel0, modal:!!document.getElementById('arr-out'),
      chords:song.measures.map(m=>m.voxes[0].map(c=>c.chord||'').join(',')), tex:song.texId, pacc:isPianoAccStack(song), toast:document.getElementById('toast').textContent,
      struct:JSON.stringify([song.voxVoices, song.voxNotations, song.voxGroups, song.voxDual||null])};
      out.rh=song.measures.map(m=>m.voxes[1].map(c=>c.dur+':'+(c.deg?1:0)+':'+((c.adds||[]).length)).join(' '));
      out.lh=song.measures.map(m=>m.voxes[2].map(c=>c.dur+':'+(c.deg?1:0)+':'+((c.adds||[]).length)).join(' '));
      out.mix=JSON.stringify([song.mixer&&song.mixer['vox:1'], song.mixer&&song.mixer['vox:2']].map(x=>x&&x.inst));
      out.otherSame=(()=>{ const a=JSON.parse(__pre); ['title','key','beats','unit','tempo','lyricLines','funcNames'].forEach(k=>{ if(a[k]!==song[k]) out.fieldDiff=(out.fieldDiff||'')+k; }); return !out.fieldDiff; })();
      window.__post=JSON.stringify(song); return out; })()`);
    T(r.docs && r.docs[0] === r.docs[1] && r.undo[1] === r.undo[0] + 1 && r.mel && !r.modal && r.chords.every(c => /^[A-G]/.test(c)) && r.tex === 'kids2' && r.pacc
      && r.rh.slice(0, 3).every(x => x === '4:0:0 4:1:1') && r.lh.slice(0, 3).every(x => x === '4:1:0 4:1:0') && r.rh[3] === '2:1:2' && r.lh[3] === '2:1:0'
      && /已填进当前谱：4 小节伴奏/.test(r.toast) && /钢琴音色/.test(r.toast) && r.mix === '["piano","piano"]' && r.otherSame
      && r.struct === J([['旋律', '右手伴奏', '左手伴奏'], [null, 'staff', 'bass'], [{ type: 'brace', from: 1, to: 2 }], null]),
      'F1b 生成：不开新窗口、一步入栈；旋律音与两段歌词逐字段不动、4 小节都补上和弦名；右手 [休止, 3·5]、左手 [低音, 五音] 全为四分，曲末小节收束（左手根音 + 右手 1·3·5 二分）；伴奏两行混音音色由默认人声改钢琴；谱行结构与其他字段不动', J(r));
    await pg.mouse.click(640, 860).catch(() => {}); await pg.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(120);
    const u = await EV(`({back:JSON.stringify(song)===__pre, n:undoStack.length, docs:docs.length})`);
    await pg.keyboard.press('Control+y'); await pg.waitForTimeout(120);
    const rd = await EV(`({fwd:JSON.stringify(song)===__post})`);
    T(u.back && u.n === 0 && rd.fwd, 'F1c Ctrl+Z 一步回到生成前（整谱逐字节）、Ctrl+Y 重做回到生成后', J({ u, rd }));
  }

  /* ===== F2 不勾自动配和弦 + 部分已有和弦：旋律声部逐字节不动、无和弦小节保留 ===== */
  {
    await EV(`(()=>{ const s=__jg({key:'C', beats:4, unit:4, tempo:72, nMea:4, lyr:1});
      s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1,4,{lyrics:['春']}),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; });
      s.measures[1].voxes[0][0].chord='C'; s.measures[2].voxes[0][0].chord='Am'; s.measures[2].voxes[0][2].chord='F';
      s.measures[0].voxes[1]=[__V(5,1,{oct:1})];   /* 第 1 小节（首个和弦之前，无和弦）右手原有内容 → 应原样保留 */
      addDoc(s); window.__v0=JSON.stringify(song.measures.map(m=>m.voxes[0])); window.__r0=JSON.stringify(song.measures[0].voxes.slice(1)); })()`);
    await openArr();
    const m = await modalInfo();
    const warnVis = () => EV(`(()=>{ const w=document.getElementById('arr-warn'); return w? getComputedStyle(w).display : 'none'; })()`);
    m.warn0 = await warnVis();
    if (await pg.$('#arr-out option[value="fill"]')) await pg.selectOption('#arr-out', 'fill');
    m.warn1 = await warnVis();
    await pg.click('#arr-sug'); await pg.click('input[name="arr-tex"][value="block"]');
    await pg.click('#arr-go'); await pg.waitForTimeout(150);
    const r = await EV(`({v0:JSON.stringify(song.measures.map(m=>m.voxes[0]))===__v0, r0:JSON.stringify(song.measures[0].voxes.slice(1))===__r0,
      blk:[1,2,3].map(mi=>song.measures[mi].voxes[1].map(c=>c.dur+'/'+(c.adds||[]).length).join(' ')), m2L:song.measures[2].voxes[2].map(c=>c.dur+':'+c.deg).join(' '), tex:song.texId, toast:document.getElementById('toast').textContent})`);
    T(m.out === 'teach' && /覆盖已有的 1 小节伴奏/.test(m.fillTxt) && m.warn0 === 'none' && m.warn1 === 'block' && m.tex === 'slow'
      && r.v0 && r.r0 && r.blk.every(x => x === '4/2 4/2 4/2 4/2') && r.m2L === '2:6 2:1' && r.tex === 'block' && /3 小节伴奏，1 小节无和弦跳过/.test(r.toast) && !/覆盖了/.test(r.toast),
      'F2 右手已有内容（非本工具生成）：默认改回新窗口产出、选项写明「覆盖已有的 1 小节伴奏」，改选填进当前谱时弹出覆盖提示；不勾自动配和弦：旋律声部逐字节不动（含原有 C / Am·F）；第 2–4 小节生成柱式（第 3 小节左手 Am 根音 6 → 半小节换 F 弹五音 1；第 4 小节沿用 F）、首个和弦之前的第 1 小节伴奏行原样保留并提示；4/4 默认织体＝库首套（slow）', J({ m, r }));
  }

  /* ===== F3 变拍子小节保留 + 一小节都配不了时不动谱 ===== */
  {
    const r = await EV(`(()=>{ const s=__twinkle24(__jg());
      const m2=s.measures[2]; m2.beats=3; m2.unit=4; m2.voxes=[[__V(6,4),__V(6,4),__V(5,4)], blankVoxCols(3,4), blankVoxCols(3,4)]; m2.voxes[2][0].deg=6; m2.voxes[2][0].oct=-1;
      addDoc(s); const keep=JSON.stringify(song.measures[2].voxes.slice(1));
      const f=fillAccompaniment('kids2', true);
      const r1={applied:f&&f.applied, done:f&&f.gen.done, skip:f&&f.gen.skipMeter, keep:JSON.stringify(song.measures[2].voxes.slice(1))===keep, beatErr:beatErrors().length};
      const e=__jg(); addDoc(e); const pre=JSON.stringify(song), u0=undoStack.length; let msg=''; const ot=toast; toast=m=>{ msg=String(m); };
      document.getElementById('b-arrange').click(); document.getElementById('arr-go').click(); toast=ot;
      return {r1, none:{same:JSON.stringify(song)===pre, undo:undoStack.length===u0, msg}}; })()`);
    T(r.r1 && r.r1.applied && r.r1.done === 3 && r.r1.skip === 1 && r.r1.keep && r.r1.beatErr === 0 && r.none.same && r.none.undo && /没有可配伴奏的小节/.test(r.none.msg),
      'F3 变拍子小节（3/4）与 2/4 织体不符：该小节伴奏行原样保留、其余 3 小节生成、拍数全对；空旋律点生成：谱面与撤销栈都不动并说明原因', J(r));
  }

  /* ===== F4 单旋律谱：默认仍新窗口；改选「填进当前谱」原地补成 3 行 ===== */
  {
    await EV(`(()=>{ const s=createSong('vocal',{title:'单旋律',key:'G',beats:2,unit:4,nMea:4,nVox:1,lyr:2}); __twinkle24(s); addDoc(s); window.__pre=JSON.stringify(song); window.__nd=docs.length; window.__mel0=__mel(); })()`);
    await openArr();
    const m = await modalInfo();
    await pg.click('#arr-go'); await pg.waitForTimeout(250);
    /* 原谱：新窗口产出的既有口径会先把未入库的原谱存进「我的曲谱」（补 id），除 id 外逐字节不动 */
    const r0 = await EV(`(()=>{ const nd=docs.length, newTitle=song.title, o=JSON.parse(JSON.stringify(docs[__nd-1].song)), hadId=!!o.id; delete o.id;
      const origSame=JSON.stringify(o)===JSON.stringify(Object.assign(JSON.parse(__pre))); curDocI=__nd-1; song=docs[curDocI].song; undoStack.length=0; redoStack.length=0; render();
      window.__pre=JSON.stringify(song); return {nd, nd0:__nd, newTitle, origSame, hadId}; })()`);
    await openArr();
    if (await pg.$('#arr-out option[value="fill"]')) { await pg.selectOption('#arr-out', 'fill'); await pg.click('#arr-go'); }
    else await EV(`closeModal()`);   /* 旧版无此选项：下面的断言自然报红，不在这里卡 30 秒超时 */
    await pg.waitForTimeout(200);
    const r1 = await EV(`({docs:docs.length, n:song.voxVoices.length, nota:JSON.stringify(song.voxNotations), groups:JSON.stringify(song.voxGroups), pacc:isPianoAccStack(song), mel:__mel()===__mel0,
      dt:docType(song), names:song.voxVoices.join('/'), lh:song.measures.map(m=>m.voxes[2].length).join(''), undo:undoStack.length})`);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(120);
    const r2 = await EV(`({back:JSON.stringify(song)===__pre})`);
    const s2 = await EV(`(()=>{ const out={};
      const st=createSong('instr',{title:'五线',key:'C',beats:4,unit:4,nMea:2,nVox:1,clef:'staff',lyr:0}); st.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; }); addDoc(st);
      document.getElementById('b-arrange').click(); out.staffTxt=(document.querySelector('#arr-out option[value="fill"]')||{}).textContent; closeModal();
      fillAccompaniment('slow', true); out.staff=[JSON.stringify(song.voxNotations), isPianoAccStack(song), docType(song)];
      const te=createSong('teach',{title:'对照',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1}); te.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; }); addDoc(te);
      document.getElementById('b-arrange').click(); out.teachTxt=(document.querySelector('#arr-out option[value="fill"]')||{}).textContent; out.teachDef=document.getElementById('arr-out').value; closeModal();
      fillAccompaniment('slow', true); out.teach=[JSON.stringify(song.voxNotations), JSON.stringify(song.voxDual), isPianoAccStack(song), docType(song)];
      return out; })()`);
    T(m.out === 'teach' && m.opts.join() === 'fill,teach,pure' && r0.nd === r0.nd0 + 1 && r0.nd === r1.docs && r0.origSame && /伴奏对照谱/.test(r0.newTitle),
      'F4a 单旋律简谱：「填进当前谱」在列但默认仍是新窗口产出——点生成开新窗口、原谱逐字节不动', J({ m, r0 }));
    T(r1.n === 3 && r1.nota === '[null,"staff","bass"]' && r1.groups === '[{"type":"brace","from":1,"to":2}]' && r1.pacc && r1.mel && r1.dt === 'vocal' && r1.names === '旋律1/右手伴奏/左手伴奏' && r1.lh === '2222' && r1.undo === 1 && r2.back
      && s2.staffTxt === '填进当前谱（五线谱旋律＋大谱表伴奏，可撤销）' && s2.staff[0] === '["staff","staff","bass"]' && s2.staff[1]
      && s2.teachTxt === '填进当前谱（五线＋简谱对照旋律＋大谱表伴奏，可撤销）' && s2.teachDef === 'teach' && s2.teach[1] === '[true,false,false]' && s2.teach[2] && s2.teach[3] === 'teach',
      'F4b 改选「填进当前谱」：原地补成 3 行钢琴伴奏歌谱（不开窗口、旋律与歌词不动、一步撤销回单旋律逐字节）；五线谱 / 对照谱旋律同理（对照行 voxDual [真,假,假]）', J({ r1, r2, s2 }));
  }

  /* ===== F5 判定 isPianoAccStack + 非伴奏歌谱弹窗不出现「填进当前谱」+ 默认织体随谱 ===== */
  {
    const r = await EV(`(()=>{ const P=s=>isPianoAccStack(s);
      const choirB=createSong('instr',{nVox:3,nMea:2,clef:'staff',lyr:1}); choirB.voxNotations=['staff','staff','bass']; choirB.voxGroups=[{type:'bracket',from:0,to:2}];
      const choirI=createSong('instr',{nVox:3,nMea:2,clef:'staff',lyr:1}); choirI.voxNotations=['staff','staff','bass'];
      const mel=createSong('vocal',{nMea:2,nVox:1,lyr:1}); mel.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4)]; });
      const legacy=arrangeAccompaniment(mel,{texId:'slow'}).song;
      const yes={JG:P(__jg()), SG:P(__jg({}, 'S')), SJG:P(__jg({}, 'SJ')), legacy:P(legacy)};
      const no={choirB:P(choirB), choirI:P(choirI), piano:P(createSong('piano',{nMea:2})), pacc:P(createSong('pianoacc',{nMea:2})), func:P(createSong('func',{ftype:'func',nVox:1,nMea:2})),
        gtr:P(createSong('tanchang',{nTab:1,nVox:1,nMea:2})), vocal:P(mel), nul:P(null), pure:P(arrangeAccompaniment(mel,{texId:'slow',pure:true}).song)};
      const opts=s=>{ addDoc(s); document.getElementById('b-arrange').click(); const o=[...document.querySelectorAll('#arr-out option')].map(x=>x.value).join(); const v=(document.getElementById('arr-out')||{}).value;
        const t=(document.querySelector('input[name="arr-tex"]:checked')||{}).value; closeModal(); return o+'|'+v+'|'+t; };
      const g=createSong('tanchang',{nTab:1,nVox:1,nMea:2,lyr:1}); g.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4)]; });
      const leg2=JSON.parse(JSON.stringify(legacy)); leg2.texId='arp8';
      const jg44=__jg({key:'C',beats:4,unit:4,nMea:2}); jg44.texId='flow8';
      const mel24=createSong('vocal',{nMea:2,beats:2,unit:4,nVox:1,lyr:1});
      return {yes, no, gtr:opts(g), choir:opts(choirB), legacy:opts(leg2), jg44:opts(jg44), mel24:opts(mel24),
        sameStruct:JSON.stringify([legacy.voxVoices, legacy.voxNotations, legacy.voxDual])}; })()`);
    const allYes = r.yes && Object.values(r.yes).every(Boolean), allNo = r.no && Object.values(r.no).every(x => x === false);
    T(allYes && allNo && r.gtr === 'teach,pure|teach|slow' && r.choir === 'teach,pure|teach|slow' && r.legacy === 'fill,teach,pure|fill|arp8' && r.jg44 === 'fill,teach,pure|fill|flow8' && r.mel24 === 'fill,teach,pure|teach|march2',
      'F5 判定：JG / SG / SJG / 一键配伴奏老产物＝钢琴伴奏歌谱（默认填进、织体＝上次用的）；三部合唱（方括号 / 推断）、钢琴独奏 / 弹唱、功能谱、吉他谱＝否，吉他谱与合唱弹窗无「填进当前谱」；单旋律 2/4 默认织体仍是进行曲 2/4', J(r));
  }

  /* ===== F6 生成六线谱复用空轨 ===== */
  {
    await EV(`(()=>{ const s=createSong('tanchang',{title:'弹唱',inst:'guitar',key:'G',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:1});
      s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(5,4,{oct:-1}),__V(1,4),__V(2,4),__V(3,8),__V(1,8)]; }); s.measures[0].voxes[0][0].chord='G';
      addDoc(s); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; setRibbon('vox'); render(); window.__pre=JSON.stringify(song); window.__u0=undoStack.length; })()`);
    await pg.waitForTimeout(120);
    const lit = await EV(`(()=>{ const b=document.getElementById('nl-voxtab'); const r=b&&b.getBoundingClientRect(); return !!(r && r.width>0 && r.height>0); })()`);
    if (lit) await pg.click('#nl-voxtab'); else await EV(`showVoxTabMenu(0)`);
    await pg.waitForTimeout(120);
    await pg.click('#vt-low'); await pg.waitForTimeout(150);
    const r = await EV(`(()=>{ const tun=tuningOf(), cap=song.capo||0; let ok=0, bad=0;
      song.measures.forEach((m,mi)=>m.voxes[0].forEach((c,ci)=>{ const t=m.tabs[0][ci]; const n=(t.notes||[])[0]; if(n && tun[n.s-1]+cap+n.f===voxMidi(c,mi) && t.dur===c.dur) ok++; else bad++; }));
      return {n:song.tabVoices.length, names:song.tabVoices.join('/'), ok, bad, row:sel.row, vi:sel.vi, undo:undoStack.length-__u0, jp:'tabJpVoices' in song, tabJp:'tabJp' in song, caps:'tabCapos' in song}; })()`);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(120);
    const u = await EV(`({back:JSON.stringify(song)===__pre})`);
    T(lit && r.n === 1 && r.names === '吉他·旋律1' && r.ok === 10 && r.bad === 0 && r.row === 'tab' && r.vi === 0 && r.undo === 1 && !r.jp && !r.tabJp && !r.caps && u.back,
      'F6a 吉他弹唱「先写旋律」：真实点击「六」灯 → 低把位：复用唯一的空吉他轨（仍 1 条、改名「吉他·旋律1」、10 音逐音音高 / 时值等价、光标落 TAB），不写联排 / 夹位字段；Ctrl+Z 回到空轨原名逐字节', J({ lit, r, u }));
    const v = await EV(`(()=>{ const mk=(o,f)=>{ const s=createSong('tanchang',Object.assign({inst:'guitar',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0},o||{}));
        s.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; }); if(f) f(s); addDoc(s); return s; };
      const res=(r)=>({n:song.tabVoices.length, nm:song.tabVoices.join('/'), reused:r.reused, jp:JSON.stringify(song.tabJpVoices===undefined? '∅' : song.tabJpVoices), tabJp:!!song.tabJp,
        t0:JSON.stringify(song.measures[0].tabs[0].map(c=>(c.notes||[]).length))});
      const out={};
      mk(null, s=>{ s.measures[1].tabs[0][2].notes=[{s:3,f:2}]; }); out.note=res(mapVoxToTab(0,'low')); out.note.keep=JSON.stringify(song.measures[1].tabs[0][2].notes);
      mk(null, s=>{ s.measures[1].tabs[0][0].chord='C'; }); out.chord=res(mapVoxToTab(0,'low'));
      mk(null, s=>{ s.measures[0].tabs[0][0].strum='d'; }); out.strum=res(mapVoxToTab(0,'low'));
      mk({nTab:2}); out.two=res(mapVoxToTab(0,'low'));
      mk(null, s=>{ s.tabJp=true; s.tabJpVoices=[true]; }); out.jpOn=res(mapVoxToTab(0,'low'));
      mk(null, s=>{ s.tabJp=true; }); out.jpOld=res(mapVoxToTab(0,'low'));
      mk({inst:'uku'}); out.uku=res(mapVoxToTab(0,'follow'));
      mk(null); const d=mapVoxToTab(0,'low',true); out.dry={n:song.tabVoices.length, nm:song.tabVoices.join('/'), nNotes:d.nNotes, empty:tabTrackEmpty(song,0)};
      return out; })()`);
    T(v.note && v.note.n === 2 && v.note.reused === false && v.note.keep === '[{"s":3,"f":2}]' && v.note.nm === '吉他1/吉他·旋律1' && v.chord.n === 2 && v.strum.n === 2 && v.two.n === 3 && v.two.reused === false
      && v.jpOn.n === 1 && v.jpOn.reused && v.jpOn.jp === '"∅"' && !v.jpOn.tabJp && v.jpOn.t0 === '[1,1,1,1]'
      && v.jpOld.n === 1 && v.jpOld.jp === '"∅"' && !v.jpOld.tabJp && v.uku.n === 1 && v.uku.nm === '尤克里里·旋律1' && v.dry.n === 1 && v.dry.nm === '吉他1' && v.dry.nNotes === 8 && v.dry.empty,
      'F6b 已有品位 / 和弦 / 扫弦的单轨、两条空轨 → 照旧另加一条；复用时生成轨按「生成的把位轨默认不点亮简谱联排」（同另加轨路径）：逐轨开 [真] / 老谱整曲 tabJp 都关掉（不再多一行与旋律重复的简谱）；尤克里里同理；预览统计（dry）不改谱', J(v));
    /* F6c 验收补：空轨上的标注 / 延长号不算空、改过的轨名保留、静音轨照实提示、弹窗文案照实说「写进空轨」 */
    const w = await EV(`(()=>{ const mk=(o,f)=>{ const s=createSong('tanchang',Object.assign({inst:'guitar',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0},o||{}));
        s.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; }); if(f) f(s); addDoc(s); return s; };
      const out={};
      mk(null, s=>{ s.measures[0].tabs[0][0].anno='前奏'; }); out.anno={r:mapVoxToTab(0,'low').reused, n:song.tabVoices.length, keep:song.measures[0].tabs[0][0].anno};
      mk(null, s=>{ s.measures[1].tabs[0][3].ferm=true; }); out.ferm={r:mapVoxToTab(0,'low').reused, n:song.tabVoices.length, keep:!!song.measures[1].tabs[0][3].ferm};
      mk(null, s=>{ s.tabVoices=['主音吉他']; }); { const r=mapVoxToTab(0,'low'); out.custom={r:r.reused, n:song.tabVoices.length, nm:song.tabVoices[0], rn:r.name}; }
      mk(null, s=>{ s.mixer={'tab:0':{on:false, solo:false, inst:'nylon', vol:0.4, pan:null}}; });
      document.getElementById('nl-voxtab') && (out.title=document.getElementById('nl-voxtab').title);
      showVoxTabMenu(0); out.modal=(document.querySelector('.modal p')||{}).textContent||''; closeModal();
      { const r=mapVoxToTab(0,'low'); out.muted={r:r.reused, muted:r.muted, mix:JSON.stringify(song.mixer['tab:0'])}; }
      return out; })()`);
    await EV(`(()=>{ const s=createSong('tanchang',{inst:'guitar',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0}); s.measures.forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4),__V(5,4),__V(1,4,{oct:1})]; });
      s.mixer={'tab:0':{on:false, solo:false, inst:'steel', vol:1, pan:null}}; addDoc(s); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; setRibbon('vox'); render(); })()`);
    await pg.waitForTimeout(100);
    if (await EV(`(()=>{ const b=document.getElementById('nl-voxtab'); const r=b&&b.getBoundingClientRect(); return !!(r && r.width>0); })()`)) await pg.click('#nl-voxtab'); else await EV(`showVoxTabMenu(0)`);
    await pg.waitForTimeout(100); await pg.click('#vt-low'); await pg.waitForTimeout(120);
    w.toast = await EV(`document.getElementById('toast').textContent`);
    T(w.anno && !w.anno.r && w.anno.n === 2 && w.anno.keep === '前奏' && !w.ferm.r && w.ferm.n === 2 && w.ferm.keep
      && w.custom.r && w.custom.n === 1 && w.custom.nm === '主音吉他' && w.custom.rn === '主音吉他'
      && /写进当前的空吉他轨「吉他1」（改名为「吉他·旋律1」）/.test(w.modal) && /静音/.test(w.modal) && /写进当前的空吉他轨「吉他1」/.test(w.title || '')
      && w.muted.r && w.muted.muted && /"on":false/.test(w.muted.mix) && /已写进空轨「吉他·旋律1」/.test(w.toast) && /静音/.test(w.toast),
      'F6c 复用空轨的边界：TAB 上有段落标注 / 延长号的轨不算空（另加一条、原标注保留）；用户改过的轨名（主音吉他）保留不改写；混音台静音的空轨在弹窗与提示里照实说；「六」灯提示与弹窗文案写「写进当前的空吉他轨」', J(w));
  }

  /* ===== F7 2/4 儿歌伴奏织体 × 12 调 × 22 和弦 ===== */
  {
    const r = await EV(`(()=>{ const out={};
      const t=PIANO_TEX.find(x=>x.id==='kids2'); const u=t? (t.unit||4) : 0, sum=a=>a.reduce((x,e)=>x+u/e.d,0);
      out.def = !!t && t.beats===2 && u===4 && t.level==='入门' && /儿歌伴奏/.test(t.name) && sum(t.L)===2 && sum(t.R)===2 && texAvail(2,4).map(x=>x.id).join()==='march2,polka2,kids2';
      /* 期望值独立算（不读 chordTones）：根音 / 斜线低音音级 + 三音槽 / 五音槽半音 */
      const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
      const Q={'':[4,7], m:[3,7], '7':[4,7], m7:[3,7], maj7:[4,7], m7b5:[3,6], dim:[3,6], aug:[4,8], sus4:[5,7], sus2:[2,7], '6':[4,7], add9:[4,7], '9':[4,7]};
      const Q7={'7':10, m7:10, maj7:11, m7b5:10, '9':10};   /* 七和弦：右手轻柱式 3·7（sev），左手仍是五音 */
      const CH=['C','Cm','G7','Dm7','Fmaj7','Bb','F#m7b5','Ebaug','Bdim','Asus4','Dsus2','A6','Eadd9','Ab9','C/E','G/B','Am/G','F/C','D/F#','Bb/D','Em7/D','Gsus4/C'];
      const parse=n=>{ const m=/^([A-G](?:#|b)?)([^/]*)(?:\\/([A-G](?:#|b)?))?$/.exec(n); return {r:PC[m[1]], q:Q[m[2]], s7:Q7[m[2]], b:m[3]!=null? PC[m[3]] : null}; };
      const pc=x=>((x%12)+12)%12;
      const bad=[]; let n=0, minLow=99, maxLow=0, minR=99, maxR=0;
      KEY_LIST.forEach(key=>{
        const s=__jg({key, nMea:CH.length+1, lyr:0});
        s.measures.forEach((m,mi)=>{ m.voxes[0]=mi<CH.length? [__V(1,4,{chord:CH[mi]}),__V(5,4)] : [__V(1,2,{chord:'C'})]; });
        undoStack.length=0; loadSong(s);
        const g=genAccompaniment('kids2', 0, song.measures.length-1, {chordVi:0, rhVi:1, lhVi:2});
        if(g.done!==CH.length+1) bad.push(key+':done'+g.done);
        if(beatErrors().length) bad.push(key+':beatErr'+beatErrors().length);
        /* 曲末小节收束（endHold）：左手根音二分 C3、右手 C4·E4·G4 二分柱式 */
        { const mi=CH.length, m=song.measures[mi], L=m.voxes[2], R=m.voxes[1];
          const hold = L.length===1 && R.length===1 && L[0].dur===2 && R[0].dur===2 && voxMidi(L[0],mi)===48 && [voxMidi(R[0],mi)].concat((R[0].adds||[]).map(a=>voxMidi(Object.assign({acc:'',oct:0},a),mi))).join()==='60,64,67';
          if(!hold) bad.push(key+':endHold'); }
        song.measures.slice(0, CH.length).forEach((m,mi)=>{ n++; const c=parse(CH[mi]); const R=m.voxes[1], L=m.voxes[2];
          const mid=x=>voxMidi(x,mi), adds=x=>(x.adds||[]).map(a=>voxMidi(Object.assign({acc:'',oct:0},a),mi));
          const okDur = R.length===2 && L.length===2 && [R[0],R[1],L[0],L[1]].every(x=>x.dur===4 && !x.dotted) && !R[0].deg && R[1].deg && L[0].deg && L[1].deg;
          if(!okDur){ bad.push(key+':'+CH[mi]+':shape'); return; }
          const l0=mid(L[0]), l1=mid(L[1]), r=[mid(R[1])].concat(adds(R[1]));
          const want0 = c.b!=null? c.b : c.r;
          const rset=new Set(r.map(pc)), wantR=new Set([pc(c.r+c.q[0]), pc(c.r+(c.s7!=null? c.s7 : c.q[1]))]);
          const ok = pc(l0)===want0 && pc(l1)===pc(c.r+c.q[1]) && r.length===2 && [...wantR].every(x=>rset.has(x)) && rset.size===wantR.size
            && l0<l1 && r.every(x=>x>l1) && (c.b==null || (l0>=41 && l0<=52 && l1-l0>0 && l1-l0<19));
          minLow=Math.min(minLow,l0); maxLow=Math.max(maxLow,l1); minR=Math.min(minR,...r); maxR=Math.max(maxR,...r);
          if(!ok) bad.push(key+':'+CH[mi]+':'+[l0,l1,r.join('+')].join(' '));
        });
      });
      out.n=n; out.bad=bad.slice(0,6); out.nb=bad.length; out.range=[minLow,maxLow,minR,maxR]; return out; })()`);
    T(r.def && r.n === 12 * 22 && r.nb === 0 && r.range && r.range[0] >= 41 && r.range[1] <= 67 && r.range[2] >= 55 && r.range[3] <= 84,
      'F7 2/4「儿歌伴奏」织体：库里有（入门，两手各 2 拍，2/4 可选 进行曲 / 波尔卡 / 儿歌 三套）；12 调 × 22 和弦（七 / 半减七 / 增 / 减 / 挂留 / 加九 / 7 种转位斜线）共 ' + r.n + ' 小节：右手 [休止, 三音·五音（七和弦 三音·七音）]、左手 [低音（斜线和弦＝斜线低音，落在 F2–E3）, 五音]，全四分、beatErrors 0、左手第一拍为全小节最低音；曲末小节收束（根音 + 1·3·5 二分）；音域 ' + J(r.range), J({ bad: r.bad, nb: r.nb }));
  }

  /* ===== F8 斜线低音（全部织体）+ 非斜线和弦生成与 v67.3 逐字节相同 ===== */
  {
    const GEN = `(()=>{ const out={};
      const CH=['C','Am','F','G7','Dm7','E7','Bbmaj7','F#m7b5'];
      const run=(tex, beats, unit, key)=>{ const s=createSong('piano',{key, beats, unit, nMea:CH.length, lyr:0});
        s.voxVoices=['旋律','右手','左手']; s.voxNotations=[undefined,'staff','bass']; s.measures.forEach((m,mi)=>{ const b=blankVoxCols(beats,unit); b[0].deg=1; b[0].chord=CH[mi]; m.voxes=[b, blankVoxCols(beats,unit), blankVoxCols(beats,unit)]; });
        const o0=song; song=s; let pit;
        try{ genAccompaniment(tex, 0, CH.length-1, {chordVi:0, rhVi:1, lhVi:2});
          /* 音高签名（时值 + 实际音高，拼写无关）：v67.6 起变化音按和弦字母拼写（B♭ 不再写成 A♯），音高必须与 v67.3 完全相同 */
          pit=JSON.stringify(s.measures.map((m,mi)=>[m.voxes[1], m.voxes[2]].map(v=>v.map(c=>[c.dur, !!c.dotted, c.deg? [voxMidi(c,mi)].concat((c.adds||[]).map(a=>voxMidi(Object.assign({acc:'',oct:0},a),mi))) : 0])))); }
        finally { song=o0; }
        return {raw:JSON.stringify(s.measures.map(m=>[m.voxes[1], m.voxes[2]])), pit}; };
      PIANO_TEX.filter(t=>t.id!=='kids2').forEach(t=>{ ['C','Eb','A','F','G'].forEach(k=>{ out[t.id+':'+k]=run(t.id, t.beats, t.unit||(t.beats===6?8:4), k); }); });
      return out; })()`;
    const cur = await EV(GEN);
    let refSame = null;
    if (REF) {
      const pr = await b.newPage({ viewport: { width: 1280, height: 900 } }); pr.on('pageerror', e => errs.push('REF:' + e.message));
      await pr.goto(REF); await pr.waitForTimeout(900);
      const ref = await pr.evaluate(GEN).catch(e => ({ err: e.message }));
      const keys = Object.keys(ref); refSame = { n: keys.length, diff: keys.filter(k => !cur[k] || ref[k].pit !== cur[k].pit), respelled: keys.filter(k => cur[k] && ref[k].raw !== cur[k].raw).length };
      await pr.close();
    }
    const s = await EV(`(()=>{ const s=__jg({key:'C', beats:4, unit:4, nMea:4, lyr:0}); const CH=['C/E','G/B','Am/G','F/C'];
      s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1,1,{chord:CH[mi]})]; }); undoStack.length=0; loadSong(s);
      genAccompaniment('kids', 0, 3, {chordVi:0, rhVi:1, lhVi:2});
      return song.measures.map((m,mi)=>m.voxes[2].map(c=>voxMidi(c,mi)).join(',')); })()`);
    /* 斜线低音落在固定音区 F2–E3（41–52）：C/E→E3=52、G/B→B2=47、Am/G→G2=43、F/C→C3=48；其余槽位照旧（都在低音之上） */
    T(Array.isArray(s) && s[0] === '52,55,52,55' && s[1] === '47,62,59,62' && s[2] === '43,52,48,52' && s[3] === '48,60,57,60' && (!REF || (refSame && refSame.n >= 100 && refSame.diff.length === 0)),
      'F8 斜线和弦：4/4 儿歌伴奏左手第一拍弹斜线低音（F2–E3 音区：C/E→E3、G/B→B2、Am/G→G2、F/C→C3），其余槽位照旧；' + (REF ? '非斜线和弦 × 21 套旧织体 × 5 调与 v67.3 生成音高 / 时值逐音相同（' + (refSame && refSame.n) + ' 组，其中 ' + (refSame && refSame.respelled) + ' 组仅变化音拼写不同）' : '（设 MUSETAB_REF 时再对拍 v67.3 的非斜线生成）'), J({ s, refSame }));
  }

  /* ===== F9 验收补：伴奏两行已有内容时不静默覆盖（导入的人声＋钢琴 MusicXML / 生成后手改） ===== */
  {
    const XML = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Voice</part-name></score-part><score-part id="P2"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">${[1, 2, 3, 4].map(i => `<measure number="${i}">${i === 1 ? '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}${['C', 'D', 'E', 'F'].map(st => `<note><pitch><step>${st}</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')}</measure>`).join('')}</part>
<part id="P2">${[1, 2, 3, 4].map(i => `<measure number="${i}">${i === 1 ? '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>' : ''}<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note><note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note><backup><duration>4</duration></backup><note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note></measure>`).join('')}</part></score-partwise>`;
    const a0 = await pg.evaluate(xml => { const r = importMusicXML(xml); addDoc(r.song || r); window.__pp = JSON.stringify(song.measures.map(m => [m.voxes[1], m.voxes[2]])); window.__nd = docs.length; window.__u0 = undoStack.length;
      return { pacc: isPianoAccStack(song), tex: song.texId || null }; }, XML).catch(e => ({ err: e.message }));
    await openArr();
    const m = await modalInfo();
    const warnVis = () => EV(`(()=>{ const w=document.getElementById('arr-warn'); return w? getComputedStyle(w).display : 'absent'; })()`);
    m.warn0 = await warnVis();
    if (await pg.$('#arr-out option[value="fill"]')) await pg.selectOption('#arr-out', 'fill');
    m.warn1 = await warnVis(); m.warnTxt = await EV(`(document.getElementById('arr-warn')||{}).textContent||''`);
    await pg.click('#arr-go'); await pg.waitForTimeout(200);
    const a1 = await EV(`({docs:docs.length===__nd, undo:undoStack.length-__u0, changed:JSON.stringify(song.measures.map(m=>[m.voxes[1],m.voxes[2]]))!==__pp, toast:document.getElementById('toast').textContent})`);
    await EV(`undo()`);
    const a2 = await EV(`({back:JSON.stringify(song.measures.map(m=>[m.voxes[1],m.voxes[2]]))===__pp})`);
    /* 生成后手改一小节，再打开：本工具生成过（texId）→ 默认仍填进，但提示会覆盖 */
    await EV(`(()=>{ const s=__twinkle24(__jg()); addDoc(s); })()`);
    await openArr(); const b0 = await modalInfo(); b0.warn = await warnVis(); await pg.click('#arr-go'); await pg.waitForTimeout(150);
    await EV(`(()=>{ mutate(()=>{ song.measures[0].voxes[1]=[__V(1,8,{oct:1}),__V(7,8),__V(6,8),__V(5,8)]; }); render(); window.__hand=JSON.stringify(song.measures[0].voxes[1]); })()`);
    await openArr(); const b1 = await modalInfo(); b1.warn = await warnVis(); b1.warnTxt = await EV(`(document.getElementById('arr-warn')||{}).textContent||''`);
    await pg.click('#arr-go'); await pg.waitForTimeout(150);
    const b2 = await EV(`({gone:JSON.stringify(song.measures[0].voxes[1])!==__hand, toast:document.getElementById('toast').textContent})`);
    T(a0.pacc && !a0.tex && m.out === 'teach' && /覆盖已有的 4 小节伴奏/.test(m.fillTxt) && m.warn0 === 'none' && m.warn1 === 'block' && /第 1–4 小节中有 4 小节有音符/.test(m.warnTxt)
      && a1.docs && a1.undo === 1 && a1.changed && /覆盖了 4 小节原有伴奏/.test(a1.toast) && a2.back
      && b0.out === 'fill' && b0.warn === 'absent' && b1.out === 'fill' && b1.warn === 'block' && /覆盖已有的 4 小节伴奏/.test(b1.fillTxt) && b2.gone && /覆盖了 1 小节原有伴奏/.test(b2.toast),
      'F9 伴奏两行已有内容不静默覆盖：导入的人声＋钢琴 MusicXML（无 texId）默认改回新窗口产出、选项写「覆盖已有的 4 小节伴奏」，改选填进时弹出覆盖提示、生成后提示「覆盖了 4 小节原有伴奏」、一步撤销还原；本工具生成后手改一小节再配：默认仍填进但弹窗提示覆盖、生成后提示「覆盖了 1 小节」', J({ a0, m, a1, a2, b0, b1, b2 }));
  }

  /* ===== F10 斜线低音音区（验收：根音以下最近会把级进低音线拆成八度大跳） ===== */
  {
    const r = await EV(`(()=>{ const line=(key, CH, tex, beats)=>{ const s=__jg({key, beats, unit:4, nMea:CH.length+1, lyr:0});
        s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1, beats===2? 2 : 1, {chord: mi<CH.length? CH[mi] : CH[0]})]; }); addDoc(s); fillAccompaniment(tex, false);
        return CH.map((c,mi)=>voxMidi(song.measures[mi].voxes[2][0], mi)); };
      return {F:line('F', ['F','C/E','Dm','Am/C','Bb','F/A'], 'kids2', 2), canon:line('C', ['C','G/B','Am','Em/G','F','C/E','F','G'], 'kids', 4),
        jump:(()=>{ const s=__jg({key:'C', beats:2, unit:4, nMea:3, lyr:0}); s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1,4,{chord:['C/E','A/E','C'][mi]}),__V(2,4,{chord:mi===0?'F':''})]; }); addDoc(s); fillAccompaniment('kids2', false);
          return song.measures.slice(0,2).map((m,mi)=>m.voxes[2].map(c=>voxMidi(c,mi)).join(',')); })()}; })()`);
    T(J(r.F) === '[53,52,50,48,46,45]' && J(r.canon) === '[48,47,45,43,53,52,53,55]' && r.jump && r.jump[0] === '52,53' && r.jump[1] === '52,64',
      'F10 斜线低音落在 F2–E3：1=F「F–C/E–Dm–Am/C–B♭–F/A」左手第一拍 F3 E3 D3 C3 B♭2 A2 级进；1=C 卡农「C–G/B–Am–Em/G–F–C/E–F–G」C3 B2 A2 G2 F3 E3 F3 G3；「C/E→F」半小节 E3→F3（不再 E2→C4 跨 20 半音），A/E 左手 E3 与五音 E4 不同音', J(r));
  }

  /* ===== F11 中途转调（keyTo）后伴奏按本小节生效调写（验收：此前整体高一个全音） ===== */
  {
    const r = await EV(`(()=>{ const s=__jg({key:'F', nMea:4, lyr:0}); const CH=['F','C','G','D7'];
      s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1,4,{chord:CH[mi]}),__V(3,4)]; }); s.measures[2].keyTo='G'; s.measures[3].keyTo='G'; addDoc(s);
      fillAccompaniment('kids2', false);
      const PCS={F:[5,9,0], C:[0,4,7], G:[7,11,2], D7:[2,6,9,0]}; let bad=[];
      song.measures.forEach((m,mi)=>[1,2].forEach(vi=>m.voxes[vi].forEach(c=>{ if(!c.deg) return; [voxMidi(c,mi)].concat((c.adds||[]).map(a=>voxMidi(Object.assign({acc:'',oct:0},a),mi))).forEach(x=>{ if(!PCS[CH[mi]].includes(((x%12)+12)%12)) bad.push(mi+':'+x); }); })));
      return {bad, g:song.measures[2].voxes[2].map(c=>voxMidi(c,2)).join(',')+'|'+[song.measures[2].voxes[1][1]].map(c=>[voxMidi(c,2)].concat(c.adds.map(a=>voxMidi(Object.assign({acc:'',oct:0},a),2))).join('+')).join('')}; })()`);
    T(r.bad && r.bad.length === 0 && r.g === '55,62|71+74',
      'F11 1=F 第 3 小节转 1=G：G / D7 小节的伴奏音全部是和弦内音（G 和弦左手 G3·D4、右手 B4+D5；此前按谱首调换算成 A 大三 / E7）', J(r));
  }

  /* ===== F12 变化音按和弦字母拼写（验收：1=G 的 F 和弦左手记成 E♯3） ===== */
  {
    const r = await EV(`(()=>{ const LET='CDEFGAB', NAT=[0,2,4,5,7,9,11];
      const CH=['F','Bb','Eb','Ab','Fm','Cm','Bbmaj7','Ebm','Db','E7','A7','D7','F#m7b5','Bdim7','C/E','D/F#','Ab/C','Bb/D','Gm','Dm7'];
      const QL={'':[0,2,4], m:[0,2,4], maj7:[0,2,4,6], m7:[0,2,4,6], '7':[0,2,4,6], m7b5:[0,2,4,6], dim7:[0,2,4,6]};
      const bad=[]; let n=0, nDbl=0;
      ['C','G','D','A','E','F','Bb','Eb','Ab'].forEach(key=>{ ['kids2','block','arp16'].forEach(tex=>{ const t=PIANO_TEX.find(x=>x.id===tex);
        const s=__jg({key, beats:t.beats, unit:4, nMea:CH.length+1, lyr:0});
        s.measures.forEach((m,mi)=>{ const b=blankVoxCols(t.beats,4); b[0].deg=1; b[0].chord=CH[mi]||'C'; m.voxes[0]=b; }); addDoc(s); fillAccompaniment(tex, false);
        const Ki=LET.indexOf(key[0]);
        song.measures.slice(0, CH.length).forEach((m,mi)=>{ const mt=/^([A-G][#b]?)([^/]*)(?:\\/([A-G][#b]?))?$/.exec(CH[mi]); const rl=LET.indexOf(mt[1][0]);
          const lets=new Set(QL[mt[2]].map(o=>LET[(rl+o)%7])); if(mt[3]) lets.add(mt[3][0]);
          [1,2].forEach(vi=>m.voxes[vi].forEach(c=>{ if(!c.deg) return; [c].concat(c.adds||[]).forEach(x=>{ n++;
            const L=LET[(Ki + x.deg - 1) % 7];
            /* 和弦字母在本调要写重升 / 重降时（如 1=A 的 E♭m 三音 G♭＝重降 7）按约定退回单升降旧拼法——此时允许字母不在和弦音名里 */
            const pcx=((voxMidi(Object.assign({acc:'',oct:0},x),mi)%12)+12)%12;
            const nd=Lc=>{ let a=((pcx-NAT[LET.indexOf(Lc)])%12+12)%12; if(a>6) a-=12; return a; };
            const Lc=[...lets].sort((u,v)=>Math.abs(nd(u))-Math.abs(nd(v)))[0];   /* 该音应写的和弦字母（本位字母离实际音高最近的和弦音名） */
            const dg=(LET.indexOf(Lc)-Ki+7)%7+1; let a=((pcx-(KEY_PC[key]+DEG_SEMI[dg]))%12+12)%12; if(a>6) a-=12;
            const dbl=Math.abs(a)===2;
            if(dbl) nDbl++;
            if((L!==Lc && !dbl) || !['','#','b'].includes(x.acc||'')) bad.push(key+':'+tex+':'+CH[mi]+':'+(x.acc||'')+x.deg+'→'+L+'≠'+Lc); }); }));
        }); }); });
      /* 1=G 的 F 和弦：左手 ♭7（五线谱 F♮3），不是 ♯6（E♯3） */
      const s=__jg({key:'G', nMea:2, lyr:0}); s.measures.forEach((m,mi)=>{ m.voxes[0]=[__V(1,2,{chord:'F'})]; }); addDoc(s); fillAccompaniment('kids2', false);
      const c0=song.measures[0].voxes[2][0];
      return {n, nDbl, bad:bad.slice(0,6), nb:bad.length, gF:(c0.acc||'')+c0.deg+'@'+voxMidi(c0,0)}; })()`);
    T(r.n > 3000 && r.nb === 0 && r.gF === 'b7@53',
      'F12 伴奏音按和弦字母拼写：9 个常用调 × 3 套织体 × 20 个和弦（含 B♭ / E♭ / A♭ / Fm / Cm / 七和弦 / 半减七 / 减七 / 转位）共 ' + r.n + ' 个音，五线谱字母全部属于该和弦的音名（只出单升 / 单降；需重升降的 ' + r.nDbl + ' 个按约定退回旧拼法）；1=G 的 F 和弦左手是 ♭7（F3），不再是 ♯6（E♯3）', J(r));
  }

  /* ===== F13 弱起小节：伴奏两行写成与弱起等长的休止（验收：此前整小节伴奏与第 1 小节强拍叠响） ===== */
  {
    await EV(`(()=>{ const s=__jg({key:'C', nMea:4, lyr:0}); s.pickup=true; s.measures[0].voxes[0]=[__V(5,4,{oct:-1})];
      s.measures.slice(1).forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4)]; }); addDoc(s); })()`);
    await openArr(); const m = await modalInfo(); await pg.click('#arr-go'); await pg.waitForTimeout(150);
    const r = await EV(`(()=>{ const bt=(cols,mi)=>(cols||[]).reduce((a,c)=>a+beatsOf(c, meaMeter(mi).unit),0);
      const out={R:bt(song.measures[0].voxes[1],0), L:bt(song.measures[0].voxes[2],0), rest:song.measures[0].voxes.slice(1).every(v=>v.every(c=>!c.deg)), m1:song.measures[1].voxes[2].filter(c=>c.deg).length,
        be:beatErrors().length, toast:document.getElementById('toast').textContent};
      /* 八分弱起 4/4（抒情分解）+ 新窗口路径 */
      const s=__jg({key:'C', beats:4, unit:4, nMea:3, lyr:0}); s.pickup=true; s.measures[0].voxes[0]=[__V(5,8,{oct:-1,chord:'G'})]; s.measures.slice(1).forEach(m=>{ m.voxes[0]=[__V(1,2,{chord:'C'}),__V(3,2)]; }); addDoc(s);
      const f=fillAccompaniment('slow', false); out.e8={pk:f.gen.pickup, R:song.measures[0].voxes[1].map(c=>c.dur+(c.deg?'n':'r')).join(','), be:beatErrors().length};
      const a=arrangeAccompaniment(song,{texId:'slow', suggest:false}).song; const o0=song; song=a; out.arr={R:bt(a.measures[0].voxes[1],0), L:bt(a.measures[0].voxes[2],0), be:beatErrors().length}; song=o0;
      return out; })()`);
    T(m.out === 'fill' && r.R === 1 && r.L === 1 && r.rest && r.m1 === 2 && r.be === 0 && /弱起小节只留旋律/.test(r.toast)
      && r.e8.pk === 1 && r.e8.R === '8r' && r.e8.be === 0 && r.arr.R === 0.5 && r.arr.L === 0.5 && r.arr.be === 0,
      'F13 弱起：2/4 一拍弱起（默认勾自动配和弦）→ 伴奏两行只有一拍休止、第 1 小节起正常、提示「弱起小节只留旋律」；4/4 八分弱起同理（八分休止），新窗口产出（教学对照谱）同口径', J({ m, r }));
  }

  /* ===== F14 2/4 儿歌伴奏：半小节换和弦弹新根音、七和弦 3·7、曲末收束 ===== */
  {
    const r = await EV(`(()=>{ const s=__jg({key:'F', nMea:3, lyr:0}); const CH=[['F','C7'],['Bb','C7'],['F']];
      s.measures.forEach((m,mi)=>{ m.voxes[0]=CH[mi].length===2? [__V(1,4,{chord:CH[mi][0]}),__V(2,4,{chord:CH[mi][1]})] : [__V(1,2,{chord:CH[mi][0]})]; }); addDoc(s);
      fillAccompaniment('kids2', false);
      const md=(c,mi)=>c.deg? [voxMidi(c,mi)].concat((c.adds||[]).map(a=>voxMidi(Object.assign({acc:'',oct:0},a),mi))).join('+') : 'r';
      return song.measures.map((m,mi)=>m.voxes[2].map(c=>md(c,mi)+'/'+c.dur).join(' ')+' | '+m.voxes[1].map(c=>md(c,mi)+'/'+c.dur).join(' ')); })()`);
    T(Array.isArray(r) && r[0] === '53/4 48/4 | r/4 64+70/4' && r[1] === '46/4 48/4 | r/4 64+70/4' && r[2] === '53/2 | 65+69+72/2',
      'F14 2/4 儿歌伴奏「F C7 | B♭ C7 | F」：第 2 拍换 C7 时左手弹 C3（不再落五音 G）、右手 E4·B♭4（七和弦 3·7）；曲末 F 小节左手 F3 + 右手 F4·A4·C5 二分收束', J(r));
  }

  /* ===== F15 尾部未写旋律的小节不配、funcNames 不动、混音音色 ===== */
  {
    const r = await EV(`(()=>{ const out={};
      const s=__jg({key:'C', nMea:8, lyr:0}); s.measures.slice(0,4).forEach(m=>{ m.voxes[0]=[__V(1,4),__V(3,4)]; });
      s.mixer={'vox:1':{on:true, solo:false, inst:'strings', vol:0.8, pan:null}}; addDoc(s); trackCfg('vox',2);   /* 右手调过音色（保留）；左手被播放 / 混音台惰性补成默认人声（改钢琴） */
      let msg=''; const ot=toast; toast=m=>{ msg=String(m); };
      document.getElementById('b-arrange').click(); document.getElementById('arr-go').click(); toast=ot;
      out.tail={msg, rest:song.measures.slice(4).every(m=>[1,2].every(vi=>m.voxes[vi].every(c=>!c.deg))), gen:song.measures.slice(0,4).every(m=>m.voxes[2].some(c=>c.deg)),
        mix:[song.mixer['vox:1'].inst, song.mixer['vox:2'].inst].join()};
      const one=createSong('vocal',{title:'单旋律',key:'G',beats:2,unit:4,nMea:2,nVox:1,lyr:1}); one.measures.forEach(m=>{ m.voxes[0]=[__V(1,4,{chord:'G'}),__V(5,4)]; }); addDoc(one);
      fillAccompaniment('kids2', false); out.fn=('funcNames' in song)+':'+song.funcNames;
      const mel=createSong('vocal',{nMea:2,nVox:1,lyr:1}); mel.measures.forEach(m=>{ m.voxes[0]=[__V(1,4,{chord:'C'}),__V(3,4),__V(5,4),__V(1,4)]; });
      const t=arrangeAccompaniment(mel,{texId:'slow'}).song, p=arrangeAccompaniment(mel,{texId:'slow',pure:true}).song;
      out.arr=[(t.mixer['vox:0']||{}).inst||'∅', t.mixer['vox:1'].inst, t.mixer['vox:2'].inst, p.mixer['vox:0'].inst, p.mixer['vox:1'].inst].join();
      return out; })()`);
    T(r.tail && /4 小节伴奏/.test(r.tail.msg) && /第 5–8 小节还没有旋律未配/.test(r.tail.msg) && r.tail.rest && r.tail.gen && r.tail.mix === 'strings,piano' && r.fn === 'false:undefined' && r.arr === '∅,piano,piano,piano,piano',
      'F15 8 小节只写了前 4 小节旋律：只配前 4 小节、第 5–8 小节伴奏行留空并提示「写完再配」；单旋律谱填进后和弦显示（级数 / 音名）不变；混音台：调过的右手音色保留、默认人声的左手改钢琴；新窗口产出的伴奏行也是钢琴音色', J(r));
  }

  T(errs.length === 0, '无页面报错', errs.slice(0, 4).join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
