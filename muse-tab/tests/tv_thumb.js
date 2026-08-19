/* v60.6 曲谱实例缩图 + 卡片瘦身 + 全站扁平化 回归：
   T1 buildThumbCanvas 从任意谱数据出 2:1 栅格，且不留痕——编辑器仍停在原来那首谱、原光标
   T2 scoreThumbUpload 走 PUT /api/scores/:id/thumb，载荷是 webp/jpeg 的 data URL（不是 SVG）
   T3 远端卡片：有缩图出 .cc-shot 真截图（刻版骨架留底层占位），无缩图只剩骨架
   T4 卡片信息条补齐：1=调 / 拍号 / ♩=速度 / 小节数
   T5 卡片瘦身：封面 2:1 定比、列宽 ≤200px
   T6 扁平化：卡片/按钮/LOGO 无立体投影（inset 分隔线与 0 偏移焦点环不算）
   file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');

/* 有 y 偏移或模糊 = 立体投影；inset（画内框）与 0 0 0 Npx（焦点环）不算 */
const HAS_ELEVATION = `(v=>{
  if(!v || v==='none') return false;
  return v.split(/,(?![^(]*\\))/).some(l=>{
    if(/\\binset\\b/.test(l)) return false;
    const n=(l.match(/-?[\\d.]+px/g)||[]).slice(0,3).map(parseFloat);
    return n.length>=2 && n.some((x,i)=>i<3 && x!==0);
  });
})`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const SONG = {
    title: '缩图测试谱', key: 'C', beats: 4, unit: 4, tempo: 88, docType: 'vocal',
    voxVoices: ['V1'], tabVoices: [], lyricLines: 1,
    measures: [
      { voxes: [[{ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: ['一'], tie: false },
                 { dur: 4, dotted: false, deg: 2, acc: '', oct: 0, lyrics: ['闪'], tie: false },
                 { dur: 2, dotted: false, deg: 3, acc: '', oct: 0, lyrics: ['一'], tie: false }]], tabs: [] },
      { voxes: [[{ dur: 2, dotted: false, deg: 5, acc: '', oct: 0, lyrics: ['闪'], tie: false },
                 { dur: 2, dotted: false, deg: 1, acc: '', oct: 0, lyrics: ['亮'], tie: false }]], tabs: [] }],
  };

  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));

  await pg.goto(F); await pg.waitForTimeout(900);

  // T1 出图 + 不留痕
  const r1 = await pg.evaluate(async (s) => {
    /* 先把编辑器停在一首「本来的谱」，缩图借完必须原样还回来 */
    song.title = '原来的谱'; sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
    const before = { title: song.title, sel: JSON.stringify(sel), mea: (song.measures || []).length };
    const cv = await new Promise(res => buildThumbCanvas(s, c => res(c), () => res(null)));
    let ink = 0;
    if (cv) {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200) ink++;
    }
    return { w: cv ? cv.width : 0, h: cv ? cv.height : 0, ink,
      after: { title: song.title, sel: JSON.stringify(sel), mea: (song.measures || []).length }, before };
  }, SONG);
  T(r1.w > 0 && Math.abs(r1.w / r1.h - 2) < 0.01, 'T1a 缩图为 2:1 栅格', r1.w + '×' + r1.h);
  T(r1.ink > 500, 'T1b 缩图画的是真谱面（有墨色像素）', '墨点=' + r1.ink);
  T(JSON.stringify(r1.before) === JSON.stringify(r1.after), 'T1c 借完即还：曲谱/光标原样复原', JSON.stringify(r1.after));

  // T2 上传载荷（stub apiCall 记调用：file:// 下真发 /api 请求会被当成 file:/// 直接失败）
  const r2 = await pg.evaluate(async (s) => {
    window.PYQ_CLOUD = true; ACCT = { id: 'u1', nickname: '谱友', role: 'creator' };
    const calls = [];
    const real = window.apiCall;
    window.apiCall = async (p, o) => { calls.push({ p, m: (o || {}).method, d: ((o || {}).body || {}).data || '' }); return { saved: true }; };
    const ok = await scoreThumbUpload('song_thumb001', s);
    window.apiCall = real;
    const c = calls[0] || {};
    return { ok, n: calls.length, p: c.p || '', m: c.m || '', head: String(c.d).slice(0, 24), len: String(c.d).length };
  }, SONG);
  T(r2.ok === true && r2.n === 1, 'T2a 发布路径调用上传接口', '调用次数=' + r2.n);
  T(r2.m === 'PUT' && r2.p === '/scores/song_thumb001/thumb', 'T2b 打到 /api/scores/:id/thumb', r2.m + ' ' + r2.p);
  T(/^data:image\/(webp|jpeg);base64,/.test(r2.head), 'T2c 载荷是栅格不是 SVG（无脚本面）', r2.head + ' …' + r2.len + 'B');
  T(r2.len > 0 && r2.len < 220 * 1024 * 1.37, 'T2d 载荷在服务端 220KB 上限内', r2.len + 'B(base64)');

  // T3/T4 远端卡片
  const PUBS = [
    { id: 'p_withthumb', title: '有缩图谱', author: '官方', singer: '小谱', type: 'vocal', price: 0,
      measures: 16, cover: [{ deg: '1', oct: 0, ly: '一' }], thumb: 1, key: 'C', tempo: 88, beats: 4, unit: 4, verses: 2 },
    { id: 'p_nothumb', title: '无缩图谱', author: '官方', singer: '', type: 'guitar', price: 0,
      measures: 8, cover: [{ deg: '5', oct: 0, ly: '' }], thumb: 0, key: 'G', tempo: 0, beats: 3, unit: 4, verses: 0 },
  ];
  await pg.route('**/api/pub/scores', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ scores: PUBS }) }));
  /* 缩图字节由 route 兜住：离线跑测试时不该真去打网络 */
  await pg.route('**/api/pub/*/thumb', rt => rt.fulfill({ status: 200, contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.click('#b-circle'); await pg.waitForTimeout(900);
  const r3 = await pg.evaluate(`(()=>{
    const a=document.querySelector('#circle .cc-card[data-pub="p_withthumb"]');
    const c=document.querySelector('#circle .cc-card[data-pub="p_nothumb"]');
    const shotA=a? a.querySelector('.cc-shot') : null;
    return {
      shotA:!!shotA, srcA:shotA? shotA.getAttribute('src') : '',
      skelA:!!(a && a.querySelector('.cc-cover svg')),
      shotC:!!(c && c.querySelector('.cc-shot')), skelC:!!(c && c.querySelector('.cc-cover svg')),
      txtA:a? a.textContent.replace(/\\s+/g,' ') : ''};
  })()`);
  T(r3.shotA && /\/api\/pub\/p_withthumb\/thumb$/.test(r3.srcA), 'T3a 有缩图的谱出真截图 img', r3.srcA);
  T(r3.skelA, 'T3b 刻版骨架留底层当占位（加载中/图挂了兜底）', String(r3.skelA));
  T(!r3.shotC && r3.skelC, 'T3c 无缩图的谱只剩刻版骨架', JSON.stringify({ shot: r3.shotC, skel: r3.skelC }));
  T(/1=C/.test(r3.txtA) && /4\/4/.test(r3.txtA) && /♩=88/.test(r3.txtA) && /16 小节/.test(r3.txtA),
    'T4 卡片信息补齐（调号/拍号/速度/小节数）', r3.txtA.slice(0, 90));

  // T5 卡片瘦身
  const r5 = await pg.evaluate(`(()=>{
    const card=document.querySelector('#circle .cc-card');
    const cov=card.querySelector('.cc-cover');
    const cb=card.getBoundingClientRect(), vb=cov.getBoundingClientRect();
    return {cardW:Math.round(cb.width), covRatio:+(vb.width/vb.height).toFixed(2)}; })()`);
  T(r5.cardW > 0 && r5.cardW <= 200, 'T5a 卡片列宽收窄至 ≤200px', r5.cardW + 'px');
  T(Math.abs(r5.covRatio - 2) < 0.06, 'T5b 封面 2:1 定比（缩图不拉伸）', r5.covRatio + ':1');

  // T6 扁平化
  const r6 = await pg.evaluate(`(()=>{
    const has=${HAS_ELEVATION};
    const bad=[];
    const check=(el,tag)=>{ const s=getComputedStyle(el);
      if(has(s.boxShadow)) bad.push(tag+'|box|'+s.boxShadow.slice(0,40));
      if(/drop-shadow/.test(s.filter||'')) bad.push(tag+'|filter|'+s.filter.slice(0,40)); };
    document.querySelectorAll('#circle .cc-card, #circle .cc-chip, .cc-logo .mark, .main-bar button, #paper, .logo .mark')
      .forEach((el,i)=>check(el,(el.className&&el.className.baseVal!==undefined?'svg':el.className||el.id||el.tagName)+'#'+i));
    return bad; })()`);
  T(r6.length === 0, 'T6a 卡片/按钮/LOGO/纸面无立体投影', r6.slice(0, 3).join(' ; ') || 'none');

  const r6b = await pg.evaluate(`(()=>{
    const has=${HAS_ELEVATION};
    const out=[];
    for(const sh of document.styleSheets){
      let rules=[]; try{ rules=sh.cssRules||[]; }catch(_){ continue; }
      const walk=rs=>{ for(const r of rs){
        if(r.cssRules) { walk(r.cssRules); continue; }
        if(!r.style) continue;
        if(has(r.style.boxShadow)) out.push(r.selectorText+' {'+r.style.boxShadow.slice(0,40)+'}');
        if(/drop-shadow/.test(r.style.filter||'')) out.push(r.selectorText+' {filter}');
      } };
      walk(rules);
    }
    return out; })()`);
  T(r6b.length === 0, 'T6b 编辑器样式表零立体投影声明', r6b.slice(0, 4).join(' ; ') || 'none');

  T(errs.length === 0, '无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
