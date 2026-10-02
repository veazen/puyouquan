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
# ---- 微信公众号·JS-SDK 分享卡（v55.3；两项配齐 /api/wx/jssign 才生效，缺省 503 前端回退默认卡）----
# 公众号后台「基本配置」的 AppID/AppSecret（与上面开放平台网站应用是两套凭据）；服务器 IP 须加入公众号 IP 白名单。
WX_MP_APPID=
WX_MP_SECRET=
# ---- 微信小程序·静默登录（v60.1；两项配齐 /api/wx/mini/login 才生效，缺省 503，小程序自动回落不登录看谱）----
# 小程序后台「开发管理 → 开发设置」的 AppID/AppSecret（与上面两套都不同，这是第三套）。
# 小程序后台另需配：业务域名（web-view 能开的网页）+ request 合法域名（wx.request 能调的接口，填 https://www.puyouquan.com）。
# 要与网页微信登录并成同一账号，须把小程序绑到与网站应用/公众号同一个开放平台账号（才返回 unionid）。
WX_MINI_APPID=
WX_MINI_SECRET=
# ---- 微信支付 APIv3·Native（v45.4；五项配齐 + 私钥文件就位才启用，缺任一项支付停用不影响其他功能）----
# 商户平台下载的 apiclient_key.pem 放到 WXPAY_KEY_PATH（chmod 600, chown pyq）；
# WXPAY_SERIAL=商户 API 证书序列号；WXPAY_APIV3_KEY=32 位 APIv3 密钥；
# WXPAY_APPID 缺省复用 WX_WEB_APPID（须为商户号已绑定的 appid）。改完 systemctl restart pyq-api。
WXPAY_MCHID=
WXPAY_APPID=
WXPAY_SERIAL=
WXPAY_APIV3_KEY=
WXPAY_KEY_PATH=/etc/puyouquan/wxpay_key.pem
WXPAY_NOTIFY_URL=https://www.puyouquan.com/api/pay/notify
# v62.7 异地备份（可选，留空＝只存本盘）：S3 兼容对象存储（腾讯云 COS / 阿里云 OSS 的 S3 兼容端点）。
# 建议用子账号密钥、只授权该桶 pyq-db/ 前缀的读写删。填好后 systemctl start pyq-backup 验证，
# 恢复演练见 api/db-restore-s3.js 文件头。
BACKUP_S3_ENDPOINT=
BACKUP_S3_BUCKET=
BACKUP_S3_REGION=
BACKUP_S3_KEY=
BACKUP_S3_SECRET=
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
# snippet 内容取自仓库 deploy/pyq-api.conf（含 /api 反代 + 安全响应头），setup 步骤已 scp 到 /tmp
cp /tmp/pyq-api.conf /etc/nginx/snippets/pyq-api.conf
# v62.6 A1d：安全响应头单独成片（pyq-api.conf 与自带 add_header 的 location 共同 include）+ http 层限流区
cp /tmp/pyq-headers.conf /etc/nginx/snippets/pyq-headers.conf
cp /tmp/pyq-ratelimit.conf /etc/nginx/conf.d/00-pyq-ratelimit.conf
if ! grep -q 'snippets/pyq-api.conf' /etc/nginx/conf.d/pu8.conf; then
  sed -i 's|^server {|server {\n    include snippets/pyq-api.conf;|' /etc/nginx/conf.d/pu8.conf
fi
# 注意分两行写：set -e 对 `A && B` 中 A 的失败不生效（bash 语义，见 server-setup.sh 同注释）
nginx -t
systemctl reload nginx

echo "API 初始化完成（服务将在代码部署后启动）"
