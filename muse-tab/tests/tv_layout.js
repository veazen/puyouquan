/* v60.73 排版三项（产品报告：有歌词的音符靠得很近、没歌词的又有多余的地方；
   手机端吉他谱数字/简谱/歌词混成一团；每行小节分配不合理有些太挤有些过宽）。
   T1 歌词刚杆按**实测字宽**逐列算：双字音节列必须明显宽于单字音节列
      （旧口径是常数 LYR_MIN=18.5，与音节字数无关 → 当场红）
   T2 无词的简谱列不再吃歌词档位：全休止小节的每列宽 < 逐字带词小节的每列宽
      （旧口径 beatVoxCnt×LYR_MIN 把休止列也按歌词放大 → 反过来更宽）
   T3 双位数品位列刚杆更宽：TAB 同弦相邻两位数品位不再连成一片
   T4 断行改全局最优 DP：真实预设曲谱上，各行拉伸比的标准差优于旧贪心
   T5 压缩不吃刚杆：允许的轻微压缩行里，歌词与简谱数字净距仍为正
   T6 复刻截图密度（八分逐字词、含双字音节、排满行）：歌词与简谱净距 ≥3px
   T7 极端密集谱护栏：三类文字均无负净距
   T8 版面不变量：小节宽之和＝行宽、列不越出小节、不越出纸面
   T9 密度包络：单字 ≤24 字/小节、双字 ≤12 字/小节，两行净距全为正
   对改前文件（v60.72）跑 T1/T2/T4/T6 当场红＝突变实证；
   T3/T5/T7 是护栏项（旧版在这些构造下本就不红），如实标注。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const HELP = `
    window.__mk=(nMea,build)=>{
      loadSong(createSong('tanchang',{beats:4,unit:4,key:'C',nMea:nMea,nTab:1,nVox:1,lyr:1}));
      song.measures.forEach((m,mi)=>build(m,mi));
      blurSel=true; render();
    };
    window.__vox=(lyArr,dur)=>lyArr.map(t=>({dur:dur||8,dotted:false,deg:1,acc:'',oct:0,tie:false,lyrics:[t]}));
    window.__tab=(frets)=>frets.map(f=>({dur:8,dotted:false,chord:'',strum:'',tech:'',notes:[{s:3,f:f}]}));
    /* 同一行内按 y 归行、按 x 排序取相邻净距 */
    window.__gaps=(pred)=>{
      const es=[...document.querySelectorAll('#score text')].map(e=>{
        const q=e.getBBox();
        return {t:e.textContent, fs:+e.getAttribute('font-size'),
          fam:e.getAttribute('font-family')||'', x:q.x, y:q.y, w:q.width};}).filter(pred);
      const rows={}; es.forEach(e=>{const k=Math.round(e.y/4)*4;(rows[k]=rows[k]||[]).push(e);});
      const g=[];
      Object.keys(rows).forEach(k=>{ const r=rows[k].sort((a,c)=>a.x-c.x);
        for(let i=1;i<r.length;i++) g.push(+(r[i].x-(r[i-1].x+r[i-1].w)).toFixed(2)); });
      return g;
    };
    window.__isJP=e=>e.fs===17 && e.fam==='var(--font-ui)';   /* v60.75 简谱主音 17 */
    window.__isLY=e=>e.fs===16 && e.fam==='var(--font-ui)';   /* v60.75 歌词 16；页头 1=C 也是 16 但走 --font-num */
    window.__isFR=e=>e.fs===10.5;`;

  // T1 歌词刚杆随音节字数走
  let r = await pg.evaluate(HELP + `(()=>{
    /* 两小节：全单字音节 vs 全双字音节，其余完全相同 */
    __mk(3,(m,mi)=>{
      const ly = mi===1? ['一','二','三','四','五','六','七','八']
                       : ['一一','二二','三三','四四','五五','六六','七七','八八'];
      m.voxes[0]=__vox(ly,8);
      m.tabs[0]=__tab([0,1,2,0,1,2,0,1]);
    });
    const L1=measureLayout(song.measures[1]), L2=measureLayout(song.measures[2]);
    return {单字:Math.round(L1.w), 双字:Math.round(L2.w), 比:+(L2.w/L1.w).toFixed(3)};
  })()`);
  T(r.比 >= 1.25, 'T1 歌词刚杆按实测字宽：双字音节小节明显宽于单字（旧常数口径下两者相等）', JSON.stringify(r));

  // T2 无词列不再吃歌词档位（纯歌谱：没有 TAB 刚杆盖住简谱这一层）
  r = await pg.evaluate(HELP + `(()=>{
    loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:3,nVox:1,lyr:1}));
    song.measures.forEach((m,mi)=>{
      /* 用十六分密度：四分/八分档的拍宽由时值宽主导，刚杆压根不起作用（那两档本来也不挤）；
         刚杆开始决定拍宽的正是十六分这一档，也正是产品截图里出问题的密度 */
      m.voxes[0]= mi===1
        ? Array.from({length:16},()=>({dur:16,dotted:false,deg:0,acc:'',oct:0,lyrics:[''],tie:false}))
        : Array.from({length:16},(_,i)=>({dur:16,dotted:false,deg:1+(i%7),acc:'',oct:0,
            lyrics:['一二三四五六七八九十甲乙丙丁戊己'[i]],tie:false}));
    });
    blurSel=true; render();
    const A=measureLayout(song.measures[1]), B=measureLayout(song.measures[2]);
    return {无词:Math.round(A.w), 带词:Math.round(B.w), 比:+(B.w/A.w).toFixed(3)};
  })()`);
  T(r.比 > 1.05, 'T2 纯歌谱同样 16 列（十六分）：带词小节宽于全休止小节（旧口径休止列白占歌词档＝两者同宽）', JSON.stringify(r));

  // T3 同弦连续双位数品位不再连成一片（渲染净距，不是间接的小节宽）
  r = await pg.evaluate(HELP + `(()=>{
    const run=(frets)=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:0,lyr:0}));
      song.measures.forEach(m=>{
        m.tabs[0]=frets.map(f=>({dur:16,dotted:false,chord:'',strum:'',tech:'',notes:[{s:3,f:f}]}));
      });
      blurSel=true; render();
      const g=__gaps(__isFR);
      return {n:g.length, min:g.length?+Math.min(...g).toFixed(2):null, 负:g.filter(v=>v<0).length};
    };
    return { 单位数:run([1,2,3,4,5,6,7,8,1,2,3,4,5,6,7,8]),
             双位数:run([10,11,12,13,14,15,16,17,10,11,12,13,14,15,16,17]) };
  })()`);
  T(r.双位数.负===0 && r.双位数.min >= 2.5 && r.单位数.负===0,
    'T3 同弦十六分连奏：双位数品位相邻净距仍 ≥2.5px（旧口径一律 13 的列距下必然粘连）', JSON.stringify(r));

  // T4 DP 断行优于贪心（真实预设曲谱）
  r = await pg.evaluate(`(()=>{
    /* DP 优化的是「各行拉伸比偏离 1 的平方和」，不是方差——用同一目标函数比才有意义 */
    const st=a=>{const x=a.slice(0,-1); if(!x.length) return null;
      return +x.reduce((s,v)=>s+(v-1)*(v-1),0).toFixed(4);};
    const res=[];
    PRESETS.forEach((P,i)=>{
      loadSong(P.make()); blurSel=true; render();
      const AV=PAGE_W-2*MARGIN-STAFF_HEAD_W;
      const nat=song.measures.map(m=>measureLayout(m).w);
      if(nat.length<4) return;
      const S=layoutSystems();
      const dp=S.map(sy=>AV/sy.measures.reduce((a,lm)=>a+nat[lm.mi],0));
      const g=[]; let cw=0,cn=0;
      nat.forEach(w=>{ if(cn>=1 && cw+w>AV){ g.push(AV/cw); cw=0; cn=0; } cw+=w; cn++; });
      if(cn) g.push(AV/cw);
      res.push({n:P.name||i, dp代价:st(dp), g代价:st(g), dp行:S.length, g行:g.length,
        dpMax:+Math.max(...dp.slice(0,-1).concat([0])).toFixed(2),
        gMax:+Math.max(...g.slice(0,-1).concat([0])).toFixed(2)});
    });
    const cmp=res.filter(x=>x.dp代价!==null && x.g代价!==null);
    return {n:cmp.length,
      DP不差于贪心:cmp.every(x=>x.dp代价<=x.g代价+1e-6),
      行数不增:cmp.every(x=>x.dp行<=x.g行),
      有严格改进:cmp.some(x=>x.dp代价<x.g代价-1e-4 || x.dp行<x.g行),
      明细:cmp.slice(0,4)};
  })()`);
  T(r.DP不差于贪心 && r.行数不增 && r.有严格改进,
    'T4 DP 断行：预设曲谱上「拉伸比偏离 1 的平方和」不劣于贪心、行数不增、且至少一首严格改进', JSON.stringify(r));

  // T5 压缩行里刚杆仍在（净距为正）
  r = await pg.evaluate(HELP + `(()=>{
    const bad=[];
    PRESETS.forEach((P,i)=>{
      loadSong(P.make()); blurSel=true; render();
      const jp=__gaps(__isJP), ly=__gaps(__isLY);
      const mn=x=>x.length? Math.min(...x) : null;
      const a=mn(jp), c=mn(ly);
      if((a!==null&&a<0.5)||(c!==null&&c<0.5)) bad.push({n:P.name||i, 简谱:a, 歌词:c});
    });
    return {坏谱:bad};
  })()`);
  T(r.坏谱.length === 0, 'T5 所有预设曲谱：简谱数字与歌词的相邻净距均 ≥0.5px（压缩不吃刚杆）', JSON.stringify(r));

  // T6 复刻产品截图密度：八分逐字词（含双字音节「阳光」）、多小节排满行
  r = await pg.evaluate(HELP + `(()=>{
    loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:8,nVox:1,lyr:2}));
    song.measures.forEach(m=>{
      m.voxes[0]=Array.from({length:8},(_,i)=>({dur:8,dotted:false,deg:1+(i%7),acc:'',oct:0,tie:false,
        lyrics:[ i%3===0? '阳光' : '啊', i%3===0? '温暖' : '呀' ]}));
    });
    blurSel=true; render();
    const f=g=>({n:g.length, min:g.length?+Math.min(...g).toFixed(2):null, 负:g.filter(v=>v<0).length});
    return {歌词:f(__gaps(__isLY)), 简谱:f(__gaps(__isJP)), 行数:layoutSystems().length};
  })()`);
  T(r.歌词.min >= 3 && r.歌词.负===0 && r.简谱.min >= 3 && r.简谱.负===0,
    'T6 八分逐字词（含双字音节）排满行：歌词与简谱相邻净距均 ≥3px（旧口径歌词仅 0.31px＝贴死）',
    JSON.stringify(r));

  // T7 十六分逐字词 + 双位数品位的极端密集谱：三类文字均无负净距
  r = await pg.evaluate(HELP + `(()=>{
    __mk(6,(m)=>{
      m.voxes[0]=Array.from({length:16},(_,i)=>({dur:16,dotted:false,deg:1+(i%7),
        acc:'',oct:0,tie:false,lyrics:[i%3===0?'阳光':'啊']}));
      m.tabs[0]=Array.from({length:16},(_,i)=>({dur:16,dotted:false,chord:'',strum:'',tech:'',
        notes:[{s:3, f:[9,11,12,14,16,13,11,10][i%8]}]}));
    });
    const f=g=>({n:g.length, min:g.length?+Math.min(...g).toFixed(2):null, 负:g.filter(v=>v<0).length});
    return {简谱:f(__gaps(__isJP)), 歌词:f(__gaps(__isLY)), 品位:f(__gaps(__isFR))};
  })()`);
  T(r.简谱.负===0 && r.歌词.负===0 && r.品位.负===0 && r.歌词.min >= 0 && r.品位.min >= 0,
    'T7 十六分逐字词＋双位数品位的极端密集谱：三类文字均无负净距', JSON.stringify(r));

  // T8 版面不变量：任何一行的小节宽之和必须等于该行声明宽度，且不超过行宽上限
  //    （v60.73 初版在这里破过：单个小节的刚杆宽过整行时压缩被硬兜底挡住，
  //     sys.w 仍被置成行宽 → 谱线只画到行宽、内容伸出去 20px，产品截图里就是这一截）
  r = await pg.evaluate(HELP + `(()=>{
    const viol=[];
    const check=(tag)=>{
      const AV = PAGE_W - 2*MARGIN - STAFF_HEAD_W;
      layoutSystems().forEach((sy,i)=>{
        const sum = sy.measures.reduce((a,lm)=>a+lm.L.w,0);
        if(sum - sy.w > 0.5) viol.push({tag,行:i,类型:'内容伸出谱线',差:+(sum-sy.w).toFixed(1)});
        /* v60.75 起 sys.w 允许略超 avail（压到刚杆为止、借用页边距），
           但绝不能越出纸面——viewBox 宽固定为 PAGE_W */
        if(sy.w - (AV + Math.max(0, MARGIN-8)) > 0.5)
          viol.push({tag,行:i,类型:'越出纸面',差:+(sy.w-AV-MARGIN+8).toFixed(1)});
        sy.measures.forEach(lm=>[...lm.L.tabs,...lm.L.voxes].forEach(rr=>{
          if(rr && rr.xs && rr.xs.length && Math.max(...rr.xs) > lm.L.w + 1)
            viol.push({tag,行:i,类型:'列超出小节宽',mi:lm.mi});
        }));
      });
    };
    PRESETS.forEach((P,i)=>{ loadSong(P.make()); blurSel=true; render(); check('预设'+i); });
    [[1,1],[2,1],[2,2],[3,2]].forEach(([nTab,nVox])=>{
      [900,1060,1400].forEach(pw=>{
        loadSong(createSong('tanchang',{beats:4,unit:4,key:'C',nMea:16,nTab:nTab,nVox:nVox,lyr:2}));
        PAGE_W = pw;
        song.measures.forEach((m,mi)=>{
          if(mi%5===0){ m.beats=2; m.unit=4; }
          const nb=m.beats||4;
          for(let v=0;v<nVox;v++) m.voxes[v]=Array.from({length:nb*4},(_,i)=>({dur:16,dotted:false,
            deg:1+(i%7),acc:'',oct:0,tie:false,lyrics:[i%3===0?'阳光':'啊', i%4===0?'温暖':'呀']}));
          for(let t=0;t<nTab;t++) m.tabs[t]=Array.from({length:nb*4},(_,i)=>({dur:16,dotted:false,
            chord:i===0?'Dm':'',strum:'',tech:'',notes:[{s:1+(i%4), f:[9,11,12,14,16,13,11,10][i%8]}]}));
        });
        blurSel=true; render();
        check('合成 tab'+nTab+' vox'+nVox+' pw'+pw);
      });
    });
    PAGE_W = 1060;
    return {违规数:viol.length, 样例:viol.slice(0,6)};
  })()`);
  T(r.违规数 === 0, 'T8 版面不变量：16 首预设 + 12 组合成密集谱，谱线与内容始终等宽、列不越出小节、不越出纸面', JSON.stringify(r));

  // T9 密度包络：把「排得下」的边界钉住，越界时的兜底也要是压缩而不是画出纸面
  //    实测（16 号歌词 / 17 号简谱）：单字音节撑到 24 字/小节仍为正，双字撑到 12 字/小节；
  //    真实中文歌一小节至多 8–16 个字，故常用区间有充足余量。
  r = await pg.evaluate(HELP + `(()=>{
    const g=(fs)=>{ const arr=__gaps(e=>e.fs===fs && e.fam==='var(--font-ui)');
      return arr.length? +Math.min(...arr).toFixed(2) : null; };
    const run=(doc,n,word)=>{
      loadSong(createSong(doc, doc==='vocal'
        ? {beats:4,unit:4,key:'C',nMea:4,nVox:1,lyr:2}
        : {beats:4,unit:4,key:'C',nMea:4,nTab:2,nVox:1,lyr:2}));
      const dur = n<=4?4 : n<=8?8 : n<=16?16 : 32;
      song.measures.forEach(m=>{
        m.voxes[0]=Array.from({length:n},(_,i)=>({dur:dur,dotted:false,deg:1+(i%7),acc:'',oct:0,
          tie:false,lyrics:[word,word]}));
        (m.tabs||[]).forEach((_,t)=>{ m.tabs[t]=Array.from({length:8},(_,i)=>({dur:8,dotted:false,
          chord:'',strum:'',tech:'',notes:[{s:3,f:i%5}]})); });
      });
      blurSel=true; render();
      return {歌词:g(16), 简谱:g(17)};
    };
    const out={};
    ['vocal','tanchang'].forEach(d=>{
      [8,16,24].forEach(n=>{ out[d+'·单字'+n]=run(d,n,'啊'); });
      [8,12].forEach(n=>{ out[d+'·双字'+n]=run(d,n,'阳光'); });
    });
    return out;
  })()`);
  T(Object.values(r).every(v=>v.歌词!==null && v.歌词 > 0 && v.简谱 > 0),
    'T9 密度包络：单字 ≤24 字/小节、双字 ≤12 字/小节，歌词与简谱净距全为正', JSON.stringify(r));

  /* T10 复刻产品送来的真实弹唱谱形制（《难忘的一天》56 小节：吉他1 十六分分解 16 列、
     吉他2 8 列、简谱 1 声部 2 段歌词、20 处 pull=1、3 处 brk=1、3 处 wf≠1）。
     这份谱在 v60.74 上一量：1280px 172 处负净距（最深 −5.91）、390px 264 处（最深 −7.34），
     每行小节数在 1/2/3/5 之间乱跳——正是产品报告的三条。这里用等形制的合成谱钉住：
     ① 三类文字在四档版宽下都无负净距；② 弹唱段每行至少排到两个小节（不再一行一小节）。
     不落用户曲谱原文件，只复刻形制。 */
  const T10 = HELP + `(()=>{
    loadSong(createSong('tanchang',{beats:4,unit:4,key:'C',nMea:56,nTab:2,nVox:1,lyr:2}));
    const LY1='难忘的一天阳光温暖照进我心里再一次拥进我怀里这是我难忘的一天在隐忍和冲动之间';
    const LY2='走过我身边风吹起的青春年少那些甜蜜过往如果已经变成回忆就让它留在昨天里';
    song.measures.forEach((m,mi)=>{
      const 间奏 = mi>=38;                         // 后段是间奏/独奏：无词、双吉他各自密集
      m.tabs[0]=Array.from({length:16},(_,i)=>({dur:16,dotted:false,
        chord:i===0?['Am','Dm','G7','C','E'][mi%5]:'',strum:'',tech:'',
        notes:[{s:1+(i%5), f:间奏? [9,11,12,14,10,13][i%6] : [0,2,1,2,0,3][i%6]}]}));
      m.tabs[1]=Array.from({length:间奏?24:8},(_,i)=>({dur:间奏?32:8,dotted:false,chord:'',strum:'',tech:'',
        notes:[{s:5+(i%2), f:间奏? [12,14,15][i%3] : [0,2,3][i%3]}]}));
      const nV = 间奏? 14 : [4,8,10,12][mi%4];
      m.voxes[0]=Array.from({length:nV},(_,i)=>{
        /* 真实弹唱谱里并非每个音符都有字（原谱 8~13 列里 5~10 列带词），照此比例复刻 */
        const 带词 = !间奏 && i%3!==1;
        return {dur:nV<=4?4:nV<=8?8:16, dotted:false, deg:1+((mi+i)%7), acc:'', oct:0, tie:false,
          lyrics: 带词? [LY1[(mi*3+i)%LY1.length], LY2[(mi*5+i)%LY2.length]] : ['','']};
      });
      if(mi%3===2) m.pull=1;                       // 复刻 20 处 pull
      if(mi===45||mi===49||mi===51) m.brk=1;
      if(mi===48) m.wf=1.28; if(mi===51) m.wf=0.81; if(mi===54) m.wf=0.66;
    });
    blurSel=true; render();
    const f=g=>({n:g.length, min:g.length?+Math.min(...g).toFixed(2):null, 负:g.filter(v=>v<0).length});
    const S=layoutSystems();
    const 弹唱行=S.filter(sy=>sy.measures.every(lm=>lm.mi<38));
    return {版宽:PAGE_W, 简谱:f(__gaps(__isJP)), 歌词:f(__gaps(__isLY)), 品位:f(__gaps(__isFR)),
      行数:S.length,
      弹唱段每行小节:+(弹唱行.reduce((a,sy)=>a+sy.measures.length,0)/Math.max(1,弹唱行.length)).toFixed(2)};
  })()`;
  const t10 = {};
  for(const [w,h] of [[1280,950],[834,1112],[430,932]]){    // 桌面 / 平板 / 手机
    await pg.setViewportSize({width:w, height:h});
    await pg.waitForTimeout(120);
    t10[w+'px'] = await pg.evaluate(T10);
  }
  await pg.setViewportSize({width:1280, height:950});
  r = t10;
  /* 每行小节数的门槛按版宽分档：手机版宽 382px 装不下两个十六分双吉他小节是物理事实，
     不强求；桌面/平板必须至少排到 1.6（改前实测桌面 1.0＝一行一小节，或靠硬压出重叠）。 */
  T(Object.values(r).every(v=>v.简谱.负===0 && v.歌词.负===0 && v.品位.负===0)
    && r['1280px'].弹唱段每行小节 >= 1.6 && r['834px'].弹唱段每行小节 >= 1.6
    && r['430px'].弹唱段每行小节 >= 1.3,
    'T10 真实弹唱谱形制（56 小节·双吉他十六分·2 段词·pull/brk/wf 齐全）：桌面/平板/手机三档视口下三类文字零负净距，弹唱段每行 ≥1.6/1.6/1.3 小节',
    JSON.stringify(r));

  /* T11 × 记号不压小节线（产品截图：分解和弦最后一个 × 骑在小节线上）。
     两个根因都钉住：① × 的字形比品位数字宽得多（15 号墨迹 9.0 / 打板 16 号 10.0，
     而品位 10.5 号只有 6.0），过去列刚杆一律按品位数字给；② 音符画在「布局位置＋NOTE_OFF(10)」，
     这 10px 全由右内边距买单，右边距压到 6 时末列到小节线只剩 3.3px。
     改前实测：产品那份真实谱 23 处 × 与小节线相交。 */
  r = await pg.evaluate(HELP + `(()=>{
    const run=(kind)=>{
      loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:12,nTab:1,nVox:0,lyr:0}));
      song.measures.forEach(m=>{
        m.tabs[0]=Array.from({length:16},(_,i)=>{
          const c={dur:16,dotted:false,chord:'',strum:'',tech:'',notes:[{s:2+(i%3),f:0,x:true}]};
          if(kind==='perc'){ c.perc='bass'; c.notes=[]; }
          return c;
        });
      });
      blurSel=true; render();
      const svg=document.getElementById('score');
      /* 小节线＝线粗 1 的竖线；符干与音符同 x，按设计如此，排除 */
      const vl=[...svg.querySelectorAll('line')].map(l=>({x:+l.getAttribute('x1'),x2:+l.getAttribute('x2'),
        y1:+l.getAttribute('y1'),y2:+l.getAttribute('y2'),sw:+(l.getAttribute('stroke-width')||1)}))
        .filter(l=>Math.abs(l.x-l.x2)<0.3 && Math.abs(l.y2-l.y1)>10 && l.sw>=0.95 && l.sw<=1.05);
      const xs=[...svg.querySelectorAll('text')].filter(t=>t.textContent==='×').map(t=>{
        const q=t.getBBox();
        return {fs:+t.getAttribute('font-size'), cx:+t.getAttribute('x'),
          l:q.x, r:q.x+q.width, top:q.y, bot:q.y+q.height};});
      let cross=0, minBar=99;
      xs.forEach(e=>vl.forEach(l=>{
        if(l.y2<e.top-1 || l.y1>e.bot+1) return;
        if(Math.abs(l.x-e.cx)<0.4) return;
        const d = l.x<e.l? e.l-l.x : (l.x>e.r? l.x-e.r : -1);
        if(d<minBar) minBar=+d.toFixed(2);
        if(d<0) cross++;
      }));
      /* 相邻 × 之间的净距（同一根弦上） */
      const g=__gaps(e=>e.t==='×');
      return {n:xs.length, 压线:cross, 离线最近:xs.length&&minBar<99? minBar:null,
        相邻最小净距:g.length? +Math.min(...g).toFixed(2):null, 负:g.filter(v=>v<0).length};
    };
    return {分解x:run('x'), 打板x:run('perc')};
  })()`);
  T(r.分解x.压线===0 && r.打板x.压线===0 && r.分解x.负===0 && r.打板x.负===0
    && r.分解x.离线最近 >= 1.5 && r.打板x.离线最近 >= 1.5,
    'T11 × 记号（分解 15 号 / 打板 16 号）：十六分满小节下不压小节线、相邻不重叠', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
