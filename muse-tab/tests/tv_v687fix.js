'use strict';
/* v68.7 收尾回归（简约化 S0+S1 集成后三镜头验收：budget / function / teacher 的发现逐条修复）。全部只在新外壳（缺省）下量；旧外壳零差异由 tv_shellflow / tv_trktree / tv_modes 对拍。
   每条断言都在修前（13cf7cb，MUSETAB_URL 指向它）为红、修后为绿——修前红的依据写在各条描述末尾〔修前：…〕。
   V1  FN-1 命令面板「联排高音谱号 / 联排低音谱号」各是一条真命令（委托 #tn-clef-g / #tn-clef-f）：搜名称回车只改 song.tabClef、联排照开；联排没开时两条灰显「先开五线谱联排」〔修前：首条是「五线谱联排」开关，回车把联排关掉〕
   V2  FN-7 / TCH-3 旧名与常用词的首条：「存为文件 .mtab.json」→ 存为文件 ·「打开我的曲谱」→ 我的曲谱 ·「低音 / 高音」→ 低八度 / 高八度 ·「mid / xml」→ 导出 MIDI / MusicXML ·
       「作词 / 作曲 / 词作者」→ 曲谱信息〔修前：前两条无结果、低音高音给「本轨谱号」、mid xml 给「从已有音乐」、作词作曲无结果〕
   V3  TCH-1 / FN-5 状态栏位置读数带单位「第 4/N 小节 · 1 拍」（多选「第 2–4/N 小节」）——不再是「4/8 · 1」这种拍号形状；可见读数 aria-hidden，
       读屏读 #flw-st-posr 全称；音轨区谱类芯片的「谱类：」是视觉隐藏字（无 role 的 span 不挂 aria-label）〔修前：「4/N · 1」、无 #flw-st-posr、芯片 aria-label〕
   V4  TCH-2 状态栏 ⋯ 名称点到时值检查（「更多：播放 · 时值检查」）；「自由编辑 / 修复建议」各带结果灰值「只标错 / 给建议」〔修前：「更多播放设置」、两档没有灰值〕
   V5  TCH-5 ⋯「音色库」没得换时不画锁、原因写换乐器音色的去处（≤16 字）；命令面板同一句〔修前：锁 +「已是默认音色库」〕
   V6  TCH-6 / TCH-7 / TCH-9 菜单名称：六线谱轨「更多 ▾」不出「作用于 · 吉他1全曲」头（下面两项都锁着），旋律轨照出；「拆分音符 / 合并音符 / 清除此音」；
       音轨 ⋯「MIDI 覆盖…」〔修前：有矛盾的头、「拆分 / 合并 / 清单音」、「覆盖本轨…」〕
   V7  BUD-1 / TCH-4 记号面板混合档（缺省）：打开弹窗的格（更多力度 · 速度 · 转调 · 拍号 · N 连音 · 段落标记）占两格宽、带 2 字；纯记号格（mf、3 连音）仍 36×36 只画字形〔修前：全是 36 格无字，更多力度画成 mf〕
   V8  FN-2 排版右栏「版式」的「整体缩放」滑杆照出（一步 2%）：设 0.96 → 版式缩放 0.96〔修前：滑杆行被藏，新外壳设不出 96%〕
   V9  FN-3 新窗口类提示条「撤销」（刚建 / 刚导入、没改过）关窗不转存进「我的曲谱」〔修前：库 +1、提示「已关闭 · 已存入」〕
   V10 FN-4 逐字填词 Esc 后焦点回当前旋律轨行（不掉到 body）；再按 → 留在音轨树里（光标不动），5 写在原列——与 5cddfb8（焦点回「填词」钮）逐列相同〔修前：焦点 BODY，→ 把光标移到下一列、5 写进下一列〕
   V11 FN-6 帮助弹窗「界面一览」不再介绍已撤的入口（「由此生成六线谱轨」子行、谱类芯片换谱类、属性页时值检查方式），⋯ 更多写明时值检查〔修前：三处旧描述〕
   V12 TCH-8 配伴奏 / 换织体提示条短文带范围、织体点名：「已配伴奏 · 第 1–4 小节」「已换柱式和弦 · 第 1–4 小节」〔修前：两条都是「已配伴奏 4 小节」〕
   V13 BUD-2 / BUD-3 / BUD-7 悬停与原因收短：排版右栏页码段 / 版宽 / 简谱小节号、输出预览排布、发布键的悬停 ≤16 字（快捷键 / 数值括注与灰显原因不计）；
       发布卡状态「仅存本机」不带同义指路；偏好「记号格」说明不指路；命令面板「和弦写法」置灰原因 ≤16；灰记号格原因 ≤16 且带限制；
       窄档竖条两键悬停只写名称；版宽提示条短文〔修前：长说明 / 指路句 / 26 字原因〕
   V14 BUD-6 快速新建 ▾ 首项名称只写「按上次 / 按默认」（≤6 字），谱类名进灰色当前值 .nf-qk〔修前：「按默认 · 吉他弹唱」7–9 字〕
   V15 BUD-4（静态）tests/textbudget_ref.json 的 allow 每项都是 {max, why}，max ≥ 基线且为整数（不再是整项豁免的字符串）〔修前：8 处字符串〕
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=V1,V3 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL ? (/^file:/.test(process.env.MUSETAB_URL) ? process.env.MUSETAB_URL : 'file://' + path.resolve(process.env.MUSETAB_URL)) : 'file://' + path.resolve(__dirname, '../index.html');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
const cnt = s => (String(s || '').match(/[\p{L}\p{N}]/gu) || []).length;
/* 悬停整条字数：去掉末尾一个括注（快捷键 / 数值范围＝括注里除「空格」外没有汉字；灰显原因＝运行时接上的「（原因）」）——同 deploy/check-wording.js title16 */
const tipN = t => { t = String(t || ''); const m = /（([^（）]*)）$/.exec(t); return cnt(m ? t.slice(0, m.index) : t); };
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) { pass++; console.log('✅ ' + name); } else { fails.push(name); console.log('❌ ' + name + (d ? '\n     ' + String(d).slice(0, 900) : '')); } };

function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__one = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.menu.close(); } catch (_) {}
    addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0);
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; selRange = null; render(); try { document.activeElement.blur(); } catch (_) {} };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__toastT = () => { const t = document.getElementById('toast'); if (!t) return ''; const n = [...t.childNodes].filter(x => !(x.nodeType === 1 && x.classList.contains('flw-ta'))); return n.map(x => x.textContent).join('').trim(); };
}
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } });
  await ctx.addInitScript(INIT);
  const pg = await ctx.newPage(); pg._errs = [];
  pg.on('pageerror', e => pg._errs.push(String(e.message || e).slice(0, 200)));
  await pg.goto(URL0); await pg.waitForFunction(() => typeof FLOW !== 'undefined' && FLOW.active && typeof PRESETS !== 'undefined', null, { timeout: 15000 }); await W(500);
  return pg;
}
const EV = (pg, f, a) => pg.evaluate(f, a);
/* 命令面板：搜 q，返回首条 id（不执行） */
async function cmdFirst(pg, q) {
  await pg.keyboard.press('Control+Slash'); await W(180); await pg.fill('#flw-cmdq', q); await W(180);
  return EV(pg, () => { const r = document.querySelector('#flw-cmdl .flw-cmdr'); return r ? { id: r.dataset.v, why: r.dataset.why || '', dis: r.getAttribute('aria-disabled') === 'true' } : null; });
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    /* ===== V1 / V2 命令面板 ===== */
    if (want('V1') || want('V2')) {
      const pg = await open(b);
      await EV(pg, () => __one(__P('小星星（分解弹唱）')));
      if (want('V1')) {
        await EV(pg, () => { mutate(() => { song.tabStaff = true; delete song.tabClef; }); render(); });
        const f1 = await cmdFirst(pg, '联排低音谱号'); await pg.keyboard.press('Enter'); await W(250);
        const a1 = await EV(pg, () => ({ st: !!song.tabStaff, clef: song.tabClef || null }));
        const f2 = await cmdFirst(pg, '联排高音谱号'); await pg.keyboard.press('Enter'); await W(250);
        const a2 = await EV(pg, () => ({ st: !!song.tabStaff, clef: song.tabClef || null }));
        await EV(pg, () => { mutate(() => { song.tabStaff = undefined; }); render(); });
        const f3 = await cmdFirst(pg, '联排低音谱号'); await pg.keyboard.press('Escape'); await W(120);
        T(f1 && f1.id === 'trk:tabcleff' && a1.st && a1.clef === 'bass' && f2 && f2.id === 'trk:tabclefg' && a2.st && a2.clef === null
          && f3 && f3.id === 'trk:tabcleff' && f3.dis && /先开五线谱联排/.test(f3.why),
          'V1 FN-1 命令面板「联排低音谱号」回车 → tabClef=bass、联排照开；「联排高音谱号」→ 删 tabClef；联排没开时灰显「先开五线谱联排」〔修前：首条 trk:tabstaff，回车把联排关掉〕', J({ f1, a1, f2, a2, f3 }));
      }
      if (want('V2')) {
        const Q = [['存为文件 .mtab.json', 'r1:file'], ['打开我的曲谱', 'r1:mine'], ['低音', 'r2:octdn'], ['高音', 'r2:octup'], ['mid', 'out:mid'], ['xml', 'out:mxl'],
          ['作词', 'r1:meta'], ['作曲', 'r1:meta'], ['词作者', 'r1:meta'], ['清单音', 'r2:clear'], ['拆分', 'r2:split']];
        const got = [];
        for (const [q] of Q) { const f = await cmdFirst(pg, q); got.push(f ? f.id : null); await pg.keyboard.press('Escape'); await W(100); }
        const bad = Q.filter(([q, id], i) => got[i] !== id).map(([q, id], i) => q + '→' + got[Q.findIndex(x => x[0] === q)] + '（应 ' + id + '）');
        T(!bad.length, 'V2 FN-7 / TCH-3 命令面板旧名与常用词首条：' + Q.map(x => x[0] + '→' + x[1]).join(' · ') + '〔修前：前两条无结果、低音高音给本轨谱号、mid xml 给从已有音乐、作词作曲无结果〕', bad.join('；'));
      }
      T(!pg._errs.length, 'V1–V2 页面无脚本错误', pg._errs.join(' | '));
      await pg.context().close();
    }
    /* ===== V3–V6 状态栏 · ⋯ · 菜单名称 ===== */
    if (['V3', 'V4', 'V5', 'V6'].some(want)) {
      const pg = await open(b);
      await EV(pg, () => __one(__P('小星星（分解弹唱）')));
      if (want('V3')) {
        await EV(pg, () => { sel = { mi: 3, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await W(250);
        const p = await EV(pg, () => { const e = document.getElementById('flw-st-pos'), r = document.getElementById('flw-st-posr'), k = document.getElementById('flw-kchip');
          return { vis: e && e.textContent, ah: e && e.getAttribute('aria-hidden'), sr: r ? r.textContent : null, srCls: r && r.className, N: song.measures.length,
            chipAl: k && k.getAttribute('aria-label'), chipSr: k && k.querySelector('.lb-sr') ? k.querySelector('.lb-sr').textContent : null }; });
        let snap = ''; try { snap = await pg.locator('#mixer-dock').ariaSnapshot(); } catch (e) { snap = 'ERR ' + e.message; }
        let snapT = ''; try { snapT = await pg.locator('#flw-thd').ariaSnapshot(); } catch (e) { snapT = 'ERR ' + e.message; }
        await EV(pg, () => { measureSel = null; measureRange = { m1: 1, m2: 3 }; render(); }); await W(250);
        const m = await EV(pg, () => ({ vis: document.getElementById('flw-st-pos').textContent, sr: (document.getElementById('flw-st-posr') || {}).textContent || null }));
        await EV(pg, () => { measureRange = null; render(); });
        T(new RegExp('^第 4/' + p.N + ' 小节 · 1 拍$').test(p.vis || '') && p.ah === 'true' && p.sr === '第 4 小节，共 ' + p.N + ' · 第 1 拍' && /lb-sr/.test(p.srCls || '')
          && snap.indexOf('第 4 小节，共 ' + p.N) >= 0 && !/\b4\/\d+ · 1\b/.test(snap) && new RegExp('^第 2–4/' + p.N + ' 小节$').test(m.vis) && m.sr === '已选第 2–4 小节，共 ' + p.N
          && p.chipAl === null && p.chipSr === '谱类：' && /谱类：/.test(snapT),
          'V3 TCH-1 / FN-5 状态栏读数「第 4/' + p.N + ' 小节 · 1 拍」（多选「第 2–4/N 小节」），可见读数 aria-hidden、读屏取 #flw-st-posr 全称；芯片「谱类：」为视觉隐藏字〔修前：「4/N · 1」、读屏只念「4/N · 1」、芯片 aria-label〕',
          J({ p, m, snap: snap.split('\n').filter(l => /小节|拍/.test(l)), snapT }));
      }
      if (want('V4') || want('V5')) {
        const nm = await EV(pg, () => { const e = document.getElementById('flw-st-more'); return e ? [e.title, e.getAttribute('aria-label')] : null; });
        await pg.click('#flw-st-more'); await W(250);
        const items = await EV(pg, () => [...document.querySelectorAll('#popmenu .flw-mi')].map(e => ({ fa: e.dataset.fa, v: e.dataset.v || '', ml: (e.querySelector('.flw-ml') || {}).textContent, ms: (e.querySelector('.flw-ms') || {}).textContent || '',
          lock: !!e.querySelector('.flw-mlock'), dis: e.getAttribute('aria-disabled'), why: e.dataset.why || '' })));
        await pg.keyboard.press('Escape'); await W(150);
        if (want('V4')) {
          const fr = items.find(x => x.fa === 'st:em' && x.v === 'free'), sm = items.find(x => x.fa === 'st:em' && x.v === 'smart');
          T(!!nm && /时值检查/.test(nm[0]) && /时值检查/.test(nm[1]) && cnt(nm[0].split(/：| · /)[0]) <= 12 && fr && fr.ms === '只标错' && sm && sm.ms === '给建议',
            'V4 TCH-2 状态栏 ⋯ 名称「' + (nm && nm[0]) + '」点到时值检查；「自由编辑 / 修复建议」灰值「只标错 / 给建议」〔修前：「更多播放设置」、两档无灰值〕', J({ nm, fr, sm }));
        }
        if (want('V5')) {
          const sb = await EV(pg, () => { const b = document.getElementById('rc-sndlib'); return !!(b && b.style.display !== 'none'); });
          const snd = items.find(x => x.fa === 'st:snd');
          const c = await cmdFirst(pg, '音色库'); await pg.keyboard.press('Escape'); await W(100);
          T(!sb && !!snd && snd.dis === 'true' && !snd.lock && cnt(snd.why) <= 16 && /音轨/.test(snd.why) && !!c && c.id === 'st:snd' && c.why.indexOf(snd.why) >= 0,
            'V5 TCH-5 ⋯「音色库」没得换：置灰不画锁，原因「' + (snd && snd.why) + '」（≤16 字，写换乐器音色的去处），命令面板同一句〔修前：锁 +「已是默认音色库」〕', J({ sb, snd, c }));
        }
      }
      if (want('V6')) {
        const more = async row => { await EV(pg, r => { sel = { mi: 0, row: r, vi: 0, ci: 0, si: 1 }; render(); }, row); await W(200);
          await pg.click('#editbar [data-fa="menu"][data-m="more"]'); await W(250);
          const o = await EV(pg, () => { const m = document.getElementById('popmenu'); return m ? { hd: [...m.querySelectorAll('.flw-mh')].map(h => h.textContent),
            lab: ['#eb-split', '#eb-merge', '#eb-clear'].map(s => { const e = m.querySelector('[data-old="' + s + '"] .flw-ml'); return e ? e.textContent : null; }),
            oct: [...m.querySelectorAll('[data-old="#b-octup"],[data-old="#b-octdn"]')].map(e => e.getAttribute('aria-disabled')) } : null; });
          await pg.keyboard.press('Escape'); await W(150); return o; };
        const tab = await more('tab'), vox = await more('vox');
        await EV(pg, () => { const b = document.querySelector('#flw-tlist .flw-trow.on [data-fa="tree:more"]'); if (b) b.click(); }); await W(250);
        const midi = await EV(pg, () => { const e = document.querySelector('#popmenu [data-fa="tree:midi"]'); return e ? { t: (e.querySelector('.flw-ml') || {}).textContent, al: e.getAttribute('aria-label') } : null; });
        await pg.keyboard.press('Escape'); await W(150);
        T(!!tab && !tab.hd.some(h => /^作用于/.test(h)) && tab.oct.every(x => x === 'true') && !!vox && vox.hd.some(h => /^作用于 · /.test(h))
          && J(vox.lab) === J(['拆分音符', '合并音符', '清除此音']) && vox.lab.every(x => cnt(x) <= 6) && !!midi && /MIDI/.test(midi.t) && cnt(midi.t) <= 6 && /覆盖本轨/.test(midi.al),
          'V6 TCH-6 / 7 / 9 六线谱轨「更多 ▾」不出「作用于」头（两项整体移八度都锁着），旋律轨照出；「拆分音符 / 合并音符 / 清除此音」；音轨 ⋯「' + (midi && midi.t) + '」〔修前：「作用于 · 吉他1全曲」+ 锁、「拆分 / 合并 / 清单音」、「覆盖本轨…」〕',
          J({ tab, vox, midi }));
      }
      T(!pg._errs.length, 'V3–V6 页面无脚本错误', pg._errs.join(' | '));
      await pg.context().close();
    }
    /* ===== V7 记号面板混合档 · V10 Esc 焦点 · V11 帮助 ===== */
    if (['V7', 'V10', 'V11'].some(want)) {
      const pg = await open(b);
      await EV(pg, () => __one(__P('送别')));
      if (want('V7')) {
        await EV(pg, () => { ['line', 'dyn', 'tempo', 'keys', 'bar'].forEach(k => { const h = document.querySelector('#flw-pal [data-fa="pal:fold"][data-v="' + k + '"]'); if (h && h.getAttribute('aria-expanded') === 'false') h.click(); }); }); await W(300);
        const c = await EV(pg, () => ({ mix: document.getElementById('flw-pal').classList.contains('flw-mix'),
          cells: ['dyn-mf', 'tuplet3', 'dyn-more', 'tempo-mark', 'keysig', 'meter', 'tupletN', 'rehearsal'].map(id => { const e = document.querySelector('#flw-pgrid .flw-pgb:not(.flw-rec) [data-v="' + id + '"]'); if (!e) return { id, none: true };
            const r = e.getBoundingClientRect(), l = e.querySelector('.flw-sgl'); return { id, w: Math.round(r.width), h: Math.round(r.height), lab: (l && __vis(l)) ? l.textContent : '' }; }) }));
        const by = Object.fromEntries(c.cells.map(x => [x.id, x]));
        const wide = ['dyn-more', 'tempo-mark', 'keysig', 'meter', 'tupletN', 'rehearsal'];
        T(c.mix && wide.every(id => by[id] && !by[id].none && by[id].lab && cnt(by[id].lab) <= 3 && by[id].w >= 70 && Math.abs(by[id].h - 36) <= 1)
          && ['dyn-mf', 'tuplet3'].every(id => by[id] && Math.abs(by[id].w - 36) <= 1 && !by[id].lab) && by['dyn-more'].lab === '更多' && by['tempo-mark'].lab === '速度',
          'V7 BUD-1 / TCH-4 混合档：更多力度 / 速度 / 转调 / 拍号 / N 连音 / 段落标记占两格宽带 2 字（' + wide.map(id => by[id] && by[id].lab).join(' / ') + '），mf、3 连音仍 36 只画字形〔修前：全 36 无字，更多力度画成 mf〕', J(c));
      }
      if (want('V10')) {
        await EV(pg, () => { sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); document.activeElement.blur(); });
        await pg.keyboard.press('Enter'); await W(350);
        const f1 = await EV(pg, () => document.activeElement && document.activeElement.id);
        await pg.keyboard.press('Escape'); await W(350);
        const f2 = await EV(pg, () => { const a = document.activeElement; return { tag: a && a.tagName, fk: a && a.dataset && a.dataset.fk, id: a && a.id, tab: activeTab }; });
        const d0 = await EV(pg, () => song.measures[1].voxes[0].map(c => c.deg));
        await pg.keyboard.press('ArrowRight'); await W(120);
        const s1 = await EV(pg, () => [sel.mi, sel.ci]);
        await pg.keyboard.press('5'); await W(200);
        const d1 = await EV(pg, () => song.measures[1].voxes[0].map(c => c.deg));
        /* 5cddfb8 同一串键（焦点回「填词」钮）：→ 被音轨树留下、光标不动，5 写在第 1 列——第 2 小节 [6,1,5] → [5,1,5]（p4 探针三版对拍） */
        T(f1 === 'i-lyric' && f2.tag !== 'BODY' && /^row:vox:0$/.test(f2.fk || '') && J(s1) === '[1,0]' && d1[0] === 5 && J(d1.slice(1)) === J(d0.slice(1)),
          'V10 FN-4 Enter 进逐字填词 → Esc 收起后焦点在当前旋律轨行（' + f2.id + '），→ 不移光标、5 写在原列（' + J(d0) + '→' + J(d1) + '，同 5cddfb8）〔修前：焦点 BODY，→ 移到下一列、5 写进第 2 列〕', J({ f1, f2, s1, d0, d1 }));
      }
      if (want('V11')) {
        await EV(pg, () => { const b = document.getElementById('b-help'); if (b) b.click(); }); await W(400);
        const h = await EV(pg, () => { const rows = {}; document.querySelectorAll('.helpdoc .hd-row').forEach(r => { rows[r.querySelector('.rk').textContent.trim()] = r.querySelector('.rv').textContent; }); return rows; });
        await EV(pg, () => { try { closeModal(); } catch (_) {} });
        const trk = h['左栏 · 音轨'] || '', sg = h['左栏 · 记号'] || '', rd = h['右栏'] || '', st = h['底部 · 播放与状态栏'] || '';
        T(!!trk && !/「由此生成六线谱轨」/.test(trk) && !/谱类芯片＝换谱类/.test(trk) && /谱类 ▾/.test(trk) && !/带字记号面板/.test(sg) && /混合/.test(sg)
          && !/时值检查方式/.test(rd) && /⋯ 更多（[^）]*时值检查/.test(st),
          'V11 FN-6 帮助「界面一览」：音轨行不再写「由此生成六线谱轨」子行与「谱类芯片＝换谱类」（写悬浮条谱类 ▾ / 文件 ▾）、记号写缺省混合档、属性页不再列时值检查方式、⋯ 更多写明时值检查〔修前：三处旧描述〕',
          J({ trk: trk.slice(-120), sg: sg.slice(0, 80), rd: rd.slice(0, 60), st: st.slice(-80) }));
      }
      T(!pg._errs.length, 'V7 / V10 / V11 页面无脚本错误', pg._errs.join(' | '));
      await pg.context().close();
    }
    /* ===== V8 整体缩放 · V13 悬停与原因（排版 / 输出 / 偏好 / 命令面板 / 记号格）· V9 撤销不转存 · V12 配伴奏提示 · V14 快速新建 ===== */
    if (['V8', 'V9', 'V12', 'V13', 'V14'].some(want)) {
      const pg = await open(b);
      await EV(pg, () => __one(__P('送别')));
      if (want('V9')) {
        const r = await EV(pg, async () => {
          const lib0 = libLoad().length, d0 = curDocI, n0 = docs.length;
          const s = createSong('vocal', { title: '导入探针', key: 'C', beats: 4, unit: 4, nMea: 4, nVox: 1, lyr: 0 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 1][i % 4]; }));
          await new Promise(res => addDoc(s, () => { toastSay('已导入（回归）', { t: '已导入 4 小节', k: 'res', act: 'close', prev: d0 }); res(); }));
          const n1 = docs.length, has = docHasContent(song), btn = document.querySelector('#toast .flw-ta'), had = !!btn; if (btn) btn.click();
          await new Promise(res => setTimeout(res, 200));
          return { lib0, lib1: libLoad().length, docs: [n0, n1, docs.length], has, had, back: curDocI === d0, t: __toastT() };
        });
        T(r.had && r.has && r.lib1 === r.lib0 && r.docs[1] === r.docs[0] + 1 && r.docs[2] === r.docs[0] && r.back && !/已存入/.test(r.t),
          'V9 FN-3 有内容的新窗口（刚导入、没改过）点提示条「撤销」：关窗回原窗口，「我的曲谱」条数不变（' + r.lib0 + '→' + r.lib1 + '）、提示「' + r.t + '」〔修前：库 +1、「已关闭 · 已存入」〕', J(r));
      }
      if (want('V12')) {
        const r = await EV(pg, async () => {
          const s = NWB.build('JG', { title: '配伴奏回归', nMea: 8, lyr: 0 }); s.measures.slice(0, 4).forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 1][i % 4]; }));
          await new Promise(res => addDoc(s, res));
          document.getElementById('b-arrange').click(); await new Promise(res => setTimeout(res, 200));
          const go = document.getElementById('arr-go'); if (go) go.click(); await new Promise(res => setTimeout(res, 300));
          const a = __toastT();
          document.getElementById('b-acctex').click(); await new Promise(res => setTimeout(res, 200));
          const blk = document.querySelector('input[name="tex"][value="block"]'); if (blk) blk.checked = true;
          const tg = document.getElementById('tex-go'); if (tg) tg.click(); await new Promise(res => setTimeout(res, 300));
          return { a, t: __toastT(), blk: !!blk, nm: ((PIANO_TEX.find(x => x.id === 'block') || {}).name || '') };
        });
        T(r.a === '已配伴奏 · 第 1–4 小节' && r.blk && r.t === '已换' + r.nm.split(/[（(]/)[0] + ' · 第 1–4 小节',
          'V12 TCH-8 配伴奏提示「' + r.a + '」、换织体提示「' + r.t + '」（带范围、织体点名，第 5 小节以后没配一眼看出）〔修前：两条都是「已配伴奏 4 小节」〕', J(r));
      }
      if (want('V14')) {
        /* 真实点：文件 ▾ → 行尾 ▾（r1:newdd）＝快速新建 */
        await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]', { timeout: 3000 }).catch(() => {});
        await EV(pg, () => { const b = document.querySelector('#popmenu [data-fa="r1:newdd"]'); if (b) b.click(); }); await W(300);
        const q = await EV(pg, () => { const e = document.querySelector('.nf-qm .nf-qlast'); return e ? { b: e.querySelector('b').textContent, k: (e.querySelector('.nf-qk') || {}).textContent || null, al: e.getAttribute('aria-label') } : null; });
        await pg.keyboard.press('Escape'); await W(150);
        T(!!q && /^按(上次|默认)$/.test(q.b) && cnt(q.b) <= 6 && !!q.k && /按(上次|默认)：/.test(q.al || ''),
          'V14 BUD-6 快速新建 ▾ 首项名称「' + (q && q.b) + '」，谱类名「' + (q && q.k) + '」作灰色当前值；读屏名照旧「' + (q && q.al) + '」〔修前：名称「按默认 · 吉他弹唱」〕', J(q));
      }
      if (want('V8') || want('V13')) {
        await EV(pg, () => setMode('engrave', { page: 'lay', open: true })); await W(900);
        if (want('V8')) {
          const r = await EV(pg, async () => { const sc = document.getElementById('lp-scale'), row = sc && sc.closest('.lp-row'); const vis = __vis(row) && __vis(sc);
            if (!vis) return { vis, step: sc && sc.step };
            sc.value = '0.96'; sc.dispatchEvent(new Event('input', { bubbles: true })); sc.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(res => setTimeout(res, 300)); return { vis, step: sc.step, scale: song.layout && song.layout.scale, lab: (document.getElementById('lp-sval') || {}).textContent };
          });
          T(r.vis && r.step === '0.02' && r.scale === 0.96 && /96%/.test(r.lab || ''),
            'V8 FN-2 排版右栏「版式」的「整体缩放」滑杆照出（step 0.02）：设 96% → song.layout.scale=0.96（行 2「内容大小 ±」一步 10% 设不出）〔修前：滑杆行在新外壳被藏〕', J(r));
        }
        if (want('V13')) {
          const lay = await EV(pg, () => { const T2 = s => [...document.querySelectorAll(s)].map(e => e.getAttribute('title') || '');
            return [].concat(T2('[data-fa="lay:pnpos"]'), T2('[data-fa="lay:pno"]'), T2('[data-fa="lay:pnfirst"]'), T2('#flw-lay-pnst'), T2('#lp-fix'), T2('#lp-bar'), T2('#flw-lay-rep [data-fa="lay:go"]')).filter(Boolean); });
          const fx = await EV(pg, async () => { const b0 = document.querySelector('#lp-fix button[data-fix="0"]'), b1 = document.querySelector('#lp-fix button[data-fix="1"]'), was = !!(song.layout && song.layout.fixed);
            (was ? b0 : b1).click(); await new Promise(r => setTimeout(r, 120)); const t = __toastT(); (was ? b1 : b0).click(); await new Promise(r => setTimeout(r, 120)); return [t, __toastT()]; });
          await EV(pg, () => setMode('output', { page: 'pub', open: true })); await W(900);
          const out = await EV(pg, () => ({ t: [...document.querySelectorAll('#flw-out-arr [data-fa="out:arr"], #flw-pub-go, #flw-out-parts')].map(e => e.getAttribute('title') || ''),
            st: (document.getElementById('flw-pub-st') || {}).textContent || '' }));
          await EV(pg, () => setMode('write')); await W(300);
          const pref = await EV(pg, () => (PREF_ITEMS.find(x => x.k === 'signdensity') || {}).d || '');
          /* 命令面板「和弦写法」灰显原因（空的简谱歌谱：不是功能谱、也没有和弦） */
          await EV(pg, () => __one(createSong('vocal', { title: '空', key: 'C', beats: 4, unit: 4, nMea: 4, nVox: 1, lyr: 0 }))); await W(250);
          const cw = await cmdFirst(pg, '和弦写法'); await pg.keyboard.press('Escape'); await W(120);
          const cd = await cmdFirst(pg, '和弦图'); await pg.keyboard.press('Escape'); await W(120);
          /* 灰记号格（简谱语境搜 tb：踏板只五线谱有） */
          await pg.focus('#flw-pq'); await pg.fill('#flw-pq', 'tb'); await W(250);
          const pw = await EV(pg, () => { const c = document.querySelector('#flw-pgrid [data-v="ped"]'); return c ? c.dataset.why || '' : null; });
          await pg.fill('#flw-pq', ''); await W(150);
          const longT = lay.concat(out.t).filter(t => tipN(t) > 16);
          const whyOk = w => !!w && cnt(w.replace(/^[^：]*：/, '')) <= 16;
          T(!longT.length && lay.length >= 8 && out.t.length >= 4 && fx.every(t => cnt(t) <= 12) && out.st === '仅存本机' && !/按钮|旁的|下面的/.test(pref) && cnt(pref) <= 16
            && whyOk(cw && cw.why) && whyOk(cd && cd.why) && !!pw && cnt(pw) <= 16 && /仅五线谱/.test(pw),
            'V13 BUD-2 / 3 / 7 排版页码段 · 版宽 · 简谱小节号 · 版面检查行 · 输出预览排布 · 发布 · 分谱的悬停 ≤16 字；版宽提示条「' + fx.join(' / ') + '」；发布卡「' + out.st + '」；偏好说明「' + pref + '」；命令面板「和弦写法 / 和弦图」原因 ≤16；灰记号格原因「' + pw + '」〔修前：长说明 / 指路句 / 26 字原因〕',
            J({ longT, lay, out, fx, pref, cw, cd, pw }));
        }
      }
      T(!pg._errs.length, 'V8 / V9 / V12–V14 页面无脚本错误', pg._errs.join(' | '));
      await pg.context().close();
    }
    /* ===== V13b 窄档竖条两键悬停（1200 宽） ===== */
    if (want('V13')) {
      const pg = await open(b, { w: 1200, h: 800 });
      await EV(pg, () => __one(__P('送别'))); await W(300);
      const t = await EV(pg, () => [...document.querySelectorAll('#flw-nbtn, #flw-ntrk')].map(e => e.title));
      T(t.length === 2 && t.every(x => tipN(x) <= 8 && !/Esc 收起|：/.test(x)), 'V13b BUD-7 窄档左栏竖条两键悬停只写名称（' + t.join(' / ') + '）〔修前：「展开音轨：轨名 · 记谱法层 · …（Esc 收起）」等〕', J(t));
      await pg.context().close();
    }
    /* ===== V15 allow 有上限（静态） ===== */
    if (want('V15')) {
      let ref = null; try { ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'textbudget_ref.json'), 'utf8')); } catch (_) {}
      const A = (ref && ref.allow) || {}, bad = [];
      Object.entries(A).forEach(([id, o]) => Object.entries(o).forEach(([k, a]) => { const r = ref.screens[id] && ref.screens[id][k];
        if (!(a && typeof a === 'object' && Number.isInteger(a.max) && typeof r === 'number' && a.max >= r && a.max - r <= 5 && typeof a.why === 'string' && a.why.length > 8)) bad.push(id + '.' + k + '=' + J(a).slice(0, 40)); }));
      T(!!ref && Object.keys(A).length >= 1 && !bad.length, 'V15 BUD-4 tests/textbudget_ref.json 的 allow 每项都是 {max, why}（max 为整数、≥ 基线且最多高 5，why 写明理由）——放行有上限〔修前：8 处整项豁免的字符串〕', bad.join('；'));
    }
  } finally { await b.close(); }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.log('❌ 执行异常: ' + (e && e.stack || e)); process.exit(1); });
