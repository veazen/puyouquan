// 首页：web-view 直载谱库。
// ⚠️ v58.7 谱库并入主站后，puku 根路径变成跳转占位页（view.html → location.replace 到 www）——
//    web-view 里跳到未加白的域名，微信直接报「不支持打开 …」。故此处必须指向**不会跳转**的真身：
//    www.puyouquan.com 首页即搜索型谱库。业务域名白名单需同时含 www / puku（卡片链观看页在 puku）。
// v60.1：先换静默登录票据再喂 src，落地即登录态（换票失败自动回落直开，不阻塞看谱）。
const { enterUrl } = require('../../utils/login');
const TARGET = 'https://www.puyouquan.com/';

Page({
  data: { src: '' },
  onLoad() {
    enterUrl(TARGET).then(src => this.setData({ src }));
  },
  onMsg(e) {  // 网页可 postMessage 上报当前浏览的谱（用于分享卡片带谱直达）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
  },
  onShareAppMessage() {
    if (this.pubId) return { title: (this.pubTitle || '曲谱') + ' - 谱友圈谱库', path: '/pages/score/score?id=' + this.pubId };
    return { title: '谱友圈谱库 · 在线看谱/移调/跟谱', path: '/pages/index/index' };
  },
  // 无 onShareTimeline：web-view 页面不支持分享到朋友圈，声明了只会在控制台报警告。
  //   要做朋友圈分享得走网页侧的 H5 分享卡（观看栏「分享卡」出 PNG，长按保存转发）。
});
