// tv_chordlab —— 配和弦工作台（v60.20 立项，v60.21 升级为「乐句级换套路 + 每拍逐格编辑」）
// 覆盖：打开/结构、谱面已有和弦优先（多和弦位）、逐拍编辑、调式手动覆盖、应用写回与撤销、取消不写回、
//      套路名显示、乐句级换套路（排序与生效）、窄屏布局；
//      以及最关键的一条——**面板里的分数与引擎实际用的分数同源**（防两份打分实现漂移）：
//      整小节比 emit（Viterbi 用的那行数），子区间比 chordRangeScore（suggestChordPlan 拆半小节用的那把尺子）。
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
  const N = 10;

  // T1 打开与结构：格数=小节数、候选数=候选表大小、乐句行数=A3 切分数、拍位条=本小节拍数
  const t1 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const M=document.getElementById('modal-mask');
    // 宽屏下同一乐句的小节格必须排成一行（v60.21 踩过：来源类名 cl-tpl 与套路条容器类名撞车，
    // 被 flex-basis:100% 拉成每格独占一行——只看断言全绿、只有截图能看出来，故补成几何断言）
    const box=M.querySelector('.cl-cells'), cs=[...box.querySelectorAll('[data-cl-mi]')];
    const oneLine=cs.every(c=>Math.abs(c.getBoundingClientRect().top-cs[0].getBoundingClientRect().top)<2);
    const narrow=cs.every(c=>c.getBoundingClientRect().width < box.getBoundingClientRect().width*0.5);
    return { open:!!M, cells:M.querySelectorAll('[data-cl-mi]').length,
             cands:M.querySelectorAll('[data-cl-pick]').length,
             rows:M.querySelectorAll('.cl-row').length,
             beats:M.querySelectorAll('[data-cl-beat]').length,
             segs:phraseSegments(song,0).length, nCand:CHORD_CANDS.length,
             hasMode:!!document.getElementById('cl-mode'), oneLine, narrow, nInRow:cs.length };
  })()`);
  const ok1 = t1.open && t1.cells === 8 && t1.cands === t1.nCand && t1.rows === t1.segs
    && t1.beats === 4 && t1.hasMode && t1.oneLine && t1.narrow;
  console.log((ok1 ? '✅' : '❌') + ' T1 打开与结构: 格数=' + t1.cells + '/8 候选=' + t1.cands + '/' + t1.nCand
    + ' 乐句行=' + t1.rows + '/' + t1.segs + ' 拍位=' + t1.beats + '/4 调式选择器=' + t1.hasMode
    + ' 首句 ' + t1.nInRow + ' 格排成一行=' + t1.oneLine + ' 每格未被拉满=' + t1.narrow);
  if (ok1) pass++;

  // T2 分数与引擎同源（整小节）：面板首位候选必须是 emit 最高的那个
  //    只对「整小节一个和弦位」的小节成立——被引擎拆成两半的小节，第 0 拍只管前半段，见 T3b。
  const t2 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const r=chordSolve(song,0);
    let bad=0, n=0;
    for(let mi=0; mi<song.measures.length; mi++){
      if(chordLabPos(mi).length!==1) continue;
      chordLab.sel=mi; chordLab.selBeat=0; chordLabRender();
      const first=document.querySelector('[data-cl-pick]').dataset.clPick;
      let bi=0; for(let j=1;j<r.CAND.length;j++) if(r.emit[mi][j]>r.emit[mi][bi]) bi=j;
      n++; if(first!==r.cname(r.CAND[bi])) bad++;
    }
    return {n, bad};
  })()`);
  const ok2 = t2.bad === 0 && t2.n >= 5;
  console.log((ok2 ? '✅' : '❌') + ' T2 分数同源(整小节): 覆盖 ' + t2.n + ' 个小节（需≥5），首位与 emit 最高不符 = '
    + t2.bad + '(期望 0)');
  if (ok2) pass++;

  // T3 子区间分数同源：第 3 拍起的候选排序须等于 chordRangeScore 在 [2,4) 上的排序（引擎拆半小节用的同一函数）
  //    取第 4 小节（4-6-1̇-6）——它整小节口径最高是 F，后半段口径最高是 Am，两把尺子在这里**确实分叉**，
  //    若面板偷懒对所有拍都用 emit，这条会红（选一个不分叉的小节等于没测）。
  const t3 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=3; chordLab.selBeat=2; chordLabRender();
    const first=document.querySelector('[data-cl-pick]').dataset.clPick;
    const r=chordLab.data, cols=song.measures[3].voxes[0];
    let bi=0, bv=-1e9;
    r.CAND.forEach((c,j)=>{ const v=chordRangeScore(c, cols, 2, 4); if(v>bv){ bv=v; bi=j; } });
    const want=r.cname(r.CAND[bi]);
    // 同时确认它确实换了尺子：整小节口径的首位与之不同（否则这条断言等于没测）
    chordLab.selBeat=0; chordLabRender();
    const whole=document.querySelector('[data-cl-pick]').dataset.clPick;
    return { first, want, whole };
  })()`);
  const ok3 = t3.first === t3.want && t3.first !== t3.whole;
  console.log((ok3 ? '✅' : '❌') + ' T3 分数同源(子区间): 第3拍首位=' + t3.first + ' chordRangeScore 最高='
    + t3.want + ' 整小节口径首位=' + t3.whole + '（须不同，否则本例测不出换尺子）');
  if (ok3) pass++;

  // T4 谱面已有和弦优先，且小节内多个和弦位全部读出（v60.20 只读首个）
  const t4 = await pg.evaluate(`(()=>{ ${MEL}
    const s=mk(); s.measures[2].voxes[0][0].chord='Fmaj7'; s.measures[2].voxes[0][2].chord='G7';
    loadSong(s); chordLabOpen();
    const cell=document.querySelector('[data-cl-mi="2"]');
    return { pos:chordLabPos(2), src:chordLabSrc(2), cls:cell.className, txt:cell.textContent };
  })()`);
  const ok4 = t4.pos.length === 2 && t4.pos[0].chord === 'Fmaj7' && t4.pos[0].beat === 0
    && t4.pos[1].chord === 'G7' && t4.pos[1].beat === 2 && t4.src === 'own' && /cl-own/.test(t4.cls);
  console.log((ok4 ? '✅' : '❌') + ' T4 已有和弦优先: 读出 ' + t4.pos.length + ' 个和弦位 '
    + JSON.stringify(t4.pos) + ' 标记=' + t4.src);
  if (ok4) pass++;

  // T5 每拍逐格编辑：给第 4 小节第 3 拍单独指定一个和弦 → 应用后该小节写出两个和弦（第 1 列 + 第 3 列）
  const t5 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=3; chordLab.selBeat=2; chordLabRender();
    const cur=chordLabAt(3,2);
    const alt=[...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==cur);
    alt.click();
    const picked=alt.dataset.clPick, nPos=chordLabPos(3).length;
    document.getElementById('cl-ok').click();
    const m4=(song.measures[3].voxes[0]||[]).map(c=>c.chord||'');
    const wrote=song.measures.filter(m=>(m.voxes[0]||[]).some(c=>c.chord)).length;
    undo();
    const undone=song.measures.every(m=>!(m.voxes[0]||[]).some(c=>c.chord));
    return { cur, picked, nPos, m4, wrote, undone, closed:!document.getElementById('modal-mask') };
  })()`);
  const ok5 = t5.m4[2] === t5.picked && t5.m4[0] && t5.nPos >= 2 && t5.picked !== t5.cur
    && t5.closed && t5.wrote === 8 && t5.undone;
  console.log((ok5 ? '✅' : '❌') + ' T5 逐拍编辑: 第4小节第3拍 ' + t5.cur + '→' + t5.picked
    + ' 该小节和弦列=' + JSON.stringify(t5.m4) + ' 写入=' + t5.wrote + '/8 撤销后清空=' + t5.undone);
  if (ok5) pass++;

  // T6 乐句级换套路：排序与引擎同源（引擎命中的那条套路必须排第一），点选后整句改写并在行首标出
  const t6 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const marks=chordLab.data.marks.filter(m=>!m.reuse);
    let rankBad=0;
    marks.forEach(m=>{ const rk=chordLabTplRank(m.a,m.b); if(!rk.length || rk[0].id!==m.tpl) rankBad++; });
    // 换套路：取第 1 乐句的第 2 候选（非当前最优），点下去看整句是否改写
    const [a,bb]=chordLab.data.segs[0];
    document.querySelector('[data-cl-seg="0"]').click();
    const chips=[...document.querySelectorAll('[data-cl-tpl]')].filter(c=>c.dataset.clTpl!=='free');
    const want=chordLabTplRank(a,bb)[1];
    const chip=chips.find(c=>c.dataset.clTpl===want.id);
    chip.click();
    let n=0; for(let mi=a; mi<=bb; mi++) if(chordLab.picks[mi]) n++;
    const lab=document.querySelector('[data-cl-seg="0"] em').textContent;
    return { nMark:marks.length, rankBad, span:bb-a+1, edited:n, want:want.name, lab };
  })()`);
  const ok6 = t6.nMark >= 1 && t6.rankBad === 0 && t6.edited === t6.span && t6.lab.indexOf(t6.want) === 0;
  console.log((ok6 ? '✅' : '❌') + ' T6 换套路: 引擎命中 ' + t6.nMark + ' 处，排序不一致=' + t6.rankBad
    + '(期望 0) 换成「' + t6.want + '」后整句改写 ' + t6.edited + '/' + t6.span + ' 行首标签=' + t6.lab.trim());
  if (ok6) pass++;

  // T7 换套路可退回：点「自由解」清掉该乐句的手改，恢复引擎解
  const t7 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const [a,bb]=chordLab.data.segs[0];
    const before=[]; for(let mi=a; mi<=bb; mi++) before.push(chordLabAt(mi,0));
    document.querySelector('[data-cl-seg="0"]').click();
    const rk=chordLabTplRank(a,bb)[1];
    document.querySelector('[data-cl-tpl="'+rk.id+'"]').click();
    const mid=[]; for(let mi=a; mi<=bb; mi++) mid.push(chordLabAt(mi,0));
    document.querySelector('[data-cl-seg="0"]').click();
    document.querySelector('[data-cl-tpl="free"]').click();
    const after=[]; for(let mi=a; mi<=bb; mi++) after.push(chordLabAt(mi,0));
    let left=0; for(let mi=a; mi<=bb; mi++) if(chordLab.picks[mi]) left++;
    return { before, mid, after, left };
  })()`);
  const ok7 = t7.after.join() === t7.before.join() && t7.mid.join() !== t7.before.join() && t7.left === 0;
  console.log((ok7 ? '✅' : '❌') + ' T7 退回自由解: 原=' + t7.before.join('-') + ' 换后=' + t7.mid.join('-')
    + ' 退回=' + t7.after.join('-') + ' 残留手改=' + t7.left);
  if (ok7) pass++;

  // T8 调式手动覆盖：同一段大调旋律强制小调 → 和弦集合切到小调候选，且写回时记住 song.mode
  const t8 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const auto=chordLab.data.minor;
    const sel=document.getElementById('cl-mode'); sel.value='minor'; sel.onchange();
    const forced=chordLab.data.minor;
    const names=song.measures.map((m,mi)=>chordLabAt(mi,0));
    document.getElementById('cl-ok').click();
    return { auto, forced, mode:song.mode||'(未设)', hasMinorChord:names.some(n=>/m$/.test(n)) };
  })()`);
  const ok8 = t8.auto === false && t8.forced === true && t8.mode === 'minor' && t8.hasMinorChord;
  console.log((ok8 ? '✅' : '❌') + ' T8 调式覆盖: 自动判别=' + t8.auto + ' 强制后=' + t8.forced
    + ' 写回 song.mode=' + t8.mode + ' 出现小调和弦=' + t8.hasMinorChord);
  if (ok8) pass++;

  // T9 取消不写回
  const t9 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=1; chordLab.selBeat=0; chordLabRender();
    [...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==chordLabAt(1,0)).click();
    document.getElementById('cl-cancel').click();
    const any=song.measures.some(m=>(m.voxes[0]||[]).some(c=>c.chord));
    return { any, closed:!document.getElementById('modal-mask'), labNull:chordLab===null };
  })()`);
  const ok9 = !t9.any && t9.closed && t9.labNull;
  console.log((ok9 ? '✅' : '❌') + ' T9 取消不写回: 谱面有和弦=' + t9.any + '(期望 false) 弹窗关闭=' + t9.closed);
  if (ok9) pass++;

  // T10 套路名显示：大调套路转成国内习惯的数字级数，小调保留罗马数字
  const t10 = await pg.evaluate(`(()=>({
    a: progLabel('I-V-IV-vi'), b: progLabel('1-5-6-4'), c: progLabel('i-♭VII-♭VI-♭VII')
  }))()`);
  const ok10 = t10.a === '1-5-4-6m' && t10.b === '1-5-6-4' && t10.c === 'i-♭VII-♭VI-♭VII';
  console.log((ok10 ? '✅' : '❌') + ' T10 套路名显示: I-V-IV-vi→' + t10.a + ' 已是数字的不动=' + t10.b
    + ' 小调保留=' + t10.c);
  if (ok10) pass++;

  // T11 窄屏（360×740）：不出现横向溢出、触控目标 ≥44px、乐句标签占满整行
  const pm = await b.newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  pm.on('pageerror', e => errs.push('PAGEERR(m):' + e.message));
  await pm.goto(F); await pm.waitForTimeout(800);
  await pm.evaluate(() => { window.guardReplace = (p) => p(); });
  const t11 = await pm.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const M=document.getElementById('modal-mask');
    const h=el=>el.getBoundingClientRect().height;
    const cells=[...M.querySelectorAll('[data-cl-mi]')], beats=[...M.querySelectorAll('[data-cl-beat]')];
    const lab=M.querySelector('.cl-lab'), row=M.querySelector('.cl-row');
    const ok=document.getElementById('cl-ok').getBoundingClientRect();
    return { okVisible: ok.top>=0 && ok.bottom<=window.innerHeight+1,
             overflow: document.documentElement.scrollWidth - window.innerWidth,
             minCell: Math.min.apply(null, cells.map(h)),
             minBeat: Math.min.apply(null, beats.map(h)),
             labFull: Math.abs(lab.getBoundingClientRect().width - row.getBoundingClientRect().width) < 2,
             fnHidden: getComputedStyle(M.querySelector('.cl-cand .cl-fn')).display==='none',
             okWide: M.getBoundingClientRect().width <= 360 };
  })()`);
  const ok11 = t11.overflow <= 0 && t11.minCell >= 44 && t11.minBeat >= 44 && t11.labFull
    && t11.fnHidden && t11.okWide && t11.okVisible;
  console.log((ok11 ? '✅' : '❌') + ' T11 窄屏布局: 横向溢出=' + t11.overflow + 'px(期望≤0) 最小小节格='
    + t11.minCell + 'px 最小拍位格=' + t11.minBeat + 'px 乐句标签整行=' + t11.labFull
    + ' 功能列隐藏=' + t11.fnHidden + ' 主按钮首屏可见=' + t11.okVisible);
  if (ok11) pass++;
  await pm.close();

  console.log('PASS ' + pass + '/' + (N + 1));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === N + 1 && !errs.length ? 0 : 1);
})();
