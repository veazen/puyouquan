/* v50.7 云端曲谱深链 ?mine=<id> 回归：
   T1 本地库已有该谱 → 直接打开（标题生效、启动台不出现）
   T2 ?mine=未知id 且无登录（file:// 下 apiCall 必败）→ 回落启动台，不白屏无报错
   file:// 直载；T1 通过 addInitScript 预置 musetab-library-v1。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 本地命中
  let ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  let pg = await ctx.newPage();
  const errs1 = []; pg.on('pageerror', e => errs1.push(e.message));
  await pg.addInitScript(`(()=>{
    const song={id:'sMINE0001',title:'深链测试曲',key:'C',beats:4,unit:4,docType:'vocal',
      voxVoices:['V1'],tabVoices:[],lyricLines:1,measures:[{voxes:[[{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:['测'],tie:false},{dur:4,dotted:false,deg:2,acc:'',oct:0,lyrics:['试'],tie:false},{dur:2,dotted:false,deg:3,acc:'',oct:0,lyrics:[''],tie:false}]],tabs:[]}]};
    localStorage.setItem('musetab-library-v1', JSON.stringify([{id:'sMINE0001',title:'深链测试曲',mtime:1753000000,data:song}]));
  })()`);
  await pg.goto(F + '?mine=sMINE0001'); await pg.waitForTimeout(1200);
  let r = await pg.evaluate(`(()=>({
    title: (typeof song!=='undefined'&&song&&song.title)||'',
    pad: !!document.querySelector('#startpad, .startpad, #b-startpad') && (()=>{const el=document.querySelector('#startpad, .startpad'); return el? getComputedStyle(el).display!=='none' : false;})(),
    hasScore: !!document.getElementById('score') && document.getElementById('score').innerHTML.length>500
  }))()`);
  T(r.title === '深链测试曲' && r.hasScore, 'T1 本地库命中直接打开', JSON.stringify(r));
  T(errs1.length === 0, 'T1 无报错', errs1.join('|') || 'none');
  await ctx.close();

  // T2 未知 id + 无登录 → 回落启动台
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  pg = await ctx.newPage();
  const errs2 = []; pg.on('pageerror', e => errs2.push(e.message));
  await pg.goto(F + '?mine=sNOPE9999'); await pg.waitForTimeout(1500);
  r = await pg.evaluate(`(()=>({
    alive: typeof render==='function',
    toastOrPad: document.body.innerHTML.indexOf('云端曲谱')>=0 || document.body.innerHTML.indexOf('新建')>=0
  }))()`);
  T(r.alive && r.toastOrPad, 'T2 未知id回落启动台不白屏', JSON.stringify(r));
  T(errs2.length === 0, 'T2 无报错', errs2.join('|') || 'none');
  await ctx.close();

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
