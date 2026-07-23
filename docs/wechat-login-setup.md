# 微信登录接入与上线（A · 开放平台网站应用扫码登录）

> 后端已就绪（`api/wx.js` + `server.js` 路由 + `db.js` 迁移），代码不含任何凭据。
> 本文是**你在微信开放平台 + 服务器**要做的配置。三端（网站/公众号/小程序）在**同一开放平台主体**下绑定后，`unionid` 自动统一账号。

## A. 网站应用扫码登录（已实现，配置即上线）

### 1) 微信开放平台侧（open.weixin.qq.com）
1. 管理中心 → **网站应用 → 创建网站应用**（需**企业主体认证**，认证费约 ¥300/年）
2. 审核通过后，在应用**「开发信息」**里拿到 **AppID** 和 **AppSecret**
3. **「授权回调域」填**：`www.puyouquan.com`（账号中枢主域，非编辑器子域）
   - ⚠️ 只填**域名**，不带 `https://`、不带路径
   - 为什么是主域：回调只是**内部中转**——微信回跳到 `www.../api/wx/web/callback` 设好跨子域 Cookie（`Domain=.puyouquan.com`）后 302 弹回登录发起页；zhipu / puku / 官网三站因此共享登录态。把中枢放主域比绑在编辑器子域更稳。
   - 微信「网站应用」的授权回调域**不自动覆盖子域名**：填 `www.puyouquan.com`，则 `WX_WEB_REDIRECT` 的 host 必须也是 `www.puyouquan.com`（www 与不带 www 的主域**二选一并保持一致**，别混用）。
   - 前提：`www.puyouquan.com` 已 **ICP 备案 + HTTPS**（主域即备案主体，已就绪）。
   - ⚠️ 换域前先在服务器确认官网 vhost 的 `/api/` 反代已通：`curl -s https://www.puyouquan.com/api/health` 应返回 `{"ok":true...}`。若 404，说明 `/api/` include 没落到官网 server 块，重跑一次幂等的 `sudo bash /tmp/api-setup.sh` 或手动把 `include snippets/pyq-api.conf;` 加进官网块。（部署冒烟已加该断言，会自动兜底报警。）

### 2) 服务器侧（凭据只进这个文件，不进仓库）
`/etc/puyouquan/api.env` 增加三行：
```
WX_WEB_APPID=wx你的AppID
WX_WEB_SECRET=你的AppSecret
WX_WEB_REDIRECT=https://www.puyouquan.com/api/wx/web/callback
```
重启并核验（回调域主域 /api 必须通）：
```bash
sudo systemctl restart pyq-api
curl -s https://www.puyouquan.com/api/health   # 应含 "wx_web":true —— 若 404 见上「换域前」提示
curl -s https://zhipu.puyouquan.com/api/health  # 编辑器侧同一后端，应含 "wx_web":true
```

### 3) 前端
无需操作。前端启动时探测 `/api/health`，`wx_web:true` 后**登录弹窗自动出现「微信扫码登录」**按钮；未配置则不显示（无死按钮）。

### 登录流程（已实现）
点「微信扫码登录」→ 后端 `GET /api/wx/web/login-url` 返回二维码链接 → 整页跳转到微信授权页扫码 → 微信回跳 `GET /api/wx/web/callback?code=&state=` → 后端换 `openid/unionid`、按 **unionid 优先**匹配或建号、发 JWT Cookie（`Domain=.puyouquan.com` 三站共享）→ 302 回跳原页 `?wxlogin=ok`，前端刷新账号态。

- **账号统一**：同一 unionid 复登返回同一账号；已有手机号账号可后续绑定微信（`userBindWx`，绑定入口为后续小功能）。
- **CSRF**：`state` 用 JWT_SECRET HMAC 签名 + 10 分钟过期 + 回跳地址白名单（仅 `*.puyouquan.com`）。

## B. 公众号·网页授权（后续，与 A 共账号）
需公众号后台配置**网页授权域名**；后端加 `snsapi_userinfo` 授权的 `/api/wx/mp/*` 路由，复用 `upsertWxUser`（unionid 统一）。等 A 跑通后接。

## C. 小程序·轻量版（后续，独立前端工程）
独立小程序（浏览/搜索谱库 + 看谱跟谱移调 + 登录 + 个人中心，**非全功能编辑器**）。后端加 `/api/wx/mini/login`（`wx.login`→`code2session`），同样按 unionid 统一账号。需小程序主体认证 + 类目审核 + 提审上架（周期以周计）。

## 自测
```bash
node api/wx.test.js                      # 纯逻辑（state 签名/URL/换 token）8 项
node --experimental-sqlite api/db.test.js  # DB 层 + 迁移 + upsert 6 项
```
