/* 合稿外壳渲染（原型 proto.html 与注入实拍 inject.js 共用一份）。
   只产出 HTML 字符串，事件用 data-a="动作" 交给宿主分发；不写任何业务逻辑——落地时每个动作都委托现有按钮 / 函数（见 README「可行性映射」）。
   依赖：pqIcon/PQI（现有）+ PQF（合稿新增线性图标）· PQS1（SMuFL 记号，含三语境）· PQT（文字类记号）。 */
(function (G) {
  const FX = G.FX = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  FX.esc = esc;
  /* ── 图标 ── */
  const tier = px => px <= 16 ? [1.25, 1] : px <= 22 ? [1.5, 1] : px <= 34 ? [1.75, 1.25] : [2, 1.5];
  const ic = FX.ic = (k, size, cls) => {
    size = size || 16; const T = (G.PQF && G.PQF[k]) || (G.PQI && G.PQI[k]); if (!T) return '';
    const g = T[0], t = tier(size), s = g / size, r = n => Math.round(n * 100) / 100, m = r(t[0] * s), f = r(t[1] * s);
    return '<svg class="pqi' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 ' + g + ' ' + g + '" fill="none" stroke="currentColor" stroke-width="' + m + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + T[1].split('{M}').join(m).split('{F}').join(f) + '</svg>';
  };
  /* 记号字形：会写到谱面上的一律 Bravura（PQS1）或谱面同字体文字（PQT）；ctx＝jp/st/tab/bare */
  const sg = FX.sg = (key, ctx, size) => {
    size = size || 20;
    if (G.PQT && G.PQT[key]) return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 20 20" aria-hidden="true">' + G.PQT[key][1] + '</svg>';
    const S = G.PQS1 || {}; let k = key;
    if (ctx && S[key + '--' + ctx]) k = key + '--' + ctx; else if (ctx === 'st' && S[key]) k = key; else if (ctx && S[key + '--bare'] && ctx === 'bare') k = key + '--bare';
    const it = S[k] || S[key]; if (!it) return '';
    const B = size <= 16 ? 16 : 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + B + ' ' + B + '" fill="currentColor" aria-hidden="true">' + it[B === 16 ? 1 : 0] + '</svg>';
  };
  /* 简谱时值键：谱面同一套 --font-num 数字 + 减时线 / 增时线（不是五线谱音符字形） */
  FX.jpDur = d => {
    const W = d === 1 ? 34 : d === 2 ? 24 : 20, x0 = d <= 2 ? 6 : 10;
    const t = '<text x="' + x0 + '" y="13.6" font-size="12.5" text-anchor="middle" fill="currentColor" style="font-family:var(--font-num)">5</text>';
    const dash = n => { let h = ''; for (let i = 0; i < n; i++) h += '<rect x="' + (12.5 + i * 7.5) + '" y="8.9" width="5" height="1.3" fill="currentColor"/>'; return h; };
    const ul = n => { let h = ''; for (let i = 0; i < n; i++) h += '<rect x="5.8" y="' + (15.4 + i * 2.3) + '" width="8.4" height="1.2" fill="currentColor"/>'; return h; };
    return '<svg width="' + W + '" height="20" viewBox="0 0 ' + W + ' 20" aria-hidden="true">' + t + (d === 1 ? dash(3) : d === 2 ? dash(1) : d === 8 ? ul(1) : d === 16 ? ul(2) : '') + '</svg>';
  };
  FX.jpDot = () => '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><text x="8" y="13.6" font-size="12.5" text-anchor="middle" fill="currentColor" style="font-family:var(--font-num)">5</text><circle cx="14.2" cy="9.6" r="1.25" fill="currentColor"/></svg>';
  /* 谱号徽标：五线谱轨直接画 SMuFL 谱号（右手 / 左手一眼可分），简谱写「简」，六线 / 四线谱写「六 / 四」 */
  const CLEF = { staff: 'gClef', treble: 'gClef', bass: 'fClef', alto: 'cClef' };
  FX.badge = (nota, inst) => {
    if (nota === 'tab') return '<span class="badge" title="' + (inst === 'uku' ? '四线谱' : '六线谱') + '">' + (inst === 'uku' ? '四' : '六') + '</span>';
    if (nota === 'jp') return '<span class="badge" title="简谱">简</span>';
    const g = G.FX_CLEF && G.FX_CLEF[CLEF[nota] || 'gClef'];
    return '<span class="badge" title="' + ({ bass: '低音谱号', alto: '中音谱号' }[nota] || '高音谱号') + '">' + (g || '') + '</span>';
  };
  const BRACE = '<svg viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="' + (G.FX_BRACE || 'M7 0C3 6 6 30 4 50 6 70 3 94 7 100') + '"/></svg>';
  const BRACKET = '<i class="bt"><svg viewBox="0 0 8 6" aria-hidden="true"><path fill="currentColor" d="' + (G.FX_BRK_T || '') + '"/></svg></i><i class="bb"><svg viewBox="0 0 8 6" aria-hidden="true"><path fill="currentColor" d="' + (G.FX_BRK_B || '') + '"/></svg></i>';

  /* ── 记号表：名称（格内标签 ≤4 字）· 全名 · 字形 · 拼音首字母 · 快捷键 · 现有按钮（注入时转发） ── */
  const SG = FX.SIGNS = {
    'tie': ['连音线', '连音线', 'sg-tie', 'lyx', '~', ['b-tie', 'b-tie-t']],
    'tuplet3': ['3 连音', '3 连音', 'sg-tuplet3', 'sly', '', ['3']],
    'tupletN': ['N 连音', 'N 连音…', 'sg-tupletN', 'nly', '', ['']],
    'staccato': ['跳音', '跳音（断奏点）', 'sg-staccato', 'ty', '', ['b-art-stacc']],
    'staccatissimo': ['断音', '断音（楔形）', 'sg-staccatissimo', 'dy', '', ['b-art-stcc']],
    'tenuto': ['保持音', '保持音', 'sg-tenuto', 'bcy', '', ['b-art-ten']],
    'accent': ['重音', '重音', 'sg-accent', 'zy', '', ['b-art-acc']],
    'marcato': ['顿强', '顿强（强音）', 'sg-marcato', 'dq', '', ['b-art-marc']],
    'fermata': ['延长号', '延长号', 'sg-fermata', 'ych', '', ['b-ferm-v', 'b-ferm-t']],
    'breath': ['换气', '换气记号', 'sg-breath', 'hq', '', ['b-breath']],
    'tremolo': ['震音', '震音', 'sg-tremolo', 'zhy', '', ['b-trem']],
    'dyn-pp': ['很弱', '很弱 pp', 'dyn-pp', 'hr pp', '', ['dyn']], 'dyn-p': ['弱', '弱 p', 'dyn-p', 'r p', '', ['dyn']],
    'dyn-mp': ['中弱', '中弱 mp', 'dyn-mp', 'zr mp', '', ['dyn']], 'dyn-mf': ['中强', '中强 mf', 'dyn-mf', 'zq mf', '', ['dyn']],
    'dyn-f': ['强', '强 f', 'dyn-f', 'q f', '', ['dyn']], 'dyn-ff': ['很强', '很强 ff', 'dyn-ff', 'hq ff', '', ['dyn']],
    'dyn-sfz': ['突强', '突强 sfz', 'dyn-sfz', 'tq sfz', '', ['dyn']], 'dyn-fp': ['强后弱', '强后突弱 fp', 'dyn-fp', 'qhr fp', '', ['dyn']],
    'hair-cresc': ['渐强', '渐强（发夹线）', 'hair-cresc', 'jq', '', ['dyn']], 'hair-dim': ['渐弱', '渐弱（发夹线）', 'hair-dim', 'jr', '', ['dyn']],
    'tempo-mark': ['速度', '速度 ♩=', 'sg-dur-4', 'sd', '', ['dyn']], 'tempo-rit': ['渐慢', '渐慢 rit.', 'tempo-rit', 'jm rit', '', ['dyn']], 'tempo-accel': ['渐快', '渐快 accel.', 'tempo-accel', 'jk accel', '', ['dyn']],
    'grace-pre': ['前倚音', '前倚音', 'sg-grace-pre', 'qyy', '', ['grace', 'pre']], 'grace-post': ['后倚音', '后倚音', 'sg-grace-post', 'hyy', '', ['gracea', 'post']],
    'trill': ['颤音', '颤音 tr', 'sg-trill', 'cy tr', '', ['tr']], 'mordent-up': ['上波音', '上波音', 'sg-mordent-up', 'sby', '', ['up']],
    'mordent-down': ['下波音', '下波音', 'sg-mordent-down', 'xby', '', ['down']], 'turn': ['回音', '回音', 'sg-turn', 'hy', '', ['turn']],
    'gliss': ['滑音', '滑音 gliss.', 'sg-gliss', 'hy gliss', '', ['b-gliss']],
    'ped': ['踏板', '踏板 Ped.', 'sg-ped', 'tb ped', '', ['b-ped-on']], 'ped-up': ['踏板收', '踏板收 ✱', 'sg-ped-up', 'tbs', '', ['b-ped-off']],
    'fingering': ['指法', '指法 1–5', 'sg-fingering', 'zf', '', ['b-fing']], 'arp-up': ['上琶音', '上琶音', 'sg-arp-up', 'spy', '', ['b-arp']], 'arp-down': ['下琶音', '下琶音', 'sg-arp-down', 'xpy', '', ['b-arpd']],
    'ottava': ['八度线', '八度线 8va', 'sg-ottava', 'bdx 8va', '', ['b-ottava']], 'clef': ['谱号', '谱号切换', 'sg-clef', 'ph', '', ['b-clef']],
    'keysig': ['转调', '转调（调号）…', 'sg-keysig', 'zd', '', ['b-keyto']], 'meter': ['拍号', '本小节拍号…', 'sg-meter', 'ph2', '', ['b-meameter']],
    'rep-start': ['反复始', '反复开始 |:', 'sg-rep-start', 'ffks', '', ['b-rep-s']], 'rep-end': ['反复终', '反复结束 :|', 'sg-rep-end', 'ffjs', '', ['b-rep-e']],
    'volta1': ['一房', '第一房子 1.', 'sg-volta1', 'yf', '', ['b-volta1']], 'volta2': ['二房', '第二房子 2.', 'sg-volta2', 'ef', '', ['b-volta2']],
    'bar-double': ['段落线', '段落线（双细线）', 'sg-bar-double', 'dlx', '', ['b-secline']], 'bar-final': ['终止线', '终止线', 'sg-bar-final', 'zzx', '', ['b-finline']],
    'sim1': ['同前1', '同前 1 小节', 'sg-sim1', 'tq1', '', ['b-sim1']], 'sim2': ['同前2', '同前 2 小节', 'sg-sim2', 'tq2', '', ['b-sim2']],
    'rehearsal': ['段落标', '段落标记（排练号）…', 'sg-rehearsal', 'dlbj', '', ['b-mealabel']],
    'segno': ['记号', 'Segno 𝄋', 'sg-segno', 'segno jh', '', ['b-segno']], 'coda': ['尾声', 'Coda 𝄌', 'sg-coda', 'coda ws', '', ['b-coda']],
    'dc': ['从头', 'D.C. 从头反复', 'jump-dc', 'dc ct', '', ['b-dc']], 'ds': ['从记号', 'D.S. 从 𝄋 反复', 'jump-ds', 'ds cjh', '', ['b-ds']], 'fine': ['终止', 'Fine 终止', 'jump-fine', 'fine zz', '', ['b-fine2']],
    'strum-down': ['下扫', '下扫（谱面 ↑）', 'sg-strum-down', 'xs', '', ['b-strum-d']], 'strum-up': ['上扫', '上扫（谱面 ↓）', 'sg-strum-up', 'ss', '', ['b-strum-u']],
    'strum-mute': ['切音', '扫弦切音', 'sg-strum-mute', 'qy', '', ['b-smute']], 'pick-down': ['下拨', '下拨 ⊓', 'sg-pick-down', 'xb', '', ['d']], 'pick-up': ['上拨', '上拨 V', 'sg-pick-up', 'sb', '', ['u']],
    'slap': ['拍弦', '拍弦', 'sg-slap', 'px', '', ['b-slap']],
    'hammer': ['击弦', '击弦 h', 'sg-hammer', 'jx h', 'H', ['h']], 'pull': ['勾弦', '勾弦 p', 'sg-pull', 'gx p', 'P', ['p']], 'hammerpull': ['击勾弦', '击勾弦 h·p', 'sg-hammerpull', 'jgx', '', ['hp']],
    'slide': ['滑弦', '滑弦（品位）', 'sg-slide', 'hx', 'S', ['data-slidemenu']], 'bend': ['推弦', '推弦', 'sg-bend', 'tx', 'B', ['b']], 'release': ['回落', '推弦回落', 'sg-release', 'hl', '', ['bd']],
    'vibrato': ['揉弦', '揉弦', 'sg-vibrato', 'rx', '', ['v']], 'tap': ['点弦', '点弦 T', 'sg-tap', 'dx', '', ['tp']], 'harmonic': ['泛音', '泛音', 'sg-harmonic', 'fy', '', ['data-harmmenu']],
    'whammy': ['摇把', '摇把', 'sg-whammy', 'yb', '', ['data-barmenu']], 'dead-note': ['哑音', '哑音 ×（闷音标记）', 'sg-dead-note', 'yy x', 'x', ['b-mute', 'mute', 'eb-mute-n']],
    'palm-mute': ['闷音', '闷音 P.M.', 'tech-pm', 'my pm', '', ['pm']], 'let-ring': ['延音', '延音 let ring', 'sg-let-ring', 'yy lr', '', ['data-gtech=lr']],
    'perc': ['打板', '指弹打板', 'sg-perc', 'db', '', ['data-fingmenu']], 'finger-rh': ['右手指', '右手指法 p i m a', 'sg-finger-rh', 'yszf', '', ['rh']],
  };
  /* 分组：出版通行分类（谱号·调号·拍号单列；和音与整体移八度属输入/编辑动作，移到工具带「更多」；按当前轨记谱法隐藏不适用的组） */
  FX.groups = ctx => {
    const G2 = [];
    if (ctx === 'tab') {
      G2.push(['strum', '扫弦 · 拨弦', ['strum-down', 'strum-up', 'strum-mute', 'pick-down', 'pick-up', 'arp-up', 'arp-down', 'slap']]);
      G2.push(['gtech', '吉他技巧', ['hammer', 'pull', 'hammerpull', 'slide', 'bend', 'release', 'vibrato', 'tap', 'harmonic', 'whammy', 'dead-note', 'palm-mute', 'let-ring', 'perc', 'finger-rh']]);
      G2.push(['line', '连线 · 连音', ['tie', 'tuplet3', 'tupletN']]);
      G2.push(['art', '奏法', ['staccato', 'accent', 'fermata', 'tremolo']]);
      G2.push(['dyn', '力度', ['dyn-pp', 'dyn-p', 'dyn-mp', 'dyn-mf', 'dyn-f', 'dyn-ff', 'dyn-sfz', 'dyn-fp', 'hair-cresc', 'hair-dim'], 1]);
    } else {
      G2.push(['line', '连线 · 连音', ['tie', 'tuplet3', 'tupletN']]);
      G2.push(['art', '奏法', ['staccato', 'staccatissimo', 'tenuto', 'accent', 'marcato', 'fermata', 'breath', 'tremolo']]);
      G2.push(['dyn', '力度', ['dyn-pp', 'dyn-p', 'dyn-mp', 'dyn-mf', 'dyn-f', 'dyn-ff', 'dyn-sfz', 'dyn-fp', 'hair-cresc', 'hair-dim']]);
      G2.push(['orn', '装饰音', ['grace-pre', 'grace-post', 'trill', 'mordent-up', 'mordent-down', 'turn', 'gliss'], 1]);
      if (ctx === 'st') G2.push(['piano', '钢琴', ['ped', 'ped-up', 'fingering', 'arp-up', 'arp-down'], 1]);
      G2.push(['tempo', '速度 · 表情', ['tempo-mark', 'tempo-rit', 'tempo-accel'], 1]);
    }
    G2.push(['keys', ctx === 'st' ? '谱号 · 调号 · 拍号' : '调号 · 拍号', ctx === 'st' ? ['clef', 'keysig', 'meter', 'ottava'] : ['keysig', 'meter'], 1]);
    G2.push(['bar', '小节线 · 反复', ['rep-start', 'rep-end', 'volta1', 'volta2', 'bar-double', 'bar-final', 'sim1', 'sim2', 'rehearsal'], 1]);
    G2.push(['jump', '跳转', ['segno', 'coda', 'dc', 'ds', 'fine'], 1]);
    return G2;
  };
  FX.REC = { tab: ['strum-down', 'strum-up', 'hammer', 'pull', 'slide', 'dead-note'], jp: ['tie', 'fermata', 'accent', 'dyn-mf', 'hair-cresc', 'staccato'], st: ['tie', 'staccato', 'accent', 'dyn-mf', 'ped', 'fingering'] };
  FX.ctxOf = t => !t ? 'jp' : t.k === 'tab' ? 'tab' : (t.nota === 'jp' ? 'jp' : 'st');
  const NOTA_NAME = { jp: '简谱', staff: '高音谱', treble: '高音谱', bass: '低音谱', alto: '中音谱', tab: '六线谱' };
  FX.notaLabel = t => t.k === 'tab' ? (t.inst === 'uku' ? '四线谱' : '六线谱') + (t.jpRow ? ' + 简谱' : '') : (t.nota === 'jp' ? '简谱' + (t.dual ? ' + 五线' : '') : NOTA_NAME[t.nota] + (t.dual ? ' + 简谱' : ''));
  FX.notaShort = t => t.k === 'tab' ? (t.inst === 'uku' ? '四线' : '六线') + (t.jpRow ? '+简' : '') : (t.nota === 'jp' ? '简谱' + (t.dual ? '+五' : '') : NOTA_NAME[t.nota] + (t.dual ? '+简' : ''));
  const DEG_OF = { C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] };
  FX.letterKeys = key => { /* 五线谱音名键：按本调标简谱级数（1=F 时 C 标 5） */
    const L = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], tonic = (String(key || 'C').match(/[A-G]/) || ['C'])[0], ti = L.indexOf(tonic);
    return L.map((l, i) => [l, ((i - ti + 7) % 7) + 1]);
  };

  /* ── 行 1 ── */
  FX.r1 = (m, S, W) => {
    const tabs = m.docs.map((d, i) => '<div class="tab' + (d.on ? ' on' : '') + '" role="tab" aria-selected="' + !!d.on + '" tabindex="' + (d.on ? 0 : -1) + '" data-a="doc" data-i="' + i + '" data-title="' + esc(d.title) + '" title="' + esc(d.title) + ' · ' + esc(d.kind) + (d.saved ? ' · 已存入我的曲谱' : ' · 仅存本机，未存入我的曲谱') + '">'
      + (d.on ? '<span class="cnr"></span>' : '') + '<span class="ti">' + (d.ic || '') + '</span><span class="tt">' + esc(d.title) + '</span><span class="slot">' + (d.saved ? '' : '<span class="ring" aria-label="仅存本机"></span>') + '<button class="tx" data-a="close" data-i="' + i + '" aria-label="关闭《' + esc(d.title) + '》">' + ic('act-close', 12) + '</button></span></div>').join('');
    const sv = m.save || {};
    return '<header id="r1"><div class="brand" title="谱友圈 · 专业曲谱平台"><span class="mark"></span><span class="bn">谱友圈</span></div>'
      + '<button class="cb" data-a="menu" data-m="file" aria-haspopup="menu">文件<span class="chev">' + ic('act-chevron', 12) + '</span></button><span class="vsep"></span>'
      + '<div id="tabs" role="tablist" aria-label="窗口">' + tabs + '<button id="tab-ovf" data-a="menu" data-m="ovf" aria-haspopup="menu" title="全部窗口">' + ic('tab-windows', 16) + '<span class="n"></span>' + ic('act-chevron', 12) + '</button><button id="tab-add" data-a="new" title="新建曲谱（Alt+N）" aria-label="新建曲谱">' + ic('act-add', 16) + '</button></div>'
      + '<span class="vsep"></span>'
      + (sv.saved ? '<button class="save-st" data-a="menu" data-m="save" title="已存入我的曲谱，编辑实时同步">' + ic('ui-savecloud', 16) + '<span>已存入<span class="lng">我的曲谱</span> · ' + esc(sv.time || '') + '</span></button>'
        : '<button class="save-st" data-a="savemine" title="这份谱只在本机浏览器里；点一下存入「我的曲谱」"><span class="ring"></span><span>仅存本机<span class="lng"> · 存入我的曲谱</span></span></button>')
      + '<button class="pub" data-a="publish" title="发布到谱库：先自动存入我的曲谱，再提交审核（不离开编辑器）">' + ic('ui-publish', 16) + '发布</button>'
      + '<button class="cb" data-a="menu" data-m="acct" aria-haspopup="menu" aria-label="账号" style="padding:0 6px 0 4px"><span class="avatar">' + esc(m.user || '林') + '</span><span class="chev">' + ic('act-chevron', 12) + '</span></button></header>';
  };

  /* ── 行 2：模式切换在行首，后面是这一步的工具 ── */
  const MODES = [['write', '书写', 'mode-write'], ['engrave', '排版', 'mode-engrave'], ['play', '播放', 'mode-play'], ['output', '输出', 'mode-output']];
  FX.MODES = MODES;
  const TB = (h, tip, a, o) => '<button class="tb' + ((o && o.cls) ? ' ' + o.cls : '') + '" data-a="' + a + '"' + ((o && o.attr) || '') + ' title="' + esc(tip) + '"' + ((o && o.pri) ? ' data-pri="' + o.pri + '"' : '') + ((o && o.label) ? '' : ' aria-label="' + esc(tip.replace(/（.*$/, '')) + '"') + '>' + h + '</button>';
  const LB = (icon, txt, tip, a, o) => TB(icon + '<span>' + txt + '</span>', tip, a, Object.assign({ cls: 'lbl', label: 1 }, o || {}));
  const SEP = '<span class="tsep"></span>', CAP = t => '<span class="tcap">' + t + '</span>';
  FX.r2 = (m, S, W) => {
    const t = m.tracks.find(x => x.on) || m.tracks[0], ctx = FX.ctxOf(t);
    let h = '<div class="modes" role="tablist" aria-label="工作模式">' + MODES.map((x, i) => (i ? '<span class="mchev" aria-hidden="true"><svg width="6" height="10" viewBox="0 0 6 10"><path d="M1 1.5 4.5 5 1 8.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : '') + '<button role="tab" aria-selected="' + (S.mode === x[0]) + '" class="' + (S.mode === x[0] ? 'on' : '') + '" data-a="mode" data-v="' + x[0] + '" title="' + x[1] + (x[0] === 'write' ? '（Esc 回到这里）' : '') + '"><span class="mi">' + ic(x[2], 16) + '</span>' + x[1] + '</button>').join('') + '</div><button class="mdd" data-a="menu" data-m="modes" title="工作模式（窄屏收成下拉）">' + ic(MODES.find(x => x[0] === S.mode)[2], 16) + MODES.find(x => x[0] === S.mode)[1] + ic('act-chevron', 12) + '</button>' + SEP;
    if (S.mode === 'write') {
      if (m.step != null && !S.startHidden) {
        const st = ['写旋律', m.kindKey === 'guitar' ? '生成六线谱' : '配和弦与伴奏', m.kindKey === 'guitar' ? '调把位' : '选织体'];
        h += '<div class="start" title="新谱起步（Alt+B）：谱型条的三步搬到这里，谱纸上方不再占高度"><span class="sl">起步</span>' + st.map((s, i) => '<button class="st' + (i < m.step ? ' done' : i === m.step ? ' now' : '') + '" data-a="step" data-v="' + i + '" title="' + (i + 1) + ' · ' + s + '"><span class="n">' + (i < m.step ? '✓' : i + 1) + '</span><span class="t">' + s + '</span></button>').join('') + '<button class="sx" data-a="hidestart" aria-label="收起起步（Alt+B 再调出）" title="收起（Alt+B 再调出）">' + ic('act-close', 12) + '</button></div>' + SEP;
      }
      h += TB(ic('act-undo', 16), '撤销（Ctrl+Z）', 'undo') + SEP;
      h += LB(ic('ed-insert-after', 16), '后插', '后插音符（Insert）', 'ins');
      h += LB(ic('ed-insert-before', 16), '前插', '前插音符（Shift+Insert）', 'insb', { pri: 5 });
      h += LB(ctx === 'jp' ? '<span style="font:15px/1 var(--font-num);width:16px;text-align:center">0</span>' : sg('sg-rest', '', 16), '休止', '休止（0）', 'rest', { pri: ctx === 'jp' ? 7 : 4 });
      h += LB(ic('ed-delete', 16), '删除', '删除音符列（Delete）', 'del') + SEP;
      if (ctx === 'tab') { h += CAP('品位'); for (let n = 0; n <= 9; n++) h += TB(String(n), '品位 ' + n, 'fret', { cls: 'dig', attr: ' data-v="' + n + '"' }); h += LB('', '10–24 ▾', '高把位品位', 'menu', { cls: 'lbl noi', attr: ' data-m="frets"' }) + TB(sg('sg-dead-note', 'bare', 20), '哑音 ×（x）', 'sign', { attr: ' data-v="dead-note"' }); }
      else if (ctx === 'st') { h += CAP('音名'); FX.letterKeys(m.key).forEach(([l, d]) => h += TB(l + '<span class="deg">' + d + '</span>', l + '（本调简谱 ' + d + '）', 'pitch', { cls: 'dig let', attr: ' data-v="' + l + '"' })); }
      else { h += CAP('音高'); ['1', '2', '3', '4', '5', '6', '7', '0'].forEach(n => h += TB(n, '音级 ' + n, 'pitch', { cls: 'dig', attr: ' data-v="' + n + '"' })); }
      h += SEP;
      if (ctx !== 'tab') {
        h += TB(sg('sg-sharp', '', 20), '升号（#）', 'acc', { attr: ' data-v="s"' }) + TB(sg('sg-flat', '', 20), '降号（b）', 'acc', { attr: ' data-v="f"' }) + TB(sg('sg-natural', '', 20), '还原', 'acc', { attr: ' data-v="n"', pri: 3 });
        h += ctx === 'jp' ? TB(sg('sg-jp-dot-up', '', 20), '高音点（+）', 'oct', { attr: ' data-v="1"' }) + TB(sg('sg-jp-dot-down', '', 20), '低音点（−）', 'oct', { attr: ' data-v="-1"' })
          : TB(sg('sg-oct-up', '', 20), '高八度（+）：只改这一个音', 'oct', { attr: ' data-v="1"' }) + TB(sg('sg-oct-down', '', 20), '低八度（−）：只改这一个音', 'oct', { attr: ' data-v="-1"' });
        h += SEP;
      }
      h += CAP('时值');
      const durs = [[1, 'Q', '全音符'], [2, 'W', '二分音符'], [4, 'E', '四分音符'], [8, 'R', '八分音符'], [16, 'T', '十六分音符'], [32, 'Y', '三十二分音符']];
      durs.forEach(([d, k, n]) => { if (ctx === 'jp' && d === 32) return; h += TB(ctx === 'jp' ? FX.jpDur(d) : sg('sg-dur-' + d, '', 20), n + '（' + k + '）', 'dur', { cls: (m.dur === d ? 'on' : '') + (ctx === 'jp' ? ' jd' : ''), attr: ' data-v="' + d + '"', pri: d === 32 ? 2 : d === 1 ? 1 : 0 }); });
      h += TB(ctx === 'jp' ? FX.jpDot() : sg('sg-dot', '', 20), '附点（.）', 'dot', { cls: ctx === 'jp' ? 'jd' : '' }) + (ctx === 'jp' ? TB(sg('sg-jp-ext', '', 20), '增时线（D）', 'ext') : '') + SEP;
      h += TB(sg('sg-tie', ctx === 'st' ? 'st' : ctx, 20), '连音线（~）', 'sign', { attr: ' data-v="tie"' });
      h += TB(sg('sg-tuplet3', '', 20), '3 连音', 'sign', { attr: ' data-v="tuplet3"', pri: 6 });
      h += '<span class="r2more"></span>' + LB('', '更多 ▾', '拆分 · 合并 · 清单音 · 和音 · 移八度 · 节奏型库 · 不换行 · 键盘 / 指板', 'menu', { cls: 'lbl noi', attr: ' data-m="more"' });
    } else if (S.mode === 'engrave') {
      h += CAP('纸张') + '<span class="segc">' + ['A5', 'A4', 'A3'].map(x => '<button class="' + (x === 'A4' ? 'on' : '') + '" data-a="noop">' + x + '</button>').join('') + '</span>' + TB(ic('lay-size', 16), '方向：竖排 / 横排', 'noop') + SEP;
      h += CAP('疏密') + '<span class="segc">' + ['紧凑', '标准', '宽松'].map(x => '<button class="' + (x === '标准' ? 'on' : '') + '" data-a="noop">' + x + '</button>').join('') + '</span>' + SEP;
      h += CAP('内容大小') + TB(ic('act-zoom-out', 16), '内容缩小', 'noop') + '<span class="fld">100%</span>' + TB(ic('act-zoom-in', 16), '内容放大', 'noop') + SEP;
      h += LB(ic('lay-bars', 16), '每行 4 小节', '每行小节数（选中行生效）', 'noop') + SEP;
      h += LB(ic('lay-sysbreak', 16), '此处换行', '此处换行（measures[].brk）', 'noop') + LB(ic('lay-continuous', 16), '并入上一行', '并入上一行（measures[].pull）', 'noop') + LB(ic('lay-lock', 16), '锁定此行', '锁定此行（选区内 brk/pull 组合）', 'noop', { pri: 3 })
        + TB(ic('lay-pagebreak', 16), '此处换页（待拍板：需新增可选字段 measures[].pbrk）', 'noop', { attr: ' aria-disabled="true"', pri: 2 }) + SEP;
      h += LB(ic('lay-header', 16), '页头与页码…', '页头、页码、乐器名', 'noop', { pri: 4 });
    } else if (S.mode === 'play') {
      h += LB(ic('ui-play', 16), '播放', '播放 / 暂停（空格）', 'noop') + TB(ic('ui-tostart', 16), '回开头', 'noop') + LB(ic('play-loop', 16), '循环选区', '循环播放选中的小节', 'noop') + SEP;
      h += CAP('速度') + '<span class="fld">♩=' + esc(m.tempo) + '</span>' + LB(ic('play-speed', 16), '1×', '倍速 0.5× – 1.5×', 'noop') + SEP;
      h += LB(ic('ui-metronome', 16), '节拍器', '节拍器 / 预备拍', 'noop') + LB(ic('play-human', 16), '演奏感', '演奏感（力度与微小时值起伏）', 'noop') + SEP;
      h += LB(ic('ui-stand', 16), '谱架模式', '谱架：全屏翻页看谱', 'noop') + LB(ic('play-sound', 16), '音色库', '音色库', 'noop', { pri: 3 });
    } else if (S.mode === 'output') {
      h += CAP('打印存档') + LB(ic('ui-print', 16), '打印 / 存 PDF', '打印或存为 PDF（Ctrl+P）', 'noop') + LB(ic('out-parts', 16), '分谱…', '按演奏者出分谱：钢琴大谱表算 1 份、吉他轨连同简谱行与联排算 1 份', 'noop') + SEP;
      h += CAP('分享') + LB(ic('out-image', 16), '图片 PNG', '导出图片', 'noop') + LB(ic('out-card', 16), '分享卡', '生成网页分享卡', 'noop') + LB(ic('out-web', 16), '互动谱', '互动谱链接（可播放）', 'noop', { pri: 3 }) + SEP;
      h += CAP('专业格式') + LB(ic('out-xml', 16), 'MusicXML', '导出 MusicXML（Sibelius / MuseScore / Dorico 可读）', 'noop') + LB(ic('src-midi', 16), 'MIDI', '导出 MIDI', 'noop') + LB(ic('ui-download', 16), '曲谱文件', '存为 .mtab.json（Ctrl+S）', 'noop', { pri: 3 });
    }
    h += '<span class="grow"></span>';
    if (t) h += '<span class="scope" data-pri="9" title="当前作用对象：音符、记号与时值都写到这条轨">' + (t.ic14 || '') + '<span class="sn">作用于 ' + esc(t.name) + ' · ' + esc(FX.notaShort(t)) + '</span></span>';
    h += '<button class="cmdb" data-a="cmd" title="搜功能、记号、设置（Ctrl+/，支持拼音首字母：ych＝延长号；也能搜旧名「预设」「打印…」）">' + ic('ui-search', 16) + '<span class="kbd">Ctrl /</span></button>';
    return '<div id="r2">' + h + '</div>';
  };

  /* ── 左栏 ── */
  FX.left = (m, S, H) => {
    if (S.mode === 'engrave' || S.mode === 'output') return FX.leftPages(m, S, H);
    if (S.mode === 'play') return FX.leftMixer(m, S, H);
    const t = m.tracks.find(x => x.on) || m.tracks[0], ctx = FX.ctxOf(t);
    let list = '';
    const row = x => {
      const sum = FX.notaShort(x);
      let h = '<div class="tr' + (x.on ? ' on' : '') + (x.mute ? ' muted' : '') + '" role="treeitem" aria-selected="' + !!x.on + '" aria-expanded="' + !!x.on + '" tabindex="' + (x.on ? 0 : -1) + '" data-a="trk" data-k="' + x.k + '" data-i="' + x.i + '" title="' + esc(x.name) + ' · ' + esc(FX.notaLabel(x)) + '">'
        + '<span class="tic">' + (x.ic || '') + FX.badge(x.k === 'tab' ? 'tab' : x.nota, x.inst) + '</span><span class="tn">' + esc(x.name) + '</span><span class="sum">' + esc(sum) + '</span>'
        + '<span class="acts' + (x.mute || x.solo ? ' eng' : '') + '"><button class="ib' + (x.mute ? ' mon' : '') + '" data-a="mute" data-k="' + x.k + '" data-i="' + x.i + '" aria-pressed="' + !!x.mute + '" title="静音（播放时不发声）">' + ic('trk-mute', 16) + '</button><button class="ib' + (x.solo ? ' son' : '') + '" data-a="solo" data-k="' + x.k + '" data-i="' + x.i + '" aria-pressed="' + !!x.solo + '" title="独奏（Alt+点静音也可）">' + ic('trk-solo', 16) + '</button><button class="ib" data-a="menu" data-m="tmore" data-k="' + x.k + '" data-i="' + x.i + '" title="本轨更多：改名、乐器与音色、谱号 / 变调夹、导入 MIDI、锁定、上移下移、删除" aria-label="本轨更多">' + ic('ui-more', 16) + '</button></span></div>';
      if (x.on) {
        if (x.k === 'tab') {
          h += '<div class="sub" title="六线谱是这条吉他轨本身，固定显示"><span class="si">' + ic(x.inst === 'uku' ? 'nota-tab4' : 'nota-tab6', 16) + '</span><span class="sl">' + (x.inst === 'uku' ? '四线谱' : '六线谱') + ' <span class="q">· 本轨</span></span><span class="fixed">固定</span></div>';
          h += '<div class="sub' + (x.jpRow ? '' : ' off') + '"><span class="si">' + ic('nota-jianpu', 16) + '</span><span class="sl">简谱行 <span class="q">· 仅本轨</span></span><button class="eye" data-a="tabjp" data-i="' + x.i + '" aria-pressed="' + !!x.jpRow + '" title="在这条吉他轨上方联排一行简谱（每条轨各自开关）">' + ic(x.jpRow ? 'trk-eye' : 'trk-eye-off', 16) + '</button></div>';
        } else {
          const st = x.nota !== 'jp', jpOn = !st || x.dual;
          h += '<div class="sub' + (jpOn ? '' : ' off') + '"><span class="si">' + ic('nota-jianpu', 16) + '</span><span class="sl" data-a="notaonly" data-v="jp" data-i="' + x.i + '" title="点名字：只显示简谱">简谱</span><button class="eye" data-a="nota" data-v="jp" data-i="' + x.i + '" aria-pressed="' + jpOn + '" title="简谱层：与五线谱可同时打开＝对照（至少保留一种）">' + ic(jpOn ? 'trk-eye' : 'trk-eye-off', 16) + '</button></div>';
          h += '<div class="sub' + (st || x.dual ? '' : ' off') + '"><span class="si">' + ic('nota-staff', 16) + '</span><span class="sl" data-a="notaonly" data-v="st" data-i="' + x.i + '" title="点名字：只显示五线谱">五线谱' + (st || x.dual ? ' <button class="clefdd" data-a="menu" data-m="clef" data-i="' + x.i + '" title="谱号">' + ({ bass: '低音谱号', alto: '中音谱号' }[x.nota] || '高音谱号') + ic('act-chevron', 12) + '</button>' : '') + '</span><button class="eye" data-a="nota" data-v="st" data-i="' + x.i + '" aria-pressed="' + (st || x.dual) + '" title="五线谱层：两层都亮＝五线 + 简谱对照（voxDual）">' + ic(st || x.dual ? 'trk-eye' : 'trk-eye-off', 16) + '</button></div>';
          if (x.lyrics) { let v = ''; for (let n = 1; n <= x.lyrics; n++) v += '<button class="vchip' + (n === (m.verse || 1) ? ' on' : '') + '" data-a="verse" data-v="' + n + '" title="第 ' + n + ' 段歌词（Enter 逐字填词）">' + n + '</button>'; h += '<div class="sub"><span class="si">' + ic('nota-lyrics', 16) + '</span><span class="sl" style="display:flex;gap:4px;align-items:center">歌词 ' + v + '<button class="vchip" data-a="verseadd" title="加一段歌词" aria-label="加一段歌词">＋</button></span></div>'; }
          if (m.canGenTab) h += '<div class="sub act" data-a="gentab" role="button" tabindex="0" title="把这条旋律按所选把位生成一条吉他轨（原旋律轨不动，可一步撤销）——这是新建一条轨的动作，不是显示开关"><span class="si">' + ic('ai-gentab', 16) + '</span><span class="sl">由此生成' + (m.inst === 'uku' ? '四' : '六') + '线谱轨…</span></div>';
        }
      }
      return h;
    };
    let j = 0;
    while (j < m.tracks.length) {
      const g = (m.groups || []).find(g => j === g.from);
      if (g) {
        const n = g.to - g.from + 1;
        list += '<div class="grp" role="group"><div class="gh"><span class="gg">' + (g.type === 'brace' ? '<span class="gmini">' + BRACE + '</span>' : g.type === 'bracket' ? '<span class="gmini brk">' + BRACKET + '</span>' : ic('inst-guitar', 14)) + '</span>' + esc(g.name) + '<span class="c">' + n + '</span></div>'
          + '<div class="gb">' + (g.type !== 'gtr' ? '<span class="gline' + (g.type === 'bracket' ? ' brk' : '') + '">' + (g.type === 'brace' ? BRACE : BRACKET) + '</span>' : '');
        for (let k = g.from; k <= g.to; k++) list += row(m.tracks[k]);
        if (g.type === 'gtr') list += '<div class="sub gsub' + (m.tabStaff ? '' : ' off') + '"><span class="si">' + ic('nota-staff', 16) + '</span><span class="sl">五线谱联排 <span class="q">· 全部吉他轨</span></span><button class="eye" data-a="tabstaff" aria-pressed="' + !!m.tabStaff + '" title="整曲开关：全部吉他轨上方联排标准五线谱（品位按调号自动拼写）">' + ic(m.tabStaff ? 'trk-eye' : 'trk-eye-off', 16) + '</button></div>';
        list += '</div></div>'; j = g.to + 1;
      } else { list += row(m.tracks[j]); j++; }
    }
    const kindChip = '<button class="kchip" data-a="menu" data-m="kind" title="谱类：' + esc(m.kind) + '（点开换谱类；谱行由谱类决定）">' + (m.kindIc || '') + '<span class="kn">' + esc(m.kind) + '</span>' + ic('act-chevron', 12) + '</button>';
    const trkSec = '<section id="trk" aria-label="音轨"><div class="sh"><span class="t">音轨</span><span class="c">' + m.tracks.length + '</span>' + kindChip + '<span class="grow"></span><button class="ib" data-a="menu" data-m="add" title="加音轨" aria-label="加音轨">' + ic('act-add', 16) + '</button><button class="ib" data-a="menu" data-m="thdr" title="全部轨改为简谱 / 五线谱 · 展开 / 收起全部 · 曲谱信息" aria-label="音轨区更多">' + ic('ui-more', 16) + '</button></div>'
      + '<div id="trk-list" role="tree" aria-label="音轨与记谱法">' + list + '</div></section>';
    /* 记号面板 */
    const dense = S.dens === 'glyph';
    const cell = (id, rec) => { const s = SG[id]; if (!s) return ''; const c = dense || rec ? (ctx === 'st' ? 'st' : ctx) : (ctx === 'st' ? 'st' : ctx);
      const glyphCtx = (dense || rec) && /^(staccato|tenuto|staccatissimo)$/.test(id) ? 'bare' : c;
      return '<button class="gt' + (S.hover === id ? ' on' : '') + '" data-a="sign" data-v="' + id + '" title="' + esc(s[1]) + (s[4] ? '（' + s[4] + '）' : '') + ' · 作用于 ' + esc(t.name) + '">' + sg(s[2], glyphCtx, 20) + '<span class="gl">' + esc(s[0]) + '</span></button>'; };
    const q = (S.q || '').trim().toLowerCase();
    let pal = '';
    if (q) {
      const hits = Object.keys(SG).filter(id => { const s = SG[id]; return s[1].toLowerCase().includes(q) || s[0].includes(q) || s[3].split(' ').some(p => p.startsWith(q)); });
      pal += '<div class="pgh" style="cursor:default">搜索「' + esc(S.q) + '」<span class="c">' + hits.length + ' 个</span></div><div class="pgb">' + hits.map(id => cell(id)).join('') + '</div>';
    } else {
      pal += '<div class="pgh" style="cursor:default"><span class="pch">' + ic('ui-recent', 12) + '</span>最近使用<span class="c">本机习惯</span></div><div class="pgb rec">' + (m.recent || FX.REC[ctx]).map(id => cell(id, 1)).join('') + '</div>';
      FX.groups(ctx).forEach(g => { const open = S.fold && g[0] in S.fold ? !S.fold[g[0]] : !g[3];
        pal += '<button class="pgh" data-a="fold" data-v="' + g[0] + '" aria-expanded="' + open + '"><span class="pch">' + ic('act-chevron', 12) + '</span>' + g[1] + '<span class="c">' + g[2].length + '</span></button><div class="pgb' + (open ? '' : ' hide') + '">' + g[2].map(id => cell(id)).join('') + '</div>'; });
    }
    const hv = S.hover && SG[S.hover];
    const palSec = '<section id="pal" class="' + (dense ? 'dense' : '') + '" aria-label="记号"><div class="sh"><span class="t">记号</span><span class="scope2" title="点记号＝加到这条轨的当前音 / 选区">' + (t.ic14 || '') + '<span class="sn">' + esc(t.name) + ' · ' + esc(FX.notaShort(t)) + '</span></span><span class="grow"></span><button class="ib" data-a="dens" title="' + (dense ? '切到「字形 + 文字」（默认）' : '切到「只看字形」（熟手）') + '" aria-label="记号格密度">' + ic(dense ? 'ui-density-label' : 'ui-density-glyph', 16) + '</button></div>'
      + '<label class="psearch">' + ic('ui-search', 14) + '<input data-a="q" value="' + esc(S.q || '') + '" placeholder="搜记号：名称或拼音首字母" aria-label="搜记号"><span class="kbd">/</span></label><div class="pscroll">' + pal + '</div>'
      + '<div class="pinfo"><span class="pn">' + (hv ? '<b>' + esc(hv[1]) + '</b> · 加到「' + esc(t.name) + '」当前音' + (hv[4] ? ' · ' + esc(hv[4]) : '') : '点一下：加到「' + esc(t.name) + '」当前音；再点取消') + '</span><button class="tbtn" data-a="clearmarks" title="清除当前音 / 选区的全部记号">' + ic('ed-clear-marks', 14) + '清除</button></div></section>';
    return '<aside id="left">' + trkSec + palSec + '</aside>';
  };
  FX.leftPages = (m, S) => {
    const pages = m.pages || 2, out = S.mode === 'output';
    let h = '';
    if (out) {
      h += '<div class="sh"><span class="t">输出内容</span></div><div class="lsec">'
        + '<div class="chk on"><span class="bx">' + ic('act-check', 12) + '</span><span>总谱<span class="d"> · 全部 ' + m.tracks.length + ' 轨</span></span></div>'
        + '<div class="mh" style="font-size:11px;color:var(--faint);padding:8px 6px 4px;font-weight:600">分谱（按演奏者，不按谱行）</div>'
        + (m.players || []).map(p => '<div class="chk"><span class="bx"></span><span>' + esc(p[0]) + '<span class="d"> · ' + esc(p[1]) + '</span></span></div>').join('') + '</div>';
    } else {
      h += '<div class="sh"><span class="t">版面检查</span><span class="c">引擎实算</span></div><div class="lsec">'
        + (m.layoutIssues || []).map(x => '<button class="issue' + (x[2] ? ' w' : '') + '" data-a="noop" title="点一下跳到对应的行或小节"><span class="dot"></span><span>' + esc(x[0]) + '</span><span class="go">' + esc(x[1]) + '</span></button>').join('') + '</div>';
    }
    h += '<div class="sh"><span class="t">页面</span><span class="c">' + pages + ' 页 · A4</span></div><div class="thumbs">';
    for (let i = 0; i < pages; i++) h += '<div class="thumb' + (i === 0 ? ' on' : '') + '">' + (m.pageThumbs && m.pageThumbs[i] ? '<img alt="" src="' + m.pageThumbs[i] + '">' : '') + '<span class="pg">' + (i + 1) + '</span></div>';
    return '<aside id="left">' + h + '</div></aside>';
  };
  FX.leftMixer = (m, S) => {
    let h = '<div class="sh"><span class="t">混音</span><span class="c">' + m.tracks.length + ' 轨</span></div><div style="padding:0 6px">';
    m.tracks.forEach((x, i) => { const v = [78, 64, 52, 60, 70, 58][i % 6];
      h += '<div class="mx"><span class="tic" style="width:24px;height:24px;position:relative;display:flex;align-items:center;justify-content:center;color:var(--muted)">' + (x.ic || '') + '</span><span class="tn">' + esc(x.name) + '</span><span class="fader"><i style="width:' + v + '%"></i><b style="left:calc(' + v + '% - 7px)"></b></span><button class="ib' + (x.mute ? ' warn' : '') + '" title="静音">' + ic('trk-mute', 16) + '</button><button class="ib" title="独奏">' + ic('trk-solo', 16) + '</button></div>'; });
    return '<aside id="left">' + h + '</div><div class="note" style="padding:10px 14px">混音取代原底栏展开后高 173px、压住谱面的混音台；音色在音轨 ⋯「乐器与音色」。</div></aside>';
  };

  /* ── 右栏：≥ 让位阈值停靠 264，否则 40 竖条（点开 288 浮出，可钉住） ── */
  FX.rightDock = W => W - 248 - 264 - 16 >= 912;   /* 谱纸 870 需要 #score-wrap 内容宽 ≥912（#paper 自带边距，实测）；左右各留 8 → 1440 起停靠 */
  FX.right = (m, S, W) => {
    const dock = FX.rightDock(W), open = dock || S.rightOpen;
    const tabs = S.mode === 'write' ? [['prop', '属性', 'act-info'], ['text', '文字', 'tx-anno'], ['smart', '智能', 'nota-texture']] : S.mode === 'engrave' ? [['lay', '版式', 'mode-engrave']] : S.mode === 'play' ? [['prac', '练习', 'play-loop']] : [['pub', '发布与导出', 'ui-publish']];
    const cur = tabs.find(x => x[0] === S.rightTab) ? S.rightTab : tabs[0][0];
    const strip = dock ? '' : '<div class="strip-b">' + tabs.map(x => '<button class="' + (open && cur === x[0] ? 'on' : '') + '" data-a="rtab" data-v="' + x[0] + '" title="' + x[1] + '">' + ic(x[2], 18) + '<span class="v">' + x[1].split('').join('<br>') + '</span></button>').join('') + '</div>';
    let body = '';
    const t = m.tracks.find(x => x.on) || m.tracks[0];
    if (cur === 'prop') {
      const n = m.selNote || {};
      body += '<div class="rsec"><h4>当前音符</h4><div class="kv"><span class="k">位置</span><span>' + esc(n.pos || '') + '</span><span class="k">音轨</span><span>' + esc(t.name) + ' · ' + esc(FX.notaLabel(t)) + '</span><span class="k">音高</span><span>' + esc(n.pitch || '') + '</span><span class="k">时值</span><span>' + esc(n.dur || '') + '</span></div></div>';
      body += '<div class="rsec"><h4>已加记号</h4>' + ((n.marks || []).map(x => '<span class="mchip">' + sg(SG[x] ? SG[x][2] : x, 'bare', 16) + esc(SG[x] ? SG[x][0] : x) + '<button class="ib" style="width:22px;height:22px" aria-label="删除这个记号">' + ic('act-close', 12) + '</button></span>').join('') || '<span style="font-size:12px;color:var(--faint)">无 · 在左栏点记号即可添加</span>') + '</div>';
      body += '<div class="rsec"><h4>小节 ' + ((m.mi || 0) + 1) + '</h4><div class="kv"><span class="k">拍号</span><span>' + esc(m.meter) + '</span><span class="k">反复</span><span>无</span><span class="k">段落标记</span><span><button class="tbtn" style="padding:0 6px;margin-left:-6px">添加…</button></span></div></div>';
      body += '<div class="rsec"><h4>整谱</h4><div class="kv"><span class="k">谱类</span><span>' + esc(m.kind) + '</span><span class="k">调 · 拍</span><span>' + esc(m.key) + ' · ' + esc(m.meter) + ' · ♩=' + esc(m.tempo) + '</span></div></div>';
    } else if (cur === 'text') {
      let v = ''; for (let i = 1; i <= Math.max(1, m.verses || 1); i++) v += '<button class="vchip' + (i === (m.verse || 1) ? ' on' : '') + '">' + i + '</button> ';
      body += '<div class="rsec"><h4>歌词 · ' + esc(t.name) + '</h4><div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">' + v + '<button class="vchip">＋</button></div>'
        + '<button class="rbtn"><span class="ri">' + ic('tx-lyricfill', 16) + '</span><span>逐字填词<span class="rd">Enter 进入，空格跳下一个音</span></span></button><button class="rbtn"><span class="ri">' + ic('nota-texture', 16) + '</span><span>智能填词…<span class="rd">整段歌词自动对位</span></span></button></div>';
      body += '<div class="rsec"><h4>和弦</h4><button class="rbtn"><span class="ri">' + ic('nota-chord', 16) + '</span><span>输入和弦<span class="rd">Ctrl+K · 写在当前音上方</span></span></button><div class="kv" style="margin-top:6px"><span class="k">写法</span><span class="segc"><button class="on">音名</button><button>级数</button></span><span class="k">和弦图</span><span class="segc"><button class="on">随行</button><button>曲首</button><button>不显示</button></span></div></div>';
      body += '<div class="rsec"><h4>段落与标注</h4><button class="rbtn"><span class="ri">' + sg('sg-rehearsal', '', 16) + '</span><span>段落标记…<span class="rd">A · B · 前奏 · 间奏 · 副歌</span></span></button><button class="rbtn"><span class="ri">' + ic('tx-anno', 16) + '</span><span>标注文字…</span></button><button class="rbtn"><span class="ri">' + ic('act-info', 16) + '</span><span>曲谱信息…<span class="rd">标题、词曲作者、制谱</span></span></button></div>';
    } else if (cur === 'smart') {
      if (m.step != null) body += '<div class="next"><div class="nt">下一步</div>' + ['写旋律', '配和弦与伴奏', '选织体'].map((s, i) => '<div class="ns' + (i < m.step ? ' done' : i === m.step ? ' now' : '') + '"><span class="n">' + (i < m.step ? '✓' : i + 1) + '</span>' + s + (i === m.step ? '<button class="go">' + (i === 1 ? '一键配伴奏' : '去做') + '</button>' : '') + '</div>').join('') + '</div>';
      [['nota-texture', '一键配伴奏…', '旋律 → 和弦 → 双手织体，可填进当前谱'], ['ai-workbench', '配和弦工作台', '逐小节推荐、候选进行、套路可见'], ['nota-grand', '伴奏织体', '22 种织体，按拍号筛'], ['tx-lyricfill', '智能填词…', '整段歌词自动对位'], ['act-step', '节奏型库', '扫弦 / 分解节奏'], ['ai-gentab', '由旋律生成六线谱轨…', '低把位 / 中把位 / 跟随和弦图'], ['ai-check', '时值检查', '每小节拍数是否填满']].forEach(x => body += '<button class="rbtn"><span class="ri">' + ic(x[0], 16) + '</span><span>' + x[1] + '<span class="rd">' + x[2] + '</span></span></button>');
    } else if (cur === 'lay') {
      body += '<div class="rsec"><h4>纸张</h4><div class="kv"><span class="k">尺寸</span><span class="segc"><button>A5</button><button class="on">A4</button><button>A3</button></span><span class="k">方向</span><span class="segc"><button class="on">竖排</button><button>横排</button></span></div></div>';
      body += '<div class="rsec"><h4>间距</h4><div class="kv"><span class="k">疏密</span><span class="segc"><button>紧凑</button><button class="on">标准</button><button>宽松</button></span><span class="k">内容大小</span><span class="fld">100%</span><span class="k">谱行间距</span><span class="fld">标准</span></div></div>';
      body += '<div class="rsec"><h4>本行（第 1 行）</h4><div class="kv"><span class="k">小节数</span><span class="fld">4</span><span class="k">锁定</span><span class="segc"><button class="on">自动</button><button>锁定</button></span></div></div>';
      body += '<div class="rsec"><h4>页头 · 页码</h4><div class="kv"><span class="k">页码</span><span>第 n / N 页 · 居中</span><span class="k">乐器名</span><span style="color:var(--faint)">首行全称 / 之后简称（后续）</span></div></div>';
    } else if (cur === 'prac') {
      body += '<div class="rsec"><h4>循环练习</h4><div class="kv"><span class="k">范围</span><span>第 1 – 4 小节</span><span class="k">次数</span><span class="fld">不限</span></div></div><div class="rsec"><h4>只听某一声部</h4>' + m.tracks.map(x => '<div class="chk' + (x.on ? ' on' : '') + '"><span class="bx">' + (x.on ? ic('act-check', 12) : '') + '</span>' + esc(x.name) + '</div>').join('') + '</div><div class="rsec"><h4>速度阶梯</h4><div class="kv"><span class="k">起始</span><span>60%</span><span class="k">每遍 +</span><span>5%</span></div></div>';
    } else if (cur === 'pub') {
      body += '<div class="pubcard"><div style="font-weight:600">发布到谱库</div><div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5">先自动存入「我的曲谱」，再提交审核；通过后出现在谱库，可设免费或付费。</div><div class="kv" style="margin-top:8px"><span class="k">谱类</span><span>' + esc(m.kind) + '</span><span class="k">可见</span><span class="segc"><button class="on">公开</button><button>仅链接</button></span></div><button class="pbtn">存入并提交发布</button></div>';
      body += '<div class="rsec"><h4>打印与导出</h4><div class="kv"><span class="k">纸张</span><span>A4 竖排 · 共 ' + (m.pages || 2) + ' 页</span><span class="k">PDF</span><span>矢量，谱面同字形</span><span class="k">PNG</span><span>2× · 透明底可选</span></div></div>';
    }
    const head = '<div class="rph">' + tabs.map(x => '<button class="rtab' + (cur === x[0] ? ' on' : '') + '" data-a="rtab" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '<span class="grow"></span>' + (dock ? '' : '<button class="ib" data-a="rpin" title="钉住（≥1600 宽可常驻）" aria-label="钉住">' + ic('ui-pin', 16) + '</button><button class="ib" data-a="rclose" title="收起（Esc）" aria-label="收起">' + ic('act-close', 14) + '</button>') + '</div>';
    return '<aside id="right" class="' + (dock ? 'dock' : 'strip') + '">' + strip + (open ? '<div class="rp">' + head + '<div class="rpb">' + body + '</div></div>' : '') + '</aside>';
  };

  /* ── 状态栏 ── */
  FX.status = (m, S, W) => {
    const t = m.tracks.find(x => x.on) || m.tracks[0];
    let bars = ''; for (let i = 1; i <= m.bars; i++) bars += '<span class="bar' + (i === (m.mi || 0) + 1 ? ' cur' : '') + '">' + i + '</span>';
    return '<footer id="status"><button class="playb" data-a="noop" title="播放 / 暂停（空格）">' + ic('ui-play', 14) + '播放</button><button class="sb" title="回开头" aria-label="回开头">' + ic('ui-tostart', 16) + '</button><div class="bars">' + bars + '</div><span class="dsep"></span>'
      + '<span class="st"><b>' + esc(t.name) + '</b> · ' + esc(FX.notaLabel(t)) + '</span><span class="dsep"></span><span class="st">第 <b>' + ((m.mi || 0) + 1) + '</b>/' + m.bars + ' 小节 · 第 ' + ((m.ci || 0) + 1) + ' 拍</span><span class="dsep"></span>'
      + (m.errors ? '<button class="okc w sb" title="点开查看并修复">' + ic('ai-check', 14) + '时值不符 ' + m.errors + ' 处</button>' : '<span class="okc">' + ic('act-check', 14) + '时值正确</span>')
      + '<span class="grow"></span><span class="st">♩=' + esc(m.tempo) + '</span><span class="dsep"></span><button class="sb" aria-label="缩小">' + ic('act-zoom-out', 16) + '</button><span class="st" style="min-width:34px;text-align:center">100%</span><button class="sb" aria-label="放大">' + ic('act-zoom-in', 16) + '</button><button class="sb" data-a="menu" data-m="help" title="快捷键（?）" aria-label="快捷键">' + ic('ui-help', 16) + '</button></footer>';
  };

  /* ── 菜单 ── */
  const MI = (icon, label, sc, o) => '<button class="mi2' + ((o && o.cls) ? ' ' + o.cls : '') + '" role="menuitem" data-a="' + ((o && o.a) || 'noop') + '"' + ((o && o.attr) || '') + '><span class="mic">' + (icon || '') + '</span><span class="ml">' + label + ((o && o.d) ? '<span class="md">' + o.d + '</span>' : '') + '</span>' + (sc ? '<span class="ms">' + sc + '</span>' : '') + '</button>';
  const HR = '<hr>', MH = t => '<div class="mh">' + t + '</div>';
  FX.menu = (name, m, S, data) => {
    let h = '';
    const t = m.tracks.find(x => x.on) || m.tracks[0];
    if (name === 'file') {
      h = MI(ic('act-new', 16), '新建…', 'Alt+N', { d: '按用途选，回车就建；新窗口打开，当前谱保留' }) + MI(ic('tpl-last', 16), '按上次设置新建', 'Alt+Shift+N') + MI(ic('act-import', 16), '从已有音乐…', '', { d: 'MusicXML · Guitar Pro · MIDI · AI 转谱结果' }) + MI(ic('act-open', 16), '打开文件…', 'Ctrl+O') + HR
        + MI(ic('src-mine', 16), '我的曲谱') + MI(ic('src-example', 16), '示例曲谱', '', { d: '原「预设」' }) + MI(ic('ui-library', 16), '谱库 · 发现好谱') + HR
        + MI(ic('ui-save', 16), '保存到我的曲谱', '', { a: 'savemine' }) + MI(ic('ui-download', 16), '存为文件 .mtab.json', 'Ctrl+S') + MI(ic('act-swap', 16), '复制为新窗口') + HR
        + MI(ic('act-info', 16), '曲谱信息…', '', { d: '标题、调、拍号、速度、词曲作者' }) + MI(ic('type16-' + (m.kindKey || 'pianoacc'), 16) || ic('act-swap', 16), '换谱类…', '', { d: '空谱任意换；有内容时只给不动音符的换法或「另建一份」' }) + HR
        + MI(ic('act-close', 16), '关闭窗口') + MI('', '关闭其他窗口') + MI('', '关闭已存入的窗口');
    } else if (name === 'acct') {
      h = '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px 10px"><span class="avatar" style="background:var(--accent-soft);color:var(--accent-ink);width:34px;height:34px;font-size:14px">' + esc(m.user || '林') + '</span><span><b style="font-size:13px">林老师</b><span style="display:block;font-size:11px;color:var(--faint)">创作者 · 专业版</span></span></div>' + HR
        + MI(ic('ui-account', 16), '个人中心') + MI(ic('ui-publish', 16), '创作者中心', '', { d: '我的发布、收益、审核进度' }) + MI(ic('ui-library', 16), '谱库') + HR
        + MI(ic('ui-theme', 16), '外观', '', { d: '浅色 / 深色 / 跟随系统' , a: 'theme' }) + MI(ic('ui-invert', 16), '谱面反色', '', { d: '深色纸张 + 浅色音符（夜间 / 投影）' }) + MI(ic('act-settings', 16), '偏好设置…', '', { d: '键位档 · 落音自动前进 · 演奏感 · 触屏浮条 · 记号格密度' }) + HR
        + MI(ic('ui-help', 16), '快捷键', '?') + MI('', '帮助与教程') + MI('', '更新日志');
    } else if (name === 'add') {
      const lock = m.lockAdd;
      if (lock) h = MH('加音轨') + '<div class="why">' + esc(lock) + '</div>' + MI(ic('act-swap', 16), '换谱类…', '', { cls: 'pri', d: '换成可以加轨的谱类（不动音符的换法，或另建一份）' });
      else {
        h = MH('加音轨') + MI(ic('inst-voice', 16), '旋律轨', '', { d: '简谱或五线谱的一条旋律 / 声部' }) + MI(ic(m.inst === 'uku' ? 'inst-ukulele' : 'inst-guitar', 16), (m.inst === 'uku' ? '尤克里里' : '吉他') + '轨', '', { d: '六线谱（四线谱）一条，空白' });
        if (m.inst === 'guitar') h += MI(ic('inst-ukulele', 16), '尤克里里轨', '', { cls: 'dis', d: '本谱乐器为吉他（6 线），同一份谱里暂不能混 4 线 —— 可以：' }) + MI(ic('act-new', 16), '以本谱旋律另建尤克里里弹唱谱', '', { cls: 'pri', d: '新窗口打开，原谱保留（复用新建面板）' });
        h += HR + MI(ic('ai-gentab', 16), '由旋律生成' + (m.inst === 'uku' ? '四' : '六') + '线谱轨…', '', { d: '低把位 / 中把位 / 跟随和弦图' }) + MI(ic('src-midi', 16), '导入 MIDI 为新轨…');
      }
    } else if (name === 'tmore') {
      const x = m.tracks.find(y => y.k === data.k && String(y.i) === String(data.i)) || t;
      h = MH(esc(x.name)) + MI('', '改名', '双击名字') + MI(ic('trk-sound', 16), '乐器与音色…', '', { d: '播放音色；记谱乐器见「换谱类」' })
        + (x.k === 'tab' ? MI(ic('trk-capo', 16), '变调夹与定弦…') : MI(sg('sg-clef', '', 16), '谱号', '', { d: '高音 / 低音 / 中音' }))
        + MI(ic('src-midi', 16), '导入 MIDI 到本轨…') + MI(ic('act-keyboard', 16), x.k === 'tab' ? '指板输入' : '键盘输入') + HR
        + MI(ic('trk-lock', 16), '锁定此轨', '', { d: '只在本窗口：光标跳过、录入和记号不会改到它' }) + MI('', '上移', 'Alt+Shift+↑') + MI('', '下移', 'Alt+Shift+↓') + HR + MI(ic('ed-delete', 16), '删除音轨', '', { cls: 'dis', d: m.lockAdd ? '整谱形态的谱不增删轨' : '可一步撤销' });
    } else if (name === 'thdr') {
      h = MI(ic('nota-jianpu', 16), '全部轨改为简谱', '', { d: '合唱指挥常用；六线谱轨不受影响' }) + MI(ic('nota-staff', 16), '全部轨改为五线谱') + HR + MI('', '展开全部') + MI('', '收起全部') + HR + MI(ic('act-info', 16), '曲谱信息…') + MI(ic('act-swap', 16), '换谱类…');
    } else if (name === 'kind') {
      h = MH('当前：' + esc(m.kind)) + (m.kindSwitch || []).map(k => MI(k[2] || '', k[0], '', { d: k[1], cls: k[3] ? 'dis' : '' })).join('') + HR + MI(ic('act-new', 16), '另建一份…', '', { d: '把旋律（含歌词、和弦）带到新窗口，原谱保留' });
    } else if (name === 'clef') {
      h = MH('谱号') + MI(sg('sg-clef', '', 16), '高音谱号', '', { cls: 'pri' }) + MI('', '低音谱号') + MI('', '中音谱号');
    } else if (name === 'more') {
      h = (data && data.hidden ? data.hidden : '') + MI(ic('act-redo', 16), '重做', 'Ctrl+Y') + MI(ic('ed-split', 16), '拆分') + MI(ic('ed-merge', 16), '合并') + MI(ic('ed-clear', 16), '清单音') + MI(sg('sg-chordnote', '', 16), '和音（加音程）') + HR
        + MI(ic('ed-octave-shift', 16), '移高八度 / 移低八度', '', { d: '整个选区；与「高音点」「八度线」三形三义' }) + MI(sg('sg-tupletN', '', 16), 'N 连音…') + MI(ic('act-step', 16), '节奏型库…') + HR + MI(ic('act-nowrap', 16), '不换行视图') + MI(ic('act-keyboard', 16), '键盘 / 指板输入');
    } else if (name === 'ovf') {
      h = '<label class="msearch">' + ic('ui-search', 14) + '<input placeholder="搜窗口：曲名或谱类"></label>' + m.docs.map((d, i) => '<button class="wrow' + (d.on ? ' on' : '') + '" data-a="doc" data-i="' + i + '"><span style="width:16px;display:flex">' + (d.ic || '') + '</span><span class="wt"><b>' + esc(d.title) + '</b><span>' + esc(d.kind) + '</span></span><span class="wst">' + (d.on ? '当前' : d.hidden ? '' : '页签中') + '</span><span style="width:12px;display:flex;color:var(--faint)">' + (d.saved ? '' : '<span class="ring" style="width:7px;height:7px;border-radius:50%;border:1.4px solid currentColor"></span>') + '</span><span class="ib" data-a="close" data-i="' + i + '" role="button" aria-label="关闭">' + ic('act-close', 12) + '</span></button>').join('')
        + HR + MI(ic('act-add', 16), '新窗口…', 'Alt+N') + MI(ic('act-close', 16), '关闭已存入的窗口', '', { d: '未存入的保留，不会丢' });
    } else if (name === 'tabctx') {
      h = MI(ic('act-close', 16), '关闭', '中键') + MI('', '关闭其他') + MI('', '关闭右侧') + HR + MI(ic('ui-save', 16), '存入我的曲谱') + MI(ic('act-swap', 16), '复制为新窗口');
    } else if (name === 'save') {
      h = MH('已存入我的曲谱') + '<div class="why">编辑实时同步到「我的曲谱」，换电脑登录同一账号即可继续。</div>' + MI(ic('ui-download', 16), '另存为文件 .mtab.json', 'Ctrl+S');
    } else if (name === 'frets') {
      h = '<div style="display:grid;grid-template-columns:repeat(5,40px);gap:4px;padding:4px">' + Array.from({ length: 15 }, (_, i) => '<button class="tb dig" style="width:40px;height:34px">' + (i + 10) + '</button>').join('') + '</div>';
    } else if (name === 'modes') {
      h = MH('工作模式') + MODES.map(x => MI(ic(x[2], 16), x[1], '', { a: 'mode', attr: ' data-v="' + x[0] + '"', cls: S.mode === x[0] ? 'pri' : '', d: { write: '录音符、记号、歌词与和弦（默认）', engrave: '版面、间距、断行、页头', play: '试听、混音、循环练习、谱架', output: '打印 / PDF、分谱、导出、发布' }[x[0]] })).join('');
    } else if (name === 'help') {
      h = MH('常用快捷键') + [['数字 1–7 / 0', '音高 / 休止'], ['Q W E R T Y', '时值'], ['. · D', '附点 · 增时线'], ['+ / −', '高音点 / 低音点'], ['Insert / Delete', '后插 / 删除'], ['Ctrl+K', '和弦'], ['Ctrl+/', '搜功能'], ['/', '搜记号'], ['Esc', '回到「书写」'], ['Alt+N', '新建']].map(x => '<div class="mi2" style="min-height:28px"><span class="ml">' + x[1] + '</span><span class="kbd">' + x[0] + '</span></div>').join('');
    }
    return '<div class="mn" role="menu" data-menu="' + name + '">' + h + '</div>';
  };

  /* ── 命令面板（Ctrl+/）：每条结果写「在界面哪里」，收录旧名别名 ── */
  FX.CMDS = [
    ['延长号', 'ych ycz yanchanghao fermata', '书写 · 左栏记号 · 奏法', 'sign:fermata'], ['渐强', 'jq cresc', '书写 · 左栏记号 · 力度', 'sign:hair-cresc'], ['中强 mf', 'zq mf', '书写 · 左栏记号 · 力度', 'sign:dyn-mf'],
    ['一键配伴奏', 'yjpbz peibanzou', '右栏 · 智能', 'noop'], ['配和弦工作台', 'phxgzt', '右栏 · 智能', 'noop'], ['打印 / 存 PDF', 'dy pdf 打印… print', '输出 · 打印存档（原「打印…」）', 'mode:output'],
    ['示例曲谱', 'slqp 预设 yushe', '文件 ▾（原「预设」）', 'menu:file'], ['存为文件', 'cwwj ctrl+s', '文件 ▾ · Ctrl+S', 'noop'], ['发布到谱库', 'fb publish', '标题栏 · 发布', 'publish'],
    ['排版', 'pb paiban', '工作模式 · 排版（原顶栏「排版」）', 'mode:engrave'], ['打印预览', 'dyyl 预览 yulan', '输出（预览就是主视图）', 'mode:output'], ['智能', 'zn zhineng', '右栏 · 智能（原顶栏「智能」）', 'rtab:smart'],
    ['落音自动前进', 'lyzdqj zdqj', '账号 ▾ · 偏好设置', 'noop'], ['键位档 GP', 'jwd gp', '账号 ▾ · 偏好设置', 'noop'], ['外观 深色', 'wg sc theme', '账号 ▾ · 外观', 'theme'],
    ['全部轨改为五线谱', 'qbg wxp', '左栏 · 音轨 ⋯', 'noop'], ['五线谱联排', 'wxplp', '左栏 · 吉他轨组', 'tabstaff'], ['逐字填词', 'zztc', '右栏 · 文字', 'rtab:text'],
    ['此处换行', 'cchh', '排版 · 工具带', 'mode:engrave'], ['分谱', 'fp parts', '输出 · 分谱', 'mode:output'], ['MusicXML', 'musicxml xml', '输出 · 专业格式', 'mode:output'], ['新建', 'xj new', '文件 ▾ · Alt+N', 'new'],
  ];
  FX.cmd = (m, S) => {
    const q = (S.cmd || '').trim().toLowerCase();
    const hit = FX.CMDS.filter(c => !q || c[0].toLowerCase().includes(q) || c[1].split(' ').some(p => p.startsWith(q)));
    const hl = s => q && s.toLowerCase().includes(q) ? esc(s).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), x => '<mark>' + x + '</mark>') : esc(s);
    return '<div class="veil" data-a="cmdclose"></div><div class="cmd" role="dialog" aria-label="搜功能"><div class="ci">' + ic('ui-search', 18) + '<input data-a="cmdq" value="' + esc(S.cmd || '') + '" placeholder="搜功能、记号、设置…（拼音首字母：ych＝延长号；旧名：预设 / 打印… / 智能）"><span class="kbd">Esc</span></div><div class="cr">'
      + (hit.length ? hit.slice(0, 9).map((c, i) => '<div class="row' + (i === 0 ? ' hl' : '') + '" data-a="cmdgo" data-v="' + c[3] + '"><span>' + hl(c[0]) + '</span><span class="wh">在 ' + esc(c[2]) + '</span></div>').join('') : '<div class="row">没有匹配的功能</div>') + '</div></div>';
  };

  /* ── 页签溢出（宁少不糊）：当前页签按曲名自适应 148–240，其余 136–184（≥6 个汉字），放不下的收进「窗口 N ▾」，当前页签永远可见 ── */
  FX.fitTabs = (root) => {
    const box = root.querySelector('#tabs'); if (!box) return {};
    const tabs = [...box.querySelectorAll('.tab')], add = box.querySelector('#tab-add'), ovf = box.querySelector('#tab-ovf');
    tabs.forEach(t => { t.style.display = ''; t.style.width = ''; });
    const nat = tabs.map(t => { const tt = t.querySelector('.tt'); t.style.width = 'auto'; const w = Math.ceil(tt.scrollWidth) + (t.classList.contains('on') ? 74 : 62); return w; });
    const cur = Math.max(0, tabs.findIndex(t => t.classList.contains('on')));
    const W0 = box.clientWidth - 36;
    const curW = Math.max(148, Math.min(240, nat[cur] || 148)), MIN = 140, MAXW = 188;
    const order = tabs.map((_, i) => i).filter(i => i !== cur).sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur) || a - b);
    let vis = [cur], need = curW;
    const fits = (n, ovfOn) => curW + n * MIN <= W0 - (ovfOn ? 70 : 0);
    let k = 0; while (k < order.length && fits(k + 1, k + 1 < order.length)) k++;
    vis = vis.concat(order.slice(0, k));
    const hidden = tabs.length - vis.length, avail = W0 - (hidden ? 70 : 0) - curW;
    const others = vis.filter(i => i !== cur), ideal = others.map(i => Math.max(MIN, Math.min(MAXW, nat[i])));
    let sum = ideal.reduce((a, b) => a + b, 0), scale = sum > avail ? avail / sum : 1;
    tabs.forEach((t, i) => {
      if (!vis.includes(i)) { t.style.display = 'none'; return; }
      t.style.width = (i === cur ? curW : Math.max(MIN, Math.floor(ideal[others.indexOf(i)] * scale))) + 'px';
    });
    if (ovf) { ovf.classList.toggle('show', hidden > 0); const n = ovf.querySelector('.n'); if (n) n.textContent = hidden ? String(hidden) : ''; ovf.title = '还有 ' + hidden + ' 个窗口'; }
    return { visible: vis.length, hidden, curW, widths: tabs.map(t => t.style.display === 'none' ? 0 : parseInt(t.style.width)) };
  };
  /* 音轨区最多占左栏 48%：超出部分区内滚动，底部写「还有 N 条」 */
  FX.fitTrk = (root) => {
    const L = root.querySelector('#trk-list'); if (!L) return {};
    const old = L.querySelector('.more-hint'); if (old) old.remove();
    const rows = [...L.querySelectorAll('.tr')], lb = L.getBoundingClientRect();
    const below = rows.filter(r => r.getBoundingClientRect().top > lb.bottom - 20).length;
    if (L.scrollHeight > L.clientHeight + 2 && below) L.insertAdjacentHTML('beforeend', '<div class="more-hint">还有 ' + below + ' 条 ↓</div>');
    const left = root.querySelector('#left'), trk = root.querySelector('#trk');
    return { trkH: Math.round(trk.getBoundingClientRect().height), leftH: Math.round(left.getBoundingClientRect().height), below, palH: Math.round(root.querySelector('#pal').getBoundingClientRect().height) };
  };
  /* 工具带放不下时：按 data-pri（大＝先收）把低优先键收进「更多 ▾」，单行不折行 */
  FX.fitR2 = (root) => {
    const r2 = root.querySelector('#r2'); if (!r2) return [];
    const items = [...r2.querySelectorAll('[data-pri]')].sort((a, b) => +b.dataset.pri - +a.dataset.pri);
    items.forEach(x => x.style.display = '');
    const hidden = [];
    for (const it of items) { if (r2.scrollWidth <= r2.clientWidth + 1) break; it.style.display = 'none'; hidden.push(it.getAttribute('title')); }
    return hidden;
  };

  /* ── 手机 390（≤820）：D-07 ② 只读看谱口径，不新增编辑能力；只把现有底条与抽屉换成同一套信息架构 ── */
  FX.mobile = (m, S) => {
    const d = m.docs.find(x => x.on) || m.docs[0], t = m.tracks.find(x => x.on) || m.tracks[0];
    let h = '<header class="m-top"><button class="m-ib" data-a="msheet" data-v="menu" aria-label="菜单">' + ic('ui-menu', 22) + '</button><button class="m-title" data-a="msheet" data-v="win"><span class="m-ti">' + (d.ic || '') + '</span><span class="m-tt"><b>' + esc(d.title) + '</b><span>' + esc(d.kind) + ' · ' + m.docs.length + ' 个窗口</span></span>' + ic('act-chevron', 14) + '</button><button class="m-ib" aria-label="撤销">' + ic('act-undo', 20) + '</button><button class="m-pc" data-a="noop">' + ic('act-pc', 18) + '到电脑编辑</button></header>';
    h += '<main class="m-main">' + (S.mScore || '') + '</main>';
    h += '<nav class="m-bar"><button class="m-play" aria-label="播放">' + ic('ui-play', 20) + '</button><button class="m-chip" data-a="msheet" data-v="trk"><span class="tic" style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">' + (t.ic || '') + FX.badge(t.k === 'tab' ? 'tab' : t.nota, t.inst) + '</span><span class="m-cn">' + esc(t.name) + '</span>' + ic('act-chevron', 14) + '</button><button class="m-chip" data-a="msheet" data-v="pal">' + sg('sg-fermata', FX.ctxOf(t) === 'st' ? 'st' : FX.ctxOf(t), 20) + '<span class="m-cn">记号</span></button><button class="m-ib" data-a="msheet" data-v="out" aria-label="输出与分享">' + ic('ui-more', 22) + '</button></nav>';
    if (S.sheet) {
      let b = '';
      if (S.sheet === 'win') b = '<div class="m-sh">窗口 · ' + m.docs.length + '</div>' + m.docs.map((x, i) => '<div class="m-row' + (x.on ? ' on' : '') + '"><span style="width:20px;display:flex">' + (x.ic || '') + '</span><span class="wt"><b>' + esc(x.title) + '</b><span>' + esc(x.kind) + (x.saved ? '' : ' · 仅存本机') + '</span></span><button class="m-x" aria-label="关闭">' + ic('act-close', 16) + '</button></div>').join('') + '<button class="m-row add">' + ic('act-add', 20) + '<span class="wt"><b>新窗口</b><span>手机上以看谱为主；新建请到电脑</span></span></button>';
      else if (S.sheet === 'trk') b = '<div class="m-sh">音轨 · ' + esc(m.kind) + '</div>' + m.tracks.map(x => '<div class="m-row' + (x.on ? ' on' : '') + '"><span class="tic" style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--muted)">' + (x.ic || '') + FX.badge(x.k === 'tab' ? 'tab' : x.nota, x.inst) + '</span><span class="wt"><b>' + esc(x.name) + '</b><span>' + esc(FX.notaLabel(x)) + '</span></span><button class="m-x" aria-label="静音">' + ic('trk-mute', 18) + '</button><button class="m-x" aria-label="独奏">' + ic('trk-solo', 18) + '</button></div>').join('') + '<div class="note" style="padding:10px 16px">改记谱法、加轨请到电脑（手机以看谱为主，D-07 ②）</div>';
      else if (S.sheet === 'pal') { const ctx = FX.ctxOf(t); b = '<div class="m-sh">时值（原底部时值条）</div><div class="m-grid">' + [1, 2, 4, 8, 16].map(d => '<button class="m-cell">' + (ctx === 'jp' ? FX.jpDur(d) : sg('sg-dur-' + d, '', 20)) + '<span>' + { 1: '全', 2: '二分', 4: '四分', 8: '八分', 16: '十六分' }[d] + '</span></button>').join('') + '</div><div class="m-sh">记号 · 作用于 ' + esc(t.name) + '</div><div class="m-grid">' + FX.groups(ctx).slice(0, 3).map(g => g[2]).flat().slice(0, 20).map(id => '<button class="m-cell">' + sg(SG[id][2], ctx === 'st' ? 'st' : ctx, 20) + '<span>' + esc(SG[id][0]) + '</span></button>').join('') + '</div>'; }
      else if (S.sheet === 'menu') b = '<div class="m-sh">菜单</div>' + [['src-mine', '我的曲谱'], ['src-example', '示例曲谱'], ['ui-library', '谱库'], ['ui-theme', '外观'], ['ui-help', '帮助'], ['ui-account', '个人中心']].map(x => '<div class="m-row">' + ic(x[0], 20) + '<span class="wt"><b>' + x[1] + '</b></span></div>').join('');
      else if (S.sheet === 'out') b = '<div class="m-sh">输出与分享</div>' + [['act-pc', '发到电脑继续编辑', '复制链接'], ['out-card', '分享卡', ''], ['out-image', '图片 PNG', ''], ['ui-print', '打印 / 存 PDF', '']].map(x => '<div class="m-row">' + ic(x[0], 20) + '<span class="wt"><b>' + x[1] + '</b><span>' + x[2] + '</span></span></div>').join('');
      h += '<div class="m-veil" data-a="msheet" data-v=""></div><div class="m-sheet"><div class="m-grab"></div>' + b + '</div>';
    }
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);
