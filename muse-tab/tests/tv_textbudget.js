'use strict';
/* v68.7 S0 文字预算（界面简约化：方案 docs/design-2026-10g/README.md ② P1–P4 与护栏、⑤；规格 v68.7 §6.C2 / §9）。
   复跑方案阶段文字量审计的 37 屏（1440×900 浅色 30 屏 + 390×844 手机 7 屏；工具入库在 tests/lib/textaudit/，口径见 research/01-text-audit.md），
   对照基线 tests/textbudget_ref.json（v68.6 · 5cddfb8，UPDATE_REF=1 生成）。每屏一个新上下文、一个浏览器、顺序跑，单跑约 4 分钟。
   TB1  37 屏都跑通：动作无异常、无页面脚本错误、读到 APP_VER
   TB2  每屏「只降不升」：总字 / 说明字 / 说明行 / 带副标题按钮 / 悬停字 / 可点控件组 / P3 / 屏内同名组 各 ≤ 基线
        （确有合理增加的项只能写进 ref 的 allow:{屏:{指标:{max:上限, why:'理由'}}}，并在提交说明里点名；v68.7 收尾 BUD-4：allow 带上限，
         只放行到 max 为止——此前写字符串＝整项豁免、以后涨到多少都不报。旧写法（字符串）不再放行）
   TB3  ≥3 处入口的功能（K 口径）≤ 基线
   验收线（规格 §9；TB_PHASE=track 时只打印 ℹ️ 不判——三轨各自分支上改动不全，集成后缺省模式全部判）：
   TBA1 书写 5 屏说明字平均 ≤30（且每屏 ≤ 基线）           TBA2 菜单焦点层（11 层合计，menu-save 层没有菜单按 0 计）说明占比 ≤10%
   TBA3 S1 范围 20 屏带副标题按钮＝0                       TBA4 P3＝0（桌面 30 屏去掉帮助 / 导览 / 偏好共 25 屏：可见 + title + placeholder + data-why）
   TBA5 ≥3 处入口的功能（K 口径）≤5
   TBG1 护栏：书写 5 屏悬停总字数 ≤ 基线的 50%（另打印对 v68.2 的比例，ℹ️ 不判）   TBG2 护栏：书写 5 屏可点控件组 ≤ 基线
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
      note: 'v68.7 S0 文字预算基线：f83ux 审计 37 屏复跑（tests/lib/textaudit）；P3 比规格 §1.3 多扫 placeholder / data-why；入口按 K 口径（规格 §1.5）',
      screens: scr, menus11: S.menus11, write5: S.write5, s1sub: S.s1sub, p3x: S.p3x, fun3K: S.fun3K.length, fun3orig: S.fun3orig.length,
      fun3KList: S.fun3K.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）'), fun3origList: S.fun3orig.map(x => x.f + ' ' + x.n),
      accept: { write5AvgDesc: 30, menus11Share: 10, s1sub: 0, p3x: 0, fun3K: 5, hoverPct: 50 },
      v682: { write5Hover: [1548, 1752, 1637, 1535, 1707], write5ClickGrp: [79, 70, 75, 73, 76], write5AvgDesc: 110.6, menus11Share: 66.3, fun3orig: 14, fun3K: 12 },
      allow: old.allow || {} };
    fs.writeFileSync(REFF, JSON.stringify(ref, null, 1) + '\n');
    console.log(lines.join('\n'));
    console.log('已写基线 ' + path.relative(process.cwd(), REFF) + '：' + ver + ' ' + commit + ' md5 ' + md5 + ' · 书写 5 屏说明 ' + J(S.write5.desc) + ' 平均 ' + S.write5.avgDesc + ' · 菜单层 ' + J(S.menus11) + ' · S1 副标 ' + S.s1sub + ' · P3 ' + S.p3x + ' · ≥3 入口 K ' + S.fun3K.length + ' / 原 ' + S.fun3orig.length);
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
    /* TB3 */
    if (all) T(S.fun3K.length <= ref.fun3K, 'TB3 ≥3 处入口的功能（K 口径）' + S.fun3K.length + ' ≤ 基线 ' + ref.fun3K + '（原口径 ' + S.fun3orig.length + '，基线 ' + ref.fun3orig + '）', S.fun3K.map(x => x.f + ' ' + x.n + '（' + x.places.join(' · ') + '）').join('；'));
    else lines.push('ℹ️ TB3 ONLY 部分屏：入口表需要 30 个桌面屏，不判');
    /* 验收线 */
    const w5 = M.WRITE5.filter(id => S.screens[id]);
    if (w5.length) {
      const each = w5.every(id => S.screens[id].desc <= ref.screens[id].desc);
      ACC(S.write5.avgDesc <= ref.accept.write5AvgDesc && each, 'TBA1 书写 5 屏说明字平均 ' + S.write5.avgDesc + ' ≤ ' + ref.accept.write5AvgDesc + '（基线 ' + ref.write5.avgDesc + '）且每屏 ≤ 基线', w5.map(id => id + ' ' + ref.screens[id].desc + '→' + S.screens[id].desc).join(' · '));
    }
    if (all) ACC(S.menus11.share <= ref.accept.menus11Share, 'TBA2 菜单焦点层（11 层合计）说明占比 ' + S.menus11.share + '% ≤ ' + ref.accept.menus11Share + '%（基线 ' + ref.menus11.share + '%）', '总 ' + S.menus11.total + ' / 说明 ' + S.menus11.desc + ' · 项 ' + S.menus11.items + ' / 带副标 ' + S.menus11.withSub + ' · ' + M.M11.map(id => id + ' ' + (S.screens[id].focus ? S.screens[id].focus.desc + '/' + S.screens[id].focus.total : '0/0')).join(' '));
    const s1 = M.S1SUB.filter(id => S.screens[id]);
    if (s1.length) ACC(S.s1sub === 0, 'TBA3 S1 范围 ' + s1.length + ' 屏带副标题按钮 ' + S.s1sub + ' ＝ 0（基线 ' + ref.s1sub + '）', s1.filter(id => S.screens[id].btnWithSub).map(id => id + ' ' + S.screens[id].btnWithSub + ' ' + J(S.screens[id]._subs.slice(0, 3))).join('；'));
    ACC(S.p3x === 0, 'TBA4 P3 指路词（桌面去掉帮助 / 导览 / 偏好）' + S.p3x + ' ＝ 0（基线 ' + ref.p3x + '）', Object.entries(S.screens).filter(([id, x]) => x.p3 && R[id].vp[0] >= 800 && M.S4X.indexOf(id) < 0).map(([id, x]) => id + ' ' + J([].concat(x._p3.vis, x._p3.title.map(t => '〔悬停〕' + t), x._p3.why.map(t => '〔why〕' + t)).map(t => String(t).slice(0, 40)))).join('；').slice(0, 1600));
    lines.push('ℹ️ P3 同义观察（只报告，v68.7 收尾 BUD-3：下面的 / 上面的 / 旁的按钮 / 右端 / 左端…，范围同 TBA4）：' + (S.p3syn.length ? S.p3syn.join('；').slice(0, 800) : '0'));
    if (all) ACC(S.fun3K.length <= ref.accept.fun3K, 'TBA5 ≥3 处入口的功能（K 口径）' + S.fun3K.length + ' ≤ ' + ref.accept.fun3K + '（基线 ' + ref.fun3K + '）', S.fun3K.map(x => x.f + ' ' + x.n).join(' · '));
    if (w5.length) {
      const lim = w5.map(id => Math.floor(ref.screens[id].hoverChars * ref.accept.hoverPct / 100));
      ACC(w5.every((id, i) => S.screens[id].hoverChars <= lim[i]), 'TBG1 护栏：书写 5 屏悬停总字数 ≤ 基线的 ' + ref.accept.hoverPct + '%', w5.map((id, i) => id + ' ' + S.screens[id].hoverChars + ' / ' + lim[i]).join(' · '));
      const v = ref.v682 && ref.v682.write5Hover; if (v) lines.push('ℹ️ TBG1 对 v68.2 的比例（不判）：' + w5.map((id, i) => id + ' ' + (S.screens[id].hoverChars / v[M.WRITE5.indexOf(id)] * 100).toFixed(0) + '%').join(' · '));
      ACC(w5.every(id => S.screens[id].clickGrp <= ref.screens[id].clickGrp), 'TBG2 护栏：书写 5 屏可点控件组 ≤ 基线', w5.map(id => id + ' ' + ref.screens[id].clickGrp + '→' + S.screens[id].clickGrp).join(' · '));
    }
  }
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + ' md5 ' + md5 + (TRACK ? '；TB_PHASE=track' : '') + '）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.log('❌ 执行异常: ' + (e && e.stack || e)); process.exit(1); });
