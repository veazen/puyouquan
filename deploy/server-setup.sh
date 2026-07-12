#!/usr/bin/env bash
# 谱友圈 PYQ · 服务器初始化（Ubuntu 22.04/24.04，以 root 或 sudo 运行一次）
set -euo pipefail

apt-get update
apt-get install -y nginx rsync

# 站点目录
mkdir -p /var/www/puyouquan
chown -R www-data:www-data /var/www/puyouquan

# 站点配置
cp "$(dirname "$0")/nginx-puyouquan.conf" /etc/nginx/conf.d/pu8.conf
nginx -t && systemctl reload nginx
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
