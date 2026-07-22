#!/usr/bin/env bash
# 谱友圈 PYQ · 服务器初始化（Ubuntu 22.04/24.04，以 root 或 sudo 运行一次）
set -euo pipefail

apt-get update
apt-get install -y nginx rsync

# 站点目录
mkdir -p /var/www/puyouquan
chown -R www-data:www-data /var/www/puyouquan

# 站点配置（移除发行版默认站点，避免与 default_server 冲突/抢占 IP 访问）
rm -f /etc/nginx/sites-enabled/default
# certbot 签发 HTTPS 后会直接改写 pu8.conf（追加 443 段与 80 跳转），
# 此时不再用仓库模板覆盖，避免抹掉证书配置；模板有变更需登录服务器手动合并。
if grep -q 'managed by Certbot' /etc/nginx/conf.d/pu8.conf 2>/dev/null; then
  echo "检测到 certbot 管理的 nginx 配置，跳过模板覆盖（保留 HTTPS 设置）"
else
  cp "$(dirname "$0")/nginx-puyouquan.conf" /etc/nginx/conf.d/pu8.conf
fi
# 注意分两行写：set -e 对 `A && B` 中 A 的失败不生效（bash 语义），
# 曾导致 nginx -t 失败被静默吞掉、reload 未执行而流水线仍显示成功
nginx -t
systemctl reload nginx
systemctl enable nginx

echo "==============================================="
echo "初始化完成。接下来："
echo "1) 云控制台防火墙放行 80/443 端口"
echo "2) 域名 DNS：puyouquan.com 与 www 记录 A → 本机公网 IP"
echo "3) 执行 deploy.sh 上传站点文件"
echo "4) ICP 备案通过后签发 HTTPS："
echo "   apt-get install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d puyouquan.com -d www.puyouquan.com"
echo "==============================================="
