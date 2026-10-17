/* v67.4 最终图标集（docs/design-2026-10e/icons，风格 1「记谱缩略」唯一来源）回归：
   T1 并入完整：PQI 101 枚＝icons-manifest.json 的键（谱类 17 · 16px 微缩母版 14 · 记谱法/谱行 12 · 谱号 3 · 来源 13 · 模板 2 · 动作 16 · 乐器 24）
   T2 纯几何：无 <text>（不依赖字体）/ 无 style、image、foreignObject；颜色只用 currentColor / none（单色随主题），渲染后无残留 {M}/{F} 占位
   T3 16px 谱类互不重复：17 枚谱类在 16px 下（有微缩母版的自动换母版）逐像素光栅化后两两不同（差异像素 ≥12），标记串也两两不同
   T4 线宽分档（物理像素恒定）：≤16 主笔 1.25 / 谱线 1.0 · 17–22 1.5 / 1.0 · 23–34 1.75 / 1.25 · ≥35 2.0 / 1.5；24 网格与 16 网格母版都按显示尺寸换算
   T5 用到的位置（新建流程相关）：面板用途 24 / 谱开关 20（README 图标规范「谱型条 / 谱行开关 / 下拉 20」）/ 「新建 ▾」菜单 20 / 启动台 28·18 / 页签 16（微缩母版）/ 建成提示 20 / 页签条 ＋ / 顶栏 ▾——都是 pqi 图标、都无 <text>
   T6 页签谱类图标一图一义：16 份预设按谱行取图标（功能谱不再是钢琴、器乐不再全是小提琴、钢琴弹唱≠钢琴独奏），且与统一谱名表同源
   —— v67.6 其余位置（README「图标规范」：左轨 18 · 页签与谱库 16；manifest 替换清单）——
   T7 全部 101 枚两两逐像素不同：16 / 20 / 24px 三档光栅化两两比对（16px 下谱类自动换微缩母版的 type-X ≡ type16-X 是同一枚，除外），差异像素 ≥6 且标记串不同；
      修掉 v67.4 起的两组撞形：空白谱 src-blank（空白谱纸）≠ 新建 act-new（页＋加号）、谱友圈文件 src-mtab（谱页＋谱友圈标记）≠ 打开 act-open（文件夹）
   T8 其余位置已换最终图标集：左轨音轨钮（乐器组 18：其他器乐＝inst-other 不再是小提琴、钢琴伴奏两行＝钢琴、人声＝inst-voice）、「＋音轨」act-add、
      「当前音轨」16、图层页签（六线谱 / 简谱 / 和弦 / 歌词）与「显示」记谱法灯＝nota-*（简谱不再是 <text> 字符图标）、加轨菜单；
      右栏创作辅助（导入 MIDI / 配和弦工作台 / 一键配伴奏 / 智能填词 / 和弦 / 指板）与信息卡谱类图标（＝页签 docIcon）、谱型条按钮；
      谱友圈广场筛选条 10 类 / 卡片徽标 / 观看页谱类、预设 · 我的曲谱卡片谱类行——都是 pqi、都无 <text>
   —— v67.6 收尾验收补（修前红修后绿）——
   T7 补 18px 档（左轨尺寸）；T8b 右栏创作辅助 18px（图标框 26）、「标注」同 18、歌词页与右栏「智能填词」同一枚；T8c 卡片 / 观看页图标跟着实际写出的谱名走（图文一致）
   T9 左轨乐器按内容判（教学对照 / 钢琴伴奏歌谱五线谱 / 五线谱歌谱 / 五线谱和弦谱 / 切五线谱后的人声旋律＝人声）
   T10 手机底条音轨名 ≥12px、图标不溢出、底条高不变；T11 广场筛选分类一行、手机不加行；T12 帮助 / 特色功能弹窗、折叠符 / 箭头 / 删除钮、常态颜色
   T13 设计源文件不漂移（gen.js 重出逐字节一致、proto.html 内嵌数据同步；DOCS_DIR 可指向别的 docs 副本）
   —— v67.6 第二轮验收补（修前红修后绿：MUSETAB_URL 指向第二轮修复前的副本复跑，T9b / T14 红）——
   T9b 左轨与统一谱名同一判据：新建面板 / 深链建的无词多声部五线谱（谱名「五线谱重奏谱」）＝其他器乐，与导入的同名四重奏一致；有词仍人声
   T14 谱类图标与谱名同义：五线谱重奏谱＝器乐五线谱图标（不是合唱谱的方括号＋简谱）、尤克里里独奏谱＝尤克里里图标（与左轨 inst-ukulele 一致），
       页签 / 谱库卡片反查（ccKindIc）同口径
   突变实证：MUSETAB_URL=file://…/v67.3 原版 → 无 PQI / pqIcon → 全红；v67.5 原版 → T7 / T8 红。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const F0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
/* v68.2 切默认外壳（flow，计划 §5.4「tv_icons M（部分）」）：默认页＝新外壳。T5 入口换 页签「＋」#dt-add / 文件 ▾ 新建行尾 ▾；
   T9 / T9b / T14 的音轨乐器图标改读左栏音轨树 #flw-tlist .flw-trow .flw-tic svg.pqi（与旧左轨同一个 trkIcon 判据）；
   T8 旧外壳专有位置（左轨 / 图层页签 / 「显示」灯 / 右栏创作页 / 信息卡）整段钉 ?shell=classic，另加 T8f 写 flow 的对应位置；
   T10 两段：旧手机底条（classic）＋ flow 手机底条 #flw-mbar 当前轨芯片与音轨抽屉 */
const F = F0;
const FC = F0 + (F0.includes('?') ? '&' : '?') + 'shell=classic';
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
  /* 快速新建菜单：flow＝文件 ▾ 新建行尾 ▾（r1:newdd，▾ 图标 act-chevron＝旧顶栏「新建 ▾」那枚） */
  await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]');
  const ddIc = await EV(() => (document.querySelector('#popmenu [data-fa="r1:newdd"] svg.pqi') || { dataset: {} }).dataset.pq);
  await pg.click('#popmenu [data-fa="r1:newdd"]'); await pg.waitForTimeout(80);
  const menu = await EV(() => [...document.querySelectorAll('.nf-qm svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')));
  await pg.keyboard.press('Escape');
  await pg.click('#dt-add'); await pg.waitForSelector('.nf-modal [data-scene]');
  const panel = await EV(() => ({ sc: [...document.querySelectorAll('.nf-modal [role=option] svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    rows: [...document.querySelectorAll('.nf-modal .nf-row svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    text: document.querySelectorAll('.nf-modal svg.pqi text').length,   /* v67.5 中栏预览是引擎刻版的真实谱面（有文字），只查图标 */ dd: null }));
  panel.dd = ddIc;
  await pg.click('[data-scene="teach"]'); await pg.click('#nw-create'); await pg.waitForTimeout(150);
  const after = await EV(() => ({ tabs: [...document.querySelectorAll('#doc-tabs .dtab svg.pqi')].map(s => s.dataset.pq + '@' + s.getAttribute('width')),
    add: (document.querySelector('#dt-add svg.pqi') || { dataset: {} }).dataset.pq, addTxt: document.getElementById('dt-add').textContent.trim(),
    toast: (document.querySelector('#toast svg.pqi') || { dataset: {} }).dataset.pq, txt: document.querySelectorAll('#doc-tabs svg text, #toast svg text, #spd-cards svg text').length }));
  T(!pad.err && pad.cards.includes('act-new@28') && pad.cards.includes('tpl-last@28') && pad.cards.includes('act-import@28') && pad.cards.includes('type-jg@18')
    && menu.length >= 12 && menu.includes('tpl-last@20') && menu.includes('type-kids@20')
    && panel.sc.length === 11 && panel.sc.every(x => /^type-.*@24$/.test(x)) && panel.rows.join() === 'nota-jianpu@20,nota-staff@20,nota-tab6@20,nota-grand@20,nota-chord@20' && panel.text === 0 && panel.dd === 'act-chevron'
    && after.tabs.every(x => /^type16-.*@16$/.test(x)) && after.tabs.includes('type16-teach@16') && after.add === 'act-add' && after.addTxt === '' && after.toast === 'type-teach' && after.txt === 0,
    'T5 新建流程各位置用最终图标集：启动台 28/18、新建▾ 20、面板用途 24 / 谱开关 20、页签 16 微缩母版、页签条 ＋、新建 ▾（flow：文件 ▾ 新建行尾 ▾）、建成提示 20，均无 <text>', JSON.stringify({ pad, menu: menu.slice(0, 4), panel, after }));
  } catch (e) { T(false, 'T5 新建流程各位置用最终图标集', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T6 页签谱类图标一图一义 */
  r = await EV(() => { const out = {}; PRESETS.forEach(p => { const s = migrate(p.make()); out[p.name] = (docIcon(s).match(/data-pq="([^"]+)"/) || [])[1] + '|' + NWB.kindOfSong(s).ic; }); return out; });
  const ic = k => ((r && !r.err && r[k]) || '').split('|')[0];
  T(!r.err && ic('流行进行（功能谱）') === 'type16-func' && ic('小步舞曲（器乐五线谱）') === 'type16-instr' && ic('卡农进行（钢琴弹唱伴奏）') === 'type16-pianoacc'
    && ic('欢乐颂（钢琴独奏）') === 'type16-piano' && ic('欢乐颂（四部合唱）') === 'type16-choir' && ic('送别（歌谱）') === 'type16-vocal' && ic('欢乐颂（教学对照谱）') === 'type16-teach'
    && ic('小星星（尤克里里）') === 'type16-uku' && ic('和弦进行示例（纯和弦谱）') === 'type16-chord' && ic('指弹练习曲·行板（独奏谱）') === 'type16-solo'
    && Object.values(r).every(v => { const [a, b2] = String(v).split('|'); return !!b2 && a === b2.replace('type-', 'type16-'); }),
    'T6 页签谱类图标一图一义（功能谱≠钢琴、器乐≠小提琴、钢琴弹唱≠钢琴独奏、合唱≠歌谱），与统一谱名表同源', JSON.stringify(r));

  /* T7 全部图标两两逐像素不同 */
  r = await pg.evaluate(async () => { if (typeof PQI === 'undefined') return { err: 'no PQI' };
    const keys = Object.keys(PQI);
    const raster = (k, sz) => new Promise(res => { const svg = pqIcon(k, sz).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" color="#000" ');
      const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'); x.drawImage(im, 0, 0, sz, sz);
        const d = x.getImageData(0, 0, sz, sz).data, a = []; for (let i = 3; i < d.length; i += 4) a.push(d[i] > 96 ? 1 : 0); res(a); };
      im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const out = { n: keys.length, pairs: 0, low: [], min: {} };
    for (const sz of [16, 18, 20, 24]) {   /* 收尾验收：补 18px（左轨尺寸） */
      const px = {}, mk = {}; for (const k of keys) { px[k] = await raster(k, sz); mk[k] = pqIcon(k, sz).replace(/data-pq="[^"]*"/, ''); }
      let min = 1e9, who = '';
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], c = keys[j];
        if (sz <= 16 && a.replace('type16-', 'type-') === c.replace('type16-', 'type-')) continue;   /* 16px 谱类自动换微缩母版：同一枚 */
        const A = px[a], B = px[c]; out.pairs++;
        if (!A || !B) { out.low.push(sz + ':' + a + '|' + c + ':noimg'); continue; }
        let d = 0; for (let q = 0; q < A.length; q++) if (A[q] !== B[q]) d++;
        if (d < min) { min = d; who = a + '|' + c; }
        if (d < 6 || mk[a] === mk[c]) out.low.push(sz + ':' + a + '|' + c + ':' + d);
      }
      out.min[sz] = min + ' ' + who;
    }
    return out;
  }).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
  T(!r.err && r.n === 101 && r.low.length === 0 && r.pairs > 20000,
    'T7 全部 101 枚两两逐像素不同（16 / 18 / 20 / 24px 共 ' + r.pairs + ' 对，16px 谱类自动换微缩母版的同一枚除外；各档最少相差：' + JSON.stringify(r.min) + '）：空白谱≠新建、谱友圈文件≠打开', JSON.stringify(r));

  /* T8 其余位置已换最终图标集 */
  try {
    const p8 = await b.newPage({ viewport: { width: 1440, height: 900 } });
    p8.on('pageerror', e => errs.push('T8:' + e.message));
    await p8.goto(FC); await p8.waitForTimeout(900);   /* 旧外壳专有位置：钉 ?shell=classic（flow 对应位置见 T8f） */
    await p8.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    const q = (pg2, s2) => pg2.evaluate(s2).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
    const ICS = 'svg.pqi';
    const pq = el => (el && el.querySelector('svg.pqi') || { dataset: {} }).dataset.pq;
    const R = {};
    /* 左轨：小步舞曲（器乐五线谱）、钢琴伴奏歌谱（JG 新建）、吉他弹唱预设 */
    R.rail = await q(p8, () => { const pq = el => { const s = el && el.querySelector('svg.pqi'); return s ? s.dataset.pq + '@' + s.getAttribute('width') : (el && el.querySelector('svg') ? 'svgi' : '-'); };
      const out = {};
      const take = () => [...document.querySelectorAll('#rail-tracks .rtrk')].map(pq).join(',');
      hideStartPad();
      loadSong(PRESETS.find(p => /小步舞曲/.test(p.name)).make()); out.instr = take();
      loadSong(NWB.build('JG', { title: 'x', key: 'C', beats: 4, unit: 4, tempo: 90, nMea: 4, lyr: 1 })); out.jg = take();
      loadSong(PRESETS.find(p => /欢乐颂（四部合唱）/.test(p.name)).make()); out.choir = take();
      loadSong(PRESETS[0].make()); out.gtr = take();
      setRibbon('tab'); out.cur = pq(document.querySelector('#tab-voices .trk-ic'));
      out.ltab = ['tab', 'vox', 'chord', 'lyr'].map(t => pq(document.querySelector('.ltab[data-t="' + t + '"] .lic'))).join(',');
      out.nl = ['nl-tab6', 'nl-tabst', 'nl-tabjp', 'nl-voxjp', 'nl-voxst', 'nl-voxtab'].map(id => pq(document.getElementById(id))).join(',');
      out.txt = document.querySelectorAll('#left-rail svg text, #left-flyout svg.pqi text').length;
      return out; });
    await p8.click('#rail-addtrk'); await p8.waitForTimeout(120);
    R.add = await q(p8, () => { const r2 = ['ta-vox', 'ta-tab', 'ta-map'].map(id => { const e = document.getElementById(id); const s = e && e.querySelector('svg.pqi'); return s ? s.dataset.pq : '-'; }).join(','); closeModal(); return r2; });
    R.right = await q(p8, () => { setRTab('make'); setRTab('info');
      const g = id => { const s = document.querySelector('#' + id + ' svg.pqi'); return s ? s.dataset.pq + '@' + s.getAttribute('width') : '-'; };
      const anno = document.querySelector('#rt-anno svg'), chordSv = document.querySelector('#rt-chord svg');
      return { ai: ['rt-midi', 'rt-lab', 'rt-arr', 'rt-fill', 'rt-chord', 'rt-board', 'rt-mxl', 'rt-hum'].map(g).join(','), ri: g('ri-type'), doc: (docIcon(song).match(/data-pq="([^"]+)"/) || [])[1],
        anno: anno && anno.getAttribute('width') + '=' + (chordSv && chordSv.getAttribute('width')), fill: (document.querySelector('#b-fill svg.pqi') || { dataset: {} }).dataset.pq,
        lbar: g('ri-lbar'), riTxt: document.getElementById('ri-type').textContent, label: docTypeLabel(song) + ' · ' + song.measures.length + ' 小节' }; });
    R.circle = await q(p8, () => { openCircle();
      const chips = [...document.querySelectorAll('#circle .cc-chip[data-cat]')].map(c => c.dataset.cat + ':' + ((c.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || '-')).join(',');
      const cards = [...document.querySelectorAll('#circle .cc-card .cc-type')], cardIc = cards.map(c => (c.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || '-');
      /* 收尾验收（图文一致）：图标跟徽标上实际写的谱名走——写的是统一谱名就取该谱名的图标，写的是谱库旧叫法（TYPE_CN）就按 docType；16px 自动换微缩母版 */
      const OLD = { guitar: 'type16-guitar', uku: 'type16-uku', solo: 'type16-solo', pianoacc: 'type16-pianoacc', piano: 'type16-piano', vocal: 'type16-vocal', vox: 'type16-vocal', teach: 'type16-teach', instr: 'type16-instr', staff: 'type16-instr', func: 'type16-func', chord: 'type16-chord' };
      const pubs = circleAll(), want = [...document.querySelectorAll('#circle .cc-card[data-pub]')].map(c => { const pb = pubs.find(x => x.pid === c.dataset.pub); if (!pb) return '?'; const t = c.querySelector('.cc-type').textContent.trim(), k = pb.data && NWB.kindOfSong(pb.data);
        return k && k.name === t ? k.ic.replace('type-', 'type16-') : OLD[pb.type]; });
      const typeTxt = cards.map(c => c.textContent).join('|');
      const pid = (document.querySelector('#circle .cc-card[data-pub]:not([data-remote])') || { dataset: {} }).dataset.pub;
      return { chips, nCards: cards.length, cardIc: cardIc.join(','), same: cardIc.join(',') === want.join(','), typeTxt: typeTxt.slice(0, 80), pid,
        remote: [ccKindIc({ type: 'vocal', typeLabel: '钢琴伴奏歌谱' }), ccKindIc({ type: 'instr' }), ccKindIc({ type: 'vox' }), ccKindIc({ type: 'guitar', typeLabel: '尤克里里弹唱谱' }), ccKindIc({ type: '??' })].join(','),
        shown: [ccKindIc({ type: 'vocal', data: NWB.build('JG', { nMea: 2, lyr: 1 }) }, '歌谱'), ccKindIc({ type: 'vocal' }, '钢琴伴奏歌谱'), ccKindIc({ type: 'guitar', data: NWB.build('JT', { nMea: 2, lyr: 1 }) }, '吉他弹唱谱')].join(','),
        mix: [...document.querySelectorAll('#circle .cc-card[data-pub]')].filter(c => { const pb = pubs.find(x => x.pid === c.dataset.pub); return pb && pb.data && pb.type === 'vocal' && NWB.kindOfSong(pb.data).ic === 'type-jg' && c.querySelector('.cc-type').textContent.trim() === '歌谱'; }).map(c => (c.querySelector('.cc-type svg.pqi') || { dataset: {} }).dataset.pq).join(','),
        txt: document.querySelectorAll('#circle svg.pqi text').length }; });
    if (R.circle && R.circle.pid) { await p8.click('#circle .cc-card[data-pub="' + R.circle.pid + '"]'); await p8.waitForTimeout(200);
      R.view = await q(p8, () => { const s = document.querySelector('#viewerbar .va-kind svg.pqi'), t = document.querySelector('#viewerbar .va-kind').textContent.trim(), pb = viewerCtx.pb, k = NWB.kindOfSong(pb.data);
        const OLD = { guitar: 'type16-guitar', uku: 'type16-uku', solo: 'type16-solo', pianoacc: 'type16-pianoacc', piano: 'type16-piano', vocal: 'type16-vocal', vox: 'type16-vocal', teach: 'type16-teach', instr: 'type16-instr', staff: 'type16-instr', func: 'type16-func', chord: 'type16-chord' };
        return { ic: s && s.dataset.pq, w: s && s.getAttribute('width'), want: k.name === t ? k.ic.replace('type-', 'type16-') : OLD[pb.type], t, va: document.querySelector('#viewerbar .va').textContent, col: s && getComputedStyle(s).color, muted: getComputedStyle(document.body).getPropertyValue('--muted') }; });
      await p8.evaluate(() => { const bk = document.getElementById('vw-back'); if (bk) bk.click(); }); }
    R.lib = await q(p8, () => { try { const c = document.getElementById('circle'); if (c) c.remove(); } catch (_) {} closeModal();
      libSave([{ id: 'sx1', title: '我的弹唱', updatedAt: '2026-10-15', data: NWB.build('JG', { title: '我的弹唱', key: 'F', beats: 2, unit: 4, tempo: 104, nMea: 4, lyr: 2 }) }]);
      libTab = 'preset'; showLibrary();
      const pre = [...document.querySelectorAll('.song-card[data-preset] .sc-kind')].map(k => (k.querySelector('svg.pqi') || { dataset: {} }).dataset.pq + '|' + k.textContent);
      const preWant = PRESETS.map(p => { const s = migrate(p.make()); return (docIcon(s).match(/data-pq="([^"]+)"/) || [])[1] + '|' + docTypeLabel(s); });
      closeModal(); libTab = 'mine'; showLibrary();
      const mine = [...document.querySelectorAll('.song-card[data-mine] .sc-kind')].map(k => (k.querySelector('svg.pqi') || { dataset: {} }).dataset.pq + '|' + k.textContent);
      closeModal(); libTab = 'preset';
      return { n: pre.length, same: pre.join(',') === preWant.join(','), mine: mine.join(','), sample: pre.slice(0, 3).join(',') }; });
    await p8.close();
    const L = R.rail || {}, Rt = R.right || {}, C = R.circle || {}, V = R.view || {}, Lb = R.lib || {};
    T(!L.err && L.instr === 'inst-other@18,act-add@18' && L.jg === 'inst-voice@18,inst-piano@18,inst-piano@18,act-add@18' && /^inst-voice@18(,inst-voice@18){3},act-add@18$/.test(L.choir)
      && /^inst-guitar@18/.test(L.gtr) && L.cur === 'inst-guitar@16' && L.ltab === 'nota-tab6@18,nota-jianpu@18,nota-chord@18,nota-lyrics@18' && L.nl === 'nota-tab6@18,nota-staff@18,nota-jianpu@18,nota-jianpu@18,nota-staff@18,nota-tab6@18' && L.txt === 0
      && R.add === 'inst-voice,inst-guitar,nota-tab6',
      'T8a（classic）左轨：音轨钮按乐器取最终图标（器乐五线谱＝其他器乐 inst-other 而非小提琴、钢琴伴奏歌谱＝人声＋钢琴两行、四部合唱＝人声 ×4、吉他）、「＋音轨」＝act-add、「当前音轨」16；图层页签与「显示」记谱法灯＝nota-*（无 <text>）；加轨菜单＝人声 / 吉他 / 六线谱', JSON.stringify({ L, add: R.add }));
    T(!Rt.err && Rt.ai === 'src-midi@18,nota-chord@18,src-arrange@18,nota-lyrics@18,nota-chordbox@18,inst-guitar@18,src-mxl@18,src-hum@18' && Rt.ri === Rt.doc + '@16' && /^type16-/.test(Rt.doc) && Rt.riTxt === Rt.label && Rt.lbar === 'act-swap@16'
      && Rt.anno === '18=18' && Rt.fill === 'nota-lyrics',
      'T8b（classic）右栏：创作辅助（导入 MIDI＝src-midi、配和弦工作台＝nota-chord、一键配伴奏＝src-arrange、智能填词＝nota-lyrics、和弦＝nota-chordbox、指板＝inst-guitar；隐藏的 MusicXML / 哼唱同换）18px（收尾：图标框 26，16px 下和弦图近乎实心）、「标注」铅笔与相邻同 18；歌词页「智能填词」与右栏同一枚 nota-lyrics（一图一义）；信息卡谱类图标＝页签 docIcon（微缩母版）且文字不变；谱型条按钮＝换谱类', JSON.stringify(Rt));
    T(!C.err && C.chips === 'all:-,guitar:type16-guitar,solo:type16-solo,pianoacc:type16-pianoacc,piano:type16-piano,vocal:type16-vocal,teach:type16-teach,instr:type16-instr,func:type16-func,chord:type16-chord,uku:type16-uku'
      && C.nCards > 0 && C.same && /^type16-/.test(C.cardIc) && !/undefined|,-|^-/.test(C.cardIc) && C.remote === 'type-jg,type-instr,type-vocal,type-uku,type-blank' && C.txt === 0
      && C.shown === 'type-vocal,type-jg,type-guitar' && (C.mix === '' || /^(type16-vocal)(,type16-vocal)*$/.test(C.mix))
      && V.ic && V.ic === V.want && V.w === '16' && Lb.n === 16 && Lb.same && /^type16-jg\|钢琴伴奏歌谱$/.test(Lb.mine),
      'T8c（classic 页；谱库与外壳无关）谱库：广场筛选条 10 类各配谱类图标（16px 微缩母版，「全部」不配）、卡片徽标与观看页谱类＝跟着同一处写出来的谱名取图标（统一谱名→该谱名图标；谱库旧叫法→按 docType；收尾：此前「钢琴伴奏歌谱图标＋歌谱」图文不一）；预设 16 张 · 我的曲谱卡片谱类行＝页签图标＋统一谱名', JSON.stringify({ C, V, Lb }));
  } catch (e) { T(false, 'T8 其余位置', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T8f（flow，v68.2 默认外壳）T8a / T8b 的意图在新外壳的对应处：左栏音轨树行图标（乐器组 18，与旧左轨同一 trkIcon：器乐五线谱＝inst-other、钢琴伴奏歌谱＝人声＋钢琴两行、
     四部合唱＝人声 ×4、吉他）、音轨区「＋」＝act-add、谱类芯片＝页签 docIcon（16 微缩母版）、行 2「作用于」＝当前轨乐器、记谱法层＝nota-*；
     加轨菜单＝人声 / 吉他（尤克里里置灰）/ 由旋律生成（ai-gentab）；右栏「属性 · 整谱」谱类图标＝docIcon、「智能」页一键配伴奏＝src-arrange、导入 MIDI＝src-midi；
     音轨区与右栏这些图标都无 <text>（左栏下半的 Bravura 记号格本来就用文字字形，另由 tv_trktree T21 管） */
  try {
    const pf = await b.newPage({ viewport: { width: 1440, height: 900 } });
    pf.on('pageerror', e => errs.push('T8f:' + e.message));
    await pf.goto(F); await pf.waitForTimeout(900);
    await pf.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; hideStartPad(); });
    const take = () => pf.evaluate(() => { const pq = x => x ? x.dataset.pq + '@' + x.getAttribute('width') : '-';
      return { rows: [...document.querySelectorAll('#flw-tlist .flw-trow')].map(r => pq(r.querySelector('.flw-tic svg.pqi'))).join(','),
        subs: [...new Set([...document.querySelectorAll('#flw-tlist .flw-tsico svg.pqi')].map(x => x.dataset.pq))].sort().join(','),
        add: pq(document.querySelector('#flw-trk [data-fa="tree:add"] svg.pqi')), chip: pq(document.querySelector('#flw-kchip svg.pqi')), doc: (docIcon(song).match(/data-pq="([^"]+)"/) || [])[1],
        scope: (document.querySelector('#flw-scope .flw-sic svg.pqi') || { dataset: {} }).dataset.pq, cur: (trkIcon(sel.row === 'tab' ? 'tv' : 'vv', sel.vi | 0, 18).match(/data-pq="([^"]+)"/) || [])[1],
        rxk: pq(document.querySelector('#flw-rx-song .flw-rx-kic svg.pqi')), ai: Object.fromEntries([...document.querySelectorAll('#flw-rx-ai [data-fa="rdp:ai"]')].map(x => [x.dataset.v, (x.querySelector('svg.pqi') || { dataset: {} }).dataset.pq])),
        txt: document.querySelectorAll('#flw-trk svg text, #flw-rx-ai svg text, #flw-rx-song svg text').length }; });
    const S = {
      instr: () => loadSong(PRESETS.find(p => /小步舞曲/.test(p.name)).make()),
      jg: () => loadSong(NWB.build('JG', { title: 'x', key: 'C', beats: 4, unit: 4, tempo: 90, nMea: 4, lyr: 1 })),
      choir: () => loadSong(PRESETS.find(p => /欢乐颂（四部合唱）/.test(p.name)).make()),
      gtr: () => loadSong(PRESETS[0].make()) };
    const R = {};
    for (const k of Object.keys(S)) { await pf.evaluate(S[k]); await pf.waitForTimeout(300); R[k] = await take(); }   /* 音轨树在下一帧重画（F.raf），等它画完再读 */
    await pf.click('#flw-trk [data-fa="tree:add"]'); await pf.waitForTimeout(150);
    R.addMenu = await pf.evaluate(() => [...document.querySelectorAll('#popmenu [data-fa]')].map(x => (x.querySelector('svg.pqi') || { dataset: {} }).dataset.pq).join(','));
    await pf.keyboard.press('Escape');
    await pf.close();
    const ok1 = x => x && x.add === 'act-add@16' && x.chip === x.doc + '@16' && /^type16-/.test(x.doc) && x.rxk === x.chip && x.scope === x.cur && x.txt === 0 && x.subs.split(',').every(v => /^(nota-|ai-gentab$)/.test(v));
    T(ok1(R.instr) && ok1(R.jg) && ok1(R.choir) && ok1(R.gtr) && R.instr.rows === 'inst-other@18' && R.jg.rows === 'inst-voice@18,inst-piano@18,inst-piano@18'
      && R.choir.rows === 'inst-voice@18,inst-voice@18,inst-voice@18,inst-voice@18' && /^inst-guitar@18,inst-voice@18$/.test(R.gtr.rows) && R.gtr.subs.includes('nota-tab6') && R.jg.subs.includes('nota-jianpu')
      && R.jg.ai.arr === 'src-arrange' && R.jg.ai.midi === 'src-midi' && R.jg.ai.tex === 'nota-texture' && /^inst-voice,inst-guitar,inst-ukulele,act-new,ai-gentab$/.test(R.addMenu),
      'T8f（flow）左栏音轨树：行图标按乐器（器乐五线谱 inst-other、钢琴伴奏歌谱 人声＋钢琴 ×2、四部合唱 人声 ×4、吉他弹唱 吉他＋人声）18、音轨区 ＋＝act-add、谱类芯片＝页签 docIcon 16、行 2「作用于」＝当前轨乐器、记谱法层＝nota-*；加轨菜单 人声 / 吉他 / 尤克里里（置灰）/ 另建 / 由旋律生成；右栏「整谱」谱类图标＝docIcon、「智能」一键配伴奏 src-arrange · 导入 MIDI src-midi · 伴奏织体 nota-texture；均无 <text>',
      JSON.stringify(R));
  } catch (e) { T(false, 'T8f（flow）', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* ================= 收尾验收补（修前红修后绿：MUSETAB_URL 指向收尾前的工作树副本复跑，T9–T12 红；T13 用 DOCS_DIR 指向收尾前的 docs 副本复跑红） ================= */
  const npg = async (w, h, mob, classic) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, deviceScaleFactor: mob ? 2 : 1 });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('T9+:' + e.message)); await p.goto(classic ? FC : F); await p.waitForTimeout(900);
    await p.evaluate(() => { window.guardReplace = f => f(); window.SF_PLAYWAIT = false; }); p._ctx = ctx; return p; };
  const qq = (p, f, a) => p.evaluate(f, a).catch(e => ({ err: String(e.message || e).split('\n')[0] }));

  /* T9 人声旋律不因记谱法变成「其他器乐」 */
  try {
    const p9 = await npg(1440, 900);
    const r9 = await qq(p9, () => { hideStartPad(); const ic = () => { FLOW.tree.sync(); return [...document.querySelectorAll('#flw-tlist .flw-trow')].map(x => (x.querySelector('.flw-tic svg.pqi') || { dataset: {} }).dataset.pq).join(','); };   /* v68.2：左栏音轨树（flow 默认外壳；旧左轨同一 trkIcon），同步重画后读 */
      const o = {};
      loadSong(NWB.build('SJ', { title: 'a', nMea: 4, lyr: 1 })); o.SJ = ic();
      loadSong(NWB.build('SJ', { title: 'a', nMea: 4, lyr: 0 })); o.SJ0 = ic();
      loadSong(NWB.build('SJG', { title: 'a', nMea: 4, lyr: 1 })); o.SJG = ic();
      loadSong(NWB.build('SG', { title: 'a', nMea: 4, lyr: 1 })); o.SG = ic();
      loadSong(NWB.build('S', { title: 'a', nMea: 4, lyr: 1 })); o.Sly = ic();
      loadSong(NWB.build('CS', { title: 'a', nMea: 4, lyr: 0 })); o.CS = ic();
      loadSong(NWB.build('S', { title: 'a', nMea: 4, lyr: 0 })); o.S0 = ic();
      loadSong(NWB.build('S', { title: 'a', nMea: 4, lyr: 0, instKey: 'violin' })); o.Sv = ic();
      loadSong(PRESETS.find(p => /送别/.test(p.name)).make()); o.sbJ = ic(); sel.row = 'vox'; sel.vi = 0; setVoxNotation('staff'); render(); o.sbS = ic();
      loadSong(NWB.build('JG', { title: 'a', nMea: 4, lyr: 1 })); sel.row = 'vox'; sel.vi = 0; setVoxNotation('staff'); render(); o.jgS = ic();
      return o; });
    await p9._ctx.close();
    T(!r9.err && r9.SJ === 'inst-voice' && r9.SJ0 === 'inst-voice' && r9.SJG === 'inst-voice,inst-piano,inst-piano' && r9.SG === 'inst-voice,inst-piano,inst-piano' && r9.Sly === 'inst-voice'
      && r9.CS === 'inst-voice' && r9.S0 === 'inst-other' && r9.Sv === 'inst-violin' && r9.sbJ === 'inst-voice' && r9.sbS === 'inst-voice' && r9.jgS === 'inst-voice,inst-piano,inst-piano',
      'T9 音轨乐器图标（v68.2 起读 flow 左栏音轨树，同一 trkIcon）按内容判、不按记谱法判：教学对照谱（有词 / 无词）、教学对照谱含伴奏、钢琴伴奏歌谱（五线谱）、五线谱歌谱、五线谱和弦谱的旋律＝人声；送别 / 钢琴伴奏歌谱旋律从简谱切五线谱仍是人声；只有无词无乐器的「五线谱旋律」才是其他器乐、带 instKey 用该乐器',
      JSON.stringify(r9));
  } catch (e) { T(false, 'T9', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T9b 第二轮验收 seam-3：左轨乐器与统一谱名同一判据（无词多声部五线谱＝重奏＝其他器乐） */
  try {
    const p9 = await npg(1440, 900);
    const r9 = await qq(p9, () => { hideStartPad(); const ic = () => { FLOW.tree.sync(); return [...document.querySelectorAll('#flw-tlist .flw-trow')].map(x => (x.querySelector('.flw-tic svg.pqi') || { dataset: {} }).dataset.pq).join(','); };   /* v68.2：左栏音轨树（flow 默认外壳；旧左轨同一 trkIcon），同步重画后读 */
      const o = {};
      for (const [k, opt] of [['S3', { nVox: 3, lyr: 0 }], ['S2', { nVox: 2, lyr: 0 }], ['S3ly', { nVox: 3, lyr: 1 }], ['J4', { nVox: 4, lyr: 0 }]]) {
        const s = NWB.build(k[0], Object.assign({ title: 'a', nMea: 4 }, opt)); loadSong(s); o[k] = { rail: ic(), name: docTypeLabel(song), dt: docType(song) };
      }
      /* 同名的导入四重奏（无分组、docType=instr） */
      const q = NWB.build('S', { title: 'q', nMea: 2, nVox: 4, lyr: 0 }); delete q.voxGroups; q.voxNotations = ['staff', 'staff', 'alto', 'bass']; loadSong(q); o.imp = { rail: ic(), name: docTypeLabel(song), dt: docType(song) };
      return o; });
    await p9._ctx.close();
    T(!r9.err && r9.S3.name === '五线谱重奏谱' && r9.S3.rail === 'inst-other,inst-other,inst-other' && r9.S3.dt === 'vocal'
      && r9.S2.name === '五线谱重奏谱' && r9.S2.rail === 'inst-other,inst-other' && r9.imp.name === '五线谱重奏谱' && r9.imp.rail === 'inst-other,inst-other,inst-other,inst-other'
      && r9.S3ly.name === '五线谱合唱谱' && r9.S3ly.rail === 'inst-voice,inst-voice,inst-voice' && r9.J4.rail === 'inst-voice,inst-voice,inst-voice,inst-voice',
      'T9b 音轨乐器图标（flow 左栏音轨树）与统一谱名同一判据：新建 / 深链的无词多声部五线谱（谱名五线谱重奏谱，docType 仍 vocal、谱库分类不动）＝其他器乐，与同名的导入四重奏一致（此前麦克风）；有词五线谱合唱谱、简谱合唱谱仍人声',
      JSON.stringify(r9));
  } catch (e) { T(false, 'T9b', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T14 第二轮验收 seam-4：谱类图标与谱名同义 */
  try {
    const p14 = await npg(1440, 900);
    const r14 = await qq(p14, () => { hideStartPad(); const o = {};
      const tabIc = () => { try { renderDocTabs(); } catch (_) {} const t = document.querySelector('#doc-tabs .dtab.on svg.pqi'); return t ? t.dataset.pq : (docIcon(song).match(/data-pq="([^"]+)"/) || [])[1]; };
      const railIc = () => { FLOW.tree.sync(); return [...document.querySelectorAll('#flw-tlist .flw-trow')].map(x => (x.querySelector('.flw-tic svg.pqi') || { dataset: {} }).dataset.pq).join(','); };   /* v68.2：左栏音轨树 */
      const s1 = NWB.build('S', { title: 'a', nMea: 2, nVox: 3, lyr: 0 }); loadSong(s1); render();
      o.ens = { name: docTypeLabel(song), ic: NWB.kindOfSong(song).ic, tab: tabIc(), byName: ccKindIc({ type: 'instr' }, '五线谱重奏谱') };
      o.choir = { ic: NWB.kindOf('S', { nVox: 3, lyr: true }).ic, byName: ccKindIc({ type: 'vocal' }, '五线谱合唱谱'), j: NWB.kindOf('J', { nVox: 3 }).ic };
      const u = NWB.build('ST', { title: 'u', nMea: 2 }); u.inst = 'uku'; u.tabVoices = ['尤克里里1']; loadSong(u); render();
      o.ukuSolo = { name: docTypeLabel(song), ic: NWB.kindOfSong(song).ic, tab: tabIc(), rail: railIc(), byName: ccKindIc({ type: 'solo' }, '尤克里里独奏谱') };
      o.gtSolo = { ic: NWB.kindOf('ST', {}).ic, byName: ccKindIc({ type: 'solo' }, '吉他独奏谱') };
      o.ukuT = NWB.kindOf('T', { inst: 'uku' }).ic; o.ukuJT = NWB.kindOf('JT', { inst: 'uku' }).ic;
      return o; });
    await p14._ctx.close();
    T(!r14.err && r14.ens.name === '五线谱重奏谱' && r14.ens.ic === 'type-instr' && r14.ens.byName === 'type-instr' && /^type(16)?-instr$/.test(r14.ens.tab || '')
      && r14.choir.ic === 'type-choir' && r14.choir.byName === 'type-choir' && r14.choir.j === 'type-choir'
      && r14.ukuSolo.name === '尤克里里独奏谱' && r14.ukuSolo.ic === 'type-uku' && r14.ukuSolo.byName === 'type-uku' && /^type(16)?-uku$/.test(r14.ukuSolo.tab || '') && /^inst-ukulele/.test(r14.ukuSolo.rail)
      && r14.gtSolo.ic === 'type-solo' && r14.gtSolo.byName === 'type-solo' && r14.ukuT === 'type-uku' && r14.ukuJT === 'type-uku',
      'T14 谱类图标与谱名同义：五线谱重奏谱＝器乐五线谱图标（此前合唱谱的方括号＋简谱数字）、尤克里里独奏谱＝尤克里里图标（此前吉他六线独奏，与左轨 inst-ukulele 矛盾）；页签 / 谱库卡片反查同口径；合唱谱 / 吉他独奏谱 / 尤克里里谱不变',
      JSON.stringify(r14));
  } catch (e) { T(false, 'T14', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T10 手机底条：音轨名不被图标挤没、图层钮图标不溢出、底条不增高——classic 段＝旧手机三层底栏的图层轨 #left-rail（钉 ?shell=classic）；flow 段（T10f）在其后 */
  try {
    const out = {};
    for (const [w, h] of [[390, 844], [360, 640], [320, 568]]) {
      const pm = await npg(w, h, true, true);
      out[w] = await qq(pm, () => { const o = {};
        for (const nm of ['欢乐颂（四部合唱）', '小星星（分解弹唱）']) {
          hideStartPad(); loadSong(PRESETS.find(x => x.name === nm).make()); render();
          const rail = document.getElementById('left-rail'), btns = [...rail.querySelectorAll('.ltab')].filter(x => x.getBoundingClientRect().width > 0);
          const lbs = [...rail.querySelectorAll('.rtrk[data-trk] .lb')].map(l => l.clientWidth);
          const ovf = btns.filter(x => { const rc = x.getBoundingClientRect(); return [...x.querySelectorAll('svg')].some(sv => { const r2 = sv.getBoundingClientRect(); return r2.width > 0 && (r2.left < rc.left - 0.5 || r2.right > rc.right + 0.5); }); }).map(x => (x.querySelector('.lb') || {}).textContent);
          const vis = btns.filter(x => !x.classList.contains('rtrk-add')).map(x => [...x.querySelectorAll('svg')].filter(sv => sv.getBoundingClientRect().width > 0).length).reduce((a, c) => a + c, 0);
          const add = rail.querySelector('#rail-addtrk svg.pqi');
          o[nm.slice(0, 3)] = { lbMin: Math.min(...lbs), ovf: ovf.join(','), visIc: vis, railH: Math.round(rail.getBoundingClientRect().height), sw: rail.scrollWidth - rail.clientWidth,
            add: add && add.dataset.pq + '@' + Math.round(add.getBoundingClientRect().width) + '/' + add.getAttribute('width') };
        }
        return o; });
      await pm._ctx.close();
    }
    const all = Object.values(out).flatMap(x => Object.values(x));
    T(all.every(x => x.lbMin >= 12 && !x.ovf && x.visIc === 0 && x.railH === 44 && x.sw <= 0 && x.add === 'act-add@14/14'),
      'T10（classic）手机底条（390 / 360 / 320）：四部合唱 4 条音轨名都至少露一个字（≥12px，此前 0px＝四个一样的麦克风）、底条只留文字（同 v67.5 观感，图层钮图标不再溢出左框）、「＋音轨」按 14px 档生成不缩放、底条高 44 不变、不横向溢出',
      JSON.stringify(out));
  } catch (e) { T(false, 'T10', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T10f（flow 手机 body.flw-m，v68.2 默认）：旧图层轨换成底条 #flw-mbar 的「当前轨」芯片 #flw-mtrk ＋ 音轨抽屉——同一意图：
     四部合唱每条音轨名都露得出字（芯片里当前轨名 ≥12px；抽屉里 4 条轨名各 ≥12px）、乐器图标（trkIcon，人声＝inst-voice）不溢出芯片、底条高 64 贴底（M16 口径，旧底条 44）、不横向溢出；
     「＋音轨」不在手机上（D-07 ②：音轨抽屉只选轨 / 静音 / 独奏，加轨请到电脑——随方案必然改变，tv_modes M16 同口径） */
  try {
    const out = {};
    for (const [w, h] of [[390, 844], [360, 640], [320, 568]]) {
      const pm = await npg(w, h, true);
      out[w] = {};
      for (const nm of ['欢乐颂（四部合唱）', '小星星（分解弹唱）']) {
        await qq(pm, n => { try { closeModal(); } catch (_) {} hideStartPad(); loadSong(PRESETS.find(x => x.name === n).make()); render(); }, nm); await pm.waitForTimeout(300);
        const o = await qq(pm, () => { const bar = document.getElementById('flw-mbar'), ch = document.getElementById('flw-mtrk'); if (!bar || !ch) return { none: true };
          const br = bar.getBoundingClientRect(), cr = ch.getBoundingClientRect(), ic = ch.querySelector('.flw-mtic svg.pqi'), ir = ic ? ic.getBoundingClientRect() : null, cn = ch.querySelector('.flw-mcn');
          return { m: document.body.classList.contains('flw-m'), barH: Math.round(br.height), atBottom: Math.abs(br.bottom - innerHeight) <= 1, sw: bar.scrollWidth - bar.clientWidth, docSw: document.documentElement.scrollWidth - innerWidth,
            ic: ic ? ic.dataset.pq : null, icIn: !!ir && ir.left >= cr.left - 0.5 && ir.right <= cr.right + 0.5, cn: cn.textContent, cnW: cn.clientWidth, txt: ch.querySelectorAll('svg text').length }; });   /* 只查音轨芯片（相邻「记号」芯片画的是 Bravura 字形，本来就是文字） */
        await pm.click('#flw-mtrk'); await pm.waitForTimeout(250);
        o.sheet = await qq(pm, () => [...document.querySelectorAll('#flw-msheet .flw-mrb')].map(x => { const bb = x.querySelector('.flw-mwt b'), sv = x.querySelector('.flw-mric svg.pqi'); return { n: bb.textContent, w: bb.clientWidth, ic: sv ? sv.dataset.pq : '-' }; }));
        await pm.keyboard.press('Escape'); await pm.waitForTimeout(150);
        out[w][nm.slice(0, 3)] = o;
      }
      await pm._ctx.close();
    }
    const ok = x => x && x.m && x.barH === 64 && x.atBottom && x.sw <= 0 && x.docSw <= 0 && x.icIn && x.cnW >= 12 && x.txt === 0 && Array.isArray(x.sheet) && x.sheet.length >= 2 && x.sheet.every(t => t.w >= 12 && t.ic !== '-');
    const all = Object.values(out).flatMap(x => Object.values(x));
    T(all.every(ok) && Object.values(out).every(x => x['欢乐颂'].sheet.length === 4 && x['欢乐颂'].sheet.every(t => t.ic === 'inst-voice') && x['欢乐颂'].ic === 'inst-voice'),
      'T10f（flow）手机底条 #flw-mbar（390 / 360 / 320）：当前轨芯片的轨名 ≥12px、乐器图标不出芯片、芯片无 <text>；音轨抽屉里四部合唱 4 条轨名各 ≥12px、图标＝人声；底条高 64 贴底、不横向溢出',
      JSON.stringify(out));
  } catch (e) { T(false, 'T10f（flow）', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T11 谱友圈广场筛选条：分类一行不被拆开；手机不加行 */
  try {
    const out = {};
    for (const w of [1920, 1440, 1280, 1024, 390]) {
      const pc = await npg(w, 900, w < 500);
      out[w] = await qq(pc, () => { openCircle();
        const cats = [...document.querySelectorAll('#circle .cc-chip[data-cat]')], other = [...document.querySelectorAll('#circle .cc-chip[data-pay],#circle .cc-chip[data-favonly]')];
        const ct = [...new Set(cats.map(c => Math.round(c.getBoundingClientRect().top)))], ot = [...new Set(other.map(c => Math.round(c.getBoundingClientRect().top)))];
        const icVis = cats.some(c => { const s = c.querySelector('svg.pqi'); return s && s.getBoundingClientRect().width > 0; });
        return { catRows: ct.length, mixed: ot.some(t => ct.includes(t)) && ct.length > 1, icVis, gridTop: Math.round(document.querySelector('#circle .cc-grid').getBoundingClientRect().top) }; });
      await pc._ctx.close();
    }
    T(['1920', '1440', '1280'].every(w => out[w].catRows === 1 && !out[w].mixed && out[w].icVis) && out[1024].icVis && !out[390].icVis && out[390].gridTop <= 290,
      'T11 广场筛选条：1280–1920 宽全部 10 类（带图标）在同一行、不和免费 / 付费 / 收藏混排（此前和弦谱 / 尤克里里掉到第二行）；手机 390 不显示筛选图标、第一张卡不下移（≤ v67.5 的 290）', JSON.stringify(out));
  } catch (e) { T(false, 'T11', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T12 遗漏位置：帮助 / 特色功能弹窗谱类图标、折叠符 / 行尾箭头 / 删除钮字符、常态颜色 */
  try {
    const pd = await npg(1440, 900);
    const r12 = await qq(pd, () => { const o = {};
      hideStartPad(); loadSong(PRESETS[0].make()); render();
      document.getElementById('b-help').click();
      o.help = [...document.querySelectorAll('.hd-st .ic')].filter(x => /吉他谱|简谱|功能谱/.test(x.parentElement.textContent)).map(x => (x.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || 'svgi').join(',');
      closeModal(); document.getElementById('b-feat').click();
      o.feat = [...document.querySelectorAll('.featx .fx')].filter(x => /^(吉他谱|尤克里里谱|简谱|功能谱)$/.test((x.querySelector('b') || {}).textContent)).map(x => (x.querySelector('.ic svg.pqi') || { dataset: {} }).dataset.pq || 'svgi').join(',');
      closeModal();
      const rc = document.querySelector('.rc-h:not(.rc-btn)'); o.rcAfter = rc ? getComputedStyle(rc, '::after').content : '?';
      o.aiarr = [...document.querySelectorAll('.aiarr')].map(a => (a.querySelector('svg.pqi') || { dataset: {} }).dataset.pq + (a.textContent.trim() ? '+txt' : '')).join(',');
      setRibbon('tab'); o.vdel = [...document.querySelectorAll('.vdel')].map(v => (v.querySelector('svg.pqi') || { dataset: {} }).dataset.pq + (v.textContent.trim() ? '+txt' : '')).join(',');
      const muted = getComputedStyle(document.body).getPropertyValue('--muted').trim(), probe = document.createElement('i'); probe.style.color = muted; document.body.appendChild(probe); const mc = getComputedStyle(probe).color; probe.remove();
      setRTab('info'); const ri = document.querySelector('#ri-type .ri-kic'); o.riMuted = !!ri && getComputedStyle(ri).color === mc;
      libTab = 'preset'; showLibrary(); const sk = document.querySelector('.song-card .sc-kind .pqi'); o.scMuted = !!sk && getComputedStyle(sk).color === mc; closeModal();
      return o; });
    await pd._ctx.close();
    T(!r12.err && r12.help === 'type16-guitar,nota-jianpu,type16-func' && r12.feat === 'type16-guitar,type16-uku,nota-jianpu,type16-func' && r12.rcAfter === '""'
      && /^(act-step,)*act-step$/.test(r12.aiarr) && /^(act-close,)*act-close$/.test(r12.vdel) && r12.riMuted && r12.scMuted,
      'T12 遗漏位置换齐：帮助 / 特色功能弹窗的吉他谱 / 简谱 / 尤克里里 / 功能谱用最终图标（功能谱不再是钢琴）；右栏卡片折叠符不再是字符 ▸、创作辅助行尾＝act-step、当前音轨删除＝act-close（都不再是字符）；信息卡 / 预设卡片谱类图标常态 --muted',
      JSON.stringify(r12));
  } catch (e) { T(false, 'T12', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  /* T13 设计源文件不漂移：gen.js 重出的 101 枚 svg / pq-icons.js / manifest 与入库逐字节一致；proto.html 内嵌图标数据＝pq-icons.js */
  try {
    const os = require('os'), cp = require('child_process');
    const DOCS = process.env.DOCS_DIR || path.resolve(__dirname, '../../docs/design-2026-10e');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pqgen-'));
    fs.mkdirSync(path.join(tmp, 'd', 'src'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'd', 'icons')); fs.mkdirSync(path.join(tmp, 'd', 'data'));
    fs.cpSync(path.join(DOCS, 'src', 'icons'), path.join(tmp, 'd', 'src', 'icons'), { recursive: true });
    cp.execFileSync(process.execPath, [path.join(tmp, 'd', 'src', 'icons', 'gen.js')], { stdio: 'pipe' });
    const diff = [];
    for (const f of fs.readdirSync(path.join(tmp, 'd', 'icons'))) { let a = null; try { a = fs.readFileSync(path.join(DOCS, 'icons', f)); } catch (_) {} if (!a || !a.equals(fs.readFileSync(path.join(tmp, 'd', 'icons', f)))) diff.push(f); }
    if (!fs.readFileSync(path.join(DOCS, 'data', 'icons-manifest.json')).equals(fs.readFileSync(path.join(tmp, 'd', 'data', 'icons-manifest.json')))) diff.push('icons-manifest.json');
    const pqjs = fs.readFileSync(path.join(DOCS, 'icons', 'pq-icons.js'), 'utf8'), proto = fs.readFileSync(path.join(DOCS, 'proto.html'), 'utf8');
    const ent = [...pqjs.matchAll(/"([a-z0-9-]+)":\[(16|24),"((?:[^"\\]|\\.)*)"\]/g)];
    const pdiff = ent.filter(m => !proto.includes(m[0])).map(m => m[1]);
    fs.rmSync(tmp, { recursive: true, force: true });
    T(ent.length === 101 && diff.length === 0 && pdiff.length === 0,
      'T13 设计源文件不漂移：gen.js 重出的 101 枚 svg（含文件末换行）/ pq-icons.js / icons-manifest.json 与入库逐字节一致；proto.html 内嵌 101 枚图标数据＝pq-icons.js（src-blank / src-mtab 新几何已同步）',
      JSON.stringify({ n: ent.length, diff, protoDiff: pdiff }));
  } catch (e) { T(false, 'T13 设计源文件', 'EXC: ' + String(e.message || e).split('\n')[0]); }

  T(errs.length === 0, '无页面报错', errs.join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
