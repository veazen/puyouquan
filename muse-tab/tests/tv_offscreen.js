/* v67.5 render() 离屏目标（新建曲谱方案 docs/design-2026-10e「实时预览的正式实现」，拍板 7；评审 owner「正式版不得临时换全局 song，补回归断言」）
   接口：render({song, target:<svg>, maxSystems, paperW, fixed, crop}) → renderOffscreen；面板包装 renderPreview(spec, svgEl, opt)
   （spec＝曲谱数据，或 {type, o, post} 走现有 createSong）。
   T1 逐字节护栏（红线）：正常 render() 的 #score 输出——16 预设 + 多类谱（歌谱 / 合唱 / 器乐五线谱三谱号 / 教学对照 / 吉他·尤克里里弹唱 / 独奏联排 /
      钢琴独奏 / 钢琴弹唱 / 功能谱 / 和弦谱 / 钢琴伴奏歌谱 JG·SG·SJG / 一键配伴奏产物）× 选中态（无光标 / 简谱列 / TAB 列 / 整小节）× 1280/390 宽：
      ① 每份「正常渲染 → 两次离屏预览（别的谱）→ 再正常渲染」前后逐字节相同；② 设 MUSETAB_REF=v67.3 页面时与参考版 #score 逐字节相同
   T2 离屏不变量：两个窗口、有撤销 / 重做栈、有选区 / 多选 / 整小节选中时，交替离屏渲染 50 次（6 种谱、挂在文档里 / 游离的两块 <svg>）——
      musetab-song-v1 / musetab-docs-v1 字节、撤销 / 重做栈、sel 及选区一族、#paper 尺寸 / style / class、body 类、#score 内容、窗口数 / 当前窗口全部不变；
      并对页面脚本**全部顶层 let/var 绑定**与 RENDER_STAT 做前后快照逐个比较（0 处变化）；600 ms 后没有排队的落盘
   T3 首行一致：同一份谱「离屏（paperW=660）」与「当成当前谱、#paper 定宽 660 正常渲染」——不限行数时除播放头 / 播放竖线外逐字节相同；
      只排首行（maxSystems:1）时是正常渲染的有序子序列，且正常渲染里落在首行及页头范围内的元素一个不少（4 种面板样张 + 16 预设）
   T4 耗时：只排首行，引擎中位 ≤10 ms（4 种面板样张 + 《小星星》预设各自的中位；另报 16 预设 P95）
   T5 接口：事件对象 / 无 song 的对象仍走正常渲染；{type,o,post} 走 createSong 且不进窗口；holdRender 期间照样同步出图；不可重入；
      输出无 id（不与 #playhead / #playline 重名）、有 viewBox / 宽高；返回行数 / 已画行数 / 预览自己的 colBoxes
   验收收尾补（每条修前红、修后绿）：
   T2a 另比顶层 const 对象内容（只许纯记忆缓存新增、再跑一轮零变化），顶层扫描补收「const …; let _syncing」同行声明
   T6 模式无关：1280 / 390 × 歌词页 / 小节手柄 / 打印分页 / 观看页 / 谱架 / 不换行本机键 / 大字 / 缩放 / 深色，同一份预览逐字节相同
   T7 目标防呆（#score / #score 内元素 / HTML 元素 → null）；T8 post 在借用里执行；T9 字体缓存随容器；
   T10 配色变量 / 曲谱反色与 #score 一致、预览元素不接收指针、真实点击预览不打掉编辑器光标
   突变实证（收尾）：对实现者交付版跑 8/13（T6～T10 红）；把窄屏重排 / 不换行 / 歌词页 / 观看页分页 / pq-offscore 类 / 全局点外豁免 /
   prep / 字体按父节点重量 / 目标防呆 任一处改回，各自对应断言当场红。
   突变实证：对 v67.3 原版（MUSETAB_URL=…/v673.html）跑 2/13——T2a～T10 报红（render 忽略参数、无 renderPreview / renderOffscreen）；
   T1a（旧版无离屏可调，退化为自洽）与「无页面报错」两版都绿。T2a 灵敏度：把 renderOffscreen 的 colBoxes 归还或 LAST_PAPER_W 归还删掉、
   或让离屏照样刷左栏（renderDock）/ 同步输入框（syncInputs），各自当场红。T1b 设 MUSETAB_REF=v67.3 时对拍 218 份 #score 逐字节。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const REF = process.env.MUSETAB_REF || '';

/* 页面内构造器（v67.3 与本版都有的全局函数；不用斜线和弦 / 新织体，两版生成的谱逐字节相同） */
const BUILD = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false; try{ hideStartPad(); }catch(_){}
  const V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  const T=(dur,notes,o)=>Object.assign({dur, dotted:false, chord:'', notes:(notes||[]).map(([s,f])=>({s,f})), strum:'', tech:''}, o||{});
  const MEL=[[1,1,5,5],[6,6,[5,2]],[4,4,3,3],[2,2,[1,2]]], LY=[['一','闪','一','闪'],['亮','晶','晶'],['满','天','都','是'],['小','星','星']];
  const CH=[['C'],['F',null,'C'],['F',null,'C'],['G7',null,'C']];
  const melCols=(mi,o)=>MEL[mi].map((x,i)=>{ const a=Array.isArray(x)?x:[x,4]; return V(a[0],a[1],{lyrics:o.ly?[LY[mi][i]]:[], chord:o.ch?(CH[mi][i]||''):''}); });
  const ARP={C:[[5,3],[3,0],[2,1],[3,0]], F:[[4,3],[3,2],[2,1],[3,2]], G7:[[6,3],[3,0],[2,0],[1,1]]};
  const arp=mi=>{ const h=mi===0?['C','C']:mi===3?['G7','C']:['F','C']; const o=[]; for(let i=0;i<8;i++){ const c=h[i<4?0:1]; o.push(T(8,[ARP[c][i%4]],{chord:(i%4===0 && !(i===4&&h[0]===h[1]))?c:''})); } return o; };
  const fill=(s,f)=>{ s.measures.forEach((m,mi)=>f(m,mi)); s.measures[s.measures.length-1].finalBar=true; return s; };
  const S={};
  /* 面板四种样张（README：钢琴伴奏歌谱 / 教学对照谱 / 吉他弹唱谱 / 视唱五线谱），《小星星》前 4 小节 */
  S.jg=()=>{ const m=fill(createSong('vocal',{title:'小星星',composer:'法国民谣',key:'C',beats:4,unit:4,tempo:72,nMea:4,nVox:1,lyr:1}), (mm,mi)=>{ mm.voxes[0]=melCols(mi,{ly:1,ch:1}); });
    const r=arrangeAccompaniment(m,{texId:'slow', suggest:false}).song; r.title='小星星'; r.voxNotations=[undefined,'staff','bass']; delete r.voxDual; r.voxGroups=[{type:'brace',from:1,to:2}]; return r; };
  S.sjg=()=>{ const r=S.jg(); r.voxNotations=['staff','staff','bass']; r.voxDual=[true,false,false]; return r; };
  S.sg=()=>{ const r=S.jg(); r.voxNotations=['staff','staff','bass']; return r; };
  S.arrOut=()=>{ const m=fill(createSong('vocal',{title:'配伴奏产物',key:'G',beats:3,unit:4,nMea:4,nVox:1,lyr:1}), (mm,mi)=>{ mm.voxes[0]=[V(1,4),V(3,4),V(5,4,{lyrics:['啊']})]; });
    return arrangeAccompaniment(m,{texId:'waltz'}).song; };
  S.teach=()=>fill(createSong('teach',{title:'小星星',key:'C',beats:4,unit:4,tempo:88,nMea:4,nVox:1,lyr:1}), (m,mi)=>{ m.voxes[0]=melCols(mi,{ly:1}); });
  S.jt=()=>fill(createSong('tanchang',{title:'小星星',inst:'guitar',key:'C',beats:4,unit:4,tempo:80,nMea:4,nTab:1,nVox:1,lyr:1}), (m,mi)=>{ m.voxes[0]=melCols(mi,{ly:1}); m.tabs[0]=arp(mi); });
  S.sight=()=>fill(createSong('instr',{title:'视唱谱例',key:'C',beats:4,unit:4,tempo:72,nMea:4,nVox:1,clef:'staff',lyr:0}), (m,mi)=>{ m.voxes[0]=melCols(mi,{}); });
  /* 其余谱类（空谱 + 少量内容） */
  S.vocal=()=>createSong('vocal',{title:'空简谱',nMea:6,nVox:1,lyr:1});
  S.choir=()=>fill(createSong('vocal',{title:'三部合唱',nMea:3,nVox:3,lyr:1}), (m,mi)=>{ m.voxes[0]=[V(3,4,{lyrics:['啊']}),V(2,4),V(1,2)]; m.voxes[1]=[V(1,2),V(7,2,{oct:-1})]; m.voxes[2]=[V(5,1,{oct:-1})]; });
  S.bassClef=()=>createSong('instr',{title:'低音谱号',nMea:5,nVox:1,clef:'bass',lyr:0});
  S.alto=()=>createSong('instr',{title:'中音谱号',key:'Eb',beats:3,unit:4,nMea:5,nVox:1,clef:'alto',lyr:0});
  S.uku=()=>fill(createSong('tanchang',{title:'尤克里里',inst:'uku',key:'G',beats:4,unit:4,nMea:3,nTab:1,nVox:1,lyr:1}), (m,mi)=>{ m.tabs[0]=[T(4,[[1,0]],{chord:'G'}),T(4,[[2,3]]),T(4,[[3,2]]),T(4,[[4,0]])]; });
  S.solo=()=>createSong('solo',{title:'独奏联排',nMea:4,nTab:1,nVox:0,lyr:0});
  S.piano=()=>createSong('piano',{title:'钢琴独奏',key:'D',nMea:4,lyr:0});
  S.pacc=()=>fill(createSong('pianoacc',{title:'钢琴弹唱',nMea:4,lyr:1}), (m,mi)=>{ m.voxes[0][0].chord=['C','Am','F','G'][mi]; });
  S.func=()=>fill(createSong('func',{title:'功能谱',ftype:'func',nMea:4,nVox:1,lyr:1}), (m,mi)=>{ m.voxes[0]=melCols(mi,{ly:1,ch:1}); });
  S.chord=()=>createSong('func',{title:'和弦谱',ftype:'chord',nMea:8,nVox:1,lyr:0});
  S.six8=()=>createSong('vocal',{title:'六八拍',beats:6,unit:8,nMea:4,nVox:1,lyr:2});
  window.__S=S;
  window.__corpus=()=>{ const out=Object.keys(S).map(k=>[k, S[k]]); PRESETS.forEach((p,i)=>out.push(['preset'+i, ()=>p.make()])); return out; };
  return Object.keys(S).length; })()`;

/* 顶层 const 里的纯记忆缓存（键＝输入：文字 + 字号 + 字体 / 和弦名 / 字形名…，值与当前谱无关）：离屏首次排新谱时可新增条目，不算泄漏 */
const CONST_CACHES = ['HEAD_TW', 'HD_TW', 'PROG_TAG_CACHE'];
/* 选中态（同 tv_jpsame T2 口径：null＝点空白隐藏光标） */
const SELS = [null, { row: 'vox', vi: 0, mi: 0, ci: 1 }, { row: 'tab', vi: 0, mi: 1, ci: 0 }, { meas: 1 }];
const SNAP = `((SELS)=>{ const res=[]; const off=typeof renderPreview==='function';
  const pv=off? (window.__pvSvg || (window.__pvSvg=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg')))) : null;
  const keys=Object.keys(__S); let rot=0;
  __corpus().forEach(([name, mk])=>SELS.forEach((sl,k)=>{
    undoStack.length=0; redoStack.length=0;
    const s=mk(); loadSong(s);
    if(sl && sl.row==='tab' && !(song.tabVoices||[]).length) return;
    if(sl && sl.row==='vox' && !(song.voxVoices||[]).length) return;
    const setSel=()=>{ measureSel=null; if(!sl) blurSel=true; else if(sl.meas!=null){ blurSel=false; measureSel=sl.meas; } else { blurSel=false; sel=Object.assign({si:1}, sl); } };
    setSel(); render(); const h0=document.getElementById('score').innerHTML;
    let h1=h0, pst=null;
    if(off){ const P=document.getElementById('paper'); const st0=P.getAttribute('style')+'|'+P.className+'|'+document.body.className;
      renderPreview(__S[keys[rot++%keys.length]](), pv); renderPreview(__S[keys[rot++%keys.length]](), pv, {maxSystems:0});
      pst=(P.getAttribute('style')+'|'+P.className+'|'+document.body.className)===st0;
      render(); h1=document.getElementById('score').innerHTML; }
    res.push({id:name+'#'+k, h:h0, same:h1===h0, pst});
  }));
  return res; })`;

/* 顶层 let/var（及 const，另收）绑定名（逐行扫描列 0 的声明，按顶层逗号切分声明符；解构声明跳过；
   同一行 const 后接的 let 也收——验收：「const _cloudTimers = {}; let _syncing = false;」此前整行被跳过） */
function topBindings(html, consts) {
  const names = new Set();
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    if (/src=|ld\+json/.test(m[1])) continue;
    m[2].split('\n').forEach(line => {
      let rest = line;
      while (rest) {
        const d = /^\s*(let|var|const)\s+(.*)$/.exec(rest); if (!d || (rest === line && /^\s/.test(line))) return;   // 只认列 0 起的声明（同一行后续语句可接着声明）
        const into = d[1] === 'const' ? consts : names;
        let depth = 0, q = '', seg = '', i = 0, end = -1;
        const segs = [], src = d[2];
        for (; i < src.length; i++) { const ch = src[i];
          if (q) { seg += ch; if (ch === '\\') { seg += src[++i] || ''; continue; } if (ch === q) q = ''; continue; }
          if (ch === '"' || ch === "'" || ch === '`') { q = ch; seg += ch; continue; }
          if (ch === '/' && src[i + 1] === '/') break;
          if ('([{'.includes(ch)) depth++;
          if (')]}'.includes(ch)) depth--;
          if (depth === 0 && (ch === ',' || ch === ';')) { segs.push(seg); seg = ''; if (ch === ';') { end = i; break; } continue; }
          seg += ch;
        }
        if (end < 0 && seg.trim()) segs.push(seg);
        segs.forEach(sg => { const n = /^\s*([A-Za-z_$][\w$]*)\s*(=|$)/.exec(sg); if (n && into) into.add(n[1]); });
        rest = end >= 0 ? src.slice(end + 1) : '';
      }
    });
  }
  return [...names];
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  const nS = await pg.evaluate(BUILD);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);

  /* ===== T1 逐字节护栏 ===== */
  {
    const snap = page => page.evaluate('(' + SNAP + ')(' + J(SELS) + ')');
    let n = 0; const bad = [], badSelf = [], badPst = [];
    let pr = null;
    if (REF) { pr = await b.newPage({ viewport: { width: 1280, height: 900 } }); pr.on('pageerror', e => errs.push('REF:' + e.message)); await pr.goto(REF); await pr.waitForTimeout(900); await pr.evaluate(BUILD); }
    for (const wd of [1280, 390]) {
      await pg.setViewportSize({ width: wd, height: 900 }); if (pr) await pr.setViewportSize({ width: wd, height: 900 });
      await pg.waitForTimeout(150);
      const A = await snap(pg), B = pr ? await snap(pr) : null;
      A.forEach((x, k) => { n++;
        if (!x.same) badSelf.push(wd + ':' + x.id); if (x.pst === false) badPst.push(wd + ':' + x.id);
        if (B) { const y = B[k]; if (!y || y.id !== x.id || y.h !== x.h) { let i = 0; if (y) while (i < x.h.length && x.h[i] === y.h[i]) i++; bad.push(wd + ':' + x.id + (y ? ' @' + i + ' ' + x.h.slice(Math.max(0, i - 40), i + 50) : ' missing')); } } });
    }
    if (pr) await pr.close();
    await pg.setViewportSize({ width: 1280, height: 900 }); await pg.waitForTimeout(150);
    T(n >= 200 && badSelf.length === 0 && badPst.length === 0, 'T1a 正常渲染 → 两次离屏预览 → 再正常渲染：' + n + ' 份（' + nS + ' 类谱 + 16 预设 × 4 种选中态 × 1280/390）#score 前后逐字节相同，#paper / body 不变',
      J({ badSelf: badSelf.slice(0, 4), badPst: badPst.slice(0, 4) }));
    if (REF) T(n >= 200 && bad.length === 0, 'T1b 正常渲染与参考版（' + REF.split('/').pop() + '）#score 逐字节相同：' + n + ' 份', bad.slice(0, 3).join(' || '));
    else console.log('ℹ️  T1b 跳过（未设 MUSETAB_REF；发版前设为 v67.3 页面对拍）');
  }

  /* ===== T2 离屏不变量（50 次交替）===== */
  {
    let html = ''; try { html = fs.readFileSync(decodeURIComponent(F.replace(/^file:\/\//, '')), 'utf8'); } catch (_) { html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8'); }
    const CONSTS = new Set(), NAMES = topBindings(html, CONSTS);
    const r = await pg.evaluate(`((NAMES, CONSTS, CACHE)=>{
      const ser=(v)=>{ const seen=new WeakSet();
        const f=(x,d)=>{ if(x===null||typeof x!=='object'&&typeof x!=='function') return x===undefined?'∅':x;
          if(typeof x==='function') return 'ƒ';
          if(x.nodeType) return '<'+x.nodeName+(x.id?'#'+x.id:'')+'>';
          if(seen.has(x)) return '↺'; seen.add(x);
          if(d>7) return '…';
          if(x instanceof Map) return ['Map',[...x].map(e=>f(e,d+1))];
          if(x instanceof Set) return ['Set',[...x].map(e=>f(e,d+1))];
          if(ArrayBuffer.isView(x)) return 'buf'+x.length;
          if(Array.isArray(x)) return x.map(e=>f(e,d+1));
          const o={}; Object.keys(x).forEach(k=>{ try{ o[k]=f(x[k],d+1); }catch(_){ o[k]='?'; } }); return o; };
        try{ return JSON.stringify(f(v,0)); }catch(e){ return 'ERR'; } };
      /* 顶层 const 对象 / 数组 / Map / Set 的内容（验收：const 对象内部被改写，let/var 扫描兜不住） */
      const snapC=()=>{ const o={}; CONSTS.forEach(n=>{ try{ const v=eval(n); if(v && typeof v==='object' && !(v instanceof WeakMap) && !(v instanceof WeakSet)) o[n]=ser(v); }catch(e){} }); return o; };
      const snap=()=>{ const o={}; NAMES.forEach(n=>{ try{ o[n]=ser(eval(n)); }catch(e){ o[n]='TDZ'; } }); o.RENDER_STAT=ser(RENDER_STAT);
        const P=document.getElementById('paper'), R=P.getBoundingClientRect();
        o.$paper=[P.getAttribute('style'), P.className, P.clientWidth, P.clientHeight, R.width, R.height].join('|');
        o.$body=document.body.className; o.$score=document.getElementById('score').innerHTML; o.$scoreAttr=['viewBox','width','height'].map(a=>document.getElementById('score').getAttribute(a)).join('|');
        o.$ls=[localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\\u0001');
        o.$ids=document.querySelectorAll('[id="playhead"],[id="playline"]').length;
        /* 整个页面 DOM（左右栏 / 页签 / 顶栏 / 谱面）与全部输入控件的值：离屏不得刷新左栏（renderDock）、不得同步输入框（syncInputs） */
        o.$dom=document.body.innerHTML; o.$inputs=[...document.querySelectorAll('input,select,textarea')].map(e=>e.type==='checkbox'||e.type==='radio'? e.checked : e.value).join('\u0001');
        return o; };
      /* 两个窗口；当前窗口有撤销 / 重做栈、光标在简谱第 2 小节第 3 列、Ctrl 多选、整小节选中 */
      addDoc(__S.jt());
      addDoc(__S.teach());
      mutate(()=>{ song.measures[0].voxes[0][0].deg=3; }); mutate(()=>{ song.measures[1].voxes[0][1].deg=2; }); undo();
      sel={mi:1, row:'vox', vi:0, ci:2, si:1}; blurSel=false; noteSel=[{row:'vox',mi:0,ci:1,vi:0}]; measureSel=2; render(); persistNow();
      const a=snap();
      const on=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg')), loose=document.createElementNS('http://www.w3.org/2000/svg','svg');
      /* 最后一次（i=49 → specs[1]）是吉他弹唱谱，与当前窗口的教学对照谱谱类不同：离屏若误刷左栏 / 输入框，快照必然不同 */
      const specs=[__S.jg, __S.jt, __S.teach, __S.sight, ()=>PRESETS[0].make(), ()=>({type:'tanchang', o:{title:'空弹唱', inst:'uku', nTab:1, nVox:1, lyr:1, nMea:8}})];
      let ok=0, maxSys=0;
      const ca=snapC();
      /* v68.6 有意迁移（规格 §6.5）：交替排的谱里加入分谱——当前窗口（教学对照谱）的派生副本（partSong）＋钢琴伴奏歌谱带分谱选项（part：分谱名 / 续页眉 / keepSolo），
         放在每轮最后：钢琴伴奏歌谱的 LYR_PNO 非空、当前窗口为空——renderOffscreen 的 K 表漏还 LYR_PNO 时快照当场不同（修前红：v68.5 引擎不还 LYR_PNO，此前最后一次是吉他弹唱谱、两边都空，看不出来）。
         只走 renderOffscreen，不经分谱缓存（PART_CACHE / PART_SVG 是分谱自己的缓存，见 tv_parts PA11）；旧版没有 partSong 时跳过分谱副本、只排钢琴伴奏歌谱 */
      let okP=0;
      const parts=()=>{ if(typeof partSong==='function'){ const d=partSong({id:'v0', kind:'voice', name:'旋律', tab:[], vox:[0], opt:false, scoreEq:false, ord:0}, {brk:false});
          const r1=renderOffscreen({song:d.song, target:on, paperW:870, fixed:true, crop:false, part:{name:'旋律', run:true, keepSolo:d.keepSolo}}); if(r1 && r1.drawn>=1) okP++; }
        const r2=renderOffscreen({song:__S.jg(), target:loose, paperW:660, part:{name:'钢琴伴奏', run:true, keepSolo:false}}); if(r2 && r2.drawn>=1) okP++; };
      const loop=()=>{ for(let i=0;i<50;i++){ const r=renderPreview(specs[i%specs.length](), i%2? loose : on, {maxSystems: i%3? 1 : 0}); if(r && r.drawn>=1) ok++; if(r) maxSys=Math.max(maxSys, r.drawn); } parts(); };
      loop();
      const cb=snapC();
      const onN=on.childElementCount; on.remove();
      const b=snap();
      const diff=Object.keys(a).filter(k=>a[k]!==b[k]);
      /* const：第一轮只许纯记忆缓存（按输入取值、与谱无关的量宽 / 字形缓存）有新增；再跑一轮必须一字不变（无累积写入） */
      document.body.appendChild(on); loop(); on.remove(); const cc=snapC();
      const cdiff1=Object.keys(ca).filter(k=>ca[k]!==cb[k] && !CACHE.includes(k)), cdiff2=Object.keys(cb).filter(k=>cb[k]!==cc[k]), cacheHit=Object.keys(ca).filter(k=>ca[k]!==cb[k] && CACHE.includes(k));
      ok = Math.round(ok/2);
      window.__invA=a.$ls;
      return {n:NAMES.length, nc:Object.keys(ca).length, cdiff1, cdiff2, cacheHit, ok, okP, maxSys, diff, docs:docs.length, cur:curDocI, undo:undoStack.length, redo:redoStack.length,
        onChildren:onN, looseChildren:loose.childElementCount, ids:on.querySelectorAll('[id]').length+loose.querySelectorAll('[id]').length}; })(${J(NAMES)}, ${J([...CONSTS])}, ${J(CONST_CACHES)})`).catch(e => ({ err: e.message, diff: [e.message] }));
    T(r.n >= 100 && r.ok === 50 && r.okP >= 2 && r.diff.length === 0 && r.docs >= 2 && r.undo >= 1 && r.redo === 1 && r.onChildren > 20 && r.looseChildren > 20 && r.ids === 0 && r.maxSys > 1
      && NAMES.includes('_syncing') && r.nc >= 80 && r.cdiff1.length === 0 && r.cdiff2.length === 0,
      'T2a 交替离屏渲染 50 次（6 种谱、文档内 / 游离两块 svg、首行 / 全曲）＋每轮末尾分谱（v68.6：派生副本＋钢琴伴奏歌谱带分谱选项，' + r.okP + ' 次）：' + r.n + ' 个顶层 let/var 绑定（含同行 const 后的 _syncing）+ ' + r.nc + ' 个顶层 const 对象内容（只有纯记忆缓存 ' + J(r.cacheHit) + ' 可新增，再跑一轮零变化）+ RENDER_STAT + musetab-song-v1 / musetab-docs-v1 字节 + #paper 尺寸·style·class + body 类 + #score + 整页 DOM（左右栏 / 页签）+ 全部输入控件值 前后相同；撤销 ' + r.undo + ' / 重做 ' + r.redo + '、窗口 ' + r.docs + ' 个不变；输出无 id',
      J({ diff: r.diff.slice(0, 8), cdiff1: r.cdiff1, cdiff2: r.cdiff2, ok: r.ok, okP: r.okP, ids: r.ids, maxSys: r.maxSys }));
    await pg.waitForTimeout(650);
    const r2 = await pg.evaluate(`({same:[localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\\u0001')===window.__invA, pending:!!persist.pending})`);
    T(r2.same && !r2.pending, 'T2b 600 ms 后本机存储字节仍不变、没有排队的落盘（离屏不触发 persist）', J(r2));
  }

  /* ===== T3 首行一致 ===== */
  {
    const r = await pg.evaluate(`(()=>{
      const P=document.getElementById('paper'), st0=P.getAttribute('style');
      const fixW=w=>{ P.style.width=w+'px'; P.style.maxWidth=w+'px'; P.style.minWidth=w+'px'; const d=P.clientWidth-w; if(d){ const w2=w-d; P.style.width=w2+'px'; P.style.maxWidth=w2+'px'; P.style.minWidth=w2+'px'; } return P.clientWidth; };
      const svg=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));
      const strip=h=>h.replace(/<rect id="playhead"[^>]*><\\/rect>/,'').replace(/<line id="playline"[^>]*><\\/line>/,'');
      const list=[['jg',__S.jg],['teach',__S.teach],['jt',__S.jt],['sight',__S.sight]].concat(PRESETS.map((p,i)=>['preset'+i, ()=>p.make()]));
      const full=[], first=[]; let multi=0, cw=0;
      list.forEach(([name, mk])=>{
        const s=migrate(mk()), fx=!!(s.layout&&s.layout.fixed);
        render({song:JSON.parse(JSON.stringify(s)), target:svg, paperW:660, fixed:fx, maxSystems:0, crop:false});
        const offAll=svg.innerHTML;
        const r1=render({song:JSON.parse(JSON.stringify(s)), target:svg, paperW:660, fixed:fx, maxSystems:1});
        const off1=[...svg.children].map(e=>e.outerHTML);
        undoStack.length=0; loadSong(JSON.parse(JSON.stringify(s)));
        blurSel=true; noteSel=[]; barSel=null; selRange=null; measureSel=null; measureRange=null; lyrSel=null; meaHandleOn=false; cw=fixW(660); render();
        const sc=document.getElementById('score'), nm=strip(sc.innerHTML);
        if(nm!==offAll){ let i=0; while(i<nm.length && nm[i]===offAll[i]) i++; full.push(name+' @'+i+' '+offAll.slice(Math.max(0,i-30),i+40)+' ≠ '+nm.slice(Math.max(0,i-30),i+40)); }
        /* 首行：有序子序列 + 首行及以上（页头）范围内的元素一个不少 */
        const kids=[...sc.children].filter(e=>e.id!=='playhead' && e.id!=='playline');
        const strs=kids.map(e=>e.outerHTML);
        let j=0; off1.forEach(x=>{ while(j<strs.length && strs[j]!==x) j++; if(j<strs.length) j++; else j=Infinity; });
        const subseq=j!==Infinity;
        const y1=SYS_GEO[0].y1, cnt=new Map(); off1.forEach(x=>cnt.set(x,(cnt.get(x)||0)+1));
        /* 元素在谱面坐标里的纵向范围：屏幕矩形换回 viewBox 单位（SMuFL 字形带 transform，getBBox 是局部坐标） */
        const SR=sc.getBoundingClientRect(), kk=SR.height/sc.viewBox.baseVal.height;
        let miss=0; kids.forEach(e=>{ if(e.classList.contains('pagebg')) return; const br=e.getBoundingClientRect(); if(!br.width && !br.height) return;
          if((br.bottom-SR.top)/kk<=y1+0.5){ const x=e.outerHTML, c=cnt.get(x)||0; if(c) cnt.set(x,c-1); else miss++; } });
        if(SYS_GEO.length>1) multi++;
        if(!subseq || miss || r1.drawn!==1 || r1.systems!==SYS_GEO.length) first.push(name+':'+JSON.stringify({subseq, miss, drawn:r1.drawn, sys:r1.systems, n:SYS_GEO.length}));
      });
      if(st0==null) P.removeAttribute('style'); else P.setAttribute('style', st0); svg.remove(); render();
      return {n:list.length, multi, cw, full, first}; })()`).catch(e => ({ err: e.message, n: 0, full: [e.message], first: [e.message] }));
    T(r.n === 20 && r.cw === 660 && r.full.length === 0, 'T3a 不限行数：离屏（paperW 660）与「当成当前谱、#paper 宽 660 正常渲染」除播放头 / 竖线外逐字节相同（4 种面板样张 + 16 预设）', J(r.full.slice(0, 2)));
    T(r.n === 20 && r.multi >= 10 && r.first.length === 0, 'T3b 只排首行：输出是正常渲染的有序子序列，首行与页头范围内的元素一个不少（' + r.multi + ' 份多行谱）', J(r.first.slice(0, 3)));
  }

  /* ===== T4 耗时（只排首行）===== */
  {
    const r = await pg.evaluate(`(()=>{
      const svg=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));
      const list=[['钢琴伴奏歌谱',__S.jg],['教学对照谱',__S.teach],['吉他弹唱谱',__S.jt],['视唱五线谱',__S.sight]].concat(PRESETS.map(p=>[p.name, ()=>migrate(p.make())]));
      const q=(a,p)=>a[Math.min(a.length-1, Math.floor(a.length*p))];
      const out=[]; let all=[];
      list.forEach(([name, mk])=>{ const s=mk(); for(let k=0;k<8;k++) renderPreview(s, svg);
        const ts=[]; for(let k=0;k<40;k++) ts.push(renderPreview(s, svg).ms); ts.sort((a,b)=>a-b); all=all.concat(ts);
        out.push({name, med:+q(ts,0.5).toFixed(2), p95:+q(ts,0.95).toFixed(2)}); });
      all.sort((a,b)=>a-b); svg.remove();
      return {out, med:+q(all,0.5).toFixed(2), p95:+q(all,0.95).toFixed(2)}; })()`).catch(e => ({ out: [], err: e.message }));
    if (r.err) console.log('   ' + r.err);
    const four = r.out.slice(0, 4), star = r.out.find(x => /小星星（分解弹唱）/.test(x.name));
    console.log('   耗时（中位 / P95 ms）：' + r.out.map(x => x.name + ' ' + x.med + '/' + x.p95).join('；'));
    T(four.length === 4 && four.every(x => x.med <= 10) && star && star.med <= 10 && r.med <= 10,
      'T4 只排首行引擎耗时：4 种面板样张中位 ' + four.map(x => x.med).join(' / ') + ' ms，《小星星》预设中位 ' + (star && star.med) + ' / P95 ' + (star && star.p95) + ' ms；20 份合计中位 ' + r.med + ' / P95 ' + r.p95 + ' ms（目标中位 ≤10）');
  }

  /* ===== T5 接口 ===== */
  {
    const r = await pg.evaluate(`(()=>{ const out={};
      undoStack.length=0; loadSong(__S.teach()); render(); const h0=document.getElementById('score').innerHTML, n0=RENDER_STAT.n;
      const svg=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));
      /* 事件对象 / 只有 target 的对象 → 正常渲染（#score 重排、计数 +1） */
      render(new Event('resize')); render({target:svg}); out.evt = RENDER_STAT.n===n0+2 && svg.childElementCount===0 && document.getElementById('score').innerHTML===h0;
      /* {type,o,post}：createSong + 后处理，不进窗口 */
      const nd=docs.length;
      const r=renderPreview({type:'vocal', o:{title:'伴奏歌谱', key:'F', beats:2, unit:4, nMea:8, nVox:1, lyr:2},
        post:s=>{ s.voxVoices=['旋律','右手伴奏','左手伴奏']; s.voxNotations=[undefined,'staff','bass']; s.voxGroups=[{type:'brace',from:1,to:2}]; s.measures.forEach(m=>{ m.voxes.push(blankVoxCols(2,4), blankVoxCols(2,4)); }); } }, svg);
      out.spec = !!r && docs.length===nd && r.drawn===1 && r.systems>=1 && /伴奏歌谱/.test(svg.innerHTML) && svg.querySelectorAll('text').length>10
        && !!r.boxes['v2:0:0'] && r.boxes!==colBoxes && /^0 0 [\\d.]+ [\\d.]+$/.test(svg.getAttribute('viewBox')) && +svg.getAttribute('width')>500 && +svg.getAttribute('height')>100 && r.h<=+svg.getAttribute('height')+1;
      out.ids = svg.querySelectorAll('[id]').length===0 && document.querySelectorAll('#playhead').length===1;
      /* holdRender 期间：正常渲染只记脏，离屏照样同步出图、不动脏标 */
      let inHold=null; holdRender(()=>{ svg.innerHTML=''; const rr=renderPreview(__S.sight(), svg); inHold={ok:!!rr && svg.childElementCount>5, dirty:RENDER_DIRTY}; });
      out.hold = inHold.ok && inHold.dirty===false;
      /* 不可重入：离屏期间再调离屏 → 抛错，外层仍完整归还 */
      const s0=song; let thrown=false; const o0=renderCore;
      try{ renderCore=function(){ try{ renderOffscreen({song:__S.jt(), target:svg}); }catch(e){ thrown=/重入/.test(e.message); } return o0.apply(this, arguments); };
        renderPreview(__S.jt(), svg); } finally { renderCore=o0; }
      out.reent = thrown && song===s0 && RENDER_OFF===null;
      /* 调用方的谱对象：顶层字段不被引擎写（customChords 惰性补字段只落在浅拷贝上） */
      const raw=__S.jt(); delete raw.customChords; const sig=JSON.stringify(raw); renderPreview(raw, svg); out.pure = JSON.stringify(raw)===sig && !('customChords' in raw);
      svg.remove(); return out; })()`).catch(e => ({ err: e.message }));
    T(r.evt && r.spec && r.ids && r.hold && r.reent && r.pure, 'T5 接口：事件 / 无 song 的对象仍走正常渲染；{type,o,post} 走 createSong 不进窗口；输出无 id、有 viewBox 宽高、返回预览自己的 colBoxes；holdRender 期间同步出图；不可重入且归还；不写调用方谱对象', J(r));
  }

  /* ===== T6 模式无关（验收：离屏误走手机窄屏重排 / 误读不换行本机键 / 误跟随歌词页 / 观看页 390 分页，套件此前都不报红）=====
     同一份预览在 1280 / 390 视口 × 编辑态 / 歌词页 / 小节手柄 / 打印分页 / 观看页 / 谱架 / 不换行（本机键）/ 跟练大字 / 缩放 / 深色主题下逐字节相同 */
  {
    const MODES = `{edit:()=>{}, lyrTab:()=>{ activeTab='lyr'; }, handles:()=>{ meaHandleOn=true; }, print:()=>{ PRINT_PAGING=true; PRINTING_NOW=true; },
      viewer:()=>{ viewerMode=true; document.body.classList.add('viewer'); }, stand:()=>{ document.body.classList.add('stand'); },
      nowrap:()=>{ localStorage.setItem('musetab-nowrap','1'); localStorage.setItem('musetab-nowrap-view','1'); }, bigtext:()=>{ localStorage.setItem('musetab-bigtext','1'); },
      zoom:()=>{ viewZoom=1.6; }, dark:()=>{ document.documentElement.setAttribute('data-theme','dark'); }}`;
    const res = {};
    for (const w of [1280, 390]) {
      await pg.setViewportSize({ width: w, height: 900 }); await pg.waitForTimeout(150);
      res[w] = await pg.evaluate(`(()=>{ const M=${MODES};
        const keep={tab:activeTab, nw:localStorage.getItem('musetab-nowrap'), nwv:localStorage.getItem('musetab-nowrap-view'), bt:localStorage.getItem('musetab-bigtext'), th:document.documentElement.getAttribute('data-theme')};
        const setLS=(k,v)=>{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); };
        const UN=()=>{ activeTab=keep.tab; meaHandleOn=false; PRINT_PAGING=false; PRINTING_NOW=false; viewerMode=false; document.body.classList.remove('viewer','stand');
          setLS('musetab-nowrap',keep.nw); setLS('musetab-nowrap-view',keep.nwv); setLS('musetab-bigtext',keep.bt); if(keep.th==null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme',keep.th); viewZoom=1; };
        const h=s=>{ let a=0x811c9dc5; for(let i=0;i<s.length;i++){ a^=s.charCodeAt(i); a=Math.imul(a,16777619); } return (a>>>0).toString(36)+':'+s.length; };
        const V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
        const long=()=>{ const s=createSong('vocal',{title:'长谱 64 小节',key:'Eb',beats:3,unit:4,nMea:64,nVox:2,lyr:3});
          s.measures.forEach((m,mi)=>{ m.voxes[0]=[V(1+mi%7,4,{lyrics:[String.fromCharCode(0x4e00+mi), mi%3?'':'啊', '一']}),V(1+(mi+2)%7,8,{oct:mi%5?0:1}),V(1+(mi+4)%7,8),V(5,4,{acc:mi%4?'':'#'})];
            m.voxes[1]=[V(1,2,{oct:-1}),V(5,4,{oct:-1})]; }); return s; };
        const specs=[['jg',__S.jg],['teach',__S.teach],['jt',__S.jt],['sight',__S.sight],['long',long],['fixed',()=>{ const s=long(); s.layout={fixed:true,page:'A4'}; return s; }]];
        const sv=document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg')); const out={};
        Object.keys(M).forEach(md=>{ undoStack.length=0; loadSong(__S.teach()); render(); UN(); M[md]();
          out[md]=specs.map(([k,mk])=>{ const r1=renderPreview(mk(), sv); const a=h(sv.innerHTML)+'#'+r1.w+'x'+r1.h+'/'+sv.getAttribute('width');
            const r2=renderPreview(mk(), sv, {maxSystems:0}); if(md==='edit' && r2.pages>1) out.multi=(out.multi||0)+1; return k+'='+a+'|'+h(sv.innerHTML)+'#'+r2.pages; });
          UN(); });
        sv.remove(); render(); return out; })()`).catch(e => ({ err: e.message }));
    }
    await pg.setViewportSize({ width: 1280, height: 900 }); await pg.waitForTimeout(150);
    const base = res[1280] && res[1280].edit, dep = [];
    if (base) for (const w of [1280, 390]) for (const md of Object.keys(res[w] || {})) if (md !== 'multi') (res[w][md] || []).forEach((x, i) => { if (x !== base[i]) dep.push(w + ':' + md + ':' + x.split('=')[0]); });
    T(!!base && !res[1280].err && !res[390].err && res[1280].multi >= 2 && dep.length === 0, 'T6 模式无关：6 份谱（含 64 小节多页 ×' + (res[1280] && res[1280].multi) + ' / 固定版宽）的首行与全曲预览在 1280 / 390 × 10 种界面状态（歌词页 / 小节手柄 / 打印分页 / 观看页 / 谱架 / 不换行本机键 / 大字 / 缩放 / 深色）下逐字节相同', J({ dep: dep.slice(0, 8), err: (res[1280] || {}).err || (res[390] || {}).err }));
  }

  /* ===== T7 目标防呆（验收：把 #score 当目标会换掉编辑器谱面、#playhead 消失；HTML 元素也被接受） ===== */
  {
    const r = await pg.evaluate(`(()=>{ undoStack.length=0; loadSong(__S.teach()); render();
      const sc=document.getElementById('score'), h0=sc.innerHTML, cb0=colBoxes;
      const a=renderPreview(__S.jt(), sc, {maxSystems:0});
      const div=document.body.appendChild(document.createElement('div')); const b=render({song:__S.jt(), target:div});
      const g=sc.querySelector('g'); const c=g? renderOffscreen({song:__S.jt(), target:g}) : null;
      const out={a, b, c, same:sc.innerHTML===h0, ph:!!document.getElementById('playhead'), cb:colBoxes===cb0, div:div.innerHTML===''};
      div.remove(); return out; })()`).catch(e => ({ err: e.message }));
    T(r.a === null && r.b === null && r.c === null && r.same && r.ph && r.cb && r.div, 'T7 目标防呆：#score 本身 / #score 内元素 / HTML 元素当目标一律返回 null、编辑器谱面与 #playhead / colBoxes 不动', J(r));
  }

  /* ===== T8 post 在借用里执行（验收：post 里 blankMeasure / meaMeter 读到编辑器当前谱的拍号） ===== */
  {
    const r = await pg.evaluate(`(()=>{ undoStack.length=0; loadSong(createSong('vocal',{title:'当前谱 6/8',beats:6,unit:8,nMea:4,nVox:1,lyr:1})); render();
      const sv=document.createElementNS('http://www.w3.org/2000/svg','svg'); let inPost=null;
      const res=renderPreview({type:'vocal', o:{title:'预览 2/4', beats:2, unit:4, nMea:3, nVox:1, lyr:1}, post:s=>{ s.measures.push(blankMeasure()); const mm=meaMeter(3);
        inPost={meter:mm.beats+'/'+mm.unit, durs:s.measures[3].voxes[0].map(c=>c.dur).join(','), title:song.title}; }}, sv, {maxSystems:0});
      return {inPost, after:song.title+' '+song.beats+'/'+song.unit, n:song.measures.length, ok:!!res}; })()`).catch(e => ({ err: e.message }));
    T(r.inPost && r.inPost.meter === '2/4' && r.inPost.durs === '4,4' && r.inPost.title === '预览 2/4' && r.after === '当前谱 6/8 6/8' && r.n === 4 && r.ok,
      'T8 renderPreview 的 post(s) 在「全局 song＝临时谱」的借用里执行：当前谱 6/8、预览 2/4 时 post 里 blankMeasure 生成 2 个四分休止、meaMeter＝2/4；返回后当前谱原样', J(r));
  }

  /* ===== T9 字体缓存随容器（验收：预览框挪到另一种字体的容器里，量宽仍按旧字体） ===== */
  {
    const r = await pg.evaluate(`(()=>{ const mk=f=>{ const d=document.body.appendChild(document.createElement('div')); d.style.cssText='position:absolute;left:0;top:0;width:700px;font-family:'+f; return d; };
      const A=mk('monospace'), B=mk('"Times New Roman",serif');
      const spec=()=>{ const s=__S.teach(); s.title='独库公路G217（Live 版）——一首非常非常长的歌名用来测试页头断行'; s.singer='某某某 & 某某某 合唱'; s.lyricist='林意梵 / 张三 / 李四'; s.composer='王五、赵六'; return s; };
      const sv=A.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));
      renderPreview(spec(), sv, {paperW:420}); const hA=sv.innerHTML;
      B.appendChild(sv); renderPreview(spec(), sv, {paperW:420}); const hMoved=sv.innerHTML;
      const fresh=B.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg')); renderPreview(spec(), fresh, {paperW:420}); const hFresh=fresh.innerHTML;
      A.remove(); B.remove(); return {fontMatters:hA!==hFresh, movedEqFresh:hMoved===hFresh}; })()`).catch(e => ({ err: e.message }));
    T(r.fontMatters && r.movedEqFresh, 'T9 预览框从等宽字体容器挪到衬线字体容器后再排：与在新容器里新建的预览逐字节相同（页头量宽按新容器字体）', J(r));
  }

  /* ===== T10 配色与指针（验收：谱面配色变量 / 曲谱反色只挂在 #paper 上，预览拿不到；预览里有手型热区，点它打掉编辑器光标） ===== */
  {
    await pg.emulateMedia({ colorScheme: 'dark' }); await pg.waitForTimeout(100);
    const r = await pg.evaluate(`(()=>{ undoStack.length=0; loadSong(__S.teach()); sel={mi:0,row:'vox',vi:0,ci:1,si:1}; blurSel=false; render();
      const host=document.body.appendChild(document.createElement('div')); host.style.cssText='position:fixed;left:20px;top:120px;width:680px;z-index:99999;background:#888';
      const sv=host.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));
      const V=['--muted','--accent','--border','--paper','--ink','--danger'];
      const cv=el=>V.map(v=>getComputedStyle(el).getPropertyValue(v).trim()).join('|');
      const sc=document.getElementById('score'), P=document.getElementById('paper');
      renderPreview(__S.teach(), sv); const dark=[cv(sc), cv(sv)];
      applyScoreInvert(true); renderPreview(__S.teach(), sv); const inv=[cv(sc), cv(sv), sv.classList.contains('score-invert')];
      const inv0=localStorage.getItem('musetab-invert');
      applyScoreInvert(false); renderPreview(__S.teach(), sv); const back=[cv(sc), cv(sv), sv.classList.contains('score-invert')];
      if(inv0==null) localStorage.removeItem('musetab-invert');
      renderPreview(__S.teach(), sv, {maxSystems:0});
      const t=[...sv.querySelectorAll('text')].find(e=>e.getBoundingClientRect().width>4 && e.getBoundingClientRect().top>130);
      const tr=t.getBoundingClientRect(); window.__pvHost=host;
      return {dark, inv, back, x:tr.left+tr.width/2, y:tr.top+tr.height/2, hit:(()=>{ const e=document.elementFromPoint(tr.left+tr.width/2, tr.top+tr.height/2); return e===sv? 'svg' : e===t? 'text' : (e&&e.tagName); })(),
        cur:getComputedStyle(sv.querySelector('[data-mi],[data-zone],rect[style*="cursor"],text')||sv).cursor}; })()`).catch(e => ({ err: e.message }));
    let clk = null;
    if (r.x) { const b0 = await pg.evaluate(`blurSel`); await pg.mouse.click(r.x, r.y); await pg.waitForTimeout(80); clk = { before: b0, after: await pg.evaluate(`blurSel`) }; }
    await pg.evaluate(`window.__pvHost && window.__pvHost.remove()`);
    await pg.emulateMedia({ colorScheme: 'light' }); await pg.waitForTimeout(80);
    T(r.dark && r.dark[0] === r.dark[1] && r.inv[0] === r.inv[1] && r.inv[2] === true && r.back[0] === r.back[1] && r.back[2] === false && r.inv[1] !== r.back[1]
      && r.hit === 'svg' && r.cur !== 'pointer' && clk && clk.before === false && clk.after === false,
      'T10 预览配色＝谱面配色：系统深色下 --muted / --accent / --border / --paper / --ink / --danger 与 #score 相同；「曲谱反色」开 / 关时预览跟随；预览里的元素不接收指针（命中落在预览 svg、无手型），真实点击预览不打掉编辑器光标', J({ r, clk }));
  }

  T(errs.length === 0, '无页面报错', errs.slice(0, 4).join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
