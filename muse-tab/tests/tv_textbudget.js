'use strict';
/* v68.7 S0 文字预算（界面简约化：方案 docs/design-2026-10g/README.md ② P1–P4 与护栏、⑤；规格 v68.7 §6.C2 / §9）。
   复跑方案阶段文字量审计的 37 屏（1440×900 浅色 30 屏 + 390×844 手机 7 屏；工具入库在 tests/lib/textaudit/，口径见 research/01-text-audit.md），
   对照基线 tests/textbudget_ref.json（v68.6 · 5cddfb8，UPDATE_REF=1 生成）。每屏一个新上下文、一个浏览器、顺序跑，单跑约 4 分钟。
   TB1  37 屏都跑通：动作无异常、无页面脚本错误、读到 APP_VER
   TB2  每屏「只降不升」：总字 / 说明字 / 说明行 / 带副标题按钮 / 悬停字 / 可点控件组 / P3 / 屏内同名组 各 ≤ 基线
        （确有合理增加的项只能写进 ref 的 allow:{屏:{指标:{max:上限, why:'理由'}}}，并在提交说明里点名；v68.7 收尾 BUD-4：allow 带上限，
         只放行到 max 为止——此前写字符串＝整项豁免、以后涨到多少都不报。旧写法（字符串）不再放行）
   TB3  ≥3 处入口的功能（K 口径）≤ 基线
   TB4  v68.8 审计口径（P3）：状态栏位置读数 #flw-st-pos 记读数（num），不随小节号位数变成说明字——不进 37 屏、不改基线，另跑 4 屏：
        TB4a 送别光标停在第 12 小节：读数组「第 12/16 小节 · 1 拍」k＝num，该屏说明字 / 说明行与 write-songbie（光标在第 1 小节）相同；
        TB4b 反例：状态栏别处放同文字的 span → desc；读数后追加一句 → 整组 desc；#flw-st-pos 的悬停全称 → 仍 desc（只认这个元素 + 这个格式）。
        ONLY 不设或含 TB4 时才跑（ONLY=TB4 只跑这一项）。
   验收线（规格 §9；TB_PHASE=track 时只打印 ℹ️ 不判——三轨各自分支上改动不全，集成后缺省模式全部判）：
   TBA1 书写 5 屏说明字平均 ≤30（且每屏 ≤ 基线）           TBA2 菜单焦点层（11 层合计，menu-save 层没有菜单按 0 计）说明占比 ≤10%
   TBA3 S1 范围 20 屏带副标题按钮＝0                       TBA4 P3＝0（桌面 30 屏去掉帮助 / 导览 / 偏好共 25 屏：可见 + title + placeholder + data-why）
   TBA5 ≥3 处入口的功能（K 口径）≤5
   TBG1 护栏：书写 5 屏悬停总字数 ≤ 基线的 50%（另打印对 v68.2 的比例，ℹ️ 不判）   TBG2 护栏：书写 5 屏可点控件组 ≤ 基线
   v69.1 REG-5（规格 v69.1 §6.3）：基线前移到 v69.0（658d425）；「智能 ▾」画廊立屏 menu-smart，菜单焦点层 12 层（TBA2）；
   屏内同名去掉命令面板区、放行「主按钮 × 模式条」一对（排版 / 输出）；TB3 / TBA5 改入口 P4 口径（启动台 / 新建面板不计、快速新建并入文件 ▾、填词拆两功能），
   K 口径与原口径照打印。本版新增验收：
   TBA6 新建面板两屏（newpanel / newpanel-pacc）总字 ≤120 且说明字 0     TBA7 启动台总字 ≤70 且说明字 0
   TBA8 桌面 30 屏屏内同名组（新口径）＝0                                  TBA9 排版 / 输出两屏说明字 0
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=屏id,… 只跑部分屏（TB3 / TBA2 / TBA5 等全局项只打印）· TB_PHASE=track ·
        UPDATE_REF=1 重写基线（保留已有 allow；TB_REF_COMMIT 写进 commit 字段，缺省 git HEAD）· SHOTS=目录 每屏截图 · TB_RAW=文件 存原始抽取 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const { STATES, BASE, runState } = require('./lib/textaudit/states.js');
const M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : BASE;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const TRACK = process.env.TB_PHASE === 'track';
const UPDATE = process.env.UPDATE_REF === '1';
const SHOTS = process.env.SHOTS || '';
const REFF = path.join(__dirname, 'textbudget_ref.json');
const KEYS = ['total', 'desc', 'descLines', 'btnWithSub', 'hoverChars', 'clickGrp', 'p3', 'dup'];
const KN = { total: '总字', desc: '说明字', descLines: '说明行', btnWithSub: '带副标题按钮', hoverChars: '悬停字', clickGrp: '可点控件组', p3: 'P3', dup: '屏内同名组' };
const J = x => JSON.stringify(x);

(async () => {
  const t0 = Date.now();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const R = {};
  for (const s of STATES) {
    if (ONLY.length && !ONLY.includes(s.id)) continue;
    R[s.id] = await runState(b, s, { base: URL0, shots: SHOTS || null });
    const x = M.screen(R[s.id]);
    console.log('  · ' + s.id.padEnd(14) + ' 总字 ' + x.total + ' 说明 ' + x.desc + ' 行 ' + x.descLines + ' 副标 ' + x.btnWithSub + ' 悬停 ' + x.hoverChars + ' 控件组 ' + x.clickGrp + ' P3 ' + x.p3 + ' 同名 ' + x.dup
      + (R[s.id].err ? '  动作异常：' + R[s.id].err : '') + (R[s.id].pageErrs.length ? '  页面错误：' + R[s.id].pageErrs[0] : ''));
  }
  /* TB4（v68.8 ③）：不进 37 屏与基线；write-songbie 没跑（ONLY）时补跑一份作对照 */
  let R4 = null;
  if (!ONLY.length || ONLY.includes('TB4')) {
    const W = ms => new Promise(r => setTimeout(r, ms));
    const m12 = async pg => { await pg.evaluate(() => __scn('songbie')); await W(800);
      await pg.evaluate(() => { sel = { mi: 11, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} }); await W(1200); };
    const S4 = {
      m12: { id: 'write-songbie-m12', name: '书写 · 送别（光标停在第 12 小节）', go: m12, focus: null },
      fake: { id: 'tb4-fake', name: 'TB4b 反例：状态栏别处放同文字', focus: null, go: async pg => { await m12(pg);
        await pg.evaluate(() => { const p = document.getElementById('flw-st-pos'); p.insertAdjacentHTML('afterend', '<span id="tb4-fake" class="flw-st-txt">' + p.textContent + '</span>'); }); await W(200); } },
      more: { id: 'tb4-more', name: 'TB4b 反例：读数后追加一句', focus: null, go: async pg => { await m12(pg);
        await pg.evaluate(() => { document.getElementById('flw-st-pos').insertAdjacentHTML('beforeend', '<span>这是一句说明文字</span>'); }); await W(200); } }
    };
    R4 = {};
    for (const [k, s] of Object.entries(S4)) R4[k] = await runState(b, s, { base: URL0, shots: SHOTS || null });
    R4.s1 = R['write-songbie'] || await runState(b, STATES.find(x => x.id === 'write-songbie'), { base: URL0, shots: null });
  }
  await b.close();
  if (process.env.TB_RAW) fs.writeFileSync(process.env.TB_RAW, J(R));
  const S = M.summarize(R);
  const all = !ONLY.length;
  const md5 = (() => { try { return crypto.createHash('md5').update(fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''))).digest('hex'); } catch (_) { return ''; } })();
  const ver = (Object.values(R).find(x => x.meta && x.meta.ver) || { meta: {} }).meta.ver || null;

  let pass = 0, total = 0; const lines = [];
  const T = (ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const INFO = (ok, name, d) => lines.push('ℹ️ ' + (ok ? '〔达标〕' : '〔未达标〕') + name + (d ? ': ' + d : ''));
  const ACC = (ok, name, d) => (TRACK || !all) ? INFO(ok, name + (TRACK ? '（TB_PHASE=track 只打印）' : '（ONLY 部分屏只打印）'), d) : T(ok, name, d);

  /* TB1 */
  const bad1 = Object.values(R).filter(x => x.err || x.pageErrs.length || !x.meta || !x.meta.ver).map(x => x.id + ':' + (x.err || x.pageErrs[0] || '无 APP_VER'));
  T(!bad1.length && (!all || Object.keys(R).length === 37), 'TB1 ' + Object.keys(R).length + ' 屏都跑通：动作无异常、无页面脚本错误、读到 APP_VER（' + ver + '）', bad1.slice(0, 4).join(' | '));

  if (UPDATE) {
    let old = {}; try { old = JSON.parse(fs.readFileSync(REFF, 'utf8')); } catch (_) {}
    let commit = process.env.TB_REF_COMMIT || ''; if (!commit) try { commit = execFileSync('git', ['-C', __dirname, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) {}
    if (!all || bad1.length) { console.log(lines.join('\n')); console.log('UPDATE_REF 需要 37 屏全部跑通，未写基线'); process.exit(1); }
    const scr = {}; Object.entries(S.screens).forEach(([id, x]) => { scr[id] = { total: x.total, desc: x.desc, descLines: x.descLines, btnWithSub: x.btnWithSub, hoverChars: x.hoverChars, hoverN: x.hoverN, clickGrp: x.clickGrp, p3: x.p3, dup: x.dup, focus: x.focus }; });
    const ref = { version: ver, commit, indexMd5: md5, generated: new Date().toISOString().slice(0, 10),
      note: 'v69.1 REG-5：基线前移到 v69.0 658d425；画廊立屏 menu-smart、菜单层 12；同名去 menu:cmd、放行主按钮×模式条；入口 P4 口径（此前：v68.7 S0 文字预算基线，f83ux 审计 37 屏复跑，tests/lib/textaudit；P3 多扫 placeholder / data-why）',
      screens: scr, menus12: S.menus12, write5: S.write5, s1sub: S.s1sub, p3x: S.p3x, fun3K: S.fun3K.length, fun3orig: S.fun3orig.length, fun3P4: S.fun3P4.length,
      fun3KList: S.fun3K.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）'), fun3origList: S.fun3orig.map(x => x.f + ' ' + x.n),
      fun3P4List: S.fun3P4.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）'),
      accept: { write5AvgDesc: 30, menus12Share: 10, s1sub: 0, p3x: 0, fun3P4: 0, hoverPct: 50, newpanel: 120, startpad: 70 },
      v682: { write5Hover: [1548, 1752, 1637, 1535, 1707], write5ClickGrp: [79, 70, 75, 73, 76], write5AvgDesc: 110.6, menus11Share: 66.3, fun3orig: 14, fun3K: 12 },
      /* v69.1 REG-5：max ≤ 新基线值的 allow 作废（基线已前移），只留仍高于新基线的 */
      allow: Object.fromEntries(Object.entries(old.allow || {}).map(([id, o]) => [id, Object.fromEntries(Object.entries(o).filter(([k, a]) => a && typeof a === 'object' && scr[id] && a.max > scr[id][k]))]).filter(([, o]) => Object.keys(o).length)) };
    fs.writeFileSync(REFF, JSON.stringify(ref, null, 1) + '\n');
    console.log(lines.join('\n'));
    console.log('已写基线 ' + path.relative(process.cwd(), REFF) + '：' + ver + ' ' + commit + ' md5 ' + md5 + ' · 书写 5 屏说明 ' + J(S.write5.desc) + ' 平均 ' + S.write5.avgDesc + ' · 菜单层 12 ' + J(S.menus12) + ' · S1 副标 ' + S.s1sub + ' · P3 ' + S.p3x + ' · ≥3 入口 P4 ' + S.fun3P4.length + ' / K ' + S.fun3K.length + ' / 原 ' + S.fun3orig.length);
    console.log(`PASS ${pass}/${total}`); process.exit(pass === total ? 0 : 1);
  }

  let ref = null; try { ref = JSON.parse(fs.readFileSync(REFF, 'utf8')); } catch (e) { T(false, 'TB0 读基线 tests/textbudget_ref.json', e.message); }
  if (ref) {
    const allow = ref.allow || {};
    /* TB2 每屏只降不升 */
    const rows = [];
    Object.entries(S.screens).forEach(([id, x]) => { const r = ref.screens[id]; if (!r) { T(false, 'TB2 ' + id + ' 基线里没有这一屏'); return; }
      const lim = k => { const a = allow[id] && allow[id][k]; return (a && typeof a === 'object' && typeof a.max === 'number') ? Math.max(r[k], a.max) : r[k]; };
      const up = KEYS.filter(k => x[k] > lim(k));
      const dl = KEYS.filter(k => x[k] !== r[k]).map(k => KN[k] + ' ' + r[k] + '→' + x[k]).join(' · ');
      rows.push({ id, up, dl });
      T(!up.length, 'TB2 ' + id + ' 各项 ≤ 基线' + (dl ? '（' + dl + '）' : '（与基线相同）'), up.length ? '升高：' + up.map(k => KN[k] + ' ' + r[k] + (lim(k) > r[k] ? '（allow 上限 ' + lim(k) + '）' : '') + '→' + x[k] + ' 〔' + (k === 'p3' ? J(x._p3) : k === 'btnWithSub' ? J(x._subs.slice(0, 4)) : k === 'dup' ? J(x._dups) : '') + '〕').join('；') : '');
    });
    const allowed = Object.entries(allow).map(([id, o]) => id + ':' + Object.entries(o).map(([k, a]) => k + (a && typeof a === 'object' ? '≤' + a.max : '（字符串，不放行）')).join('/')).join(' ');
    if (allowed) lines.push('ℹ️ TB2 allow：' + allowed);
    /* TB3（v69.1 REG-5：P4 口径判；K / 原口径照打印） */
    const p4ref = ref.fun3P4 != null ? ref.fun3P4 : ref.fun3K;
    if (all) { T(S.fun3P4.length <= p4ref, 'TB3 ≥3 处入口的功能（P4 口径）' + S.fun3P4.length + ' ≤ 基线 ' + p4ref + '（K 口径 ' + S.fun3K.length + '，基线 ' + ref.fun3K + '；原口径 ' + S.fun3orig.length + '，基线 ' + ref.fun3orig + '）', S.fun3P4.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）').join('；'));
      lines.push('ℹ️ TB3 K 口径 ≥3：' + (S.fun3K.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）').join('；') || '0'));
      /* v69.1 收尾 V4：口径披露——README P4 原文（新建面板计入）的数字，待负责人追认「新建面板不计」前一并打印 */
      lines.push('ℹ️ TB3 P4s 口径（README 原文：新建面板计入，待追认）≥3：' + S.fun3P4s.length + (S.fun3P4s.length ? '：' + S.fun3P4s.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）').join('；') : '')); }
    else lines.push('ℹ️ TB3 ONLY 部分屏：入口表需要 30 个桌面屏，不判');
    /* 验收线 */
    const w5 = M.WRITE5.filter(id => S.screens[id]);
    if (w5.length) {
      const each = w5.every(id => S.screens[id].desc <= ref.screens[id].desc);
      ACC(S.write5.avgDesc <= ref.accept.write5AvgDesc && each, 'TBA1 书写 5 屏说明字平均 ' + S.write5.avgDesc + ' ≤ ' + ref.accept.write5AvgDesc + '（基线 ' + ref.write5.avgDesc + '）且每屏 ≤ 基线', w5.map(id => id + ' ' + ref.screens[id].desc + '→' + S.screens[id].desc).join(' · '));
    }
    const mref = ref.menus12 || ref.menus11, mshare = ref.accept.menus12Share != null ? ref.accept.menus12Share : ref.accept.menus11Share;
    if (all) ACC(S.menus12.share <= mshare, 'TBA2 菜单焦点层（12 层合计，含「智能 ▾」画廊）说明占比 ' + S.menus12.share + '% ≤ ' + mshare + '%（基线 ' + mref.share + '%）', '总 ' + S.menus12.total + ' / 说明 ' + S.menus12.desc + ' · 项 ' + S.menus12.items + ' / 带副标 ' + S.menus12.withSub + ' · ' + M.M12.map(id => id + ' ' + (S.screens[id].focus ? S.screens[id].focus.desc + '/' + S.screens[id].focus.total : '0/0')).join(' '));
    const s1 = M.S1SUB.filter(id => S.screens[id]);
    if (s1.length) ACC(S.s1sub === 0, 'TBA3 S1 范围 ' + s1.length + ' 屏带副标题按钮 ' + S.s1sub + ' ＝ 0（基线 ' + ref.s1sub + '）', s1.filter(id => S.screens[id].btnWithSub).map(id => id + ' ' + S.screens[id].btnWithSub + ' ' + J(S.screens[id]._subs.slice(0, 3))).join('；'));
    ACC(S.p3x === 0, 'TBA4 P3 指路词（桌面去掉帮助 / 导览 / 偏好）' + S.p3x + ' ＝ 0（基线 ' + ref.p3x + '）', Object.entries(S.screens).filter(([id, x]) => x.p3 && R[id].vp[0] >= 800 && M.S4X.indexOf(id) < 0).map(([id, x]) => id + ' ' + J([].concat(x._p3.vis, x._p3.title.map(t => '〔悬停〕' + t), x._p3.why.map(t => '〔why〕' + t)).map(t => String(t).slice(0, 40)))).join('；').slice(0, 1600));
    lines.push('ℹ️ P3 同义观察（只报告，v68.7 收尾 BUD-3：下面的 / 上面的 / 旁的按钮 / 右端 / 左端…，范围同 TBA4）：' + (S.p3syn.length ? S.p3syn.join('；').slice(0, 800) : '0'));
    const a5 = ref.accept.fun3P4 != null ? ref.accept.fun3P4 : ref.accept.fun3K;
    if (all) ACC(S.fun3P4.length <= a5, 'TBA5 ≥3 处入口的功能（P4 口径）' + S.fun3P4.length + ' ≤ ' + a5 + '（基线 ' + p4ref + '）', S.fun3P4.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）').join(' · '));
    /* v69.1 本版新增验收 TBA6–TBA9（新口径） */
    const sx = id => S.screens[id], np = ['newpanel', 'newpanel-pacc'].filter(sx), npl = (ref.accept.newpanel || 120), spl = (ref.accept.startpad || 70);
    if (np.length) ACC(np.every(id => sx(id).total <= npl && sx(id).desc === 0), 'TBA6 新建面板总字 ≤' + npl + ' 且说明字 0', np.map(id => id + ' ' + sx(id).total + '/' + sx(id).desc).join(' · '));
    if (sx('startpad')) ACC(sx('startpad').total <= spl && sx('startpad').desc === 0, 'TBA7 启动台总字 ≤' + spl + ' 且说明字 0', sx('startpad').total + '/' + sx('startpad').desc);
    const d30 = Object.keys(S.screens).filter(id => R[id].vp[0] >= 800);
    if (d30.length) ACC(d30.every(id => sx(id).dup === 0), 'TBA8 桌面 ' + d30.length + ' 屏屏内同名组（新口径：命令面板不计、主按钮 × 模式条放行）＝0', d30.filter(id => sx(id).dup).map(id => id + ' ' + J(sx(id)._dups)).join('；') + ' ｜放行（排版，10-24 已定）：' + d30.filter(id => sx(id)._dupsExempt.length).map(id => id + ' ' + J(sx(id)._dupsExempt)).join('；')
      + ' ｜待追认（主按钮 × 模式条其余同名）：' + (d30.filter(id => (sx(id)._dupsPending || []).length).map(id => id + ' ' + J(sx(id)._dupsPending)).join('；') || '0'));
    const eo = ['engrave', 'output'].filter(sx);
    if (eo.length) ACC(eo.every(id => sx(id).desc === 0), 'TBA9 排版 / 输出说明字 0', eo.map(id => id + ' ' + sx(id).desc).join(' · '));
    if (w5.length) {
      const hb = (ref.accept.hoverBase || {}).screens || {};   /* v69.1 集成：TBG1 基线固定在简约化前（accept.hoverBase，REG-5 前移逐屏基线不影响这条护栏） */
      const lim = w5.map(id => Math.floor((hb[id] || ref.screens[id].hoverChars) * ref.accept.hoverPct / 100));
      ACC(w5.every((id, i) => S.screens[id].hoverChars <= lim[i]), 'TBG1 护栏：书写 5 屏悬停总字数 ≤ 基线的 ' + ref.accept.hoverPct + '%', w5.map((id, i) => id + ' ' + S.screens[id].hoverChars + ' / ' + lim[i]).join(' · '));
      const v = ref.v682 && ref.v682.write5Hover; if (v) lines.push('ℹ️ TBG1 对 v68.2 的比例（不判）：' + w5.map((id, i) => id + ' ' + (S.screens[id].hoverChars / v[M.WRITE5.indexOf(id)] * 100).toFixed(0) + '%').join(' · '));
      ACC(w5.every(id => S.screens[id].clickGrp <= ref.screens[id].clickGrp), 'TBG2 护栏：书写 5 屏可点控件组 ≤ 基线', w5.map(id => id + ' ' + ref.screens[id].clickGrp + '→' + S.screens[id].clickGrp).join(' · '));
    }
  }
  /* TB4 */
  if (R4) {
    const P = '#flw-st-pos', gOf = (r, re) => (r.groups || []).find(x => re.test(x.el)), errOf = r => r.err || (r.pageErrs || [])[0] || '';
    const g = gOf(R4.m12, /#flw-st-pos/), x12 = M.screen(R4.m12), x1 = M.screen(R4.s1);
    T(!!g && g.text === '第 12/16 小节 · 1 拍' && g.k === 'num' && x12.desc === x1.desc && x12.descLines === x1.descLines && !errOf(R4.m12) && !errOf(R4.s1),
      'TB4a 状态栏位置读数记读数：送别光标停在第 12 小节，' + P + ' 组「第 12/16 小节 · 1 拍」k＝num；该屏说明字 / 说明行与光标在第 1 小节时（write-songbie）相同（两位数小节不再多出 9 个说明字）',
      J({ g: g && { text: g.text, k: g.k, n: g.n }, m12: { total: x12.total, desc: x12.desc, descLines: x12.descLines }, m1: { total: x1.total, desc: x1.desc, descLines: x1.descLines }, err: errOf(R4.m12) || errOf(R4.s1) || undefined }));
    const gf = gOf(R4.fake, /#tb4-fake/), gm = gOf(R4.more, /#flw-st-pos/), tt = (R4.m12.titles || []).find(x => /#flw-st-pos/.test(x.el));
    T(!!g && !!gf && gf.text === g.text && gf.k === 'desc' && !!gm && gm.k === 'desc' && /这是一句说明文字$/.test(gm.text) && !!tt && tt.k === 'desc' && tt.text === '第 12 小节，共 16 · 第 1 拍' && !errOf(R4.fake) && !errOf(R4.more),
      'TB4b 反例（只认这个元素 + 这个格式）：状态栏别处同文字的 span → desc；' + P + ' 读数后追加一句 → 整组 desc；' + P + ' 的悬停全称 → 仍 desc（计入悬停字数）',
      J({ fake: gf && { text: gf.text, k: gf.k }, more: gm && { text: gm.text, k: gm.k }, title: tt && { text: tt.text, k: tt.k }, err: errOf(R4.fake) || errOf(R4.more) || undefined }));
  }
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + ' md5 ' + md5 + (TRACK ? '；TB_PHASE=track' : '') + '）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.log('❌ 执行异常: ' + (e && e.stack || e)); process.exit(1); });
