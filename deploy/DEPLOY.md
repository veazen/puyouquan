# 谱吧 PU8 · 上线操作手册（pu8.cn）

## 一次性初始化
1. **DNS**：在域名控制台给 `pu8.cn` 加两条 A 记录：`@` 和 `www` → 服务器公网 IP
2. **登录服务器**（SSH 密钥），把本仓库 `deploy/` 两个文件传上去后执行：
   ```bash
   sudo bash server-setup.sh
   ```
3. **防火墙**：云控制台放行 80、443（SSH 22 保持仅密钥登录）

## 发布 / 更新版本（每次发版执行）
本地仓库根目录：
```bash
SERVER=root@服务器IP ./deploy/deploy.sh
```
约 1 秒完成；用户刷新页面即获得新版（index.html 已配置 no-cache）。

## ICP 备案期间
- 备案未下来前，域名解析到国内服务器会被拦截 —— 可先用 `http://服务器IP` 验证站点
- 提交备案时"网站名称"填：谱吧（用途：音乐制谱工具）

## 备案通过后（开启 HTTPS）
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pu8.cn -d www.pu8.cn
```
证书自动续期；之后访问自动跳转 https://pu8.cn

## 后续（Phase 1 后端上线时）
- API 服务将部署在同机（Node.js + PostgreSQL），Nginx 增加 `/api/` 反代段
- 管理后台规划域名：admin.pu8.cn（届时增加 DNS 记录与站点配置）
