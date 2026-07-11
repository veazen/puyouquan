#!/usr/bin/env bash
# 谱吧 PU8 · 一键发布（在本仓库根目录执行）
# 用法：SERVER=root@1.2.3.4 ./deploy/deploy.sh
set -euo pipefail

SERVER="${SERVER:?请设置 SERVER=用户@服务器IP，例如 SERVER=root@1.2.3.4 ./deploy/deploy.sh}"
SRC="muse-tab/index.html"

echo "→ 发布 $SRC 到 $SERVER:/var/www/pu8/index.html"
rsync -avz --progress "$SRC" "$SERVER:/var/www/pu8/index.html"
rsync -avz --progress muse-tab/PU8-FORMAT.md "$SERVER:/var/www/pu8/PU8-FORMAT.md" || true
echo "✓ 完成。浏览器访问 http://pu8.cn （或服务器 IP）验证"
