// tv_chordlab —— v60.20 配和弦工作台
// 覆盖：打开/结构、谱面已有和弦优先、逐格改和弦、调式手动覆盖、应用写回与撤销、取消不写回、
//      以及最关键的一条——**面板里的分数与引擎实际用的分数同源**（防两份打分实现漂移）。
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

const MEL = `
  const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
  const rows=[[V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
              [V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1})],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],
              [V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
              [V(4,4),V(6,4),V(1,4,{oct:1}),V(4,4)],[V(1,4),V(1,4),V(1,2)]];
  const mk=()=>{ const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:8});
    rows.forEach((r,i)=> s.measures[i].voxes[0]=r.map(c=>Object.assign({},c))); return s; };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/sounds|CORS|Failed to load|TUNNEL/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  await pg.goto(F); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0;

  // T1 打开与结构：格数=小节数、候选数=候选表大小、乐句行数=A3 切分数
  const t1 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const M=document.getElementById('modal-mask');
    return { open:!!M, cells:M.querySelectorAll('[data-cl-mi]').length,
             cands:M.querySelectorAll('[data-cl-pick]').length,
             rows:M.querySelectorAll('.cl-row').length,
             segs:phraseSegments(song,0).length, nCand:CHORD_CANDS.length,
             hasMode:!!document.getElementById('cl-mode') };
  })()`);
  const ok1 = t1.open && t1.cells === 8 && t1.cands === t1.nCand && t1.rows === t1.segs && t1.hasMode;
  console.log((ok1 ? '✅' : '❌') + ' T1 打开与结构: 格数=' + t1.cells + '/8 候选=' + t1.cands + '/' + t1.nCand
    + ' 乐句行=' + t1.rows + '/' + t1.segs + ' 调式选择器=' + t1.hasMode);
  if (ok1) pass++;

  // T2 分数与引擎同源：面板首位候选必须是 emit 最高的那个（不另写打分实现）
  const t2 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const r=chordSolve(song,0);
    let bad=0, n=0;
    for(let mi=0; mi<song.measures.length; mi++){
      chordLab.sel=mi; chordLabRender();
      const first=document.querySelector('[data-cl-pick]').dataset.clPick;
      let bi=0; for(let j=1;j<r.CAND.length;j++) if(r.emit[mi][j]>r.emit[mi][bi]) bi=j;
      n++; if(first!==r.cname(r.CAND[bi])) bad++;
    }
    return {n, bad};
  })()`);
  const ok2 = t2.bad === 0 && t2.n === 8;
  console.log((ok2 ? '✅' : '❌') + ' T2 分数同源: ' + t2.n + ' 个小节里首位候选与 emit 最高不符 = ' + t2.bad + '(期望 0)');
  if (ok2) pass++;

  // T3 谱面已有和弦优先，且标记为「谱面已有」而非自动
  const t3 = await pg.evaluate(`(()=>{ ${MEL}
    const s=mk(); s.measures[2].voxes[0][0].chord='Fmaj7'; loadSong(s); chordLabOpen();
    const cell=document.querySelector('[data-cl-mi="2"]');
    return { cur:chordLabCur(2), src:chordLabSrc(2), cls:cell.className };
  })()`);
  const ok3 = t3.cur === 'Fmaj7' && t3.src === 'own' && /cl-own/.test(t3.cls);
  console.log((ok3 ? '✅' : '❌') + ' T3 已有和弦优先: 面板显示=' + t3.cur + '(期望 Fmaj7) 标记=' + t3.src);
  if (ok3) pass++;

  // T4 逐格改和弦 + 应用写回 + 可一步撤销
  const t4 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=3; chordLabRender();
    const before=chordLabCur(3);
    const alt=[...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==before);
    alt.click();
    const picked=alt.dataset.clPick;
    document.getElementById('cl-ok').click();
    const got=song.measures.map(m=>{ const c=(m.voxes[0]||[]).find(x=>x.chord); return c? c.chord : '-'; });
    undo();
    const after=song.measures.map(m=>{ const c=(m.voxes[0]||[]).find(x=>x.chord); return c? c.chord : '-'; });
    return { before, picked, m4:got[3], closed:!document.getElementById('modal-mask'),
             wrote:got.filter(x=>x!=='-').length, undone:after.every(x=>x==='-') };
  })()`);
  const ok4 = t4.m4 === t4.picked && t4.picked !== t4.before && t4.closed && t4.wrote === 8 && t4.undone;
  console.log((ok4 ? '✅' : '❌') + ' T4 改+应用+撤销: 第4小节 ' + t4.before + '→' + t4.picked
    + ' 写入=' + t4.wrote + '/8 弹窗关闭=' + t4.closed + ' 撤销后清空=' + t4.undone);
  if (ok4) pass++;

  // T5 调式手动覆盖：同一段大调旋律强制小调 → 和弦集合切到小调候选，且写回时记住 song.mode
  const t5 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const auto=chordLab.data.minor;
    const sel=document.getElementById('cl-mode'); sel.value='minor'; sel.onchange();
    const forced=chordLab.data.minor;
    const names=song.measures.map((m,mi)=>chordLabCur(mi));
    document.getElementById('cl-ok').click();
    return { auto, forced, mode:song.mode||'(未设)', hasMinorChord:names.some(n=>/m$/.test(n)) };
  })()`);
  const ok5 = t5.auto === false && t5.forced === true && t5.mode === 'minor' && t5.hasMinorChord;
  console.log((ok5 ? '✅' : '❌') + ' T5 调式覆盖: 自动判别=' + t5.auto + ' 强制后=' + t5.forced
    + ' 写回 song.mode=' + t5.mode + ' 出现小调和弦=' + t5.hasMinorChord);
  if (ok5) pass++;

  // T6 取消不写回
  const t6 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=1; chordLabRender();
    [...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==chordLabCur(1)).click();
    document.getElementById('cl-cancel').click();
    const any=song.measures.some(m=>(m.voxes[0]||[]).some(c=>c.chord));
    return { any, closed:!document.getElementById('modal-mask'), labNull:chordLab===null };
  })()`);
  const ok6 = !t6.any && t6.closed && t6.labNull;
  console.log((ok6 ? '✅' : '❌') + ' T6 取消不写回: 谱面有和弦=' + t6.any + '(期望 false) 弹窗关闭=' + t6.closed);
  if (ok6) pass++;

  // T7 套路名显示：大调套路转成国内习惯的数字级数，小调保留罗马数字
  const t7 = await pg.evaluate(`(()=>({
    a: progLabel('I-V-IV-vi'), b: progLabel('1-5-6-4'), c: progLabel('i-♭VII-♭VI-♭VII')
  }))()`);
  const ok7 = t7.a === '1-5-4-6m' && t7.b === '1-5-6-4' && t7.c === 'i-♭VII-♭VI-♭VII';
  console.log((ok7 ? '✅' : '❌') + ' T7 套路名显示: I-V-IV-vi→' + t7.a + ' 已是数字的不动=' + t7.b + ' 小调保留=' + t7.c);
  if (ok7) pass++;

  console.log('PASS ' + pass + '/7');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === 7 && !errs.length ? 0 : 1);
})();
