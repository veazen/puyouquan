/* v64.6 B8 ② 手机窄屏重排与「跟练大字」（2026-10 评审团 §6.3 B8 ②：P2-09）
   T1 手机 390 宽：谱面按屏宽重排，TAB 品位、和弦名显示 ≥10px（此前约 7.6px），无横向滚动；桌面 1440 版宽与页边距不变
   T2 跟练大字：品位、和弦名显示 ≥12px，仍无横向滚动（重排放大，不是显示放大）
   T3 手机「观看设置」里有「标准字号 / 跟练大字」切换，点了立即生效并记住
   突变实证：对 v64.6 之前的文件复跑，T1–T3 全部报红（0/3）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const MK = `window.mkG=()=>{ const s=createSong('guitar',{title:'跟练',key:'C',beats:4,unit:4,nMea:8,nTab:1,nVox:1,lyr:1});
  s.measures.forEach((m,mi)=>{ m.tabs[0][0].chord=['C','Am','F','G'][mi%4]; m.tabs[0].forEach((c,i)=>{ c.notes=[{s:[5,3,2,1][i],f:[3,0,1,0][i]}]; }); m.voxes[0].forEach((c,i)=>{ c.deg=[1,3,5,1][i]; c.lyrics=['啊']; }); });
  return s; };
  window.px=()=>{ const sv=document.getElementById('score'), k=sv.getBoundingClientRect().width/sv.viewBox.baseVal.width;
    const fr=[...sv.querySelectorAll('text')].find(t=>/^[0-9]$/.test(t.textContent) && +t.getAttribute('font-size')>=9 && +t.getAttribute('font-size')<=12);
    const ch=[...sv.querySelectorAll('text')].find(t=>/^(C|Am|F|G)$/.test(t.textContent.trim()));
    return {k:+k.toFixed(3), fret: fr? +(+fr.getAttribute('font-size')*k).toFixed(1) : null, chord: ch? +(+ch.getAttribute('font-size')*k).toFixed(1) : null,
      over: document.documentElement.scrollWidth > window.innerWidth+1, PAGE_W, MARGIN}; };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (w, h, mob) => { const ctx = await b.newContext(mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: w, height: h } });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(900);
    await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); try{ localStorage.removeItem('musetab-bigtext'); }catch(_){} ${MK} diagMode='off'; })()`); return pg; };

  const pg = await open(390, 844, true);
  let r = await pg.evaluate(`(()=>{ const s=mkG(); s.diagPos='off'; loadSong(s); render(); return px(); })()`).catch(e => ({ err: e.message }));
  const dpg = await open(1440, 900);
  const desk = await dpg.evaluate(`(()=>{ const s=mkG(); loadSong(s); render(); return {PAGE_W, MARGIN}; })()`).catch(e => ({ err: e.message }));
  await dpg.close();
  T(!r.err && r.fret >= 10 && r.chord >= 10 && !r.over && desk.MARGIN === 56 && desk.PAGE_W === 729, 'T1 手机按屏宽重排：品位/和弦名 ≥10px、无横滚；桌面不变', JSON.stringify({ r, desk }));

  r = await pg.evaluate(`(()=>{ localStorage.setItem('musetab-bigtext','1'); render(); return px(); })()`).catch(e => ({ err: e.message }));
  T(!r.err && r.fret >= 12 && r.chord >= 12 && !r.over, 'T2 跟练大字：品位/和弦名 ≥12px、无横滚', JSON.stringify(r));

  r = await pg.evaluate(`(()=>{ localStorage.setItem('musetab-bigtext','0'); render(); const a=px();
    showVwSettings(); const big=document.querySelector('#vs-big [data-big="1"]'); if(!big){ closeModal(); return {btn:false, a}; }
    big.click(); const b2=px(); const kept=localStorage.getItem('musetab-bigtext'); closeModal(); return {btn:true, a, b2, kept}; })()`).catch(e => ({ err: e.message }));
  T(!r.err && r.btn && r.b2.fret > r.a.fret && r.b2.fret >= 12 && r.kept === '1', 'T3 手机观看设置可切换跟练大字并记住', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
