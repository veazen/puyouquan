/* v68.2 文案轨（计划 §5.6）：编辑器帮助弹窗按新布局改写 · 旧外壳帮助逐字节不变 · 官网 help.html 按新布局改写 · 措辞闸防四步口径。全部 file:// 直载。
   H1 新外壳（?shell=flow，1440×900）点 #b-help：弹窗 .helpdoc[data-shell="flow"]，标题含「帮助」；导语写「书写 › 排版 › 输出」与当前版本（＝APP_VER）；
      三步卡恰好 3 张：书写 / 排版 / 输出（没有「播放」步）；「界面一览」逐行讲到 行 1（文件 ▾ · 窗口页签 · 保存状态 · 发布 · 账号 ▾）、行 2、左栏音轨、左栏记号、
      右栏（属性 / 文字 / 智能）、底部播放与状态栏、手机
   H2 旧入口去向（README 老用户迁移）：「搜功能 · 旧入口在哪里」节含 Ctrl+/ 与 示例曲谱（原「预设」）· 排版 → 排版 · 打印与导出 → 输出 · 混音 → 音轨行 ·
      旧版布局 → 偏好设置「使用旧版布局」；全文无「四步」、无「书写 › 排版 › 播放」、无「顶栏「预设」」
   H3 与 tv_icons T12 同口径：标题含 吉他谱 / 简谱 / 功能谱 的节恰好 3 个，图标依次 type16-guitar / nota-jianpu / type16-func
   H4 账号 ▾「快捷键」（FLOW.r1 keysHelp）：第一个标题含「快捷键」的节就是快捷键节，且滚进弹窗可视区；该节含 Ctrl+/ 与 Esc
   H5 旧外壳（?shell=classic）帮助弹窗与基线提交（tests/shellflow_ref.json，v67.8；该段源码 v67.8–v68.1 逐字节相同）渲染出的 .modal innerHTML 逐字节相同、
      不带 data-shell；拿不到基线：CI（env CI）判红，本地打印 ⚠️ 只验旧文案标记（MUSETAB_REF=none 显式跳过）
   H6 手机 390×844 ?shell=flow（body.flw-m，flowOn() 为假）：☰ 菜单「帮助」打开的是新布局帮助（data-shell="flow"），弹窗不横向溢出
   H7 数据红线：开 / 关帮助前后 song 逐字节不变、musetab-* 键集合不变
   H8 官网 help.html：「快速上手」三步（第 1 步 · 书写 / 第 2 步 · 排版 / 第 3 步 · 输出）＋认识界面讲两行顶栏 / 左栏 / 右栏 / 底部播放与状态栏；
      保留「想用旧布局：偏好设置 → 使用旧版布局」；不再出现旧布局入口说法（顶栏「排版 / 预览 / 打印 / 示例曲谱 / 偏好设置」、右栏「创作」、播放条、左栏「歌词 / 记号」层……）；
      浏览器打开 ?section=getting-started 文章可见、无脚本错误
   H9 措辞闸：RULES 含两条四步口径规则；对注入了「书写 › 排版 › 播放」「四步工作流」「四步模式」的临时副本退出码 1 且恰好 3 处命中（注释里的不拦）；对仓库本身 0 命中
   H10 全程无页面脚本错误
   H12（v68.6）新布局帮助「输出」步、官网导出表与「打印预览」段讲到分谱（点一份预览这一份、勾选几份一次打印成一个 PDF） */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ROOT = path.resolve(__dirname, '../..');
const SHOTS = process.env.HELPFLOW_SHOTS || '';
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || '';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = x => JSON.stringify(x);
  const open = async (url, w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(url); await pg.waitForTimeout(1200);
    await pg.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    if (o.song !== false) await pg.evaluate(() => { window.guardReplace = p => p(); hideStartPad(); loadSong(PRESETS[0].make()); render(); });
    await pg.waitForTimeout(300);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  /* 弹窗读数：节标题、行键、三步卡、导语、版本 */
  const READ = () => {
    const md = document.querySelector('#modal-mask .modal'), hd = md && md.querySelector('.helpdoc');
    if (!md || !hd) return null;
    const secs = [...hd.querySelectorAll('.hd-sec')].map(s => ({
      t: ((s.querySelector('.hd-st') || {}).textContent || '').trim(),
      ic: ((s.querySelector('.hd-st .ic svg.pqi') || { dataset: {} }).dataset.pq) || 'svgi',
      rows: [...s.querySelectorAll('.hd-row')].map(r => [(r.querySelector('.rk') || {}).textContent.trim(), (r.querySelector('.rv') || {}).textContent.trim()])
    }));
    return { shell: hd.dataset.shell || '', h3: ((md.querySelector('h3') || {}).textContent || ''), ds: ((hd.querySelector('.hd-hero .ds') || {}).textContent || ''),
      ver: ((hd.querySelector('.hd-ver') || {}).textContent || ''), app: (typeof APP_VER !== 'undefined' ? APP_VER : ''),
      steps: [...hd.querySelectorAll('.hd-step > b')].map(x => x.textContent.trim()), secs, txt: md.textContent,
      ovf: Math.round(md.scrollWidth - md.clientWidth), mw: Math.round(md.getBoundingClientRect().width), vw: innerWidth };
  };

  /* ================= H1–H4 · H7 新外壳桌面 ================= */
  let flowHTML = '';
  try {
    const pg = await open(withQ(URL0, 'shell=flow'), 1440, 900);
    const on = await pg.evaluate(() => ({ flow: flowOn(), cls: document.body.classList.contains('flow') }));
    const S0 = await pg.evaluate(() => ({ song: JSON.stringify(song), keys: Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort() }));
    await pg.evaluate(() => document.getElementById('b-help').click()); await pg.waitForTimeout(250);
    const r = await pg.evaluate(READ);
    flowHTML = await pg.evaluate(() => (document.querySelector('#modal-mask .modal') || {}).innerHTML || '');
    await shot(pg, 'helpflow-1440-light');
    const row = (sec, k) => { const s = r && r.secs.find(x => x.t.indexOf(sec) >= 0); const rr = s && s.rows.find(x => x[0] === k); return rr ? rr[1] : ''; };
    const ui = k => row('界面一览', k);
    T(on.flow && on.cls && r && r.shell === 'flow' && /帮助/.test(r.h3) && /书写 › 排版 › 输出/.test(r.ds) && r.ver === r.app && !!r.app && r.ds.indexOf('当前版本 ' + r.app) >= 0,
      'H1a 新外壳点 #b-help：.helpdoc[data-shell=flow]、标题含「帮助」、导语写「书写 › 排版 › 输出」与当前版本（＝APP_VER）', J({ on, shell: r && r.shell, h3: r && r.h3, ds: r && r.ds, ver: r && r.ver }));
    T(r && J(r.steps) === J(['书写', '排版', '输出']),
      'H1b 三步卡恰好 3 张：书写 / 排版 / 输出（不设「播放」步）', J(r && r.steps));
    /* H11（v68.5 收尾 UX-11）：「排版」步讲到本行换页与页码（此前只写「此处换行 / 并入上一行 / 锁定此行」与「页头」） */
    { const st2 = await pg.evaluate(() => { const x = [...document.querySelectorAll('#modal-mask .hd-step')].find(e => /排版/.test((e.querySelector('b') || {}).textContent || '')); return x ? x.textContent : ''; });
      T(/本行换页/.test(st2) && /另起一页/.test(st2) && /页码（印 \/ 位置 \/ 首页 \/ 起始页码）/.test(st2) && !/页头与页码/.test(st2), 'H11a 新布局帮助「排版」步讲到「本行换页」（从这一行起另起一页，再点取消）与右栏「版式」的页码设置', st2.slice(0, 160)); }
    /* H12（v68.6 有意迁移，规格 docs/spec-2026-10-parts.md §6.5 / §6.8 ③）：「输出」步讲到分谱——点一份预览这一份、勾选几份一次打印（修前 v68.5 无「分谱」→ 红；修后绿） */
    { const st3 = await pg.evaluate(() => { const x = [...document.querySelectorAll('#modal-mask .hd-step')].find(e => /输出/.test((e.querySelector('b') || {}).textContent || '')); return x ? x.textContent : ''; });
      const pe = await pg.evaluate(() => { const r = [...document.querySelectorAll('#modal-mask .hd-row')].find(x => (x.querySelector('.rk') || {}).textContent === '打印与导出'); return r ? r.querySelector('.rv').textContent : ''; });
      /* v69.1 收尾 V3 有意迁移：新形态（默认）分谱＝悬浮条选「分谱」点「存 PDF」（不再是行 2「分谱」键一次打印）；?next=0 原文见 H13 */
      T(/分谱/.test(st3) && /输出内容/.test(st3) && /预览这一份/.test(st3) && /勾选几份/.test(st3) && /悬浮条选「分谱」点「存 PDF」/.test(st3) && !/即将推出|下一批/.test(st3 + pe) && /分谱在「输出内容」/.test(pe),
        'H12a 新布局帮助「输出」步讲到分谱：「输出内容」里点一份就预览这一份，勾选几份、悬浮条选「分谱」点「存 PDF」；对照表「打印与导出」一行补上分谱', st3.slice(0, 120) + ' ｜ ' + pe.slice(-40)); }
    /* H13（v69.1 收尾 V3）：新形态帮助与实际界面一致——「排版」步不写「页头与页码」（版式页只剩页码，页头在谱面页头就地改）；
       搜功能对照表「排版」一行写悬浮条与「修 N 处」、「打印与导出」一行写悬浮条「存 PDF」与左栏格式卡（不再说「都在这一行」）；?next=0 三处仍是 v69.0 原文 */
    { const rw = k => { const x = [...document.querySelectorAll('#modal-mask .hd-row')].find(e => (e.querySelector('.rk') || {}).textContent === k); return x ? x.querySelector('.rv').textContent : ''; };
      const h = await pg.evaluate(rw0 => { const rw = new Function('k', 'return (' + rw0 + ')(k)'); return { lay: rw('排版'), out: rw('打印与导出') }; }, rw.toString());
      T(/悬浮条调纸张/.test(h.lay) && /修 N 处/.test(h.lay) && /悬浮条「存 PDF」/.test(h.out) && /左栏格式卡/.test(h.out) && !/都在这一行|勾选后点「分谱」一次打印/.test(h.out),
        'H13a 新形态对照表：「排版」写悬浮条纸张 · 疏密 · 每行与「修 N 处」；「打印与导出」写悬浮条「存 PDF」、左栏格式卡、悬浮条选「分谱」（无「都在这一行」）', J(h));
      const p0 = await open(withQ(URL0, 'next=0'), 1440, 900);
      await p0.evaluate(() => document.getElementById('b-help').click()); await p0.waitForTimeout(250);
      const h0 = await p0.evaluate(rw0 => { const rw = new Function('k', 'return (' + rw0 + ')(k)'); const st = [...document.querySelectorAll('#modal-mask .hd-step')].map(e => e.textContent);
        return { lay: rw('排版'), out: rw('打印与导出'), s2: st[1] || '', s3: st[2] || '' }; }, rw.toString());
      await close(p0);
      T(/页头与页码/.test(h0.s2) && /勾选几份点「分谱」，一次打印成一个 PDF/.test(h0.s3) && /纸张 · 疏密 · 断行 · 内容大小 · 版面检查/.test(h0.lay) && /都在这一行/.test(h0.out),
        'H13b ?next=0：「排版」步「页头与页码」、「输出」步「勾选几份点「分谱」，一次打印成一个 PDF」、对照表两行仍是 v69.0 原文', J({ s2: h0.s2.slice(-60), s3: h0.s3.slice(-60), lay: h0.lay, out: h0.out.slice(0, 50) })); }
    const need = {
      '行 1 · 文档': ['文件 ▾', '窗口页签', '保存状态', '发布', '账号 ▾', '示例曲谱', '偏好设置'],
      '行 2 · 工作': ['书写 › 排版 › 输出', '更多 ▾', '搜功能', 'Ctrl+/'],
      '左栏 · 音轨': ['音轨层级树', '静音', '独奏', '音量', '「⋯」', '换谱类'],
      '左栏 · 记号': ['Bravura', '拼音首字母', '最近使用'],
      /* v69.0 S2 迁移（D4）：右栏书写两页，生成工具进悬浮条「智能 ▾」；悬浮条一行讲主按钮（停一下先看结果、点一下写入、▾ 选项）、「智能 ▾」、收起后主按钮仍在 */
      '右栏': ['书写时两页', '属性', '文字', '智能 ▾', '版式', '发布与导出', '钉住'],
      '谱面上方 · 悬浮条': ['谱类 ▾', '主按钮', '点一下才写入', '▾ 选范围与选项', '智能 ▾', '收起后主按钮仍在'],
      '底部 · 播放与状态栏': ['空格', '循环选区', '小节格', '时值检查', '节拍器', '⋯ 更多', '谱架模式'],
      '手机': ['☰', '底条']
    };
    const miss = []; Object.keys(need).forEach(k => { const v = ui(k); if (!v) miss.push(k + ':缺行'); else need[k].forEach(w => { if (v.indexOf(w) < 0) miss.push(k + ':' + w); }); });
    T(!miss.length, 'H1c「界面一览」逐行讲到 行 1 · 行 2 · 悬浮条（主按钮 · 智能 ▾）· 左栏音轨 · 左栏记号 · 右栏两页 · 底部播放与状态栏 · 手机', miss.join('；') || J(r.secs.map(s => s.t)));
    /* H2 旧入口去向 */
    const old = k => row('旧入口', k);
    const o2 = { cmd: old('Ctrl+/'), demo: old('示例曲谱'), eng: old('排版'), out: old('打印与导出'), mix: old('混音'), classic: old('旧版布局') };
    T(/搜功能/.test(o2.cmd) && /旧名也能搜到/.test(o2.cmd) && /原「预设」/.test(o2.demo) && /文件 ▾「示例曲谱」/.test(o2.demo) && /「排版」步/.test(o2.eng)
      && /「预览」「打印…」/.test(o2.out) && /「输出」步/.test(o2.out) && /音轨 ▴/.test(o2.mix) && /左栏音轨行/.test(o2.mix)
      && /偏好设置/.test(o2.classic) && /使用旧版布局/.test(o2.classic),
      'H2a「搜功能 · 旧入口在哪里」：Ctrl+/ 旧名可搜 · 示例曲谱（原「预设」）· 排版 → 排版步 · 预览 / 打印 → 输出步 · 混音 → 音轨行 · 旧版布局 → 偏好设置「使用旧版布局」', J(o2));
    const bad = (r && r.txt.match(/四步|书写\s*›\s*排版\s*›\s*播放|顶栏[「“]预设[」”]|「播放」步|播放条/g)) || [];
    T(r && !bad.length, 'H2b 新布局帮助全文无「四步」/「书写 › 排版 › 播放」/「顶栏「预设」」/「播放」步 / 播放条（旧入口只在「原…」对照里出现）', J(bad));
    /* H3 谱类节图标（tv_icons T12 同口径：.hd-st 文字含 吉他谱|简谱|功能谱） */
    const ic = await pg.evaluate(() => [...document.querySelectorAll('.hd-st .ic')].filter(x => /吉他谱|简谱|功能谱/.test(x.parentElement.textContent)).map(x => (x.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || 'svgi').join(','));
    T(ic === 'type16-guitar,nota-jianpu,type16-func', 'H3 谱类三节图标与旧帮助同（tv_icons T12 口径）：type16-guitar / nota-jianpu / type16-func，且别的节标题不含这三个词', ic);
    await pg.evaluate(() => closeModal()); await pg.waitForTimeout(100);
    /* H4 账号 ▾「快捷键」→ keysHelp */
    await pg.evaluate(() => FLOW.act('r1:keys', { dataset: {} }, null)); await pg.waitForTimeout(300);
    const k4 = await pg.evaluate(() => { const md = document.querySelector('#modal-mask .modal'); const hd = md && md.querySelector('.helpdoc');
      const st = [...document.querySelectorAll('#modal-mask .hd-st')].find(x => /快捷键/.test(x.textContent || ''));
      if (!md || !st) return { md: !!md, st: !!st }; const a = md.getBoundingClientRect(), c = st.getBoundingClientRect(), sec = st.closest('.hd-sec');
      return { shell: hd.dataset.shell, t: st.textContent.trim(), inView: c.top >= a.top - 1 && c.top < a.bottom, rows: [...sec.querySelectorAll('.rk')].map(x => x.textContent.trim()) }; });
    await shot(pg, 'helpflow-1440-keys');
    T(k4.shell === 'flow' && k4.t === '快捷键' && k4.inView && k4.rows.some(x => /Ctrl\+\//.test(x)) && k4.rows.some(x => /^Esc/.test(x)),
      'H4 账号 ▾「快捷键」打开新布局帮助并滚到「快捷键」节（第一个标题含「快捷键」的节，在可视区；含 Ctrl+/ 与 Esc）', J(k4));
    await pg.evaluate(() => closeModal()); await pg.waitForTimeout(100);
    /* H7 数据红线 */
    const S1 = await pg.evaluate(() => ({ song: JSON.stringify(song), keys: Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort() }));
    T(S1.song === S0.song && J(S1.keys) === J(S0.keys), 'H7 数据红线：开 / 关帮助、跳快捷键前后 song 逐字节不变、musetab-* 键集合不变', J({ same: S1.song === S0.song, k0: S0.keys.length, k1: S1.keys.length }));
    /* 深色截图 */
    await pg.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.getElementById('b-help').click(); }); await pg.waitForTimeout(250);
    await shot(pg, 'helpflow-1440-dark');
    await pg.evaluate(() => { closeModal(); delete document.documentElement.dataset.theme; });
    await close(pg);
  } catch (e) { T(false, 'H1–H4 执行异常', e.message.split('\n')[0]); }

  /* ================= H5 旧外壳逐字节不变 ================= */
  try {
    const refURL = (() => {
      const e = process.env.MUSETAB_REF;
      if (e === 'none') return null;
      if (e) return e.startsWith('file://') ? e : 'file://' + path.resolve(e);
      if (!REF_COMMIT) return null;
      try { const txt = cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
        const f = path.join(os.tmpdir(), 'tv_helpflow_ref_' + REF_COMMIT.slice(0, 12) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return null; }
    })();
    const grab = async url => { const pg = await open(url, 1440, 900);
      await pg.evaluate(() => document.getElementById('b-help').click()); await pg.waitForTimeout(250);
      const o = await pg.evaluate(() => { const md = document.querySelector('#modal-mask .modal'); const hd = md && md.querySelector('.helpdoc');
        return { html: md ? md.innerHTML : '', shell: hd ? (hd.dataset.shell || '') : 'none', flow: typeof flowOn === 'function' && flowOn(), txt: md ? md.textContent : '' }; });
      await shot(pg, 'helpclassic-1440'); await close(pg); return o; };
    const cur = await grab(withQ(URL0, 'shell=classic'));
    const marks = ['顶部编辑栏（吸顶常驻）', '排版 · 预览 · 打印（本次重点）', '「排版」调纸张疏密'].every(m => cur.txt.indexOf(m) >= 0);
    if (refURL) {
      const ref = await grab(withQ(refURL, 'shell=classic'));
      T(!cur.flow && cur.shell === '' && marks && cur.html.length > 2000 && cur.html === ref.html && cur.html !== flowHTML,
        'H5 旧外壳（?shell=classic）帮助弹窗与基线 ' + REF_COMMIT.slice(0, 7) + ' 渲染的 .modal innerHTML 逐字节相同（' + cur.html.length + ' 字符）、不带 data-shell', J({ flow: cur.flow, shell: cur.shell, marks, len: [cur.html.length, ref.html.length] }));
    } else if (process.env.CI) {
      T(false, 'H5 拿不到旧外壳基线（tests/shellflow_ref.json 的提交）：CI 判红', REF_COMMIT);
    } else {
      console.log('⚠️ H5 本地拿不到基线 ' + (REF_COMMIT || '(无)') + '：只验旧文案标记');
      T(!cur.flow && cur.shell === '' && marks, 'H5（降级）旧外壳帮助弹窗仍是旧布局说明、不带 data-shell', J({ flow: cur.flow, shell: cur.shell, marks }));
    }
  } catch (e) { T(false, 'H5 执行异常', e.message.split('\n')[0]); }

  /* ================= H6 手机新外壳 ================= */
  try {
    const pg = await open(withQ(URL0, 'shell=flow'), 390, 844);
    const st = await pg.evaluate(() => ({ m: document.body.classList.contains('flw-m'), flow: flowOn() }));
    /* ☰ 菜单 → 「帮助」行（data-old="b-help"，与 FLOW.mob 抽屉同一委托） */
    let via = 'menu';
    const mb = await pg.$('#flw-mtop [data-fm="sheet"][data-v="menu"], #flw-mtop [data-a="menu"], #flw-mtop button');
    if (mb) { await mb.click().catch(() => {}); await pg.waitForTimeout(250); }
    const row = await pg.$('[data-fm="old"][data-old="b-help"]');
    if (row && await row.isVisible().catch(() => false)) { await row.click().catch(() => {}); } else { via = 'direct'; await pg.evaluate(() => document.getElementById('b-help').click()); }
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(READ);
    await shot(pg, 'helpflow-390-mobile');
    T(st.m && !st.flow && r && r.shell === 'flow' && r.ovf <= 1 && r.mw <= r.vw,
      'H6 手机 390×844 新外壳（body.flw-m，flowOn() 为假）：☰「帮助」打开新布局帮助（data-shell=flow），弹窗不横向溢出（入口 ' + via + '）', J({ st, shell: r && r.shell, ovf: r && r.ovf, mw: r && r.mw, vw: r && r.vw }));
    await close(pg);
  } catch (e) { T(false, 'H6 执行异常', e.message.split('\n')[0]); }

  /* ================= H8 官网 help.html ================= */
  try {
    const site = fs.readFileSync(path.join(ROOT, 'muse-tab/site/help.html'), 'utf8');
    const gs = (site.match(/<article class="doc-art" id="doc-getting-started">([\s\S]*?)<\/article>/) || [])[1] || '';
    const h3 = (gs.match(/<h3>[^<]*<\/h3>/g) || []).map(x => x.replace(/<\/?h3>/g, ''));
    const say = ['顶栏两行', '行 1', '行 2', '书写 › 排版 › 输出', '<b>左栏</b>', '音轨层级树', '记号面板', '<b>右栏</b>', '属性', '文字', '智能', '底部播放与状态栏', 'Ctrl</kbd>+<kbd>/'];
    const missSay = say.filter(w => gs.indexOf(w) < 0);
    T(J(h3) === J(['第 0 步 · 认识界面', '第 1 步 · 书写（建谱与录入）', '第 2 步 · 排版', '第 3 步 · 输出']) && /三步做一首谱/.test(gs) && !missSay.length,
      'H8a 官网「快速上手」改三步（书写 / 排版 / 输出），认识界面讲两行顶栏 · 左栏音轨与记号 · 右栏属性 / 文字 / 智能 · 底部播放与状态栏 · Ctrl+/', J({ h3, missSay }));
    T(site.indexOf('想用旧布局：偏好设置 → 使用旧版布局') >= 0, 'H8b 官网保留一句「想用旧布局：偏好设置 → 使用旧版布局」');
    { const lay = (site.match(/<article class="doc-art" id="doc-layout-print">([\s\S]*?)<\/article>/) || [])[1] || '';
      T(/本行换页/.test(gs) && /页头 · 页码/.test(gs) && /本行换页/.test(lay) && /⑤ 页头与页码/.test(lay) && /底部居中 \/ 底部外侧 \/ 顶部外侧/.test(lay),
        'H11b 官网 help.html：快速上手「排版」与「排版与打印」篇讲到本行换页与页码设置（印 / 位置 / 首页 / 起始页码）（v68.5 收尾 UX-11）', J({ gs: /本行换页/.test(gs), lay: lay.length })); }
    /* H12b（v68.6）：导出表有「分谱（按演奏者）」一行、「打印预览」段补一句分谱（规格 §6.8 ③） */
    { const ie = (site.match(/<article class="doc-art" id="doc-import-export">([\s\S]*?)<\/article>/) || [])[1] || '';
      const pv = (site.match(/<h3>打印预览<\/h3>\s*<p>([\s\S]*?)<\/p>/) || [])[1] || '';
      T(/<td><b>分谱（按演奏者）<\/b><\/td>/.test(ie) && /勾选几份/.test(ie) && /一个 PDF/.test(ie) && /始终是总谱/.test(ie) && /分谱/.test(pv) && /点「总谱」回来/.test(pv),
        'H12b 官网 help.html：导出表加「分谱（按演奏者）」一行（点一份预览、勾选几份一次打印成一个 PDF、分享卡等始终是总谱），「打印预览」段补一句分谱', J({ ie: /分谱（按演奏者）/.test(ie), pv: pv.slice(-80) })); }
    const OLD = /顶栏[「“](排版|预览|打印|示例曲谱|偏好设置|换调|伴奏织体|8度±|时值)[」”]|右栏[「“]创作[」”]|右栏「信息」页底部|播放条|左栏[「“](歌词|记号)[」”]层|「小节」面板|底部音轨区|顶部页签|四步|书写\s*›\s*排版\s*›\s*播放|智能预提示/g;
    const hits = site.replace(/<!--[\s\S]*?-->/g, '').match(OLD) || [];
    T(!hits.length, 'H8c 官网 help.html 不再用旧布局入口说法（顶栏「排版 / 预览 / 打印 / 示例曲谱 / 偏好设置 / 换调 / 伴奏织体 / 8度± / 时值」、右栏「创作」、播放条、左栏「歌词 / 记号」层、四步……）', J(hits));
    const fe = fs.readFileSync(path.join(ROOT, 'muse-tab/site/features.html'), 'utf8');
    T(!/标签栏同时编辑/.test(fe) && /窗口页签同时编辑/.test(fe), 'H8d 官网 features.html「多窗口多类型」改说窗口页签（不再说标签栏）');
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message));
    await pg.route(/^https?:\/\//, r => r.abort()).catch(() => {});
    await pg.goto('file://' + path.join(ROOT, 'muse-tab/site/help.html') + '?section=getting-started'); await pg.waitForTimeout(800);
    const v = await pg.evaluate(() => { const a = document.getElementById('doc-getting-started'); const ul = a && a.querySelector('ul');
      return { on: !!(a && a.offsetParent), li: ul ? ul.querySelectorAll('li').length : 0, pad: ul ? getComputedStyle(ul).paddingLeft : '', ovf: document.documentElement.scrollWidth - innerWidth }; });
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, 'site-help-getting-started.png'), fullPage: true }); }
    await ctx.close();
    T(v.on && v.li === 4 && v.ovf <= 0 && !pe.length, 'H8e 浏览器打开官网 help.html?section=getting-started：文章可见、认识界面 4 条、页面不横向溢出、无脚本错误', J({ v, pe: pe.slice(0, 2) }));
  } catch (e) { T(false, 'H8 执行异常', e.message.split('\n')[0]); }

  /* ================= H9 措辞闸 ================= */
  try {
    const lint = fs.readFileSync(path.join(ROOT, 'deploy/check-wording.js'), 'utf8');
    /* v68.2 收尾 ENG-9：三步规则的分隔符放宽（› · &rsaquo; · &#8250; · > · &gt; · ＞ · → · 、 · /），不再只认 U+203A；NU-2 另有一条内部用语规则 */
    const has = /\[\/书写\\s\*\(\?:›\|&rsaquo;\|&#8250;[^\n]*\\s\*播放\//.test(lint) && lint.indexOf('[/四步工作流|四步模式/') >= 0 && (lint.match(/拍板为三步：书写 › 排版 › 输出（2026-10-16）/g) || []).length === 2
      && lint.indexOf('[/拍板|需负责人|负责人拍板|measures\\[\\]|外壳这一层|下一批/') >= 0;
    let repo = 0; try { cp.execFileSync(process.execPath, [path.join(ROOT, 'deploy/check-wording.js')], { stdio: 'ignore' }); } catch (e) { repo = e.status || 1; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_helpflow_w_'));
    fs.mkdirSync(path.join(tmp, 'deploy')); fs.mkdirSync(path.join(tmp, 'muse-tab/site'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'deploy/check-wording.js'), path.join(tmp, 'deploy/check-wording.js'));
    fs.copyFileSync(path.join(ROOT, 'muse-tab/index.html'), path.join(tmp, 'muse-tab/index.html'));
    const sd = path.join(ROOT, 'muse-tab/site');
    fs.readdirSync(sd).filter(f => /\.(html|js)$/.test(f)).forEach(f => fs.copyFileSync(path.join(sd, f), path.join(tmp, 'muse-tab/site', f)));
    fs.appendFileSync(path.join(tmp, 'muse-tab/site/help.html'), '\n<p>书写 › 排版 › 播放 › 输出</p>\n<p>新版四步工作流</p>\n<p>切到四步模式</p>\n<!-- 书写 › 排版 › 播放（注释不拦） -->\n'
      /* ENG-9 同义写法（实体 / ASCII / 全角 / 箭头 / 顿号）——各 1 处 */
      + '<p>书写 &gt; 排版 &gt; 播放</p>\n<p>书写 → 排版 → 播放 → 输出</p>\n<p>书写&rsaquo;排版&rsaquo;播放</p>\n<p>书写 ＞ 排版 ＞ 播放</p>\n<p>书写、排版、播放、输出四步</p>\n<p>书写 &#8250; 排版 &#8250; 播放</p>\n'
      /* NU-2 内部用语——1 处 */
      + '<p>此处换页：需负责人拍板，下一批</p>\n');
    let st = 0, out = '';
    try { cp.execFileSync(process.execPath, [path.join(tmp, 'deploy/check-wording.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { st = e.status || 1; out = String(e.stderr || ''); }
    fs.rmSync(tmp, { recursive: true, force: true });
    const n = (out.match(/拍板为三步/g) || []).length, nj = (out.match(/内部开发 \/ 流程用语/g) || []).length;
    T(has && repo === 0 && st === 1 && n === 9 && nj === 1,
      'H9 措辞闸：RULES 含三步规则（分隔符 › / &rsaquo; / &#8250; / &gt; / ＞ / → / 、 都拦）、「四步工作流|四步模式」与内部用语规则；仓库 0 命中；注入副本退出码 1：三步口径恰好 9 处（原 3 处 + ENG-9 六种同义写法；注释不拦）、内部用语 1 处（NU-2）', J({ has, repo, st, n, nj }));
  } catch (e) { T(false, 'H9 执行异常', e.message.split('\n')[0]); }

  T(errs.length === 0, 'H10 全程无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
