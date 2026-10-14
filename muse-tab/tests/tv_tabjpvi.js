/* v67.2 简谱联排行按音轨开关（负责人：「我只点击了旋律轨映射简谱，结果三个谱都出现映射。」——
   GP 导入的三条 TAB 轨「木吉他 / 键盘1 / 旋律」，左栏「当前音轨：旋律」点亮「简谱」，三条轨上方都出现了联排行）。
   根因：song.tabJp 是整曲布尔，渲染 / 排版 / 纵向度量对全部 TAB 轨生效；面板图标只是切换这个整曲字段。
   实现：新增可选字段 song.tabJpVoices（按 TAB 声部下标的布尔数组）+ 判定函数 tabJpOn(vi) / tabJpAny()；song.tabJp 原名原义保留——
   老谱 tabJp:true 且无 tabJpVoices＝全部 TAB 轨都有联排行（与 v67.1 逐字节相同）；有 tabJpVoices 时 tabJp 是「至少一条轨点亮」的镜像，全关时两个字段一起删。
   T1  面板选轨（截图同款：最左音轨钮点「旋律」→ 左栏「当前音轨：旋律」→ 点「简谱」）→ 只有第 3 轨有 g[data-tabjp]；数据 [false,false,true]；toast 点名「旋律」；面板点亮
   T2  再点亮第 1 轨 → 两条（0、2）；面板点亮态随当前轨切换（木吉他 亮 / 键盘1 灭 / 旋律 亮）
   T3  逐条关掉 → 联排行随之移除；全关后 song 不残留 tabJp 与 tabJpVoices，#score 与从未点亮时逐字节相同
   T4  老谱（tabJp:true、无 tabJpVoices）→ 三轨都有联排行；#score 与 v67.1 逐字节相同（设 MUSETAB_REF 时对拍参考版；不设时与「tabJpVoices 全为真」自洽对拍），1280/390 宽
   T5  老谱上点第 2 轨 → 先物化为全亮再只关第 2 轨：[true,false,true]，toast 点名「键盘1」
   T5b 只有残余 tabJpVoices（旧版本关掉整曲 tabJp 时留下）、没有 tabJp → 不出联排行；再点亮从空白开始
   T6  纵向几何：只点亮第 3 轨时，第 1、2 轨的 TAB 顶线（sysMetrics 相对系统顶 + 弦位热区）、联排五线谱底线、符干区（拍选热区）、小节号、编辑态「!」、
       SOLO 播放块与全关时完全相同（第 2 轨上方照加 tabGap2、三行联排时谱表↔TAB 照用 tGapDn），两轨谱面 + 三行联排各一遍，1280/390 宽；
       1280 宽另查全部小节宽与各轨列 x 相同；第 3 轨的「!」挪到小节号带、播放块罩住联排行
   T6b 横向：没点亮的轨不登记联排 j 带——第 1 轨同一拍写 F♯（联排行要左伸 ♯4）或同宽的 G：只点亮第 3 轨时 measureLayout 完全相同，第 1 轨也点亮时不同
   T7  增删轨：逐轨模式加轨（＋音轨 / 从旋律生成把位轨）新轨不亮；删第 1 轨后「旋律」轨（下标 1）仍是唯一联排行；删光点亮轨后字段清空；
       老谱全亮加轨 → 先物化 [true,true,true] 再加 false；老谱全亮删轨 → 其余轨照旧全亮、不写新字段
   T8  撤销 / 重做：点亮第 3 轨 → 撤销回到无字段、无联排行 → 重做回到只第 3 轨
   T9  光标不在 TAB 行（面板此时显示的是旋律轨）：多条吉他轨时「简谱」置灰、点击只提示先选轨、数据不动（不猜作用轨）；只有一条吉他轨时仍作用于它
   T10 JSON 存取：存档（localStorage）里带 tabJpVoices；JSON 往返 + migrate 后 #score 逐字节相同；刷新页面后只第 3 轨有联排行
   T11 导入不自动点亮（MusicXML 往返导入的新谱无 tabJp / tabJpVoices）；转调「转1=X」文字：任一轨点亮即写、全关不写
   T12 观看页（viewerBuildSong + 移调）与导出 PNG（svgResolveVars 成品）按逐轨渲染：只有第 3 轨的联排行
   —— 以下为验收补（对抗式验收发现逐条复现后修复；对实现者原版 …/fin72/impl.html 跑全红）——
   T13 换窗口真实点击路径：A 谱选「旋律」→ 点人声旋律音符 → 新窗口 B 谱选「木吉他」→ 点标签切回 A（光标在旋律行、吉他谱面板可见）→ 点「简谱」：
       置灰、数据不动、两个窗口都不出联排行（此前用 B 谱记住的下标点亮了 A 谱的「木吉他」）；点左栏图层「六线谱」同款；再点「旋律」轨钮后点「简谱」→ 面板名＝toast 轨名＝点亮的轨
   T14 纯 TAB 谱（无旋律声部）末弦按 ↓ / 按 Tab：光标不再进到不存在的旋律行（此前面板「当前音轨」空白、「简谱」仍作用于记住的轨）
   T15 智能配谱（arrangeAccompaniment）生成的伴奏谱不残留逐轨 tabJpVoices（tabVoices 已清空）
   T16 migrate：tabJpVoices 长度≠TAB 轨数（没刷新的旧版本页面增删过轨）→ 丢掉数组回到老口径全部轨点亮；等长数组原样
   T17 联排行热区：真实鼠标点联排数字正中 / 上沿外 6px / 下沿外 5px → 选中本轨本列（此前清光标 / 落到上一轨拍选区）；上一轨符杠仍归上一轨
   T1 另查点亮 toast 不超过 26 字（此前约 57 字，390 宽折 5 行盖住面板）
   稳健性（验收：高负载下偶发 25/26）：载入 / 刷新 / 改视口后一律等条件（应用就绪、#paper 宽连续稳定），不再定时等待；失败时汇总行前列出失败断言名
   T6 的「与全关时完全相同」以横向版面不变为前提（夹具不回流）：点亮某轨让小节变宽 / 分行变化时，未点亮轨的 let ring / P.M. 让位层数会随横向位置合法回流。
   T4 的「逐字节」除列热区（data-si=0 的透明 rect）上沿：点亮联排行的轨该热区上伸罩住联排行（T17），只改透明热区的 y / height，可见墨迹逐字节相同。
   突变实证：对 v67.1 原版（MUSETAB_URL=…/v671.html）跑 2/31——T1 T2 T3 T5 T5b T6（两种谱面）T6b T7 T8 T9（各两宽）T10 T12 T13～T17 全红（原版点一下三轨全亮）；
   T4（老谱整曲 tabJp 观感不变）、T11（导入 / 转调文字）两版都绿，正是兼容红线。
   定点突变（各只改一处）：sysMetrics i>0 仍按整曲判 tabGap2 → T6 四红；三行联排 gDn 仍按整曲 → T6·三行联排两红；「!」位置按任一轨 → T6 四红；
   measureLayout j 带按任一轨 → T6（1280 横向）两红 + T6b 两红；面板开关用 sel.vi → T9 两红；加轨 / 删轨不维护逐轨数组 → T7 两红；面板点亮态按任一轨 → T2 T3 T5 六红。
   验收补的定点突变（各只改一处，对本版）：光标在旋律行仍作用于第 1 轨（tabJpPanelVi 不返回 -2）→ T9 两红 + T13；switchRow 不拦空行 → T14；
   配谱不清逐轨数组 → T15；migrate 不丢失配数组 → T16；联排行热区不上伸 → T17；第 2 条起热区不上伸 4 → T17；toast 恢复长句 → T1 两红。实现者原版跑 22/31。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const REF = process.env.MUSETAB_REF || '';

/* 页面内助手：只用 v67.1 与本版都有的全局函数（T4 对拍参考版时同一份助手在参考版页面里跑） */
/* 页面就绪＝应用脚本跑完、当前谱已载入（高负载下定时等待不可靠，改等条件） */
const READY = () => typeof render === 'function' && typeof song !== 'undefined' && !!song && !!document.getElementById('paper');
const HELP = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false; try{ hideStartPad(); }catch(_){}
  if(!window.__toasts){ window.__toasts=[]; const o=window.toast; window.toast=(m,x)=>{ window.__toasts.push(String(m)); try{ return o(m,x); }catch(_){} }; }
  window.__T=(dur,notes,o)=>Object.assign({dur, dotted:false, chord:'', notes:notes||[], strum:'', tech:''}, o||{});
  window.__V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  /* 三轨谱（截图同款轨名）：第 2 轨有和弦名 + 技法字母（i>0 的 tabGap2 非零，验证没点亮的轨照旧在上方让出标注带） */
  window.__mk3=o=>{ o=o||{};
    const s=createSong('guitar',{title:'逐轨联排',key:'C',beats:4,unit:4,nMea:o.nMea||2,nTab:3,nVox:o.nVox||0,lyr:o.nVox?1:0});
    s.tabVoices=['木吉他','键盘1','旋律'];
    s.measures.forEach((m,mi)=>{
      m.tabs[0]=[__T(4,[{s:5,f:3},{s:4,f:2},{s:2,f:1}],{chord:'C'}), __T(4,[{s:3,f:0}]), __T(4,[{s:2,f:1}]), __T(4,[{s:1,f:0}])];
      m.tabs[1]=[__T(8,[{s:3,f:2,tech:'h'}]), __T(8,[{s:3,f:4}]), __T(4,[{s:2,f:3}],{chord:'G'}), __T(2,[{s:1,f:3}])];
      m.tabs[2]=[__T(4,[{s:1,f:0}]), __T(8,[{s:1,f:1}]), __T(8,[{s:2,f:3}]), __T(4,[{s:2,f:1}]), __T(4,[{s:2,f:0}])];
      if(o.nVox) m.voxes[0]=[__V(1,4),__V(2,4),__V(3,4),__V(5,4)];
    });
    if(o.acc) s.measures[0].tabs[0][1]=__T(4,[{s:1,f:o.acc===2? 3 : 2}]);   /* 第 1 轨首小节第 2 拍 1 弦 2 品＝F♯（C 调 ♯4：联排行要左伸变化音）；acc:2＝同宽的 3 品 G（调内音）对照 */
    if(o.err){ s.measures[0].tabs[0].pop(); s.measures[0].tabs[2].pop(); }   /* 第 1、3 轨首小节少一拍 → 编辑态「!」 */
    if(o.dc) s.measures[s.measures.length-1].dc=true;                         /* 第 1 轨 TAB 下方 D.C.（第 2 轨联排行的 nav 让位分支） */
    if(o.keyTo) s.measures[1].keyTo='G';
    if(o.staff) s.tabStaff=true;
    return s; };
  window.__show=s=>{ if(typeof undoStack!=='undefined'){ undoStack.length=0; redoStack.length=0; } loadSong(s); blurSel=true; render(); return document.getElementById('score').innerHTML; };
  window.__groups=()=>[...document.querySelectorAll('#score g[data-tabjp]')].map(g=>+g.getAttribute('data-tabjp')).filter((v,i,a)=>a.indexOf(v)===i).sort();
  window.__fields=()=>({has:'tabJp' in song, tabJp:song.tabJp, hasV:'tabJpVoices' in song, v:song.tabJpVoices===undefined? null : JSON.stringify(song.tabJpVoices)});
  window.__lit=()=>document.getElementById('nl-tabjp').classList.contains('on');
  window.__rail=k=>{ const b=document.querySelector('#rail-tracks .rtrk[data-trk="'+k+'"]'); if(!b) return false; b.click(); return true; };
  window.__panel=()=>{ const c=document.querySelector('#tab-voices .trk'); return c? c.textContent.replace('×','').trim() : ''; };
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForFunction(READY, null, { timeout: 30000 }); await pg.waitForTimeout(300);
  await pg.evaluate(HELP);
  let pass = 0, total = 0;
  const fails = [];
  const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(/[：:（]/)[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);
  const EV = s => pg.evaluate(s);
  /* 验收补（高负载下 T4 偶发 25/26）：改视口后不再定时等待，等 #paper 宽连续 3 次（每次隔 120ms）读数相同再排版 */
  const settle = async p2 => { let last = -1, same = 0;
    for (let k = 0; k < 60 && same < 3; k++) { const w = await p2.evaluate(() => (document.getElementById('paper') || {}).clientWidth || 0);
      same = (w === last && w > 0) ? same + 1 : 0; last = w; await p2.waitForTimeout(120); } };

  for (const wd of [1280, 390]) {
    await pg.setViewportSize({ width: wd, height: 950 });
    const W = '（' + wd + ' 宽）';

    /* ===== T1～T3 面板逐轨开关（截图同款选轨：最左音轨钮） ===== */
    const r1 = await EV(`(()=>{ const off=__show(__mk3()); __toasts.length=0;
      const railOk=__rail('tv:2'); const panel=__panel(), selRow=sel.row, selVi=sel.vi;
      document.getElementById('nl-tabjp').click();
      return {off, railOk, panel, selRow, selVi, g:__groups(), f:__fields(), lit:__lit(), toast:__toasts.join(' | ')}; })()`);
    T(r1.railOk && r1.panel === '旋律' && J(r1.g) === '[2]' && r1.f.tabJp === true && r1.f.v === '[false,false,true]' && r1.lit && /「旋律」/.test(r1.toast) && r1.toast.length <= 26,
      'T1 面板选「旋律」点「简谱」→ 只有第 3 轨出联排行；toast 点名且不超过 26 字' + W, J({ ...r1, off: undefined, tlen: r1.toast.length }));

    const r2 = await EV(`(()=>{ __toasts.length=0; __rail('tv:0'); const lit0a=__lit();
      document.getElementById('nl-tabjp').click(); const lit0=__lit(), g=__groups(), f=__fields(), toast=__toasts.join(' | ');
      __rail('tv:1'); const p1=__panel(), lit1=__lit(); __rail('tv:2'); const p2=__panel(), lit2=__lit(); __rail('tv:0'); const lit0b=__lit();
      return {lit0a, lit0, g, f, toast, p1, lit1, p2, lit2, lit0b}; })()`);
    T(!r2.lit0a && r2.lit0 && J(r2.g) === '[0,2]' && r2.f.v === '[true,false,true]' && /「木吉他」/.test(r2.toast)
      && r2.p1 === '键盘1' && !r2.lit1 && r2.p2 === '旋律' && r2.lit2 && r2.lit0b,
      'T2 再点亮第 1 轨 → 两条；面板点亮态随当前轨切换' + W, J(r2));

    const r3 = await EV(`(()=>{ __toasts.length=0;
      document.getElementById('nl-tabjp').click(); const g1=__groups(), f1=__fields(), lit1=__lit(), t1=__toasts.join(' | ');
      __rail('tv:2'); document.getElementById('nl-tabjp').click(); const g2=__groups(), f2=__fields(), lit2=__lit();
      blurSel=true; render(); const h=document.getElementById('score').innerHTML;
      const off=__show(__mk3());
      /* 「从未点亮」的同一首谱、同样的选轨状态 */
      __rail('tv:0'); __rail('tv:2'); blurSel=true; render(); const h0=document.getElementById('score').innerHTML;
      return {g1, f1, lit1, t1, g2, f2, lit2, same:h===h0, len:h.length}; })()`);
    T(J(r3.g1) === '[2]' && r3.f1.v === '[false,false,true]' && !r3.lit1 && /关闭「木吉他」/.test(r3.t1)
      && J(r3.g2) === '[]' && !r3.f2.has && !r3.f2.hasV && !r3.lit2 && r3.same,
      'T3 逐条关掉 → 联排行移除；全关后不残留 tabJp / tabJpVoices，#score 与从未点亮逐字节相同' + W, J(r3));

    /* ===== T5 老谱上点第 2 轨 ===== */
    const r5 = await EV(`(()=>{ const s=__mk3(); s.tabJp=true; __show(s); const g0=__groups(); __toasts.length=0;
      __rail('tv:1'); const lit0=__lit(); document.getElementById('nl-tabjp').click();
      return {g0, lit0, g:__groups(), f:__fields(), lit:__lit(), toast:__toasts.join(' | ')}; })()`);
    T(J(r5.g0) === '[0,1,2]' && r5.lit0 && J(r5.g) === '[0,2]' && r5.f.tabJp === true && r5.f.v === '[true,false,true]' && !r5.lit && /关闭「键盘1」/.test(r5.toast),
      'T5 老谱（整曲 tabJp）上点第 2 轨 → 只关第 2 轨，其余保持' + W, J(r5));

    /* ===== T5b 残余字段：旧版本关掉整曲 tabJp 时留下的 tabJpVoices 一律不认；再点亮从空白开始 ===== */
    const r5b = await EV(`(()=>{ const s=__mk3(); s.tabJpVoices=[true,true,false]; const h0=__show(s), g0=__groups();
      const ref=__show(__mk3()); __show(s); __rail('tv:2'); document.getElementById('nl-tabjp').click();
      return {g0, same:h0===ref, g:__groups(), f:__fields()}; })()`);
    T(J(r5b.g0) === '[]' && r5b.same && J(r5b.g) === '[2]' && r5b.f.v === '[false,false,true]',
      'T5b 只有残余 tabJpVoices、没有 tabJp → 不出联排行（与未点亮逐字节相同）；再点亮从空白开始' + W, J(r5b));

    /* ===== T6 纵向几何：只点亮第 3 轨 vs 全关（第 1、2 轨完全相同）——两轨谱面 + 三行联排（联排五线谱）各一遍 =====
       另查横向：第 3 轨联排行（全是调内音、四分/八分）不需额外宽度 → 全部小节宽、各轨列 x 与全关时相同；
       （没点亮的轨不登记联排 j 带另由 T6b 直接量 measureLayout） */
    for (const VAR of [{ err: true, dc: true, acc: true }, { err: true, staff: true, acc: true }]) {
      const tag = VAR.staff ? '·三行联排' : '';
      const r6 = await EV(`(()=>{
        const geo=()=>{ const sv=document.getElementById('score');
          const sy=layoutSystems(); tabRingPlan(sy);
          const M=sy.map(s2=>{ const e=systemExtras(s2); return sysMetrics(e.topExtra, e.botExtra, e.tabExtra, e.tabGap2, e.diagExtra, e.tabBotPad, e.diagOn, e.ringEx, e.jpEx); });
          const ys=(sel,f)=>[...new Set([...sv.querySelectorAll(sel)].filter(f||(()=>true)).map(el=>el.getAttribute('y')+(el.getAttribute('height')? '+'+el.getAttribute('height') : '')))].sort();
          const per=vi=>({ top:M.map(m=>m.tabTops[vi]), staffB:M.map(m=>m.tabStaffB[vi]), str:ys('rect.strcell[data-vi="'+vi+'"][data-si="1"]'),
            stem:ys('rect.beatzone', el=>el.getAttribute('data-beatsel').split(':')[1]===String(vi)),
            /* 编辑态「!」按所在轨归属：本轨弦位热区（1 弦格顶～末弦格底）上 15 / 下 20 以内 */
            bang:(()=>{ const cs=[...sv.querySelectorAll('rect.strcell[data-vi="'+vi+'"]')].map(r=>+r.getAttribute('y')); if(!cs.length) return [];
              const lo=Math.min(...cs)-15, hi=Math.max(...cs)+9+20;
              return [...sv.querySelectorAll('text')].filter(t=>t.textContent==='!' && +t.getAttribute('y')>=lo && +t.getAttribute('y')<=hi).map(t=>t.getAttribute('y')); })(),
            box:Object.keys(colBoxes).filter(k=>k.indexOf('t'+vi+':')===0).map(k=>colBoxes[k].y+'+'+colBoxes[k].h).filter((v,i,a)=>a.indexOf(v)===i).sort() });
          const xs=vi=>[...new Set([...sv.querySelectorAll('rect.strcell[data-vi="'+vi+'"][data-si="1"]')].map(r=>r.getAttribute('x')))].sort();
          /* 首系统顶 oy（绝对坐标）：第 1 轨 1 弦格 y＝oy+tabTop−STR/2 */
          const oy0=Math.min(...[...sv.querySelectorAll('rect.strcell[data-vi="0"][data-si="1"]')].map(r=>+r.getAttribute('y')))+4.5-M[0].tabTops[0];
          return {sys:sy.map(s2=>s2.measures.map(l=>l.mi).join()), w:sy.map(s2=>s2.measures.map(l=>l.L.w.toFixed(3)).join()), mnum:ys('text.mnum'),
            v0:per(0), v1:per(1), v2:per(2), xs:[xs(0), xs(1), xs(2)], jT:M.map(m=>m.tabJpT), jB:M.map(m=>m.tabJpB), h:M.map(m=>m.h), oy0}; };
        const V=${J(VAR)};
        const s=__mk3(V); __show(s); const A=geo();
        const s2=__mk3(V); s2.tabJp=true; s2.tabJpVoices=[false,false,true]; __show(s2); const B=geo(), g=__groups();
        return {A, B, g, acc:[...document.querySelectorAll('#score text')].filter(t=>t.textContent==='♯').length}; })()`);
      const A = r6.A, B = r6.B, eq = (x, y) => J(x) === J(y);
      const same01 = eq(A.sys, B.sys) && eq(A.mnum, B.mnum) && eq(A.v0, B.v0)
        && eq(A.v1.top, B.v1.top) && eq(A.v1.staffB, B.v1.staffB) && eq(A.v1.str, B.v1.str) && eq(A.v1.stem, B.v1.stem) && eq(A.v1.box, B.v1.box) && eq(A.v1.bang, B.v1.bang);
      /* 横向只在 1280 宽查：390 宽小节已压到硬底，第 3 轨自己的联排行 j 带（数字刚杆）会合法地改变弹簧分配 */
      const sameX = wd !== 1280 || (eq(A.w, B.w) && eq(A.xs, B.xs));
      /* 第 3 轨：有联排行（tabJpB 只在第 3 轨非零） */
      const only3 = B.jB.every(a => !a[0] && !a[1] && a[2] > 0) && A.jB.every(a => !a[0] && !a[1] && !a[2]);
      /* 「!」：第 1 轨两版同位（TAB 顶线上方 tabTop−6）；第 3 轨全关时在 tabTop−6、点亮后挪到本轨小节号带（tabBot+10，在本轨弦位格之下） */
      const bangOk = A.v0.bang.length === 1 && A.v1.bang.length === 0
        && A.v2.bang.length === 1 && B.v2.bang.length === 1 && +B.v2.bang[0] > +A.v2.bang[0];
      /* 第 3 轨单轨 SOLO 播放块：点亮后顶边罩住联排行（≤ 联排行区顶），全关时在其下 */
      const box3 = B.sys.length === 1 && B.v2.box.length > 0 && B.v2.box.every(v => +v.split('+')[0] <= B.oy0 + B.jT[0][2] + 1e-6)
        && A.v2.box.every(v => +v.split('+')[0] > B.oy0 + B.jT[0][2] + 1e-6);
      T(J(r6.g) === '[2]' && same01 && sameX && only3 && bangOk && box3,
        'T6 只点亮第 3 轨' + tag + '：第 1、2 轨 TAB 顶线 / 符干区 / 小节号 / 「!」/ 播放块（纵向）' + (wd === 1280 ? '及全部列 x（横向）' : '') + '与全关时完全相同' + W,
        same01 && sameX && only3 && bangOk && box3 ? J({ sys: B.sys, top1: B.v1.top, staffB1: B.v1.staffB, jB: B.jB, bang: [B.v0.bang, A.v2.bang, B.v2.bang], box2: [A.v2.box, B.v2.box], acc: r6.acc })
          : J({ same01, sameX, only3, bangOk, box3, g: r6.g, A: { sys: A.sys, w: A.w, mnum: A.mnum, v0: A.v0, v1: A.v1, v2: A.v2, jB: A.jB }, B: { sys: B.sys, w: B.w, mnum: B.mnum, v0: B.v0, v1: B.v1, v2: B.v2, jB: B.jB, jT: B.jT, oy0: B.oy0 } }).slice(0, 3000));
    }

    /* ===== T6b 横向：没点亮的轨不登记联排 j 带 =====
       第 1 轨同一拍放 F♯（联排行要写 ♯4、变化音左伸）或同宽的 G（调内音）：只点亮第 3 轨时两者的 measureLayout（宽 / 硬底 / 各轨列位）完全相同；
       第 1 轨也点亮时两者不同（对照：证明这个 ♯ 确实会占联排行的横向空间） */
    const r6b = await EV(`(()=>{
      const lay=(acc, v)=>{ const s=__mk3({acc}); s.tabJp=true; s.tabJpVoices=v; __show(s);
        const L=measureLayout(song.measures[0]); return {sig:[L.w.toFixed(3), L.rigid.toFixed(3), L.tabs.map(t=>t.xs.map(x=>x.toFixed(2)).join(',')).join('|')].join(' / '),
          sharp:[...document.querySelectorAll('#score g[data-tabjp] text')].filter(t=>t.textContent==='♯').length}; };
      const a=lay(1,[false,false,true]), b=lay(2,[false,false,true]), c=lay(1,[true,false,true]), d=lay(2,[true,false,true]);
      return {a, b, c, d}; })()`);
    T(r6b.a.sig === r6b.b.sig && r6b.c.sig !== r6b.d.sig && r6b.a.sharp === 0 && r6b.c.sharp === 1,
      'T6b 横向：没点亮的轨不登记联排 j 带（第 1 轨的 ♯4 只在第 1 轨点亮时才占横向空间）' + W, J(r6b));

    /* ===== T7 增删轨 ===== */
    const r7 = await EV(`(()=>{ const out={};
      const s=__mk3({nVox:1}); s.tabJp=true; s.tabJpVoices=[false,false,true]; __show(s);
      addVoice('tab'); out.add={f:__fields(), g:__groups(), n:song.tabVoices.length};
      mapVoxToTab(0,'low'); out.map={f:__fields(), g:__groups(), n:song.tabVoices.length};
      delVoiceAt('tab', 0); out.del0={f:__fields(), g:__groups(), nm:song.tabVoices.join('/')};
      sel.row='tab'; sel.vi=song.tabVoices.indexOf('旋律'); delVoice('tab'); out.delMel={f:__fields(), g:__groups(), nm:song.tabVoices.join('/')};
      /* 老谱全亮：加轨先物化 → 新轨 false */
      const s2=__mk3(); s2.tabJp=true; __show(s2); addVoice('tab'); out.oldAdd={f:__fields(), g:__groups()};
      /* 老谱全亮：删轨 → 其余照旧全亮，不写新字段 */
      const s3=__mk3(); s3.tabJp=true; __show(s3); delVoiceAt('tab', 1); out.oldDel={f:__fields(), g:__groups(), nm:song.tabVoices.join('/')};
      /* 从未点亮：增删都不写任何字段 */
      const s4=__mk3(); __show(s4); addVoice('tab'); delVoiceAt('tab', 0); out.never={f:__fields(), g:__groups()};
      return out; })()`);
    T(r7.add.n === 4 && r7.add.f.v === '[false,false,true,false]' && J(r7.add.g) === '[2]'
      && r7.map.n === 5 && r7.map.f.v === '[false,false,true,false,false]' && J(r7.map.g) === '[2]'
      && r7.del0.nm.split('/')[1] === '旋律' && r7.del0.f.v === '[false,true,false,false]' && J(r7.del0.g) === '[1]'
      && !r7.delMel.nm.split('/').includes('旋律') && !r7.delMel.f.has && !r7.delMel.f.hasV && J(r7.delMel.g) === '[]'
      && r7.oldAdd.f.v === '[true,true,true,false]' && J(r7.oldAdd.g) === '[0,1,2]'
      && r7.oldDel.f.tabJp === true && !r7.oldDel.f.hasV && J(r7.oldDel.g) === '[0,1]' && r7.oldDel.nm === '木吉他/旋律'
      && !r7.never.f.has && !r7.never.f.hasV && J(r7.never.g) === '[]',
      'T7 增删轨（＋音轨 / 生成把位轨 / 删轨两入口 / 老谱物化）逐轨映射正确' + W, J(r7));

    /* ===== T8 撤销 / 重做 ===== */
    const r8 = await EV(`(()=>{ __show(__mk3()); __rail('tv:2'); document.getElementById('nl-tabjp').click(); const a={f:__fields(), g:__groups()};
      undo(); const u={f:__fields(), g:__groups(), lit:(__rail('tv:2'), __lit())}; redo(); const r={f:__fields(), g:__groups(), lit:(__rail('tv:2'), __lit())};
      return {a, u, r}; })()`);
    T(r8.a.f.v === '[false,false,true]' && !r8.u.f.has && !r8.u.f.hasV && J(r8.u.g) === '[]' && !r8.u.lit && r8.r.f.v === '[false,false,true]' && J(r8.r.g) === '[2]' && r8.r.lit,
      'T8 撤销 / 重做' + W, J(r8));

    /* ===== T9 光标不在 TAB 行（面板显示的是旋律轨）：多条吉他轨＝置灰不猜；单条吉他轨＝无歧义照常 =====
       setRibbon('tab')＝吉他谱面板可见、光标仍在旋律行（换窗口 / 点左栏图层同款；真实点击路径见 T13） */
    const r9 = await EV(`(()=>{ __show(__mk3({nVox:1})); __rail('tv:1'); const pA=__panel(); __rail('vv:0'); const row=sel.row;
      setRibbon('tab'); syncInputs(); const pB=__panel();
      const b=document.getElementById('nl-tabjp'); const dis=b.classList.contains('nl-dis'), lit=__lit(), aria=b.getAttribute('aria-disabled'), tip=b.title;
      __toasts.length=0; b.click(); const f=__fields(), g=__groups(), t=__toasts.join(' | ');
      const s1=__mk3({nVox:1}); s1.tabVoices=['吉他']; s1.measures.forEach(m=>{ m.tabs=[m.tabs[0]]; }); __show(s1); __rail('vv:0'); setRibbon('tab'); syncInputs();
      const dis1=b.classList.contains('nl-dis'), tip1=b.title; __toasts.length=0; b.click(); const f1=__fields(), g1=__groups(), t1=__toasts.join(' | '), lit1=__lit();
      return {pA, row, pB, dis, lit, aria, tip, f, g, t, dis1, tip1, f1, g1, t1, lit1}; })()`);
    T(r9.pA === '键盘1' && r9.row === 'vox' && r9.pB !== '键盘1' && r9.dis && !r9.lit && r9.aria === 'true' && /先.*选中一条吉他轨/.test(r9.tip)
      && !r9.f.has && !r9.f.hasV && J(r9.g) === '[]' && /先选中一条吉他轨/.test(r9.t)
      && !r9.dis1 && !/先.*选中/.test(r9.tip1) && r9.f1.v === '[true]' && J(r9.g1) === '[0]' && /「吉他」/.test(r9.t1) && r9.lit1,
      'T9 光标在旋律行：多条吉他轨时「简谱」置灰、点击只提示先选轨（不点亮看不见的轨）；单条吉他轨仍作用于它' + W, J(r9));
  }
  await pg.setViewportSize({ width: 1280, height: 950 });

  /* ===== T4 老谱逐字节（1280/390） ===== */
  {
    const CASES = `[ ()=>__mk3(), ()=>__mk3({staff:true}), ()=>__mk3({err:true, dc:true, keyTo:true}), ()=>__mk3({nVox:1, nMea:6}),
      ()=>{ const s=createSong('uku',{title:'u',key:'G',beats:3,unit:4,nMea:3,nTab:1,nVox:1,lyr:1}); s.measures.forEach(m=>{ m.tabs[0]=[__T(4,[{s:1,f:2}]),__T(8,[{s:2,f:3}]),__T(8,[{s:1,f:0}]),__T(4,[{s:3,f:2}])]; }); return s; },
      ()=>{ const s=createSong('solo',{title:'s',key:'D',beats:4,unit:4,nMea:4,nTab:2,nVox:0,lyr:0}); s.measures.forEach(m=>{ m.tabs[0]=[__T(8,[{s:4,f:0}]),__T(8,[{s:3,f:2}]),__T(4,[{s:2,f:3}],{chord:'D'}),__T(2,[{s:1,f:2}])]; m.tabs[1]=[__T(2,[{s:6,f:5}]),__T(2,[{s:5,f:0}])]; }); return s; } ]`;
    const legacy = (page, mode) => page.evaluate(`(()=>{ const cs=${CASES}; return cs.map((mk,k)=>{ const s=mk(); s.tabJp=true; ${mode === 'field' ? 's.tabJpVoices=s.tabVoices.map(()=>true);' : ''}
      const h=__show(s); return {k, h, g:__groups().join()}; }); })()`);
    let bad = [], n = 0, groupsOk = true, gs = [];
    let pr = null;
    if (REF) { pr = await b.newPage({ viewport: { width: 1280, height: 950 } }); pr.on('pageerror', e => errs.push('REF:' + e.message)); await pr.goto(REF); await pr.waitForFunction(READY, null, { timeout: 30000 }); await pr.waitForTimeout(300); await pr.evaluate(HELP); }
    for (const wd of [1280, 390]) {
      await pg.setViewportSize({ width: wd, height: 950 }); if (pr) await pr.setViewportSize({ width: wd, height: 950 });
      for (const p2 of pr ? [pg, pr] : [pg]) { await settle(p2); await p2.evaluate('(()=>{ __show(__mk3()); })()'); await settle(p2); }   /* 视口变更后版宽（#paper 宽）先稳定（等条件，不定时） */
      const A = await legacy(pg, 'old'), B = pr ? await legacy(pr, 'old') : await legacy(pg, 'field');
      /* 列热区（data-si=0 的透明 rect）上沿：点亮联排行的轨上伸罩住联排行（T17，只改透明热区的 y / height）——两边同样抹掉这两个属性再逐字节比；可见墨迹不动 */
      const ZN = h => h.replace(/(<rect x="[^"]*" )y="[^"]*"( width="[^"]*" )height="[^"]*"( fill="transparent" data-mi="\d+" data-ci="\d+" data-row="tab" data-vi="\d+" data-si="0" style="cursor:pointer">)/g, '$1y="·"$2height="·"$3');
      A.forEach(x => { x.h = ZN(x.h); }); B.forEach(x => { x.h = ZN(x.h); });
      A.forEach((x, k) => { n++; const y = B[k]; gs.push(x.g);
        const nT = [3, 3, 3, 3, 1, 2][k]; if (x.g !== Array.from({ length: nT }, (_, i) => i).join()) groupsOk = false;
        if (!y || y.h !== x.h) { let i = 0; if (y) while (i < x.h.length && x.h[i] === y.h[i]) i++; bad.push(wd + ':' + k + ' @' + i + ' ' + x.h.slice(Math.max(0, i - 40), i + 60) + ' ≠ ' + (y ? y.h.slice(Math.max(0, i - 40), i + 60) : '')); } });
    }
    if (pr) await pr.close();
    await pg.setViewportSize({ width: 1280, height: 950 });
    T(n === 12 && bad.length === 0 && groupsOk,
      'T4 老谱（tabJp:true、无 tabJpVoices）全部 TAB 轨都有联排行，#score ' + (REF ? '与参考版（' + REF.split('/').pop() + '）' : '与「tabJpVoices 全为真」（自洽；设 MUSETAB_REF 时对拍参考版）') + '逐字节相同（' + n + ' 份，1280/390 宽；列热区上沿除外）',
      bad.length ? bad.slice(0, 3).join(' || ') : 'groups ' + gs.join(' / '));
  }

  /* ===== T10 JSON 存取（存档 + 往返 + 刷新） ===== */
  {
    const a = await EV(`(()=>{ __show(__mk3()); __rail('tv:2'); document.getElementById('nl-tabjp').click(); blurSel=true; render();
      const h=document.getElementById('score').innerHTML; persistFlush();
      const st=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
      const h2=__show(migrate(JSON.parse(JSON.stringify(song))));
      return {st:{tabJp:st.tabJp, v:JSON.stringify(st.tabJpVoices)}, same:h===h2, g:__groups()}; })()`);
    await pg.reload(); await pg.waitForFunction(READY, null, { timeout: 30000 }); await pg.waitForTimeout(300); await pg.evaluate(HELP);
    const r = await EV(`(()=>{ blurSel=true; render(); return {f:__fields(), g:__groups(), nm:song.tabVoices.join('/')}; })()`);
    T(a.st.tabJp === true && a.st.v === '[false,false,true]' && a.same && J(a.g) === '[2]' && r.f.v === '[false,false,true]' && J(r.g) === '[2]' && r.nm === '木吉他/键盘1/旋律',
      'T10 JSON 存取：存档带 tabJpVoices、往返逐字节相同、刷新后只第 3 轨有联排行', J({ a, r }));
  }

  /* ===== T11 导入不自动点亮 + 转调文字 ===== */
  {
    const r = await EV(`(()=>{ const s=__mk3({keyTo:true}); s.tabJp=true; s.tabJpVoices=[false,false,true]; __show(s);
      const im=importMusicXML(exportMusicXML(song)); const s2=(im && im.song) || im;
      const kt=()=>[...document.querySelectorAll('#score text')].filter(t=>/^转1=/.test(t.textContent)).length;
      const k1=kt(); __show(__mk3({keyTo:true})); const k0=kt();
      const s3=__mk3({keyTo:true}); s3.tabJp=true; __show(s3); const kOld=kt();
      return {imp:{has:'tabJp' in s2, hasV:'tabJpVoices' in s2, n:(s2.tabVoices||[]).length}, k1, k0, kOld}; })()`);
    T(r.imp.n >= 1 && !r.imp.has && !r.imp.hasV && r.k1 >= 1 && r.k0 === 0 && r.kOld === r.k1,
      'T11 MusicXML 导入的新谱不带联排字段；「转1=X」文字：任一轨点亮即写、全关不写、老谱照旧', J(r));
  }

  /* ===== T12 观看页（含移调）+ 导出 PNG ===== */
  {
    const r = await EV(`(()=>{ const s=__mk3(); s.tabJp=true; s.tabJpVoices=[false,false,true]; __show(s);
      const prev=song;
      viewerCtx={pb:{title:'v', data:JSON.parse(JSON.stringify(song)), price:0, preview:9999}, own:true, total:song.measures.length};
      vwTrans=2; song=viewerBuildSong(); viewerMode=true; document.body.classList.add('viewer'); blurSel=true; render();
      const vw={g:__groups(), f:__fields()};
      viewerMode=false; viewerCtx=null; vwTrans=0; document.body.classList.remove('viewer'); song=prev; render();
      const o=svgResolveVars; let x=''; svgResolveVars=(t)=>{ x=o(t); return x; };
      try{ exportPNG(1); }finally{ svgResolveVars=o; }
      const ids=[...new Set((x.match(/data-tabjp="(\\d+)"/g)||[]).map(m=>m.replace(/\\D/g,'')))];
      return {vw, png:{len:x.length, ids}}; })()`);
    T(J(r.vw.g) === '[2]' && r.vw.f.v === '[false,false,true]' && r.png.len > 1000 && J(r.png.ids) === '["2"]',
      'T12 观看页（移调 +2）与导出 PNG 成品只有第 3 轨的联排行', J(r));
  }

  /* ===================== 验收补 T13～T17（对实现者原版 …/fin72/impl.html 全红） ===================== */
  await pg.setViewportSize({ width: 1280, height: 950 }); await settle(pg);
  const ST = () => EV(`(()=>{ const b=document.getElementById('nl-tabjp'); const q=b.getBoundingClientRect();
    return {row:sel.row, vi:sel.vi, act:activeTab, panel:__panel(), vis:!!b.offsetParent && q.width>0, dis:b.classList.contains('nl-dis'), lit:__lit(), f:__fields(), g:__groups(), t:__toasts.slice(-1)[0]||'', title:song.title}; })()`);

  /* ===== T13 换窗口真实点击路径（标签栏 / 轨钮 / 谱面音符 / 面板图标全用真实鼠标） ===== */
  {
    /* 按坐标真实点击（置灰的图标带 aria-disabled，Playwright 的 locator.click 会把它当「不可点」一直等） */
    const clickAt = async sel2 => { const q = await pg.evaluate(s3 => { const e = document.querySelector(s3); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, sel2);
      if (q) { await pg.mouse.click(q.x, q.y); await pg.waitForTimeout(120); } return !!q; };
    const MK = nm => `(()=>{ const s=__mk3({nVox:1, nMea:4}); s.title='${nm}'; addDoc(s); })()`;
    const clickVox = async () => { const q = await EV(`(()=>{ const el=document.querySelector('#score [data-row="vox"][data-mi="1"]'); if(!el) return null;
        el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
      if (q) { await pg.mouse.click(q.x, q.y); await pg.waitForTimeout(120); } return !!q; };
    const clickDocTab = async nm => { const h = await pg.evaluateHandle(nm2 => [...document.querySelectorAll('#doc-tabs .dtab')].find(e => (e.querySelector('.dt-t') || {}).textContent === nm2), nm);
      const el = h.asElement(); if (!el) return false; await el.click(); await pg.waitForTimeout(250); return true; };
    await EV(MK('A谱')); await pg.waitForTimeout(200);
    await pg.click('#rail-tracks .rtrk[data-trk="tv:2"]'); await pg.waitForTimeout(120);
    const voxOk = await clickVox(); const a2 = await ST();
    await EV(MK('B谱')); await pg.waitForTimeout(200);
    await pg.click('#rail-tracks .rtrk[data-trk="tv:0"]'); await pg.waitForTimeout(120);
    const tabOk = await clickDocTab('A谱'); const a3 = await ST();
    await EV('__toasts.length=0');
    if (a3.vis) await clickAt('#nl-tabjp');
    const a4 = await ST();
    /* 左栏图层「六线谱」：光标在旋律行时点它（openFlyout → setRibbon('tab') 不改光标）——同一状态 */
    await clickVox(); const ltab = await pg.$('.ltab[data-t="tab"]'); let viaLtab = false;
    if (ltab && await ltab.isVisible()) { await ltab.click(); viaLtab = true; } else await EV(`openFlyout('tab')`);
    await pg.waitForTimeout(150); const a5 = await ST();
    if (a5.vis) await clickAt('#nl-tabjp');
    const a6 = await ST();
    /* 选「旋律」轨钮后再点：面板名＝toast 轨名＝点亮的轨 */
    await pg.click('#rail-tracks .rtrk[data-trk="tv:2"]'); await pg.waitForTimeout(120); await EV('__toasts.length=0');
    await clickAt('#nl-tabjp'); const a7 = await ST();
    await clickDocTab('B谱'); const b1 = await ST();
    const none = x => !x.f.has && !x.f.hasV && J(x.g) === '[]';
    T(voxOk && tabOk && a2.row === 'vox' && a3.title === 'A谱' && a3.row === 'vox' && a3.act === 'tab' && a3.vis && a3.panel !== '木吉他' && a3.dis && !a3.lit
      && none(a4) && /先选中一条吉他轨/.test(a4.t) && a5.row === 'vox' && a5.act === 'tab' && a5.dis && none(a6)
      && a7.panel === '旋律' && a7.f.v === '[false,false,true]' && J(a7.g) === '[2]' && /「旋律」/.test(a7.t) && a7.lit && b1.title === 'B谱' && none(b1),
      'T13 换窗口切回（光标在旋律行、吉他谱面板可见）/ 点左栏图层「六线谱」：「简谱」置灰、点击不动数据；选「旋律」后点 → 面板名＝toast 轨名＝点亮的轨；另一窗口不受影响',
      J({ voxOk, tabOk, viaLtab, a2: { row: a2.row }, a3, a4: { f: a4.f, g: a4.g, t: a4.t }, a5: { row: a5.row, act: a5.act, dis: a5.dis }, a6: { f: a6.f, g: a6.g }, a7, b1: { title: b1.title, f: b1.f, g: b1.g } }));
  }

  /* ===== T14 纯 TAB 谱：光标不进到不存在的旋律行（真实按键） ===== */
  {
    const prep = o => EV(`(()=>{ __show(__mk3(${o || ''})); __rail('tv:2'); sel.si=strN(); sel.ci=0; render(); if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); })()`);
    await prep(); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(80);
    const k1 = await EV(`({row:sel.row, vi:sel.vi, panel:__panel()})`);
    await EV(`(()=>{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); })()`);
    await pg.keyboard.press('Tab'); await pg.waitForTimeout(80);
    const k2 = await EV(`(()=>{ const b=document.getElementById('nl-tabjp'); return {row:sel.row, vi:sel.vi, panel:__panel(), dis:b.classList.contains('nl-dis')}; })()`);
    /* 对照：有旋律声部的谱，末弦 ↓ 照常走到旋律行 */
    await prep('{nVox:1}'); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(80);
    const k3 = await EV(`({row:sel.row})`);
    T(k1.row === 'tab' && k1.vi === 2 && k1.panel === '旋律' && k2.row === 'tab' && k2.panel === '旋律' && !k2.dis && k3.row === 'vox',
      'T14 纯 TAB 谱末弦按 ↓ / 按 Tab：光标留在 TAB 行（面板不空白）；有旋律声部时照常下到旋律行', J({ k1, k2, k3 }));
  }

  /* ===== T15 智能配谱生成的伴奏谱不残留逐轨数组 ===== */
  {
    const r = await EV(`(()=>{ const s=__mk3({nVox:1}); s.tabJp=true; s.tabJpVoices=[false,false,true]; __show(s);
      const o=arrangeAccompaniment(song,{}).song;
      const s2=__mk3({nVox:1}); s2.tabJp=true; __show(s2); const o2=arrangeAccompaniment(song,{}).song;
      return {n:(o.tabVoices||[]).length, has:'tabJp' in o, hasV:'tabJpVoices' in o, old:{has:'tabJp' in o2, hasV:'tabJpVoices' in o2}, src:__fields()}; })()`);
    T(r.n === 0 && !r.has && !r.hasV && r.old.has && !r.old.hasV && r.src.tabJp === true,
      'T15 智能配谱：逐轨 tabJpVoices 随吉他轨一起清掉（老谱整曲 tabJp 照旧保留、原谱不动）', J(r));
  }

  /* ===== T16 migrate：失配的 tabJpVoices（旧版本页面增删过轨）回到老口径 ===== */
  {
    const r = await EV(`(()=>{ const s=__mk3(); s.tabJp=true; s.tabJpVoices=[false,false,true];
      const del=JSON.parse(JSON.stringify(s)); del.tabVoices.splice(0,1); del.measures.forEach(m=>m.tabs.splice(0,1));   /* 旧页面删了第 1 轨、没维护数组 */
      __show(del); const g=__groups(), f=__fields();
      const same=migrate(JSON.parse(JSON.stringify(s)));                                                                 /* 等长：原样 */
      const add=JSON.parse(JSON.stringify(s)); add.tabVoices.push('吉他4'); add.measures.forEach(m=>m.tabs.push([]));     /* 旧页面加了一轨 */
      const m2=migrate(add);
      const rest=JSON.parse(JSON.stringify(s)); delete rest.tabJp; rest.tabVoices.splice(0,1); rest.measures.forEach(m=>m.tabs.splice(0,1));
      const m3=migrate(rest);                                                                                             /* 残余数组（无 tabJp）本来就不认：不动 */
      return {g, f, sameV:JSON.stringify(same.tabJpVoices), add:{has:'tabJp' in m2, hasV:'tabJpVoices' in m2}, rest:JSON.stringify(m3.tabJpVoices)}; })()`);
    T(J(r.g) === '[0,1]' && r.f.tabJp === true && !r.f.hasV && r.sameV === '[false,false,true]' && r.add.has && !r.add.hasV && r.rest === '[false,false,true]',
      'T16 migrate：tabJpVoices 长度≠TAB 轨数 → 丢掉数组回到老口径（全部轨点亮，与旧版本页面所见一致）；等长原样', J(r));
  }

  /* ===== T17 联排行热区（真实鼠标）：点联排数字 → 选中本轨本列；上一轨符杠仍归上一轨 ===== */
  {
    const res = {};
    for (const [vi, v] of [[2, [false, false, true]], [1, [false, true, false]], [0, [true, false, false]]]) {
      await EV(`(()=>{ const s=__mk3(); s.tabJp=true; s.tabJpVoices=${J(v)}; __show(s); window.scrollTo(0,0); document.getElementById('paper').scrollTop=0; })()`);
      const pts = await EV(`(()=>{ const ds=[...document.querySelectorAll('#score g[data-tabjp="${vi}"] text')].filter(t=>/^[0-7X]$/.test(t.textContent));
        return ds.map(t=>{ const q=t.getBoundingClientRect(); return {x:q.x+q.width/2, mid:q.y+q.height/2, above:q.y-6, below:q.bottom+5}; }); })()`);
      const tally = {};
      for (const pt of pts) for (const tag of (vi > 0 ? ['mid', 'above', 'below'] : ['mid', 'below'])) {
        await EV(`(()=>{ blurSel=true; sel.row='tab'; sel.vi=${vi === 0 ? 1 : 0}; sel.ci=0; selRange=null; render(); })()`);
        await pg.mouse.click(pt.x, pt[tag]); await pg.waitForTimeout(30);
        const s2 = await EV(`(()=>{ const r={row:sel.row, vi:sel.vi, blur:blurSel}; document.querySelectorAll('.popmenu,#quickbar').forEach(e=>e.remove()); try{ closeModal(); }catch(_){} return r; })()`);
        const k = tag + ':' + (s2.blur ? 'blank' : s2.row + s2.vi); tally[k] = (tally[k] || 0) + 1;
      }
      res[vi] = { n: pts.length, tally };
    }
    const prev = await EV(`(()=>{ const s=__mk3(); s.tabJp=true; s.tabJpVoices=[false,false,true]; __show(s); window.scrollTo(0,0);
      const zs=[...document.querySelectorAll('#score rect.beatzone')].filter(r=>r.getAttribute('data-beatsel').split(':')[1]==='1');
      let ok=0; zs.forEach(r=>{ const q=r.getBoundingClientRect(); const e=document.elementFromPoint(q.x+q.width/2, q.bottom-7);   /* stemY−1：第 2 轨符杠上 */
        if(e && e.getAttribute && (e.getAttribute('data-beatsel')||'').split(':')[1]==='1') ok++; });
      return {n:zs.length, ok}; })()`);
    const own = Object.entries(res).every(([vi, r]) => r.n > 0 && Object.entries(r.tally).every(([k, c]) => k.endsWith(':tab' + vi)));
    T(own && prev.n > 0 && prev.ok === prev.n,
      'T17 联排行热区：点联排数字正中 / 上沿外 6px / 下沿外 5px → 选中本轨本列（3 种单轨点亮）；上一轨符杠仍归上一轨', J({ res, prev }));
  }

  if (errs.length) T(false, '页面报错', errs.slice(0, 3).join(' | '));
  else console.log('NO ERRORS');
  if (fails.length) console.log('失败项：' + fails.join(' / '));   /* 验收补：汇总行前再列一遍失败断言名，偶发失败可直接定位 */
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
