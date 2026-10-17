/* v64.0 B7 体验小修包（一）（2026-10 评审团 §6.3 B7 ①–⑦：P2-29 / P2-30 / P2-33 / P2-34 / P2-35）
   T1 对比度（浅/深两套主题）：--faint 对 bg/panel/toolbar ≥4.5:1；当前页签文字 ≥4.5:1；主按钮实底、白字 ≥4.5:1
   T2 焦点环：键盘聚焦的按钮出现 2px 实色外框（不透明）、外偏移 ≥2px
   T3 Tab 按焦点位置：焦点在谱面（body）时 Tab 仍切换声部；焦点在面板按钮上时放行原生 Tab（焦点前进、声部不变）
   T4 读屏语义：#score 有 role 与 aria-label；可见的字形按钮（♭ ♯ ◐ 等纯符号；纯数字键本身可读不计）全部有 aria-label
   T5 主题持久化：编辑器点明暗切换后刷新仍保持；官网同样记住，且官网 --faint 达 AA、主按钮实底
   突变实证：对 v64.0 之前的文件复跑，T1–T5 全部报红（0/5）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); try{ localStorage.removeItem('musetab-theme'); }catch(_){} })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));
  const CR = `window.__cr=(a,b2)=>{ const p=s=>{ const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; return m[1].split(',').map(x=>parseFloat(x)); };
    const L=v=>{ const f=c=>{ c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }; return 0.2126*f(v[0])+0.7152*f(v[1])+0.0722*f(v[2]); };
    const x=p(a), y=p(b2); if(!x||!y) return 0; if(y.length>3 && y[3]===0) return 0; const l1=L(x), l2=L(y); return +((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2); };
    window.__tok=(n)=>{ const d=document.createElement('div'); d.style.color='var('+n+')'; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove(); return c; };`;
  await EV(CR);

  /* T1 */
  let r = await EV(`(()=>{ const out={};
    ['light','dark'].forEach(th=>{ document.documentElement.dataset.theme=th;
      const f=__tok('--faint'); const o={faint:['--bg','--panel','--toolbar'].map(k=>__cr(f,__tok(k)))};
      const tab=document.querySelector('.dtab.on');
      if(tab){ const cs=getComputedStyle(tab); o.tab=__cr(cs.color, cs.backgroundColor); }
      const bt=document.createElement('button'); bt.className='primary'; bt.textContent='保存'; document.body.appendChild(bt);
      const bs=getComputedStyle(bt); o.pri={img:bs.backgroundImage, cr:__cr(bs.color, bs.backgroundColor)}; bt.remove();
      out[th]=o; });
    delete document.documentElement.dataset.theme; return out; })()`);
  const okTheme = o => o && o.faint.every(x => x >= 4.5) && (o.tab == null || o.tab >= 4.5) && o.pri.img === 'none' && o.pri.cr >= 4.5;
  T(!r.err && okTheme(r.light) && okTheme(r.dark) && r.light.tab != null, 'T1 浅/深主题：--faint、当前页签、主按钮文字均达 AA', JSON.stringify(r));

  /* T2 */
  await EV(`(()=>{ const a=document.createElement('button'); a.id='__fa'; a.textContent='甲'; const c=document.createElement('button'); c.id='__fc'; c.textContent='乙';
    a.style.cssText=c.style.cssText='position:fixed;top:300px;left:300px;z-index:99999'; c.style.left='360px';
    document.body.appendChild(a); document.body.appendChild(c); a.focus(); })()`);
  await pg.keyboard.press('Tab'); await pg.waitForTimeout(50);
  r = await EV(`(()=>{ const ae=document.activeElement; const cs=getComputedStyle(ae);
    const out={id:ae.id, style:cs.outlineStyle, w:cs.outlineWidth, col:cs.outlineColor, off:cs.outlineOffset};
    document.getElementById('__fa').remove(); document.getElementById('__fc').remove(); return out; })()`);
  const alphaOk = c => !/rgba\([^)]*,\s*0?\.\d+\)/.test(c || '');
  T(r.id === '__fc' && r.style === 'solid' && parseFloat(r.w) >= 2 && alphaOk(r.col) && parseFloat(r.off) >= 2, 'T2 键盘焦点环：实色 2px、外偏移 ≥2px', JSON.stringify(r));

  /* T3 */
  await EV(`(()=>{ loadSong(createSong('guitar',{title:'Tab',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:1,lyr:0})); sel={mi:0,row:'tab',vi:0,ci:0,si:1}; render();
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); })()`);
  const row0 = await EV('sel.row');
  await pg.keyboard.press('Tab'); await pg.waitForTimeout(40);
  const row1 = await EV('sel.row');
  await EV(`(()=>{ const bt=[...document.querySelectorAll('#top button')].find(x=>x.offsetParent && x.getBoundingClientRect().width>0); window.__ft=bt; bt.focus(); })()`);
  const rowB = await EV('sel.row');
  await pg.keyboard.press('Tab'); await pg.waitForTimeout(40);
  r = await EV(`({row:sel.row, moved:document.activeElement!==window.__ft && document.activeElement!==document.body})`);
  T(row0 === 'tab' && row1 === 'vox' && r.row === rowB && r.moved, 'T3 焦点在谱面时 Tab 切声部；在面板按钮上时放行原生 Tab', JSON.stringify({ row0, row1, rowB, r }));
  /* T3f（v68.2 收尾 ENG-8，PLAN §5.4 M）：默认外壳（flow）的两处新面板也放行原生 Tab——行 1（#flw-r1：文件 ▾ / 页签 / 发布 / 账号 ▾）与左栏音轨树（#flw-trk）上的按钮
     拿着焦点时按 Tab：焦点前进、声部不变（此前 T3 只取 #top 里第一个按钮，没覆盖音轨树） */
  const flowOn0 = await EV(`document.body.classList.contains('flow')`);
  if (flowOn0 === true) {
    const walk = async sel => {
      const ok = await EV(`(()=>{ const bt=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.offsetParent && x.getBoundingClientRect().width>0 && !x.disabled);
        if(!bt) return false; window.__ft=bt; window.__fr=sel.row; bt.focus(); return document.activeElement===bt; })()`);
      await pg.keyboard.press('Tab'); await pg.waitForTimeout(40);
      return Object.assign({ ok }, await EV(`({row:sel.row, keep:sel.row===window.__fr, moved:document.activeElement!==window.__ft && document.activeElement!==document.body, to:(document.activeElement||{}).id||(document.activeElement||{}).tagName})`));
    };
    const a1 = await walk('#flw-r1 button'), a2 = await walk('#flw-trk button');
    T(a1.ok && a1.keep && a1.moved && a2.ok && a2.keep && a2.moved, 'T3f 默认外壳行 1（#flw-r1）与左栏音轨树（#flw-trk）上的按钮拿着焦点时 Tab 走原生焦点、不切声部', JSON.stringify({ r1: a1, trk: a2 }));
  }

  /* T4 */
  r = await EV(`(()=>{ const sc=document.getElementById('score');
    const vis=b2=>{ const rc=b2.getBoundingClientRect(); return rc.width>0 && rc.height>0 && getComputedStyle(b2).visibility!=='hidden'; };
    const glyph=[...document.querySelectorAll('button')].filter(b2=>vis(b2)).filter(b2=>{ const t=(b2.textContent||'').trim(); return t && !/^\\d+$/.test(t) && !/[\\u4e00-\\u9fa5]|[A-Za-z]{2,}/.test(t); });
    const miss=glyph.filter(b2=>!b2.getAttribute('aria-label')).map(b2=>(b2.id||'?')+':'+b2.textContent.trim());
    const kd=document.getElementById('k-dn');
    return {role:sc.getAttribute('role'), lab:!!sc.getAttribute('aria-label'), n:glyph.length, miss:miss.slice(0,30), missN:miss.length, theme:(document.getElementById('b-theme')||{}).getAttribute? document.getElementById('b-theme').getAttribute('aria-label') : null}; })()`);
  T(r.role && r.lab && r.n > 0 && r.missN === 0 && r.theme, 'T4 #score 有语义标注；可见字形按钮全部有 aria-label', JSON.stringify(r));

  /* T5 */
  await EV(`(()=>{ document.documentElement.removeAttribute('data-theme'); document.getElementById('b-theme').onclick(); })()`);
  const th1 = await EV('document.documentElement.dataset.theme');
  await pg.reload(); await pg.waitForTimeout(900);
  const th2 = await EV('document.documentElement.dataset.theme||""');
  await EV(`localStorage.removeItem('musetab-theme')`);
  const sp = await ctx.newPage();
  await sp.goto('file://' + path.join(SITE, 'index.html')); await sp.waitForTimeout(600);
  await sp.evaluate(`localStorage.removeItem('musetab-theme')`).catch(() => {});
  await sp.evaluate(`(()=>{ document.documentElement.dataset.theme='dark'; document.getElementById('theme-btn').click(); })()`).catch(() => {});
  await sp.reload(); await sp.waitForTimeout(600);
  await sp.evaluate(CR);
  const s5 = await sp.evaluate(`(()=>{ const f=__tok('--faint'); const btn=document.querySelector('.btn'); const bs=btn? getComputedStyle(btn) : null;
    return {th:document.documentElement.dataset.theme||'', faint:['--bg','--panel'].map(k=>__cr(f,__tok(k))), btnImg:bs? bs.backgroundImage : null, btnCr:bs? __cr(bs.color, bs.backgroundColor) : 0}; })()`).catch(e => ({ err: e.message }));
  await sp.close();
  T(th1 && th2 === th1 && s5.th === 'light' && s5.faint.every(x => x >= 4.5) && s5.btnImg === 'none' && s5.btnCr >= 4.5,
    'T5 主题刷新后保持（编辑器 + 官网）；官网 --faint 达 AA、主按钮实底', JSON.stringify({ th1, th2, s5 }));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
