# Ubuntu 服务器部署

适用于 Ubuntu 22.04、Node.js 24 和本机两块已挂载的数据盘。容器部署仍使用仓库根目录的 compose.yaml，见 [NAS 部署](../../docs/NAS.md)。

## 目录

| 位置 | 内容 |
| --- | --- |
| /opt/gitpolar/releases/提交号 | 每次发布的程序、前端资源和运行依赖 |
| /opt/gitpolar/current | 指向当前发布的符号链接 |
| /opt/gitpolar/runtime/node | 校验 SHA-256 后安装的 Node.js 24 和飞书 CLI |
| /etc/gitpolar/gitpolar.env | 服务器配置、飞书配置和服务密钥；权限 0600 |
| /var/lib/gitpolar/gitpolar.sqlite | SSD ext4 上的账号、采购、库存数据库 |
| /var/lib/gitpolar/lark-cli | 飞书专用应用配置，不包含工作站缓存的用户令牌 |
| /mnt/hdd1/gitpolar/repositories | 第一块盘：Git bare 仓库 |
| /mnt/hdd1/gitpolar/lfs | 第一块盘：Git LFS 和 CAD 大文件 |
| /mnt/hdd1/gitpolar/procurement | 第一块盘：采购附件 |
| /mnt/hdd2/gitpolar/backups | 第二块盘：迁移快照与备份文件 |
| journalctl -u gitpolar | 服务运行日志 |
| /var/log/gitpolar | 发布记录和人工导出的诊断日志 |

repositories、lfs、procurement 通过 bind mount 映射进 /var/lib/gitpolar；管理后台仍能正常统计这些目录。数据库留在 SSD 的 ext4 分区，两个 4 TB 盘沿用现有分区。服务使用 RequiresMountsFor 依赖数据盘和 bind mount，开机时先挂载再启动。

## 首次部署

1. 安装 Git、Git LFS、curl、ca-certificates、xz-utils。下载官方 Node.js 24 Linux x64 压缩包并核对同一版本 SHASUMS256.txt，将运行时放到 /opt/gitpolar/runtime/node。
2. 在该运行时安装固定版本的飞书 CLI：/opt/gitpolar/runtime/node/bin/npm install --global @larksuite/cli@1.0.100。执行时 PATH 中应包含 /opt/gitpolar/runtime/node/bin。
3. 把已验证的发布放入 /opt/gitpolar/releases/提交号，执行 npm ci --omit=dev。发布包包含 public 中的查看器构建产物。
4. 复制 gitpolar.env.example 到 /etc/gitpolar/gitpolar.env，设置实际 APP_ORIGIN、项管 open_id 和工作区策略；文件权限 0600。把专用飞书 config.json 放入 /var/lib/gitpolar/lark-cli，目录 0700、文件 0600、归服务用户所有。详见 [飞书登录](../../docs/LOGIN.md)。
5. 两块盘已分别在 /mnt/hdd1 和 /mnt/hdd2 可读写挂载时，执行 sudo bash deploy/ubuntu/prepare-storage.sh。该脚本保留已有物理分区并配置三个数据目录的 bind mount。
6. 迁移已有数据时，使用 SQLite 在线备份或停止旧服务后复制数据库；Git 仓库用完整镜像，LFS 与附件一起复制。不要把运行中的 sqlite、wal、shm 文件分别复制成快照。保留成员、角色和仓库 ID。
7. 执行 sudo bash deploy/ubuntu/install.sh /opt/gitpolar/releases/提交号。默认服务用户 polarserver；可用 GITPOLAR_SERVICE_USER 指定实际账号。
8. 检查 systemctl status gitpolar、/api/health、/api/runtime 和 /api/config，浏览器打开 APP_ORIGIN/login/。登录方式仅为飞书。

## 更新与回退

新提交放入新的 releases 目录并安装依赖，保留配置和数据，再执行 install.sh。回退时针对原发布目录执行同一脚本。数据库有结构迁移时先保留与该发布配套的一致性备份。

运行日志用 journalctl -u gitpolar --no-pager -n 100 查看。下载、运行时缓存和临时传输文件放在用户 .cache/gitpolar 中，应用目录中不放正式配置和业务数据。
