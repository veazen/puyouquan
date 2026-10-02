/* v62.4 A0 热修周回归（2026-10 评审团 §6.1）：
   T1 打印多页（P0-3）：通栏框架 body.shell:not(.stand):not(.viewer) 曾压过打印复位→多页谱只出第 1 页
   T2 打印去编辑痕迹（P1-01）：beforeprint 时谱面无光标列/弦位圈/小节选中框，afterprint 复原
   T3 PNG / 分享卡 / 打印预览去编辑痕迹（P1-01）
   T4 弹窗键盘守卫（P1-03）：弹窗开着按 Delete/数字不改谱；Esc 关窗；关闭守卫仍能拦下
   T5 手机抽屉压弹窗（P1-03）：从「智能」抽屉打开的弹窗主按钮能被点中
   T6 清洗按字段（P1-38）：全部预设清洗前后零差异、楔形保真；注入 deg/f/tech/volta/dyn/键名 不产生事件属性
   T7 ?mine= 限本人（P0-1 止血）：非谱主 403 → 改走谱库观看页（经清洗），不写进本机库
   T8 登录弹窗（P1-06）：个人中心里取消/登录成功都关窗；编辑器里取消不再被拽进个人中心
   突变实证：对 v62.3 文件复跑本套件，T1/T2/T3/T4/T5/T6/T7/T8 均应报红（见 PROJECT.md v62.4）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (vp) => {
    const pg = await b.newPage({ viewport: vp || { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/sounds|CORS|Failed to load|TUNNEL|net::/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
    await pg.goto(F); await pg.waitForTimeout(1000);
    await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0; })()`);
    return pg;
  };
  /* 编辑痕迹计数：光标列（opacity 0.12 朱砂块）+ 弦位圈（r=8）+ 小节/歌词选中描框（fill-opacity 0.13） */
  const MARKS = `h=>({col:(h.match(/opacity="0.12"/g)||[]).length, ring:(h.match(/ r="8"/g)||[]).length, box:(h.match(/fill-opacity="0.13"/g)||[]).length})`;
  /* 让光标/小节选中/歌词选中全部点亮 */
  const DIRTY = `(()=>{ if(typeof hideStartPad==='function') hideStartPad();
    blurSel=false; sel={mi:1,row:'tab',vi:0,ci:0,si:2}; measureSel=1;
    try{ lyrSel={vi:0,mi:0,ci:0,li:0}; }catch(_){}
    render(); })()`;

  /* ---------- T1 打印多页 ---------- */
  {
    const pg = await open();
    const n = await pg.evaluate(`(()=>{ const s=PRESETS[0].make();
      const base=JSON.parse(JSON.stringify(s.measures)); for(let k=0;k<3;k++) s.measures.push(...JSON.parse(JSON.stringify(base)));
      loadSong(s); if(typeof hideStartPad==='function') hideStartPad(); render(); return PV_GEO.n; })()`).catch(() => 0);
    const pdf = await pg.pdf({ format: 'A4' }).catch(() => null);
    const pages = pdf ? (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : 0;
    T(n >= 3 && pages >= n, 'T1 通栏框架下打印多页谱不再只出第 1 页', `虚拟页 ${n}，PDF ${pages} 页`);
    await pg.emulateMedia({ media: 'print' });
    const vb = await pg.evaluate(`(()=>{ document.body.classList.add('viewer'); const v=document.getElementById('viewerbar');
      const d=v? getComputedStyle(v).display : 'none'; document.body.classList.remove('viewer'); return d; })()`).catch(() => '?');
    T(vb === 'none', 'T1b 观看页打印隐藏顶部 #viewerbar（首页不再只印一条头部栏）', vb);
    await pg.close();
  }

  /* ---------- T2 打印去编辑痕迹 ---------- */
  {
    const pg = await open();
    await pg.evaluate(`loadSong(PRESETS[0].make())`).catch(() => {});
    await pg.evaluate(DIRTY).catch(() => {});
    const live = await pg.evaluate(`(${MARKS})(document.getElementById('score').innerHTML)`).catch(() => null);
    /* 本套件的监听晚于应用自身的 beforeprint 注册，取到的是应用处理之后的谱面 */
    await pg.evaluate(`addEventListener('beforeprint',()=>{ window.__bpHtml=document.getElementById('score').innerHTML; })`);
    await pg.pdf({ format: 'A4' }).catch(() => null);
    const at = await pg.evaluate(`(${MARKS})(window.__bpHtml||'')`).catch(() => null);
    const after = await pg.evaluate(`(${MARKS})(document.getElementById('score').innerHTML)`).catch(() => null);
    T(live && live.col >= 1 && live.ring >= 1, 'T2 前置：编辑态确有光标列与弦位圈', JSON.stringify(live));
    T(at && at.col === 0 && at.ring === 0 && at.box === 0, 'T2 打印时谱面零编辑痕迹', JSON.stringify(at));
    T(after && after.col >= 1 && after.ring >= 1, 'T2b 打印完成后编辑光标复原', JSON.stringify(after));
    await pg.close();
  }

  /* ---------- T3 PNG / 分享卡 / 打印预览 ---------- */
  {
    const pg = await open();
    await pg.evaluate(`loadSong(PRESETS[0].make())`).catch(() => {});
    await pg.evaluate(DIRTY).catch(() => {});
    const png = await pg.evaluate(`(()=>{ const o=svgResolveVars; let x=''; svgResolveVars=(s)=>{ x=s; return o(s); };
      try{ exportPNG(1); }finally{ svgResolveVars=o; } return x; })()`).catch(() => '');
    const mp = await pg.evaluate(`(${MARKS})(${JSON.stringify(png)})`).catch(() => null);
    T(png.length > 1000 && mp && mp.col === 0 && mp.ring === 0 && mp.box === 0, 'T3 导出 PNG 零编辑痕迹', JSON.stringify(mp));
    const card = await pg.evaluate(`(()=>{ const c=buildShareCardSVG(); return typeof c==='string'? c : JSON.stringify(c); })()`).catch(() => '');
    const mc = await pg.evaluate(`(${MARKS})(${JSON.stringify(card)})`).catch(() => null);
    T(card.length > 1000 && mc && mc.col === 0 && mc.ring === 0 && mc.box === 0, 'T3b 分享卡零编辑痕迹（含小节选中框/歌词选中框）', JSON.stringify(mc));
    const pv = await pg.evaluate(`(()=>{ pvOpen(); const h=PV.content||''; pvClose(); return h; })()`).catch(() => '');
    const mv = await pg.evaluate(`(${MARKS})(${JSON.stringify(pv)})`).catch(() => null);
    T(pv.length > 1000 && mv && mv.col === 0 && mv.ring === 0 && mv.box === 0, 'T3c 打印预览零编辑痕迹', JSON.stringify(mv));
    const back = await pg.evaluate(`(${MARKS})(document.getElementById('score').innerHTML)`).catch(() => null);
    T(back && back.col >= 1 && back.ring >= 1, 'T3d 三个出口用完后编辑光标复原', JSON.stringify(back));
    await pg.close();
  }

  /* ---------- T4 弹窗键盘守卫 ---------- */
  {
    const pg = await open();
    await pg.evaluate(`loadSong(PRESETS[0].make()); if(typeof hideStartPad==='function') hideStartPad(); blurSel=false; sel={mi:0,row:'tab',vi:0,ci:0,si:2}; render();`).catch(() => {});
    const before = await pg.evaluate(`JSON.stringify(song)`);
    await pg.evaluate(`showModal('<h3>测试弹窗</h3><div class="btns"><button id="tv-ok" class="primary">好</button></div>')`);
    await pg.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    for (const k of ['Delete', '5', 'Backspace', 'ArrowRight', '3']) await pg.keyboard.press(k);
    const mid = await pg.evaluate(`JSON.stringify(song)`);
    T(mid === before, 'T4 弹窗打开时 Delete/数字/方向键不改背后的谱面', mid === before ? '' : '谱面被改动');
    await pg.keyboard.press('Escape');
    const closed = await pg.evaluate(`!document.getElementById('modal-mask')`);
    T(closed, 'T4b Esc 关闭 showModal 弹窗');
    await pg.evaluate(`showModal('<h3>工作台</h3>'); modalGuard=()=>false;`);
    await pg.keyboard.press('Escape');
    const kept = await pg.evaluate(`!!document.getElementById('modal-mask')`);
    T(kept, 'T4c 关闭守卫拒绝时 Esc 不关窗（工作台未保存改动不丢）');
    await pg.evaluate(`modalGuard=null; closeModal();`);
    await pg.keyboard.press('5');
    const after = await pg.evaluate(`JSON.stringify(song)`);
    T(after !== before, 'T4d 弹窗关闭后编辑快捷键恢复', after !== before ? '' : '按 5 未写入');
    await pg.close();
  }

  /* ---------- T5 手机抽屉压弹窗 ---------- */
  {
    const pg = await open({ width: 390, height: 844 });
    await pg.evaluate(`loadSong(PRESETS[0].make()); if(typeof hideStartPad==='function') hideStartPad(); render();`).catch(() => {});
    const r = await pg.evaluate(`(()=>{ toggleSmartSheet(true);
      const was=document.body.classList.contains('rsheet');
      showModal('<h3>一键配伴奏</h3><div class="btns"><button id="tv-go" class="primary">生成</button></div>');
      const bt=document.getElementById('tv-go'); const rc=bt.getBoundingClientRect();
      const hit=document.elementFromPoint(rc.left+rc.width/2, rc.top+rc.height/2);
      return {was, sheet:document.body.classList.contains('rsheet'), hit: hit===bt || (hit&&bt.contains(hit))}; })()`).catch(e => ({ err: e.message }));
    T(r && r.was && r.hit && !r.sheet, 'T5 抽屉里打开的弹窗主按钮可被点中（抽屉自动收起）', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T6 清洗按字段 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(()=>{ const diff=[]; let hair=0, hairOut=0;
      for(let i=0;i<PRESETS.length;i++){ const s=PRESETS[i].make(); const a=JSON.stringify(s), z=JSON.stringify(sanitizeUntrusted(s));
        if(a!==z) diff.push(i); hair+=(a.match(/"dyn":"[<>]"/g)||[]).length; hairOut+=(z.match(/"dyn":"[<>]"/g)||[]).length; }
      return {diff, hair, hairOut}; })()`).catch(e => ({ err: e.message }));
    T(r && r.diff && r.diff.length === 0, 'T6 全部预设清洗前后零差异', JSON.stringify(r && r.diff));
    T(r && r.hair >= 2 && r.hairOut === r.hair, 'T6b 楔形 dyn:\'<\'/\'>\' 清洗后保真', r ? `${r.hair}→${r.hairOut}` : '');
    const hp = await pg.evaluate(`(()=>{ const i=PRESETS.findIndex(p=>/"dyn":"[<>]"/.test(JSON.stringify(p.make()))); if(i<0) return null;
      const cnt=()=>document.getElementById('score').querySelectorAll('polyline,path,line').length;
      loadSong(PRESETS[i].make()); render(); const a=cnt();
      loadSong(sanitizeUntrusted(PRESETS[i].make())); render(); const z=cnt(); return {i,a,z}; })()`).catch(e => ({ err: e.message }));
    T(hp && hp.a === hp.z && hp.a > 0, 'T6c 含楔形的预设经清洗后谱面线条数不变', JSON.stringify(hp));
    const x = await pg.evaluate(`(()=>{ window.__pwn=null;
      const s=PRESETS[0].make(); const P='<img src=x onerror="window.__pwn=1">', Q='" onmouseover="window.__pwn=2" x="';
      const m=s.measures[0]; m.volta=P; m.label=P;
      (m.tabs[0]||[]).forEach(c=>{ c.chord=Q; (c.notes||[]).forEach(n=>{ n.f=P; n.s=Q; n.tech=Q; }); });
      (m.voxes[0]||[]).forEach(c=>{ c.deg=P; c.oct=Q; c.acc=Q; c.dyn=P; c.orn=Q; c.artic=Q; });
      s.customChords=s.customChords||{}; s.customChords[P]=[0,0,0,0,0,0];
      loadSong(sanitizeUntrusted(s)); if(typeof hideStartPad==='function') hideStartPad(); render();
      const on=[...document.querySelectorAll('#score *')].filter(e=>[...e.attributes].some(a=>/^on/i.test(a.name))).length;
      return {pwn:window.__pwn, img:document.querySelectorAll('#score img').length, on}; })()`).catch(e => ({ err: e.message }));
    T(x && x.pwn === null && x.img === 0 && x.on === 0, 'T6d 注入 deg/f/s/tech/volta/dyn/和弦/键名 清洗后零事件属性零脚本', JSON.stringify(x));
    await pg.close();
  }

  /* ---------- T7 ?mine= 限本人 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(async()=>{ window.__pwn=null; const lib0=JSON.stringify(libLoad());
      const evil=PRESETS[0].make(); evil.measures[0].voxes=evil.measures[0].voxes||[[]];
      (evil.measures[0].tabs[0]||[]).forEach(c=>(c.notes||[]).forEach(n=>{ n.f='<img src=x onerror="window.__pwn=1">'; }));
      const orig=apiCall;
      apiCall=async(p)=>{ if(/^\\/scores\\//.test(p)){ const e=new Error('无权访问'); e.status=403; throw e; }
        if(/^\\/pub\\/scores\\//.test(p)) return {score:{id:'evil1', title:'恶意谱', data:evil, author:'x'}};
        return {}; };
      try{ await openRemoteMine('evil1'); await new Promise(r=>setTimeout(r,300)); }finally{ apiCall=orig; }
      return {viewer:!!viewerMode, pwn:window.__pwn, libSame: JSON.stringify(libLoad())===lib0}; })()`).catch(e => ({ err: e.message }));
    T(r && r.viewer && r.pwn === null && r.libSame, 'T7 他人谱 ?mine= 被服务端拒后改走观看页（经清洗、不入本机库）', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T8 登录弹窗 ---------- */
  {
    const pg = await open();
    const r = await pg.evaluate(`(async()=>{ const out={};
      const orig=apiCall;
      apiCall=async(p)=>{ if(p==='/auth/sms/verify') return {user:{id:7,phone:'13800001111',nickname:'测试'}, is_new:false}; return {}; };
      try{
        openLogin(); document.getElementById('lg-cancel').click();
        out.edCancelClosed=!document.getElementById('modal-mask'); out.edCancelNoPc=!document.getElementById('pcenter');
        openPersonal('profile'); out.pc=!!document.getElementById('pcenter');
        openLogin(); document.getElementById('lg-cancel').click();
        out.pcCancelClosed=!document.getElementById('modal-mask');
        openLogin(); document.getElementById('lg-phone').value='13800001111'; document.getElementById('lg-code').value='123456';
        document.getElementById('lg-go').click(); await new Promise(r=>setTimeout(r,200));
        out.pcLoginClosed=!document.getElementById('modal-mask');
      }finally{ apiCall=orig; try{ acctSave(null); }catch(_){} }
      return out; })()`).catch(e => ({ err: e.message }));
    T(r && r.edCancelClosed && r.edCancelNoPc, 'T8 编辑器里取消登录：关窗且不被拽进个人中心', JSON.stringify(r));
    T(r && r.pc && r.pcCancelClosed, 'T8b 个人中心里「取消」能关掉登录弹窗', JSON.stringify(r));
    T(r && r.pcLoginClosed, 'T8c 个人中心里登录成功后弹窗关闭', JSON.stringify(r));
    await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
