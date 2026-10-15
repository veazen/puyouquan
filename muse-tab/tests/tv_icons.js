/* v67.4 最终图标集（docs/design-2026-10e/icons，风格 1「记谱缩略」唯一来源）回归：
   T1 并入完整：PQI 101 枚＝icons-manifest.json 的键（谱类 17 · 16px 微缩母版 14 · 记谱法/谱行 12 · 谱号 3 · 来源 13 · 模板 2 · 动作 16 · 乐器 24）
   T2 纯几何：无 <text>（不依赖字体）/ 无 style、image、foreignObject；颜色只用 currentColor / none（单色随主题），渲染后无残留 {M}/{F} 占位
   T3 16px 谱类互不重复：17 枚谱类在 16px 下（有微缩母版的自动换母版）逐像素光栅化后两两不同（差异像素 ≥12），标记串也两两不同
   T4 线宽分档（物理像素恒定）：≤16 主笔 1.25 / 谱线 1.0 · 17–22 1.5 / 1.0 · 23–34 1.75 / 1.25 · ≥35 2.0 / 1.5；24 网格与 16 网格母版都按显示尺寸换算
   T5 用到的位置（新建流程相关）：面板用途 24 / 谱开关 20（README 图标规范「谱型条 / 谱行开关 / 下拉 20」）/ 「新建 ▾」菜单 20 / 启动台 28·18 / 页签 16（微缩母版）/ 建成提示 20 / 页签条 ＋ / 顶栏 ▾——都是 pqi 图标、都无 <text>
   T6 页签谱类图标一图一义：16 份预设按谱行取图标（功能谱不再是钢琴、器乐不再全是小提琴、钢琴弹唱≠钢琴独奏），且与统一谱名表同源
   突变实证：MUSETAB_URL=file://…/v67.3 原版 → 无 PQI / pqIcon → 全红。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
let MANI = [];
try { MANI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/design-2026-10e/data/icons-manifest.json'), 'utf8')); } catch (_) {}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + String(d).slice(0, 1400) : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  const EV = (s, a) => pg.evaluate(s, a).catch(e => ({ err: String(e.message || e).split('\n')[0] }));

  /* T1 */
  let r = await EV(m => { if (typeof PQI === 'undefined') return { err: 'no PQI' };
    const keys = Object.keys(PQI), grp = {}; keys.forEach(k => { const g = /^type16-/.test(k) ? 'type16' : k.split('-')[0]; grp[g] = (grp[g] || 0) + 1; });
    const mk = m.map(x => x.key).sort(), pk = keys.slice().sort();
    return { n: keys.length, grp, sameAsManifest: mk.length === 101 && JSON.stringify(mk) === JSON.stringify(pk), grids: [...new Set(keys.map(k => PQI[k][0]))].sort() }; }, MANI);
  T(!r.err && r.n === 101 && r.sameAsManifest && r.grp.type === 17 && r.grp.type16 === 14 && r.grp.nota === 12 && r.grp.clef === 3 && r.grp.src === 13 && r.grp.tpl === 2 && r.grp.act === 16 && r.grp.inst === 24
    && r.grids.join() === '16,24', 'T1 图标集并入完整：101 枚＝icons-manifest（谱类 17 / 微缩 14 / 记谱法 12 / 谱号 3 / 来源 13 / 模板 2 / 动作 16 / 乐器 24）', JSON.stringify(r));

  /* T2 */
  r = await EV(() => { const bad = [];
    Object.keys(PQI).forEach(k => { [12, 16, 20, 24, 40].forEach(sz => { const s = pqIcon(k, sz);
      if (/<text|<style|style=|<image|<foreignObject|\{M\}|\{F\}/.test(s)) bad.push(k + '@' + sz + ':markup');
      const cols = (s.match(/(?:fill|stroke|color)="([^"]+)"/g) || []).map(x => x.split('"')[1]).filter(v => !['currentColor', 'none'].includes(v));
      if (cols.length) bad.push(k + '@' + sz + ':' + cols.join('/')); }); });
    const div = document.createElement('div'); div.style.color = 'rgb(1, 2, 3)'; div.innerHTML = pqIcon('type-guitar', 24); document.body.appendChild(div);
    const st = getComputedStyle(div.querySelector('path')).stroke; div.remove();
    return { bad, st }; });
  T(!r.err && r.bad.length === 0 && r.st === 'rgb(1, 2, 3)', 'T2 纯几何、单色：无 <text>/style/image、颜色只用 currentColor / none、无残留占位，描边随文字色', JSON.stringify(r));

  /* T3 16px 谱类互不重复（逐像素） */
  r = await pg.evaluate(async () => { if (typeof PQI === 'undefined') return { err: 'no PQI' };
    const keys = Object.keys(PQI).filter(k => /^type-/.test(k));
    const raster = k => new Promise(res => { const svg = pqIcon(k, 16).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" color="#000" ');
      const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data, a = []; for (let i = 3; i < d.length; i += 4) a.push(d[i] > 96 ? 1 : 0); res(a); };
      im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const px = {}; for (const k of keys) px[k] = await raster(k);
    let minD = 999, pair = '', same = [];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const A = px[keys[i]], B = px[keys[j]]; if (!A || !B) { same.push(keys[i] + '/' + keys[j] + ':noimg'); continue; }
      const d = A.reduce((s, v, q) => s + (v !== B[q] ? 1 : 0), 0); if (d < minD) { minD = d; pair = keys[i] + '|' + keys[j]; }
      if (pqIcon(keys[i], 16) === pqIcon(keys[j], 16)) same.push(keys[i] + '=' + keys[j]); }
    const mini = keys.filter(k => /data-pq="type16-/.test(pqIcon(k, 16))).length;
    return { n: keys.length, minD, pair, same, mini };
  }).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
  T(r.n === 17 && r.same.length === 0 && r.minD >= 12 && r.mini === 14, 'T3 16px 谱类 17 枚两两不同（14 枚自动换微缩母版；逐像素最少相差 ' + r.minD + ' 像素：' + r.pair + '）', JSON.stringify(r));

  /* T4 线宽分档 */
  r = await EV(() => { const bad = [], want = px => px <= 16 ? [1.25, 1] : px <= 22 ? [1.5, 1] : px <= 34 ? [1.75, 1.25] : [2, 1.5];
    ['type-guitar', 'nota-staff', 'act-new', 'inst-piano', 'clef-treble', 'type-chord', 'src-mxl'].forEach(k => [12, 14, 16, 17, 18, 20, 22, 23, 24, 28, 34, 35, 40, 48].forEach(sz => {
      const d = document.createElement('div'); d.innerHTML = pqIcon(k, sz); const sv = d.firstChild, g = +sv.getAttribute('viewBox').split(' ')[2], w = want(sz);
      const main = +sv.getAttribute('stroke-width') * sz / g;
      if (Math.abs(main - w[0]) > 0.02) bad.push(k + '@' + sz + ' main ' + main.toFixed(3));
      sv.querySelectorAll('[stroke-width]').forEach(el => { const v = +el.getAttribute('stroke-width') * sz / g; if (Math.abs(v - w[1]) > 0.02 && Math.abs(v - w[0]) > 0.02 && el.getAttribute('stroke') !== 'currentColor') bad.push(k + '@' + sz + ' sub ' + v.toFixed(3)); });
    }));
    /* 16 网格母版：16px 下物理主笔 1.25 */
    const d = document.createElement('div'); d.innerHTML = pqIcon('type-piano', 16); const sv = d.firstChild;
    return { bad, mini16: sv.getAttribute('viewBox') === '0 0 16 16' && Math.abs(+sv.getAttribute('stroke-width') - 1.25) < 0.01 }; });
  T(!r.err && r.bad.length === 0 && r.mini16, 'T4 线宽分档：≤16 1.25/1.0 · 17–22 1.5/1.0 · 23–34 1.75/1.25 · ≥35 2.0/1.5（物理像素，24 / 16 网格母版同口径）', JSON.stringify(r));

  /* T5 用到的位置 */
  try {
  await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
  const pad = await EV(() => ({ cards: [...document.querySelectorAll('#spd-cards svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')) }));
  await pg.click('#b-newdd'); await pg.waitForTimeout(80);
  const menu = await EV(() => [...document.querySelectorAll('.nf-qm svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')));
  await pg.keyboard.press('Escape');
  await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]');
  const panel = await EV(() => ({ sc: [...document.querySelectorAll('.nf-modal [role=option] svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    rows: [...document.querySelectorAll('.nf-modal .nf-row svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    text: document.querySelectorAll('.nf-modal svg text').length, dd: (document.querySelector('#b-newdd svg.pqi') || { dataset: {} }).dataset.pq }));
  await pg.click('[data-scene="teach"]'); await pg.click('#nw-create'); await pg.waitForTimeout(150);
  const after = await EV(() => ({ tabs: [...document.querySelectorAll('#doc-tabs .dtab svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    add: (document.querySelector('#dt-add svg.pqi') || { dataset: {} }).dataset.pq, addTxt: document.getElementById('dt-add').textContent.trim(),
    toast: (document.querySelector('#toast svg.pqi') || { dataset: {} }).dataset.pq, txt: document.querySelectorAll('#doc-tabs svg text, #toast svg text, #spd-cards svg text').length }));
  T(!pad.err && pad.cards.includes('act-new@28') && pad.cards.includes('tpl-last@28') && pad.cards.includes('act-import@28') && pad.cards.includes('type-jg@18')
    && menu.length >= 12 && menu.includes('tpl-last@20') && menu.includes('type-kids@20')
    && panel.sc.length === 11 && panel.sc.every(x => /^type-.*@24$/.test(x)) && panel.rows.join() === 'nota-jianpu@20,nota-staff@20,nota-tab6@20,nota-grand@20,nota-chord@20' && panel.text === 0 && panel.dd === 'act-chevron'
    && after.tabs.every(x => /^type16-.*@16$/.test(x)) && after.tabs.includes('type16-teach@16') && after.add === 'act-add' && after.addTxt === '' && after.toast === 'type-teach' && after.txt === 0,
    'T5 新建流程各位置用最终图标集：启动台 28/18、新建▾ 20、面板用途 24 / 谱开关 20、页签 16 微缩母版、页签条 ＋、顶栏 ▾、建成提示 20，均无 <text>', JSON.stringify({ pad, menu: menu.slice(0, 4), panel, after }));
  } catch (e) { T(false, 'T5 新建流程各位置用最终图标集', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T6 页签谱类图标一图一义 */
  r = await EV(() => { const out = {}; PRESETS.forEach(p => { const s = migrate(p.make()); out[p.name] = (docIcon(s).match(/data-pq="([^"]+)"/) || [])[1] + '|' + NWB.kindOfSong(s).ic; }); return out; });
  const ic = k => ((r && !r.err && r[k]) || '').split('|')[0];
  T(!r.err && ic('流行进行（功能谱）') === 'type16-func' && ic('小步舞曲（器乐五线谱）') === 'type16-instr' && ic('卡农进行（钢琴弹唱伴奏）') === 'type16-pianoacc'
    && ic('欢乐颂（钢琴独奏）') === 'type16-piano' && ic('欢乐颂（四部合唱）') === 'type16-choir' && ic('送别（歌谱）') === 'type16-vocal' && ic('欢乐颂（教学对照谱）') === 'type16-teach'
    && ic('小星星（尤克里里）') === 'type16-uku' && ic('和弦进行示例（纯和弦谱）') === 'type16-chord' && ic('指弹练习曲·行板（独奏谱）') === 'type16-solo'
    && Object.values(r).every(v => { const [a, b2] = String(v).split('|'); return !!b2 && a === b2.replace('type-', 'type16-'); }),
    'T6 页签谱类图标一图一义（功能谱≠钢琴、器乐≠小提琴、钢琴弹唱≠钢琴独奏、合唱≠歌谱），与统一谱名表同源', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
