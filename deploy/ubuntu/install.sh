#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
git_version=$(git --version | awk '{print $3}')
IFS=. read -r git_major git_minor git_patch <<< "$git_version"
if (( git_major < 2 || (git_major == 2 && git_minor < 38) )); then
  echo 'Git 2.38 or newer is required for firmware merge comparison.' >&2
  exit 1
fi
/opt/gitpolar/runtime/node/bin/node -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'
release=$(realpath "${1:?Usage: sudo bash deploy/ubuntu/install.sh /opt/gitpolar/releases/COMMIT}")
service_user="${GITPOLAR_SERVICE_USER:-polarserver}"
service_group=$(id -gn "$service_user")
[[ "$service_user" =~ ^[a-z_][a-z0-9_-]*$ && "$service_group" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
[[ "$release" == /opt/gitpolar/releases/* && -f "$release/server.mjs" && -d "$release/node_modules" ]] || { echo 'Prepare a release with npm ci first.' >&2; exit 1; }
[[ -f /etc/gitpolar/gitpolar.env ]] || { echo 'Prepare /etc/gitpolar/gitpolar.env first.' >&2; exit 1; }
[[ ! -e /opt/gitpolar/current || -L /opt/gitpolar/current ]] || { echo 'current must be a symlink.' >&2; exit 1; }
/opt/gitpolar/runtime/node/bin/node --check "$release/server.mjs"
sed -e "s/@SERVICE_USER@/$service_user/g" -e "s/@SERVICE_GROUP@/$service_group/g" "$release/deploy/ubuntu/gitpolar.service" > /etc/systemd/system/gitpolar.service
ln -sfnT "$release" /opt/gitpolar/current
systemd-analyze verify /etc/systemd/system/gitpolar.service
systemctl daemon-reload
systemctl enable gitpolar.service
systemctl restart gitpolar.service
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:4317/api/health; then
    printf '
Gitpolar is running.
'
    exit 0
  fi
  sleep 2
done
journalctl -u gitpolar.service --no-pager -n 30
exit 1
