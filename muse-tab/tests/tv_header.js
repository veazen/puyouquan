/* v66.9 页头自适应排版回归（产品报障：小程序 web-view ≈390 宽看《独库公路G217》，左侧「1=♭A 4/4 变调夹 1 品（按 1=G 指法） ♩=67」
   与右侧「作词：林意梵」同基线互压）。全部为几何断言（SVG getBBox 数值坐标），不看截图：
   T1 《独库公路G217》原样信息：390 / 320 观看页、390 手机编辑页、390 跟练大字——左块×右块文字两两不相交、全部落在版心 [MARGIN, PAGE_W−MARGIN]
   T2 超长歌名（「…（Live 版）——献给…」与 40 字中文）：不越版心、不与演唱者行相交、字号 ≥18、必要时多行（且断在「——」前）
   T3 超长作词/作曲（多人、斜杠分隔、西文名）390 下右栏折行不溢出、人名不丢字
   T4 变调夹＋特殊调弦＋速度术语同时存在（390 / 320）
   T5 纯五线谱页头（只有速度，含长术语）与无词曲信息的谱
   T6 首行系统 / 曲首和弦图带（diagMode=top）不与页头相交（页头之后的所有元素都在页头底边之下）
   T7 点击直改热区 data-hd 覆盖对应文字，且在文字中心点 elementFromPoint 命中的就是该热区（没被别的热区盖住）
   T8 零变化：桌面 1280 / 1440 下 16 个内置预设，页头区域 SVG 与 v66.8 原写法（本文件内嵌的参照实现）逐字节一致、首行系统起点一致；
      常规长度的《独库公路G217》在桌面下文字逐字节一致（只有多项并排时的变调夹/速度热区改实测宽）
   T9 打印（emulateMedia print + beforeprint 切片）与导出 PNG 的 SVG（脱离页面 CSS、回落默认字体）同样不重叠、不越版心
   T10 16 个内置预设在 390 / 320 观看页页头同样不重叠、不越版心
   T11 固定种子随机压力（歌名/演唱/多人署名/变调夹/调弦/术语/谱类/拍号 × 320/375/600/1024）
   T2c 超长演唱者行同理：收字距 → 缩到 11 → 折行
   T12–T14（验收补）：歌名断点质量（结构断点优先于均衡）、署名折行不碎行且长署名不拖慢排版、极窄版心变调夹说明折行
   突变实证：MUSETAB_URL 指向 v66.8 复跑，见文末记录。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

const DUKU = { title: '独库公路G217', singer: '生命树下', lyricist: '林意梵', composer: '折 言', maker: '谱友圈',
  key: 'G', capo: 1, tempo: 67, beats: 4, unit: 4 };
const LONG1 = '独库公路G217（Live 版）——献给每一位在路上的人';
const LONG40 = '在那遥远的地方有位好姑娘人们走过她的帐房都要回头留恋地张望她那粉红的笑脸好像红太阳她那活泼动人的眼睛'.slice(0, 40);
const LYR_LONG = '林夕/黄伟文/周耀辉/陈少琪/李焯雄';
const CMP_LONG = 'Ed Sheeran / Johnny McDaid / Steve Mac / Amy Wadge';

/* 页内几何采集：页头＝从歌名 <text font-weight=800> 到最后一个 data-hd 热区（renderCore 连续推入）；
   分类：title＝800 字重、singer＝居中且无 font-family、right＝右对齐（词曲署名）、left＝其余（1=X、拍号数字、变调夹/调弦/速度） */
const GEO = `function hdGeo(svg){
  const kids=[...svg.children];
  const i0=kids.findIndex(e=>e.tagName.toLowerCase()==='text' && e.getAttribute('font-weight')==='800');
  let i1=-1; kids.forEach((e,i)=>{ if(e.hasAttribute('data-hd')) i1=i; });
  /* 包围盒一律换算到谱面 SVG 用户坐标（getBBox 是元素自身坐标系，带 transform 的字形要乘 CTM） */
  const M0=svg.getScreenCTM().inverse();
  const bb=e=>{ const b=e.getBBox(), sc=e.getScreenCTM(); if(!sc) return null; const m=M0.multiply(sc);
    const P=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>{ const q=svg.createSVGPoint(); q.x=x; q.y=y; return q.matrixTransform(m); });
    const xs=P.map(q=>q.x), ys=P.map(q=>q.y);
    return {x:+Math.min(...xs).toFixed(2), y:+Math.min(...ys).toFixed(2), x2:+Math.max(...xs).toFixed(2), y2:+Math.max(...ys).toFixed(2), w:b.width, h:b.height}; };
  const texts=[], zones=[], after=[];
  kids.slice(i0, i1+1).forEach(e=>{
    const tg=e.tagName.toLowerCase();
    if(e.hasAttribute('data-hd')){ const a=n=>+e.getAttribute(n);
      zones.push({hd:e.getAttribute('data-hd'), x:a('x'), y:a('y'), x2:a('x')+a('width'), y2:a('y')+a('height')}); return; }
    if(tg!=='text') return;
    const cls = e.getAttribute('font-weight')==='800'? 'title'
      : e.getAttribute('text-anchor')==='end'? 'right'
      : (e.getAttribute('text-anchor')==='middle' && !e.getAttribute('font-family'))? 'singer' : 'left';
    /* 排版外沿＝首字起点到末字终点（字形前进宽）；斜体/斜杠字形的墨迹外伸 1px 左右属光学外伸，不算越版心 */
    const n=e.getNumberOfChars();
    const ax=n? +e.getStartPositionOfChar(0).x.toFixed(2) : 0, ax2=n? +e.getEndPositionOfChar(n-1).x.toFixed(2) : 0;
    texts.push(Object.assign({cls, t:e.textContent, fs:+e.getAttribute('font-size'), ax, ax2}, bb(e)));
  });
  const hb=Math.max(...texts.map(t=>t.y2));
  kids.slice(i1+1).forEach(e=>{ if(e.id==='playhead'||e.id==='playline') return; let b=null; try{ b=bb(e); }catch(_){ return; }
    if(!b || !(b.w>0||b.h>0)) return;
    if(b.y < hb-0.5) after.push({tag:e.tagName, y:b.y, y2:b.y2, cls:e.getAttribute('class')||''}); });
  return {texts, zones, after, hb, i0, i1};
}`;

/* 节点侧判定：越版心 / 左×右 / 标题演唱×其余 / 标题×演唱 / 页头之后的元素高过页头底边 */
function verdict(g, PW, M) {
  const bad = [];
  const X = (a, b) => a.x < b.x2 - 0.01 && b.x < a.x2 - 0.01 && a.y < b.y2 - 0.01 && b.y < a.y2 - 0.01;
  const by = c => g.texts.filter(t => t.cls === c);
  const L = by('left'), R = by('right'), TT = by('title'), S = by('singer');
  g.texts.forEach(t => { if (t.ax < M - 0.3 || t.ax2 > PW - M + 0.3 || t.x < M - 2 || t.x2 > PW - M + 2) bad.push(`越版心 ${t.cls}「${t.t}」[${t.ax},${t.ax2}](墨迹[${t.x},${t.x2}])∉[${M},${PW - M}]`); });
  L.forEach(a => R.forEach(b => { if (X(a, b)) bad.push(`左×右「${a.t}」×「${b.t}」`); }));
  [...TT, ...S].forEach(a => [...L, ...R].forEach(b => { if (X(a, b)) bad.push(`${a.cls}×${b.cls}「${a.t}」×「${b.t}」`); }));
  TT.forEach(a => S.forEach(b => { if (X(a, b)) bad.push(`歌名×演唱「${a.t}」`); }));
  if (g.after.length) bad.push(`页头之后元素高过页头底边 ${g.hb}: ` + JSON.stringify(g.after.slice(0, 3)));
  if (!TT.length) bad.push('未找到歌名');
  return bad;
}

/* v66.8 页头原写法（逐字照抄 renderCore 2026-10 v66.8 段）——T8 零变化参照：在被测页里按同一全局状态重算，
   序列化后必须原样出现在 #score 里；返回值 top 为原写法下的首行系统起点（含曲首和弦图带） */
const REF668 = `(()=>{ const p=[]; const wmm=PAGE_MM[layoutCfg().page][0];
  const MM = PAGE_W/wmm; const topMargin = Math.round(12*MM); let headY = topMargin + 22;
  p.push(\`<text x="\${PAGE_W/2}" y="\${headY}" font-size="28" font-weight="800" letter-spacing="3" text-anchor="middle" fill="var(--ink)">\${esc(song.title)}</text>\`);
  headY += 24;
  if(song.singer){
    p.push(\`<text x="\${PAGE_W/2}" y="\${headY}" font-size="13" letter-spacing="2" text-anchor="middle" fill="var(--muted)">\${esc(song.singer)}</text>\`);
    headY += 7;
  }
  const credits=[];
  if(song.lyricist) credits.push(['作词：', song.lyricist]);
  if(song.composer) credits.push(['作曲：', song.composer]);
  if(song.maker) credits.push(['制谱：', song.maker]);
  credits.forEach(([k,v],i)=>
    p.push(\`<text x="\${PAGE_W-MARGIN}" y="\${headY+22+i*18}" font-size="12.5" letter-spacing="0.4" text-anchor="end"><tspan fill="var(--muted)">\${k}</tspan><tspan fill="var(--ink)">\${esc(v)}</tspan></text>\`));
  const pureStaff = !song.tabVoices.length && song.voxVoices.length>0 &&
    song.voxVoices.every((_,i2)=>isStaffNota((song.voxNotations||[])[i2]) && !(song.voxDual||[])[i2]);
  const capoShift = (song.tabVoices.length && song.capo>0 && !pureStaff)? song.capo : 0;
  const dispKey = capoShift? KEY_LIST[(KEY_PC[song.key]+capoShift)%12] : song.key;
  if(!pureStaff){
    const keyTxt='1='+keyLabel(dispKey), keyW=headTextW(keyTxt, 16, 'num');
    p.push(\`<text x="\${MARGIN}" y="\${headY+22}" font-size="16" font-family="var(--font-num)" fill="var(--ink)">\${esc(keyTxt)}</text>\`);
    const tsX = MARGIN + Math.max(42, Math.ceil(keyW) + 7);
    if(song.freeMeter)
      p.push(\`<text x="\${tsX}" y="\${headY+22}" font-size="12.5" fill="var(--ink)">散拍</text>\`);
    else{
      const tw = Math.max(14, 7*Math.max(String(song.beats).length, String(song.unit).length)+4), tc = tsX + tw/2;
      p.push(\`<text x="\${tc}" y="\${headY+15}" font-size="11" font-family="var(--font-num)" text-anchor="middle" fill="var(--ink)">\${song.beats}</text>\`);
      p.push(\`<line x1="\${tsX}" y1="\${headY+18}" x2="\${tsX+tw}" y2="\${headY+18}" stroke="var(--ink)" stroke-width="0.9"/>\`);
      p.push(\`<text x="\${tc}" y="\${headY+28}" font-size="11" font-family="var(--font-num)" text-anchor="middle" fill="var(--ink)">\${song.unit}</text>\`);
    }
  }
  const capoBits=[];
  if(song.capo>0 && !pureStaff) capoBits.push({t:esc(\`变调夹 \${song.capo} 品（按 1=\${song.key} 指法）\`), act:'capo'});
  { const tl = (typeof tuningLabel==='function') && tuningLabel(); if(tl && !pureStaff) capoBits.push({t:esc(tl), act:null}); }
  if(song.tempoTerm) capoBits.push({t:\`<tspan font-style="italic" font-weight="700" font-family="Georgia,serif">\${esc(song.tempoTerm)}</tspan>\`, act:'tempo'});
  capoBits.push({t:\`\${tempoGlyph(song)}=\${esc(song.tempo)}\`, act:'tempo'});
  const cbX0 = pureStaff? MARGIN : MARGIN+78;
  p.push(\`<text x="\${cbX0}" y="\${headY+22}" font-size="12.5" font-weight="\${pureStaff?'700':'400'}" fill="var(--ink)">\${capoBits.map(b2=>b2.t).join('　')}</text>\`);
  {
    const hz=(x,y,w2,h2,act,tip)=>p.push(\`<rect x="\${x.toFixed(1)}" y="\${y.toFixed(1)}" width="\${w2.toFixed(1)}" height="\${h2.toFixed(1)}" fill="transparent" data-hd="\${act}" style="cursor:pointer"><title>\${tip}</title></rect>\`);
    hz(MARGIN, topMargin-8, PAGE_W-2*MARGIN, headY-topMargin+10, 'meta', '点击编辑曲谱信息（标题/演唱/词曲/制谱等，实时预览）');
    if(!pureStaff){
      hz(MARGIN-4, headY+6, 50, 22, 'key', '点击打开变调弹窗：唱调 ♭♯ / 变调夹 / 夹位选指法 / 恢复原调（和弦与指法自动重排，可 Ctrl+Z）');
      hz(MARGIN+42, headY+2, 26, 30, 'meter', '点击设置全曲拍号（单个小节变拍：点击该小节拍号区）');
    }
    const estW = s2=>[...String(s2).replace(/<[^>]*>/g,'')].reduce((a,ch)=>a+(/[\\x00-\\xff]/.test(ch)?7:12.5),0);
    let cx2=cbX0;
    capoBits.forEach(b2=>{
      const w2=estW(b2.t);
      if(b2.act) hz(cx2-2, headY+9, w2+5, 18, b2.act,
        b2.act==='capo'? '点击设置变调夹（简谱实际调与播放同步联动）' : '点击设置速度 ♩=X');
      cx2 += w2 + 12.5;
    });
    if(credits.length) hz(PAGE_W-MARGIN-160, headY+8, 164, credits.length*18+8, 'meta', '点击编辑曲谱信息（标题/演唱/词曲/制谱等，实时预览）');
  }
  let top = headY + Math.max(42, credits.length? 22+credits.length*18+16 : 42);
  if(diagMode==='top'){ const ch=usedChords(); if(ch.length) top += Math.ceil(ch.length/14)*64 + 12; }
  const tmp=document.createElementNS('http://www.w3.org/2000/svg','svg'); tmp.innerHTML=p.join('');
  return {html:tmp.innerHTML, top};
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (vp, opts) => {
    const pg = await b.newPage({ viewport: vp, hasTouch: vp.width <= 820 });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    if (opts && opts.big) await pg.addInitScript(() => { try { localStorage.setItem('musetab-bigtext', '1'); } catch (_) {} });
    await pg.goto(F); await pg.waitForTimeout(800);
    await pg.evaluate(`(()=>{ window.guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0;
      try{ hideStartPad(); }catch(_){} toast=()=>{}; ${GEO}; window.hdGeo=hdGeo; })()`);
    return pg;
  };
  /* 造谱：独库公路 G217 骨架（弹唱：1 吉他＋1 简谱＋1 段词，8 小节，和弦 Em/C/D/Bm7） */
  const MK = (o) => `(()=>{ const o=${JSON.stringify(o)};
    const s=createSong(o.type||'guitar', Object.assign({beats:4, unit:4, key:'G', nMea:8, nTab:1, nVox:1, lyr:1}, o));
    ['lyricist','composer','maker','singer','title'].forEach(k=>{ if(o[k]!=null) s[k]=o[k]; });
    if(o.capo!=null) s.capo=o.capo; if(o.tempo!=null) s.tempo=o.tempo; if(o.tuning) s.tuning=o.tuning.slice();
    if(o.tempoTerm) s.tempoTerm=o.tempoTerm;
    if(s.tabVoices.length) ['Em','C','D','Bm7','Em','C','D','Em'].forEach((c,i)=>{ if(s.measures[i]) s.measures[i].tabs[0][0].chord=c; });
    return s; })()`;
  /* 观看页 / 编辑页载入并采集几何 */
  const viewGeo = async (pg, o) => pg.evaluate(`(()=>{ try{ const s=${MK(o)}; ${o.diagTop ? "diagMode='top';" : ''}
    enterShareViewer({song:s}); window.scrollTo(0,0);
    return Object.assign(hdGeo(document.getElementById('score')), {PW:PAGE_W, M:MARGIN, sys0:(SYS_GEO[0]||{}).y0}); }catch(e){ return {err:String(e&&e.stack||e)}; } })()`);
  const editGeo = async (pg, o) => pg.evaluate(`(()=>{ try{ const s=${MK(o)}; ${o.diagTop ? "diagMode='top';" : ''}
    loadSong(s); blurSel=true; render(); window.scrollTo(0,0);
    return Object.assign(hdGeo(document.getElementById('score')), {PW:PAGE_W, M:MARGIN, sys0:(SYS_GEO[0]||{}).y0}); }catch(e){ return {err:String(e&&e.stack||e)}; } })()`);
  const one = async (vp, o, mode, opts) => {
    const pg = await open(vp, opts);
    const g = await (mode === 'edit' ? editGeo : viewGeo)(pg, o);
    await pg.close();
    return g;
  };
  const sumBad = (g) => g.err ? [g.err] : verdict(g, g.PW, g.M);

  /* ---------- T1 《独库公路G217》原样 ---------- */
  {
    const res = [];
    for (const [vp, mode, opts, tag] of [[{ width: 390, height: 844 }, 'view', null, '390观看'], [{ width: 320, height: 640 }, 'view', null, '320观看'],
      [{ width: 390, height: 844 }, 'edit', null, '390编辑'], [{ width: 390, height: 844 }, 'view', { big: 1 }, '390观看·大字']]) {
      const g = await one(vp, DUKU, mode, opts);
      const bad = sumBad(g);
      res.push({ tag, PW: g.PW, M: g.M, bad });
    }
    res.forEach(r => T(r.bad.length === 0, `T1 独库公路G217 ${r.tag}（PAGE_W=${r.PW} MARGIN=${r.M}）左右块不相交、不越版心`, r.bad.join(' | ') || 'ok'));
  }

  /* ---------- T2 超长歌名 ---------- */
  {
    for (const [title, tag] of [[LONG1, '「…（Live 版）——献给…」'], [LONG40, '40 字中文']]) {
      for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
        const g = await one(vp, Object.assign({}, DUKU, { title }), 'view');
        const bad = sumBad(g);
        const tl = (g.texts || []).filter(t => t.cls === 'title');
        const minFs = Math.min(...tl.map(t => t.fs));
        const joined = tl.map(t => t.t).join('');
        if (minFs < 18) bad.push('歌名字号 ' + minFs + ' < 18');
        if (joined.replace(/\s/g, '') !== title.replace(/\s/g, '')) bad.push('歌名丢字：' + joined);
        if (title === LONG1 && vp.width === 390 && !(tl.length === 2 && /^——/.test(tl[1].t))) bad.push('期望两行且第二行以「——」起：' + JSON.stringify(tl.map(t => t.t)));
        T(bad.length === 0, `T2 超长歌名 ${tag} @${vp.width}：${tl.length} 行 ${minFs}px，不越版心、不压演唱者`, bad.join(' | ') || JSON.stringify(tl.map(t => t.t)));
      }
    }
  }

  /* ---------- T2c 超长演唱者行：收字距 → 缩字号（≥11）→ 折行，不越版心、不压歌名与信息块 ---------- */
  {
    const singer = '生命树下乐队 feat. 天山南北青年合唱团 & 城市之声交响乐团';
    for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const g = await one(vp, Object.assign({}, DUKU, { singer }), 'view');
      const bad = sumBad(g);
      const S = (g.texts || []).filter(t => t.cls === 'singer');
      if (Math.min(...S.map(t => t.fs)) < 11) bad.push('演唱者字号 < 11');
      if (S.map(t => t.t).join('').replace(/\s/g, '') !== singer.replace(/\s/g, '')) bad.push('演唱者丢字');
      T(bad.length === 0, `T2c 超长演唱者 @${vp.width}：${S.length} 行 ${S.length ? S[0].fs : '-'}px`, bad.join(' | ') || JSON.stringify(S.map(t => t.t)));
    }
  }

  /* ---------- T3 超长作词 / 作曲 ---------- */
  {
    for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const g = await one(vp, Object.assign({}, DUKU, { lyricist: LYR_LONG, composer: CMP_LONG }), 'view');
      const bad = sumBad(g);
      const R = (g.texts || []).filter(t => t.cls === 'right');
      const all = R.map(t => t.t).join('').replace(/作词：|作曲：|制谱：|\s/g, '');
      const want = (LYR_LONG + CMP_LONG + DUKU.maker).replace(/\s/g, '');
      if (all !== want) bad.push('署名丢字/错序：' + all);
      if (R.length <= 3) bad.push('期望折行（行数 >3）：' + R.length);
      T(bad.length === 0, `T3 超长作词/作曲 @${vp.width}：右栏 ${R.length} 行折行不溢出、不丢字`, bad.join(' | ') || JSON.stringify(R.map(t => t.t)));
    }
  }

  /* ---------- T4 变调夹＋特殊调弦＋速度术语 ---------- */
  {
    const o = Object.assign({}, DUKU, { tuning: [62, 59, 55, 50, 43, 38], tempoTerm: 'Moderato' });   // Open G
    for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const g = await one(vp, o, 'view');
      const bad = sumBad(g);
      const L = (g.texts || []).filter(t => t.cls === 'left').map(t => t.t).join('|');
      ['变调夹', 'Open G', 'Moderato', '♩=67'].forEach(k => { if (!L.includes(k)) bad.push('缺 ' + k); });
      T(bad.length === 0, `T4 变调夹+调弦+术语 @${vp.width}`, bad.join(' | ') || L);
    }
  }

  /* ---------- T5 纯五线谱页头 / 无词曲 ---------- */
  {
    const cases = [
      [{ type: 'instr', title: '小步舞曲', tempoTerm: 'Allegro ma non troppo', tempo: 120, nTab: 0, nVox: 1, lyr: 0 }, '纯五线谱+长术语', { width: 320, height: 640 }],
      [{ type: 'instr', title: '练习曲', tempo: 96, nTab: 0, nVox: 1, lyr: 0, lyricist: '', composer: '巴赫', maker: '' }, '纯五线谱+作曲', { width: 390, height: 844 }],
      [{ title: '无词曲信息', tempo: 90, singer: '' }, '无词曲弹唱谱', { width: 390, height: 844 }],
      [{ title: '无词曲信息带夹', capo: 3, tempo: 72, singer: '某歌手' }, '无词曲+变调夹', { width: 320, height: 640 }],
    ];
    for (const [o, tag, vp] of cases) {
      const g = await one(vp, o, 'view');
      const bad = sumBad(g);
      const L = (g.texts || []).filter(t => t.cls === 'left');
      if (o.type === 'instr' && L.some(t => /^1=/.test(t.t))) bad.push('纯五线谱不应写 1=X');
      if (!L.some(t => /=\d+/.test(t.t))) bad.push('缺速度');
      T(bad.length === 0, `T5 ${tag} @${vp.width}`, bad.join(' | ') || L.map(t => t.t).join('|'));
    }
  }

  /* ---------- T6 首行系统 / 曲首和弦图带不与页头相交 ---------- */
  {
    for (const [o, tag] of [[Object.assign({}, DUKU, { diagTop: 1 }), '曲首和弦图带'], [Object.assign({}, DUKU, { title: LONG1, lyricist: LYR_LONG, composer: CMP_LONG, diagTop: 1 }), '长歌名+长署名+和弦图带']]) {
      const g = await one({ width: 390, height: 844 }, o, 'view');
      const bad = g.err ? [g.err] : [];
      if (!g.err) {
        if (g.after.length) bad.push('页头之后元素高过页头底边：' + JSON.stringify(g.after.slice(0, 3)));
        if (!(g.sys0 > g.hb + 4)) bad.push(`首行系统 ${g.sys0} 不在页头底 ${g.hb} 之下`);
      }
      T(bad.length === 0, `T6 ${tag} @390：首行系统与和弦图带在页头之下`, bad.join(' | ') || `hb=${g.hb} sys0=${g.sys0}`);
    }
  }

  /* ---------- T7 热区覆盖 + 可点中（逐字：每个字形中心点 elementFromPoint 命中的热区就是它该去的那一个） ---------- */
  {
    for (const [o, vp, tag] of [[DUKU, { width: 390, height: 844 }, '独库@390'],
      [Object.assign({}, DUKU, { tuning: [62, 59, 55, 50, 43, 38], tempoTerm: 'Moderato', lyricist: LYR_LONG }), { width: 320, height: 640 }, '全信息@320'],
      [Object.assign({}, DUKU, { title: LONG1, composer: CMP_LONG }), { width: 390, height: 844 }, '长歌名+长作曲@390'],
      [DUKU, { width: 1280, height: 900 }, '独库@1280桌面（原样排版）'],
      [Object.assign({}, DUKU, { tuning: [62, 59, 55, 50, 43, 38], tempoTerm: 'Allegro ma non troppo' }), { width: 1440, height: 900 }, '四项并排@1440桌面（原样排版）'],
      /* 验收补：原样排版下署名比 v66.8 定宽 160 的热区还长——左段曾点不中（落在裸 tspan 上） */
      [Object.assign({}, DUKU, { lyricist: LYR_LONG, composer: CMP_LONG }), { width: 1440, height: 900 }, '长署名@1440桌面（原样排版）']]) {
      const pg = await open(vp);
      const r = await pg.evaluate(`(()=>{ try{ const s=${MK(o)};
        if(innerWidth<=820) enterShareViewer({song:s}); else { loadSong(s); blurSel=true; render(); }
        window.scrollTo(0,0);
        const svg=document.getElementById('score'); const g=hdGeo(svg);
        const kids=[...svg.children].slice(g.i0, g.i1+1).filter(e=>e.tagName.toLowerCase()==='text');
        const term=song.tempoTerm||'';
        /* 每个字该命中的热区：歌名/演唱/署名→meta；1=X→key；拍号数字→meter；变调夹段→capo；术语与 ♩=X 段→tempo；调弦段不设热区（跳过） */
        const plan=e=>{ const t=e.textContent;
          if(e.getAttribute('font-weight')==='800' || e.getAttribute('text-anchor')==='end' ||
             (e.getAttribute('text-anchor')==='middle' && !e.getAttribute('font-family'))) return ()=>'meta';
          if(/^1=/.test(t)) return ()=>'key';
          if(/^\\d+$/.test(t) && e.getAttribute('font-size')==='11') return ()=>'meter';
          const parts=[]; let i=0;
          t.split('　').forEach(x=>{ parts.push({a:i, b:i+x.length, k:/变调夹|^（按 1=/.test(x)?'capo' : (/[♩♪]=/.test(x) || (term && x===term))?'tempo' : null}); i+=x.length+1; });
          return ci=>{ const q=parts.find(p2=>ci>=p2.a && ci<p2.b); return q? q.k : null; }; };
        const bad=[]; let n=0;
        kids.forEach(e=>{ const f=plan(e); e.scrollIntoView({block:'center'});
          const m=svg.getScreenCTM(); const t=e.textContent;
          for(let ci=0; ci<e.getNumberOfChars(); ci++){
            const want=f(ci); if(!want || /\\s|　/.test(t[ci])) continue;
            const x=e.getExtentOfChar(ci); const q=svg.createSVGPoint(); q.x=x.x+x.width/2; q.y=x.y+x.height/2;
            const sp=q.matrixTransform(m); const hit=document.elementFromPoint(sp.x, sp.y);
            const z=hit && hit.closest && hit.closest('[data-hd]'); const got=z? z.getAttribute('data-hd') : (hit? hit.tagName.toLowerCase()+(hit.id?'#'+hit.id:'') : 'null');
            n++; if(got!==want) bad.push('「'+t+'」第'+ci+'字「'+t[ci]+'」→'+got+'（应 '+want+'）');
          } });
        window.scrollTo(0,0);
        return {bad, n};
      }catch(e){ return {bad:[String(e&&e.stack||e)], n:0}; } })()`);
      await pg.close();
      T(r.bad.length === 0 && r.n >= 20, `T7 热区逐字可点中 ${tag}（${r.n} 字）`, r.bad.slice(0, 6).join(' | ') || 'ok');
    }
  }

  /* ---------- T10 16 个内置预设在手机观看页（390 / 320）页头同样不重叠、不越版心 ---------- */
  {
    for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const pg = await open(vp);
      const n = await pg.evaluate('PRESETS.length');
      const bad = [];
      for (let i = 0; i < n; i++) {
        const g = await pg.evaluate(`(()=>{ try{ enterShareViewer({song:PRESETS[${i}].make()}); window.scrollTo(0,0);
          return Object.assign(hdGeo(document.getElementById('score')), {PW:PAGE_W, M:MARGIN}); }catch(e){ return {err:String(e)}; } })()`);
        const v = sumBad(g); if (v.length) bad.push('#' + i + ' ' + v.join('；'));
      }
      await pg.close();
      T(bad.length === 0, `T10 ${n} 个预设 @${vp.width} 观看页页头不重叠、不越版心`, bad.slice(0, 4).join(' | ') || 'ok');
    }
  }

  /* ---------- T11 随机压力（固定种子，可复现）：随机歌名/演唱/多人署名/变调夹/调弦/术语/谱类/拍号 × 多种版宽 ---------- */
  {
    let seed = 20261012; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const CJK = '天山南北的风吹过戈壁草原上牧羊人唱着古老歌谣月光下我们一起走过漫长岁月心中的梦想';
    const LAT = ['Live', 'Remix', 'feat.', 'Acoustic', 'Version', 'Ed', 'Sheeran', 'Mozart', 'Supercalifragilistic', 'G217', '2024'];
    const word = () => rnd() < 0.7 ? [...Array(1 + Math.floor(rnd() * 4))].map(() => CJK[Math.floor(rnd() * CJK.length)]).join('') : pick(LAT);
    const phrase = n => { let x = ''; for (let i = 0; i < n; i++) { x += word(); const r = rnd(); x += r < 0.15 ? ' ' : r < 0.22 ? '（' : r < 0.26 ? '）' : r < 0.3 ? '——' : r < 0.34 ? '·' : ''; } return x; };
    const names = n => [...Array(n)].map(() => rnd() < 0.7 ? [...Array(2 + Math.floor(rnd() * 2))].map(() => CJK[Math.floor(rnd() * CJK.length)]).join('') : pick(LAT) + ' ' + pick(LAT)).join(pick(['/', '、', ' / ', '，', ' & ']));
    for (const vw of [320, 375, 600, 1024]) {
      const pg = await open({ width: vw, height: 900 });
      const bad = [];
      for (let k = 0; k < 8; k++) {
        const o = { title: phrase(1 + Math.floor(rnd() * 12)), singer: rnd() < 0.8 ? phrase(1 + Math.floor(rnd() * 6)) : '',
          lyricist: rnd() < 0.8 ? names(1 + Math.floor(rnd() * 5)) : '', composer: rnd() < 0.7 ? names(1 + Math.floor(rnd() * 4)) : '', maker: rnd() < 0.6 ? names(1) : '',
          key: pick(['C', 'G', 'F#', 'Bb', 'C#']), capo: rnd() < 0.5 ? 1 + Math.floor(rnd() * 9) : 0, tempo: 40 + Math.floor(rnd() * 180),
          tuning: rnd() < 0.3 ? [62, 59, 55, 50, 43, 38] : null, tempoTerm: rnd() < 0.4 ? pick(['Moderato', 'Allegro ma non troppo', 'Andante cantabile', '中速 稍慢 深情地']) : '',
          type: pick(['guitar', 'guitar', 'instr', 'piano', 'func']), beats: pick([4, 3, 6, 12]), unit: pick([4, 8]), nMea: 4 };
        const g = await pg.evaluate(`(()=>{ try{ const s=${MK(o)}; if(innerWidth<=820) enterShareViewer({song:s}); else { undoStack.length=0; loadSong(s); blurSel=true; render(); }
          window.scrollTo(0,0); return Object.assign(hdGeo(document.getElementById('score')), {PW:PAGE_W, M:MARGIN}); }catch(e){ return {err:String(e&&e.stack||e)}; } })()`);
        const v = sumBad(g); if (v.length) bad.push(JSON.stringify(o).slice(0, 120) + ' → ' + v.slice(0, 2).join('；'));
      }
      await pg.close();
      T(bad.length === 0, `T11 随机压力 @${vw}（8 首）页头不重叠、不越版心`, bad.slice(0, 3).join(' | ') || 'ok');
    }
  }

  /* ---------- T12 断点质量（验收补）：cap 字号放得下时一定断在结构断点，不为均衡拆词 ---------- */
  {
    for (const [title, vw, want, tag] of [
      ['即兴伴奏 · 功能谱示例（考编常用）', 320, ['即兴伴奏 · 功能谱示例', '（考编常用）'], '「·」「（」处可断，不断成「…功能 / 谱示例…」'],
      ['月亮代表我的心（邓丽君经典老歌钢琴弹唱完整版）', 390, ['月亮代表我的心', '（邓丽君经典老歌钢琴弹唱完整版）'], '括注另起一行，不断在括号里'],
      ['我和我的祖国（电影《我和我的祖国》主题曲）', 390, ['我和我的祖国', '（电影《我和我的祖国》主题曲）'], '括注另起一行']]) {
      const g = await one({ width: vw, height: 844 }, Object.assign({}, DUKU, { title }), 'view');
      const bad = sumBad(g);
      const tl = (g.texts || []).filter(t => t.cls === 'title').map(t => t.t);
      if (JSON.stringify(tl) !== JSON.stringify(want)) bad.push('断行 ' + JSON.stringify(tl) + ' ≠ ' + JSON.stringify(want));
      T(bad.length === 0, `T12 歌名断点 @${vw}：${tag}`, bad.join(' | ') || JSON.stringify(tl));
    }
  }

  /* ---------- T13 署名折行（验收补）：无分隔符的长名单不碎成单字行、末行不独长；长署名不拖慢排版 ---------- */
  {
    const pg = await open({ width: 390, height: 844 });
    const r = await pg.evaluate(`(()=>{ try{ HD_FAM=hdFamNow(); const out=[];
      const cases=[['作词：','在那遥远的地方有位好姑娘人们走过她的帐房都要回头留恋地张望',206],['作曲：','王洛宾、李叔同、施光南、谷建芬、王酩、雷振邦',166],
        ['制谱：','Supercalifragilisticexpialidocious',166],['作词：','林夕/黄伟文/周耀辉/陈少琪/李焯雄',120]];
      cases.forEach(([k,v,WR])=>{ const L=hdWrapCred(k,v,WR); const ws=L.map(x=>x.w);
        out.push({k, v, WR, lines:L.map(x=>x.k+x.v), ws, joined:L.map(x=>x.v).join('').replace(/\\s/g,'')}); });
      /* 240 字作词：观看页单次排版耗时（初版 min-max 写法实测 2 s） */
      const s=createSong('guitar',{beats:4,unit:4,key:'G',nMea:4,nTab:1,nVox:1,lyr:1});
      const big='在那遥远的地方有位好姑娘人们走过她的帐房都要回头留恋地张望她那粉红的笑脸好像红太阳她那活泼动人的眼睛好像晚上明媚的月亮'.repeat(4).slice(0,240);
      s.lyricist=big; s.composer='A/B/C'; s.maker='谱友圈'; s.title=big.slice(0,120); s.singer=big.slice(0,60);
      enterShareViewer({song:s}); const t0=performance.now(); render(); const ms=performance.now()-t0;
      return {out, ms}; }catch(e){ return {err:String(e), out:[], ms:Infinity}; } })()`);
    await pg.close();
    if (r.err) T(false, 'T13 署名折行', r.err);
    r.out.forEach(c => {
      const bad = [];
      if (c.ws.some(w => w > c.WR + 0.01)) bad.push('超限宽 ' + c.ws.map(w => w.toFixed(0)));
      if (c.lines.length > 1 && Math.min(...c.ws) < 0.35 * Math.max(...c.ws)) bad.push('碎行/孤行 ' + c.ws.map(w => w.toFixed(0)));
      if (c.joined !== c.v.replace(/\s/g, '')) bad.push('丢字');
      T(bad.length === 0, `T13 署名折行 ${c.k}… @WR=${c.WR}：${c.lines.length} 行`, bad.join(' | ') || c.lines.join(' ｜ '));
    });
    T(r.ms < 400, `T13 240 字作词＋120 字歌名观看页单次排版 ${r.ms.toFixed(0)}ms（< 400ms）`, '');
  }

  /* ---------- T14 极窄版心（验收补）：A5＋内容 160%（桌面 PAGE_W≈251、版心 139）——变调夹说明在「（按…指法）」前折开、不缩字号 ---------- */
  {
    const pg = await open({ width: 1280, height: 900 });
    const g = await pg.evaluate(`(()=>{ try{ const s=${MK(Object.assign({}, DUKU, { tuning: [62, 59, 55, 50, 43, 38], tempoTerm: 'Andante cantabile' }))}; s.layout={page:'A5', scale:1.6};
      loadSong(s); blurSel=true; render(); window.scrollTo(0,0);
      return Object.assign(hdGeo(document.getElementById('score')), {PW:PAGE_W, M:MARGIN}); }catch(e){ return {err:String(e&&e.stack||e)}; } })()`);
    await pg.close();
    const bad = sumBad(g);
    const L = (g.texts || []).filter(t => t.cls === 'left');
    if (L.some(t => t.fs < 12.5 && !/^1=|^\d+$/.test(t.t))) bad.push('左块缩了字号 ' + L.map(t => t.t + '@' + t.fs).join(','));
    if (!L.some(t => t.t === '变调夹 1 品') || !L.some(t => t.t === '（按 1=G 指法）')) bad.push('变调夹说明未在括注前折开：' + L.map(t => t.t).join('|'));
    T(bad.length === 0, `T14 极窄版心（PAGE_W=${g.PW}）变调夹说明折行不缩字`, bad.join(' | ') || L.map(t => t.t).join('|'));
  }

  /* ---------- T8 零变化：桌面 16 个内置预设逐字节一致 ---------- */
  {
    for (const vw of [1280, 1440]) {
      const pg = await open({ width: vw, height: 900 });
      const n = await pg.evaluate('PRESETS.length');
      const diff = [];
      for (let i = 0; i < n; i++) {
        const r = await pg.evaluate(`(()=>{ try{ undoStack.length=0; loadSong(PRESETS[${i}].make()); blurSel=true; render();
          const ref=${REF668}; const h=document.getElementById('score').innerHTML;
          return {same:h.includes(ref.html), top:ref.top, sys0:(SYS_GEO[0]||{}).y0, len:ref.html.length}; }catch(e){ return {err:String(e)}; } })()`);
        if (r.err || !r.same || r.top !== r.sys0) diff.push(`#${i}:${r.err || (r.same ? '' : '页头不一致') + (r.top !== r.sys0 ? ` top ${r.top}≠${r.sys0}` : '')}`);
      }
      /* 常规长度的独库公路（变调夹＋速度两项并排）：文字逐字节一致，热区仅 capo/tempo 两块改实测宽 */
      const d = await pg.evaluate(`(()=>{ try{ const s=${MK(DUKU)}; loadSong(s); blurSel=true; render();
        const ref=${REF668}; const h=document.getElementById('score').innerHTML;
        const strip=x=>x.replace(/<rect[^>]*data-hd="[^"]*"[^>]*>(?:<title>[^<]*<\\/title>)?<\\/rect>/g,'');
        const zs=x=>[...x.matchAll(/<rect[^>]*data-hd="([^"]*)"[^>]*>/g)].map(m=>m[0]);
        const a=zs(ref.html), bz=zs(h);
        const changed=a.map((z,i)=>z===bz[i]? null : (z.match(/data-hd="([^"]*)"/)||[])[1]).filter(Boolean);
        return {txt:strip(h).includes(strip(ref.html)), n:a.length===bz.length, changed, top:ref.top===(SYS_GEO[0]||{}).y0}; }catch(e){ return {err:String(e)}; } })()`);
      await pg.close();
      T(diff.length === 0, `T8 零变化 @${vw}：${n} 个预设页头与 v66.8 逐字节一致、首行系统起点一致`, diff.join(' ') || 'ok');
      T(d.txt && d.n && d.top && d.changed.every(k => k === 'capo' || k === 'tempo'),
        `T8b 零变化 @${vw}：独库公路页头文字逐字节一致，热区仅 capo/tempo 改实测宽`, JSON.stringify(d));
    }
  }

  /* ---------- T9 打印 + 导出 PNG 的 SVG ---------- */
  {
    const songs = [[DUKU, '独库'], [Object.assign({}, DUKU, { title: LONG1, lyricist: LYR_LONG, composer: CMP_LONG, tuning: [62, 59, 55, 50, 43, 38], tempoTerm: 'Moderato' }), '全超长']];
    for (const [o, tag] of songs) {
      /* 打印：手机观看页 → emulateMedia print → beforeprint（PRINTING_NOW 重排＋逐页切片）→ 在切片容器里放一张可见量具 SVG 量几何 */
      const pg = await open({ width: 390, height: 844 });
      await pg.evaluate(`(()=>{ const s=${MK(o)}; enterShareViewer({song:s}); })()`);
      await pg.emulateMedia({ media: 'print' });
      const pr = await pg.evaluate(`(()=>{ try{ window.dispatchEvent(new Event('beforeprint'));
        const src=document.querySelector('#print-pages #pp-src'); if(!src) return {err:'无切片'};
        const m=document.createElementNS('http://www.w3.org/2000/svg','svg'); m.setAttribute('viewBox','0 0 '+PV_GEO.W+' '+PV_GEO.pgH);
        m.setAttribute('width', PV_GEO.W); m.setAttribute('height', PV_GEO.pgH); m.innerHTML=src.innerHTML;
        document.getElementById('print-pages').appendChild(m);
        const g=Object.assign(hdGeo(m), {PW:PAGE_W, M:MARGIN, vis:getComputedStyle(document.getElementById('print-pages')).display});
        m.remove(); window.dispatchEvent(new Event('afterprint')); return g; }catch(e){ return {err:String(e&&e.stack||e)}; } })()`);
      await pg.emulateMedia({ media: 'screen' });
      const bad1 = sumBad(pr);
      T(bad1.length === 0 && pr.vis === 'block', `T9 打印 ${tag}（print 媒体，PAGE_W=${pr.PW} MARGIN=${pr.M}）`, bad1.join(' | ') || 'ok');
      /* 导出 PNG：exportPNG 同款 XML（scoreExportClone→svgResolveVars）放进空白页（无页面 CSS，字体回落浏览器默认）量几何 */
      const ex = await pg.evaluate(`(()=>{ try{ const s=${MK(o)}; enterShareViewer({song:s});
        const v=document.getElementById('score').viewBox.baseVal;
        return {xml:svgResolveVars(new XMLSerializer().serializeToString(scoreExportClone())), PW:PAGE_W, M:MARGIN, w:v.width, h:v.height}; }catch(e){ return {err:String(e)}; } })()`);
      await pg.close();
      let bad2 = ex.err ? [ex.err] : [];
      if (!ex.err) {
        const p2 = await b.newPage({ viewport: { width: 800, height: 900 } });
        await p2.setContent('<!doctype html><html><body style="margin:0">' + ex.xml.replace('<svg ', `<svg width="${ex.w}" height="${ex.h}" `) + '</body></html>');
        const g2 = await p2.evaluate(`(()=>{ ${GEO}; return hdGeo(document.querySelector('svg')); })()`);
        await p2.close();
        bad2 = verdict(g2, ex.PW, ex.M);
      }
      T(bad2.length === 0, `T9b 导出 PNG 的 SVG ${tag}（脱离页面 CSS）`, bad2.join(' | ') || 'ok');
    }
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
