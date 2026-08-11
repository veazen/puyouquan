#!/usr/bin/env bash
# 服务器侧产品落位（原子 + 幂等），由 deploy.yml「发布产品文件」步骤调用。
# 参数 $1 = 缓存版本 token（通常取 commit 短 sha）。
# 预置于 /tmp：pyq_pub_index.html、pyq_pub_site/（整目录）、pyq_pub_fmt.md（可选）。
set -euo pipefail
V="${1:?需传缓存版本 token}"
ROOT="${ROOT:-/var/www/puyouquan}"
TMP="${PUBTMP:-/tmp}"
mkdir -p "$ROOT/site" "$ROOT/docs"

# 1) 官网静态资源引用追加 ?v=<token> 破缓存——防「新 HTML 配旧 pyq.js/css 打新 API」错乱。
#    每次部署 token 变 → 引用变 → 浏览器强制取新文件；HTML 本身发版即取新（见 nginx no-cache）。
find $TMP/pyq_pub_site -name '*.html' -exec \
  sed -i "s/pyq\.css\"/pyq.css?v=$V\"/g; s/pyq\.js\"/pyq.js?v=$V\"/g" {} +

# 2) index.html 原子落位：先写同盘 .staging，再 mv -T 原子替换（消除 2MB 拷贝窗口内被读到截断页）；
#    替换前留上一版 index.html.prev —— 回滚即 `mv -f index.html.prev index.html`（秒级）。
cp $TMP/pyq_pub_index.html "$ROOT/index.html.staging"
[ -f "$ROOT/index.html" ] && cp -a "$ROOT/index.html" "$ROOT/index.html.prev" || true
mv -Tf "$ROOT/index.html.staging" "$ROOT/index.html"
rm -f $TMP/pyq_pub_index.html

# 3) site 用 rsync --delete 落位——清理已删除的孤儿文件（原 cp -r 会永久残留旧文件）。
rsync -a --delete $TMP/pyq_pub_site/ "$ROOT/site/"
rm -rf $TMP/pyq_pub_site

# 4) 微信域名校验文件同步到 zhipu 根：JS接口安全域名/小程序业务域名校验要求文件在各域名根可访问；
#    www/puku 根=$ROOT/site（rsync 已覆盖），zhipu 根=$ROOT——把 site 下根级 txt（除 robots.txt）复制一份。
for f in "$ROOT/site/"*.txt; do
  [ -f "$f" ] || continue
  b="$(basename "$f")"
  [ "$b" = "robots.txt" ] || cp -f "$f" "$ROOT/$b"
done

# 5) PYQ-FORMAT.md（可选）
[ -f $TMP/pyq_pub_fmt.md ] && mv $TMP/pyq_pub_fmt.md "$ROOT/PYQ-FORMAT.md" || true

echo "产品落位完成（缓存 token=$V；已保留 index.html.prev 供回滚）"
