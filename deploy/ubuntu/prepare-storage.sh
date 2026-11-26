#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
service_user="${GITPOLAR_SERVICE_USER:-polarserver}"
service_group=$(id -gn "$service_user")
for disk in /mnt/hdd1 /mnt/hdd2; do
  mountpoint -q "$disk" || { echo "Disk is not mounted: $disk" >&2; exit 1; }
  options=$(findmnt -n -M "$disk" -o OPTIONS)
  [[ ",$options," == *,rw,* ]] || { echo "Disk is not writable: $disk" >&2; exit 1; }
done
install -d -m 0750 -o "$service_user" -g "$service_group" /var/lib/gitpolar /var/log/gitpolar
mkdir -p /mnt/hdd1/gitpolar /mnt/hdd2/gitpolar/backups
cp --preserve=mode,ownership,timestamps --backup=numbered /etc/fstab /etc/fstab.gitpolar-storage.bak
for category in repositories lfs procurement; do
  source="/mnt/hdd1/gitpolar/$category"
  target="/var/lib/gitpolar/$category"
  mkdir -p "$source" "$target"
  if ! mountpoint -q "$target"; then
    [[ -z $(find "$target" -mindepth 1 -maxdepth 1 -print -quit) ]] || { echo "Target contains existing files: $target" >&2; exit 1; }
    mount --bind "$source" "$target"
  fi
  if ! awk -v t="$target" '$1 !~ /^#/ && $2 == t { found=1 } END { exit !found }' /etc/fstab; then
    printf '%s %s none bind,nofail,x-systemd.requires-mounts-for=/mnt/hdd1 0 0
' "$source" "$target" >> /etc/fstab
  fi
done
systemctl daemon-reload
findmnt --mountpoint /var/lib/gitpolar/repositories
findmnt --mountpoint /var/lib/gitpolar/lfs
findmnt --mountpoint /var/lib/gitpolar/procurement
