#!/usr/bin/env bash
# 谱友圈 DB 每日备份安装器（幂等）：注册 systemd service+timer，每日 04:12 跑 VACUUM INTO 快照。
# 备份逻辑在 /opt/puyouquan/api/db-backup.js（随 api/ 部署，始终最新）。以 root/sudo 执行。
set -euo pipefail

install -d -o pyq -g pyq /var/backups/puyouquan

cat > /etc/systemd/system/pyq-backup.service <<'EOF'
[Unit]
Description=puyouquan DB daily backup (VACUUM INTO snapshot)
After=pyq-api.service

[Service]
Type=oneshot
User=pyq
EnvironmentFile=/etc/puyouquan/api.env
ExecStart=/opt/node/bin/node /opt/puyouquan/api/db-backup.js
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/backups/puyouquan /var/lib/puyouquan
EOF

cat > /etc/systemd/system/pyq-backup.timer <<'EOF'
[Unit]
Description=Run puyouquan DB backup daily at 04:12

[Timer]
OnCalendar=*-*-* 04:12:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now pyq-backup.timer
# 立即跑一次校验（失败不阻断部署，仅告警）
systemctl start pyq-backup.service && echo "DB 备份 timer 已启用，并已成功执行一次" \
  || echo "::warning::DB 备份 timer 已启用，但首次执行失败，请检查 journalctl -u pyq-backup"
