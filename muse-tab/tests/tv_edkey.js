/* v60.50 编辑器变调弹窗回归（产品指示：吉他曲谱编辑时点击调号弹窗功能与曲谱浏览一致——
   可选指法、恢复原调等）：
   T1 弹窗结构：点顶栏 1=X 出 #ekey-pop（原调行/唱调行/夹行/等式/夹位速选 8 chips）；点外收起
   T2 编辑器换调=v60.39 重排实证：stepKey(+2) 后伴奏列逐弦落在新和弦图上（非逐品平移）、
      旋律列音高精确 +2、和弦名平移——对 v60.49 旧文件（旧 transposeEditor 平移引擎）当场红=突变实证
   T3 变调夹唱调锁定：夹 +2 → 唱调不变、指法调 −2、伴奏列在换算后和弦图上、旋律演奏音高不变
   T4 恢复原调：多步操作后一键回打开弹窗时快照（key/capo/逐列 notes 深比对）
   T5 夹位速选：8 chips、派生指法调标签、CAGED 金标、点选即落夹位
   T6 非吉他谱类：夹区整体隐藏、唱调行仍可用
   —— v60.55 追加（产品指示：右上角变调功能删除，弹窗改由谱面上的调号点击打开、配色跟随谱面浅色）：
   T7 谱面 1=X 真实点击开弹窗（顶栏 key-step 已撤下 / 不再产生调名平铺 popmenu / 就地锚在调号下方 / 再点收起）
   T8 弹窗底色 = --panel 浅色（观看页 #key-pop 仍深色，作对照护栏）
   file:// 直载。 */
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

  // 统一测试谱：净弹唱谱，M0=C 柱式伴奏列+单音旋律列，M1=Am 分解两列
  const setup = `
    try{ localStorage.removeItem('musetab-nw-last'); }catch(_){}   /* v67.4 面板记住上次用途：本套件统一测试谱要的是默认吉他弹唱 */
    showNewWizard(); document.getElementById('nw-create').click();
    const shp = n => chordShape(n), ss = (n,s) => shapeString(shp(n), s);
    const col = (o) => Object.assign({dur:4, dotted:false, chord:'', notes:[], strum:'', tech:''}, o);
    song.measures[0].tabs[0] = [
      col({chord:'C', notes:shapeSounded(shp('C')).map(n=>({s:n.s,f:n.f})), strum:'d'}),
      col({notes:[{s:1,f:0}]}),                        // 旋律音 E4（不在语境伴奏占比里也可）
      col({notes:shapeSounded(shp('C')).map(n=>({s:n.s,f:n.f}))}),
      col({notes:shapeSounded(shp('C')).map(n=>({s:n.s,f:n.f}))}),
    ];
    song.measures[1].tabs[0] = [
      col({chord:'Am', notes:[{s:5,f:0}]}), col({notes:[{s:3,f:2}]}),
      col({notes:[{s:2,f:1}]}), col({notes:[{s:1,f:0}]}),
    ];`;

  // T1 弹窗结构与开合
  let r = await pg.evaluate(setup + `(()=>{
    document.getElementById('k-val').click();
    const pop=document.getElementById('ekey-pop');
    const q=s=>!!document.querySelector(s);
    const open1=pop.classList.contains('on');
    const st={ open1, orig:q('#ek-orig-v'), reset:q('#ek-reset'),
      up:q('#ek-up'), dn:q('#ek-dn'), cup:q('#ek-cup'), cdn:q('#ek-cdn'),
      eq:!!document.getElementById('ek-eq').textContent,
      chips:document.querySelectorAll('#ek-chips .kp-chip').length,
      keyTxt:document.getElementById('ek-v').textContent };
    document.body.click();
    st.closed=!pop.classList.contains('on');
    return st; })()`);
  T(r.open1 && r.orig && r.reset && r.up && r.dn && r.cup && r.cdn && r.eq
    && r.chips === 8 && /C/.test(r.keyTxt) && r.closed,
    'T1 弹窗结构（原调/唱调/夹/等式/8速选chips）+点外收起', JSON.stringify(r));

  // T2 换调=v60.39 重排（stepKey 路径；对旧平移引擎当场红）
  r = await pg.evaluate(`(()=>{
    stepKey(2);
    const ss=(n,s)=>shapeString(chordShape(n),s);
    const m0=song.measures[0].tabs[0], m1=song.measures[1].tabs[0];
    const tun=tuningOf();
    const accompOn = m0[0].notes.every(n=>ss(m0[0].chord,n.s)===n.f)
      && m0[2].notes.every(n=>ss('D',n.s)===n.f);
    return { key:song.key, ch0:m0[0].chord, ch1:m1[0].chord,
      accompOn,
      melody: tun[m0[1].notes[0].s-1]+m0[1].notes[0].f,   // 原 E4=64 → +2=66
      am1: tun[m1[1].notes[0].s-1]+m1[1].notes[0].f };    // 原 A3+2=47? s3f2=A3(45+2=47)→+2=49
  })()`);
  T(r.key === 'D' && r.ch0 === 'D' && r.ch1 === 'Bm' && r.accompOn
    && r.melody === 66 && r.am1 === 59,
    'T2 换调+2：伴奏随 D 图取形/旋律精确+2/和弦名平移（旧平移引擎必红）', JSON.stringify(r));

  // T3 变调夹唱调锁定（夹+2：唱调 D 不变、指法调 C、伴奏在 C 图上、旋律演奏音高不变）
  r = await pg.evaluate(`(()=>{
    document.getElementById('k-val').click();   // 开弹窗（建立快照基线）
    const sndBefore=edSoundKey();
    const melBefore=(()=>{ const n=song.measures[0].tabs[0][1].notes[0]; return tuningOf()[n.s-1]+n.f; })();
    edSetCapo(2);
    const ss=(n,s)=>shapeString(chordShape(n),s);
    const m0=song.measures[0].tabs[0];
    const n=m0[1].notes[0];
    return { snd:edSoundKey(), sndBefore, capo:song.capo, key:song.key,
      accompOn: m0[0].notes.every(x=>ss(m0[0].chord,x.s)===x.f), ch:m0[0].chord,
      melPlay: tuningOf()[n.s-1]+2+n.f, melBefore,
      cv:document.getElementById('ek-cv').textContent };
  })()`);
  T(r.snd === r.sndBefore && r.capo === 2 && r.key === 'C' && r.ch === 'C' && r.accompOn
    && r.melPlay === r.melBefore && /2 品/.test(r.cv),
    'T3 夹+2 唱调锁定（唱 D 不变/指法 C/伴奏 C 图/旋律演奏音高不变）',
    JSON.stringify(r));

  // T4 恢复原调（回到 T3 打开弹窗时：key=D capo=0）
  r = await pg.evaluate(`(()=>{
    const before={key:song.key, capo:song.capo};
    document.getElementById('ek-reset').click();
    const m0=song.measures[0].tabs[0];
    const ss=(n,s)=>shapeString(chordShape(n),s);
    return { before, key:song.key, capo:song.capo||0, ch:m0[0].chord,
      accompOn: m0[0].notes.every(x=>ss('D',x.s)===x.f),
      resetOff: document.getElementById('ek-reset').disabled };
  })()`);
  T(r.before.key === 'C' && r.key === 'D' && r.capo === 0 && r.ch === 'D' && r.accompOn && r.resetOff,
    'T4 恢复原调（快照整体回填 D/夹0，恢复后按钮回禁用）', JSON.stringify(r));

  // T5 夹位速选（唱 D：chip2 派生 C 且 CAGED 金标；点选落位）
  r = await pg.evaluate(`(()=>{
    const chips=[...document.querySelectorAll('#ek-chips .kp-chip')];
    const c2=chips.find(c=>c.dataset.ekcapo==='2');
    const lab2=c2.querySelector('i').textContent;
    const ez2=c2.classList.contains('ez');
    c2.click();
    return { lab2, ez2, capo:song.capo, key:song.key, snd:edSoundKey(),
      on2: document.querySelector('#ek-chips .kp-chip[data-ekcapo="2"]').classList.contains('on') };
  })()`);
  T(r.lab2 === 'C' && r.ez2 && r.capo === 2 && r.key === 'C' && r.snd === 'D' && r.on2,
    'T5 夹位速选（chip2=派生C·CAGED金标·点选落夹唱调不变）', JSON.stringify(r));

  // T6 非吉他谱类：夹区隐藏
  r = await pg.evaluate(`(()=>{
    document.body.click();
    showNewWizard();
    document.querySelector('.nf-modal [data-scene="vocal"]').click();   /* v67.4 新建面板「歌谱 · 合唱」（原声乐意图卡） */
    document.getElementById('nw-create').click();
    document.getElementById('k-val').click();
    const capoRows=[...document.querySelectorAll('#ekey-pop .kp-capo')];
    const hidden=capoRows.every(x=>x.style.display==='none');
    const kt=document.getElementById('ek-v').textContent;
    /* v69.6 迁移（复核 F9 有意变化）：移调落成的调按「升降号少的写法」——音级 1 写 ♭D（不再是 KEY_LIST 的 ♯C），♯F / ♭G 随原调方向 */
    const pc1=((KEY_PC[song.key]||0)+1)%12, want=pc1===1? 'Db' : pc1===6? ((KEYSIG[song.key]||0)<0? 'Gb' : 'F#') : KEY_LIST[pc1];
    edTranspose(1);
    const k2=song.key;
    document.body.click();
    return { hidden, kt, ok: k2===want };
  })()`);
  T(r.hidden && /1=/.test(r.kt) && r.ok, 'T6 非吉他谱夹区隐藏+唱调行可用', JSON.stringify(r));

  /* ===== v60.55 追加（产品指示：顶栏变调组删除、改点谱面上的调号；弹窗跟随谱面浅色） ===== */

  // T7 谱面 1=X 真实点击 → 开变调弹窗（不是旧的调名平铺 popmenu）；顶栏变调组已撤下；再点收起
  //    真点（非 showHeadMenu 直调）才测得到：弹窗是 pointerdown 开的，随后的 click 冒到 document
  //    会被「点外收起」当场关掉——popKeepOpen 放行该热区就是为这个。
  await pg.evaluate(`loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:1,lyr:1})); render();`);
  await pg.waitForTimeout(200);
  {
    const hz = await pg.$('#score [data-hd="key"]');
    const box = hz && await hz.boundingBox();
    const cx = box ? box.x + box.width / 2 : 0, cy = box ? box.y + box.height / 2 : 0;
    if (box) await pg.mouse.click(cx, cy);
    await pg.waitForTimeout(200);
    const o1 = await pg.evaluate(() => {
      const p = document.getElementById('ekey-pop'), ks = document.getElementById('key-step');
      const pr = p.getBoundingClientRect();
      return { hz: true, on: p.classList.contains('on'), disp: getComputedStyle(p).display,
        topHidden: !ks || ks.offsetParent === null, noMenu: !document.getElementById('popmenu'),
        chips: document.querySelectorAll('#ek-chips .kp-chip').length,
        top: +pr.top.toFixed(1), w: +pr.width.toFixed(1) };
    });
    if (box) await pg.mouse.click(cx, cy);
    await pg.waitForTimeout(200);
    const closed = await pg.evaluate(() => !document.getElementById('ekey-pop').classList.contains('on'));
    r = { ...o1, hz: !!box, closed, anchoredBelow: !!box && o1.top > cy - 4 };
  }
  T(r.hz && r.on && r.disp === 'flex' && r.topHidden && r.noMenu && r.chips === 8
    && r.anchoredBelow && r.w > 200 && r.closed,
    'T7 谱面 1=X 真实点击开变调弹窗（顶栏组撤下 / 无调名 popmenu / 再点收起）', JSON.stringify(r));

  // T8 弹窗浅色化：底色取自 --panel（浅色主题下高亮度），不再是旧的深绿浮层；观看页 #key-pop 维持深色
  r = await pg.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number);
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    const ek = document.getElementById('ekey-pop'), kp = document.getElementById('key-pop');
    const ekBg = getComputedStyle(ek).backgroundColor;
    const panel = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();
    const probe = document.createElement('div');
    probe.style.cssText = 'background:var(--panel)'; document.body.appendChild(probe);
    const panelRGB = getComputedStyle(probe).backgroundColor; probe.remove();
    const chip = document.querySelector('#ek-chips .kp-chip');
    return { ekBg, panelRGB, panel, sameAsPanel: ekBg === panelRGB, ekLum: +lum(ekBg).toFixed(3),
      kpLum: +lum(getComputedStyle(kp).backgroundColor).toFixed(3),
      chipColor: chip ? getComputedStyle(chip).color : null,
      titleColor: getComputedStyle(document.getElementById('ek-v')).color };
  });
  T(r.sameAsPanel && r.ekLum > 0.8 && r.kpLum < 0.3,
    'T8 变调弹窗改浅色（底色=--panel；观看页 key-pop 仍深色不受影响）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
function KEY_NEXT_OF_C(){ return 'Db'; }
