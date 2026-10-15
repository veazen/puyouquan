/* v67.4 新建面板「按用途开谱 · 所见即所建」专项（docs/design-2026-10e 已拍板，口径对照 data/verify.json）：
   T1 43 个「用途 × 变体 × 旋律用」组合：真实点击建谱 → 反推谱行（NWB.stackOf）＝方案口径；docType ＝方案口径；
      面板「将建成」＝创建钮＝docTypeLabel ＝方案谱名；存取往返（JSON / 本机存储 → migrate）后谱行、docType、谱名不变；产物字段全在既有字段表内（新增 0）
   T2 14 种谱行组合全部可达（43 组合 ＋ 自选记谱法熄灭简谱＝仅六线谱）；「要哪几种谱」5 种谱 × 14 种起点＝70 种点选全部落到合法组合
   T3 500 串随机面板操作（点用途 / 开关谱 / 1–5 键 / 变体 / 旋律用 / 调拍速度 / 更多设置 / 乐器下拉 / 撤销 / 曲名 / ↑↓）：
      最终建谱计划 ＝「只按当前看得见的选择从零重建」的计划，逐字一致——泄漏 0；其中 20 串真建谱，产物＝按重建计划建谱
   T4 点击数（入口算 1、打字不计，真实点击并核对谱类与窗口数）：吉他弹唱 2、钢琴即兴伴奏 3、儿歌 2/4 3、教学对照 3、视唱 3、钢琴独奏 3、和弦谱 3、
      「新建 ▾」钢琴即兴伴奏 2、按上次（Alt+Shift+N）1、启动台「按上次」1
   T5 键盘：Alt+N 开面板（编辑器 / 启动台都行）、焦点落在已选用途；listbox ↑↓ / Home / End 选用途、roving tabindex 只有一个 0；1–5 开关五种谱；
      Enter 建；Esc 关；双击用途直接建；Ctrl+K 仍是和弦快速输入；「新建 ▾」菜单 ↓ / Enter 键盘可达
   T6 冲突不静默：悬停 / 聚焦先预告结果（「点亮『钢琴大谱表』→ 钢琴伴奏歌谱（将换下『六线谱』）」）；点下去说明原因＋「撤销」；撤销回原状；6 秒后提示自动收起
   T7 命中区 ≥44px：面板（新建页各用途、更多设置展开、从已有音乐页）与「新建 ▾」菜单所有可点控件宽高都 ≥44
   T8 对比度 ≥4.5:1：浅色 / 深色两主题，面板与菜单所有可见文字（合成背景后实测）
   T9 紧凑档：1280×720 面板在视口内、左栏 11 个用途不滚动全可见、去掉说明行；1024×700 右栏收到预览下方、无横向溢出；1366×768 三栏并排
   T10 深色：面板底读 --panel（深）、字浅；谱行示意纸面恒白
   T11 本机键 musetab-nw-last：建谱后记住用途 / 谱行 / 参数（不记曲名）；重开面板沿用（依据显示「沿用上次」）；坏值 / 读写抛错时回默认吉他弹唱且照常建谱；
      全程只新增这一个 musetab-* 键
   T12 启动台：开始一份谱 / 按上次（首访「马上开始」）/ 从已有音乐 ＋ 常用用途 5 个直达；首访不显示「继续上次编辑」（示例谱不算）；
      空白谱不算、有内容的自己的谱刷新后出现并能接着编辑；1024×700 卡片文字不溢出；手机 390 仍是只读引导卡
   T13 统一谱名：16 份预设谱名＝方案谱名表；建成后页签提示 / 建成提示 / 页签谱类图标（16px 微缩母版）读同一张表
   T14 离屏不变量：开面板、交替切用途与谱 50 次后 Esc 关闭——本机曲谱 / 窗口存储字节、撤销 / 重做栈、选区、#paper 尺寸、窗口数全部不变
   —— 收尾验收回归（对抗式验收逐条复现，修前红、修后绿；修前基线＝收尾前的 v67.4 工作区版本）——
   T15 只拦真手机（触屏粗指针＋屏幕短边 <600）：电脑窄窗 800 / 平板竖屏 768 照常新建，右栏导入 MusicXML 弹选文件；手机「发到电脑继续」另给「导入已有的谱」
   T16 钢琴伴奏歌谱：一键配伴奏 / 节奏型库→伴奏织体都填进本谱右手 / 左手两行（不另开窗口、不覆盖旋律、尾部不配、一步撤销）；建成提示指向真能走通的路
   T17 变调夹不记、定弦沿用时写明依据；换用途回默认，只有本次亲手改的才保留
   T18 「旋律＋钢琴伴奏」要正面证据：导入 SAB 合唱＝五线谱合唱谱；人声＋钢琴 / 一键配伴奏产物照旧
   T19 右栏谱类＝页签＝docTypeLabel；面板无自造词「谱行」；「先写旋律」提示写真实位置；底栏键位 / 启动台文案按方案
   T20 撤销只退谱；鼠标点过按钮后回车照样建、键盘焦点回车交还按钮；输入法 229 回车不建；面板内 Ctrl+Z
   T21 焦点：Esc 归还、Tab 循环、1–5 后焦点跟随、单选组 roving＋方向键、组名 role=group、悬停不进 live 区、提示聚焦不计时、1280×610 ↓ 滚进可视区
   T22 入口：继续上次编辑是按钮、新建 / ▾ / ＋ 命中区、快捷菜单 Tab / 缩放即收起、输入框里 Alt+N、预览浮层下不响应
   T23 建成提示按字数延长；继续上次编辑认得出改过页头的示例谱 / 新谱
   T24 本机键坏值（原型链键、自选记谱法缺组合）：面板照常、能建、自愈、无报错
   T25 谱库观看页标题仍读谱库口径（拍板 5）
   T26 四部合唱示意谱号不相碰
   突变实证：MUSETAB_URL=file://…/v67.3 原版 → 无新建面板 / NWB / 启动台新卡 → 全红。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const COMBOS = [   /* 方案 43 组合（data/verify.json → mapping.rows）：[用途, 变体, 旋律用, 谱行, 谱名, docType] */
  ['gtr', { inst: 'guitar', pen: 'T' }, 'J', 'JT', '吉他弹唱谱', 'guitar'], ['gtr', { inst: 'guitar', pen: 'J' }, 'J', 'JT', '吉他弹唱谱', 'guitar'],
  ['gtr', { inst: 'uku', pen: 'T' }, 'J', 'JT', '尤克里里弹唱谱', 'uku'], ['gtr', { inst: 'uku', pen: 'J' }, 'J', 'JT', '尤克里里弹唱谱', 'uku'],
  ['pacc', { acc: 'mel' }, 'J', 'JG', '钢琴伴奏歌谱', 'vocal'], ['pacc', { acc: 'mel' }, 'S', 'SG', '钢琴伴奏歌谱（五线谱）', 'instr'], ['pacc', { acc: 'pure' }, 'J', 'CG', '钢琴弹唱谱（纯伴奏）', 'pianoacc'],
  ['kids', { acc: 'mel' }, 'J', 'JG', '钢琴伴奏歌谱', 'vocal'], ['kids', { acc: 'mel' }, 'S', 'SG', '钢琴伴奏歌谱（五线谱）', 'instr'], ['kids', { acc: 'pure' }, 'J', 'CG', '钢琴弹唱谱（纯伴奏）', 'pianoacc'],
  ['vocal', { parts: 1 }, 'J', 'J', '简谱歌谱', 'vocal'], ['vocal', { parts: 1 }, 'S', 'S', '五线谱歌谱', 'instr'], ['vocal', { parts: 2 }, 'J', 'J', '简谱合唱谱', 'vocal'],
  ['vocal', { parts: 2 }, 'S', 'S', '五线谱合唱谱', 'vocal'], ['vocal', { parts: 3 }, 'J', 'J', '简谱合唱谱', 'vocal'], ['vocal', { parts: 3 }, 'S', 'S', '五线谱合唱谱', 'vocal'],
  ['vocal', { parts: 4 }, 'J', 'J', '简谱合唱谱', 'vocal'], ['vocal', { parts: 4 }, 'S', 'S', '五线谱合唱谱', 'vocal'],
  ['teach', { tacc: 'no' }, 'J', 'SJ', '教学对照谱', 'teach'], ['teach', { tacc: 'with' }, 'J', 'SJG', '教学对照谱（含伴奏）', 'teach'],
  ['sight', { clef: 'staff' }, 'J', 'S', '五线谱旋律', 'instr'], ['sight', { clef: 'bass' }, 'J', 'S', '五线谱旋律', 'instr'], ['solo', {}, 'J', 'ST', '吉他独奏谱', 'solo'],
  ['inst', { instKey: 'piano' }, 'J', 'G', '钢琴独奏谱', 'piano'], ['inst', { instKey: 'violin' }, 'J', 'S', '小提琴谱（五线谱）', 'instr'],
  ['inst', { instKey: 'erhu' }, 'J', 'J', '二胡谱（简谱）', 'vocal'], ['inst', { instKey: 'erhu' }, 'S', 'S', '二胡谱（五线谱）', 'instr'],
  ['inst', { instKey: 'guzheng' }, 'J', 'J', '古筝谱（简谱）', 'vocal'], ['inst', { instKey: 'guzheng' }, 'S', 'S', '古筝谱（五线谱）', 'instr'],
  ['inst', { instKey: 'epiano' }, 'J', 'G', '电钢琴独奏谱', 'piano'], ['inst', { instKey: 'flute' }, 'J', 'S', '长笛谱（五线谱）', 'instr'],
  ['inst', { instKey: 'trombone' }, 'J', 'S', '长号谱（五线谱）', 'instr'], ['inst', { instKey: 'bass' }, 'J', 'S', '贝斯谱（五线谱）', 'instr'],
  ['inst', { instKey: 'dizi' }, 'J', 'J', '笛子谱（简谱）', 'vocal'], ['inst', { instKey: 'dizi' }, 'S', 'S', '笛子谱（五线谱）', 'instr'],
  ['inst', { instKey: 'pipa' }, 'J', 'J', '琵琶谱（简谱）', 'vocal'], ['inst', { instKey: 'pipa' }, 'S', 'S', '琵琶谱（五线谱）', 'instr'],
  ['inst', { instKey: 'other' }, 'J', 'S', '器乐谱（五线谱）', 'instr'],
  ['chord', { ftype: 'C' }, 'J', 'C', '和弦谱', 'chord'], ['chord', { ftype: 'CJ' }, 'J', 'CJ', '功能谱', 'func'], ['chord', { ftype: 'CJ' }, 'S', 'CS', '五线谱和弦谱', 'func'],
  ['blank', {}, 'J', 'J', '简谱歌谱', 'vocal'], ['blank', {}, 'S', 'S', '五线谱歌谱', 'instr'],
];
const PRESET_KIND = ['吉他弹唱谱', '吉他弹唱谱', '吉他弹唱谱', '吉他弹唱谱', '尤克里里弹唱谱', '功能谱', '简谱歌谱', '吉他独奏谱', '钢琴独奏谱', '钢琴弹唱谱（纯伴奏）',
  '简谱歌谱', '简谱合唱谱', '五线谱旋律', '教学对照谱', '和弦谱', '功能谱'];
/* v67.3 既有 song 字段（createSong / 迁移 / 导入 / 编辑器各处已在写的键）——新建产物的键必须全部落在这里（新增字段 0） */
const OLD_FIELDS = ['v', 'title', 'singer', 'lyricist', 'composer', 'maker', 'key', 'beats', 'unit', 'tempo', 'capo', 'customChords', 'inst', 'func', 'tabVoices', 'voxVoices',
  'voxNotations', 'lyricLines', 'measures', 'tempoUnit', 'tabStaff', 'gtype', 'tuning', 'voxDual', 'pianoAcc', 'funcNames', 'chordOnly', 'layout', 'voxGroups', 'instKey', 'mixer', 'mode', 'id'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + String(d).slice(0, 1600) : '')); };
  const errs = [];
  const open = async (w, h, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 800 }, isMobile: !!opt.mob, hasTouch: !!(opt.mob || opt.touch) });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(5000);
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    if (opt.init) await pg.addInitScript(opt.init);
    await pg.goto(F); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    pg._ctx = ctx; return pg;
  };
  const EVx = (pg, s, a) => pg.evaluate(s, a).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
  const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n')[0]); } };
  const panelOpen = pg => pg.evaluate(() => !!document.querySelector('.nf-modal [data-scene]')).catch(() => false);
  const openPanel = async (pg, keepLast) => {
    await EVx(pg, k => { try { closeModal(); } catch (_) {} if (!k) { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} } }, !!keepLast);
    await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]', { timeout: 2500 });
  };
  const visKey = async (pg, sel) => (await pg.$(sel)) && (await pg.isVisible(sel));

  /* ---------- T1 43 组合 ---------- */
  const reached = new Set();
  await guard('T1 43 组合', async () => {
    const pg = await open(1280, 900);
    const bad = []; let n = 0, newF = new Set();
    for (const [sc, vars, mel, wantK, wantName, wantDT] of COMBOS) {
      await openPanel(pg);
      await pg.click('[data-scene="' + sc + '"]');
      for (const [k, v] of Object.entries(vars)) {
        const btn = '.nf-modal [data-act="var"][data-k="' + k + '"][data-v="' + v + '"]';
        if (await pg.$(btn)) await pg.click(btn); else await pg.selectOption('#nf-inst', String(v));
      }
      if (await pg.$('.nf-modal [data-act="mel"][data-v="' + mel + '"]')) await pg.click('.nf-modal [data-act="mel"][data-v="' + mel + '"]');
      const pk = await pg.evaluate(() => [document.getElementById('nf-kind').textContent, document.getElementById('nf-gokind').textContent]);
      const docs0 = await pg.evaluate(() => docs.length);
      await pg.click('#nw-create'); await pg.waitForTimeout(80);
      const r = await pg.evaluate((OLD) => {
        const k = NWB.stackOf(song), dt = docType(song), name = docTypeLabel(song);
        const rt = migrate(JSON.parse(JSON.stringify(song)));
        persistNow(); const ls = migrate(JSON.parse(localStorage.getItem('musetab-song-v1')));
        const extra = Object.keys(song).filter(x => !OLD.includes(x));
        return { k, dt, name, rtK: NWB.stackOf(rt), rtDT: docType(rt), rtN: docTypeLabel(rt), lsK: NWB.stackOf(ls), lsDT: docType(ls), lsN: docTypeLabel(ls), extra, docs: docs.length };
      }, OLD_FIELDS);
      n++; reached.add(r.k); r.extra.forEach(x => newF.add(x));
      const ok = r.k === wantK && r.dt === wantDT && r.name === wantName && pk[0] === wantName && pk[1] === wantName
        && r.rtK === wantK && r.rtDT === wantDT && r.rtN === wantName && r.lsK === wantK && r.lsDT === wantDT && r.lsN === wantName && !r.extra.length && r.docs === docs0 + 1;
      if (!ok) bad.push(sc + JSON.stringify(vars) + mel + ' → ' + JSON.stringify({ r, pk }));
      await pg.evaluate(() => { if (docs.length > 2) closeDocAt(curDocI); });
    }
    T(bad.length === 0 && n === 43 && newF.size === 0,
      'T1 43 组合：反推谱行 / docType / 面板＝创建钮＝docTypeLabel＝方案谱名 / JSON 与本机存储往返不变 / 新增字段 0（' + n + ' 组合）', bad.join(' | ') || ('ok · 用到的谱行 ' + [...reached].sort().join(',')));
    /* T2 前半：自选记谱法——吉他弹唱熄灭简谱（键盘 1）＝仅六线谱 */
    await openPanel(pg);
    await pg.click('[data-scene="gtr"]'); await pg.keyboard.press('1');
    const kT = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
    await pg.click('#nw-create'); await pg.waitForTimeout(80);
    const tOnly = await pg.evaluate(() => ({ k: NWB.stackOf(song), dt: docType(song), vox: song.voxVoices.length, tab: song.tabVoices.length }));
    reached.add(tOnly.k);
    /* 70 种点选：14 种起点 × 5 种谱，全部落到合法组合 */
    const r70 = await pg.evaluate(() => {
      showNewWizard(); const st = NWP.state, bad = [];
      NWB.VALID.forEach(start => ['J', 'S', 'T', 'G', 'C'].forEach(r => {
        st.scene = 'custom'; st.rows = NWB.STACKS[start].rows.slice(); NWP.toggleRow(r);
        const k = NWP.stackOfState(st); if (!NWB.STACKS[k]) bad.push(start + '+' + r + '→' + k);
      }));
      closeModal(); return { n: NWB.VALID.length * 5, bad };
    });
    T(reached.size === 14 && tOnly.k === 'T' && kT === '吉他谱（六线谱）' && tOnly.vox === 0 && tOnly.tab === 1 && r70.n === 70 && r70.bad.length === 0,
      'T2 14 种谱行组合全部可达（含自选记谱法 · 仅六线谱）；5 种谱 × 14 种起点＝70 种点选全部合法', JSON.stringify({ reached: [...reached].sort(), tOnly, kT, r70 }));
    await pg._ctx.close();
  });

  /* ---------- T3 500 串随机操作零泄漏 ---------- */
  await guard('T3 500 串零泄漏', async () => {
    const pg = await open(1280, 900);
    await pg.evaluate(() => {
      /* 只按「当前看得见的」选择从零重建计划 */
      window.__visPlan = () => {
        const m = document.querySelector('.nf-modal');
        const mb = m.querySelector('.nf-more'); if (mb && mb.getAttribute('aria-expanded') !== 'true') mb.click();
        const scene = m.querySelector('[role=option][aria-selected="true"]').dataset.scene;
        const st = NWP.fresh({ clean: true }); NWP.applyScene(st, scene, true);
        if (scene === 'custom') st.rows = [...m.querySelectorAll('.nf-row[aria-pressed="true"]')].map(x => x.dataset.row);
        const mel = m.querySelector('[data-act="mel"][aria-checked="true"]'); if (mel) st.mel = mel.dataset.v;
        m.querySelectorAll('[data-act="var"][aria-checked="true"]').forEach(x => { st.v[x.dataset.k] = /^\d+$/.test(x.dataset.v) ? +x.dataset.v : x.dataset.v; });
        const ik = m.querySelector('#nf-inst'); if (ik && ik.value) st.v.instKey = ik.value;
        const kv = m.querySelector('#nw-key').value.split('|'); st.v.key = kv[0]; st.v.mode = kv[1] === 'minor' ? 'minor' : 'major';
        st.v.beats = +m.querySelector('#nw-beats').value; st.v.unit = +m.querySelector('#nw-unit').value;
        st.v.tempo = +m.querySelector('#nw-tempo').value;
        const tu = m.querySelector('#nw-tunit'); if (!tu.hidden) st.v.tunit = tu.value;
        st.v.title = m.querySelector('#nw-title').value;
        const g = id => m.querySelector('#' + id);
        if (g('nf-nmea')) st.v.nMea = +g('nf-nmea').value; if (g('nf-lyr')) st.v.lyr = +g('nf-lyr').value;
        if (g('nf-tuning')) st.v.tuning = g('nf-tuning').value; if (g('nf-capo')) st.v.capo = +g('nf-capo').value;
        return NWP.planOf(st);
      };
      let seed = 20261015; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
      const pick = a => a[rnd(a.length)];
      const setSel = (el, v) => { if (!el) return; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
      const key = (k) => { const t = document.querySelector('.nf-modal [role=option][aria-selected="true"]'); t.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); };
      window.__ops = [
        () => pick([...document.querySelectorAll('.nf-modal [role=option]')]).click(),
        () => pick([...document.querySelectorAll('.nf-modal .nf-row')]).click(),
        () => key(String(1 + rnd(5))),
        () => { const a = [...document.querySelectorAll('.nf-modal [data-act="var"]')]; if (a.length) pick(a).click(); },
        () => { const a = [...document.querySelectorAll('.nf-modal [data-act="mel"]')]; if (a.length) pick(a).click(); },
        () => { const s = document.getElementById('nw-key'); setSel(s, pick([...s.options]).value); },
        () => { setSel(document.getElementById('nw-beats'), String(pick(NW_BEATS))); },
        () => { setSel(document.getElementById('nw-unit'), String(pick([2, 4, 8]))); },
        () => { const t = document.getElementById('nw-tempo'); t.value = String(pick([20, 45, 66, 120, 300, 88.4])); t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); },
        () => { const s = document.getElementById('nw-tunit'); if (s && !s.hidden) setSel(s, pick(['e', 'dq'])); },
        () => document.querySelector('.nf-modal .nf-more').click(),
        () => { const s = document.getElementById('nf-lyr'); if (s) setSel(s, String(rnd(5))); },
        () => { const s = document.getElementById('nf-tuning'); if (s) setSel(s, pick([...s.options]).value); },
        () => { const s = document.getElementById('nf-capo'); if (s) setSel(s, String(rnd(8))); },
        () => { const s = document.getElementById('nf-nmea'); if (s) { s.value = String(1 + rnd(40)); s.dispatchEvent(new Event('change', { bubbles: true })); } },
        () => { const s = document.getElementById('nf-inst'); if (s) setSel(s, pick([...s.options].filter(o => o.value)).value); },
        () => { const u = document.getElementById('nf-undo'); if (u) u.click(); },
        () => { const t = document.getElementById('nw-title'); t.value = pick(['', '送别', '小星星']); t.dispatchEvent(new Event('input', { bubbles: true })); },
        () => key(pick(['ArrowDown', 'ArrowUp', 'Home', 'End'])),
      ];
      window.__run = (nOps) => { for (let i = 0; i < nOps; i++) pick(window.__ops)(); };
      window.__rnd = rnd;
    });
    let leaks = 0, ex = null, made = 0, madeBad = [];
    for (let i = 0; i < 500; i++) {
      const doCreate = i % 25 === 7;
      const r = await pg.evaluate((doCreate) => {
        try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
        showNewWizard(); window.__run(1 + window.__rnd(12));
        const want = window.__visPlan(), got = NWP.planOf(NWP.state);
        const same = JSON.stringify(want) === JSON.stringify(got);
        let made = null;
        if (doCreate) {
          const sig = s => JSON.stringify({ k: NWB.stackOf(s), t: s.tabVoices, v: s.voxVoices, n: s.voxNotations || null, d: s.voxDual || null, g: s.voxGroups || null, ly: s.lyricLines, m: s.measures.length,
            key: s.key, mode: s.mode || '', b: s.beats, u: s.unit, tp: s.tempo, tu: s.tempoUnit || '', capo: s.capo, tun: s.tuning || null, inst: s.inst, ik: s.instKey || '', ti: s.title });
          const o = Object.assign({}, want.o); if (o.tuningKey) o.tuning = TUNINGS[o.tuningKey].t.slice(); delete o.tuningKey; delete o.pen;
          const exp = sig(NWB.build(want.stack, o));
          NWP.create(); made = { ok: sig(song) === exp, got: sig(song), exp };
          if (docs.length > 2) closeDocAt(curDocI);
        } else closeModal();
        return { same, want: same ? null : want, got: same ? null : got, made };
      }, doCreate);
      if (!r.same) { leaks++; if (!ex) ex = { want: r.want, got: r.got }; }
      if (r.made) { made++; if (!r.made.ok) madeBad.push(r.made); }
    }
    T(leaks === 0 && made === 20 && madeBad.length === 0, 'T3 500 串随机面板操作：最终计划＝按可见选择从零重建的计划（泄漏 0）；20 串真建谱产物＝重建计划建谱',
      JSON.stringify({ leaks, ex, made, madeBad: madeBad.slice(0, 2) }));
    await pg._ctx.close();
  });

  /* ---------- T4 点击数 ---------- */
  await guard('T4 点击数', async () => {
    const pg = await open(1280, 800);
    await pg.click('#spd-cards [data-sp="new"]'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('#nw-cancel');   // 启动台→面板→关（不计）
    let clicks = 0; const C = async sel => { await pg.click(sel); clicks++; };
    const res = [];
    const run = async (name, seq, want, extra) => {
      await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
      const d0 = await pg.evaluate(() => docs.length); clicks = 0;
      for (const s of seq) { if (s.startsWith('key:')) { await pg.keyboard.press(s.slice(4)); clicks++; } else await C(s); await pg.waitForTimeout(40); }
      await pg.waitForTimeout(120);
      const g = await pg.evaluate(() => ({ k: NWB.stackOf(song), name: docTypeLabel(song), m: song.beats + '/' + song.unit, tp: song.tempo, docs: docs.length }));
      res.push({ name, clicks, want: want[1], k: g.k, docs: g.docs - d0, ok: g.k === want[0] && clicks === want[1] && g.docs === d0 + 1 && (!extra || extra(g)) });
    };
    await run('吉他弹唱谱', ['#b-new', '#nw-create'], ['JT', 2]);
    await run('钢琴即兴伴奏（旋律＋伴奏）', ['#b-new', '[data-scene="pacc"]', '#nw-create'], ['JG', 3]);
    await run('儿歌弹唱 2/4', ['#b-new', '[data-scene="kids"]', '#nw-create'], ['JG', 3], g => g.m === '2/4' && g.tp === 104);
    await run('教学对照谱', ['#b-new', '[data-scene="teach"]', '#nw-create'], ['SJ', 3]);
    await run('视唱谱例', ['#b-new', '[data-scene="sight"]', '#nw-create'], ['S', 3]);
    await run('钢琴独奏谱', ['#b-new', '[data-scene="inst"]', '#nw-create'], ['G', 3]);
    await run('和弦谱', ['#b-new', '[data-scene="chord"]', '#nw-create'], ['C', 3]);
    await run('钢琴即兴伴奏（新建 ▾）', ['#b-newdd', '.nf-qm [data-q="pacc"]'], ['JG', 2], g => g.tp === 72);
    /* 按上次：先建一份儿歌弹唱（记住），再一键 */
    await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await pg.click('#b-new'); await pg.click('[data-scene="kids"]'); await pg.selectOption('#nw-key', 'G'); await pg.click('#nw-create'); await pg.waitForTimeout(100);
    { const d0 = await pg.evaluate(() => docs.length); await pg.keyboard.press('Alt+Shift+KeyN'); await pg.waitForTimeout(150);
      const g = await pg.evaluate(() => ({ k: NWB.stackOf(song), key: song.key, m: song.beats + '/' + song.unit, tp: song.tempo, docs: docs.length }));
      res.push({ name: '按上次（Alt+Shift+N）', clicks: 1, k: g.k, ok: g.k === 'JG' && g.key === 'G' && g.m === '2/4' && g.tp === 104 && g.docs === d0 + 1 }); }
    await pg._ctx.close();
    /* 启动台「按上次」：首访＝马上开始（吉他弹唱），一点直接建 */
    const p2 = await open(1280, 800);
    const t0 = await p2.evaluate(() => document.getElementById('spd-last-t').textContent);
    await p2.click('#spd-cards [data-sp="last"]'); await p2.waitForTimeout(200);
    const g2 = await p2.evaluate(() => ({ k: NWB.stackOf(song), pad: startPadOn(), docs: docs.length }));
    res.push({ name: '启动台「按上次」', clicks: 1, k: g2.k, ok: t0 === '马上开始' && g2.k === 'JT' && !g2.pad && g2.docs === 2 });
    await p2._ctx.close();
    T(res.every(x => x.ok), 'T4 点击数：吉他弹唱 2 / 钢琴即兴伴奏 3 / 儿歌 2/4 3 / 教学对照 3 / 视唱 3 / 钢琴独奏 3 / 和弦谱 3 / 新建▾ 2 / 按上次 1 / 启动台按上次 1',
      res.map(x => x.name + '=' + x.clicks + (x.ok ? '' : '✗' + JSON.stringify(x))).join(' · '));
  });

  /* ---------- T5 键盘 ---------- */
  await guard('T5 键盘', async () => {
    const pg = await open(1280, 800);
    const r = {};
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForTimeout(150);   // 启动台态
    r.padOpen = await panelOpen(pg); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
    r.escClosed = !(await panelOpen(pg)) && await pg.evaluate(() => startPadOn());
    await pg.evaluate(() => { hideStartPad(); loadSong(PRESETS[0].make()); render(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForTimeout(150);
    r.focus = await pg.evaluate(() => { const a = document.activeElement; return a && a.dataset ? a.dataset.scene : null; });
    const roving = () => pg.evaluate(() => { const o = [...document.querySelectorAll('.nf-modal [role=option]')]; return { n0: o.filter(x => x.tabIndex === 0).length, sel: (o.find(x => x.tabIndex === 0) || {}).dataset.scene, foc: (document.activeElement.dataset || {}).scene }; });
    await pg.keyboard.press('ArrowDown'); r.down = await roving();
    await pg.keyboard.press('End'); r.end = await roving();
    await pg.keyboard.press('Home'); r.home = await roving();
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown');   // 儿歌弹唱
    await pg.keyboard.press('2');   // 儿歌弹唱（简谱＋大谱表）点亮五线谱 → 五线＋简谱＋大谱表（教学对照含伴奏，切到自选记谱法）
    r.after2 = await pg.evaluate(() => ({ k: NWP.stackOfState(NWP.state), sc: NWP.state.scene }));
    await pg.keyboard.press('2'); r.back2 = await pg.evaluate(() => NWP.stackOfState(NWP.state));
    const d0 = await pg.evaluate(() => docs.length);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    r.enter = await pg.evaluate(() => ({ k: NWB.stackOf(song), open: !!document.querySelector('.nf-modal'), docs: docs.length }));
    r.enterDocs = r.enter.docs === d0 + 1;
    /* 双击用途直接建 */
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.dblclick('[data-scene="teach"]'); await pg.waitForTimeout(150);
    r.dbl = await pg.evaluate(() => ({ k: NWB.stackOf(song), open: !!document.querySelector('.nf-modal'), docs: docs.length }));
    /* Ctrl+K 仍是和弦快速输入（不开面板） */
    await pg.evaluate(() => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await pg.keyboard.press('Control+KeyK'); await pg.waitForTimeout(120);
    r.ctrlK = { panel: await panelOpen(pg), pop: await pg.evaluate(() => !!document.getElementById('popmenu') || !!document.querySelector('.modal')) };
    await pg.keyboard.press('Escape'); await pg.evaluate(() => { try { closePop(); closeModal(); } catch (_) {} });
    /* 「新建 ▾」菜单键盘可达：打开后焦点在「按上次」，↓ 到第一个用途，Enter 建 */
    await pg.click('#b-newdd'); await pg.waitForTimeout(80);
    r.qmFocus = await pg.evaluate(() => (document.activeElement.dataset || {}).q);
    await pg.keyboard.press('ArrowDown'); r.qmDown = await pg.evaluate(() => (document.activeElement.dataset || {}).q);
    const d1 = await pg.evaluate(() => docs.length);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    r.qmEnter = await pg.evaluate(() => ({ k: NWB.stackOf(song), menu: !!document.querySelector('.nf-qm'), docs: docs.length }));
    r.qmDocs = r.qmEnter.docs === d1 + 1;
    await pg.click('#b-newdd'); await pg.keyboard.press('Escape'); r.qmEsc = await pg.evaluate(() => ({ menu: !!document.querySelector('.nf-qm'), foc: document.activeElement.id }));
    await pg._ctx.close();
    T(r.padOpen && r.escClosed && r.focus === 'gtr' && r.down.n0 === 1 && r.down.sel === 'pacc' && r.down.foc === 'pacc' && r.end.sel === 'custom' && r.home.sel === 'gtr'
      && r.after2.k === 'SJG' && r.after2.sc === 'custom' && r.back2 === 'JG' && r.enter.k === 'JG' && !r.enter.open && r.enterDocs && r.dbl.k === 'SJ' && !r.dbl.open
      && !r.ctrlK.panel && r.ctrlK.pop && r.qmFocus === 'last' && r.qmDown === 'gtr' && r.qmEnter.k === 'JT' && !r.qmEnter.menu && r.qmDocs && !r.qmEsc.menu && r.qmEsc.foc === 'b-newdd',
      'T5 键盘：Alt+N（编辑器 / 启动台）、焦点落已选用途、↑↓/Home/End＋roving tabindex、1–5 开关谱、Enter 建、Esc 关、双击建、Ctrl+K 仍是和弦、新建▾ 键盘可达', JSON.stringify(r));
  });

  /* ---------- T6 冲突预告与撤销 ---------- */
  await guard('T6 冲突预告与撤销', async () => {
    const pg = await open(1280, 800);
    await openPanel(pg);
    await pg.hover('[data-row="G"]'); await pg.waitForTimeout(60);
    const hint = await pg.evaluate(() => document.querySelector('.nf-rowhint').textContent);
    await pg.click('[data-row="G"]'); await pg.waitForTimeout(60);
    const note = await pg.evaluate(() => ({ t: (document.querySelector('.nf-note') || {}).textContent || '', undo: !!document.getElementById('nf-undo'), sc: NWP.state.scene, kind: document.getElementById('nf-kind').textContent }));
    await pg.click('#nf-undo'); await pg.waitForTimeout(60);
    const und = await pg.evaluate(() => ({ sc: NWP.state.scene, k: NWP.stackOfState(NWP.state), kind: document.getElementById('nf-kind').textContent, note: !!document.querySelector('.nf-note'),
      pressed: [...document.querySelectorAll('.nf-row[aria-pressed="true"]')].map(x => x.dataset.row).join('') }));
    await pg.focus('[data-row="S"]'); await pg.waitForTimeout(40);
    const fhint = await pg.evaluate(() => document.querySelector('.nf-rowhint').textContent);
    await pg.click('[data-row="G"]'); await pg.waitForTimeout(6400);
    const auto = await pg.evaluate(() => ({ note: !!document.querySelector('.nf-note'), k: NWP.stackOfState(NWP.state) }));
    await pg._ctx.close();
    T(/点亮「钢琴大谱表」→ 钢琴伴奏歌谱/.test(hint) && /将换下「六线谱」/.test(hint) && /已换下「六线谱」/.test(note.t) && /两种乐器/.test(note.t) && note.undo
      && note.sc === 'custom' && note.kind === '钢琴伴奏歌谱' && und.sc === 'gtr' && und.k === 'JT' && und.kind === '吉他弹唱谱' && !und.note && und.pressed === 'JT'
      && /点亮「五线谱」→/.test(fhint) && !auto.note && auto.k === 'JG',
      'T6 冲突不静默：悬停 / 聚焦预告结果、点下说明原因＋撤销、撤销回原状、6 秒后提示自动收起', JSON.stringify({ hint, note, und, fhint, auto }));
  });

  /* ---------- T7 命中区 ≥44 / T8 对比度 ≥4.5 ---------- */
  const PROBE = `(()=>{
    const vis=e=>{ const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && cs.display!=='none'; };
    const roots=[...document.querySelectorAll('.nf-modal,.nf-qm')];
    const small=[];
    roots.forEach(R=>R.querySelectorAll('button,[role=option],[role=radio],[role=menuitem],select,input:not([type=file]),[role=tab]').forEach(e=>{ if(!vis(e)) return;
      const r=e.getBoundingClientRect(); if(r.width<43.5 || r.height<43.5) small.push((e.id||e.dataset.scene||e.dataset.row||e.dataset.v||e.dataset.q||e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height)); }));
    const P=s=>{ const m=String(s).match(/[\\d.]+/g)||[0,0,0,0]; return [+m[0],+m[1],+m[2],m[3]==null?1:+m[3]]; };
    const lin=c=>{ c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
    const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
    const over=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]), f[1]*f[3]+b[1]*(1-f[3]), f[2]*f[3]+b[2]*(1-f[3]), 1];
    const bgOf=e=>{ const chain=[]; for(let x=e;x;x=x.parentElement){ chain.push(P(getComputedStyle(x).backgroundColor)); }
      let c=[255,255,255,1]; const root=P(getComputedStyle(document.body).backgroundColor); if(root[3]>0) c=root;
      for(let i=chain.length-1;i>=0;i--){ if(chain[i][3]>0) c=over(chain[i], c); } return c; };
    let min=99, at='', n=0;
    roots.forEach(R=>{ const w=document.createTreeWalker(R, NodeFilter.SHOW_TEXT); let t;
      while((t=w.nextNode())){ if(!t.data.trim()) continue; const e=t.parentElement; if(!vis(e) || e.closest('option,select')) continue;
        const cs=getComputedStyle(e); const fg=P(cs.color); const bg=bgOf(e); const f2=fg[3]<1? over(fg,bg) : fg;
        const a=L(f2), b2=L(bg); const cr=(Math.max(a,b2)+0.05)/(Math.min(a,b2)+0.05); n++;
        if(cr<min){ min=cr; at=t.data.trim().slice(0,12)+' @'+(e.className||e.tagName); } } });
    return { small, min:+min.toFixed(2), at, n };
  })()`;
  await guard('T7 命中区 T8 对比度', async () => {
    const out = {}; let small = [], minC = 99, minAt = '';
    for (const theme of ['light', 'dark']) {
      const pg = await open(1280, 800);
      await pg.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      await openPanel(pg);
      for (const sc of ['gtr', 'pacc', 'vocal', 'teach', 'sight', 'inst', 'chord', 'blank']) {
        await pg.click('[data-scene="' + sc + '"]');
        if (sc === 'inst') await pg.click('.nf-more');
        const r = await pg.evaluate(PROBE); small = small.concat(r.small.map(x => theme + '/' + sc + ':' + x)); if (r.min < minC) { minC = r.min; minAt = theme + '/' + sc + ' ' + r.at; }
      }
      await pg.click('[data-row="G"]'); { const r = await pg.evaluate(PROBE); small = small.concat(r.small.map(x => theme + '/conflict:' + x)); if (r.min < minC) { minC = r.min; minAt = theme + '/conflict ' + r.at; } }
      await pg.click('.nf-tabs [data-v="import"]'); { const r = await pg.evaluate(PROBE); small = small.concat(r.small.map(x => theme + '/import:' + x)); if (r.min < minC) { minC = r.min; minAt = theme + '/import ' + r.at; } }
      await pg.click('#nw-cancel');
      await pg.click('#b-newdd'); { const r = await pg.evaluate(PROBE); small = small.concat(r.small.map(x => theme + '/menu:' + x)); if (r.min < minC) { minC = r.min; minAt = theme + '/menu ' + r.at; } out[theme] = r.n; }
      await pg._ctx.close();
    }
    T(small.length === 0, 'T7 命中区 ≥44px：面板（8 个用途 / 冲突提示 / 更多设置 / 从已有音乐）与「新建 ▾」菜单可点控件宽高全部 ≥44（浅 / 深）', small.join(', ') || 'none <44');
    T(minC >= 4.5, 'T8 对比度 ≥4.5:1：面板与菜单全部可见文字，浅色 / 深色实测最低 ' + minC, minAt + ' · 文本节点 ' + JSON.stringify(out));
  });

  /* ---------- T9 紧凑档 / T10 深色 ---------- */
  await guard('T9 紧凑档', async () => {
    const res = {};
    for (const [w, h] of [[1280, 720], [1024, 700], [1366, 768]]) {
      const pg = await open(w, h);
      await openPanel(pg);
      res[w + 'x' + h] = await pg.evaluate(() => {
        const m = document.querySelector('.nf-modal').getBoundingClientRect(), L = document.querySelector('.nf-left'), M = document.querySelector('.nf-mid').getBoundingClientRect(),
          R = document.querySelector('.nf-right').getBoundingClientRect(), go = document.getElementById('nw-create').getBoundingClientRect(), body = document.querySelector('.nf-body');
        const opts = [...document.querySelectorAll('.nf-modal [role=option]')].map(o => o.getBoundingClientRect()), lr = L.getBoundingClientRect();
        return { inView: m.left >= 0 && m.top >= 0 && m.right <= innerWidth && m.bottom <= innerHeight, desc: getComputedStyle(document.querySelector('.nf-desc')).display,
          listAll: opts.every(o => o.top >= lr.top - 1 && o.bottom <= lr.bottom + 1), goIn: go.bottom <= innerHeight && go.right <= innerWidth,
          rightBelow: R.top >= M.bottom - 1, side: R.left >= M.right - 1, hOver: body.scrollWidth - body.clientWidth, docOver: document.documentElement.scrollWidth - innerWidth };
      });
      await pg._ctx.close();
    }
    const a = res['1280x720'], c = res['1024x700'], d = res['1366x768'];
    T(a.inView && a.desc === 'none' && a.listAll && a.goIn && a.side && c.inView && c.rightBelow && c.hOver <= 0 && c.docOver <= 0 && c.goIn && c.listAll && d.inView && d.side && d.listAll && d.goIn,
      'T9 紧凑档：1280×720 面板在视口内、11 个用途不滚动全可见、去说明行；1024×700 右栏收到预览下方、无横向溢出；1366×768 三栏并排', JSON.stringify(res));
  });
  await guard('T10 深色', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await openPanel(pg);
    const r = await pg.evaluate(() => { const P = s => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number); const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
      const m = document.querySelector('.nf-modal'); return { bg: lum(P(getComputedStyle(m).backgroundColor)), fg: lum(P(getComputedStyle(document.getElementById('nf-kind')).color)),
        paper: getComputedStyle(document.querySelector('.nf-paper')).backgroundColor, panel: getComputedStyle(document.body).getPropertyValue('--panel').trim() }; });
    await pg._ctx.close();
    T(r.bg < 0.15 && r.fg > 0.75 && r.paper === 'rgb(255, 255, 255)' && r.panel === '#1b1b28', 'T10 深色：面板底读 --panel（深）、字浅、谱行示意纸面恒白', JSON.stringify(r));
  });

  /* ---------- T11 本机键 musetab-nw-last ---------- */
  await guard('T11 musetab-nw-last', async () => {
    const pg = await open(1280, 800);
    const keys0 = await pg.evaluate(() => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort());
    await openPanel(pg); await pg.click('[data-scene="kids"]'); await pg.selectOption('#nw-key', 'G'); await pg.fill('#nw-title', '秘密曲名');
    await pg.click('[data-act="mel"][data-v="S"]'); await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('musetab-nw-last')));
    await openPanel(pg, true);
    const re = await pg.evaluate(() => ({ sc: NWP.state.scene, key: document.getElementById('nw-key').value, k: NWP.stackOfState(NWP.state), basis: document.getElementById('nf-basis').textContent, title: document.getElementById('nw-title').value }));
    await pg.evaluate(() => closeModal());
    await pg.evaluate(() => localStorage.setItem('musetab-nw-last', '{bad json'));
    await openPanel(pg, true); const bad = await pg.evaluate(() => NWP.state.scene); await pg.evaluate(() => closeModal());
    /* 读写都抛错：回默认、照常建谱 */
    const thr = await pg.evaluate(() => {
      const gi = Storage.prototype.getItem, si = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { if (k === 'musetab-nw-last') throw new Error('blocked'); return gi.apply(this, arguments); };
      Storage.prototype.setItem = function (k) { if (k === 'musetab-nw-last') throw new Error('blocked'); return si.apply(this, arguments); };
      let out;
      try { const d0 = docs.length; showNewWizard(); const sc = NWP.state.scene; document.getElementById('nw-create').click(); out = { sc, made: docs.length === d0 + 1, k: NWB.stackOf(song) }; }
      catch (e) { out = { err: e.message }; }
      Storage.prototype.getItem = gi; Storage.prototype.setItem = si; return out;
    });
    const keys1 = await pg.evaluate(() => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort());
    const added = keys1.filter(k => !keys0.includes(k));
    await pg._ctx.close();
    T(saved && saved.scene === 'kids' && saved.stack === 'SG' && saved.v.key === 'G' && saved.v.title === '' && saved.mel === 'S' && Array.isArray(saved.rows)
      && re.sc === 'kids' && re.key === 'G' && re.k === 'SG' && /沿用上次/.test(re.basis) && re.title === '' && bad === 'gtr'
      && thr.sc === 'gtr' && thr.made && thr.k === 'JT' && added.join() === 'musetab-nw-last',
      'T11 musetab-nw-last：记住用途 / 谱行 / 参数（不记曲名）、重开沿用（依据「沿用上次」）、坏值与读写抛错回默认吉他弹唱且照常建谱、只新增这一个键',
      JSON.stringify({ saved, re, bad, thr, added }));
  });

  /* ---------- T12 启动台 ---------- */
  await guard('T12 启动台', async () => {
    const pg = await open(1280, 800);
    const s0 = await pg.evaluate(() => { const v = e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      return { cards: [...document.querySelectorAll('#spd-cards [data-sp]')].filter(v).map(e => e.dataset.sp).join(','), cont: (document.getElementById('spd-cont') || {}).textContent || '',
        contVis: v(document.getElementById('spd-cont')), last: document.getElementById('spd-last-t').textContent, tags: [...document.querySelectorAll('#spd-cards .spd-chips .nf-tag')].map(x => x.textContent).join(','),
        icons: document.querySelectorAll('#spd-cards svg.pqi').length }; });
    await pg.click('#spd-cards [data-sp="sc:teach"]'); await pg.waitForSelector('.nf-modal [data-scene]');
    const chip = await pg.evaluate(() => NWP.state.scene);
    await pg.fill('#nw-title', '课堂练习'); await pg.click('#nw-create'); await pg.waitForTimeout(150);
    await pg.evaluate(() => { song.measures[0].voxes[0][0].deg = 1; persistNow(); });
    await pg.reload(); await pg.waitForTimeout(900);
    const s1 = await pg.evaluate(() => ({ cont: document.getElementById('spd-cont').textContent, last: document.getElementById('spd-last-t').textContent, lastD: document.getElementById('spd-last-d').textContent }));
    await pg.click('#spd-cont'); await pg.waitForTimeout(200);
    const s2 = await pg.evaluate(() => ({ pad: startPadOn(), title: song.title }));
    await pg._ctx.close();
    /* 空白未命名谱不算「上次编辑」 */
    const p3 = await open(1280, 800);
    await p3.click('#spd-cards [data-sp="last"]'); await p3.waitForTimeout(150);
    await p3.reload(); await p3.waitForTimeout(900);
    const s3 = await p3.evaluate(() => document.getElementById('spd-cont').textContent);
    await p3._ctx.close();
    const p4 = await open(1024, 700);
    const s4 = await p4.evaluate(() => [...document.querySelectorAll('#spd-cards [data-sp]')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0)
      .map(e => ({ sp: e.dataset.sp, over: e.scrollWidth - e.clientWidth, overH: e.scrollHeight - e.clientHeight })).filter(x => x.over > 1 || x.overH > 1));
    await p4._ctx.close();
    const p5 = await open(390, 844, { mob: true });
    const s5 = await p5.evaluate(() => [...document.querySelectorAll('#spd-cards [data-sp]')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map(e => e.dataset.sp).join(','));
    await p5._ctx.close();
    T(s0.cards === 'new,last,imp,sc:gtr,sc:pacc,sc:teach,sc:sight,sc:kids,open,mine' && !s0.cont && !s0.contVis && s0.last === '马上开始' && s0.tags === '考编,课堂,艺考,师范' && s0.icons >= 10
      && chip === 'teach' && /继续上次编辑：《课堂练习》/.test(s1.cont) && s1.last === '按上次' && /教学对照谱/.test(s1.lastD) && !s2.pad && s2.title === '课堂练习'
      && s3 === '' && s4.length === 0 && s5 === 'demo,pc,open,mine',
      'T12 启动台：三卡＋常用用途直达（标签/图标）；首访不显示「继续上次编辑」、空白谱也不算、有内容的自己的谱刷新后出现并接着编辑；按上次卡读本机键；1024×700 不溢出；手机仍只读引导',
      JSON.stringify({ s0, chip, s1, s2, s3, s4, s5 }));
  });

  /* ---------- T13 统一谱名 ---------- */
  await guard('T13 统一谱名', async () => {
    const pg = await open(1280, 800);
    const pre = await pg.evaluate(() => PRESETS.map(p => docTypeLabel(migrate(p.make()))));
    await openPanel(pg); await pg.click('[data-scene="kids"]'); await pg.fill('#nw-title', '小燕子');
    const pk = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
    await pg.click('#nw-create'); await pg.waitForTimeout(150);
    const r = await pg.evaluate(() => { const tab = document.querySelector('.dtab.on'); const ic = tab && tab.querySelector('svg.pqi');
      return { toast: document.getElementById('toast').textContent, toastIc: (document.querySelector('#toast svg.pqi') || { dataset: {} }).dataset.pq, tip: tab && tab.title, ic: ic && ic.dataset.pq, icW: ic && +ic.getAttribute('width'),
        label: docTypeLabel(song), kind: NWB.kindOfSong(song).name }; });
    await pg._ctx.close();
    T(JSON.stringify(pre) === JSON.stringify(PRESET_KIND) && pk === '钢琴伴奏歌谱' && r.label === pk && r.kind === pk && /已新建钢琴伴奏歌谱/.test(r.toast) && r.toastIc === 'type-jg'
      && /小燕子 · 钢琴伴奏歌谱/.test(r.tip) && r.ic === 'type16-jg' && r.icW === 16,
      'T13 统一谱名：16 份预设谱名＝方案表；面板＝docTypeLabel＝页签提示＝建成提示，页签图标 16px 微缩母版', JSON.stringify({ pre, pk, r }));
  });

  /* ---------- T14 离屏不变量 ---------- */
  await guard('T14 离屏不变量', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); loadSong(PRESETS[0].make()); render(); mutate(() => { song.title = song.title + '·'; }); persistNow(); });
    const snap = () => pg.evaluate(() => ({ s: localStorage.getItem('musetab-song-v1'), d: localStorage.getItem('musetab-docs-v1'), u: undoStack.length, r: redoStack.length,
      sel: JSON.stringify(sel), docs: docs.length, paper: (() => { const p = document.getElementById('paper'); return p.clientWidth + 'x' + p.clientHeight + '|' + (p.getAttribute('style') || ''); })(),
      svg: document.getElementById('score').getAttribute('viewBox') }));
    const a = await snap();
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForSelector('.nf-modal [data-scene]');
    for (let i = 0; i < 50; i++) {
      if (i % 2) await pg.click('[data-scene="' + ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank'][i % 10] + '"]');
      else await pg.click('[data-row="' + 'JSTGC'[i % 5] + '"]');
    }
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(450);
    const b2 = await snap();
    await pg._ctx.close();
    const same = Object.keys(a).filter(k => a[k] !== b2[k]);
    T(same.length === 0 && a.u >= 1, 'T14 离屏不变量：开面板交替切用途与谱 50 次后关闭——本机存储字节、撤销 / 重做、选区、窗口数、#paper 与谱面全部不变', same.length ? 'diff:' + same.join(',') : 'all same');
  });


  /* ================= 收尾验收回归（对抗式验收逐条：修前红、修后绿） ================= */
  const XML = (title, parts) => '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>' + title + '</work-title></work><part-list>'
    + parts.map((p, i) => '<score-part id="P' + (i + 1) + '"><part-name>' + p.name + '</part-name></score-part>').join('') + '</part-list>'
    + parts.map((p, i) => '<part id="P' + (i + 1) + '">' + [0, 1].map(mi => '<measure number="' + (mi + 1) + '">'
      + (mi ? '' : '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>'
        + (p.staves ? '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>' : '<clef><sign>' + p.clef + '</sign><line>' + (p.clef === 'F' ? 4 : 2) + '</line></clef>') + '</attributes>')
      + (p.staves ? [1, 2].map(stf => (stf === 2 ? '<backup><duration>4</duration></backup>' : '') + '<note><pitch><step>C</step><octave>' + (stf === 1 ? 4 : 3) + '</octave></pitch><duration>4</duration><type>whole</type><staff>' + stf + '</staff></note>').join('')
        : [0, 1, 2, 3].map(() => '<note><pitch><step>' + (p.clef === 'F' ? 'C' : 'E') + '</step><octave>' + (p.clef === 'F' ? 3 : 4) + '</octave></pitch><duration>1</duration><type>quarter</type>'
          + (p.ly ? '<lyric><syllabic>single</syllabic><text>啊</text></lyric>' : '') + '</note>').join(''))
      + '</measure>').join('') + '</part>').join('') + '</score-partwise>';

  /* ---------- T15 窄屏 / 平板 / 手机：只拦真手机；导入不受新建拍板影响 ---------- */
  await guard('T15 窄屏与手机', async () => {
    const r = {};
    const pg = await open(800, 900);   // 电脑浏览器半屏窗口（非触屏）
    await pg.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} showMobileMenu(); });
    await pg.click('[data-mm="b-new"]'); await pg.waitForTimeout(120);
    r.d = { panel: await panelOpen(pg), mpc: await pg.evaluate(() => !!document.getElementById('nw-pc')) };
    { const d0 = await pg.evaluate(() => docs.length); await pg.click('#nw-create'); await pg.waitForTimeout(120); r.d.made = await pg.evaluate(d0 => docs.length === d0 + 1, d0); }
    { const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), pg.evaluate(() => document.getElementById('rt-mxl').click())]);
      r.d.mxl = !!fc && await pg.evaluate(() => !!document.querySelector('.nf-modal #nw-import')); }
    await pg._ctx.close();
    const tb = await open(768, 1024, { touch: true });   // 平板竖屏（触屏，短边 768）
    await tb.evaluate(() => { hideStartPad(); showNewWizard(); }); await tb.waitForTimeout(120);
    r.tab = { panel: await panelOpen(tb) };
    { const d0 = await tb.evaluate(() => docs.length); await tb.click('#nw-create'); await tb.waitForTimeout(120); r.tab.made = await tb.evaluate(d0 => docs.length === d0 + 1, d0); }
    await tb._ctx.close();
    const ph = await open(390, 844, { mob: true });   // 手机
    await ph.evaluate(() => showNewWizard()); await ph.waitForTimeout(120);
    r.ph = await ph.evaluate(() => ({ pc: !!document.getElementById('nw-pc'), imp: !!document.getElementById('nw-mimp'), panel: !!document.querySelector('[data-scene]') }));
    await ph.click('#nw-mimp'); await ph.waitForTimeout(120);
    r.ph.imp2 = await ph.evaluate(() => ({ cards: document.querySelectorAll('.nf-modal .nf-impc .nwi').length, newTab: !!document.querySelector('.nf-modal [data-act="tab"][data-v="new"],.nf-modal [data-scene]'),
      over: document.documentElement.scrollWidth - innerWidth, mOver: (m => m.scrollWidth - m.clientWidth)(document.querySelector('.nf-modal')) }));
    { const [fc] = await Promise.all([ph.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), ph.click('#nw-import')]); r.ph.chooser = !!fc; }
    await ph.evaluate(() => { closeModal(); showNewWizard({ tab: 'import' }); }); r.ph.direct = await ph.evaluate(() => !!document.querySelector('.nf-modal #nw-import') && !document.querySelector('[data-scene]'));
    await ph._ctx.close();
    T(r.d.panel && !r.d.mpc && r.d.made && r.d.mxl && r.tab.panel && r.tab.made && r.ph.pc && r.ph.imp && !r.ph.panel && r.ph.imp2.cards === 3 && !r.ph.imp2.newTab
      && r.ph.imp2.over <= 0 && r.ph.imp2.mOver <= 1 && r.ph.chooser && r.ph.direct,
      'T15 只拦真手机：电脑窄窗 800（☰ 新建出完整面板、能建、右栏导入 MusicXML 弹出选文件）、平板竖屏 768 照常新建；手机仍是「发到电脑继续」，但可「导入已有的谱」（只有从已有音乐、能选文件、不溢出）', JSON.stringify(r));
  });

  /* ---------- T16 钢琴伴奏歌谱：一键配伴奏 / 伴奏织体直接填进本谱两行（不另开窗口、不覆盖旋律） ---------- */
  await guard('T16 钢琴伴奏歌谱配伴奏落地', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await pg.click('#b-newdd'); await pg.click('.nf-qm [data-q="pacc"]'); await pg.waitForTimeout(150);
    const guide = await pg.evaluate(() => document.getElementById('toast').textContent);
    const mel = () => pg.evaluate(() => [0, 1].map(mi => song.measures[mi].voxes[0].map(c => c.deg).join('')).join('|'));
    const rowsOf = () => pg.evaluate(() => song.measures.map(m => [1, 2].map(vi => (m.voxes[vi] || []).some(c => c.deg) ? 1 : 0).join('')).join(','));
    await pg.evaluate(() => { const set = (mi, d) => { song.measures[mi].voxes[0] = d.map(x => ({ dur: 4, dotted: false, deg: x, acc: '', oct: 0, lyrics: [], tie: false })); };
      mutate(() => { set(0, [1, 1, 5, 5]); set(1, [6, 6, 5, 0]); }); setRTab('make'); });
    const d0 = await pg.evaluate(() => docs.length), m0 = await mel(), u0 = await pg.evaluate(() => undoStack.length);
    await pg.click('#rt-arr'); await pg.waitForTimeout(100);
    /* v67.4 合并：一键配伴奏走智能配谱弹窗「填进当前谱」（钢琴伴奏歌谱默认选中；tv_fillacc 另测细节） */
    const modal = await pg.evaluate(() => ({ fill: (document.getElementById('arr-out') || {}).value === 'fill', h: (document.querySelector('.modal h3') || {}).textContent || '' }));
    await pg.click('#arr-go'); await pg.waitForTimeout(150);
    const a = { docs: await pg.evaluate(() => docs.length) - d0, mel: await mel(), rows: await rowsOf(), chords: await pg.evaluate(() => song.measures[0].voxes[0].filter(c => c.chord).length),
      toast: await pg.evaluate(() => document.getElementById('toast').textContent), k: await pg.evaluate(() => NWB.stackOf(song)) };
    await pg.keyboard.press('Control+KeyZ'); await pg.waitForTimeout(100);
    a.undo = { rows: await rowsOf(), chords: await pg.evaluate(() => song.measures[0].voxes[0].filter(c => c.chord).length), u: await pg.evaluate(() => undoStack.length) - u0 };
    /* 节奏型库 → 伴奏织体：光标在右手伴奏行（验收：此前把旋律行改写成右手音型） */
    await pg.evaluate(() => { mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; song.measures[1].voxes[0][0].chord = 'F'; }); sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; render(); });
    await pg.click('#eb-lib', { timeout: 1500 }).catch(() => pg.evaluate(() => openRhyLib())); await pg.waitForTimeout(100);
    const libModal = await pg.evaluate(() => !!document.getElementById('tex-go'));
    await pg.click('#tex-go'); await pg.waitForTimeout(150);
    const b2 = { mel: await mel(), rows: await rowsOf(), docs: await pg.evaluate(() => docs.length) - d0 };
    await pg._ctx.close();
    T(/一键配伴奏/.test(guide) && /直接填进/.test(guide) && modal.fill && a.docs === 0 && a.mel === m0 && m0 === '1155|6650' && /^11,11,00/.test(a.rows) && a.chords >= 1 && a.k === 'JG' && /填进/.test(a.toast)
      && /^00,00/.test(a.undo.rows) && a.undo.chords === 0 && libModal && b2.mel === m0 && /^11,11,00/.test(b2.rows) && b2.docs === 0,
      'T16 钢琴伴奏歌谱：建成提示指向一键配伴奏；一键配伴奏＝伴奏织体填进本谱右手 / 左手两行（自动配和弦、不另开窗口、旋律不动、没写旋律的尾部不配、一步撤销）；节奏型库→伴奏织体同口径',
      JSON.stringify({ guide: guide.slice(-60), modal, a, b2, libModal }));
  });

  /* ---------- T17 变调夹 / 定弦不被悄悄带进新谱 ---------- */
  await guard('T17 变调夹定弦不泄漏', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await openPanel(pg); await pg.click('.nf-more'); await pg.selectOption('#nf-capo', '3'); await pg.selectOption('#nf-tuning', 'dropD');
    await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const first = await pg.evaluate(() => ({ capo: song.capo, tu: String(song.tuning || '') }));
    await openPanel(pg, true);
    const re = await pg.evaluate(() => ({ capo: NWP.state.v.capo, tu: NWP.state.v.tuning, basis: document.getElementById('nf-basis').textContent, more: document.querySelector('.nf-more').textContent }));
    await pg.click('[data-scene="pacc"]'); await pg.click('[data-scene="gtr"]');
    const sw = await pg.evaluate(() => ({ basis: document.getElementById('nf-basis').textContent, more: document.querySelector('.nf-more').textContent }));
    await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const second = await pg.evaluate(() => ({ capo: song.capo, tu: song.tuning ? String(song.tuning) : null }));
    /* 本次面板里亲手改的定弦：换用途再换回来仍保留，依据写「你改的」 */
    await openPanel(pg); await pg.click('.nf-more'); await pg.selectOption('#nf-tuning', 'dadgad'); await pg.click('[data-scene="solo"]'); await pg.click('[data-scene="gtr"]');
    const kept = await pg.evaluate(() => ({ tu: NWP.state.v.tuning, basis: document.getElementById('nf-basis').textContent }));
    await pg.keyboard.press('Escape');
    await pg.click('#b-newdd'); await pg.click('.nf-qm [data-q="gtr"]'); await pg.waitForTimeout(120);
    const qm = await pg.evaluate(() => ({ capo: song.capo, tu: song.tuning ? String(song.tuning) : null }));
    await pg._ctx.close();
    T(first.capo === 3 && first.tu === '64,59,55,50,45,38' && re.capo === 0 && re.tu === 'dropD' && /Drop D 定弦/.test(re.basis) && /沿用上次/.test(re.basis) && /Drop D/.test(re.more) && !/夹 3 品/.test(re.more)
      && !/Drop D/.test(sw.basis + sw.more) && /标准定弦/.test(sw.more) && second.capo === 0 && second.tu === null && kept.tu === 'dadgad' && /DADGAD 定弦/.test(kept.basis) && /你改的/.test(kept.basis)
      && qm.capo === 0 && qm.tu === null,
      'T17 变调夹不记进本机键；定弦沿用上次时依据与「更多设置」写明（Drop D · 沿用上次）；换用途回默认（＝新建▾ 同结果），只有本次亲手改的才保留（依据「你改的」）',
      JSON.stringify({ first, re, sw, second, kept, qm }));
  });

  /* ---------- T18 谱名：导入 SAB 三部合唱不是「钢琴伴奏歌谱」；人声＋钢琴、一键配伴奏产物仍是 ---------- */
  await guard('T18 SAB 谱名', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const imp = async (name, xml) => { await openPanel(pg); await pg.click('.nf-tabs [data-v="import"]');
      await pg.setInputFiles('#nw-mxlfile', { name, mimeType: 'application/xml', buffer: Buffer.from(xml) }); await pg.waitForTimeout(500);
      return pg.evaluate(() => ({ k: NWB.stackOf(song), label: docTypeLabel(song), tip: (document.querySelector('.dtab.on') || {}).title || '', vn: song.voxNotations, g: song.voxGroups || null })); };
    const sab = await imp('sab.musicxml', XML('SAB 合唱', [{ name: 'Soprano', clef: 'G', ly: 1 }, { name: 'Alto', clef: 'G', ly: 1 }, { name: 'Baritone', clef: 'F', ly: 1 }]));
    const vp = await imp('vp.musicxml', XML('人声钢琴', [{ name: 'Voice', clef: 'G', ly: 1 }, { name: 'Piano', staves: 2 }]));
    const arr = await pg.evaluate(() => { const s = migrate(JSON.parse(JSON.stringify(PRESETS[10].make()))); const o = song; song = s; const r = arrangeAccompaniment(s, { suggest: true }); song = o; return { k: NWB.stackOf(r.song), label: docTypeLabel(r.song) }; });
    const old = await pg.evaluate(() => { const s = createSong('vocal', { nVox: 3, lyr: 1 }); s.voxNotations = ['staff', 'staff', 'bass']; delete s.voxGroups; return { k: NWB.stackOf(s), label: docTypeLabel(s), acc: NWB.isAccStack ? NWB.isAccStack(s) : null }; });
    await pg._ctx.close();
    T(sab.k === 'S' && sab.label === '五线谱合唱谱' && /五线谱合唱谱/.test(sab.tip) && vp.k === 'SG' && vp.label === '钢琴伴奏歌谱（五线谱）' && arr.k === 'SJG' && arr.label === '教学对照谱（含伴奏）'
      && old.k === 'S' && old.label === '五线谱合唱谱' && old.acc === false,
      'T18 「旋律＋钢琴伴奏」要正面证据：导入 SAB（不写分组、低声部低音谱号）＝五线谱合唱谱；导入人声＋钢琴（花括号）＝钢琴伴奏歌谱（五线谱）；一键配伴奏产物＝教学对照谱（含伴奏）',
      JSON.stringify({ sab, vp, arr, old }));
  });

  /* ---------- T19 同一份谱一个名字 / 文案 ---------- */
  await guard('T19 谱名与文案', async () => {
    const pg = await open(1280, 800);
    const pad = await pg.evaluate(() => document.querySelector('#spd-cards [data-sp="imp"]').textContent);
    await pg.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await pg.click('#b-newdd'); await pg.click('.nf-qm [data-q="pacc"]'); await pg.waitForTimeout(150);
    const ri = await pg.evaluate(() => ({ ri: document.getElementById('ri-type').textContent, label: docTypeLabel(song), tip: document.querySelector('.dtab.on').title }));
    await openPanel(pg);
    const panelTxt = await pg.evaluate(() => { const m = document.querySelector('.nf-modal'); return m.textContent + ' ' + [...m.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + (e.getAttribute('title') || '')).join(' '); });
    const keys = await pg.evaluate(() => document.querySelector('.nf-keys').textContent);
    await pg.click('[data-act="var"][data-k="pen"][data-v="J"]'); await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const penJ = await pg.evaluate(() => document.getElementById('toast').textContent);
    await pg._ctx.close();
    T(ri.ri === ri.label + ' · 16 小节' && ri.label === '钢琴伴奏歌谱' && /钢琴伴奏歌谱/.test(ri.tip) && !/谱行|落笔行|谱样/.test(panelTxt) && /预览（示意）/.test(panelTxt)
      && !/显示 · 六线谱/.test(penJ) && /旋律音轨/.test(penJ) && /新加的一条/.test(penJ) && /Alt\+Shift\+N/.test(keys) && /AI 转谱结果/.test(pad),
      'T19 右栏「谱类 · 篇幅」＝页签＝docTypeLabel；面板不出现自造词「谱行」；「先写旋律」提示写真实位置并说清会新加一条轨；底栏键位与启动台文案按方案',
      JSON.stringify({ ri, keys, penJ: penJ.slice(-80), pad }));
  });

  /* ---------- T20 撤销只退谱 / 鼠标点过后回车照样建 / 输入法回车不建 / 面板内 Ctrl+Z ---------- */
  await guard('T20 撤销与回车', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const r = {};
    await openPanel(pg); await pg.click('[data-row="G"]'); await pg.fill('#nw-title', '我的标题'); await pg.selectOption('#nw-key', 'G');
    await pg.click('#nf-undo'); await pg.waitForTimeout(60);
    r.undo = await pg.evaluate(() => ({ t: document.getElementById('nw-title').value, key: document.getElementById('nw-key').value, k: NWP.stackOfState(NWP.state), sc: NWP.state.scene }));
    const made = async (pre, k) => { await openPanel(pg); for (const s of pre) await pg.click(s); const d0 = await pg.evaluate(() => docs.length);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
      return pg.evaluate(([d0, k]) => ({ ok: docs.length === d0 + 1 && !document.querySelector('.nf-modal') && NWB.stackOf(song) === k, k: NWB.stackOf(song) }), [d0, k]); };
    r.row = await made(['[data-row="G"]'], 'JG');
    r.radio = await made(['[data-act="var"][data-k="inst"][data-v="uku"]'], 'JT');
    r.more = await made(['.nf-more'], 'JT');
    /* 键盘把焦点移到谱开关上：回车交还按钮（切换谱，不建谱） */
    await openPanel(pg); await pg.waitForTimeout(60); await pg.keyboard.press('Tab'); r.kbFocus = await pg.evaluate(() => (document.activeElement.dataset || {}).row || document.activeElement.id);
    { const d0 = await pg.evaluate(() => docs.length); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
      r.kb = await pg.evaluate(d0 => ({ open: !!document.querySelector('.nf-modal'), docs: docs.length - d0, k: NWP.state && NWP.stackOfState(NWP.state) }), d0); }
    /* Safari 输入法上屏：keyCode 229 的 Enter 不建谱 */
    await openPanel(pg); { const d0 = await pg.evaluate(() => docs.length);
      await pg.evaluate(() => { const t = document.getElementById('nw-title'); t.focus(); t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true })); });
      await pg.waitForTimeout(80); r.ime = await pg.evaluate(d0 => ({ open: !!document.querySelector('.nf-modal'), docs: docs.length - d0 }), d0); }
    /* 面板内 Ctrl+Z 撤销上一次改谱 */
    await pg.click('[data-row="G"]'); await pg.keyboard.press('Control+KeyZ'); await pg.waitForTimeout(60);
    r.cz = await pg.evaluate(() => ({ k: NWP.stackOfState(NWP.state), note: !!document.querySelector('.nf-note'), open: !!document.querySelector('.nf-modal') }));
    await pg._ctx.close();
    T(r.undo.t === '我的标题' && r.undo.key === 'G' && r.undo.k === 'JT' && r.undo.sc === 'gtr' && r.row.ok && r.radio.ok && r.more.ok && r.kbFocus === 'J' && r.kb.open && r.kb.docs === 0 && r.kb.k === 'T'
      && r.ime.open && r.ime.docs === 0 && r.cz.k === 'JT' && !r.cz.note && r.cz.open,
      'T20 撤销只退「要哪几种谱」（曲名 / 调保留）；鼠标点过谱开关 / 单选 / 更多设置后回车照样创建，键盘移到按钮上回车交还按钮；输入法 229 回车不建；面板内 Ctrl+Z 撤销改谱', JSON.stringify(r));
  });

  /* ---------- T21 焦点：关闭归还、Tab 不出面板、方向键滚进可视区、1–5 后焦点跟到选中项、提示收起不丢焦点 ---------- */
  await guard('T21 焦点', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    const r = {};
    await pg.focus('#b-new'); await pg.keyboard.press('Enter'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(60);
    r.back = await pg.evaluate(() => document.activeElement.id);
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.focus('#nw-create'); await pg.keyboard.press('Tab'); r.tabIn = await pg.evaluate(() => !!document.activeElement.closest('.nf-modal'));
    await pg.keyboard.press('Shift+Tab'); r.stabIn = await pg.evaluate(() => document.activeElement.id === 'nw-create');
    await pg.focus('.nf-modal [data-scene="gtr"]'); await pg.keyboard.press('1'); r.k1 = await pg.evaluate(() => ({ sc: NWP.state.scene, foc: (document.activeElement.dataset || {}).scene }));
    /* 单选组：roving tabindex＋方向键 */
    await pg.click('[data-scene="gtr"]'); await pg.focus('[data-act="var"][data-k="inst"][data-v="guitar"]'); await pg.keyboard.press('ArrowRight');
    r.radio = await pg.evaluate(() => ({ v: NWP.state.v.inst, foc: (document.activeElement.dataset || {}).v, t0: [...document.querySelectorAll('[role=radiogroup]')].every(g => [...g.querySelectorAll('[role=radio]')].filter(x => x.tabIndex === 0).length === 1) }));
    r.aria = await pg.evaluate(() => ({ groups: [...document.querySelectorAll('.nf-modal [role=listbox] [role=group]')].map(g => g.getAttribute('aria-label') || (document.getElementById(g.getAttribute('aria-labelledby')) || {}).textContent).join('|'),
      hintLive: document.querySelector('.nf-rowhint').hasAttribute('aria-live'), live: (document.getElementById('nf-live') || { getAttribute: () => null }).getAttribute('aria-live'),
      tabs: [...document.querySelectorAll('.nf-tabs [role=tab]')].map(t => t.tabIndex + ':' + t.getAttribute('aria-controls')).join(',') }));
    /* 冲突说明：焦点在「撤销」上时不计时；焦点移走后收起，焦点不掉到页面 */
    await pg.click('[data-scene="gtr"]'); await pg.click('[data-row="G"]'); await pg.focus('#nf-undo'); await pg.mouse.move(5, 5); await pg.waitForTimeout(6500);
    r.pause = await pg.evaluate(() => ({ note: !!document.querySelector('.nf-note'), foc: document.activeElement.id }));
    await pg.focus('[data-row="J"]'); await pg.waitForTimeout(6500);
    r.after = await pg.evaluate(() => ({ note: !!document.querySelector('.nf-note'), inModal: !!document.activeElement.closest('.nf-modal') }));
    await pg._ctx.close();
    /* 1280×610（1080p 开 150%）：↓ 选到的用途滚进左栏可视区；11 个用途不滚动全可见 */
    const p2 = await open(1280, 610);
    await p2.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await p2.keyboard.press('Alt+KeyN'); await p2.waitForSelector('.nf-modal [data-scene]');
    for (let i = 0; i < 10; i++) await p2.keyboard.press('ArrowDown');
    r.p610 = await p2.evaluate(() => { const L = document.querySelector('.nf-left').getBoundingClientRect(), o = document.querySelector('[role=option][aria-selected="true"]'), rr = o.getBoundingClientRect();
      return { sc: o.dataset.scene, vis: rr.top >= L.top - 1 && rr.bottom <= L.bottom + 1, foc: document.activeElement === o }; });
    await p2._ctx.close();
    T(r.back === 'b-new' && r.tabIn && r.stabIn && r.k1.sc === 'custom' && r.k1.foc === 'custom' && r.radio.v === 'uku' && r.radio.foc === 'uku' && r.radio.t0
      && r.aria.groups === '弹唱伴奏|课堂声乐|独奏乐队|空白谱与自选记谱法' && !r.aria.hintLive && r.aria.live === 'polite' && r.aria.tabs === '0:nf-tabpanel,-1:nf-tabpanel'
      && r.pause.note && r.pause.foc === 'nf-undo' && !r.after.note && r.after.inModal && r.p610.sc === 'custom' && r.p610.vis && r.p610.foc,
      'T21 焦点与读屏：Esc 关闭后焦点回「新建」；Tab / Shift+Tab 留在面板；按 1 后焦点跟到选中用途；单选组 roving＋方向键；组名 role=group；悬停提示不进 live 区；撤销提示聚焦时不计时、收起不丢焦点；1280×610 ↓ 选中项滚进可视区',
      JSON.stringify(r));
  });

  /* ---------- T22 入口：命中区、快捷菜单 Tab / 缩放即收起、Alt+N 在输入框 / 预览浮层 / 谱架 ---------- */
  await guard('T22 入口与快捷键', async () => {
    const pg = await open(1280, 800);
    const r = {};
    r.cont = await pg.evaluate(() => { const c = document.getElementById('spd-cont'); return { tag: c.tagName }; });
    await pg.evaluate(() => hideStartPad());
    r.hit = await pg.evaluate(() => { const at = (id, dy) => { const e = document.getElementById(id), b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.left + b.width / 2, dy < 0 ? b.top + dy : b.bottom + dy); return !!h && (h === e || e.contains(h)); };
      const dd = document.getElementById('b-newdd').getBoundingClientRect();
      return { ddW: Math.round(dd.width), dd: at('b-newdd', -7) && at('b-newdd', 7), nw: at('b-new', -7) && at('b-new', 7), add: (() => { const e = document.getElementById('dt-add'), b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.left - 4, b.top + b.height / 2); return h === e; })() }; });
    await pg.click('#b-newdd'); r.qmTab0 = await pg.evaluate(() => [...document.querySelectorAll('.nf-qm [role=menuitem]')].filter(x => x.tabIndex === 0).length);
    await pg.keyboard.press('End'); await pg.keyboard.press('Tab'); r.qmTab = await pg.evaluate(() => !!document.querySelector('.nf-qm'));
    await pg.click('#b-newdd'); await pg.setViewportSize({ width: 1280, height: 500 }); await pg.waitForTimeout(150); r.qmResize = await pg.evaluate(() => !!document.querySelector('.nf-qm'));
    await pg.setViewportSize({ width: 1280, height: 800 }); await pg.waitForTimeout(150);
    await pg.focus('#i-tempo');   /* 播放坞速度框（输入框） */
    await pg.keyboard.press('Alt+KeyN'); await pg.waitForTimeout(120); r.inInput = await panelOpen(pg); await pg.keyboard.press('Escape');
    await pg.evaluate(() => { try { closeModal(); } catch (_) {} loadSong(PRESETS[0].make()); render(); });
    await pg.click('#b-preview'); await pg.waitForTimeout(400);
    { const d0 = await pg.evaluate(() => docs.length); await pg.keyboard.press('Alt+KeyN'); await pg.waitForTimeout(120); r.pvPanel = await panelOpen(pg);
      await pg.keyboard.press('Enter'); await pg.keyboard.press('Alt+Shift+KeyN'); await pg.waitForTimeout(150); r.pvDocs = await pg.evaluate(d0 => docs.length - d0, d0); }
    await pg.evaluate(() => { try { pvClose(); } catch (_) {} });
    await pg._ctx.close();
    T(r.cont.tag === 'BUTTON' && r.hit.ddW >= 32 && r.hit.dd && r.hit.nw && r.hit.add && r.qmTab0 === 1 && !r.qmTab && !r.qmResize && r.inInput && !r.pvPanel && r.pvDocs === 0,
      'T22 「继续上次编辑」是真按钮；新建 / ▾ 上下各扩 8px 命中区（▾ 宽 ≥32）、页签 ＋ 左右扩；快捷菜单 roving、Tab 与窗口缩放即收起；输入框里 Alt+N 也开；打印预览浮层下 Alt+N / Alt+Shift+N 不响应', JSON.stringify(r));
  });

  /* ---------- T23 建成提示读得完 / 继续上次编辑认得出改过的示例谱与填过页头的新谱 ---------- */
  await guard('T23 提示时长与继续上次编辑', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
    await pg.click('#b-newdd'); await pg.click('.nf-qm [data-q="pacc"]'); await pg.waitForTimeout(3200);
    const op = await pg.evaluate(() => getComputedStyle(document.getElementById('toast')).opacity);
    await pg._ctx.close();
    const cont = async (fn) => { const p = await open(1280, 800); await p.evaluate(fn); await p.waitForTimeout(100); await p.reload(); await p.waitForTimeout(900);
      const t = await p.evaluate(() => document.getElementById('spd-cont').textContent); await p._ctx.close(); return t; };
    const pre = await cont(() => { hideStartPad(); loadSong(PRESETS[3].make()); song.key = 'G'; song.tempo = 120; song.singer = '我'; render(); persistNow(); });
    const blankHdr = await cont(() => { hideStartPad(); NWP.quickCreate('gtr'); song.capo = 3; song.singer = '我'; persistNow(); });
    const pristine = await cont(() => { NWP.quickCreate('gtr'); persistNow(); });
    T(+op > 0.9 && /继续上次编辑/.test(pre) && /继续上次编辑/.test(blankHdr) && pristine === '',
      'T23 带下一步指引的建成提示 3 秒后仍在（按字数延长）；「继续上次编辑」：只改了调 / 速度 / 演唱者的示例谱、只设了变调夹 / 演唱者的新谱都算自己的谱，原样空白谱不算', JSON.stringify({ op, pre, blankHdr, pristine }));
  });

  /* ---------- T24 本机键坏值（原型链键 / 自选记谱法缺组合）：面板照常、能建、能自愈 ---------- */
  await guard('T24 本机键坏值', async () => {
    const res = [];
    for (const bad of ['{"scene":"constructor","v":{}}', '{"scene":"__proto__","v":{}}', '{"scene":"toString","v":{"tuning":"constructor"}}', '{"scene":"custom","stack":"TG","v":{}}', '{"scene":"custom","v":{}}', '{"scene":"gtr","v":{"tuning":"__proto__","instKey":"constructor"}}']) {
      const pg = await open(1280, 800, { init: 'try{ if(!sessionStorage.getItem("nwx")){ localStorage.setItem("musetab-nw-last", ' + JSON.stringify(bad) + '); sessionStorage.setItem("nwx","1"); } }catch(_){}' });
      const e0 = errs.length;
      await pg.evaluate(() => hideStartPad());
      await pg.click('#b-new'); await pg.waitForTimeout(100);
      const p = await pg.evaluate(() => ({ n: document.querySelectorAll('.nf-modal [data-scene]').length, kind: (document.getElementById('nf-gokind') || {}).textContent }));
      const d0 = await pg.evaluate(() => docs.length);
      await pg.click('#nw-create'); await pg.waitForTimeout(120);
      await pg.keyboard.press('Alt+Shift+KeyN'); await pg.waitForTimeout(120);
      const g = await pg.evaluate(d0 => { let j = null; try { j = JSON.parse(localStorage.getItem('musetab-nw-last')); } catch (_) {} return { docs: docs.length - d0, tu: song.tuning ? String(song.tuning) : null, saved: j && j.scene, stack: j && j.stack }; }, d0);
      res.push({ bad: bad.slice(0, 40), p, g, err: errs.length - e0 });
      await pg._ctx.close();
    }
    T(res.every(x => x.p.n === 11 && x.p.kind && x.p.kind !== '曲谱' && x.g.docs === 2 && x.g.tu === null && x.g.saved && x.g.stack && x.err === 0),
      'T24 musetab-nw-last 坏值（constructor / __proto__ / toString、自选记谱法缺组合或旧组合、定弦 / 乐器原型链键）：面板照常、创建与 Alt+Shift+N 都能建、写回合法值、无报错', JSON.stringify(res));
  });

  /* ---------- T25 谱库观看页 / 分享卡仍用谱库口径（拍板 5：谱库与 typeLabelOf v67.6 再统一） ---------- */
  await guard('T25 观看页谱名口径', async () => {
    const pg = await open(1280, 800);
    const r = await pg.evaluate(async () => {
      const out = [];
      for (const i of [4, 9, 11, 12]) {
        const d = PRESETS[i].make(); window.apiCall = async () => ({ score: { title: d.title, data: JSON.parse(JSON.stringify(d)) }, stats: null });
        await openRemotePub('abc123'); out.push({ t: document.title.replace(/ · 谱友圈谱库$/, '').split(' · ').pop(), ed: docTypeLabel(song), pub: typeof docTypeLabelPub === 'function' ? docTypeLabelPub(song) : null }); try { exitViewer(); } catch (_) {}
      }
      return out;
    });
    await pg._ctx.close();
    T(r.map(x => x.t).join() === '尤克里里谱,钢琴弹唱谱,简谱歌谱,器乐五线谱' && r.every(x => x.t === x.pub) && r[3].ed === '五线谱旋律',
      'T25 谱库观看页标题读谱库口径 docTypeLabelPub（尤克里里谱 / 钢琴弹唱谱 / 简谱歌谱 / 器乐五线谱，与服务端 typeLabelOf 一致）；编辑器显示层仍读统一谱名表', JSON.stringify(r));
  });

  /* ---------- T26 四部合唱示意：上下谱号不相碰 ---------- */
  await guard('T26 多声部示意行距', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await openPanel(pg); await pg.click('[data-scene="vocal"]'); await pg.click('[data-act="mel"][data-v="S"]'); await pg.click('[data-act="var"][data-k="parts"][data-v="4"]');
    const r = await pg.evaluate(() => { const gs = [...document.querySelectorAll('.nf-svg > g')].map(g => +(g.getAttribute('transform') || '').replace(/.*translate\(0,([\d.]+)\).*/, '$1'));
      return { ys: gs, minGap: Math.min(...gs.slice(3).map((y, i) => y - gs[i + 2])) }; });
    await pg._ctx.close();
    T(r.ys.length === 5 && r.minGap >= 46, 'T26 四部合唱示意：相邻两行五线谱行距 ≥46（谱号不相碰）', JSON.stringify(r));
  });

  T(errs.length === 0, '无页面报错', errs.join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
