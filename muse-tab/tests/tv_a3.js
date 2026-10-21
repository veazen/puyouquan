/* v63.1 A3 编辑会话安全（2026-10 评审团 §6.2 A3：P1-02 / P1-04 / P1-08 止血 / P1-09 / P3-31）：
   T1 启动台按键不改谱：数字/删除/方向/Ctrl+Z/Ctrl+V 都不动 song 与 musetab-song-v1；body.startpad 挂上
   T2 启动台点击不改谱：编辑栏、撤销、移调、左栏页签真鼠标点击都不动 song（编辑区 inert）
   T3 启动台 Ctrl+O 仍可打开文件（唯一放行的编辑器快捷键）
   T4 首帧不裁切：1440 / 1280 两档「继续上次编辑」后及开合左栏面板后 score.right ≤ paper.right
   T5 歌词逐音撤销：连打三个音的歌词后 Ctrl+Z 只回退最后一个音；再 Ctrl+Z 回退倒数第二个；之前的改音不被一并撤掉；Ctrl+Y 可重做
   T6 手机启动台＝只读引导：不出现「新建 / 导入」，出现「看示例 / 发到电脑继续」，后者复制制谱链接；页面无横向滚动
   T7 小节线菜单不出屏：手机 390 宽在最右侧小节线弹出，菜单完整落在视口内、页面无横向滚动；桌面贴右边缘同样
   突变实证：对 v63.1 之前的文件复跑，T1–T7 全部报红（0/7）。 */
const { chromium } = require('playwright');
/* v68.2 切默认（flow）：全部用例在默认外壳（flow）跑（启动台守卫 / 首帧不裁切 / 歌词逐音撤销 / 手机启动台 / 小节线菜单都是功能）；
   T4 另在 ?shell=classic 跑一遍（旧外壳的左栏面板开合是兜底布局独有的重排路径）；T5 进入逐字填词按外壳走真实入口——
   flow：谱面光标上按 Enter（「Enter 填词」，焦点进左栏 #i-lyric）；旧外壳：左栏「歌词」面板 openFlyout('lyr')。逐字录入与撤销断言不变 */
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const withQ = (u, q) => q ? u + (u.includes('?') ? '&' : '?') + q : u;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (vp, q) => {
    const pg = await b.newPage({ viewport: vp || { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(withQ(F, q)); await pg.waitForTimeout(1100);
    await pg.evaluate(`(()=>{ window.SF_PLAYWAIT=false; if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); })()`);
    return pg;
  };
  const SNAP = `(()=>({s:JSON.stringify(song), ls:localStorage.getItem('musetab-song-v1')||''}))()`;

  /* ---------- T1 / T2 / T3 启动台守卫 ---------- */
  {
    const pg = await open();
    const s0 = await pg.evaluate(SNAP);
    const on = await pg.evaluate(`({pad:startPadOn(), cls:document.body.classList.contains('startpad')})`);
    for (const k of ['1', '5', 'Delete', 'Backspace', 'ArrowRight', 'ArrowUp', '+', 'Control+z', 'Control+v', 'Shift+ArrowRight', 'r', 'Enter']) {
      await pg.keyboard.press(k).catch(() => {}); await pg.waitForTimeout(30);
    }
    await pg.waitForTimeout(200);
    const s1 = await pg.evaluate(SNAP);
    T(on.pad && on.cls && s1.s === s0.s && s1.ls === s0.ls, 'T1 启动台按键不改谱（12 个键含 Ctrl+Z/V）', JSON.stringify({ ...on, same: s1.s === s0.s, lsSame: s1.ls === s0.ls }));

    /* 真鼠标点击编辑区按钮（按坐标点，inert 时点不中） */
    const ids = ['#eb-clear', '#eb-rest', '#eb-octup', '#eb-acc-s', '#b-undo', '#k-up', '#eb-delcol2', '.ltab',
      '#flw-pgrid .flw-sg', '#flw-tlist .flw-trow .flw-tn', '#flw-modes [data-fa]'];   /* v68.2 flow：左栏记号格 / 音轨行 / 模式条（启动台下应点不中或不改谱） */
    const hits = [];
    for (const id of ids) {
      const box = await pg.evaluate(`(()=>{ const e=document.querySelector('${id}'); if(!e) return null; const r=e.getBoundingClientRect();
        return (r.width&&r.height)? {x:r.x+r.width/2, y:r.y+r.height/2} : null; })()`);
      if (!box) { hits.push(id + ':无'); continue; }
      await pg.mouse.click(box.x, box.y); await pg.waitForTimeout(60);
      hits.push(id);
    }
    await pg.waitForTimeout(200);
    const s2 = await pg.evaluate(SNAP);
    const st = await pg.evaluate(`({pad:startPadOn(), flyHidden:document.getElementById('left-flyout').classList.contains('hidden'),
      inert:['editbar','left-dock','right-dock'].map(id=>{ const e=document.getElementById(id); return e? !!e.inert : null; })})`);
    T(s2.s === s0.s && s2.ls === s0.ls && st.pad && st.flyHidden, 'T2 启动台真鼠标点击编辑区不改谱、不展开面板', JSON.stringify({ hits, same: s2.s === s0.s, ...st }));

    await pg.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    const fc = pg.waitForEvent('filechooser', { timeout: 5000 }).then(() => true).catch(() => false);
    await pg.keyboard.press('Control+o');
    T(await fc, 'T3 启动台 Ctrl+O 打开文件');
    await pg.close();
  }

  /* ---------- T4 首帧不裁切 + 开合面板后重排 ---------- */
  {
    const res = [];
    const GEO = `(()=>{ const s=document.getElementById('score').getBoundingClientRect(), p=document.getElementById('paper').getBoundingClientRect();
      return {sr:Math.round(s.right), pr:Math.round(p.right)}; })()`;
    for (const [w, q] of [[1440, ''], [1280, ''], [1440, 'shell=classic'], [1280, 'shell=classic']]) {
      const pg = await open({ width: w, height: 900 }, q);
      /* v67.4「继续上次编辑」只给自己的谱（原样示例谱不算，修 P2-24）：先把示例谱存成自己的（改曲名落盘）再刷新，谱面内容不变 */
      await pg.evaluate(() => { song.title = '我的练习'; persistNow(); });
      await pg.reload(); await pg.waitForTimeout(1100);
      await pg.click('[data-sp="cont"]'); await pg.waitForTimeout(150);
      const g0 = await pg.evaluate(GEO);
      await pg.evaluate(`(()=>{ const t=[...document.querySelectorAll('.ltab')].find(x=>!x.classList.contains('on')); t&&t.click(); })()`); await pg.waitForTimeout(150);
      const g1 = await pg.evaluate(GEO);
      await pg.evaluate(`closeFlyout()`); await pg.waitForTimeout(150);
      const g2 = await pg.evaluate(GEO);
      await pg.evaluate(`openFlyout(activeTab)`); await pg.waitForTimeout(150);
      const g3 = await pg.evaluate(GEO);
      res.push({ w, shell: await pg.evaluate(() => document.body.classList.contains('flow') ? 'flow' : 'classic'), g0, g1, g2, g3 });
      await pg.close();
    }
    const ok = res.every(r => [r.g0, r.g1, r.g2, r.g3].every(g => g.sr <= g.pr + 1)) && res.map(r => r.shell).join() === 'flow,flow,classic,classic';
    T(ok, 'T4 1440/1280「继续上次编辑」首帧及开合左栏后 score.right ≤ paper.right（flow + 旧外壳）', JSON.stringify(res));
  }

  /* ---------- T5 歌词逐音撤销 ---------- */
  {
    const pg = await open();
    await pg.evaluate(`(()=>{ const s=createSong('vox',{title:'歌词',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1});
      s.measures[0].voxes[0].forEach((c,i)=>{ c.deg=i+1; }); loadSong(s); hideStartPad(); undoStack.length=0; redoStack=[];
      sel={mi:0,row:'vox',vi:0,ci:0,si:1}; activeLyr=0;
      mutate(()=>{ song.measures[1].voxes[0][0].deg=5; });   /* 先改一个音：歌词撤销不能把它一并撤掉 */
      render(); })()`);
    const flow5 = await pg.evaluate(`document.body.classList.contains('flow')`);
    if (flow5) {   /* flow：谱面光标在第 1 列，按 Enter＝逐字填词（焦点进左栏 #i-lyric） */
      await pg.evaluate(`(()=>{ const a=document.activeElement; if(a && a!==document.body && a.blur) a.blur(); })()`);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    } else await pg.evaluate(`(()=>{ openFlyout('lyr'); const i=document.getElementById('i-lyric'); i.value=''; i.focus(); })()`);
    const in5 = await pg.evaluate(`(()=>{ const i=document.getElementById('i-lyric'); return {focus:document.activeElement===i, inLeft:!!i.closest(document.body.classList.contains('flow')? '#flw-left' : '#left-dock'), v:i.value, sel:[sel.mi,sel.ci]}; })()`);
    for (const ch of ['春', '眠', '不']) { await pg.keyboard.type(ch); await pg.keyboard.press('Enter'); await pg.waitForTimeout(40); }
    await pg.evaluate(`document.getElementById('i-lyric').blur()`);
    const L = `(()=>song.measures[0].voxes[0].map(c=>(c.lyrics||[])[0]||'').join('|')+'#'+song.measures[1].voxes[0][0].deg)()`;
    const a0 = await pg.evaluate(L);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(60); const a1 = await pg.evaluate(L);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(60); const a2 = await pg.evaluate(L);
    await pg.keyboard.press('Control+y'); await pg.waitForTimeout(60); const a3 = await pg.evaluate(L);
    T(in5.focus && in5.inLeft && in5.v === '' && in5.sel.join() === '0,0' && a0 === '春|眠|不|#5' && a1 === '春|眠||#5' && a2 === '春|||#5' && a3 === '春|眠||#5',
      'T5 歌词逐音撤销（' + (flow5 ? 'flow：Enter 进逐字填词' : '旧外壳：左栏歌词面板') + '；只退最后一个音的词，改音不被连带撤销，可重做）', JSON.stringify({ in5, a0, a1, a2, a3 }));
    await pg.close();
  }

  /* ---------- T6 手机启动台只读引导 ---------- */
  {
    const pg = await open({ width: 390, height: 844 });
    const r = await pg.evaluate(`(async()=>{ const vis=s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
      let msg=''; const ot=toast; toast=m=>{ msg=String(m); };
      const out={pad:startPadOn(), newVis:vis('[data-sp="new"]'), impVis:vis('[data-sp="imp"]'), demoVis:vis('[data-sp="demo"]'), pcVis:vis('[data-sp="pc"]'),
        note:(document.getElementById('spd-mnote')||{}).textContent||'', sw:document.documentElement.scrollWidth};
      let copied=''; const oc=copyLinkForPc; copyLinkForPc=(u,w)=>{ copied=u; msg='已复制'+(w||''); };
      const pc=document.querySelector('[data-sp="pc"]'); if(pc) pc.click();
      await new Promise(r=>setTimeout(r,120)); out.msg=msg; out.copied=copied; toast=ot; copyLinkForPc=oc; return out; })()`);
    T(r.pad && !r.newVis && !r.impVis && r.demoVis && r.pcVis && /电脑/.test(r.note) && r.sw <= 390
      && /已复制/.test(r.msg) && /zhipu\.puyouquan\.com/.test(r.copied),
      'T6 手机启动台：无新建/导入，有看示例/发到电脑继续（复制制谱链接），无横向滚动', JSON.stringify(r));
    await pg.close();
    /* v68.7 S1（规格 §6.C5 / 功能保全 #26）：新外壳（html.flow-pre）手机启动台不出底注 #spd-mnote（节点与文字照在，上面 T6 读 textContent 照过），
       同屏「发到电脑继续」卡可见＝同一件事的去处；旧外壳（?shell=classic）底注照显、文字不变。修前红：5cddfb8 新外壳底注可见（note 为 true） */
    const vis6 = `(()=>{ const vis=s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
      return { pre:document.documentElement.classList.contains('flow-pre'), pad:startPadOn(), note:vis('#spd-mnote'), pc:vis('[data-sp="pc"]'), txt:(document.getElementById('spd-mnote')||{}).textContent||'' }; })()`;
    const pf = await open({ width: 390, height: 844 }); const nf = await pf.evaluate(vis6); await pf.close();
    const pc = await open({ width: 390, height: 844 }, 'shell=classic'); const nc = await pc.evaluate(vis6); await pc.close();
    T(nf.pre && nf.pad && !nf.note && nf.pc && /电脑/.test(nf.txt) && !nc.pre && nc.pad && nc.note && nc.pc && nc.txt === nf.txt,
      'T6b 新外壳手机启动台不出底注、「发到电脑继续」卡可见；旧外壳底注照显（文字同一份）', JSON.stringify({ nf, nc }));
  }

  /* ---------- T7 小节线菜单不出屏 ---------- */
  {
    const res = [];
    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const pg = await open(vp);
      const r = await pg.evaluate(`(async()=>{ loadSong(createSong('vox',{title:'线',key:'C',beats:4,unit:4,nMea:4,nVox:1,lyr:1})); hideStartPad(false);
        showBarMenu(innerWidth-6, 260, 1, 2, 'vox', 0);
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const m=document.getElementById('popmenu'); const r=m? m.getBoundingClientRect() : null;
        return {vw:innerWidth, l:r&&Math.round(r.left), rt:r&&Math.round(r.right), sw:document.documentElement.scrollWidth}; })()`);
      res.push(r); await pg.close();
    }
    T(res.every(r => r.l != null && r.l >= 0 && r.rt <= r.vw && r.sw <= r.vw), 'T7 小节线菜单完整落在视口内、无横向滚动（390 / 1280）', JSON.stringify(res));
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
