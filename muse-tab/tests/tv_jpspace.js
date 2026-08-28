/* v60.52 简谱横向避让回归（用户报告：①简谱临时变拍号与小节线重叠；②编辑时音符不避开
   升降号和双倚音导致重叠）。全部用几何断言（SVG getBBox 数值坐标），不看截图：
   T1 变拍号不压小节线：拍号 bbox 左边缘在小节线右侧，且不与右侧首音符相撞
   T2 纯简谱谱（无 TAB/五线谱声部）变拍处同样预留（此前 needTS=false → 零预留）
   T3 变化音净空（v60.53 重写为列索引精确配对——旧写法靠 bbox 容差找「前一列」，会跳过
      真正相邻的那个数字造成假绿）：8/16/32 分三档密度都不侵入前一列，且贴近主音（净距≤1.5px）；
      32 分档触发 rowMax 整体压缩，v60.52 起实测重叠 −3.6px，本版把压缩改为「只吃弹簧不吃刚杆」
   T4 双倚音净空：倚音组数字与共用减时线左端都不侵入前一列数字
   T5 倚音+变化音同列（左伸叠加最大情形）：三倚音 + ♭♭ 仍不重叠
   T6 小节首列左伸不压小节线
   T7 无左伸元素的普通谱面不被这版加宽（护栏：同曲仅去掉 acc/倚音，宽度不增）
   —— v60.53 追加（产品报告）：
   T8 简谱波音/颤音/回音＝SMuFL 出版字形（不再是手绘锯齿折线与 tr/∽ 文本）
   T9 波音与连音线不重叠（弧基线让过波音字形）
   T10 跨行连音线两段接成一条完整弧：上行末＝上升段（终点停在弧顶高度不回落），
       下行首＝下降段（起点在弧顶高度）——此前两段各自是端点同高的独立小弧
   突变实证：对 v60.51 旧文件跑 T1/T3/T4 当场红；对 v60.52 旧文件跑 T1/T2/T3/T8/T9/T10 当场红
   （T4–T7 为 v60.52 已修好的行为，旧文件绿属预期）。file:// 直载。 */
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

  /* 页面内共用测量工具：bbox / 竖直小节线 x / 按字号取文本 */
  const HELP = `
    window.__V=(deg,o)=>Object.assign({dur:4,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.__bb=el=>{const q=el.getBBox();return {x:+q.x.toFixed(1), r:+(q.x+q.width).toFixed(1)};};
    window.__texts=()=>[...document.querySelectorAll('#score text')];
    window.__bars=()=>[...document.querySelectorAll('#score line')]
      .filter(l=>Math.abs(+l.getAttribute('x1')-+l.getAttribute('x2'))<.3
        && Math.abs(+l.getAttribute('y2')-+l.getAttribute('y1'))>8)
      .map(l=>+(+l.getAttribute('x1')).toFixed(1)).sort((a,c)=>a-c);
    window.__digits=()=>__texts().filter(x=>x.getAttribute('font-size')==='16.5').map(x=>({t:x.textContent,...__bb(x)}));
    window.__prevDigit=x=>__digits().filter(d=>d.r<=x+3).sort((p,q)=>q.r-p.r)[0];
    window.__graceLines=()=>[...document.querySelectorAll('#score line')]
      .filter(l=>l.getAttribute('stroke-width')==='0.8' && Math.abs(+l.getAttribute('y1')-+l.getAttribute('y2'))<.3)
      .map(l=>({x:+(+l.getAttribute('x1')).toFixed(1), r:+(+l.getAttribute('x2')).toFixed(1)}));`;

  // T1/T2 变拍号（T1 弹唱谱有 TAB；T2 纯简谱谱）
  let r = await pg.evaluate(HELP + `(()=>{
    const mk=(withTab)=>{
      const s=createSong(withTab?'tanchang':'vocal',
        {beats:4,unit:4,key:'C',nMea:3,nVox:1,lyr:0,nTab:withTab?1:0});
      s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
      s.measures[1].beats=2; s.measures[1].unit=4;
      s.measures[1].voxes[0]=[__V(1),__V(2)];
      s.measures[2].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
      loadSong(s); blurSel=true; render();
      /* v60.53 分数式：上分子/横线/下分母三件，取整体包围盒 */
      const fr=__texts().filter(x=>x.getAttribute('font-size')==='11' && /^[0-9]+$/.test(x.textContent));
      const num=fr.find(x=>x.textContent==='2'), den=fr.find(x=>x.textContent==='4'
        && num && Math.abs(+x.getAttribute('x')-+num.getAttribute('x'))<0.6);
      if(!num||!den) return {miss:1};
      const bn=__bb(num), bd=__bb(den);
      const ts={x:Math.min(bn.x,bd.x), r:Math.max(bn.r,bd.r)};
      const hasBar=[...document.querySelectorAll('#score line')].some(l=>
        Math.abs(+l.getAttribute('y1')-+l.getAttribute('y2'))<0.3
        && Math.abs((+l.getAttribute('x1')+ +l.getAttribute('x2'))/2 - +num.getAttribute('x'))<1.5);
      if(!hasBar) return {miss:2};
      const bars=__bars();
      /* 重叠的本质＝有竖线穿过拍号字身（此前 anchor=middle 时小节线正落在字身里） */
      const crossing=bars.filter(x=>x>ts.x-0.5 && x<ts.r+0.5);
      const barL=bars.filter(x=>x<ts.x).sort((p,q)=>q-p)[0];
      const nextD=__digits().filter(d=>d.x>ts.x).sort((p,q)=>p.x-q.x)[0];
      return {miss:0, tsX:ts.x, tsR:ts.r, barL, crossing:crossing.length,
        overBar:+(ts.x-barL).toFixed(1), toNote: nextD? +(nextD.x-ts.r).toFixed(1) : 99};
    };
    return {tab:mk(true), jp:mk(false)};
  })()`);
  T(!r.tab.miss && r.tab.crossing === 0 && r.tab.overBar > 1 && r.tab.toNote > 1,
    'T1 变拍号不压小节线（弹唱谱：无竖线穿过字身、右侧不撞音符）', JSON.stringify(r.tab));
  T(!r.jp.miss && r.jp.crossing === 0 && r.jp.overBar > 1 && r.jp.toNote > 1,
    'T2 纯简谱谱变拍同样预留（此前 needTS=false 零预留）', JSON.stringify(r.jp));

  // T3 变化音：列索引精确配对（不靠 bbox 猜前一列）× 三档密度；兼顾贴近主音
  r = await pg.evaluate(HELP + `(()=>{
    const mk=(dur,n,ai)=>{
      const Vd=(deg,o)=>Object.assign(__V(deg,o),{dur});
      const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
      const m=[]; for(let i=0;i<n;i++) m.push(Vd((i%7)+1, i===ai?{acc:'#'}:{}));
      s.measures[0].voxes[0]=m; loadSong(s); blurSel=true; render();
      const dig=__digits().sort((a,c)=>a.x-c.x);            // 每列一个数字，index==列号
      const acc=__texts().filter(x=>x.textContent==='♯').map(__bb)[0];
      if(!acc||!dig[ai]||!dig[ai-1]) return {bad:1};
      return { prevGap:+(acc.x-dig[ai-1].r).toFixed(1),      // 与前一列净空（>0 才不重叠）
               mainGap:+(dig[ai].x-acc.r).toFixed(1),        // 与自己主音的净距（贴近）
               squeezed: measureLayout(song.measures[0]).w >= (PAGE_W-2*MARGIN-STAFF_HEAD_W)-1 };
    };
    return {d8:mk(8,8,5), d16:mk(16,16,9), d32:mk(32,32,17)};
  })()`);
  T(r.d8.prevGap > 1.5 && r.d16.prevGap > 1.5 && r.d32.prevGap > 1.5
    && r.d8.mainGap > 0 && r.d8.mainGap <= 1.5 && r.d16.mainGap <= 1.5 && r.d32.squeezed,
    'T3 变化音三档密度不压前列＋贴近主音（32 分档走 rowMax 压缩，旧版重叠 −3.6）', JSON.stringify(r));

  // T4 双倚音净空（16 分密排，旧版实测重叠 −2.9px）
  r = await pg.evaluate(HELP + `(()=>{
    const V16=(deg,o)=>Object.assign(__V(deg,o),{dur:16});
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[
      V16(1),V16(2),V16(3),V16(4),
      V16(6),V16(5,{acc:'#'}),V16(6),V16(3),
      V16(4),V16(3,{grace:{notes:[{deg:4},{deg:5}],dur:16}}),V16(2),V16(1),
      V16(5),V16(6),V16(7),V16(1,{oct:1})];
    loadSong(s); blurSel=true; render();
    const acc=__texts().filter(x=>x.textContent==='♯').map(__bb)[0];
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const pa=__prevDigit(acc.x), pg2=__prevDigit(g.x), pl=__prevDigit(gl.x);
    return {accGap:+(acc.x-pa.r).toFixed(1), accPrev:pa.t,
      grGap:+(g.x-pg2.r).toFixed(1), grPrev:pg2.t,
      glGap:+(gl.x-pl.r).toFixed(1), glPrev:pl.t};
  })()`);
  T(r.grGap > 1.5 && r.glGap > 1.5 && r.accGap > 1.5,
    'T4 双倚音净空（组数字与共用减时线左端均不侵入前列；旧版 −2.9px 重叠）', JSON.stringify(r));

  // T5 左伸叠加最大：三倚音 + ♭♭ 同列
  r = await pg.evaluate(HELP + `(()=>{
    const V8=(deg,o)=>Object.assign(__V(deg,o),{dur:8});
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V8(1),V8(2),V8(3),
      V8(6,{acc:'bb', grace:{notes:[{deg:2},{deg:3},{deg:5}],dur:16}}),
      V8(5),V8(4),V8(3),V8(2)];
    loadSong(s); blurSel=true; render();
    const acc=__texts().filter(x=>x.textContent==='♭♭').map(__bb)[0];
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const leftMost=Math.min(acc? acc.x:1e9, g.x, gl.x);
    const prev=__prevDigit(leftMost);
    return {hasAcc:!!acc, leftMost:+leftMost.toFixed(1), prev:prev.t, gap:+(leftMost-prev.r).toFixed(1)};
  })()`);
  T(r.hasAcc && r.gap > 1.5, 'T5 三倚音＋♭♭ 同列（左伸叠加最大情形不重叠）', JSON.stringify(r));

  // T6 小节首列左伸不压小节线
  r = await pg.evaluate(HELP + `(()=>{
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
    s.measures[1].voxes[0]=[__V(5,{acc:'#', grace:{notes:[{deg:1},{deg:2}],dur:16}}),__V(4),__V(3),__V(2)];
    loadSong(s); blurSel=true; render();
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const leftMost=Math.min(g.x, gl.x);
    const barL=__bars().filter(x=>x<leftMost).sort((p,q)=>q-p)[0];
    return {leftMost:+leftMost.toFixed(1), barL, gap: barL!=null? +(leftMost-barL).toFixed(1) : 99};
  })()`);
  T(r.gap > 1.5, 'T6 小节首列倚音/变化音不压小节线', JSON.stringify(r));

  // T7 护栏：无左伸元素的普通谱面宽度不被这版加宽
  r = await pg.evaluate(HELP + `(()=>{
    const build=(withAcc)=>{
      const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)].map(c=>
        withAcc&&c.deg===3? Object.assign({},c,{acc:'#'}) : c);
      loadSong(s); blurSel=true; render();
      return measureLayout(song.measures[0]).w;
    };
    const plain=build(false), withAcc=build(true);
    return {plain:+plain.toFixed(1), withAcc:+withAcc.toFixed(1)};
  })()`);
  T(r.plain > 0 && r.withAcc >= r.plain && r.withAcc - r.plain < 40,
    'T7 护栏：普通谱面不被加宽，带变化音仅有界变宽（<40px）', JSON.stringify(r));

  /* 注：以下三条一律不用正则字面量——本文件的页面代码写在模板字符串里，
     `\/` `\d` 会被模板字面量的转义规则吃成 `/` `d`（正则提前闭合→evaluate 语法错），
     统统改用 indexOf / split 字符串判定。SMUFL 是页面顶层 const，evaluate 可见。 */

  // T8 简谱波音/颤音/回音＝SMuFL 出版字形（旧版为手绘锯齿折线 + tr/∽ 文本）
  r = await pg.evaluate(HELP + `(()=>{
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[__V(6,{orn:'up'}),__V(5,{orn:'down'}),__V(4,{orn:'tr'}),__V(3,{orn:'turn'})];
    loadSong(s); blurSel=true; render();
    /* 逐个装饰记号比对：页面里必须出现「d 等于对应 SMuFL 字形」的 path（smg 落地形态） */
    const want={up:'ornamentShortTrill',down:'ornamentMordent',tr:'ornamentTrill',turn:'ornamentTurn'};
    const ds=[...document.querySelectorAll('#score path')].map(x=>x.getAttribute('d')||'');
    const hit={}; Object.keys(want).forEach(k=>{ hit[k]= ds.indexOf(SMUFL[want[k]].d)>=0; });
    const h=document.getElementById('score').innerHTML;
    return {hit, allHit:Object.keys(hit).every(k=>hit[k]),
      oldTr: h.indexOf('>tr</text>')>=0 || h.indexOf('>∽</text>')>=0,
      nan: h.indexOf('NaN')>=0};
  })()`);
  T(r.allHit && !r.oldTr && !r.nan,
    'T8 简谱波音/颤音/回音＝SMuFL 出版字形（旧 tr/∽ 文本已退役）', JSON.stringify(r));

  // T9 波音的两侧净距都要合理（v60.69 产品报告：「波音符号离主音符太近，
  //    上方的连音线离波音符号又太远」）。改用 SVG 坐标量——屏幕坐标里 <text> 的
  //    包围盒是字体 em 盒、不是数字墨迹顶，量出来会系统性偏小。
  //    参照：16.5 号数字的墨迹顶 ≈ baseline−12；波音字形自锚点向上约 4.9px。
  r = await pg.evaluate(HELP + `(()=>{
    const build=(withOrn)=>{
      const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[__V(1,withOrn?{orn:'up',tie:true}:{tie:true}),__V(1),__V(2),__V(3)];
      loadSong(s); blurSel=true; render();
      /* transform 用字符串切分取 translate 的 y——模板字符串会把正则里的 \\( 吃成 (，
         正则在这里必失配（CLAUDE.md 记过的坑） */
      const orn=[...document.querySelectorAll('#score path[transform]')].map(x=>{
        const tf=x.getAttribute('transform')||'';
        const i=tf.indexOf('translate('); if(i<0) return null;
        const inner=tf.slice(i+10, tf.indexOf(')', i));
        const parts=inner.split(inner.indexOf(',')>=0? ',' : ' ').map(v=>parseFloat(v));
        return parts.length>1 && !isNaN(parts[1])? parts[1] : null;
      }).filter(v=>v!=null)[0];
      const dig=[...document.querySelectorAll('#score text')]
        .filter(x=>x.getAttribute('font-size')==='16.5')
        .map(x=>+x.getAttribute('y')).sort((a,b2)=>a-b2)[0];
      const tie=[...document.querySelectorAll('#score path')].filter(x=>{
        const d=x.getAttribute('d')||'';
        return !x.getAttribute('transform') && d.slice(0,2)==='M ' && d.split(' Q ').length===3;
      }).map(x=>parseFloat((x.getAttribute('d')||'').split(' ')[2]))[0];
      return {ornY:orn, digBase:dig, tieY:tie};
    };
    const a=build(true), b2=build(false);
    const H=4.9;                                   // 波音字形自锚点向上的高度
    return {
      withOrn:a, noOrn:b2,
      gapOrnToDigit: a.ornY!=null? +((a.digBase-12) - a.ornY).toFixed(1) : null,
      gapTieToOrn:   (a.ornY!=null && a.tieY!=null)? +((a.ornY-H) - a.tieY).toFixed(1) : null,
      plainTieLift:  +(b2.digBase - b2.tieY).toFixed(1)
    };
  })()`);
  T(r.gapOrnToDigit >= 3 && r.gapOrnToDigit <= 5          // 不贴脸，也不飘太高
    && r.gapTieToOrn >= 2 && r.gapTieToOrn <= 5           // 让过波音，但不过远
    && Math.abs(r.plainTieLift - 16) < 0.6,               // 无波音时基线一分不动（voxY−16）
    'T9 波音两侧净距：离主音数字 3–5px、连音线让过它 2–5px（无波音时基线不动）', JSON.stringify(r));

  // T10 跨行连音线＝上升段＋下降段拼成一条整弧（此前两段各自端点同高的独立小弧）
  r = await pg.evaluate(HELP + `(()=>{
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:16,nVox:1,lyr:0});
    for(let i=0;i<16;i++) s.measures[i].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
    loadSong(s); blurSel=true; render();   /* loadSong 深拷贝 → 之后只改 song */
    /* d = "M x1 y1 Q mx qy x2 y2 Q mx q2 x1 y1 Z"：按 " Q " 切三段取端点 */
    const arcs=()=>[...document.querySelectorAll('#score path')]
      .filter(x=>!x.getAttribute('transform')).map(x=>x.getAttribute('d')||'')
      .filter(d=>d.slice(0,2)==='M ' && d.split(' Q ').length===3)
      .map(d=>{ const a=d.slice(2).split(' Q ')[0].split(' '), c=d.split(' Q ')[1].split(' ');
        return {x1:+a[0], y1:+a[1], x2:+c[2], y2:+c[3]}; })
      .filter(o=>isFinite(o.x1)&&isFinite(o.y1)&&isFinite(o.x2)&&isFinite(o.y2));
    for(let mi=0; mi<song.measures.length-1; mi++){
      song.measures[mi].voxes[0][3].tie=true; blurSel=true; render();
      const A=arcs();
      const up=A.filter(o=>o.y1-o.y2>2)[0];   // 上升段：终点比起点高（SVG y 更小）
      const dn=A.filter(o=>o.y2-o.y1>2)[0];   // 下降段：起点在弧顶、终点落回基线
      song.measures[mi].voxes[0][3].tie=false;
      if(up&&dn) return {ok:1, mi, nArc:A.length,
        dUp:+(up.y1-up.y2).toFixed(1), dDn:+(dn.y2-dn.y1).toFixed(1)};
    }
    return {ok:0};
  })()`);
  T(r.ok === 1 && r.dUp > 3 && r.dDn > 3 && Math.abs(r.dUp - r.dDn) < 4,
    'T10 跨行连音线＝上升段＋下降段（两半高度相当，拼成一条整弧）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
