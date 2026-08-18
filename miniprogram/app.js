// 谱友圈小程序：谱库展示壳——web-view 承载已备案的自有站点。
// 首页 = www.puyouquan.com（主站首页即谱库）；看谱页 = puku.puyouquan.com/kanpu.html?pub=ID。
//   v60.0 起首页不再指 puku 根：那里已是跳转占位页，web-view 一跳就撞业务域名白名单。
// v60.1 进页面前先用 wx.login 换一次性票据（utils/login.js），web-view 落地即登录态。
// 设计：小程序=看谱入口（谱库/看谱/分享），制谱仍以网页为主；iOS 内不做虚拟支付（会员购买走网页，合规）。
App({});
