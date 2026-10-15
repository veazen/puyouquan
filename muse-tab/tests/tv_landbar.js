/* v67.5 谱型条＋起步条 · 换谱类（docs/design-2026-10e §4 落地 / §5 换谱类，拍板「按推荐方案执行」；效果图 F14–F21）
   L1  各谱类谱型条内容：新建面板 10 个用途（真实建谱路径 realCreate）——谱名 / 图标＝统一谱名表、「旋律用」只在能互换的谱类出现、
       钢琴伴奏歌谱 / 吉他弹唱先写旋律 / 钢琴弹唱谱给起步条，其余一句操作提示（教学对照谱「在五线谱或简谱行输入都行，另一行同步」）；
       不经新建面板打开的谱没有谱型条；界面无内部编号
   L2  钢琴伴奏歌谱三步自动推进（真实点击＋键盘）：①写旋律（数字键）→ ②亮「一键配伴奏」→ 点主按钮 → 智能配谱弹窗默认「填进当前谱」→ 生成 →
       ③选织体「换织体」→ 伴奏织体弹窗 → 生成；旋律 / 歌词逐字段不动
   L3  吉他弹唱「先写旋律」（真实点击新建面板）：①写旋律 → ②「生成六线谱」→ 把位弹窗 → 低把位（复用建谱时的空吉他轨，仍 1 条）→ ③调把位与扫弦；
       「旋律用 五线谱」后再生成（v67.4 遗留「五线谱写旋律再生成六线谱」的入口）
   L4  收起与按窗口记忆：收起 → 切到别的窗口再回来仍收起、另一窗口的谱型条照常；右栏「谱型条 · 换谱类…」重新调出；本窗口打开别的谱即失效
   L5  不进 song：显示 / 收起 / 调出 / 开关菜单前后 song JSON、全部窗口 JSON、本机 musetab-* 键逐字节不变，不新增本机键
   L6  打印 / 导出 / 观看页 / 谱架 / 启动台不出现：print 媒体 display:none；打印预览页里没有、被预览层盖住；PNG 导出源（#score）不含；
       观看页（openPubViewer）移除、退出后回来；谱架移除；启动台隐藏
   L7  几何：1366×768 / 1280×800 / 1024×700——与谱纸同宽同左缘、贴着谱纸顶部、不压左栏（左栏面板 / 歌词抽屉压在它上面或在它左边）、
       放下主按钮不溢出、无横向页面滚动；吸顶时光标跟滚让开谱型条；深色主题令牌与对比度 ≥4.5；谱面 #score 与无谱型条时逐字节相同
   L8  换谱类 · 空谱：14 种组合两两互换 182 次全部「直接换」，曲名 / 调 / 拍号 / 速度 / 小节数 / 谱 id 保持、换后谱类＝目标、Ctrl+Z 逐字节回原；
       真实点击菜单（空谱提示语、每项写结果）
   L9  换谱类 · 有内容：14×13 逐项与规则表一致（直接换＝不动音符、另建一份、不可换）；直接换的每一行音符 / 歌词 / 和弦逐字段不变且一步撤销；
       另建一份新窗口带旋律（含歌词、和弦；弹唱谱 TAB 上的和弦挪到旋律）、原谱逐字节保留；不可换不动谱；部分内容 / 合唱 / 另加音轨的边界
   L10 不可换项说明：菜单 aria-disabled、写明原因（六线谱 ⇄ 钢琴「两种乐器」）；点了只提示、不改谱；菜单每项都有结果说明
   L11 「旋律用 简谱 | 五线谱」＝现有记谱法切换（setVoxNotation 同结果）、来回切逐字节、低音谱号不丢、键盘 ←→、钢琴两行不动
   L12 键盘：Enter 开菜单、↑↓ 走查、Esc 关并回焦点、菜单里的方向键不动谱面光标；Tab 走到主按钮 Enter 触发
   —— 收尾验收回归（修前＝实现者交付版红、修后绿）——
   L10 补：点不可换项就地亮出原因、读屏播报（不弹被菜单盖住的提示条）
   L13 变调夹折进调：有夹位的弹唱谱换成没有六线谱的谱类（直接换 / 另建一份 / 空谱重建）1=X 与逐音实际音高不变、和弦名改实际音高、页头不挂变调夹 / 调弦
   L14 播放跟随（highlight）与报错跳转让开吸顶谱型条
   L15 鼠标点过谱型条后焦点交还谱面（←→ 不被「旋律用」截走、空格播放、Tab 归谱面）；换谱类不重置光标、删行清选区
   L16 吉他弹唱 生成 → 续写 → 补齐：轨数仍 1、手改品位不动；生成后光标落第一个音；第 ③ 步提示可见
   L17 ≤1200 宽：收起提示写真实入口；「智能」右侧抽屉 →「信息」→ 谱型条；Alt+B 调回
   L18 起步条按顺序推进（只有一个当前步）；伴奏织体未生成不留撤销步
   L19 先配后续写：② 回到当前「补配 N 小节」
   L20 / L20b 建成提示指向谱型条；读屏语义；空谱菜单说明不重复；另建一份照实说页签；按内容给起步条；命中区 ≥44；非固定版宽对齐可见纸面；长带 / 经典版
   突变实证：对 v67.4 原版（MUSETAB_URL=…/v674.html）跑——除「无页面报错」外全部报红 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');

const HELP = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false; try{ hideStartPad(); }catch(_){}
  window.__V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  window.__mel=(s,vi,o)=>{ o=o||{}; s.measures.forEach((m,mi)=>{ const b=m.beats||s.beats, u=m.unit||s.unit;
    m.voxes[vi]=Array.from({length:b},(_,i)=>__V(((mi*3+i+(o.sh||0))%7)+1, u, {lyrics: o.ly===false? [] : ['词'+mi+i], chord: (o.ch!==false && i===0)? ['C','F','G7','Am'][mi%4] : ''})); }); return s; };
  window.__acc=(s,vi)=>{ s.measures.forEach((m,mi)=>{ const b=m.beats||s.beats, u=m.unit||s.unit; m.voxes[vi]=Array.from({length:b},(_,i)=>__V(((i+mi)%5)+1, u, {oct:-1})); }); return s; };
  window.__chords=(s)=>{ s.measures.forEach((m,mi)=>{ const b=m.beats||s.beats, u=m.unit||s.unit; m.voxes[0]=Array.from({length:b},(_,i)=>Object.assign(__V(0,u),{chord: i%2? '' : ['C','Am','F','G'][(mi+i)%4]})); }); return s; };
  window.__tab=(s,ti,ch)=>{ s.measures.forEach((m,mi)=>{ const b=m.beats||s.beats, u=m.unit||s.unit; m.tabs[ti]=Array.from({length:b},(_,i)=>({dur:u, dotted:false, chord:(ch!==false && i===0)? ['C','G','Am','F'][mi%4] : '', notes:[{s:2+(i%3), f:(mi+i)%4}], strum:'', tech:''})); }); return s; };
  window.__lb=()=>{ const w=document.getElementById('lb-wrap'); if(!w || getComputedStyle(w).display==='none') return null;
    const b=w.querySelector('.lb-bar'), kind=w.querySelector('.lb-kind'), steps=[...w.querySelectorAll('.lb-steps li')], go=w.querySelector('.lb-go'), tip=w.querySelector('.lb-tip');
    return {name:(kind.querySelector('b')||{}).textContent, ic:(kind.querySelector('svg.pqi')||{dataset:{}}).dataset.pq,
      mel: w.querySelector('.lb-seg')? [...w.querySelectorAll('.lb-seg [role=radio]')].map(x=>x.textContent+':'+x.getAttribute('aria-checked')).join(',') : null,
      steps: steps.map(li=>li.className+':'+li.querySelector(':scope > span').textContent).join(' | '), go: go? go.textContent : null, goAct: go? go.dataset.act : null,
      tip: tip? tip.textContent : null, txt: b.innerText}; };
  window.__songJ=()=>JSON.stringify(song); window.__J=o=>JSON.stringify(o); if(typeof window.J==='undefined') window.J=window.__J;
  window.__lsMuse=()=>{ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^musetab-/.test(k)) o[k]=localStorage.getItem(k); } return o; };
  window.__rowsOf=(s)=>{ const k=NWB.stackOf(s), F=LB_FAM[k], vv=s.voxVoices||[];
    const mel = F==='acc'? [0] : (F==='mel'||F==='jt')? vv.map((_,i)=>i) : [];
    return {k, F, mel: mel.map(i=>JSON.stringify(s.measures.map(m=>m.voxes[i]))), acc: F==='acc'? [1,2].map(i=>JSON.stringify(s.measures.map(m=>m.voxes[i]))) : [],
      pno: F==='pno'? [0,1].map(i=>JSON.stringify(s.measures.map(m=>m.voxes[i]))) : [], tab: (s.tabVoices||[]).map((_,i)=>JSON.stringify(s.measures.map(m=>m.tabs[i]))) }; };
  return 1; })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];
  const newPage = async (w, h) => {
    const pg = await b.newPage({ viewport: { width: w || 1366, height: h || 768 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /谱型条|lb|LB/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
    await pg.goto(F); await pg.waitForTimeout(900);
    await pg.evaluate(HELP);
    return pg;
  };
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d && !ok ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);
  const pg = await newPage(1366, 768);
  const EV = (s, a) => pg.evaluate(s, a).catch(e => ({ err: e.message }));
  /* 真实点击 / 聚焦；元素不在（如对旧版跑突变实证）时不挂死，交给断言报红 */
  const CL = (sel, o) => pg.click(sel, Object.assign({ timeout: 2500 }, o || {})).catch(() => null);
  const FO = sel => pg.focus(sel).catch(() => null);
  const hasLB = await EV(() => typeof LBAR !== 'undefined' && typeof lbPlan === 'function');

  /* ===== L1 各谱类谱型条内容（新建面板真实建谱路径） ===== */
  try {
    const exp = {
      gtr:   { k: 'JT', mel: true,  tip: LB => LB.tip && /Tab/.test(LB.tip) },
      pacc:  { k: 'JG', mel: true,  steps: 'now:写旋律 | todo:配和弦与伴奏 | todo:选织体' },
      kids:  { k: 'JG', mel: true,  steps: 'now:写旋律 | todo:配和弦与伴奏 | todo:选织体' },
      vocal: { k: 'J',  mel: true,  tip: LB => /数字键 1–7/.test(LB.tip) },
      teach: { k: 'SJ', mel: false, tip: LB => LB.tip === '在五线谱或简谱行输入都行，另一行同步' },
      sight: { k: 'S',  mel: false, tip: LB => /五线谱自动落位/.test(LB.tip) },
      solo:  { k: 'ST', mel: false, tip: LB => LB.tip === '在六线谱输入，五线谱自动同步' },
      inst:  { k: 'G',  mel: false, tip: LB => /右手 \/ 左手/.test(LB.tip) },
      chord: { k: 'C',  mel: false, tip: LB => /Ctrl\+K/.test(LB.tip) },
      blank: { k: 'J',  mel: true,  tip: LB => /数字键 1–7/.test(LB.tip) },
    };
    const bad = [];
    for (const sc of Object.keys(exp)) {
      await EV(sc => NWP.quickCreate(sc), sc); await pg.waitForTimeout(80);
      const r = await EV(() => ({ lb: __lb(), k: NWB.stackOf(song), name: NWB.kindOfSong(song).name, ic: NWB.kindOfSong(song).ic, label: docTypeLabel(song) }));
      const e = exp[sc], L = r.lb;
      const ok = L && r.k === e.k && L.name === r.name && L.name === r.label && L.ic === r.ic && (!!L.mel === e.mel)
        && (e.steps ? L.steps === e.steps && !L.tip && !L.go : (!L.steps && e.tip(L))) && !/D-\d|拍板|P\d-\d/.test(L.txt);
      if (!ok) bad.push(sc + ':' + J(r));
    }
    const plain = await EV(() => { addDoc(createSong('vocal', {title:'打开的谱', nMea:4})); return __lb(); });
    /* 钢琴弹唱谱（纯伴奏）：①标和弦 →②选织体（参考实现同款）；标了和弦后②亮「生成伴奏」 */
    const cg = await EV(() => { const s = NWB.build('CG', {title:'纯伴奏', nMea:4}); addDoc(s); LBAR.open({from:'new'}); render(); const a = __lb();
      mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; }); const b = __lb(); return { a: a && a.steps, b: b && b.steps, go: b && b.go, act: b && b.goAct }; });
    if (!(cg && cg.a === 'now:标和弦 | todo:选织体' && cg.b === 'done:标和弦 | now:选织体' && cg.go === '生成伴奏' && cg.act === 'tex')) bad.push('CG:' + J(cg));
    T(hasLB === true && !bad.length && plain === null,
      'L1 新建面板 10 个用途落地即有谱型条：谱名 / 图标＝统一谱名表（＝docTypeLabel）、「旋律用」只在能互换的谱类（吉他弹唱 / 钢琴伴奏 / 歌谱 / 空白有，教学对照 / 视唱 / 独奏 / 钢琴 / 和弦谱无）、钢琴伴奏歌谱三步起步条、钢琴弹唱谱两步（标和弦 → 选织体）、其余一句操作提示（教学对照「在五线谱或简谱行输入都行，另一行同步」）；不经新建面板打开的谱没有谱型条', bad.join(' ; ') + ' plain=' + J(plain));
  } catch (e) { T(false, 'L1 执行异常', e.message.split('\n')[0]); }

  /* ===== L2 钢琴伴奏歌谱三步自动推进（真实点击＋键盘） ===== */
  try {
    await CL('#b-newdd'); await pg.waitForTimeout(120);
    await CL('.nf-qm [data-q="pacc"]').catch(() => {}); await pg.waitForTimeout(200);
    const s0 = await EV(() => ({ k: NWB.stackOf(song), lb: __lb(), sel: [sel.row, sel.vi, sel.mi, sel.ci] }));
    await CL('#score', { position: { x: 5, y: 5 } }).catch(() => {});
    await EV(() => { sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; blurSel = false; render(); });
    for (const k of '1235') { await pg.keyboard.press(k); await pg.waitForTimeout(30); }
    await pg.waitForTimeout(80);
    const s1 = await EV(() => ({ lb: __lb(), mel: JSON.stringify(song.measures[0].voxes[0].map(c => c.deg)) }));
    const melBefore = await EV(() => JSON.stringify(song.measures.map(m => m.voxes[0].map(c => [c.deg, c.dur, c.oct, c.acc, c.lyrics]))));
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    const m1 = await EV(() => ({ out: (document.getElementById('arr-out') || {}).value, toast: (document.getElementById('toast') || {}).style.opacity }));
    await CL('#arr-go'); await pg.waitForTimeout(200);
    const s2 = await EV(() => ({ lb: __lb(), docs: docs.length, acc: song.measures[0].voxes[1].some(c => c.deg > 0), melSame: JSON.stringify(song.measures.map(m => m.voxes[0].map(c => [c.deg, c.dur, c.oct, c.acc, c.lyrics]))) }));
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    const m2 = await EV(() => ({ tex: !!document.getElementById('tex-go'), arr: !!document.getElementById('arr-go') }));
    if (m2.tex) { await CL('#tex-go'); await pg.waitForTimeout(150); }
    const s3 = await EV(() => ({ lb: __lb() }));
    T(s0.k === 'JG' && s0.lb && s0.lb.steps === 'now:写旋律 | todo:配和弦与伴奏 | todo:选织体' && !s0.lb.go
      && s1.lb && s1.lb.steps === 'done:写旋律 | now:配和弦与伴奏 | todo:选织体' && s1.lb.go === '一键配伴奏'
      && m1.out === 'fill' && m1.toast === '0'
      && s2.acc && s2.lb.steps === 'done:写旋律 | done:配和弦与伴奏 | now:选织体' && s2.lb.go === '换织体' && s2.melSame === melBefore
      && m2.tex && !m2.arr && s3.lb && s3.lb.steps === 'done:写旋律 | done:配和弦与伴奏 | now:选织体',
      'L2 钢琴伴奏歌谱（「新建 ▾」真实点击）：①写旋律（数字键 1235）→ ②亮「一键配伴奏」→ 点主按钮＝智能配谱弹窗、产出默认「填进当前谱」、提示条收起 → 生成后 ③选织体「换织体」→ 伴奏织体弹窗；旋律 / 歌词逐字段不动',
      J({ s0, s1, m1, s2: Object.assign({}, s2, { melSame: s2.melSame === melBefore }), m2, s3 }));
  } catch (e) { T(false, 'L2 执行异常', e.message.split('\n')[0]); }

  /* ===== L3 吉他弹唱「先写旋律」：真实点击新建面板 ===== */
  try {
    await CL('#b-new'); await pg.waitForTimeout(250);
    await CL('[data-scene="gtr"]'); await pg.waitForTimeout(120);
    await CL('[data-act="var"][data-k="pen"][data-v="J"]'); await pg.waitForTimeout(120);
    await CL('#nw-create'); await pg.waitForTimeout(300);
    const s0 = await EV(() => ({ k: NWB.stackOf(song), lb: __lb(), meta: LBAR.meta(), nTab: song.tabVoices.length, row: sel.row }));
    for (const k of '5653') { await pg.keyboard.press(k); await pg.waitForTimeout(30); }
    await pg.waitForTimeout(80);
    const s1 = await EV(() => ({ lb: __lb() }));
    /* 旋律用 五线谱（v67.4 遗留：五线谱写旋律再生成六线谱）——真实点击 */
    await CL('#lb-wrap .lb-seg [data-v="S"]'); await pg.waitForTimeout(120);
    const s1b = await EV(() => ({ lb: __lb(), vn: (song.voxNotations || [])[0], k: NWB.stackOf(song) }));
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    const md = await EV(() => !!document.getElementById('vt-low'));
    if (md) { await CL('#vt-low'); await pg.waitForTimeout(200); }
    const s2 = await EV(() => ({ lb: __lb(), nTab: song.tabVoices.length, notes: song.measures[0].tabs[0].filter(c => c.notes.length).length, vn: (song.voxNotations || [])[0], name: song.tabVoices[0] }));
    T(s0.k === 'JT' && s0.meta && s0.meta.pen === 'J' && s0.nTab === 1 && s0.row === 'vox' && s0.lb.steps === 'now:写旋律 | todo:生成六线谱 | todo:调把位与扫弦'
      && s1.lb.steps === 'done:写旋律 | now:生成六线谱 | todo:调把位与扫弦' && s1.lb.go === '生成六线谱'
      && s1b.vn === 'staff' && s1b.k === 'JT' && /五线谱:true/.test(s1b.lb.mel)
      && md && s2.nTab === 1 && s2.notes === 4 && s2.vn === 'staff' && s2.lb.steps === 'done:写旋律 | done:生成六线谱 | now:调把位与扫弦' && !s2.lb.go,
      'L3 吉他弹唱「先写旋律」（新建面板真实点击）：①写旋律 → ②「生成六线谱」→ 把位弹窗低把位：复用建谱时的空吉他轨（仍 1 条）→ ③调把位与扫弦；中途「旋律用 五线谱」后照样生成（五线谱写旋律再生成六线谱）',
      J({ s0, s1, s1b, md, s2 }));
  } catch (e) { T(false, 'L3 执行异常', e.message.split('\n')[0]); }

  /* ===== L4 收起与按窗口记忆 ===== */
  try {
    await EV(() => { NWP.quickCreate('pacc'); window.__A = curDocI; NWP.quickCreate('teach'); window.__B = curDocI; });
    await pg.waitForTimeout(120);
    const b0 = await EV(() => __lb());
    await CL('#lb-wrap .lb-x'); await pg.waitForTimeout(100);
    const b1 = await EV(() => ({ lb: __lb(), meta: LBAR.meta() }));
    await CL('.dtab[data-doc="' + await EV(() => __A) + '"]'); await pg.waitForTimeout(150);
    const a1 = await EV(() => ({ lb: __lb(), cur: curDocI }));
    await CL('.dtab[data-doc="' + await EV(() => __B) + '"]'); await pg.waitForTimeout(150);
    const b2 = await EV(() => ({ lb: __lb(), cur: curDocI }));
    /* 右栏「信息 · 曲谱信息 · 谱型条」调出 */
    await CL('#rtabs .rtab[data-p="info"]'); await pg.waitForTimeout(80);
    await CL('#ri-lbar'); await pg.waitForTimeout(120);
    const b3 = await EV(() => ({ lb: __lb(), focus: document.activeElement && document.activeElement.classList.contains('lb-kind') }));
    await CL('#rtabs .rtab[data-p="make"]').catch(() => {});
    /* 本窗口打开别的谱（loadSong 替换本窗口）→ 失效；页面刷新后内存里的谱型条也不在 */
    await EV(() => loadSong(createSong('vocal', {title:'替换进来的谱', nMea:4})));
    await pg.waitForTimeout(100);
    const b4 = await EV(() => ({ lb: __lb() }));
    T(b0 && b0.name === '教学对照谱' && !b1.lb && b1.meta && b1.meta.hidden === true && a1.lb && a1.lb.name === '钢琴伴奏歌谱' && !b2.lb && b2.cur === await EV(() => __B)
      && b3.lb && b3.lb.name === '教学对照谱' && b3.focus && !b4.lb,
      'L4 收起：本窗口不再出现；切到另一窗口其谱型条照常、切回仍收起（按窗口记）；右栏「谱型条 · 换谱类…」重新调出并聚焦谱名；本窗口打开别的谱后失效', J({ b0, b1, a1, b2, b3, b4 }));
  } catch (e) { T(false, 'L4 执行异常', e.message.split('\n')[0]); }

  /* ===== L5 不进 song（JSON 逐字节）、不新增本机键 ===== */
  try {
    await EV(() => { NWP.quickCreate('kids'); });
    await EV(() => persistNow());
    const before = await EV(() => ({ s: __songJ(), docs: J(docs.map(d => d.song)), ls: __lsMuse() }));
    await EV(() => closeFlyout());
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(80);
    const opened = await EV(() => !!document.getElementById('lb-menu'));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(60);
    await CL('#lb-wrap .lb-x'); await pg.waitForTimeout(60);
    const hid = await EV(() => !document.getElementById('lb-wrap'));
    await CL('#rtabs .rtab[data-p="info"]'); await CL('#ri-lbar'); await pg.waitForTimeout(80);
    const reshown = await EV(() => !!__lb());
    await CL('#rtabs .rtab[data-p="make"]').catch(() => {});
    await EV(() => persistNow());
    const after = await EV(() => ({ s: __songJ(), docs: J(docs.map(d => d.song)), ls: __lsMuse(), keys: Object.keys(song).filter(k => /lb|bar|kind|scene|step|land/i.test(k)) }));
    const keysB = Object.keys(before.ls).sort().join(','), keysA = Object.keys(after.ls).sort().join(',');
    T(opened === true && hid === true && reshown === true && before.s === after.s && before.docs === after.docs && keysB === keysA && J(before.ls) === J(after.ls) && !after.keys.length,
      'L5 谱型条状态不进 song：开关菜单 / 收起 / 右栏调出前后 song JSON、全部窗口 JSON、本机 musetab-* 键与值逐字节不变，不新增键、song 无谱型条字段',
      J({ opened, hid, reshown, same: before.s === after.s, docs: before.docs === after.docs, keysB, keysA, extra: after.keys }));
  } catch (e) { T(false, 'L5 执行异常', e.message.split('\n')[0]); }

  /* ===== L6 打印 / 导出 / 观看页 / 谱架 / 启动台不出现 ===== */
  try {
    await EV(() => NWP.quickCreate('pacc'));
    await pg.waitForTimeout(100);
    const on0 = await EV(() => !!__lb());
    await pg.emulateMedia({ media: 'print' });
    const pr = await EV(() => { const w = document.getElementById('lb-wrap'); return w ? getComputedStyle(w).display : 'none'; });
    await pg.emulateMedia({ media: 'screen' });
    /* 打印预览 */
    await CL('#b-preview'); await pg.waitForTimeout(400);
    const pv = await EV(() => { const w = document.querySelector('#lb-wrap .lb-bar'), r = w && w.getBoundingClientRect(), e = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { inPages: !!document.querySelector('#pv-pages .lb-bar, #pv-pages #lb-wrap'), covered: !!(e && e.closest('#preview-ov')), on: document.getElementById('preview-ov').classList.contains('on') }; });
    await EV(() => pvClose());
    /* 导出 PNG 的源是 #score（谱型条在 #paper 之外） */
    const ex = await EV(() => ({ inScore: !!document.querySelector('#score .lb-bar, #paper #lb-wrap'), html: /lb-bar|谱型/.test(document.getElementById('score').outerHTML) }));
    /* 谱架 */
    await CL('#b-stand'); await pg.waitForTimeout(200);
    const st = await EV(() => ({ stand: document.body.classList.contains('stand'), lb: __lb() }));
    await CL('#sb-exit').catch(() => EV(() => exitStand())); await pg.waitForTimeout(200);
    const st2 = await EV(() => ({ stand: document.body.classList.contains('stand'), lb: !!__lb() }));
    /* 观看页 */
    await EV(() => { circlePubsSave([{ pid: 'tlb-v', title: '观看测试', author: '测试', type: 'vocal', price: 0, views: 0, data: JSON.parse(JSON.stringify(song)) }]); openPubViewer('tlb-v'); });
    await pg.waitForTimeout(200);
    const vw = await EV(() => ({ viewer: document.body.classList.contains('viewer'), lb: __lb(), el: !!document.getElementById('lb-wrap') }));
    await EV(() => exitViewer()); await pg.waitForTimeout(150);
    const vw2 = await EV(() => !!__lb());
    /* 启动台 */
    await EV(() => initStartPad()); await pg.waitForTimeout(80);
    const sp = await EV(() => __lb());
    await EV(() => hideStartPad()); await pg.waitForTimeout(80);
    const sp2 = await EV(() => !!__lb());
    T(on0 && pr === 'none' && pv.on && !pv.inPages && pv.covered && !ex.inScore && !ex.html && st.stand && !st.lb && !st2.stand && st2.lb
      && vw.viewer && !vw.lb && !vw.el && vw2 && sp === null && sp2,
      'L6 打印媒体 display:none、打印预览页里没有且被预览层盖住、PNG 导出源 #score 不含、谱架 / 观看页（openPubViewer）不出现、退出后回来、启动台上隐藏',
      J({ on0, pr, pv, ex, st, st2, vw, vw2, sp, sp2 }));
  } catch (e) { T(false, 'L6 执行异常', e.message.split('\n')[0]); }

  /* ===== L7 几何（1366×768 / 1280×800 / 1024×700）＋吸顶让光标＋深色＋谱面逐字节 ===== */
  try {
    const geo = [];
    for (const [w, h] of [[1366, 768], [1280, 800], [1024, 700]]) {
      const p2 = await newPage(w, h);
      await p2.evaluate(() => { NWP.quickCreate('pacc'); __mel(song, 0); render(); });
      await p2.waitForTimeout(200);
      const g = await p2.evaluate(() => {
        const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width }; };
        const wrap = document.getElementById('lb-wrap'), bar = wrap.querySelector('.lb-bar'), paper = document.getElementById('paper'), ld = document.getElementById('left-dock');
        const B = R(bar), P = R(paper), LD = R(ld);
        return { B, P, LD, go: !!bar.querySelector('.lb-go'), over: lbOver(bar), cls: wrap.className, hscroll: document.scrollingElement.scrollWidth > innerWidth + 1,
          stepsVisible: [...bar.querySelectorAll('.lb-steps li > span:last-child')].filter(x => x.offsetParent).length };
      });
      /* 歌词抽屉（左栏「歌词」）：停靠时在谱型条左边、浮层时压在谱型条上面 */
      await p2.click('.ltab[data-t="lyr"]', { timeout: 2500 }).catch(() => {}); await p2.waitForTimeout(200);
      const fl = await p2.evaluate(() => {
        const f = document.getElementById('left-flyout'), bar = document.querySelector('#lb-wrap .lb-bar'); if (!f || !bar || f.classList.contains('hidden')) return { open: false };
        const a = f.getBoundingClientRect(), c = bar.getBoundingClientRect();
        const ox = Math.max(a.left, c.left), ox2 = Math.min(a.right, c.right), oy = Math.max(a.top, c.top), oy2 = Math.min(a.bottom, c.bottom);
        const overlap = ox2 > ox + 2 && oy2 > oy + 2; let top = null;
        if (overlap) { const e = document.elementFromPoint((ox + ox2) / 2, (oy + oy2) / 2); top = !!(e && e.closest('#left-flyout')); }
        const P = document.getElementById('paper').getBoundingClientRect();
        return { open: true, overlap, flyOnTop: top, barW: Math.round(c.width), paperW: Math.round(P.width), barL: Math.round(c.left), paperL: Math.round(P.left) };
      });
      g.fl = fl;
      const ok = Math.abs(g.B.w - g.P.w) <= 1 && Math.abs(g.B.l - g.P.l) <= 1 && g.P.t - g.B.b >= 0 && g.P.t - g.B.b <= 14 && g.B.l >= g.LD.r - 0.5 && g.go && !g.over && !g.hscroll
        && (w >= 1280 ? g.stepsVisible === 3 : g.stepsVisible >= 1)
        && fl.open && (fl.overlap ? fl.flyOnTop === true : true) && Math.abs(fl.barW - fl.paperW) <= 1 && Math.abs(fl.barL - fl.paperL) <= 1;
      geo.push({ w, ok, g });
      await p2.close();
    }
    T(geo.every(x => x.ok),
      'L7a 几何 1366×768 / 1280×800 / 1024×700：谱型条与谱纸同宽同左缘、贴着谱纸顶部（间距 0–14px）、在左栏右边不压左栏、放下「一键配伴奏」不溢出（1280 以上三步名全显示）、无横向页面滚动；打开歌词抽屉后仍与谱纸同宽，抽屉浮层时压在谱型条上面',
      J(geo.filter(x => !x.ok)));
    /* 吸顶：光标走到后面的行时不被谱型条挡住；谱面与无谱型条时逐字节相同 */
    const p3 = await newPage(1280, 800);
    const sf = await p3.evaluate(async () => {
      NWP.quickCreate('pacc'); __mel(song, 0); render(); closeFlyout();
      const sc = scoreScroller(), svg = document.getElementById('score');
      const wait = () => new Promise(r => setTimeout(r, 60));
      /* 把第 9 小节那一行滚到正好被吸顶谱型条挡住（行顶在谱面区上缘下 20px），再把光标放过去让 selFollow 跟滚 */
      const vb = svg.viewBox.baseVal, k0 = svg.getBoundingClientRect().width / vb.width, cb0 = colBoxes['v0:8:0'];
      const yIn = svg.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + cb0.y * k0;
      sc.scrollTop = Math.round(yIn - 20); await wait();
      const bar = document.querySelector('#lb-wrap .lb-bar').getBoundingClientRect(), scR = sc.getBoundingClientRect();
      const R = svg.getBoundingClientRect(), hidTop = Math.round(R.top + cb0.y * k0), hit = hidTop < bar.bottom && hidTop > scR.top;
      sel = {mi:8, row:'vox', vi:0, ci:0, si:1}; blurSel = false; SEL_FOLLOW = true; render(); await wait();
      const R2 = svg.getBoundingClientRect(), cb = colBoxes['v0:8:0'], b2 = document.querySelector('#lb-wrap .lb-bar').getBoundingClientRect();
      const after = { cursorTop: Math.round(R2.top + cb.y * k0), barBottom: Math.round(b2.bottom), hidTop };
      const h1 = svg.innerHTML; const m = LBAR.meta(); m.hidden = true; render(); const h2 = svg.innerHTML; m.hidden = false; render();
      return { barTop: Math.round(bar.top), scTop: Math.round(scR.top), hit, after, same: h1 === h2, st: sc.scrollTop };
    });
    T(sf.barTop - sf.scTop >= 0 && sf.barTop - sf.scTop <= 12 && sf.hit && sf.after && sf.after.cursorTop >= sf.after.barBottom && sf.same,
      'L7b 吸顶：谱面区滚下去时谱型条留在上缘，光标往回走到上一行时跟滚让开谱型条（光标顶 ≥ 谱型条底）；谱面 #score 有无谱型条逐字节相同', J(sf));
    /* 深色：只用主题令牌，文字对比度 ≥4.5 */
    const dk = await p3.evaluate(async () => {
      document.documentElement.setAttribute('data-theme', 'dark'); render();
      await new Promise(r => setTimeout(r, 450));   /* 按钮颜色有 .15s 过渡 */
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const bar = document.querySelector('#lb-wrap .lb-bar'), bg = getComputedStyle(bar).backgroundColor, wbg = getComputedStyle(document.getElementById('lb-wrap')).backgroundColor;
      const pick = s => [...bar.querySelectorAll(s)].filter(e => e.offsetParent).map(e => cr(getComputedStyle(e).color, bg));
      const go = bar.querySelector('.lb-go');
      const r = { bg, wbg, body: getComputedStyle(document.body).backgroundColor, name: pick('.lb-kind b'), steps: pick('.lb-steps li'), seg: pick('.lb-seg button'), go: go ? cr(getComputedStyle(go).color, getComputedStyle(go).backgroundColor) : 0 };
      document.documentElement.removeAttribute('data-theme'); render();
      return r;
    });
    const all = [].concat(dk.name, dk.steps, dk.seg, [dk.go]);
    T(/27, 27, 40/.test(dk.bg) && dk.wbg === dk.body && all.length > 4 && all.every(x => x >= 4.5),
      'L7c 深色主题：谱型条底＝--panel（#1b1b28）、外框底＝谱面区底色，谱名 / 步骤 / 旋律用 / 主按钮文字对比度全部 ≥4.5', J(dk));
    await p3.close();
  } catch (e) { T(false, 'L7 执行异常', e.message.split('\n')[0]); }

  /* ===== L8 换谱类 · 空谱 14 种两两互换（182 次） ===== */
  try {
    const r = await EV(() => {
      const KS = Object.keys(NWB.STACKS), bad = []; let n = 0;
      for (const from of KS) {
        const s0 = NWB.build(from, {title:'空谱换类', key:'D', beats:3, unit:4, tempo:76, nMea:6, inst:'guitar', mode: from==='S'? 'minor' : undefined});
        s0.id = 'tlb-empty-' + from; s0.singer = '演唱者';
        addDoc(s0); LBAR.open({from:'manual'});
        for (const to of KS) { if (to === from) continue;
          const pre = __songJ(), u0 = undoStack.length;
          const mode = LBAR.switchTo(to); n++;
          const s = song, ok1 = mode === 'rebuild' && NWB.stackOf(s) === to && s.title === '空谱换类' && s.key === 'D' && s.beats === 3 && s.unit === 4 && s.tempo === 76
            && s.measures.length === 6 && s.id === 'tlb-empty-' + from && s.singer === '演唱者' && (from !== 'S' || s.mode === 'minor') && undoStack.length === u0 + 1 && lbAllBare(s);
          undo();
          const ok2 = __songJ() === pre;
          if (!ok1 || !ok2) bad.push(from + '>' + to + ':' + mode + ':' + NWB.stackOf(s) + ':' + ok1 + ok2);
        }
      }
      return { n, bad };
    });
    /* 真实点击：空谱菜单提示语 + 每项写结果 + 点「五线谱歌谱」+ Ctrl+Z */
    await EV(() => { NWP.quickCreate('vocal'); closeFlyout(); });
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    const mn = await EV(() => { const m = document.getElementById('lb-menu'); return m && { head: m.querySelector('.lb-mh').textContent, items: [...m.querySelectorAll('.lb-mi')].map(x => x.dataset.sw + ':' + x.querySelector('em').textContent + ':' + x.querySelector('small').textContent) }; });
    const pre = await EV(() => __songJ());
    await CL('#lb-menu .lb-mi[data-sw="S"]'); await pg.waitForTimeout(120);
    const af = await EV(() => ({ k: NWB.stackOf(song), lb: __lb(), menu: !!document.getElementById('lb-menu') }));
    await CL('#score', { position: { x: 300, y: 300 } }).catch(() => {});
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(120);
    const back2 = await EV(p => __songJ() === p, pre);
    T(r.n === 182 && !r.bad.length && mn && /谱还是空的：任意换，按同样的曲名、调、拍号、速度重建/.test(mn.head) && mn.items.length === 14
      && mn.items.filter(x => /:直接换:/.test(x)).length === 13 && mn.items.some(x => /^J:当前:/.test(x))
      && af.k === 'S' && af.lb && af.lb.name === '五线谱歌谱' && !af.menu && back2,
      'L8 空谱 14 种组合两两互换 182 次全部「直接换」：曲名 / 调 / 拍号 / 速度 / 小节数 / 调式 / 演唱者 / 谱 id 保持、换后谱类＝目标、一步撤销逐字节回原；真实点击菜单（空谱提示语、13 项「直接换」＋当前）→ 五线谱歌谱 → Ctrl+Z 回原',
      J({ n: r.n, bad: r.bad.slice(0, 8), mn, af, back2 }));
  } catch (e) { T(false, 'L8 执行异常', e.message.split('\n')[0]); }

  /* ===== L9 换谱类 · 有内容（14×13 规则表、逐行不动、一步撤销、另建一份、不可换） ===== */
  try {
    const r = await EV(() => {
      const KS = Object.keys(NWB.STACKS), FAM = LB_FAM, bad = [], cnt = { direct: 0, copy: 0, no: 0 };
      const exp = (f, t) => { const A = FAM[f], B = FAM[t];
        if (A === 'mel') return (B === 'mel' || B === 'acc' || B === 'jt') ? 'direct' : 'no';
        if (A === 'acc') return B === 'acc' ? 'direct' : (B === 'mel' || B === 'jt') ? 'copy' : 'no';
        if (A === 'jt') return (B === 'mel' || B === 'acc') ? 'copy' : 'no';
        if (A === 'tab') return (B === 'tab' || B === 'jt') ? 'direct' : 'no';
        return B === 'pno' ? 'direct' : 'no'; };
      const full = k => { const s = NWB.build(k, {title:'有内容', key:'G', beats:4, unit:4, tempo:96, nMea:4}); const F = FAM[k];
        if (k === 'C') __chords(s); else if (F === 'mel' || F === 'acc' || F === 'jt') __mel(s, 0);
        if (F === 'acc') { __acc(s, 1); __acc(s, 2); }
        if (F === 'jt' || F === 'tab') __tab(s, 0);
        if (F === 'pno') { __mel(s, 0, {ly:false}); __acc(s, 1); }
        s.id = 'tlb-full-' + k; return s; };
      for (const from of KS) for (const to of KS) { if (from === to) continue;
        const s0 = full(from); addDoc(s0); LBAR.open({from:'manual'});
        const d0 = curDocI, n0 = docs.length, pre = __songJ(), rows0 = __rowsOf(song), u0 = undoStack.length;
        const e = exp(from, to), p = lbPlan(song, to);
        if (p.mode !== e) { bad.push(from + '>' + to + ' plan ' + p.mode + '≠' + e); continue; }
        const mode = LBAR.switchTo(to); cnt[mode] = (cnt[mode] || 0) + 1;
        if (mode === 'direct') {
          const rows = __rowsOf(song), FT = FAM[to];
          let ok = rows.k === to && undoStack.length === u0 + 1 && docs.length === n0;
          /* 原有内容行逐字节：旋律行（含歌词、和弦）、伴奏两行、钢琴两行、TAB 行 */
          if (rows0.mel.length && rows.mel.length) ok = ok && J(rows0.mel) === J(rows.mel);
          if (rows0.acc.length && FT === 'acc') ok = ok && J(rows0.acc) === J(rows.acc);
          if (rows0.pno.length) ok = ok && J(rows0.pno) === J(rows.pno);
          if (rows0.tab.length && (FT === 'tab' || FT === 'jt')) ok = ok && J(rows0.tab) === J(rows.tab);
          /* 新加的行是空的 */
          if (FT === 'acc' && FAM[from] !== 'acc') ok = ok && song.measures.every(m => [1, 2].every(i => m.voxes[i].every(lbColBare)));
          if (to === 'JT' && FAM[from] !== 'jt' && FAM[from] !== 'tab') ok = ok && song.measures.every(m => m.tabs[0].every(lbColBare));
          undo(); ok = ok && __songJ() === pre;
          if (!ok) bad.push(from + '>' + to + ' direct rows');
        } else if (mode === 'copy') {
          const ns = song, o = docs[d0].song;
          let ok = docs.length === n0 + 1 && curDocI === n0 && JSON.stringify(o) === pre && NWB.stackOf(ns) === to && !ns.id
            && J(ns.measures.map(m => m.voxes[0])) === rows0.mel[0] && ns.title === '有内容' && ns.key === 'G' && ns.tempo === 96;
          if (!ok) bad.push(from + '>' + to + ' copy ' + NWB.stackOf(ns));
          closeDocAt(curDocI);
        } else if (mode === 'no') {
          if (!(__songJ() === pre && docs.length === n0 && undoStack.length === u0)) bad.push(from + '>' + to + ' no changed');
        }
        closeDocAt(curDocI);
      }
      return { bad, cnt };
    });
    T(!r.bad.length && r.cnt.direct > 0 && r.cnt.copy > 0 && r.cnt.no > 0,
      'L9a 有内容 14×13＝182 项与规则表逐项一致（旋律类互换 / 加空伴奏两行 / 加空吉他轨＝直接换；伴奏有音符的钢琴伴奏歌谱、TAB 有内容的弹唱谱换旋律类＝另建一份；六线谱 ⇄ 钢琴、旋律 → 纯六线谱 / 钢琴等＝不可换）：直接换的原有各行（旋律含歌词和弦 / 伴奏两行 / 钢琴两行 / TAB）逐字节不变、新加的行全空、一步撤销逐字节；另建一份＝新窗口带旋律（含歌词、和弦）、原谱逐字节保留、新谱无原谱 id；不可换不动谱',
      J(r));
    /* 方案点名的换法逐项（直接换、不动音符）＋部分内容 / 合唱 / 另加音轨 / 弹唱 TAB 和弦带到旋律 */
    const r2 = await EV(() => {
      const out = {};
      const mk = (k, f) => { const s = NWB.build(k, {title:'点名', key:'F', beats:2, unit:4, tempo:104, nMea:4}); f && f(s); addDoc(s); LBAR.open({from:'manual'}); return s; };
      const md = (to) => lbPlan(song, to).mode;
      mk('JG', s => { __mel(s, 0); __acc(s, 1); __acc(s, 2); });
      out.jg = ['SG', 'SJG', 'J', 'JT', 'ST', 'G'].map(t => t + ':' + md(t)).join(' ');
      LBAR.switchTo('SG'); out.jgSG = NWB.stackOf(song); LBAR.switchTo('SJG'); out.sgSJG = NWB.stackOf(song); LBAR.switchTo('JG'); out.back = NWB.stackOf(song);
      mk('J', s => __mel(s, 0)); out.j = ['S', 'SJ', 'JG', 'JT', 'CJ', 'C', 'T', 'G'].map(t => t + ':' + md(t)).join(' ');
      LBAR.switchTo('S'); LBAR.switchTo('SJ'); out.jSJ = NWB.stackOf(song); LBAR.switchTo('J'); out.jBack = NWB.stackOf(song);
      mk('JG', s => __mel(s, 0)); out.jgMelOnly = ['J', 'JT', 'CJ'].map(t => t + ':' + md(t)).join(' ');
      mk('JG', s => { __acc(s, 1); }); out.jgAccOnly = ['J', 'SG'].map(t => t + ':' + md(t)).join(' ');
      mk('JT', s => __mel(s, 0)); out.jtMelOnly = ['J', 'JG', 'T', 'ST'].map(t => t + ':' + md(t)).join(' ');
      mk('JT', s => __tab(s, 0)); out.jtTabOnly = ['J', 'T', 'ST', 'G'].map(t => t + ':' + md(t)).join(' ');
      mk('J', s => { s.voxVoices = ['女高', '女低', '男低']; s.measures.forEach(m => { m.voxes = [m.voxes[0], blankVoxCols(2, 4), blankVoxCols(2, 4)]; }); s.voxGroups = [{type:'bracket', from:0, to:2}]; __mel(s, 0); __mel(s, 1, {sh:2}); __mel(s, 2, {sh:4}); });
      out.choir = ['S', 'SJ', 'JG', 'CJ', 'JT'].map(t => t + ':' + md(t)).join(' ');
      LBAR.switchTo('S'); out.choirS = NWB.kindOfSong(song).name + ':' + J(song.voxNotations);
      /* 钢琴伴奏歌谱另加了旋律轨（四行，非标准谱型）：只给另建一份 / 不可换 */
      mk('JG', s => { __mel(s, 0); __acc(s, 1); }); addVoice('vox'); __mel(song, 1, {sh:3}); render();
      out.extra = NWB.stackOf(song) + ' ' + ['S', 'SG', 'JT', 'G'].map(t => t + ':' + md(t)).join(' ');
      /* 弹唱谱 TAB 上的和弦带到旋律（旋律本身没标和弦） */
      mk('JT', s => { __mel(s, 0, {ch:false}); __tab(s, 0); });
      const n0 = docs.length; LBAR.switchTo('J');
      out.tabCh = docs.length === n0 + 1 && NWB.stackOf(song) === 'J' ? song.measures.map(m => m.voxes[0][0].chord).join(',') : 'no-copy';
      return out;
    });
    T(r2.jg === 'SG:direct SJG:direct J:copy JT:copy ST:no G:no' && r2.jgSG === 'SG' && r2.sgSJG === 'SJG' && r2.back === 'JG'
      && r2.j === 'S:direct SJ:direct JG:direct JT:direct CJ:direct C:direct T:no G:no' && r2.jSJ === 'SJ' && r2.jBack === 'J'
      && r2.jgMelOnly === 'J:direct JT:direct CJ:direct' && r2.jgAccOnly === 'J:no SG:direct'
      && r2.jtMelOnly === 'J:direct JG:direct T:no ST:no' && r2.jtTabOnly === 'J:no T:direct ST:direct G:no'
      && r2.choir === 'S:direct SJ:direct JG:copy CJ:copy JT:copy' && /^五线谱合唱谱:\["staff","staff","staff"\]$/.test(r2.choirS)
      && /^J S:copy SG:copy JT:copy G:no$/.test(r2.extra) && r2.tabCh === 'C,G,Am,F',
      'L9b 方案点名逐项：钢琴伴奏歌谱 ⇄ 五线谱版 ⇄ 教学对照谱（含伴奏）直接换、简谱歌谱 ⇄ 五线谱歌谱 ⇄ 教学对照谱直接换；伴奏空 / TAB 空 / 旋律空的部分内容按「增删空行」判；合唱旋律类互换直接换、换成单旋律谱类另建一份；另加音轨的谱只给另建一份 / 不可换；弹唱谱 TAB 上的和弦另建时挪到旋律',
      J(r2));
  } catch (e) { T(false, 'L9 执行异常', e.message.split('\n')[0]); }

  /* ===== L10 不可换项说明（菜单） ===== */
  try {
    await EV(() => { const s = NWB.build('JT', {title:'弹唱有内容', nMea:4}); __mel(s, 0); __tab(s, 0); addDoc(s); LBAR.open({from:'manual'}); render(); closeFlyout(); });
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    const m = await EV(() => [...document.querySelectorAll('#lb-menu .lb-mi')].map(x => ({ k: x.dataset.sw, mode: x.className.replace(/.*m-/, ''), dis: x.getAttribute('aria-disabled'), why: x.querySelector('small').textContent, tag: x.querySelector('em').textContent })));
    const pre = await EV(() => __songJ());
    await CL('#lb-menu .lb-mi[data-sw="G"]', { force: true });   /* aria-disabled：Playwright 默认不点，真人可以点 */ await pg.waitForTimeout(120);
    const toast0 = await EV(() => document.getElementById('toast').textContent);
    const af = await EV(p => ({ same: __songJ() === p, toast: document.getElementById('toast').textContent, menu: !!document.getElementById('lb-menu'), docs: docs.length,
      flash: !!document.querySelector('#lb-menu .lb-mi.m-flash[data-sw="G"]'), live: (document.getElementById('lb-live') || {}).textContent || '' }), pre);
    await pg.waitForTimeout(80);
    const live = await EV(() => (document.getElementById('lb-live') || {}).textContent || '');
    await pg.keyboard.press('Escape');
    const g = m.find(x => x.k === 'G') || {}, cg = m.find(x => x.k === 'CG') || {}, jj = m.find(x => x.k === 'J') || {};
    /* 收尾验收 F11：点了不可换＝就地亮出原因（该项高亮、读屏播报「不可换：…」），不再弹被菜单盖住一半的提示条 */
    T(m.length === 14 && m.every(x => x.why && x.why.length >= 4 && x.tag) && g.mode === 'no' && g.dis === 'true' && /两种乐器/.test(g.why) && cg.mode === 'no'
      && jj.mode === 'copy' && /另建一份/.test(jj.why) && /带上旋律（含歌词、和弦）/.test(jj.why) && af.same && af.toast === toast0 && af.flash && /不可换：.*两种乐器/.test(live) && af.menu,
      'L10 菜单 14 项每项写结果与是否动音符；吉他弹唱谱 → 钢琴独奏 / 弹唱谱「不可换」（aria-disabled、写明「六线谱和钢琴大谱表是两种乐器」），点了不改谱、菜单不关、就地高亮原因并读屏播报（不弹被菜单盖住的提示条）；→ 简谱歌谱「另建一份 · 带上旋律（含歌词、和弦）」',
      J({ g, cg, jj, af, live }));
  } catch (e) { T(false, 'L10 执行异常', e.message.split('\n')[0]); }

  /* ===== L11 旋律用 简谱 | 五线谱 ＝ 现有记谱法切换、来回逐字节 ===== */
  try {
    const r = await EV(() => {
      const s = NWB.build('J', {title:'旋律用', nMea:3}); __mel(s, 0); addDoc(JSON.parse(JSON.stringify(s))); LBAR.open({from:'manual'}); render(); closeFlyout();   /* 先走一遍 JSON（同落盘 / 撤销后的谱），两条路径起点逐字节相同 */
      const pre = __songJ();
      /* 对照：现有记谱法切换（左栏「显示 · 五线谱」同一函数 setVoxNotation） */
      sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; setVoxNotation('staff'); const viaOld = __songJ(); undo();
      return { pre, viaOld };
    });
    await CL('#lb-wrap .lb-seg [data-v="S"]'); await pg.waitForTimeout(100);
    const a1 = await EV(() => ({ j: __songJ(), k: NWB.stackOf(song), name: NWB.kindOfSong(song).name }));
    await FO('#lb-wrap .lb-seg [data-v="S"]'); await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(100);
    const a2 = await EV(() => ({ j: __songJ(), k: NWB.stackOf(song), focus: (document.activeElement || {}).dataset ? document.activeElement.dataset.v : null, sel: [sel.mi, sel.ci] }));
    /* 低音谱号来回不丢；钢琴伴奏歌谱只切旋律行、钢琴两行不动 */
    const r2 = await EV(() => {
      const s = NWB.build('S', {title:'低音', clef:'bass', lyr:1, nMea:2}); __mel(s, 0); addDoc(s); LBAR.open({from:'manual'});
      const p0 = __songJ(); LBAR.mel('J'); const mid = (song.voxNotations || [])[0]; LBAR.mel('S'); const bass = __songJ() === p0;
      const s2 = NWB.build('JG', {title:'伴奏', nMea:2}); __mel(s2, 0); __acc(s2, 1); __acc(s2, 2); addDoc(s2); LBAR.open({from:'manual'});
      const q0 = __songJ(); LBAR.mel('S'); const vn = J(song.voxNotations), k = NWB.stackOf(song); LBAR.mel('J'); const back = __songJ() === q0;
      return { mid, bass, vn, k, back };
    });
    T(a1.j === r.viaOld && a1.k === 'S' && a1.name === '五线谱歌谱' && a2.j === r.pre && a2.k === 'J' && a2.focus === 'J'
      && r2.mid == null && r2.bass && r2.vn === '["staff","staff","bass"]' && r2.k === 'SG' && r2.back,
      'L11 「旋律用 五线谱」（真实点击）＝现有记谱法切换 setVoxNotation 的结果（逐字节）、←切回简谱逐字节回原并留焦点；低音谱号来回不丢；钢琴伴奏歌谱只切旋律行（钢琴两行 staff / bass 不动）',
      J({ a1: a1.k, a2, r2, eqOld: a1.j === r.viaOld, back: a2.j === r.pre }));
  } catch (e) { T(false, 'L11 执行异常', e.message.split('\n')[0]); }

  /* ===== L12 键盘 ===== */
  try {
    await EV(() => { NWP.quickCreate('pacc'); __mel(song, 0); sel = {mi:2, row:'vox', vi:0, ci:1, si:1}; render(); closeFlyout(); });
    const s0 = await EV(() => [sel.mi, sel.ci, sel.row, sel.vi].join(':'));
    await FO('#lb-wrap .lb-kind'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
    const k1 = await EV(() => ({ menu: !!document.getElementById('lb-menu'), focus: document.activeElement && document.activeElement.dataset.sw, exp: document.querySelector('#lb-wrap .lb-kind').getAttribute('aria-expanded') }));
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(50);
    const k2 = await EV(() => ({ focus: document.activeElement && document.activeElement.dataset.sw, sel: [sel.mi, sel.ci, sel.row, sel.vi].join(':') }));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(60);
    const k3 = await EV(() => ({ menu: !!document.getElementById('lb-menu'), focusKind: document.activeElement && document.activeElement.classList.contains('lb-kind') }));
    /* Tab 走到主按钮，Enter 触发 */
    let reached = false;
    for (let i = 0; i < 6 && !reached; i++) { await pg.keyboard.press('Tab'); reached = await EV(() => !!(document.activeElement && document.activeElement.classList.contains('lb-go'))); }
    if (reached) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(150); }
    const k4 = await EV(() => ({ modal: !!document.getElementById('arr-go'), out: (document.getElementById('arr-out') || {}).value }));
    await EV(() => closeModal());
    T(k1.menu && k1.focus === 'JG' && k1.exp === 'true' && k2.focus === 'SJG' && k2.sel === s0 && !k3.menu && k3.focusKind && reached && k4.modal && k4.out === 'fill',
      'L12 键盘：谱名上 Enter 开菜单（焦点落「当前」项）、↓ 走查、方向键不动谱面光标、Esc 关并回到谱名；Tab 走到「一键配伴奏」Enter 打开智能配谱（默认填进当前谱）',
      J({ k1, k2, s0, k3, reached, k4 }));
  } catch (e) { T(false, 'L12 执行异常', e.message.split('\n')[0]); }

  /* ========== 收尾验收回归（修前＝实现者交付版红、修后绿） ========== */
  /* 页头 1=X 与逐音实际音高（voxMidi）、旋律行逐音数据 */
  const PITCH = `(()=>{ window.__pitch=()=>{ const o=[]; song.measures.forEach((m,mi)=>(m.voxes[0]||[]).forEach(c=>{ if(c.deg>0) o.push(voxMidi(c,mi)); })); return o.join(','); };
    window.__hdr=()=>[...document.querySelectorAll('#score text')].map(x=>x.textContent).filter(x=>/^1=|变调夹|调弦/.test(x)).join(' | ');
    window.__key1=()=>((__hdr().match(/1=\\S+/)||[''])[0]); return 1; })()`;

  /* ===== L13 变调夹折进调（major：有夹位的弹唱谱换成没有六线谱的谱类，音高整体移调） ===== */
  try {
    await EV(PITCH);
    /* 真实点击：新建面板 吉他弹唱 · 先写旋律 · 变调夹 2 品 → 数字键 1235 → 谱型条换成钢琴伴奏歌谱（直接换） */
    await CL('#b-new'); await pg.waitForTimeout(250);
    await CL('[data-scene="gtr"]'); await pg.waitForTimeout(120);
    await CL('[data-act="var"][data-k="pen"][data-v="J"]'); await pg.waitForTimeout(120);
    if (!(await EV(() => { const e = document.getElementById('nf-capo'); return !!(e && e.offsetParent); }))) { await pg.click('text=更多设置', { timeout: 2000 }).catch(() => {}); await pg.waitForTimeout(120); }
    await pg.selectOption('#nf-capo', '2', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(100);
    await CL('#nw-create'); await pg.waitForTimeout(300);
    for (const k of '1235') { await pg.keyboard.press(k); await pg.waitForTimeout(30); }
    await pg.waitForTimeout(80);
    const b0 = await EV(() => ({ k: NWB.stackOf(song), capo: song.capo, pitch: __pitch(), key1: __key1(), hdr: __hdr(), j: __songJ(), u: undoStack.length }));
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    const why = await EV(() => { const x = document.querySelector('#lb-menu .lb-mi[data-sw="JG"]'); return x ? x.querySelector('small').textContent + ' / ' + x.querySelector('em').textContent : null; });
    await CL('#lb-menu .lb-mi[data-sw="JG"]'); await pg.waitForTimeout(150);
    const a0 = await EV(() => ({ k: NWB.stackOf(song), capo: song.capo, pitch: __pitch(), key1: __key1(), hdr: __hdr(), toast: document.getElementById('toast').textContent, tuning: 'tuning' in song }));
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(120);
    const back = await EV(j => __songJ() === j, b0.j);
    /* 另建一份 / 空谱重建 / 中途转调跨 ♯F–G 边界 / 定弦 / TAB 上的和弦 / 没有 TAB 的残留夹位加回吉他轨 */
    const r = await EV(() => {
      const out = {};
      /* E 调夹 3 品（实际 G，跨折八度边界）＋第 3 小节转 A（实际 C）＋Drop D＋和弦：TAB 有内容 → 简谱歌谱＝另建一份 */
      const s = NWB.build('JT', {title:'夹三品', key:'E', capo:3, nMea:4, tuning:[38,45,50,55,59,64]}); __mel(s, 0); __tab(s, 0); s.measures[2].keyTo = 'A';
      s.measures[1].voxes[0][1].adds = [{deg:3, oct:0, acc:''}];
      addDoc(s); LBAR.open({from:'manual'}); render();
      const p0 = __pitch(), k0 = __key1(), ch0 = song.measures.map(m => m.voxes[0][0].chord).join(','), tch0 = song.measures.map(m => m.tabs[0][0].chord).join(',');
      const add0 = voxMidi(Object.assign({}, song.measures[1].voxes[0][1], song.measures[1].voxes[0][1].adds[0]), 1);
      const n0 = docs.length; out.copyMode = LBAR.switchTo('J');
      out.copy = { n: docs.length - n0, k: NWB.stackOf(song), same: __pitch() === p0, key1: __key1() === k0, k0, k1: __key1(), capo: song.capo, tuning: 'tuning' in song, hdr: __hdr(),
        ch: song.measures.map(m => m.voxes[0][0].chord).join(','), ch0, tch0, keyTo: song.measures[2].keyTo, refOct: song.refOct,
        add: voxMidi(Object.assign({}, song.measures[1].voxes[0][1], song.measures[1].voxes[0][1].adds[0]), 1) === add0 };
      /* 空谱重建：C 调夹 2 品 → 五线谱歌谱，1=D */
      const e = NWB.build('JT', {title:'空', key:'C', capo:2, nMea:2}); addDoc(e); LBAR.open({from:'manual'}); render();
      out.rbMode = LBAR.switchTo('S'); out.rb = { k: NWB.stackOf(song), key: song.key, capo: song.capo };
      /* 直接换（TAB 空、旋律有）：E 调夹 3 品 → 钢琴伴奏歌谱，逐音同音高、Ctrl+Z 逐字节回原 */
      const d = NWB.build('JT', {title:'直接', key:'E', capo:3, nMea:3}); __mel(d, 0); addDoc(d); LBAR.open({from:'manual'}); render();
      const dp = __pitch(), dk = __key1(), dj = __songJ();
      out.dMode = LBAR.switchTo('JG'); out.d = { same: __pitch() === dp, key1: __key1() === dk, capo: song.capo, refOct: song.refOct };
      undo(); out.d.undo = __songJ() === dj;
      /* 有 TAB 的谱类之间（弹唱 → 纯六线谱）夹位照留 */
      const t = NWB.build('JT', {title:'留夹', key:'C', capo:2, nMea:2}); __tab(t, 0); addDoc(t); LBAR.open({from:'manual'}); render();
      out.tMode = LBAR.switchTo('T'); out.t = { k: NWB.stackOf(song), capo: song.capo };
      /* 没有 TAB 却残留夹位的简谱（左栏删过吉他轨）→ 吉他弹唱谱：此前夹位不发声，加上吉他轨后音高不变（夹位归 0） */
      const l = NWB.build('J', {title:'残留', key:'C', nMea:2}); __mel(l, 0); l.capo = 2; addDoc(l); LBAR.open({from:'manual'}); render();
      const lp = __pitch(), lk = __key1(); out.lMode = LBAR.switchTo('JT'); out.l = { same: __pitch() === lp, key1: __key1() === lk, capo: song.capo };
      return out;
    });
    T(b0.k === 'JT' && b0.capo === 2 && b0.key1 === '1=D' && /变调夹 2 品/.test(b0.hdr) && /按实际调 1=D 记（变调夹 2 品折进调）/.test(why || '') && /音高不变/.test(why || '')
      && a0.k === 'JG' && a0.capo === 0 && a0.pitch === b0.pitch && a0.key1 === '1=D' && !/变调夹|调弦/.test(a0.hdr) && /按实际调 1=D/.test(a0.toast) && !/都没动/.test(a0.toast) && back
      && r.copyMode === 'copy' && r.copy.n === 1 && r.copy.k === 'J' && r.copy.same && r.copy.key1 && r.copy.k1 === '1=G' && r.copy.capo === 0 && !r.copy.tuning && !/变调夹|调弦/.test(r.copy.hdr)
      && r.copy.ch === 'Eb,Ab,Bb7,Cm' && r.copy.keyTo === 'C' && r.copy.refOct === 1 && r.copy.add
      && r.rbMode === 'rebuild' && r.rb.k === 'S' && r.rb.key === 'D' && r.rb.capo === 0
      && r.dMode === 'direct' && r.d.same && r.d.key1 && r.d.capo === 0 && r.d.undo && r.tMode === 'direct' && r.t.k === 'T' && r.t.capo === 2
      && r.lMode === 'direct' && r.l.same && r.l.key1 && r.l.capo === 0,
      'L13 变调夹折进调（真实点击：吉他弹唱 · 先写旋律 · 夹 2 品 → 钢琴伴奏歌谱）：菜单写「按实际调 1=D 记（变调夹 2 品折进调）· 音高不变」；换后页头仍 1=D、逐音实际音高相同、页头不再挂「变调夹 / 调弦」、提示照实说；Ctrl+Z 逐字节回原。另建一份（E 调夹 3 品跨折八度边界＋中途转调＋Drop D＋TAB 和弦）逐音音高 / 和音 / 1=X 相同、和弦名改实际音高、refOct 补八度；空谱重建 1=D；有 TAB 的谱类之间夹位照留；没有 TAB 的残留夹位加回吉他轨后音高不变',
      J({ b0: Object.assign({}, b0, { j: undefined }), why, a0, back, r }));
  } catch (e) { T(false, 'L13 执行异常', e.message.split('\n')[0]); }

  /* ===== L14 播放跟随 / 报错跳转让开吸顶谱型条（major） ===== */
  try {
    const res = [];
    for (const [w, h] of [[1366, 768], [1280, 800]]) {
      const p5 = await newPage(w, h);
      const r = await p5.evaluate(async () => {
        const s = NWB.build('JG', {title:'长谱', nMea:40}); __mel(s, 0); __acc(s, 1); __acc(s, 2); addDoc(s); LBAR.open({from:'new'}); render(); try { closeFlyout(); } catch (_) {}
        const sc = scoreScroller(); const o = sc.scrollTo.bind(sc); sc.scrollTo = a => o(Object.assign({}, a, { behavior: 'instant' })); sc.scrollTop = 0;
        let hits = 0, worst = 0;
        for (let mi = 0; mi < 40; mi++) {
          highlight('v0', mi, 0, true);   /* 与真实播放同一函数 */
          const ph = document.getElementById('playhead').getBoundingClientRect(), lbB = document.getElementById('lb-wrap').getBoundingClientRect().bottom;
          const hid = Math.max(0, lbB - ph.top); if (hid > 0.5) hits++; worst = Math.max(worst, hid);
        }
        /* 报错跳转：点报错清单里第 33 小节那一条 */
        sc.scrollTop = 0; await new Promise(r => setTimeout(r, 30));
        const dd = document.getElementById('err-drop'); dd.classList.remove('hidden');
        dd.insertAdjacentHTML('beforeend', '<div class="err" id="tlb-err" data-mi="32" data-row="vox" data-vi="0">第 33 小节</div>');
        return { hits, worst: Math.round(worst) };
      });
      await p5.click('#tlb-err', { force: true, timeout: 2500 }).catch(() => {});
      await p5.waitForTimeout(150);
      const ej = await p5.evaluate(() => { const svg = document.getElementById('score'), k = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height, b = colBoxes['v0:32:0'];
        return { top: Math.round(svg.getBoundingClientRect().top + b.y * k), lbB: Math.round(document.getElementById('lb-wrap').getBoundingClientRect().bottom), mi: sel.mi }; });
      res.push({ w, r, ej });
      await p5.close();
    }
    T(res.every(x => x.r.hits === 0 && x.ej.mi === 32 && x.ej.top >= x.ej.lbB),
      'L14 吸顶谱型条下的播放跟随：40 小节钢琴伴奏歌谱逐小节 highlight（真实播放同一函数），1366×768 / 1280×800 播放带顶全部在谱型条底边之下（此前 35 / 21 小节被遮 18px、和弦名被裁）；点报错清单跳到第 33 小节，该小节顶在谱型条之下',
      J(res));
  } catch (e) { T(false, 'L14 执行异常', e.message.split('\n')[0]); }

  /* ===== L15 鼠标点过谱型条后焦点交还谱面（major ←→ 截走 / minor 空格 · Tab）＋光标不被重置 ===== */
  try {
    await EV(() => { NWP.quickCreate('pacc'); __mel(song, 0); render(); closeFlyout(); sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; blurSel = false; render(); });
    await CL('#lb-wrap .lb-seg [data-v="S"]'); await pg.waitForTimeout(120);
    const f0 = await EV(() => ({ k: NWB.stackOf(song), u: undoStack.length, ae: !!(document.activeElement && document.activeElement.closest('#lb-wrap')), sel: sel.mi + ':' + sel.ci }));
    await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(40); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(60);
    const f1 = await EV(() => ({ k: NWB.stackOf(song), u: undoStack.length, sel: sel.mi + ':' + sel.ci }));
    /* 鼠标换谱类：五线谱版 → 教学对照谱（含伴奏）；行结构不变，光标留在原处；随后空格＝播放、不重开菜单 */
    await EV(() => { sel = {mi:2, row:'vox', vi:0, ci:2, si:1}; render(); });
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    await CL('#lb-menu .lb-mi[data-sw="SJG"]'); await pg.waitForTimeout(150);
    const f2 = await EV(() => ({ k: NWB.stackOf(song), sel: [sel.mi, sel.row, sel.vi, sel.ci].join(':'), ae: !!(document.activeElement && document.activeElement.closest('#lb-wrap, #lb-menu')) }));
    await pg.keyboard.press(' '); await pg.waitForTimeout(400);
    const f3 = await EV(() => ({ menu: !!document.getElementById('lb-menu'), playing: !!(audio && audio.playing) }));
    await EV(() => { try { stopPlay(); } catch (_) {} });
    await pg.keyboard.press('Tab'); await pg.waitForTimeout(80);
    const f4 = await EV(() => ({ row: sel.row + ':' + sel.vi, ae: (document.activeElement || {}).tagName }));
    /* 键盘换谱类（Enter 选项）：焦点回到谱名；删行的换法清掉指向旧行的选区 */
    await EV(() => { sel = {mi:1, row:'vox', vi:2, ci:1, si:1}; selRange = {row:'vox', vi:2, m1:1, c1:0, m2:1, c2:1}; render(); });
    const f5pre = await EV(() => lbPlan(song, 'S').mode);
    await EV(() => { const s = song; s.measures.forEach(m => { [1, 2].forEach(i => { m.voxes[i] = blankVoxCols(m.beats || s.beats, m.unit || s.unit); }); }); render(); });
    await FO('#lb-wrap .lb-kind'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
    await EV(() => { const it = document.querySelector('#lb-menu .lb-mi[data-sw="S"]'); if (it) it.focus(); });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const f5 = await EV(() => ({ k: NWB.stackOf(song), sel: [sel.row, sel.vi].join(':'), selRange, focusKind: !!(document.activeElement && document.activeElement.classList.contains('lb-kind')) }));
    T(f0.k === 'SG' && !f0.ae && f1.k === 'SG' && f1.u === f0.u && f1.sel !== f0.sel
      && f2.k === 'SJG' && f2.sel === '2:vox:0:2' && !f2.ae && !f3.menu && f3.playing && f4.ae === 'BODY'
      && f5pre && f5.k === 'S' && f5.sel === 'vox:0' && f5.selRange === null && f5.focusKind,
      'L15 鼠标点「旋律用 五线谱」后焦点交还谱面：→→ 移光标、谱类不变、不多撤销步；鼠标换谱类后光标留在原处（第 3 小节第 3 拍）、焦点不留在谱型条：空格＝播放（不重开菜单）、Tab 归谱面（焦点不在谱型条按钮间走）；键盘 Enter 换谱类焦点回到谱名，删行的换法清掉指向旧行的选区并把光标夹回现有声部',
      J({ f0, f1, f2, f3, f4, f5pre, f5 }));
  } catch (e) { T(false, 'L15 执行异常', e.message.split('\n')[0]); }

  /* ===== L16 吉他弹唱：生成 → 续写 → 补齐，轨数仍为 1、手改的品位不动（major F1）＋光标落生成的第一个音（F6）＋第 ③ 步提示可见 ===== */
  try {
    await CL('#b-new'); await pg.waitForTimeout(250);
    await CL('[data-scene="gtr"]'); await pg.waitForTimeout(120);
    await CL('[data-act="var"][data-k="pen"][data-v="J"]'); await pg.waitForTimeout(120);
    await CL('#nw-create'); await pg.waitForTimeout(300);
    await EV(() => closeFlyout());
    for (const k of '3561') { await pg.keyboard.press(k); await pg.waitForTimeout(30); }
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    await CL('#vt-low'); await pg.waitForTimeout(200);
    const g1 = await EV(() => ({ tabs: song.tabVoices.slice(), sel: [sel.row, sel.vi, sel.mi].join(':'), lb: __lb(), hint: (document.querySelector('#lb-wrap .lb-hint') || {}).textContent || '' }));
    /* 用户手改第 1 小节第 1 个品位（第 ③ 步） */
    await EV(() => { mutate(() => { song.measures[0].tabs[0][0].notes = [{s:1, f:5}]; }); });
    /* 续写第 2、3 小节旋律（真实键盘） */
    await EV(() => { sel = {mi:1, row:'vox', vi:0, ci:0, si:1}; blurSel = false; setRibbon('vox'); render(); });
    for (const k of '65321235') { await pg.keyboard.press(k); await pg.waitForTimeout(25); }
    await pg.waitForTimeout(80);
    const g2 = await EV(() => ({ lb: __lb(), hint: (document.querySelector('#lb-wrap .lb-hint') || {}).textContent || '' }));
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    const md = await EV(() => ({ fill: !!document.querySelector('input[name="vt-dest"][value="fill"]:checked'), txt: (document.querySelector('.vt-dest') || {}).textContent || '' }));
    await CL('#vt-low'); await pg.waitForTimeout(200);
    const g3 = await EV(() => ({ tabs: song.tabVoices.slice(), m0: JSON.stringify(song.measures[0].tabs[0][0].notes), cov: song.measures.slice(0, 4).map(m => (m.tabs[0] || []).some(c => (c.notes || []).length) ? 'T' : '-').join(''),
      lb: __lb(), sel: [sel.row, sel.vi, sel.mi].join(':'), toast: document.getElementById('toast').textContent }));
    /* 左栏「显示 · 六线谱」同一弹窗：再续写第 4 小节 → 默认补进，不再多一条同名轨 */
    await EV(() => { sel = {mi:3, row:'vox', vi:0, ci:0, si:1}; blurSel = false; setRibbon('vox'); render(); });
    for (const k of '5555') { await pg.keyboard.press(k); await pg.waitForTimeout(25); }
    await EV(() => showVoxTabMenu(0)); await pg.waitForTimeout(100);
    await CL('#vt-low'); await pg.waitForTimeout(150);
    const g4 = await EV(() => ({ tabs: song.tabVoices.length, cov: song.measures.slice(0, 4).map(m => (m.tabs[0] || []).some(c => (c.notes || []).length) ? 'T' : '-').join('') }));
    T(g1.tabs.length === 1 && g1.sel === 'tab:0:0' && g1.lb.steps === 'done:写旋律 | done:生成六线谱 | now:调把位与扫弦' && /↑↓ 选弦/.test(g1.hint) && !/换弦、/.test(g1.hint)
      && g2.lb.steps === 'done:写旋律 | now:生成六线谱 | todo:调把位与扫弦' && g2.lb.go === '补齐六线谱' && /2 个小节还没有六线谱/.test(g2.hint)
      && md.fill && /补进「吉他·旋律1」/.test(md.txt) && g3.tabs.length === 1 && g3.m0 === '[{"s":1,"f":5}]' && g3.cov === 'TTT-' && g3.sel === 'tab:0:1'
      && g3.lb.steps === 'done:写旋律 | done:生成六线谱 | now:调把位与扫弦' && /已补进/.test(g3.toast) && g4.tabs === 1 && g4.cov === 'TTTT',
      'L16 吉他弹唱「先写旋律」（真实点击＋键盘）：生成六线谱后光标落第 1 小节 TAB、第 ③ 步提示可见（↑↓ 选弦、数字键写品位）；续写 2 小节后 ② 回到当前「补齐六线谱」并写明缺几个小节 → 弹窗默认「补进「吉他·旋律1」」→ 只补新小节、手改的品位不动、轨数仍 1、光标落第一个补进的小节；左栏同一弹窗再续写也默认补进，不再多出第二条「吉他·旋律1」',
      J({ g1, g2, md, g3, g4 }));
  } catch (e) { T(false, 'L16 执行异常', e.message.split('\n')[0]); }

  /* ===== L17 ≤1200 宽能调回谱型条（major F2）：「智能」抽屉 / Alt+B；收起提示按当前宽度写真实入口 ===== */
  try {
    const p6 = await newPage(1024, 700);
    await p6.evaluate(() => { NWP.quickCreate('pacc'); });
    await p6.waitForTimeout(150);
    await p6.click('#lb-wrap .lb-x', { timeout: 2500 }).catch(() => {}); await p6.waitForTimeout(100);
    const t0 = await p6.evaluate(() => ({ toast: document.getElementById('toast').textContent, lb: !!document.querySelector('#lb-wrap .lb-bar'), rd: getComputedStyle(document.getElementById('right-dock')).display }));
    await p6.click('#b-msmart', { timeout: 2500 }).catch(() => {}); await p6.waitForTimeout(150);
    const t1 = await p6.evaluate(() => { const r = document.getElementById('right-dock').getBoundingClientRect(); return { w: Math.round(r.width), l: Math.round(r.left), sheet: document.body.classList.contains('rsheet') }; });
    await p6.click('#rtabs .rtab[data-p="info"]', { timeout: 2500 }).catch(() => {}); await p6.waitForTimeout(80);
    await p6.click('#ri-lbar', { timeout: 2500 }).catch(() => {}); await p6.waitForTimeout(150);
    const t2 = await p6.evaluate(() => ({ lb: !!document.querySelector('#lb-wrap .lb-bar'), sheet: document.body.classList.contains('rsheet'), focus: !!(document.activeElement && document.activeElement.classList.contains('lb-kind')) }));
    await p6.click('#lb-wrap .lb-x', { timeout: 2500 }).catch(() => {}); await p6.waitForTimeout(80);
    await p6.click('#score', { position: { x: 200, y: 200 } }).catch(() => {}); await p6.waitForTimeout(60);
    await p6.keyboard.press('Alt+b'); await p6.waitForTimeout(150);
    const t3 = await p6.evaluate(() => ({ lb: !!document.querySelector('#lb-wrap .lb-bar'), focus: !!(document.activeElement && document.activeElement.classList.contains('lb-kind')) }));
    await p6.close();
    T(t0.rd === 'none' && !t0.lb && /智能/.test(t0.toast) && !/右栏「信息/.test(t0.toast) && t1.sheet && t1.w >= 280 && t1.l > 600 && t2.lb && !t2.sheet && t2.focus && t3.lb && t3.focus,
      'L17 1024×700（右栏隐藏）：收起提示写真实入口（顶栏「智能」→「信息」，不再叫人去看不见的右栏）；点「智能」右侧抽屉出来 →「信息」→「谱型条 · 换谱类…」调回谱型条、抽屉收起、焦点落谱名；再收起后 Alt+B 也能调回并聚焦谱名',
      J({ t0, t1, t2, t3 }));
  } catch (e) { T(false, 'L17 执行异常', e.message.split('\n')[0]); }

  /* ===== L18 起步条按顺序推进（major F3）＋伴奏织体没生成不留撤销步 ===== */
  try {
    await EV(() => { NWP.quickCreate('pacc'); closeFlyout(); sel = {mi:0, row:'vox', vi:1, ci:0, si:1}; blurSel = false; render(); });
    await pg.keyboard.press('1'); await pg.waitForTimeout(80);
    const s1 = await EV(() => ({ lb: __lb(), cur: document.querySelectorAll('#lb-wrap [aria-current="step"]').length, acc: song.measures[0].voxes[1].some(c => c.deg > 0) }));
    /* 伴奏织体：旋律、和弦都没有 → 未生成；谱不变、撤销栈不多一步 */
    const tx0 = await EV(() => ({ j: __songJ(), u: undoStack.length }));
    await EV(() => document.getElementById('b-acctex').click()); await pg.waitForTimeout(100);
    await CL('#tex-go'); await pg.waitForTimeout(150);
    const tx1 = await EV(j => ({ same: __songJ() === j, u: undoStack.length, toast: document.getElementById('toast').textContent }), tx0.j);
    /* 吉他弹唱「先写旋律」先写了六线谱 */
    await EV(() => { NWP.quickCreate('gtr'); LBAR.open({from:'new', pen:'J'}); closeFlyout(); sel = {mi:0, row:'tab', vi:0, ci:0, si:3}; blurSel = false; setRibbon('tab'); render(); });
    await pg.keyboard.press('3'); await pg.waitForTimeout(80);
    const s2 = await EV(() => ({ lb: __lb(), cur: document.querySelectorAll('#lb-wrap [aria-current="step"]').length }));
    T(s1.acc && s1.lb && s1.lb.steps === 'now:写旋律 | todo:配和弦与伴奏 | todo:选织体' && s1.cur === 1 && !s1.lb.go
      && tx1.same && tx1.u === tx0.u && /未生成/.test(tx1.toast)
      && s2.lb && s2.lb.steps === 'now:写旋律 | todo:生成六线谱 | todo:调把位与扫弦' && s2.cur === 1 && !s2.lb.go,
      'L18 起步条按顺序推进：钢琴伴奏歌谱先写伴奏 / 吉他弹唱先写六线谱时只有 ① 是当前（一个 aria-current）、后面的「未到」、没有走不通的主按钮；伴奏织体未生成时谱不变、撤销栈不多一步看不见的改动',
      J({ s1, tx0: tx0.u, tx1, s2 }));
  } catch (e) { T(false, 'L18 执行异常', e.message.split('\n')[0]); }

  /* ===== L19 先配后续写：② 回到当前「补配 N 小节」（F5） ===== */
  try {
    await EV(() => { NWP.quickCreate('pacc'); closeFlyout(); const s = song; __mel(s, 0); s.measures.forEach((m, mi) => { if (mi > 0) m.voxes[0] = blankVoxCols(s.beats, s.unit); }); render(); });
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150); await CL('#arr-go'); await pg.waitForTimeout(200);
    const p1 = await EV(() => ({ lb: __lb() }));
    await EV(() => { mutate(() => { [1, 2].forEach(mi => { song.measures[mi].voxes[0] = [1, 2, 3, 5].map(d => __V(d, 4)); }); }); });
    const p2 = await EV(() => ({ lb: __lb(), hint: (document.querySelector('#lb-wrap .lb-hint') || {}).textContent || '' }));
    await CL('#lb-wrap .lb-go'); await pg.waitForTimeout(150);
    const pm = await EV(() => ({ out: (document.getElementById('arr-out') || {}).value }));
    await CL('#arr-go'); await pg.waitForTimeout(200);
    const p3 = await EV(() => ({ lb: __lb(), acc: song.measures.slice(0, 3).map(m => m.voxes[1].some(c => c.deg > 0) ? 'A' : '-').join('') }));
    T(p1.lb.steps === 'done:写旋律 | done:配和弦与伴奏 | now:选织体' && p2.lb.steps === 'done:写旋律 | now:配和弦与伴奏 | todo:选织体' && p2.lb.go === '补配 2 小节'
      && /2 个小节还没有伴奏/.test(p2.hint) && pm.out === 'fill' && p3.acc === 'AAA' && p3.lb.steps === 'done:写旋律 | done:配和弦与伴奏 | now:选织体',
      'L19 先配了 1 小节再续写 2 小节：② 回到当前、主按钮「补配 2 小节」并写明缺几个小节 → 智能配谱（填进当前谱）→ 三个小节都有伴奏、回到 ③',
      J({ p1, p2, pm, p3 }));
  } catch (e) { T(false, 'L19 执行异常', e.message.split('\n')[0]); }

  /* ===== L20 读屏语义 / 建成提示 / 对齐与谱名 / 菜单文字 / 另建页签 / 按内容给起步条 / 命中区 / 经典版 / 长带（F6 F8–F13 等 minor） ===== */
  try {
    /* F9 建成提示：下一步交给谱型条 */
    await CL('#b-newdd'); await pg.waitForTimeout(120); await CL('.nf-qm [data-q="pacc"]'); await pg.waitForTimeout(200);
    const n1 = await EV(() => ({ toast: document.getElementById('toast').textContent }));
    /* F8：谱名可访问名、分组、说明关联、步骤推进播报 */
    await EV(() => { closeFlyout(); sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; blurSel = false; render(); });
    await pg.keyboard.press('5'); await pg.waitForTimeout(150);
    const a1 = await EV(() => { const k = document.querySelector('#lb-wrap .lb-kind'); return { al: k.getAttribute('aria-label'), live: (document.getElementById('lb-live') || {}).textContent || '' }; });
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    const a2 = await EV(() => { const m = document.getElementById('lb-menu'), gs = [...m.querySelectorAll('[role=group]')];
      const it = m.querySelector('.lb-mi[data-sw="J"]'), d = it && document.getElementById(it.getAttribute('aria-describedby'));
      return { groups: gs.length, labelled: gs.every(g => { const l = document.getElementById(g.getAttribute('aria-labelledby')); return l && l.textContent.length > 1 && g.querySelector('[role=menuitem]'); }),
        desc: d ? d.textContent : '', name: it ? it.querySelector('b').textContent : '' }; });
    await pg.keyboard.press('Escape');
    /* F11：空谱菜单每项说明不重复 */
    await EV(() => { NWP.quickCreate('vocal'); closeFlyout(); });
    await CL('#lb-wrap .lb-kind'); await pg.waitForTimeout(100);
    const e1 = await EV(() => { const sm = [...document.querySelectorAll('#lb-menu .lb-mi:not(.m-same) small')].map(x => x.textContent); return { n: sm.length, uniq: new Set(sm).size, one: sm[0] }; });
    await pg.keyboard.press('Escape');
    /* F11：另建一份照实说原谱在第几个页签 */
    const c1 = await EV(() => { const s = NWB.build('JG', {title:'另建页签', nMea:2}); __mel(s, 0); __acc(s, 1); addDoc(s); LBAR.open({from:'manual'}); render(); const d0 = curDocI;
      LBAR.switchTo('J'); return { toast: document.getElementById('toast').textContent, d0 }; });
    /* F12：「新建 ▾ 吉他弹唱」（直接写六线谱）后先写了旋律 → 照样给「生成六线谱」 */
    await EV(() => { NWP.quickCreate('gtr'); closeFlyout(); sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; blurSel = false; setRibbon('vox'); render(); });
    const g0 = await EV(() => ({ pen: (LBAR.meta() || {}).pen, lb: __lb() }));
    for (const k of '5653') { await pg.keyboard.press(k); await pg.waitForTimeout(25); }
    await pg.waitForTimeout(60);
    const g1 = await EV(() => ({ lb: __lb() }));
    /* F6：钢琴弹唱谱（纯伴奏）第 ① 步提示可见 */
    const cgH = await EV(() => { const s = NWB.build('CG', {title:'纯伴奏', nMea:2}); addDoc(s); LBAR.open({from:'new'}); render(); return (document.querySelector('#lb-wrap .lb-hint') || {}).textContent || ''; });
    /* F13：命中区 */
    const hit = await EV(() => { NWP.quickCreate('pacc'); render(); return [...document.querySelectorAll('#lb-wrap button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)); });
    T(/谱型条/.test(n1.toast) && !/右栏/.test(n1.toast) && /换谱类/.test(a1.al) && /钢琴伴奏歌谱/.test(a1.al) && /第 2 步：配和弦与伴奏/.test(a1.live)
      && a2.groups === 4 && a2.labelled && /另建一份|直接换/.test(a2.desc) && a2.name === '简谱歌谱'
      && e1.n === 13 && e1.uniq === 13 && /^.*谱行：/.test(e1.one) && new RegExp('原谱仍在第 ' + (c1.d0 + 1) + ' 个页签').test(c1.toast) && !/前一个窗口/.test(c1.toast)
      && g0.pen === 'T' && g0.lb && !g0.lb.steps && g1.lb && g1.lb.steps === 'done:写旋律 | now:生成六线谱 | todo:调把位与扫弦' && g1.lb.go === '生成六线谱'
      && /Ctrl\+K/.test(cgH) && hit.length >= 4 && hit.every(h => h >= 44),
      'L20 建成提示指向谱型条（不再指向右栏）；谱名按钮可访问名含「换谱类」、写第 1 个音后读屏播报「第 2 步：配和弦与伴奏」、菜单分组 role=group 有标题、菜单项说明经 aria-describedby 关联；空谱菜单 13 项说明各不相同；另建一份照实说原谱在第几个页签；「新建 ▾」吉他弹唱（直接写六线谱）先写旋律也给「生成六线谱」；钢琴弹唱谱第 ① 步提示可见（Ctrl+K）；谱型条按钮命中区全部 ≥44px',
      J({ n1, a1, a2, e1, c1, g0, g1, cgH, hit }));
    /* F10 示例谱（非固定版宽、左栏展开）：谱型条与可见纸面 #score 同宽同左缘、谱名不被省略；经典版不吸顶；不换行长带横滚后谱型条仍在可视区 */
    const p7 = await newPage(1366, 768);
    await p7.click('#rtabs .rtab[data-p="info"]', { timeout: 2500 }).catch(() => {}); await p7.click('#ri-lbar', { timeout: 2500 }).catch(() => {}); await p7.waitForTimeout(200);
    const x1 = await p7.evaluate(() => { const w = document.getElementById('lb-wrap'); if (!w) return null; const b = w.querySelector('.lb-bar').getBoundingClientRect(), s = document.getElementById('score').getBoundingClientRect(), nm = w.querySelector('.lb-kind b');
      return { fix: document.body.classList.contains('fixwide'), dl: Math.round(b.left - s.left), dr: Math.round(b.right - s.right), cut: nm.scrollWidth > nm.clientWidth + 1, name: nm.textContent }; });
    await p7.evaluate(() => { setNoWrap(true); render(); }); await p7.waitForTimeout(150);
    const x2 = await p7.evaluate(() => { const sw = document.getElementById('score-wrap'); sw.scrollLeft = 1500; return new Promise(r => setTimeout(() => { const kE = document.querySelector('#lb-wrap .lb-kind'); if (!kE) return r({ sl: sw.scrollLeft, kl: null, in: false }); const k = kE.getBoundingClientRect(), R = sw.getBoundingClientRect();
      r({ sl: sw.scrollLeft, kl: Math.round(k.left), in: k.left >= R.left - 1 && k.right <= R.right + 1 }); }, 120)); });
    await p7.evaluate(() => { setNoWrap(false); render(); });
    await p7.evaluate(() => { uiShell = false; applyShell(); render(); }); await p7.waitForTimeout(150);   /* 同「经典版」按钮 b-shell 的切换（不写本机键） */
    const x3 = await p7.evaluate(() => ({ shell: document.body.classList.contains('shell'), pos: getComputedStyle(document.getElementById('lb-wrap')).position }));
    await p7.evaluate(() => { uiShell = true; applyShell(); render(); });
    await p7.close();
    T(x1 && !x1.fix && Math.abs(x1.dl) <= 1 && Math.abs(x1.dr) <= 1 && !x1.cut && x2.sl > 500 && x2.in && !x3.shell && x3.pos === 'static',
      'L20b 示例谱（非固定版宽、左栏展开）从右栏调出：谱型条与可见纸面 #score 同宽同左缘（此前按 #paper 每边宽 15px）、谱名不被省略；不换行长带横滚 1500px 后谱名按钮仍在可视区；经典版外壳不吸顶（不被顶栏盖住）',
      J({ x1, x2, x3 }));
  } catch (e) { T(false, 'L20 执行异常', e.message.split('\n')[0]); }

  T(!errs.length, '无页面报错', errs.slice(0, 3).join(' | '));
  console.log('\n' + (pass === total ? '✅ PASS ' : '❌ ') + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
