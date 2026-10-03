/* v64.1 B7 体验小修包（二）（2026-10 评审团 §6.3 B7 ⑧–⑩：P2-36 / P2-63 wakeLock / P3-14）
   T1 手机 390×844 编辑态：底部播放条默认 56px 迷你条；固定控件（顶栏+时值条+图层轨+播放条）总高 ≤211px（≤25%）、两两不重叠；
      播放键可点中；点「⋯」展开回三排卡片（节拍器可见），再点收起
   T2 屏幕常亮：进谱架申请 wakeLock、退出释放；播放时申请、停止释放；浏览器不支持时静默跳过不报错
   T3 导出弹窗分三组（打印存档 / 分享 / 专业格式），「取消」单独在页脚左侧；专业格式组含曲谱文件；顶栏按钮不再叫「导出」
   T4 预设库缩略卡：卡片带缩图（懒生成后出现 img）、没有渐变主按钮；点整张卡即可打开预设
   突变实证：对 v64.1 之前的文件复跑，T1–T4 全部报红（0/4）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const WL = `(()=>{ window.__wl={req:0,rel:0}; const mk=()=>({ request: async()=>{ __wl.req++; const l=new EventTarget(); l.released=false;
    l.release=async()=>{ if(!l.released){ l.released=true; __wl.rel++; l.dispatchEvent(new Event('release')); } }; return l; } });
  try{ Object.defineProperty(navigator,'wakeLock',{value:mk(), configurable:true, writable:true}); }catch(_){ } })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];

  /* T1 手机 */
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(1100);
    await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); loadSong(createSong('guitar',{title:'量',key:'C',beats:4,unit:4,nMea:4,nTab:1,nVox:1,lyr:1})); render(); })()`);
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(`(()=>{ const R=id=>{ const e=document.getElementById(id); const rc=e.getBoundingClientRect(); return {t:Math.round(rc.top), b:Math.round(rc.bottom), h:Math.round(rc.height)}; };
      const parts={top:R('top'), editbar:R('editbar'), dock:R('left-dock'), mixer:R('mixer-dock')};
      const sum=Object.values(parts).reduce((a,x)=>a+x.h,0);
      const ks=Object.keys(parts); let ov=0; ks.forEach((a,i)=>ks.slice(i+1).forEach(k=>{ const p=parts[a], q=parts[k]; if(Math.min(p.b,q.b)-Math.max(p.t,q.t)>1) ov++; }));
      const pl=document.getElementById('b-play').getBoundingClientRect(); const hit=document.elementFromPoint(pl.left+pl.width/2, pl.top+pl.height/2);
      const more=document.getElementById('mx-more'); const out={parts, sum, ov, playHit:!!hit && !!hit.closest('#b-play'), playH:Math.round(pl.height), more:!!more && more.getBoundingClientRect().width>0,
        metroHidden: getComputedStyle(document.getElementById('b-metro')).display==='none'};
      if(more) more.click(); out.full={mixer:R('mixer-dock').h, metro:document.getElementById('b-metro').getBoundingClientRect().height>0, cls:document.body.classList.contains('mxfull'), lab:more&&more.textContent};
      const eb2=R('editbar'), dk2=R('left-dock'), mx2=R('mixer-dock'); out.full.ov=(Math.min(dk2.b,mx2.b)-Math.max(dk2.t,mx2.t)>1)||(Math.min(eb2.b,dk2.b)-Math.max(eb2.t,dk2.t)>1);
      if(more) more.click(); out.back=R('mixer-dock').h; return out; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.parts.mixer.h <= 56 && r.sum <= 211 && r.ov === 0 && r.playHit && r.playH >= 44 && r.more && r.metroHidden
      && r.full.cls && r.full.metro && r.full.mixer > 100 && !r.full.ov && r.back <= 56,
      'T1 手机迷你播放条 56px、固定控件 ≤25% 屏高、⋯ 展开/收起', JSON.stringify(r));
    await pg.close();
  }

  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.addInitScript(WL);
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); loadSong(createSong('guitar',{title:'常亮',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0})); render(); })()`);
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T2 wakeLock */
  {
    const r = await EV(`(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const out={};
      enterStand(); await w(60); out.s1={...__wl}; exitStand(); await w(60); out.s2={...__wl};
      audio.playing=true; audio.paused=false; setPlayBtn(); await w(60); out.p1={...__wl};
      audio.playing=false; setPlayBtn(); await w(60); out.p2={...__wl};
      try{ delete navigator.wakeLock; Object.defineProperty(navigator,'wakeLock',{value:undefined, configurable:true}); }catch(_){}
      let thrown=false; try{ enterStand(); await w(30); exitStand(); audio.playing=true; setPlayBtn(); audio.playing=false; setPlayBtn(); }catch(e){ thrown=e.message; }
      out.thrown=thrown; return out; })()`);
    T(!r.err && r.s1.req === 1 && r.s2.rel === 1 && r.p1.req === 2 && r.p2.rel === 2 && r.thrown === false,
      'T2 谱架/播放时申请屏幕常亮、退出/停止释放；不支持时静默', JSON.stringify(r));
  }

  /* T3 导出弹窗 */
  {
    const r = await EV(`(()=>{ document.getElementById('b-print').click(); const m=document.querySelector('.modal'); if(!m) return {open:false};
      const grp=[...m.querySelectorAll('.ex-grp')].map(g=>({h:(g.querySelector('h4')||{}).textContent, ids:[...g.querySelectorAll('button')].map(x=>x.id)}));
      const foot=m.querySelector('.btns'); const fb=foot? [...foot.querySelectorAll('button')].map(x=>x.id) : [];
      const c=document.getElementById('ex-cancel').getBoundingClientRect(), mr=m.getBoundingClientRect();
      const out={grp, fb, cancelLeft: c.left < mr.left + mr.width/2, save:(document.getElementById('b-save')||{}).textContent};
      let called=0; const o=exportSong; exportSong=()=>{ called++; }; document.getElementById('ex-mtab') && document.getElementById('ex-mtab').click(); exportSong=o;
      out.mtab=called; if(document.querySelector('.modal')) closeModal(); return out; })()`);
    const g = r.grp || [];
    const has = (i, ids) => g[i] && ids.every(x => g[i].ids.includes(x));
    T(!r.err && g.length === 3 && g.map(x => x.h).join('/') === '打印存档/分享/专业格式' && has(0, ['ex-print', 'ex-png']) && has(1, ['ex-card', 'ex-icard'])
      && has(2, ['ex-mxl', 'ex-mid', 'ex-mtab']) && r.fb.join(',') === 'ex-cancel' && r.cancelLeft && r.mtab === 1 && r.save && r.save.trim() !== '导出',
      'T3 导出弹窗三组、取消在页脚左侧、曲谱文件入专业格式、顶栏按钮改名', JSON.stringify(r));
  }

  /* T4 预设库缩略卡 */
  {
    const r = await EV(`(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); libTab='preset'; showLibrary();
      const m=document.querySelector('.modal'); const cards=[...m.querySelectorAll('.song-card[data-preset]')];
      const out={n:cards.length, thumbs:m.querySelectorAll('.song-card[data-preset] .sc-thumb').length, pri:m.querySelectorAll('.song-card[data-preset] button.primary').length};
      for(let k=0;k<60;k++){ await w(100); if(m.querySelectorAll('.sc-thumb img').length>=2) break; }
      const imgs=[...m.querySelectorAll('.sc-thumb img')]; out.img=imgs.length; out.loaded=imgs.slice(0,2).every(x=>x.complete && x.naturalWidth>0);
      const name=PRESETS[1].make().title; cards[1].querySelector('.sc-desc').click(); await w(300);
      out.opened=song.title===name && !document.querySelector('.modal'); return out; })()`);
    T(!r.err && r.n > 4 && r.thumbs === r.n && r.pri === 0 && r.img >= 2 && r.loaded && r.opened, 'T4 预设库缩略卡（懒生成缩图、无渐变主按钮、整卡可点）', JSON.stringify(r));
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
