/* v50.8 谱友圈（应用内谱库）回归：
   T1 b-circle 恒开应用内 #circle（不再跳转 puku），本地兜底种子渲染卡片；无 cc-hero；chip.on 非渐变实底
   T2 route mock /api/pub/scores → 远端卡片渲染（data-remote、免费 pill、小节数），点卡片进观看模式（openRemotePub）
   T3 卡片无渐变顶条（cc-card ::after 无内容）
   file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 本地兜底 + 原版视觉
  let pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs1 = []; pg.on('pageerror', e => errs1.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.click('#b-circle'); await pg.waitForTimeout(700);
  let r = await pg.evaluate(`(()=>{
    const circle=document.getElementById('circle');
    const cards=circle? circle.querySelectorAll('.cc-card').length : 0;
    const hero=!!document.querySelector('#circle .cc-hero');
    const chip=document.querySelector('#circle .cc-chip.on');
    const chipBg=chip? getComputedStyle(chip).backgroundImage : 'x';
    const logo=circle? (circle.querySelector('.cc-logo')||{}).textContent||'' : '';
    return {open:!!circle, cards, hero, chipGrad:chipBg!=='none', logo:logo.indexOf('谱友圈')>=0}; })()`);
  T(r.open && r.cards >= 1 && !r.hero && !r.chipGrad && r.logo, 'T1 应用内谱友圈整页（本地兜底·无hero·chip实底）', JSON.stringify(r));
  T(errs1.length === 0, 'T1 无报错', errs1.join('|') || 'none');
  await pg.close();

  // T2 远端数据 + 观看模式路由
  pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs2 = []; pg.on('pageerror', e => errs2.push(e.message));
  const PUB = { id: 'pubtest01', title: '同步测试谱', author: '官方', type: 'vocal', price: 0, measures: 2,
    cover: [{ deg: '1', oct: 0, ly: '同' }, { deg: '2', oct: 0, ly: '步' }] };
  const FULL = { score: { id: 'pubtest01', title: '同步测试谱', author: '官方', data: { title: '同步测试谱', key: 'C', beats: 4, unit: 4, docType: 'vocal', voxVoices: ['V1'], tabVoices: [], lyricLines: 1, measures: [
    { voxes: [[{ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: ['同'], tie: false }, { dur: 4, dotted: false, deg: 2, acc: '', oct: 0, lyrics: ['步'], tie: false }, { dur: 2, dotted: false, deg: 3, acc: '', oct: 0, lyrics: [''], tie: false }]], tabs: [] },
    { voxes: [[{ dur: 2, dotted: false, deg: 5, acc: '', oct: 0, lyrics: [''], tie: false }, { dur: 2, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [''], tie: false }]], tabs: [] }] } } };
  await pg.route('**/api/pub/scores', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ scores: [PUB] }) }));
  await pg.route('**/api/pub/scores/pubtest01', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FULL) }));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.click('#b-circle'); await pg.waitForTimeout(900);
  r = await pg.evaluate(`(()=>{
    const card=document.querySelector('#circle .cc-card[data-remote]');
    return {remote:!!card, title:card? card.textContent.indexOf('同步测试谱')>=0 : false,
      free:card? card.textContent.indexOf('免费')>=0 : false,
      mea:card? card.textContent.indexOf('2 小节')>=0 : false}; })()`);
  T(r.remote && r.title && r.free && r.mea, 'T2a 远端卡片渲染（与官网同源）', JSON.stringify(r));
  await pg.click('#circle .cc-card[data-remote]'); await pg.waitForTimeout(1000);
  r = await pg.evaluate(`(()=>({viewer:document.body.classList.contains('viewer'), circleGone:!document.getElementById('circle'),
    title:(typeof song!=='undefined'&&song&&song.title)||''}))()`);
  T(r.viewer && r.circleGone && r.title === '同步测试谱', 'T2b 点卡片进观看模式', JSON.stringify(r));
  T(errs2.length === 0, 'T2 无报错', errs2.join('|') || 'none');

  // T3 卡片无渐变顶条
  r = await pg.evaluate(`(()=>{
    const el=document.createElement('div'); el.className='cc-card'; document.body.appendChild(el);
    const s=getComputedStyle(el,'::after');
    const none = s.content==='none' || s.content==='normal' || s.backgroundImage==='none';
    el.remove(); return {none, content:s.content}; })()`);
  T(r.none, 'T3 卡片无渐变顶条', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
