/* v42.2 预设曲谱回归：动态遍历 PRESETS，逐个 loadSong 校验渲染安全（len>1000/无 NaN/无 undefined/无报错），
   记录每个预设的 docType，并断言谱库覆盖全部谱类（guitar/uku/solo/piano/pianoacc/vocal/teach/instr/func/chord）。
   file:// 直载 index.html；CHROMIUM_PATH 指向 chromium。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const NEED = ['guitar', 'uku', 'solo', 'piano', 'pianoacc', 'vocal', 'teach', 'instr', 'func', 'chord'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/sounds|CORS|Failed to load|TUNNEL/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const n = await pg.evaluate('PRESETS.length');
  const seen = {};
  for (let i = 0; i < n; i++) {
    const before = errs.length;
    const r = await pg.evaluate(`(()=>{ try{
      if(typeof undoStack!=='undefined') undoStack.length=0;   // 解除未存盘防覆盖 guardReplace（模拟无未保存编辑）
      const p=PRESETS[${i}]; const s=p.make(); loadSong(s);
      const h=document.getElementById('score').innerHTML;
      return {name:p.name, dt:docType(song), len:h.length, nan:h.includes('NaN'), undef:h.includes('undefined')};
    }catch(e){ return {err:e.message}; } })()`);
    await pg.waitForTimeout(60);
    const clean = errs.length === before;
    const ok = r && !r.err && r.len > 1000 && !r.nan && !r.undef && clean;
    if (ok && r.dt) seen[r.dt] = (seen[r.dt] || 0) + 1;
    T(ok, `预设#${i} ${r && r.name ? r.name : ''} [${r && r.dt || '?'}]`, r && r.err ? r.err : (r ? `len=${r.len}${clean ? '' : ' +ERR'}` : 'null'));
  }
  const missing = NEED.filter(t => !seen[t]);
  T(missing.length === 0, '谱类覆盖全 10 类', missing.length ? '缺:' + missing.join(',') : Object.keys(seen).sort().join(','));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
