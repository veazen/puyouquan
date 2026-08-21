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
  const N = 15;

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

  // T9 取消不写回，且**有改动时先二次确认**（v60.23：误触取消＝整稿蒸发，不可接受）
  const t9 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=1; chordLab.selBeat=0; chordLabRender();
    [...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==chordLabAt(1,0)).click();
    document.getElementById('cl-cancel').click();                 // 第一次：只出确认，不关窗
    const step1={ closed:!document.getElementById('modal-mask'), hasWarn:!!document.querySelector('.cl-warn'),
                  hasKeep:!!document.getElementById('cl-keep') };
    document.getElementById('cl-keep').click();                   // 继续编辑：改动必须还在
    const kept=Object.keys(chordLab.picks).length;
    document.getElementById('cl-cancel').click();
    document.getElementById('cl-cancel').click();                 // 第二次：放弃改动
    const any=song.measures.some(m=>(m.voxes[0]||[]).some(c=>c.chord));
    return { step1, kept, any, closed:!document.getElementById('modal-mask'), labNull:chordLab===null };
  })()`);
  const ok9 = !t9.step1.closed && t9.step1.hasWarn && t9.step1.hasKeep && t9.kept === 1
    && !t9.any && t9.closed && t9.labNull;
  console.log((ok9 ? '✅' : '❌') + ' T9 取消需确认: 首次点取消未关窗=' + !t9.step1.closed
    + ' 出现确认条=' + t9.step1.hasWarn + ' 继续编辑后改动仍在=' + t9.kept
    + ' 放弃后谱面有和弦=' + t9.any + '(期望 false) 弹窗关闭=' + t9.closed);
  if (ok9) pass++;

  // T13 遮罩守卫：有未保存改动时，点弹窗外空白不许关窗（原行为：直接关、一字不写回、chordLab 残留脏全局）
  const t13 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    chordLab.sel=1; chordLab.selBeat=0; chordLabRender();
    [...document.querySelectorAll('[data-cl-pick]')].find(c=>c.dataset.clPick!==chordLabAt(1,0)).click();
    const fire=()=>document.getElementById('modal-mask').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    fire();
    const dirty={ open:!!document.getElementById('modal-mask'), picks:Object.keys(chordLab.picks).length };
    chordLab.picks={};                       // 清干净后，点遮罩应当正常关闭
    fire();
    const clean={ open:!!document.getElementById('modal-mask'), lab:chordLab };
    return { dirty, cleanOpen:clean.open, cleanLab:clean.lab===null, guardCleared:modalGuard===null };
  })()`);
  const ok13 = t13.dirty.open && t13.dirty.picks === 1 && !t13.cleanOpen && t13.cleanLab && t13.guardCleared;
  console.log((ok13 ? '✅' : '❌') + ' T13 遮罩守卫: 有改动时点遮罩仍开着=' + t13.dirty.open
    + ' 改动保留=' + t13.dirty.picks + ' 无改动时点遮罩关闭=' + !t13.cleanOpen
    + ' 关后 chordLab 已清=' + t13.cleanLab + ' 守卫已清=' + t13.guardCleared);
  if (ok13) pass++;

  // T14 重渲保留视图：整窗重建不许把滚动位置与焦点丢掉（32 小节 + 手机 = 第三层原本不可用）
  const t14 = await pg.evaluate(`(()=>{ ${MEL}
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:32});
    for(let i=0;i<32;i++) s.measures[i].voxes[0]=rows[i%8].map(c=>Object.assign({},c));
    loadSong(s); chordLabOpen();
    const sc=document.querySelector('.cl-scroll'); sc.scrollTop=200;
    const before=sc.scrollTop;
    const btn=document.querySelector('[data-cl-beat="1"]'); btn.focus(); btn.click();
    const M=document.getElementById('modal-mask');
    return { before, after:M.querySelector('.cl-scroll').scrollTop,
             inPanel:!!document.activeElement.closest('#modal-mask'),
             role:(document.querySelector('.modal')||{}).getAttribute
                  ? document.querySelector('.modal').getAttribute('role') : null };
  })()`);
  const ok14 = t14.before === 200 && Math.abs(t14.after - t14.before) < 4 && t14.inPanel && t14.role === 'dialog';
  console.log((ok14 ? '✅' : '❌') + ' T14 重渲保留视图: scrollTop ' + t14.before + '→' + t14.after
    + ' 焦点仍在面板内=' + t14.inPanel + ' .modal role=' + t14.role);
  if (ok14) pass++;

  // T15 无音头的拍不许配和弦：placeChordPlan 只能落在有音头的列上，落不下会被丢弃。
  //     原行为：面板照样让你选、照样显示 C·G，应用后和弦没了、还报「已写入 N 个小节」——谎报成功比配错更坏。
  const t15 = await pg.evaluate(`(()=>{ ${MEL}
    const s=mk(); s.measures[3].voxes[0]=[Object.assign({},V(4,1))];   // 整小节一个全音符：只有第 1 拍有音头
    loadSong(s); chordLabOpen();
    chordLab.sel=3; chordLab.selBeat=2; chordLabRender();
    const cell=document.querySelector('[data-cl-beat="2"]');
    const blocked = chordLabSetBeat(3,2,'G')===false;
    const posAfter = chordLabPos(3).length;
    let msg=''; const _t=window.toast; window.toast=(m)=>{ msg=m; };
    chordLabApply(); window.toast=_t;
    const wrote=(song.measures[3].voxes[0]||[]).filter(c=>c.chord).length;
    return { disabled:cell.disabled, dead:/dead/.test(cell.className), blocked, posAfter, wrote, msg };
  })()`);
  const ok15 = t15.disabled && t15.dead && t15.blocked && t15.posAfter === 1 && t15.wrote === 1
    && !/未能落位/.test(t15.msg);
  console.log((ok15 ? '✅' : '❌') + ' T15 无音头拍: 格子禁用=' + t15.disabled + ' 程序化写入被拦=' + t15.blocked
    + ' 该小节和弦位=' + t15.posAfter + ' 实际写入=' + t15.wrote + ' 提示=' + t15.msg);
  if (ok15) pass++;

  // T10 级数显示：大调与**小调都转数字**（v60.24 产品负责人拍板）。
  //     小调级数空间＝简谱写作调号（主音落在 6）：i=6m ♭VII=5 ♭VI=4 V=3（和声小调导音）。
  //     ♭ 前缀有无都要收——13 条手写核心带 ♭、83 条导入的不带，指的是同一个音级。
  const t10 = await pg.evaluate(`(()=>({
    a: progLabel('I-V-IV-vi'), b: progLabel('1-5-6-4'),
    c: progLabel('i-♭VII-♭VI-♭VII', true), d: progLabel('i-VII-VI-III', true),
    e: progLabel('安达卢西亚 i-♭VII-♭VI-V', true), f: progLabel('i-ii0-v-i', true)
  }))()`);
  const ok10 = t10.a === '1-5-4-6m' && t10.b === '1-5-6-4' && t10.c === '6m-5-4-5'
    && t10.d === '6m-5-4-1' && t10.e === '安达卢西亚 6m-5-4-3' && t10.f === '6m-7dim-3m-6m';
  console.log((ok10 ? '✅' : '❌') + ' T10 级数显示: 大调 I-V-IV-vi→' + t10.a + ' 已是数字的不动=' + t10.b
    + '｜小调 带♭→' + t10.c + ' 不带♭→' + t10.d + ' 专名→' + t10.e + ' 减三→' + t10.f);
  if (ok10) pass++;

  // T16 旋转相位不许说假话：progFitSpan 会枚举旋转相位取最优，若标签仍显示模板原名，
  //     chip 上写 1-5-6-4、点下去写入 Am F C G（=6m-4-1-5）——两条不同的进行，名字张冠李戴。
  //     故断言：**每个候选的标签必须能由它自己的 ids 逐格反推出来**（含 rot:true 的条目）。
  const t16 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const [a,bb]=chordLab.data.segs[0], R=chordLab.data;
    const rk=chordLabTplRank(a,bb);
    let bad=0, nRot=0, ex='';
    rk.forEach(t=>{
      const want=t.ids.map(j=>candDeg(R.CAND[j])).join('-');
      const tpl=PROG_TPL.find(x=>x.id===t.id); if(tpl && tpl.rot) nRot++;
      if(t.name!==want){ bad++; if(!ex) ex=t.name+' vs 实际 '+want; }
    });
    // 同时确认样本里**确实有**被旋转的条目，否则这条断言等于没测
    const rotated=rk.filter(t=>{ const tpl=PROG_TPL.find(x=>x.id===t.id);
      return tpl && tpl.rot && t.fam && t.fam!==t.name; }).length;
    return { n:rk.length, bad, nRot, rotated, ex };
  })()`);
  const ok16 = t16.bad === 0 && t16.nRot > 0 && t16.rotated > 0;
  console.log((ok16 ? '✅' : '❌') + ' T16 旋转相位说真话: ' + t16.n + ' 条候选，标签与 ids 不符 = '
    + t16.bad + '(期望 0)' + (t16.ex ? ' 例：' + t16.ex : '')
    + '｜其中可旋转 ' + t16.nRot + ' 条、实际发生旋转 ' + t16.rotated + ' 条（需>0，否则测不出）');
  if (ok16) pass++;

  // T12 分类筛选：风格/情绪下拉收窄候选，且下拉里只出现「这段旋律真配得上」的标签（带条数）
  const t12 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const [a,bb]=chordLab.data.segs[0];
    document.querySelector('[data-cl-seg="0"]').click();
    const all=chordLabTplRank(a,bb);
    const chipIds=()=>[...document.querySelectorAll('[data-cl-tpl]')].map(c=>c.dataset.clTpl).filter(x=>x!=='free');
    const before=chipIds().length;
    const sel=document.getElementById('cl-fsty');
    // 下拉里列出的每个风格都必须真有候选（条数>0），且与 rank 实算一致
    const listed=[...sel.options].slice(1).map(o=>({v:o.value, n:+o.textContent.split(' ').pop()}));
    const cntBad=listed.filter(o=>o.n!==all.filter(t=>t.sty.indexOf(o.v)>=0).length).length;
    sel.value='爵士'; sel.onchange();
    const jazz=chipIds();
    const allJazz=jazz.every(id=>all.find(t=>t.id===id).sty.indexOf('爵士')>=0);
    const nJazz=all.filter(t=>t.sty.indexOf('爵士')>=0).length;
    // 情绪叠加筛选
    const se=document.getElementById('cl-femo');
    const emoOpt=[...se.options].slice(1)[0];
    sel.value=''; sel.onchange();
    se.value=emoOpt.value; se.onchange();
    const byEmo=chipIds();
    const allEmo=byEmo.every(id=>all.find(t=>t.id===id).emo.indexOf(emoOpt.value)>=0);
    // 清空恢复
    se.value=''; se.onchange();
    return { before, listed:listed.length, cntBad, jazzShown:jazz.length, nJazz, allJazz,
             emo:emoOpt.value, byEmo:byEmo.length, allEmo, back:chipIds().length };
  })()`);
  const ok12 = t12.cntBad === 0 && t12.listed >= 3 && t12.allJazz && t12.jazzShown > 0
    && t12.jazzShown <= t12.nJazz && t12.allEmo && t12.byEmo > 0 && t12.back === t12.before;
  console.log((ok12 ? '✅' : '❌') + ' T12 分类筛选: 风格下拉 ' + t12.listed + ' 项（条数错=' + t12.cntBad
    + '）筛「爵士」剩 ' + t12.jazzShown + '/' + t12.nJazz + ' 且全带该标签=' + t12.allJazz
    + ' 情绪「' + t12.emo + '」剩 ' + t12.byEmo + ' 全带=' + t12.allEmo + ' 清空后复原=' + (t12.back === t12.before));
  if (ok12) pass++;

  // T11 窄屏（360×740）：不出现横向溢出、触控目标 ≥44px、乐句标签占满整行
  const pm = await b.newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  pm.on('pageerror', e => errs.push('PAGEERR(m):' + e.message));
  await pm.goto(F); await pm.waitForTimeout(800);
  await pm.evaluate(() => { window.guardReplace = (p) => p(); });
  const t11 = await pm.evaluate(`(()=>{ ${MEL}
    loadSong(mk()); chordLabOpen();
    const h=el=>el.getBoundingClientRect().height;
    document.querySelector('[data-cl-seg="0"]').click();      // 展开套路条，一并量筛选下拉与 chip
    const M=document.getElementById('modal-mask');            // 点击会整体重渲染，M 必须点完再取
    const cells=[...M.querySelectorAll('[data-cl-mi]')], beats=[...M.querySelectorAll('[data-cl-beat]')];
    const taps=[...M.querySelectorAll('.cl-chip,.cl-sel')];
    const lab=M.querySelector('.cl-lab'), row=M.querySelector('.cl-row');
    const ok=document.getElementById('cl-ok').getBoundingClientRect();
    return { minTap: taps.length? Math.min.apply(null, taps.map(h)) : 0, nTap: taps.length,
             okVisible: ok.top>=0 && ok.bottom<=window.innerHeight+1,
             overflow: document.documentElement.scrollWidth - window.innerWidth,
             minCell: Math.min.apply(null, cells.map(h)),
             minBeat: Math.min.apply(null, beats.map(h)),
             labFull: Math.abs(lab.getBoundingClientRect().width - row.getBoundingClientRect().width) < 2,
             fnHidden: getComputedStyle(M.querySelector('.cl-cand .cl-fn')).display==='none',
             okWide: M.getBoundingClientRect().width <= 360 };
  })()`);
  const ok11 = t11.overflow <= 0 && t11.minCell >= 44 && t11.minBeat >= 44 && t11.labFull
    && t11.fnHidden && t11.okWide && t11.okVisible && t11.nTap >= 3 && t11.minTap >= 44;
  console.log((ok11 ? '✅' : '❌') + ' T11 窄屏布局: 横向溢出=' + t11.overflow + 'px(期望≤0) 最小小节格='
    + t11.minCell + 'px 最小拍位格=' + t11.minBeat + 'px 乐句标签整行=' + t11.labFull
    + ' 功能列隐藏=' + t11.fnHidden + ' 主按钮首屏可见=' + t11.okVisible
    + ' 筛选/chip 最小高=' + t11.minTap + 'px×' + t11.nTap + '个');
  if (ok11) pass++;
  await pm.close();

  console.log('PASS ' + pass + '/' + (N + 1));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === N + 1 && !errs.length ? 0 : 1);
})();
