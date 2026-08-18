// 看谱页：分享卡片/扫码进入 → 直达指定发布谱。
// 直接开 puku 的观看页 kanpu.html（同域、不跳转）；不用 /pub/:id SSR 落地页——那是给爬虫的，
// 真人要等 1.2s 再 location.replace，web-view 里白等一次跳转。无 id 时回落主站谱库首页。
// v60.1：同样先换静默登录票据，进来就是登录态（收藏/谱架能直接用）。
const { enterUrl } = require('../../utils/login');

Page({
  data: { src: '' },
  onLoad(q) {
    const id = String((q && q.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
    this.id = id;
    const target = id ? ('https://puku.puyouquan.com/kanpu.html?pub=' + id) : 'https://www.puyouquan.com/';
    enterUrl(target).then(src => this.setData({ src }));
  },
  onShareAppMessage() {
    if (this.id) return { title: '给你分享一首谱 - 谱友圈', path: '/pages/score/score?id=' + this.id };
    return { title: '谱友圈谱库', path: '/pages/index/index' };
  },
});
