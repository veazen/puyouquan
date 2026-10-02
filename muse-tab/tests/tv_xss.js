/* v62.5 A1a 存储型 XSS 根治回归（2026-10 评审团 P0-1）：
   所有加载路径都经 migrate() → normalizeSongFields() 按字段规范化；自由文本不改存储、输出点转义。
   T1 零误杀：全部预设经 migrate 规范化前后 JSON 逐字节不变；楔形 dyn:'<'/'>'、含尖括号/引号的歌词与曲名原样保留
   T2 逐键模糊注入（loadSong 路）：预设里出现过的每一个叶子键 + 数据模型里的短码/文本键，分别注入
      「尖括号标签」与「引号逃逸属性」两种载荷，渲染后 #score/#paper 内零 <img>、零 on* 属性、脚本未执行
   T3 启动恢复路：localStorage 里被投毒的上次编辑谱，刷新页面后不执行
   T4 本机库路：本机库里已被投毒的旧条目（v62.4 之前的 ?mine= 漏洞可能写入）经 ?mine= 打开不执行
   T5 缩图路：buildThumbCanvas 借谱渲染不执行
   T6 云端拒收提示：服务端 400 不再静默，提示一次并保留本机副本
   突变实证：对 v62.4 文件复跑，T2/T3/T4/T5/T6 应报红。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (init) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    if (init) await ctx.addInitScript(init);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(F); await pg.waitForTimeout(1000);
    await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0; })()`);
    return pg;
  };
  /* 页内探针：#score 与 #paper 里的危险元素/属性计数 */
  const PROBE = `(()=>{ const el=[...document.querySelectorAll('#score *, #paper *')];
    return {pwn:window.__pwn||null, img:el.filter(e=>e.tagName==='IMG'||e.tagName==='SCRIPT'||e.tagName==='IFRAME').length,
      on:el.filter(e=>[...e.attributes].some(a=>/^on/i.test(a.name))).length}; })()`;
  const P = '<img src=x onerror="window.__pwn=1">';
  const Q = '" onmouseover="window.__pwn=2" data-x="';

  /* ---------- T1 零误杀 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(()=>{ const diff=[];
      for(let i=0;i<PRESETS.length;i++){ const s=PRESETS[i].make(); if(!s.customChords) s.customChords={};
        const a=JSON.stringify(s), z=JSON.stringify(migrate(JSON.parse(a))); if(a!==z) diff.push(i); }
      const t={v:3,title:'A<B "引号" 曲',singer:'<3',lyricist:'',composer:'',maker:'',key:'C',beats:4,unit:4,tempo:'96',capo:0,
        tabVoices:[],voxVoices:['旋律1'],lyricLines:1,customChords:{},
        measures:[{tabs:[],voxes:[[{dur:4,deg:1,oct:0,acc:'',dyn:'<',lyrics:['a<b>c "x"']},{dur:4,deg:2,oct:0,acc:'',dyn:'>',lyrics:['<3']}]],label:'副歌 <A>'}]};
      const m=migrate(JSON.parse(JSON.stringify(t)));
      return {diff, title:m.title, singer:m.singer, lyr:m.measures[0].voxes[0][0].lyrics[0], lyr2:m.measures[0].voxes[0][1].lyrics[0],
        dyn:[m.measures[0].voxes[0][0].dyn, m.measures[0].voxes[0][1].dyn], label:m.measures[0].label, tempo:m.tempo}; })()`).catch(e => ({ err: e.message }));
    T(r && r.diff && r.diff.length === 0, 'T1 全部预设经 migrate 规范化后 JSON 逐字节不变', JSON.stringify(r && r.diff));
    T(r && r.title === 'A<B "引号" 曲' && r.singer === '<3' && r.lyr === 'a<b>c "x"' && r.lyr2 === '<3' && r.label === '副歌 <A>',
      'T1b 自由文本（曲名/演唱/歌词/段落标记）里的尖括号与引号原样保留', JSON.stringify(r));
    T(r && r.dyn && r.dyn[0] === '<' && r.dyn[1] === '>', 'T1c 楔形 dyn 保真', JSON.stringify(r && r.dyn));
    T(r && r.tempo === 96, 'T1d 旧数据里的数字串规范成数字', JSON.stringify(r && r.tempo));
    await pg.close();
  }

  /* ---------- T2 逐键模糊注入（loadSong 路） ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(()=>{ const P=${JSON.stringify(P)}, Q=${JSON.stringify(Q)};
      /* 键 → 首个含该键的预设；另补数据模型里有、预设里没出现的短码/文本键（挂在首列/首小节/谱面根上） */
      const firstOf={};
      const walk=(o,k,i)=>{ if(Array.isArray(o)) return o.forEach(x=>walk(x,k,i)); if(o&&typeof o==='object'){ for(const kk in o) walk(o[kk],kk,i); return; }
        if(k && !(k in firstOf)) firstOf[k]=i; };
      PRESETS.forEach((p,i)=>walk(p.make(),'',i));
      const EXTRA_COL=['artic','ped','fing','clef','ott','trem','perc','rhFing','lhF','anno','grace','orn','dyn','breath','ferm'];
      const EXTRA_MEA=['label','keyTo','volta','simile','segno','coda'];
      const EXTRA_SONG=['texId','tabNota','tempoTerm','mode','inst','key'];
      const setAll=(o,k,val)=>{ if(Array.isArray(o)) return o.forEach(x=>setAll(x,k,val)); if(o&&typeof o==='object'){ for(const kk in o){ if(kk===k && (o[kk]===null||typeof o[kk]!=='object')) o[kk]=val; else setAll(o[kk],k,val); } } };
      const hits={}; let tried=0;
      const keys=Object.keys(firstOf).concat(EXTRA_COL,EXTRA_MEA,EXTRA_SONG);
      for(const k of keys){
        for(const pay of [P,Q]){
          const pi = k in firstOf? firstOf[k] : 0;
          const s=PRESETS[pi].make();
          if(!(k in firstOf)){
            const m0=s.measures[0];
            if(EXTRA_SONG.includes(k)) s[k]=pay;
            else if(EXTRA_MEA.includes(k)) m0[k]=pay;
            else { const vc=(m0.voxes&&m0.voxes[0]&&m0.voxes[0][0]); const tc=(m0.tabs&&m0.tabs[0]&&m0.tabs[0][0]);
              if(vc) vc[k]=pay; if(tc) tc[k]=pay; }
          } else setAll(s,k,pay);
          window.__pwn=null; tried++;
          try{ undoStack.length=0; loadSong(s); if(typeof hideStartPad==='function') hideStartPad(); blurSel=false; render(); }catch(e){ continue; }
          const el=[...document.querySelectorAll('#score *, #paper *')];
          const bad=el.filter(e=>e.tagName==='IMG'||[...e.attributes].some(a=>/^on/i.test(a.name))).length;
          if(bad||window.__pwn){ hits[k]=(hits[k]||[]).concat(pay===P?'P':'Q'); }
        }
      }
      return {tried, keys:keys.length, hits}; })()`).catch(e => ({ err: e.message }));
    T(r && r.tried >= 60 && r.hits && Object.keys(r.hits).length === 0, 'T2 逐键模糊注入（' + (r && r.keys) + ' 个键 × 两种载荷）零命中', JSON.stringify(r && (r.hits || r.err)));
    await pg.close();
  }

  /* ---------- T3 启动恢复路 ---------- */
  {
    const init = `(()=>{ if(sessionStorage.getItem('tvx-done')) return; sessionStorage.setItem('tvx-done','1');
      const s={v:3,title:'投毒',singer:'',lyricist:'',composer:'',maker:'',key:'C',beats:4,unit:4,tempo:90,capo:0,
        tabVoices:['吉他1'],voxVoices:['旋律1'],lyricLines:1,customChords:{},
        measures:[{tabs:[[{dur:4,notes:[{s:2,f:${JSON.stringify(P)},tech:${JSON.stringify(P)}}],chord:''}]],
          voxes:[[{dur:4,deg:${JSON.stringify(P)},oct:0,acc:'',lyrics:[]}]],volta:${JSON.stringify(P)}}]};
      localStorage.removeItem('musetab-docs-v1'); localStorage.setItem('musetab-song-v1', JSON.stringify(s)); })()`;
    const pg = await open(init);
    await pg.evaluate(`(()=>{ if(typeof hideStartPad==='function') hideStartPad(); blurSel=false; render(); })()`).catch(() => {});
    const r = await pg.evaluate(PROBE).catch(e => ({ err: e.message }));
    T(r && !r.pwn && r.img === 0 && r.on === 0, 'T3 启动恢复被投毒的上次编辑谱：不执行', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T4 本机库路（?mine= 本地命中） ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(async()=>{ window.__pwn=null; const s=PRESETS[0].make();
      (s.measures[0].tabs[0]||[]).forEach(c=>(c.notes||[]).forEach(n=>{ n.f=${JSON.stringify(P)}; }));
      (s.measures[0].voxes[0]||[]).forEach(c=>{ c.deg=${JSON.stringify(P)}; });
      s.id='song_tvx00001'; const lib=libLoad(); lib.unshift({id:s.id,title:'投毒',data:s}); libSave(lib);
      await openRemoteMine('song_tvx00001'); await new Promise(r=>setTimeout(r,200));
      if(typeof hideStartPad==='function') hideStartPad(); blurSel=false; render();
      return ${PROBE}; })()`).catch(e => ({ err: e.message }));
    T(r && !r.pwn && r.img === 0 && r.on === 0, 'T4 本机库里被投毒的旧条目经 ?mine= 打开：不执行', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T5 缩图路 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(()=>{ window.__pwn=null; loadSong(PRESETS[0].make()); const s=PRESETS[0].make();
      (s.measures[0].voxes[0]||[]).forEach(c=>{ c.deg=${JSON.stringify(P)}; });
      (s.measures[0].tabs[0]||[]).forEach(c=>(c.notes||[]).forEach(n=>{ n.tech=${JSON.stringify(P)}; }));
      let seen=0; const mo=new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1 && (n.tagName==='IMG' || (n.querySelector && n.querySelector('#score img, img[onerror]')))) seen++; })); });
      mo.observe(document.getElementById('score'),{childList:true,subtree:true});
      try{ buildThumbCanvas(s, ()=>{}, ()=>{}); }catch(e){}
      mo.disconnect(); return {seen, pwn:window.__pwn||null}; })()`).catch(e => ({ err: e.message }));
    await pg.waitForTimeout(300);
    const r2 = await pg.evaluate(`window.__pwn||null`).catch(() => 'err');
    T(r && r.seen === 0 && !r.pwn && !r2, 'T5 缩图借谱渲染被投毒数据：不执行', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T6 云端拒收提示 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(async()=>{ const toasts=[]; const ot=toast; toast=(m)=>{ toasts.push(String(m)); };
      const oa=apiCall; const keepCloud=window.PYQ_CLOUD, keepAcct=ACCT;
      apiCall=async()=>{ const e=new Error('谱面数据不合法：data.deg（应为数字）'); e.status=400; throw e; };
      window.PYQ_CLOUD=true; ACCT={id:'u1',phone:'138'};
      const lib=libLoad(); lib.unshift({id:'song_tvx00002',title:'拒收样例',mtime:1,data:PRESETS[0].make()}); libSave(lib);
      try{ await scoreCloudPush('song_tvx00002'); await scoreCloudPush('song_tvx00002'); }
      finally{ apiCall=oa; toast=ot; window.PYQ_CLOUD=keepCloud; ACCT=keepAcct; }
      return {n:toasts.filter(t=>/云端未保存/.test(t)).length, kept: libLoad().some(x=>x.id==='song_tvx00002'), t:toasts[0]||''}; })()`).catch(e => ({ err: e.message }));
    T(r && r.n === 1 && r.kept, 'T6 服务端拒收（400）提示一次且本机副本保留', JSON.stringify(r));
    await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
