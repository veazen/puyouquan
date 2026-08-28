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
    window.__isJP=e=>e.fs===16 && e.fam==='var(--font-ui)';
    window.__isLY=e=>e.fs===15;
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

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
