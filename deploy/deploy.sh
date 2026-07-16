#!/usr/bin/env bash
# 谱友圈 PYQ · 一键发布（在本仓库根目录执行）
# 用法：SERVER=root@1.2.3.4 ./deploy/deploy.sh
set -euo pipefail

SERVER="${SERVER:?请设置 SERVER=用户@服务器IP，例如 SERVER=root@1.2.3.4 ./deploy/deploy.sh}"
SRC="muse-tab/index.html"

echo "→ 发布 $SRC 到 $SERVER:/var/www/puyouquan/index.html"
rsync -avz --progress "$SRC" "$SERVER:/var/www/puyouquan/index.html"
rsync -avz --progress muse-tab/PYQ-FORMAT.md "$SERVER:/var/www/puyouquan/PYQ-FORMAT.md" || true
rsync -avz --progress --delete muse-tab/docs/ "$SERVER:/var/www/puyouquan/docs/" || true
rsync -avz --progress --delete muse-tab/site/ "$SERVER:/var/www/puyouquan/site/" || true
echo "✓ 完成。浏览器访问 http://puyouquan.com （或服务器 IP）验证"
