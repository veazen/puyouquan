#!/usr/bin/env node
/* 谱友圈 · 采样循环点离线检测（v60.8）
 *
 * 动机：持续型音色（弦乐/长笛/人声）的延音上限 = 采样自身长度，长音一到头就得收，
 *       谱面写全音符×4 也拖不住。SoundFont 靠 loopStart/loopEnd 解决，midi-js 的
 *       MP3 包没有这份元数据——本脚本离线把它算出来，运行时 AudioBufferSourceNode.loop 直接吃。
 *
 * 为什么在浏览器里跑：Node 无内置 MP3 解码器（零依赖红线不允许引第三方），而
 *       Chromium 的 decodeAudioData **就是运行时用的那个解码器**——同一段 MP3 解出的
 *       PCM 逐样一致，算出的下标才能对齐客户端实际拿到的 AudioBuffer。用别的解码器
 *       （ffmpeg/minimp3）解码边界哪怕差几个样本，接缝就会咔一声。
 *
 * 算法（三步，全部在稳态区内做）：
 *   ① 定位稳态：跳过起音（峰值后包络回落到平台）与尾部释放，取中段。
 *   ② 自相关求基周期：在稳态窗内对 lag∈[minLag,maxLag] 求归一化互相关，取最高峰。
 *      弦乐/人声有明显周期性；长笛近正弦，周期性更强。
 *   ③ 对齐与打分：把 loopEnd-loopStart 取成基周期的整数倍，两端都吸附到**同向过零点**
 *      （正斜率过零），再算接缝不连续度 = |x[end]-x[start]| 与 |斜率差|，超阈值判失败。
 *
 * 用法：
 *   node deploy/loop-detect.js <音色包.js…>            # 检测并打印报告
 *   node deploy/loop-detect.js --out loops.json <包…>   # 同时写出元数据
 * 需 env CHROMIUM_PATH 指向 chromium。
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
let outPath = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') { outPath = args[++i]; continue; }
  files.push(args[i]);
}
if (!files.length) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }

/* midi-js 包是 JS 对象字面量：MIDI.Soundfont.xxx = { "A0": "data:audio/mp3;base64,…", … } */
function parsePack(txt) {
  const a = txt.indexOf('"data:audio');
  const st = a >= 0 ? txt.lastIndexOf('{', a) : txt.indexOf('{');
  const body = txt.slice(st, txt.lastIndexOf('}') + 1).replace(/,\s*\}\s*$/, '}');
  return JSON.parse(body);
}
const NOTE_RE = /^([A-G])(b|#)?(-?\d)$/;
function noteMidi(nm) {
  const m = NOTE_RE.exec(nm); if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return (+m[3] + 1) * 12 + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/* 在页面里跑的检测器：入参 base64 MP3，出参 {ok, loopStart, loopEnd, seam, period} —— 全部以「秒」计，
   因为 AudioBuffer 的 loopStart/loopEnd 就是秒，且采样率随设备变（44.1k/48k）时下标会漂。 */
const DETECT = function (a) {
  const b64 = a[0], midi = a[1];
  return new Promise(resolve => {
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    // eslint-disable-next-line no-undef
    window.__ctx.decodeAudioData(arr.buffer).then(buf => {
      const sr = buf.sampleRate, ch = buf.getChannelData(0), n = ch.length;
      const F = f => Math.round(f * sr);
      // ---- ① 稳态区：跳过起音与尾部释放 ----
      let peak = 0, pi = 0;
      for (let i = 0; i < n; i++) { const a = Math.abs(ch[i]); if (a > peak) { peak = a; pi = i; } }
      if (peak < 0.001) return resolve({ ok: false, why: 'silent' });
      // 包络（20ms RMS 窗）用于找平台段
      const W = F(0.02), env = [];
      for (let i = 0; i + W < n; i += W) {
        let s = 0; for (let k = i; k < i + W; k++) s += ch[k] * ch[k];
        env.push(Math.sqrt(s / W));
      }
      const envMax = Math.max.apply(null, env);
      if (envMax <= 0) return resolve({ ok: false, why: 'silent-env' });
      // 稳态起点：包络首次达到 max 的 70% 之后再退 60ms（越过起音瞬态）
      let e0 = 0; for (let i = 0; i < env.length; i++) if (env[i] >= envMax * 0.7) { e0 = i; break; }
      // 稳态终点：从尾部回溯，包络仍在 max 的 45% 以上（再往后是释放段）
      let e1 = env.length - 1; while (e1 > e0 && env[e1] < envMax * 0.45) e1--;
      const s0 = Math.min(n - 1, e0 * W + F(0.06));
      const s1 = Math.min(n - 1, e1 * W);
      const sustain = s1 - s0;
      if (sustain < F(0.25)) return resolve({ ok: false, why: 'no-sustain', sustainSec: sustain / sr });

      // ---- ② 自相关求基周期（在稳态窗前段做，窗长 ≥ 4 个最长周期）----
      const f0 = 440 * Math.pow(2, (midi - 69) / 12);
      const minLag = Math.max(2, Math.floor(sr / (f0 * 2.2)));   // 允许到 2 倍频
      const maxLag = Math.min(Math.floor(sr / (f0 / 2.2)), Math.floor(sustain / 4));
      if (maxLag <= minLag) return resolve({ ok: false, why: 'lag-range' });
      const win = Math.min(F(0.12), Math.floor(sustain / 3));
      let bestLag = 0, bestR = -2;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let num = 0, da = 0, db = 0;
        for (let i = 0; i < win; i++) {
          const a = ch[s0 + i], b = ch[s0 + i + lag];
          num += a * b; da += a * a; db += b * b;
        }
        const r = num / (Math.sqrt(da * db) || 1e-9);
        if (r > bestR) { bestR = r; bestLag = lag; }
      }
      if (bestR < 0.5) return resolve({ ok: false, why: 'weak-periodicity', r: +bestR.toFixed(3) });

      // ---- ③ 循环区间：整数倍周期 + 同向过零吸附 ----
      const zeroUp = (from, limit) => {           // 向后找最近的正斜率过零点
        for (let i = Math.max(1, from); i < Math.min(n - 1, from + limit); i++)
          if (ch[i - 1] <= 0 && ch[i] > 0) return i;
        return -1;
      };
      const ls = zeroUp(s0, bestLag * 2);
      if (ls < 0) return resolve({ ok: false, why: 'no-zero-start' });
      // 目标循环长度：尽量长（音色变化更自然），但必须落在稳态内
      const cycles = Math.max(3, Math.floor((s1 - ls) / bestLag) - 1);
      let best = null;
      for (let c = cycles; c >= 3; c--) {          // 从长到短试，取第一个接缝合格的
        const target = ls + c * bestLag;
        if (target >= s1) continue;
        const le = zeroUp(target - Math.floor(bestLag / 2), bestLag);
        if (le < 0 || le <= ls) continue;
        // 接缝不连续度：幅度差 + 斜率差，都相对峰值归一
        const dAmp = Math.abs(ch[le] - ch[ls]) / peak;
        const slope = k => (ch[k + 1] - ch[k - 1]);
        const dSlope = Math.abs(slope(le) - slope(ls)) / (peak || 1e-9);
        const score = dAmp + dSlope * 0.5;
        if (!best || score < best.score) best = { ls, le, dAmp, dSlope, score, c };
        if (score < 0.02) break;                   // 够好就不再找
      }
      if (!best) return resolve({ ok: false, why: 'no-loop-window' });
      const PASS = 0.08;                           // 接缝阈值：实测 <0.08 听不出咔声
      resolve({
        ok: best.score < PASS,
        why: best.score < PASS ? '' : 'seam-too-big',
        loopStart: +(best.ls / sr).toFixed(6),
        loopEnd: +(best.le / sr).toFixed(6),
        seam: +best.score.toFixed(4),
        dAmp: +best.dAmp.toFixed(4),
        cycles: best.c,
        periodMs: +(bestLag / sr * 1000).toFixed(3),
        r: +bestR.toFixed(3),
        durSec: +(n / sr).toFixed(3),
        sustainSec: +(sustain / sr).toFixed(3),
      });
    }).catch(e => resolve({ ok: false, why: 'decode:' + (e && e.message) }));
  });
};

(async () => {
  const { chromium } = require(path.join(__dirname, '..', 'muse-tab', 'tests', 'node_modules', 'playwright'));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage();
  await pg.goto('about:blank');
  await pg.evaluate(() => { window.__ctx = new (window.AudioContext || window.webkitAudioContext)(); });
  const sr = await pg.evaluate(() => window.__ctx.sampleRate);
  console.log('解码器：Chromium decodeAudioData @ ' + sr + ' Hz（与运行时同源）\n');

  const out = {};
  let gTot = 0, gOk = 0;
  for (const f of files) {
    const name = path.basename(f).replace(/-mp3\.js$|\.js$/, '');
    const map = parsePack(fs.readFileSync(f, 'utf8'));
    const notes = Object.keys(map).map(k => [noteMidi(k), map[k]]).filter(x => x[0] != null)
      .sort((a, b2) => a[0] - b2[0]);
    const res = {};
    let ok = 0; const fails = {};
    for (const [midi, uri] of notes) {
      const b64 = uri.slice(uri.indexOf(',') + 1);
      const r = await pg.evaluate(DETECT, [b64, midi]).catch(e => ({ ok: false, why: 'eval:' + e.message }));
      if (r.ok) { ok++; res[midi] = [r.loopStart, r.loopEnd]; }
      else fails[r.why] = (fails[r.why] || 0) + 1;
      if (r.ok || r.why) { /* 逐音明细留给 --verbose，默认只出汇总 */ }
    }
    gTot += notes.length; gOk += ok;
    out[name] = res;
    const pct = (ok / notes.length * 100).toFixed(1);
    console.log(`${name.padEnd(22)} ${String(ok).padStart(3)}/${notes.length} 成功 (${pct}%)` +
      (Object.keys(fails).length ? '  失败原因: ' + JSON.stringify(fails) : ''));
  }
  console.log(`\n合计 ${gOk}/${gTot} (${(gOk / gTot * 100).toFixed(1)}%)`);
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(out));
    console.log('已写出 ' + outPath + '（' + fs.statSync(outPath).size + ' B）');
  }
  await b.close();
  process.exit(gOk > 0 ? 0 : 1);
})();
