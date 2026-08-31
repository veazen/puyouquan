/* v60.85 小程序登录页过审整改回归（1.1.3 驳回两条 + 一个隐患）：
   ① 隐私默认同意 → 勾选框默认不勾，未勾时快捷登录/短信登录都只提示不放行；
   ② 「微信一键登录」混淆腾讯官方元素 → 全部 wxml 渲染文本不得出现「微信」字样；
   ③ 协议链接此前只复制链接打不开正文 → 现在小程序内打开 site 的 terms/privacy 页。
   纯 node 直测（Page/wx 打桩），另对 wxml/站点页做文本断言。
   突变实证：MUSETAB_MP_ROOT 指向 v60.84 旧 miniprogram 跑，应大面积红。 */
'use strict';
const path = require('path');
const fs = require('fs');

let pass = 0, total = 0;
const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

const MP = process.env.MUSETAB_MP_ROOT || path.resolve(__dirname, '../../miniprogram');
const SITE = path.resolve(__dirname, '../site');

/* ===== 打桩加载 login.js ===== */
const calls = { toast: [], redirect: [], nav: [] };
global.wx = {
  showToast: o => calls.toast.push(o && o.title),
  redirectTo: o => calls.redirect.push(o && o.url),
  navigateTo: o => calls.nav.push(o && o.url),
  setStorageSync: () => {}, getStorageSync: () => '', removeStorageSync: () => {},
  login: cb => cb && cb.fail && cb.fail(), request: () => {}, setClipboardData: () => {},
};
let cfg = null;
global.Page = c => { cfg = c; };
const p = path.resolve(MP, 'pages/login/login.js');
delete require.cache[p];
require(p);

const mkCtx = () => {
  const ctx = Object.create(cfg);
  ctx.data = JSON.parse(JSON.stringify(cfg.data));
  ctx.setData = pt => Object.assign(ctx.data, pt);
  return ctx;
};

// T1 默认不勾选（默认勾选=默认同意，正是驳回原因1）
T(cfg.data && cfg.data.agreed === false, 'T1 协议勾选默认不勾', JSON.stringify(cfg.data));

// T2 未勾选点短信登录：只提示、不跳转
let ctx = mkCtx();
calls.toast.length = 0; calls.redirect.length = 0;
ctx.onSms();
T(calls.redirect.length === 0 && calls.toast.length === 1 && /同意/.test(calls.toast[0] || ''),
  'T2 未勾选短信登录被拦（提示去勾选）', JSON.stringify(calls.toast));

// T3 勾选后短信登录放行 → 网页端 me.html
ctx = mkCtx(); ctx.setData({ agreed: true });
calls.toast.length = 0; calls.redirect.length = 0;
ctx.onSms();
T(calls.redirect.length === 1 && /pages\/web\/web\?u=.*me\.html/.test(decodeURIComponent(calls.redirect[0] || '')),
  'T3 勾选后短信登录放行', JSON.stringify(calls.redirect));

// T4 toggleAgree 往返（旧代码无此方法——try 包住让它红而不是崩）
ctx = mkCtx();
let a1 = null, a2 = null;
try { ctx.toggleAgree(); a1 = ctx.data.agreed; ctx.toggleAgree(); a2 = ctx.data.agreed; } catch (_) {}
T(a1 === true && a2 === false, 'T4 勾选框可勾可取消', a1 + '/' + a2);

// T5 needAgree 提示存在（未勾选时快捷登录按钮 bindtap 走它）
ctx = mkCtx(); calls.toast.length = 0;
try { ctx.needAgree(); } catch (_) {}
T(calls.toast.length === 1 && /用户协议/.test(calls.toast[0] || '') && /隐私政策/.test(calls.toast[0] || ''),
  'T5 未勾选提示点名两份文档', JSON.stringify(calls.toast));

// T6 协议/隐私在小程序内真打开（此前只复制链接，审核员点不开正文）
ctx = mkCtx(); calls.nav.length = 0;
try { ctx.onTos(); ctx.onPri(); } catch (_) {}
const navs = calls.nav.map(u => decodeURIComponent(u || ''));
T(navs.length === 2 && /terms\.html/.test(navs[0]) && /privacy\.html/.test(navs[1]) && navs.every(u => /pages\/web\/web/.test(u)),
  'T6 协议/隐私走 pages/web 打开正文', JSON.stringify(navs));

/* ===== wxml 文本断言 ===== */
const stripCmt = s => s.replace(/<!--[\s\S]*?-->/g, '');
const loginWxml = stripCmt(fs.readFileSync(path.resolve(MP, 'pages/login/login.wxml'), 'utf8'));

// T7 快捷登录按钮：无「微信」字样 + open-type 按钮以 agreed 把关
T(/手机号快捷登录/.test(loginWxml) && !/微信一键登录/.test(loginWxml)
  && /wx:if="\{\{agreed\}\}"[^>]*open-type="getPhoneNumber"/.test(loginWxml.replace(/\n\s*/g, ' ')),
  'T7 按钮改「手机号快捷登录」且授权按钮被勾选把关');

// T8 「登录即表示同意」死句移除，换成主动勾选行
T(!/登录即表示同意/.test(loginWxml) && /我已阅读并同意/.test(loginWxml),
  'T8 默认同意话术移除、勾选行在');

// T9 全部 wxml 渲染文本无「微信」字样（驳回原因2：混淆腾讯官方元素）
const wxmls = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f);
  if (fs.statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.wxml')) wxmls.push(fp); } })(path.resolve(MP, 'pages'));
const offenders = wxmls.filter(f => /微信/.test(stripCmt(fs.readFileSync(f, 'utf8'))));
T(wxmls.length >= 4 && offenders.length === 0, 'T9 全部页面渲染文本无「微信」字样', offenders.join(','));

/* ===== 站点协议页存在且要点齐全（审核员会点开链接看正文）===== */
const terms = fs.existsSync(path.join(SITE, 'terms.html')) ? fs.readFileSync(path.join(SITE, 'terms.html'), 'utf8') : '';
const priv = fs.existsSync(path.join(SITE, 'privacy.html')) ? fs.readFileSync(path.join(SITE, 'privacy.html'), 'utf8') : '';
T(/用户协议/.test(terms) && /support@puyouquan\.com/.test(terms) && /知识产权/.test(terms),
  'T10 terms.html 正文齐全');
T(/隐私政策/.test(priv) && /手机号/.test(priv) && /剪切板/.test(priv) && /support@puyouquan\.com/.test(priv),
  'T11 privacy.html 正文齐全（含小程序收集项）');

console.log(pass === total ? ('PASS ' + pass + '/' + total) : ('FAIL ' + pass + '/' + total));
process.exit(pass === total ? 0 : 1);
