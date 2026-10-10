/* 对比度：node contrast.js <fg> <bg> [<fg> <bg> ...]   颜色写 #rrggbb 或 #rrggbbaa（带透明时先叠在 bg 上）
   也可：node contrast.js --pairs pairs.json  （[{name,fg,bg,min}] → 逐条报 PASS/FAIL） */
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(a); };
const over = (f, b) => f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
const L = c => { const s = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
const ratio = (fg, bg) => { const B = hex(bg), F = over(hex(fg), B); const a = L(F), b = L(B.slice(0, 3)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
const args = process.argv.slice(2);
if (args[0] === '--pairs') { const ps = JSON.parse(require('fs').readFileSync(args[1], 'utf8')); let bad = 0;
  for (const p of ps) { const r = ratio(p.fg, p.bg); const ok = r >= (p.min || 4.5); if (!ok) bad++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + r.toFixed(2) + '  (min ' + (p.min || 4.5) + ')  ' + p.name + '  ' + p.fg + ' on ' + p.bg); }
  process.exit(bad ? 1 : 0); }
for (let i = 0; i + 1 < args.length; i += 2) console.log(args[i] + ' on ' + args[i + 1] + ' = ' + ratio(args[i], args[i + 1]).toFixed(2));
