#!/usr/bin/env bash
# 谱友圈 API · 服务器初始化（Node 24 运行时 + systemd 服务 + nginx /api/ 反代）
# 以 root（或 sudo）执行；幂等，可重复运行。API 代码文件由部署流水线另行 rsync 到 /opt/puyouquan/api。
set -euo pipefail

# 1) Node 24 运行时（优先 npmmirror 境内镜像，失败回退官方源；已装则跳过）
if [ ! -x /opt/node/bin/node ]; then
  cd /tmp
  SHAS=$(curl -fsSL --connect-timeout 8 --max-time 30 https://cdn.npmmirror.com/binaries/node/latest-v24.x/SHASUMS256.txt \
      || curl -fsSL --connect-timeout 8 --max-time 30 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt)
  TAR=$(echo "$SHAS" | grep -oE 'node-v24[0-9.]+-linux-x64\.tar\.xz' | head -1)
  [ -n "$TAR" ] || { echo "无法确定 Node 24 版本文件名"; exit 1; }
  curl -fsSL --max-time 300 -o "$TAR" "https://cdn.npmmirror.com/binaries/node/latest-v24.x/$TAR" \
    || curl -fsSL --max-time 300 -o "$TAR" "https://nodejs.org/dist/latest-v24.x/$TAR"
  mkdir -p /opt/node
  tar -xJf "$TAR" -C /opt/node --strip-components=1
  rm -f "$TAR"
fi
echo "Node 运行时：$(/opt/node/bin/node --version)"

# 2) 服务账号与目录
id -u pyq >/dev/null 2>&1 || useradd --system --home /opt/puyouquan --shell /usr/sbin/nologin pyq
mkdir -p /opt/puyouquan/api /var/lib/puyouquan
chown -R pyq:pyq /var/lib/puyouquan

# 3) 环境文件（仅首次生成；阿里云短信参数过审后填入，再 systemctl restart pyq-api）
if [ ! -f /etc/puyouquan/api.env ]; then
  mkdir -p /etc/puyouquan
  cat > /etc/puyouquan/api.env <<EOF
PORT=3127
DB_PATH=/var/lib/puyouquan/pyq.db
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_DOMAIN=.puyouquan.com
# ---- 阿里云短信（控制台申请签名/模板通过后填写）----
ALIYUN_AK_ID=
ALIYUN_AK_SECRET=
SMS_SIGN=谱友圈
SMS_TEMPLATE=
# ---- 微信开放平台·网站应用扫码登录（可选；填了才显示微信登录入口）----
# 授权回调域＝账号中枢主域 www.puyouquan.com（回调只是内部中转：设跨域 Cookie 后 302 弹回原页，
# 三站共享登录态）。开放平台「授权回调域」填 www.puyouquan.com，须与下方 WX_WEB_REDIRECT 的 host 字面一致。
WX_WEB_APPID=
WX_WEB_SECRET=
WX_WEB_REDIRECT=https://www.puyouquan.com/api/wx/web/callback
EOF
  chmod 600 /etc/puyouquan/api.env
  echo "已生成 /etc/puyouquan/api.env（短信参数待填写）"
fi

# 4) systemd 服务（仅注册；首次启动由部署步骤在代码就位后执行）
cat > /etc/systemd/system/pyq-api.service <<'EOF'
[Unit]
Description=puyouquan API (pyq-api)
After=network.target

[Service]
User=pyq
WorkingDirectory=/opt/puyouquan/api
EnvironmentFile=/etc/puyouquan/api.env
ExecStart=/opt/node/bin/node server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/puyouquan

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pyq-api

# 5) nginx /api/ 反代：写 snippet + 幂等注入 pu8.conf 各 server 块（兼容 certbot 管理的配置，
#    只插入一行 include，不覆盖任何既有内容）
mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/pyq-api.conf <<'EOF'
location /api/ {
    proxy_pass http://127.0.0.1:3127;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 30s;
    client_max_body_size 4m;
}
EOF
if ! grep -q 'snippets/pyq-api.conf' /etc/nginx/conf.d/pu8.conf; then
  sed -i 's|^server {|server {\n    include snippets/pyq-api.conf;|' /etc/nginx/conf.d/pu8.conf
fi
# 注意分两行写：set -e 对 `A && B` 中 A 的失败不生效（bash 语义，见 server-setup.sh 同注释）
nginx -t
systemctl reload nginx

echo "API 初始化完成（服务将在代码部署后启动）"
