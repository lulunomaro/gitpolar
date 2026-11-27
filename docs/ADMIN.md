# NAS 管理后台与飞书登录

入口为 /admin/，主站头像菜单和导航可进入。仅项管（users.role=admin）可读管理接口。

## 管理功能

- 实例概览：版本、运行时间、账号/仓库/锁数量、实际文件长度占用、所在卷可用空间。
- 仓库：所有创建记录，包括就绪、创建中和失败记录；分支数、Git/LFS 用量、未完成 LFS 对象、克隆地址。
- 用户：飞书成员、Git 角色调整和会话/令牌撤销。正常部署没有本地密码创建或密码重置入口。
- 文件锁：全空间 LFS 锁清单，项管核对持有人后可强制释放。
- 部署与诊断：APP_ORIGIN、数据路径、容量限制、Git/LFS 版本、飞书回调和配置状态。不会返回应用密钥或令牌明文。

存储按文件长度统计，异步扫描并缓存 15 秒；刷新按钮重新扫描。Git、LFS、SQLite/WAL/SHM 和其他文件分别计量。采购附件归其他文件，预览在 Git/LFS 内计量。不能扫描的目录、符号链接会明确报告，统计不等同于压缩/去重后的物理磁盘占用。

## 飞书唯一登录

主入口 `/login/` 提供「使用飞书登录」按钮，成员在飞书官方页面用自己的账号授权。NAS 安装与配置、项管首次归属和正常成员操作见 [LOGIN.md](LOGIN.md)。以下应用凭证与回调用于网页 OAuth。

在 NAS 环境和普通 node server.mjs 启动中，只允许飞书 OAuth。POST /api/setup、POST /api/login、GitHub 授权入口/回调均拒绝。正常部署也禁止通过管理接口创建本地密码账号或重设密码。旧本地会话在增加 sessions.provider 后标记 local，不能登录新版网页。新飞书会话标记 feishu。

在 .env 配置：

- FEISHU_APP_ID / FEISHU_APP_SECRET：飞书自建应用凭证，只保存在 NAS。
- FEISHU_ALLOWED_TENANTS：允许加入的企业 tenant_key，逗号分隔；或 FEISHU_ALLOWED_OPEN_IDS：允许加入的用户应用内 open_id。
- FEISHU_ADMIN_OPEN_IDS：指定项管的应用内 open_id，逗号分隔。建议首次部署前明确设置；已有旧本地用户时也能为指定飞书身份建立项管账号。
- 回调固定为 APP_ORIGIN/auth/feishu/callback，配置在飞书应用网页授权重定向地址中。NAS 必须能访问飞书服务。

登录使用 OAuth state、PKCE 和服务端交换授权码。以飞书 open_id/tenant_key 关联稳定用户，不按显示名称授予权限。允许名单控制新成员加入；已有用户的角色由项管调整。没有用户时，第一个允许加入的身份为项管，因此上线前应先设置指定项管及精确允许名单。

Git 客户端使用飞书账号下的 gitpolar 访问令牌。Basic 认证用户名为页面所示 gitpolar 用户名，密码位置填写令牌。没有飞书关联的旧本地账号令牌在正常部署不再接受。撤销凭据同时使该用户全部会话和访问令牌失效；之后可重新通过飞书登录。

测试夹具在 NODE_ENV=test 且 AUTH_PROVIDER=local 时保留旧密码接口，用于隔离临时数据中的协议回归；生产环境即使设置 AUTH_PROVIDER=local 也不会启用密码认证。

## 升级与备份

保留 .env 和整个 DATA_DIR；更新程序后重建容器。SQLite 表和 provider 字段自动补齐，Git 历史和 LFS 对象保留。若旧部署只有本地管理员，先配置 FEISHU_ADMIN_OPEN_IDS 再升级，避免失去网页登录入口。

一致性备份需覆盖数据库、repositories、lfs、procurement/files 及部署配置。先停止容器后备份整个 NAS_DATA_DIR，或使用能保证同一时点一致性的 NAS 快照；不要只在写入期间复制一个 sqlite 主文件。

## 管理 API

| 方法与路径 | 用途 |
| --- | --- |
| GET /api/admin/overview?refresh=1 | 概览、实际用量和配置诊断 |
| GET /api/admin/repositories | 含失败记录的仓库清单 |
| GET /api/admin/users | 用户角色、飞书状态、凭据数量 |
| PATCH /api/admin/users/ID | 更新 name/role，保护最后一个可用飞书项管 |
| DELETE /api/admin/users/ID/credentials | 撤销该用户全部会话与令牌 |
| GET /api/admin/locks | 全局 LFS 锁 |
| DELETE /api/admin/locks/ID | 项管强制释放锁并发送仓库更新事件 |

所有管理 API 在未登录时返回 401，非项管返回 403；Cookie 写操作校验 APP_ORIGIN。新成员通过飞书登录加入，采购团队与职责在 /procurement/#permissions 管理。
