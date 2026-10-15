/* M2 谱库观看回归：openRemotePub 拉取公开谱进观看模式、渲染非空、观看栏含谱库返回、异常/404容错。
   stub fetch 模拟 /api/pub/scores/:id；用页面自身 createSong 生成可渲染数据。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 正常：拉取公开谱 → 观看模式 + 渲染非空 + 观看栏结构
  let r = await pg.evaluate(async () => {
    const data = createSong('guitar', { beats:4, unit:4, key:'C', nMea:4, nTab:1, nVox:1, lyr:1 });
    data.title = '云端小星星';
    window.fetch = async (url) => ({ ok: true, status: 200, json: async () => ({
      score: { id:'seedabc123', title:'云端小星星', singer:'儿歌', author:'谱友圈官方', updated_at: 100, data } }) });
    await openRemotePub('seedabc123');
    await new Promise(r => setTimeout(r, 120));
    const scoreLen = (document.getElementById('score')||{}).innerHTML ? document.getElementById('score').innerHTML.length : 0;
    /* v55.6 头部 2.0：谱库主页图标 + 指法/变调夹/拍速三组数值 + 收藏/分享图标 */
    return { viewer: viewerMode === true, cls: document.body.classList.contains('viewer'),
      title: song.title, home: !!document.getElementById('vh-home'),
      stats: document.querySelectorAll('#viewerbar .vh-stat').length,
      fav: !!document.getElementById('vw-fav'), card: !!document.getElementById('vw-card'),
      scoreNonEmpty: scoreLen > 500 };
  });
  T(r.viewer && r.cls && r.title === '云端小星星' && r.home && r.stats === 2 && r.fav && r.card && r.scoreNonEmpty, 'T1 观看模式渲染', JSON.stringify(r));   /* v60.37 头部两枚：变调/拍速 */

  // T2 退出观看回到常规编辑
  r = await pg.evaluate(() => { exitViewer(); return { viewer: viewerMode, cls: document.body.classList.contains('viewer') }; });
  T(r.viewer === false && r.cls === false, 'T2 退出观看', JSON.stringify(r));

  // T3 数据异常（无 measures）：提示且不进观看
  r = await pg.evaluate(async () => {
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ score: { id:'x', title:'坏', author:'a', data:{ v:3 } } }) });
    await openRemotePub('badxxxxx');
    await new Promise(r => setTimeout(r, 60));
    return { viewer: viewerMode };
  });
  T(r.viewer === false, 'T3 异常数据不进观看', JSON.stringify(r));

  // T4 404：不抛错、不进观看
  r = await pg.evaluate(async () => {
    window.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: '曲谱不存在或未发布' }) });
    let threw = false;
    try { await openRemotePub('nope1234'); } catch (e) { threw = true; }
    await new Promise(r => setTimeout(r, 40));
    return { viewer: viewerMode, threw };
  });
  T(r.viewer === false && r.threw === false, 'T4 404容错', JSON.stringify(r));

  // T5 移调在观看模式生效（非破坏，song.key 变化）
  r = await pg.evaluate(async () => {
    const data = createSong('vocal', { beats:4, unit:4, key:'C', nMea:2, nVox:1, lyr:1 });
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ score: { id:'s2', title:'移调测试', author:'官方', updated_at:1, data } }) });
    await openRemotePub('transpo1');
    await new Promise(r => setTimeout(r, 80));
    const k0 = song.key; vwTranspose(2); const k1 = song.key;
    return { k0, k1, changed: k0 !== k1 };
  });
  T(r.changed, 'T5 观看移调生效', JSON.stringify(r));
  await pg.evaluate(() => exitViewer());

  /* ===== v60.81 谱类细分标签 + 观看页标题带演唱者 + 收藏星放大 ===== */
  r = await pg.evaluate(() => {
    /* v67.4：谱库观看页 / 分享卡走谱库口径 docTypeLabelPub（拍板 5：谱库与服务端 typeLabelOf 的谱名 v67.6 再统一；编辑器显示层读统一谱名表）；老版本没有它就用 docTypeLabel */
    const L = typeof docTypeLabelPub==='function'? docTypeLabelPub : docTypeLabel;
    const mk=(fn)=>{ const s2=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
      if(fn) fn(s2); return L(s2); };
    const lbG = L(createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0}));
    const lbJP = mk();
    const lbWX = mk(s2=>{ s2.voxNotations=['staff'];
      s2.measures[0].voxes[0]=[{dur:4,dotted:false,deg:1,acc:'',oct:0,tie:false,lyrics:['词']}]; });
    const lbQI = mk(s2=>{ s2.voxNotations=['staff']; });   /* 同为五线谱但无词＝器乐 */
    /* 观看页标题：标题 - 演唱者 · 谱类细分 */
    const s3=createSong('guitar',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:1,lyr:0});
    s3.title='测题'; s3.singer='测唱';
    viewerMode=true;
    viewerCtx={pb:{title:s3.title, author:'A', type:'guitar', data:s3, price:0, preview:9999}, own:true, total:1, pubId:'t1'};
    song=viewerBuildSong();
    document.title=(song.title||'曲谱')+(song.singer? ' - '+song.singer : '')+' · '+L(song)+' · 谱友圈谱库';
    const titleOk = document.title.indexOf('测题 - 测唱') === 0 && document.title.indexOf('吉他弹唱谱') > 0;
    /* 头部图标：收藏星 21 号（比其余 17 号大——星形墨迹本就显小），谱架在位 */
    const vb=document.getElementById('viewerbar');
    vb.innerHTML=vwHeaderHTML({fav:1,card:1});
    const svgW=id=>{ const el=document.querySelector('#'+id+' svg'); return el? +el.getAttribute('width') : 0; };
    const star=svgW('vw-fav'), share=svgW('vw-card'), stand=svgW('vh-stand');
    vb.innerHTML=''; viewerMode=false; document.title='t';
    return { lbG, lbJP, lbWX, lbQI, titleOk, star, share, stand };
  });
  T(r.lbG==='吉他弹唱谱' && r.lbJP==='简谱歌谱' && r.lbWX==='五线谱歌谱' && r.lbQI==='器乐五线谱'
    && r.titleOk && r.star===21 && r.share===17 && r.stand===17,
    'T6 谱类细分标签(吉他弹唱谱/简谱歌谱/五线谱歌谱·带词五线谱=歌谱) + 标题带演唱者 + 收藏星放大到21', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
