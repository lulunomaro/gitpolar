# Ubuntu 服务器部署

适用于 Ubuntu 22.04、Git 2.38 及以上、Node.js 24 和本机两块已挂载的数据盘。容器部署仍使用仓库根目录的 compose.yaml，见 [NAS 部署](../../docs/NAS.md)。

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

1. 安装 Git 2.38 及以上、Git LFS、curl、ca-certificates、xz-utils。Ubuntu 22.04 自带 Git 2.34，需要按 [Git 官方 Linux 安装说明](https://git-scm.com/install/linux) 使用 ppa:git-core/ppa 升级；固件比较与合并依赖 merge-tree --write-tree，安装脚本会检查版本。下载官方 Node.js 24 Linux x64 压缩包并核对同一版本 SHASUMS256.txt，将运行时放到 /opt/gitpolar/runtime/node。
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

## 局域网域名（sslip.io）

当前服务器使用 `http://gitpolar.10-24-4-208.sslip.io` 作为团队入口。sslip.io 将域名中的 IP 解析为 10.24.4.208，浏览器和 Git 客户端直接访问局域网服务器；公网服务器不参与文件传输。客户端仍需能连通这个内网 IP。

同一地址迁移部署时，安装 Nginx，将本目录 gitpolar.nginx.conf 复制到 /etc/nginx/sites-available/gitpolar，并在 sites-enabled 下创建符号链接。首次安装 Nginx 时移除发行版默认站点的启用链接，再执行 nginx -t 和 systemctl reload nginx。该配置监听 80 端口，代理本机 4317，允许大请求体并关闭请求和响应缓冲；裸 IP 的 80 端口请求会以 308 跳转到正式域名。

将 /etc/gitpolar/gitpolar.env 中的 APP_ORIGIN 设置为：

```dotenv
APP_ORIGIN=http://gitpolar.10-24-4-208.sslip.io
```

先确认客户端能解析、访问新域名，再重启 gitpolar.service。从新域名重新使用飞书扫码登录；旧 IP 的浏览器 Cookie 不会迁移到新域名。网页登录仍只使用飞书 CLI 扫码，备用 OAuth 未启用时不需要配置回调。已有 Git 工作区通过 git remote set-url origin 更新到新域名，仓库相对路径保持原值。

客户端使用 Clash/Mihomo 的 fake-ip 模式时，可在其全局合并配置中加入以下规则。若已有 hosts、dns 或 tun 字段，应合并条目并保留其他设置：

```yaml
hosts:
  gitpolar.10-24-4-208.sslip.io: 10.24.4.208
dns:
  use-hosts: true
tun:
  route-exclude-address:
    - 10.24.4.208/32
```

配置后校验 DNS 返回 10.24.4.208，访问 /api/session 检查 origin 为新域名，并检查登录二维码、Git/LFS 鉴权、采购和管理页面。这里使用 HTTP；更换服务器 IP 时，同步更新域名、Nginx 的 server_name/跳转地址、APP_ORIGIN 和客户端代理规则。
