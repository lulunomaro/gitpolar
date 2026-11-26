# NAS 部署

## 1. 准备目录

将整个 gitpolar 项目目录复制到 NAS，例如 `/volume1/docker/gitpolar`。在这个目录执行：

```sh
cp .env.example .env
mkdir -p data
id
```

在 `.env` 中填写：

```dotenv
APP_ORIGIN=http://192.168.1.20:4317
NAS_DATA_DIR=./data
GITPOLAR_UID=1000
GITPOLAR_GID=1000
WORKSPACE_NAME=polar-lab
PORT=4317
```

IP 替换为 NAS 的实际地址。UID/GID 替换为拥有数据目录的 NAS 用户和组的数值，不要直接照抄示例。让该用户能写数据目录，例如使用 NAS 的文件权限界面设置，或由管理员执行：

```sh
chown -R YOUR_UID:YOUR_GID data
```

`NAS_DATA_DIR` 是 NAS 上的宿主目录；容器内固定挂载为 `/data`。仓库对象、SQLite 和 LFS 对象全部保存在这里。选择 NAS 自身的本地文件系统，避免把数据库放在另一台设备的 SMB/NFS 挂载上。

## 2. 启动

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gitpolar
```

也可把目录作为 Synology Container Manager / 其他 NAS 容器工具的 Compose 项目导入。镜像基于官方 `node:24-bookworm-slim`，安装 Git 和 Git LFS；构建时需要下载基础镜像、Debian 软件包和 package-lock.json 固定的 npm 依赖。

先按 [扫码登录说明](LOGIN.md) 配置 NAS 的专用飞书 CLI 应用；已有配置无需重复初始化。浏览器打开 `APP_ORIGIN/login/`，点击生成二维码并用飞书确认。也可显式配置允许租户/用户与 `FEISHU_ADMIN_OPEN_IDS`；项管从 `/admin/` 管理成员角色和 NAS 状态，从 `/procurement/#permissions` 分配采购职责。成员自行生成 Git 访问令牌。请先使用一个小型仓库完成 clone / push，再迁入正式项目。

## 3. NAS 反向代理

如果 NAS 已有 HTTPS 反向代理，把外部站点代理到容器发布的 `4317` 端口。将 `APP_ORIGIN` 改为浏览器与 Git 客户端真正使用的 HTTPS 源地址，不带子路径；然后重建容器：

```sh
docker compose up -d
```

HTTP Git 的用户名/令牌会作为认证信息传输；给团队长期使用时建议通过 NAS 的 HTTPS 反向代理访问。

代理需允许大请求体、长时间上传，并关闭 SSE 路径的缓冲。Nginx 站点中的相关设置示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:4317;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    client_max_body_size 0;
}
```

LFS 单对象上限由 `LFS_MAX_BYTES` 控制，默认 20 GiB。Git pack 与 LFS 上传均以流式处理，不会将整个上传放入 Node 内存。反向代理和 NAS 剩余空间仍需能容纳目标文件。

## 4. 已有项目导入

先在网页创建仓库，取消 README 初始化和 CAD 模板，保留为空。然后在原本地项目中执行：

```sh
git remote add nas http://NAS_IP:4317/polar-lab/PROJECT.git
# 使用过 LFS 的项目，先确保本机拿到了需要迁移的 LFS 内容：
git lfs fetch --all origin
git lfs push --all nas
git push nas --all
git push nas --tags
```

没有使用 LFS 的项目跳过两条 LFS 命令。不要只复制 `.git` 而遗漏原服务的 LFS 文件。给已有 Git 历史添加 LFS 规则不会自动迁移过去的版本；本版不会自动改写历史。

## 5. 备份和恢复

数据目录结构：

```text
data/
  gitpolar.sqlite         用户、会话、令牌摘要、仓库目录、议题、LFS 锁
  gitpolar.sqlite-wal     SQLite 的活动日志（可能存在）
  repositories/
    polar-lab/PROJECT.git/
  lfs/
    REPOSITORY_ID/aa/bb/SHA256
  procurement/files/      采购与发加工 STEP/DWG 原始附件
  lark-cli/               NAS 专用飞书 CLI 应用与授权配置（敏感，需备份）
  lark-cli-login/         本机网页登录的隔离 CLI 配置（如未显式指定目录）
  tmp/                    网页提交使用的临时 index
```

对本版本最直接的一致性备份方式是先停止容器，再备份整个 `NAS_DATA_DIR` 及 `.env`，然后启动容器。也可使用能保证数据库/仓库/LFS 同一时点的 NAS 快照。

```sh
docker compose stop
# 使用 NAS 备份工具备份 data/ 和 .env
docker compose start
```

恢复时把数据库、bare 仓库和 LFS 目录作为一组恢复，并设置相同工作区名及正确目录权限。只备份 Git 仓库不能代替 LFS 和账号数据库的备份。升级代码后启动服务会更新本服务管理的 pre-receive hook 路径。

## 验证范围

本项目在 Windows 上使用真实 Git / Git LFS 客户端完成端到端测试，并检查了 Compose 配置。NAS 上的 Docker 构建和实际设备运行需要在目标 NAS 验证；本开发机没有运行 Docker daemon，因此没有把 Compose 配置检查表述为容器运行成功。

## SolidWorks 功能升级

保留 `.env` 与整个 NAS 数据目录，替换程序文件后执行 `docker compose up -d --build`。此版本增加的 CAD 清单、网页锁、历史与完整 ZIP 使用原有仓库/LFS/SQLite 数据，不需要重新初始化管理员或迁移仓库。

导出 ZIP 会流式读取 NAS 磁盘中的原文件，请为下载时的磁盘读取与局域网带宽预留资源。现有仓库若没有模板规则，参考 SolidWorks 指南配置 LFS；程序升级不会改写原有 Git 历史。

三维预览资源已在 `public/` 内随项目发布，NAS 不需要安装 SolidWorks。原生文件的预览在 Windows 工作站用辅助脚本导出后提交，NAS 提供版本匹配与文件服务。默认 `PREVIEW_MAX_BYTES=134217728`，仅限制网页预览，不限制 Git/LFS 存储。修改查看器源码后，先执行 `npm ci`、`npm run build:viewer`，再重新构建镜像。


## 0.7.0 管理与采购

网页登录只允许飞书；使用 CLI 扫码主入口或配置备用网页 OAuth。升级旧本地账号部署前，确认已有 CLI 操作者或已指定飞书项管。管理及账号说明见 [ADMIN.md](ADMIN.md)，采购/库存和飞书字段配置见 [PROCUREMENT.md](PROCUREMENT.md)。采购表自动加入 SQLite，附件在同一 DATA_DIR 中，备份时一起保留。未填写真实飞书仓库配置时，本地审批与入库仍持久化，外部同步显示待配置。
