/* v60.62 指板 / 钢琴全键盘输入面板（产品指示「音符输入方式支持吉他指板和钢琴键盘，
   设计一比一的指板和钢琴全键盘，同时曲谱播放时，吉他指板和钢琴键盘会动态跟随，
   输入方式功能归入到创作辅助栏，同时对应的每个音轨也可以调出对应键盘和指板」）。
   T1 指板一比一：品距 d(n)=L·(1−2^(−n/12)) —— 12 品正在有效弦长一半、品距单调递减、
      相邻品距之比恒为 2^(1/12)（这是真琴的物理定律，不是「平均分格」）
   T2 钢琴一比一：88 键 A0(21)–C8(108)、52 白 36 黑、白/黑宽比＝13.7/23.5、长比＝95/145
   T3 黑键横向位置用真实约束（同组白键露头等宽）：C♯ 偏左、G♯ 居中、A♯ 偏右
   T4 点板落音：指板点「3弦5品」落进当前列；键盘点 C4 在简谱轨落中音 1
   T5 播放跟随：板的时间线跟的是**板所在那条轨**（不是光标那条参考轨），boardTick 逐列推进高亮
   T6 随轨切换：吉他轨→指板、简谱轨→键盘；带变调夹的轨高亮音高含夹位（发声=定弦+品+夹）
   T7 停播回落到光标列、收起后清空高亮
   T8 两块板共用同一把 毫米→像素 尺度：指板与键盘之间也是一比一
   T9 面板内不出滚动条（v60.70 改口径）：钢琴按面板宽自适应、指板只缩不放保持一比一。
      原为「屏幕像素也一比一」＋横向滚动；产品指示不要滚动条后，让出的只是绝对物理尺寸，
      内部几何比例（T1/T2/T8）分毫未变
   T10 三个入口：创作辅助栏（全局）+ 吉他轨 + 旋律轨，开着时齐亮
   T11 编辑/演奏双模式：演奏模式点板只试听不改谱
   T12 创作辅助行两列铺排，无溢出无截断（v60.62 加进第三项后曾撑破卡片）
   对 v60.61 旧文件跑：T1–T10 全红（BOARD 未定义）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const HELP = `
    window.__tc=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
    /* 单吉他轨 + 单简谱轨的最小谱，光标落在吉他轨第 0 列 */
    window.__mk=()=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0}));
      sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render();
      if(typeof BOARD!=='undefined' && BOARD.on) closeBoard();
      return song;
    };
    /* 板上竖线（品丝）的 x：x1≈x2 才算竖线，去重升序 */
    window.__fretXs=()=>{
      const ls=[...document.querySelectorAll('#bp-body line')].filter(l=>
        Math.abs((+l.getAttribute('x1'))-(+l.getAttribute('x2')))<0.3);
      return [...new Set(ls.map(l=>+(+l.getAttribute('x1')).toFixed(1)))].sort((a,c)=>a-c);
    };
    window.__keyRects=()=>[...document.querySelectorAll('#bp-body rect')].filter(r=>r.getAttribute('data-bkm')===null);
    window.__hitX=m=>{ const e=[...document.querySelectorAll('[data-bkm]')].find(x=>+x.dataset.bkm===m);
      return e? {x:+e.getAttribute('x'), w:+e.getAttribute('width')} : null; };
  `;

  // T1 指板一比一：十二平均律品距
  let r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard();
    const xs=__fretXs();
    const gaps=xs.slice(1).map((x,i)=>x-xs[i]);
    const mono=gaps.every((g,i)=>i===0 || g<=gaps[i-1]+0.02);
    /* 逐品对物理公式 d(n)=L·(1−2^(−n/12)) 求偏差——比「相邻品距之比」稳：
       SVG 坐标只保留一位小数，尾部品距仅约 12px，比值会把 0.1 的取整放大到 1.6%，
       而绝对位置的取整误差恒 ≤0.05，是真正能验「一比一」的量。 */
    const L=648*1.28;                               // 648mm 有效弦长 × 共用尺度
    const devs=xs.map((x,n)=>Math.abs((x-xs[0]) - L*(1-Math.pow(2,-n/12))));
    const devMax=Math.max(...devs);
    /* 12 品正在有效弦长的一半 */
    const half=xs.length>12? (xs[12]-xs[0])/L : null;
    return {kind:BOARD.kind, n:xs.length, mono, devMax:+devMax.toFixed(3),
      half: half!=null? +half.toFixed(4) : null, g1:+gaps[0].toFixed(2), gLast:+gaps[gaps.length-1].toFixed(2)};
  })()`);
  T(r.kind === 'fret' && r.n === 23 && r.mono && r.devMax < 0.06 && Math.abs(r.half - 0.5) < 0.002,
    'T1 指板一比一：每一品都落在 L·(1−2^(−n/12)) 上、单调收窄、12 品在弦长一半', JSON.stringify(r));

  // T2 钢琴 88 键与真实键宽比例
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard('key');
    const hits=[...document.querySelectorAll('[data-bkm]')];
    const ms=hits.map(x=>+x.dataset.bkm);
    const rects=__keyRects();
    const whites=rects.filter(x=>x.getAttribute('height')&&+x.getAttribute('height')>0
      && x.getAttribute('fill')!=='var(--ink)');
    const blacks=rects.filter(x=>x.getAttribute('fill')==='var(--ink)');
    const w0=whites[0], b0=blacks[0];
    const wW=+w0.getAttribute('width')+1, bW=+b0.getAttribute('width');
    const wL=+w0.getAttribute('height'), bL=+b0.getAttribute('height');
    return {kind:BOARD.kind, nKeys:hits.length, nWhite:whites.length, nBlack:blacks.length,
      lo:Math.min(...ms), hi:Math.max(...ms),
      wRatio:+(bW/wW).toFixed(3), want_w:+(13.7/23.5).toFixed(3),
      lRatio:+(bL/wL).toFixed(3), want_l:+(95/145).toFixed(3)};
  })()`);
  T(r.kind === 'key' && r.nKeys === 88 && r.nBlack === 36 && r.lo === 21 && r.hi === 108
    && Math.abs(r.wRatio - r.want_w) < 0.01 && Math.abs(r.lRatio - r.want_l) < 0.01,
    'T2 钢琴一比一：88 键 A0–C8、36 黑键、白/黑宽比 13.7:23.5、长比 95:145', JSON.stringify(r));

  // T3 黑键真实横向位置：C♯ 偏左 / G♯ 居中 / A♯ 偏右
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard('key');
    const c4=__hitX(60), cs=__hitX(61), gs=__hitX(68), as=__hitX(70);
    const g4=__hitX(67), a4=__hitX(69);
    const wW=c4.w+1;
    /* 黑键中心相对「左边那个白键右边界」的偏移：负=偏左、0=居中、正=偏右 */
    const off=(bk, leftWhite)=>+((bk.x+bk.w/2)-(leftWhite.x+wW)).toFixed(2);
    const oCs=off(cs,c4), oGs=off(gs,g4), oAs=off(as,a4);
    /* 同组白键露头等宽：C-D-E 三键跨度内 3 个露头 + 2 黑键 */
    const d4=__hitX(62), e4=__hitX(64);
    const topC = cs.x - c4.x;                       // C 的露头宽
    const topD = as.x!=null? (__hitX(63).x - (cs.x+cs.w)) : null;   // D 的露头宽
    return {oCs, oGs, oAs, topC:+topC.toFixed(2), topD:+topD.toFixed(2)};
  })()`);
  T(r.oCs < -1.5 && Math.abs(r.oGs) < 0.6 && r.oAs > 1.5 && Math.abs(r.topC - r.topD) < 0.4,
    'T3 黑键真实位置：C♯ 偏左 / G♯ 居中 / A♯ 偏右，同组白键露头等宽', JSON.stringify(r));

  // T4 点板落音（指板 + 键盘）
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard();
    const hit=document.querySelector('[data-bfs="3:5"]');
    hit.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const tabNotes=JSON.stringify(song.measures[0].tabs[0][0].notes);
    /* 切到简谱轨，键盘点 C4（MIDI 60）应落中音 1 */
    sel={mi:0,row:'vox',vi:0,ci:0,si:3}; syncInputs();
    const kindNow=BOARD.kind;
    const k=[...document.querySelectorAll('[data-bkm]')].find(x=>+x.dataset.bkm===60);
    k.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const c=song.measures[0].voxes[0][0];
    return {tabNotes, kindNow, deg:c.deg, oct:c.oct||0, acc:c.acc||''};
  })()`);
  T(r.tabNotes === '[{"s":3,"f":5}]' && r.kindNow === 'key' && r.deg === 1 && r.oct === 0 && r.acc === '',
    'T4 点板落音：指板 3弦5品 落进当前列，键盘 C4 在简谱轨落中音 1', JSON.stringify(r));

  // T5 播放跟随：时间线跟板所在那条轨（不是光标参考轨）
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); addVoice('tab');
    song.tabVoices[0]='伴奏'; song.tabVoices[1]='主音';
    /* 轨0 两列、轨1 四列——若时间线跟错轨，列数立刻露馅 */
    song.measures[0].tabs[0]=[__tc({dur:2,notes:[{s:5,f:3}]}),__tc({dur:2,notes:[{s:5,f:5}]})];
    song.measures[0].tabs[1]=[__tc({notes:[{s:1,f:3}]}),__tc({notes:[{s:1,f:5}]}),
      __tc({notes:[{s:2,f:3}]}),__tc({notes:[{s:2,f:5}]})];
    sel={mi:0,row:'tab',vi:1,ci:0,si:1}; render(); openBoard();
    play();
    const n=(audio.bEvents||[]).length;
    const hl0=JSON.stringify(BOARD.hl);
    boardTick(audio.bEvents[2].tm+0.001);          // 推到第 3 列
    const hl2=JSON.stringify(BOARD.hl), idx=audio.bIdx;
    stopPlay();
    return {n, hl0, hl2, idx};
  })()`);
  T(r.n === 4 && r.idx === 3
    && r.hl0.indexOf('"s":1') >= 0 && r.hl0.indexOf('"f":3') >= 0
    && r.hl2.indexOf('"s":2') >= 0 && r.hl2.indexOf('"f":3') >= 0,
    'T5 播放跟随：时间线取板所在轨的列（4 列非 2 列），逐列推进高亮', JSON.stringify(r));

  // T6 随轨切换 + 夹位参与高亮音高
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); addVoice('tab');
    song.capo=0; song.tabCapos=[]; song.tabCapos[1]=5;      // 轨1 夹 5 品
    song.measures[0].tabs[1][0].notes=[{s:3,f:0}];
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render(); openBoard();
    const k0=BOARD.kind, t0=document.getElementById('bp-title').textContent;
    sel.vi=1; syncInputs();
    const hlCapo=BOARD.hl.map(h=>h.m);                       // 3弦空弦 + 夹5
    const open3=tuningOf()[2];
    sel={mi:0,row:'vox',vi:0,ci:0,si:3}; syncInputs();
    const k1=BOARD.kind, t1=document.getElementById('bp-title').textContent, row1=BOARD.row;
    return {k0, t0, hlCapo, open3, k1, t1, row1};
  })()`);
  T(r.k0 === 'fret' && r.t0 === '吉他指板' && r.hlCapo.length === 1 && r.hlCapo[0] === r.open3 + 5
    && r.k1 === 'key' && r.t1 === '钢琴键盘' && r.row1 === 'vox',
    'T6 随轨切换：吉他轨→指板 / 简谱轨→键盘；夹位参与高亮音高（定弦+品+夹）', JSON.stringify(r));

  // T7 停播回落光标列 + 收起清空
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    song.measures[0].tabs[0]=[__tc({notes:[{s:6,f:3}]}),__tc({notes:[{s:5,f:2}]}),
      __tc({notes:[{s:4,f:0}]}),__tc({notes:[{s:3,f:2}]})];
    sel={mi:0,row:'tab',vi:0,ci:0,si:6}; render(); openBoard();
    play(); boardTick(audio.bEvents[3].tm+0.001);
    const during=JSON.stringify(BOARD.hl);
    stopPlay();
    const after=JSON.stringify(BOARD.hl), cleared=(audio.bEvents||[]).length;
    closeBoard();
    const off=BOARD.on, nHl=BOARD.hl.length,
      paneOn=document.getElementById('board-pane').classList.contains('on');
    return {during, after, cleared, off, nHl, paneOn};
  })()`);
  T(r.during.indexOf('"s":3') >= 0 && r.after.indexOf('"s":6') >= 0 && r.cleared === 0
    && r.off === false && r.nHl === 0 && r.paneOn === false,
    'T7 停播回落到光标所在列、收起后板关闭且高亮清空', JSON.stringify(r));

  // T8 两块板共用同一把尺子：指板与键盘之间也是一比一（切板时物理尺度不跳）
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard();
    const xs=__fretXs();
    const L=2*(xs[12]-xs[0]);                       // 12 品在一半处 → 反推有效弦长（像素）
    openBoard('key');
    const c4=__hitX(60), d4=__hitX(62);
    const wW=d4.x-c4.x;                             // 白键宽（像素）
    /* 像素之比 应等于 毫米之比：648mm 弦长 ÷ 23.5mm 白键宽 */
    const got=L/wW, want=648/23.5;
    return {L:+L.toFixed(1), wW:+wW.toFixed(2), got:+got.toFixed(3), want:+want.toFixed(3),
      mmFret:+(L/648).toFixed(4), mmKey:+(wW/23.5).toFixed(4)};
  })()`);
  T(Math.abs(r.got - r.want) / r.want < 0.005 && Math.abs(r.mmFret - r.mmKey) < 0.004,
    'T8 两块板共用同一把尺子：像素比＝毫米比（648mm 弦长 : 23.5mm 白键宽）', JSON.stringify(r));

  // T9 面板内不出滚动条：钢琴按面板宽自适应、指板保持一比一原生尺寸
  //    v60.62 原本钉的是「屏幕像素也一比一」（两块板都不被压缩，靠横向滚动容纳 88 键）。
  //    v60.70 产品指示「钢琴键盘宽度跟弹窗宽度匹配，不使用滚动条」——绝对物理尺寸让位于
  //    贴合面板；**内部几何比例分毫未变**（品距定律 T1 / 键宽长比 T2 / 毫米比 T8 都在 SVG
  //    坐标里，照旧成立）。指板原生 651px 放得下，只缩不放，仍是一比一。
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); openBoard('key');
    const body=document.getElementById('bp-body');
    const svgK=document.querySelector('#bp-body svg');
    const rK=svgK.getBoundingClientRect();
    const key={ intrinsic:+svgK.getAttribute('width'), rend:+rK.width.toFixed(1),
      scale:+(rK.width/(+svgK.getAttribute('width'))).toFixed(3),
      scrollW:body.scrollWidth, clientW:body.clientWidth,
      fits: rK.width <= body.clientWidth + 1 };
    openBoard();
    const svgF=document.querySelector('#bp-body svg');
    const rF=svgF.getBoundingClientRect();
    const fret={ intrinsic:+svgF.getAttribute('width'), rend:+rF.width.toFixed(1),
      scale:+(rF.width/(+svgF.getAttribute('width'))).toFixed(3),
      scrollW:body.scrollWidth, clientW:body.clientWidth };
    return {key, fret};
  })()`);
  T(r.key.fits && r.key.scrollW <= r.key.clientW + 1 && r.key.scale < 1
    && r.fret.scrollW <= r.fret.clientW + 1 && Math.abs(r.fret.scale - 1) < 0.01,
    'T9 面板不出滚动条：钢琴缩到贴合面板宽，指板只缩不放（仍是一比一原生尺寸）', JSON.stringify(r));

  // T10 三个入口：创作辅助栏（全局）+ 吉他轨 + 旋律轨，且开着时都点亮
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    const lit=()=>['rt-board','b-trkboard','nl-voxboard']
      .map(id=>{const b2=document.getElementById(id); return b2? (b2.classList.contains('on')?1:0) : -1;});
    const exist=lit().map(x=>x>=0);
    const off0=lit();
    document.getElementById('rt-board').click();          // 创作辅助栏入口：开
    const on1=lit(), k1=BOARD.kind;
    document.getElementById('rt-board').click();          // 再点：收起
    const off1=lit(), open1=BOARD.on;
    document.getElementById('b-trkboard').click();        // 吉他轨入口
    const k2=BOARD.kind, on2=BOARD.on;
    closeBoard();
    sel={mi:0,row:'vox',vi:0,ci:0,si:3}; render();
    document.getElementById('nl-voxboard').click();       // 旋律轨入口
    const k3=BOARD.kind, on3=BOARD.on, row3=BOARD.row;
    closeBoard();
    return {exist, off0, on1, k1, off1, open1, k2, on2, k3, on3, row3};
  })()`);
  T(r.exist.every(Boolean) && r.off0.join() === '0,0,0' && r.on1.join() === '1,1,1'
    && r.k1 === 'fret' && r.off1.join() === '0,0,0' && r.open1 === false
    && r.k2 === 'fret' && r.on2 === true && r.k3 === 'key' && r.on3 === true && r.row3 === 'vox',
    'T10 三个入口都在（创作辅助栏 / 吉他轨 / 旋律轨），开着时齐亮、再点收起', JSON.stringify(r));

  // T11 编辑 / 演奏 双模式（v60.70 产品指示）
  r = await pg.evaluate(HELP + `(()=>{
    __mk(); sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render(); openBoard();
    const seg=[...document.querySelectorAll('#bp-mode [data-bm]')].map(x=>x.dataset.bm);
    const defOn=document.querySelector('#bp-mode [data-bm="edit"]').classList.contains('on');
    /* 演奏模式：点板只试听不写谱 */
    document.querySelector('#bp-mode [data-bm="play"]').click();
    const before=JSON.stringify(song.measures[0].tabs[0][0].notes);
    document.querySelector('[data-bfs="3:5"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const afterPlay=JSON.stringify(song.measures[0].tabs[0][0].notes);
    const hlPlay=JSON.stringify(BOARD.hl);
    /* 编辑模式：照旧写谱 */
    document.querySelector('#bp-mode [data-bm="edit"]').click();
    document.querySelector('[data-bfs="3:5"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const afterEdit=JSON.stringify(song.measures[0].tabs[0][0].notes);
    return {seg, defOn, before, afterPlay, afterEdit, hlPlay, mode:BOARD.mode};
  })()`);
  T(r.seg.join() === 'edit,play' && r.defOn
    && r.afterPlay === r.before && r.afterEdit === '[{"s":3,"f":5}]'
    && r.hlPlay.indexOf('"f":5') >= 0,
    'T11 演奏模式点板只试听不改谱（高亮仍跟手）；编辑模式照旧落音；默认编辑', JSON.stringify(r));

  // T12 创作辅助行不再溢出（v60.62 加进第三项后原 flex 均分撑破卡片）
  r = await pg.evaluate(HELP + `(()=>{
    __mk();
    const host=document.getElementById('ai-tools');
    const hb=host.getBoundingClientRect();
    const items=[...host.querySelectorAll('.aitem')].map(x=>{
      const q=x.getBoundingClientRect();
      const bb=x.querySelector('.ait b'), sm=x.querySelector('.ait small');
      return {id:x.id, w:+q.width.toFixed(1), top:+q.top.toFixed(0),
        overR:+(q.right-hb.right).toFixed(1), overL:+(hb.left-q.left).toFixed(1),
        clipB: bb.scrollWidth>bb.clientWidth+1,
        clipS: sm? sm.scrollWidth>sm.clientWidth+1 : false};
    });
    const rows=[...new Set(items.map(x=>x.top))].length;
    return {items, rows, hostW:+hb.width.toFixed(1)};
  })()`);
  T(r.items.every(x => x.overR <= 0.6 && x.overL <= 0.6)     // 一个都不越界
    && r.items.every(x => !x.clipB && !x.clipS)              // 文案在默认栏宽下不被省略号吃掉
    && r.rows === 2                                          // 两列 + 整宽项 = 两行
    && Math.abs(r.items[2].w - r.hostW) < 1,                 // 指板/键盘独占整行
    'T12 创作辅助行：两列铺排、指板/键盘独占整行，无溢出无截断', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
