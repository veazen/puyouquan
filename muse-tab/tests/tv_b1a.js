/* v63.6 B1 录入零陷阱（一）（2026-10 评审团 §6.3 B1 ①–⑤：P1-07 / P2-25）
   T1 落音后按 D：延长的是刚落的音（「5 D」得 5/2），不是前进后的空列；光标落到它后面
   T2 录《小星星》8 小节：按键数＝音符数＋增时线数（28+4=32），不需要任何修正键，beatErrors=0
   T3 落音后按 ~：连音线挂在刚落的音上；光标停在空列（休止）时拒绝挂连音线
   T4 落音后点延长号 / 换气 / 演奏法 / 力度：记号标在刚落的音上，不落到空列
   T5 在空列上把时值改长：吸收其后连续休止，小节不溢出
   T6 超拍修复首选「顺延到下一小节」：尾部音挪到下一小节（跨线音拆成连音）；下一小节放不下就退回删减并预览将删的音
   T7 刚落音时按「-」：一次性提示「要写增时线请按 D 键」，降八度语义不变
   突变实证：对 v63.6 之前的文件复跑，T1–T7 全部报红（0/7）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); window.__toasts=[]; const ot=toast; toast=(m)=>{ __toasts.push(String(m)); try{ ot(m); }catch(_){} }; })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const fresh = (n) => pg.evaluate(`(()=>{ loadSong(createSong('vox',{title:'录入',key:'C',beats:4,unit:4,nMea:${n || 4},nVox:1,lyr:1}));
    sel={mi:0,row:'vox',vi:0,ci:0,si:1}; lastEnt=null; noteSel=[]; selRange=null; __toasts.length=0; render();
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); })()`);
  const dump = (n) => pg.evaluate(`song.measures.slice(0,${n || 2}).map(m=>m.voxes[0].map(c=>c.deg+'/'+c.dur+(c.dotted?'.':'')+(c.tie?'~':'')+(c.ferm?'F':'')+(c.breath?'V':'')+(c.artic?'A':'')+(c.dyn?'['+c.dyn+']':'')).join(' ')).join(' | ')`);
  const keys = async ks => { for (const k of ks) await pg.keyboard.press(k); };

  /* T1 */
  await fresh(); await keys(['5', 'd']);
  let r = { m: await dump(1), sel: await pg.evaluate('sel.mi+":"+sel.ci') };
  T(r.m === '5/2 0/4 0/4' && r.sel === '0:1', 'T1 「5 D」得 5/2，光标落到它后面', JSON.stringify(r));

  /* T2 小星星 */
  await fresh(8);
  const seq = '1155665d4433221d5544332d5544332d'.split('');
  await keys(seq);
  r = { m: await dump(8), be: await pg.evaluate('beatErrors().length'), n: seq.length };
  const want = '1/4 1/4 5/4 5/4 | 6/4 6/4 5/2 | 4/4 4/4 3/4 3/4 | 2/4 2/4 1/2 | 5/4 5/4 4/4 4/4 | 3/4 3/4 2/2 | 5/4 5/4 4/4 4/4 | 3/4 3/4 2/2';
  T(r.m === want && r.be === 0 && r.n === 32, 'T2 录《小星星》8 小节 32 键、零修正键、beatErrors=0', JSON.stringify(r));

  /* T3 连音线 */
  await fresh(); await keys(['3', '~', '3']);
  const t3a = await dump(1);
  await fresh(); await pg.evaluate(`(()=>{ sel={mi:0,row:'vox',vi:0,ci:2,si:1}; lastEnt=null; render(); })()`); await keys(['~']);
  const t3b = { m: await dump(1), msg: await pg.evaluate('__toasts.join("|")') };
  T(t3a === '3/4~ 3/4 0/4 0/4' && t3b.m === '0/4 0/4 0/4 0/4' && /挂在音符上/.test(t3b.msg), 'T3 落音后 ~ 连刚落的音；空列拒挂连音线', JSON.stringify({ t3a, t3b }));

  /* T4 列记号 */
  await fresh(); await keys(['5']);
  await pg.evaluate(`document.getElementById('b-ferm-v').onclick()`);
  await pg.evaluate(`document.getElementById('b-breath').onclick()`);
  await pg.evaluate(`document.getElementById('b-art-acc').onclick()`);
  await pg.evaluate(`(()=>{ showDynMenu(100,100); const b2=document.querySelector('#popmenu [data-dy="mf"]'); if(b2) b2.click(); })()`);
  r = { m: await dump(1), sel: await pg.evaluate('sel.mi+":"+sel.ci') };
  T(r.m === '5/4FVA[mf] 0/4 0/4 0/4' && r.sel === '0:1', 'T4 落音后点延长号/换气/重音/力度都标在刚落的音上', JSON.stringify(r));

  /* T5 空列改长吸收休止 */
  await fresh(); await keys(['5']);
  await keys(['w']);   // 光标在空列：先选二分，再落音（GP 习惯）
  r = { m: await dump(1), be: await pg.evaluate('beatErrors().length') };
  T(r.m === '5/4 0/2 0/4' && r.be === 0, 'T5 空列改成二分音符吸收后面的休止，小节不溢出', JSON.stringify(r));

  /* T6 超拍：顺延首选 */
  r = await pg.evaluate(`(async()=>{ const V=(d,u,o)=>Object.assign({dur:u,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false},o||{});
    localStorage.setItem('musetab-editmode','smart');
    const run=async(first)=>{ const s=createSong('vox',{title:'超拍',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1});
      s.measures[0].voxes[0]=first; loadSong(s); render(); try{ syncInputs(); }catch(_){}
      const sg=suggestFix(0,'vox',0); const btn=document.querySelector('#err-drop .err-fix[data-act="carry"][data-mi="0"]');
      if(btn) btn.click(); await new Promise(r=>setTimeout(r,30));
      return {k:sg&&sg.kind, btn:!!btn, m:song.measures.map(m=>m.voxes[0].map(c=>c.deg+'/'+c.dur+(c.tie?'~':'')).join(' ')).join(' | '), be:beatErrors().length}; };
    const out={};
    out.a=await run([V(1,4),V(2,4),V(3,2),V(4,4)]);     // 5 拍：末尾的 4 整个顺延
    out.b=await run([V(5,4),V(6,2),V(7,2)]);            // 5 拍：7 跨小节线 → 7~ | 7
    /* 下一小节塞满真实音符：不能顺延 → 删减并预览 */
    const s2=createSong('vox',{title:'超拍2',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1});
    s2.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4),V(5,4)]; s2.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    loadSong(s2); const sg2=suggestFix(0,'vox',0); out.k2=sg2&&sg2.kind; out.t2=sg2&&sg2.text; return out; })()`).catch(e => ({ err: e.message }));
  T(!r.err && r.a.k === 'carry' && r.a.btn && r.a.m === '1/4 2/4 3/2 | 4/4 0/4 0/4 0/4' && r.a.be === 0
    && r.b.k === 'carry' && r.b.m === '5/4 6/2 7/4~ | 7/4 0/4 0/4 0/4' && r.b.be === 0
    && r.k2 === 'trim' && /将删掉：5/.test(r.t2 || '') && /不能顺延/.test(r.t2 || ''),
    'T6 超拍首选顺延到下一小节（跨线音拆连音）；放不下时删减并预览', JSON.stringify(r));

  /* T7 「-」提示 */
  await pg.evaluate(`localStorage.removeItem('musetab-hint-dash')`);
  await fresh(); await keys(['5', '-']); await pg.waitForTimeout(30);
  const m1 = await pg.evaluate('__toasts.slice()'); const d1 = await dump(1);
  await keys(['6', '-']); await pg.waitForTimeout(30);
  const m2 = await pg.evaluate('__toasts.slice()'); const d2 = await dump(1);
  T(m1.some(x => /按 D 键/.test(x)) && !m2.slice(m1.length).some(x => /按 D 键/.test(x)) && /^5\/4/.test(d1) && d2.startsWith('5/4 6/4'),
    'T7 落音后按「-」一次性提示增时线用 D 键（降八度语义不变）', JSON.stringify({ m1, d1, d2, oct: await pg.evaluate('song.measures[0].voxes[0][0].oct') }));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
