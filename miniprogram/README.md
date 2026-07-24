# 谱友圈小程序（谱库壳 · v45.5）

小程序定位：**看谱入口**（谱库浏览 / 看谱 / 分享带谱直达），制谱以网页为主。
实现：web-view 承载 `puku.puyouquan.com`（备案主体一致才能过审）。

## 上线步骤（需小程序管理员操作）
1. **微信公众平台 → 小程序后台 → 开发 → 开发管理 → 开发设置 → 业务域名**：
   添加 `puku.puyouquan.com`（以及 `zhipu.puyouquan.com`，看谱页会跳转到它）。
   后台会给一个校验文件（`xxx.txt`），把它放到仓库 `muse-tab/site/` 目录提交，
   部署后即在两个域名根路径可访问（www/puku 共用 site 根；zhipu 需放到 /var/www/puyouquan/ 根，SSH 手动放一次）。
2. **微信开发者工具**：导入本 `miniprogram/` 目录，`project.config.json` 里填入小程序 AppID。
3. 预览真机验证 → 上传体验版 → 提交审核（类目建议：教育-在线教育 或 工具-信息查询）。

## 说明
- 分享：首页/看谱页均支持转发，看谱页分享卡片带谱 id，对方点开直达该谱。
- 支付合规：小程序内**不做虚拟支付**（iOS 禁止）；会员购买入口只在网页端。
- 网页侧如需把「当前浏览的谱」告知小程序（分享带谱直达），可在 puku 页面加：
  `wx.miniProgram.postMessage({data:{pubId, title}})`（仅小程序 env 生效，后续增强项）。
