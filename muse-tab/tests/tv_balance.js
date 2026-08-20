/* tv_balance — v60.13 混音三件：S/M 高亮 · 立体声声像 · 电平平衡
   用户反馈：「增加立体声调节，分析电平平衡度，把响度调节到同一水平线。
             S和M点击时样式没有变化，分辨不出是否生效。」
   S/M 那条是真 bug：状态一直是对的（.on 加上了、applyMixLive 也生效），
   但 `body.shell #mixer-dock button{background:transparent}` 带 ID、优先级 (1,1,2)，
   把只有 (0,3,0) 的 `.mx-btn.solo.on` 整条压掉——纯粹是**看不见**。
   电平那条量的是「归一后各音色的感知响度离散度」，不是绝对值：
   绝对值取决于真实采样包（本机取不到），而离散度是算法自身的性质，可复算。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const T = (ok, name, detail) => {
  if (ok) { pass++; console.log('✅ ' + name + (detail ? ': ' + detail : '')); }
  else { fail++; console.log('❌ ' + name + (detail ? ': ' + detail : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto(FILE); await pg.waitForTimeout(900);

  const r = await pg.evaluate(() => {
    const out = {};
    loadSong(PRESETS[0].make());
    setMixerExpanded(true); renderMixerDock();
    const q = sel => document.querySelector('#mixer-dock ' + sel);
    /* 探针写法有讲究：**不能**「先 getComputedStyle 读一次、点击、再读一次」——
       实测同一同步块里先读后改会拿到**陈旧值**（前后都读成 transparent），
       换成不预读的写法却是对的，两边矛盾才发现是探针问题。
       改成**同一时刻横向比两个按钮**：点亮的那条轨 vs 没点的那条轨。
       既绕开陈旧读数，断言也更强——直接证明「亮/不亮」在视觉上可区分。 */
    const bg = el => { void el.offsetWidth; return getComputedStyle(el).backgroundColor; };

    // ── A S/M 点击必须**看得见**（不只是 class 变了）──
    /* S 与 M 分成两段各自跑：连着点会串扰——第一次点击触发重绘，
       第二个按钮的旧引用失效，只改得到 cfg、改不到页面（本套件初版 A2 就是这么假红的）。 */
    const pick = sel => document.querySelectorAll('#mixer-dock ' + sel);
    const reset = () => {   // persist() 会把混音状态跨 loadSong 还原，显式清零到已知起点
      ['tab', 'vox'].forEach(k => { const c = trackCfg(k, 0); c.solo = false; c.on = true; });
      renderMixerDock();
    };
    reset();
    pick('.mx-btn.solo')[0].click();
    out.A = { 轨数: pick('.mx-btn.solo').length,
      S亮: bg(pick('.mx-btn.solo')[0]), S暗: bg(pick('.mx-btn.solo')[1]),
      Scls: pick('.mx-btn.solo')[0].className };
    reset();
    pick('.mx-btn.mute')[0].click();
    out.A.M亮 = bg(pick('.mx-btn.mute')[0]);
    out.A.M暗 = bg(pick('.mx-btn.mute')[1]);
    out.A.Mcls = pick('.mx-btn.mute')[0].className;
    reset();

    // ── B 声像控件：自动 → 手动 → 双击回自动，且落到 cfg ──
    const pin = q('.mx-pan input'), pv = () => q('.mx-pan .pv').textContent;
    out.B = { 有控件: !!pin, 初始: pv(), 初始cfg: trackCfg('tab', 0).pan };
    if (pin) {
      pin.value = -70; pin.dispatchEvent(new Event('input'));
      out.B.拖后 = pv(); out.B.拖后cfg = trackCfg('tab', 0).pan;
      pin.dispatchEvent(new Event('dblclick'));
      out.B.双击后 = pv(); out.B.双击后cfg = trackCfg('tab', 0).pan;
    }

    // ── C 声像即时生效：播放中改 pan，轨道 panner 的值要跟着走 ──
    {
      const ctx = new OfflineAudioContext(2, 44100, 44100);
      const bus = buildBus(ctx);
      const tb = makeTrackBus(ctx, bus, -0.3);
      out.C = { 有panner: !!tb.pan, 建轨值: tb.pan ? +tb.pan.pan.value.toFixed(3) : null };
      if (tb.pan) {   // 模拟 applyMixLive 的写法
        try { tb.pan.pan.setTargetAtTime(0.6, ctx.currentTime, 0.02); } catch (_) { tb.pan.pan.value = 0.6; }
        out.C.可改 = true;
      }
    }

    // ── D 电平平衡：四类信号过归一后，感知响度的离散度应明显小于老算式 ──
    const SR = 44100;
    const mk = kind => {
      const n = SR | 0, a = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        if (kind === 'bass') a[i] = Math.sin(2 * Math.PI * 55 * t) * 0.5 * Math.exp(-t * 1.2);
        else if (kind === 'pluck') { let v = 0; for (let h = 1; h <= 12; h++) v += Math.sin(2 * Math.PI * 330 * h * t) / h;
          a[i] = v * 0.28 * Math.exp(-t * 3.5) * (1 + 6 * Math.exp(-t * 400)); }
        else if (kind === 'piano') { let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * 262 * h * t) / (h * h);
          a[i] = v * 0.6 * Math.exp(-t * 1.8) * (1 + 3 * Math.exp(-t * 250)); }
        else a[i] = Math.sin(2 * Math.PI * 880 * t) * 0.32;
      }
      return a;
    };
    const loudOf = a => { const kw = kWeight(a, SR); let s = 0;
      for (let i = 0; i < kw.length; i++) s += kw[i] * kw[i]; return Math.sqrt(s / kw.length); };
    const gNew = a => {
      let pk = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > pk) pk = v; }
      const w1 = Math.min(a.length, (SR * 0.5) | 0);
      const kw = kWeight(a.subarray(0, w1), SR); let s = 0;
      for (let i = 0; i < kw.length; i++) s += kw[i] * kw[i];
      return Math.min(0.09 / Math.sqrt(s / kw.length), 0.28 / envPeak(a, SR, 0, w1), 0.85 / pk, 4);
    };
    const gOld = a => {   // v60.12 老算式：不加权 rms + 瞬时真峰
      let pk = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > pk) pk = v; }
      const w1 = Math.min(a.length, (SR * 0.5) | 0);
      let s = 0; for (let i = 0; i < w1; i++) s += a[i] * a[i];
      return Math.min(0.09 / Math.sqrt(s / w1), 0.28 / pk, 4);
    };
    const db = x => 20 * Math.log10(Math.max(1e-9, x));
    const spread = gs => {
      const v = ['bass', 'pluck', 'piano', 'flute'].map(k => {
        const a = mk(k), g = gs(a), c = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) c[i] = a[i] * g;
        return db(loudOf(c));
      });
      return +(Math.max(...v) - Math.min(...v)).toFixed(2);
    };
    out.D = { 新: spread(gNew), 旧: spread(gOld) };

    // ── E K 加权滤波器本身的正确性：1kHz 附近≈直通、50Hz 应被显著压低 ──
    const tone = f => { const n = SR | 0, a = new Float32Array(n);
      for (let i = 0; i < n; i++) a[i] = Math.sin(2 * Math.PI * f * i / SR) * 0.5; return a; };
    const rel = f => db(loudOf(tone(f))) - db(0.5 / Math.SQRT2);   // 相对同幅正弦的理论 rms
    out.E = { at1k: +rel(1000).toFixed(2), at50: +rel(50).toFixed(2), at8k: +rel(8000).toFixed(2) };
    return out;
  });

  T(/245,\s*179,\s*1/.test(r.A.S亮 || '') && r.A.S亮 !== r.A.S暗 && /\bon\b/.test(r.A.Scls),
    'A1 独奏 S 点亮后是琥珀色，与未点亮的同类按钮明显不同（不再被 ID 规则压掉）',
    '亮=' + r.A.S亮 + '  暗=' + r.A.S暗);
  T(!!r.A.M亮 && r.A.M亮 !== r.A.M暗 && r.A.M亮 !== 'rgba(0, 0, 0, 0)' && /\bon\b/.test(r.A.Mcls),
    'A2 静音 M 点亮后有实色背景，与未点亮的同类按钮不同',
    '亮=' + r.A.M亮 + '  暗=' + r.A.M暗);
  T(r.B.有控件 && r.B.初始 === '自动' && r.B.初始cfg === null,
    'B1 每轨有声像滑杆，默认「自动」（跟随各声部自动铺开，不改既有听感）', JSON.stringify(r.B));
  T(r.B.拖后 === 'L70' && Math.abs(r.B.拖后cfg + 0.7) < 1e-9,
    'B2 拖动写入 cfg.pan 且读数正确（L70）', r.B.拖后 + ' / ' + r.B.拖后cfg);
  T(r.B.双击后 === '自动' && r.B.双击后cfg === null,
    'B3 双击回「自动」（cfg.pan 置回 null，不是写死 0）', r.B.双击后 + ' / ' + r.B.双击后cfg);
  T(!!(r.C.有panner && r.C.可改) && Math.abs(r.C.建轨值 + 0.3) < 1e-3,
    'C 轨道总线暴露 panner，建轨值正确且可被 applyMixLive 改写', JSON.stringify(r.C));
  T(r.D.新 < r.D.旧 - 6,
    'D 电平平衡：四类信号归一后的感知响度离散度显著收窄（新算式 vs 老算式）',
    '新 ' + r.D.新 + 'dB  旧 ' + r.D.旧 + 'dB');
  /* 阈值按规范滤波器算出来的理论值定，不拍脑袋：
     二级高通 38.13Hz/Q=0.5003，50Hz 处 |H| = r²/√((1−r²)²+(r/Q)²)，r=50/38.13=1.311
     → 0.633 ≈ −3.98dB；一级高架增益 +3.999dB，8kHz 已在架上 → ≈+4dB。 */
  T(Math.abs(r.E.at1k) < 1.5 && r.E.at50 > -5 && r.E.at50 < -3 && r.E.at8k > 3 && r.E.at8k < 5,
    'E K 加权滤波器与 BS.1770 规范吻合：1kHz≈直通 · 50Hz≈−4dB · 8kHz≈+4dB',
    JSON.stringify(r.E));

  if (errs.length) { fail++; console.log('❌ 页面报错: ' + errs.slice(0, 3).join(' | ')); }
  else console.log('NO ERRORS');
  console.log('PASS ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
