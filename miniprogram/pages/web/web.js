// v60.4 通用站内页承载（目前用于「手机号验证码登录」→ 打开网页端个人中心）。
// 为什么要独立一页而不复用首页：web-view 的 src 只能在同一域名白名单内跳，
// 但首页有登录门与 postMessage 分享逻辑，混用会让「登录完回哪」变得含糊。
// u 参数只接受站内域名，站外一律回落主站（防被诱导跳转到仿冒页骗验证码）。
const { API } = require('../../utils/login');
const SAFE = /^https:\/\/([a-z0-9-]+\.)*puyouquan\.com(\/|$|\?)/i;

Page({
  data: { src: '' },
  onLoad(q) {
    const raw = decodeURIComponent(String((q && q.u) || ''));
    this.setData({ src: SAFE.test(raw) ? raw : (API + '/me.html') });
  },
});
