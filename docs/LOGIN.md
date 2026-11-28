# 使用飞书登录

在站点首页点击「使用飞书登录」。NAS 使用 CLI 设备授权时，电脑会显示本次登录的二维码。用手机飞书扫一扫，选择本人的团队身份并确认授权，电脑上的原页面会自动回到站点首页，显示该账号的个人工作台。在手机上访问站点时，也可以点击「在本机打开飞书授权页」。

如果飞书提示「没有某应用的使用权限」，请检查当前选择的身份和飞书开放平台中应用的可用范围。应用管理员可向符合条件的成员开放应用。服务于不同组织的站点需要使用对目标身份开放的登录应用。

## NAS 个人工作台与文件

启用 `FEISHU_PERSONAL_WORKSPACES=true` 后，首次通过飞书验证的账号会获得独立工作台。再次用同一身份登录即可取回文件。团队成员名单控制团队仓库、采购和管理功能，其他已验证的账号可以使用自己的文件区。

`WORKSPACE_FILES_DIR` 指向预先在机械盘上建立的根目录，站点在其下按内部用户 ID 创建独立目录。单文件及文件夹上传直接流式写入该目录，保留项目相对路径。同名文件经用户确认后替换。`DATA_DIR` 中的 SQLite 数据库、会话和文件索引可以放在 SSD。服务启动时应依赖机械盘挂载，反向代理应关闭请求体和响应缓冲。

## 本机已安装 CLI

本次按请求运行 npx @larksuite/cli@latest install，并核验已安装的 lark-cli 为 1.0.100。已有应用配置时，网页会自动检测，无需成员填写 App ID、App Secret 或回调地址。

程序会为每次网页登录将选中的 CLI 应用配置复制到 DATA_DIR/lark-cli-login/flow-* 独立目录，清空用户列表，不复制历史用户令牌。包括显式指定的 NAS CLI 配置在内，源配置只读；授权过程不切换源配置的活动用户。二维码、授权缓存和独立目录在完成、失败、取消或过期后回收。授权完成后仍核对本次返回的 open_id 与实时 user_info，再生成 gitpolar 的飞书会话。

本机未显式指定 NAS 配置目录、没有允许名单或指定项管且尚无飞书项管时，原个人 CLI 配置中已登记的操作者扫码，可建立项管账号并记录经验证的租户。同一租户的后续成员可加入，再由项管分配职责。

显式 NAS 配置（FEISHU_CLI_CONFIG_DIR 或 LARKSUITE_CLI_CONFIG_DIR）必须通过 FEISHU_ADMIN_OPEN_IDS 指定首任项管；历史缓存用户不能作为任命依据。仅列入允许租户/成员名单的普通成员首次登录为 writer，不因成为第一个用户自动获得项管权限。有显式策略时按该策略执行。

## NAS 首次准备（仅管理员一次）

Docker 镜像已安装固定版本 @larksuite/cli@1.0.100，CLI 配置持久化在 /data/lark-cli。首次使用专用 NAS 应用时，在项目目录运行：

    docker compose exec gitpolar lark-cli config init --new

按终端提示，用飞书扫码完成该 NAS 应用的配置。已有配置时不用重复创建应用。之后普通成员从网页扫码，不需要进入终端。安装入口也可使用：

    npx @larksuite/cli@latest install

本机非 Docker 部署可用 FEISHU_CLI_BIN 指定 CLI 可执行文件，用 FEISHU_CLI_PROFILE 指定应用配置。NAS 的 LARKSUITE_CLI_CONFIG_DIR 固定在持久数据卷；不要把正式应用配置或令牌提交到 Git。

## 网页 OAuth

在战队的飞书开放平台创建或选用专供 `gitpolar` 登录的自建应用，在「安全设置」中登记 `APP_ORIGIN/auth/feishu/callback`。将应用发布给要登录的队员。gitpolar 用授权码交换用户令牌并读取本人基本身份，登录流程只使用本次令牌。

Ubuntu NAS 支持扫码创建专用应用。首次在部署目录 `deploy/ubuntu/feishu-registration` 下运行 `npm ci --omit=dev --ignore-scripts`。管理员运行以下命令，然后用战队身份在飞书确认创建 `gitpolar`。NAS 会接收应用凭证，并暂存在只有 root 可读的文件中。

```sh
sudo python3 /opt/gitpolar/current/deploy/ubuntu/configure-feishu-login.py --register
```

把命令显示的回调地址登记到新应用的「安全设置」，将应用发布给战队成员，然后运行 `sudo python3 /opt/gitpolar/current/deploy/ubuntu/configure-feishu-login.py --activate-registered`。NAS 会校验凭证、重启服务并检查授权跳转。`--check` 可查看回调地址和当前登录方式。已有专用应用也可直接运行脚本，在 SSH 中按提示输入 App ID 和 App Secret。

把该应用的 `FEISHU_LOGIN_APP_ID` 和 `FEISHU_LOGIN_APP_SECRET` 配置在 NAS 私有环境文件中，重启服务。二者填写完整后，登录按钮会进入飞书官方授权页面。配置其中任一项即选定网页登录，填写不完整时，登录页会提示管理员补全。库存同步单独使用 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。

切换已有成员的网站前先核对账号映射。飞书 `open_id` 随应用变化，项管名单、已有账号、仓库和个人空间需要关联回原先的 gitpolar 用户 ID。双方属于同一应用开发者时，系统使用飞书核验的同一租户 `union_id` 关联已有账号。建议在切换前用原账号登录一次，使站点记录该标识。

## 接口与部署

- GET /api/feishu-cli/status：检测 CLI 及应用配置，不触发登录。
- POST /api/feishu-cli/start：建立该浏览器专属的设备授权，返回飞书官方授权链接和兼容的二维码地址。
- GET /api/feishu-cli/qr?id=...：返回该浏览器绑定的二维码。
- GET /api/feishu-cli/poll?id=...：等待扫码，完成后签发一次飞书会话。首个响应丢失时，在本流程有效期内可给原浏览器补发同一有效会话，不创建第二个会话；注销后不能重新取回。
- POST /api/feishu-cli/cancel?id=...：取消本次扫码并回收子进程。

同一 NAS 支持多个浏览器同时扫码登录；每次授权使用独立 CLI 配置目录、二维码和浏览器绑定，取消或过期仅结束对应流程。一个未完成的扫码不会阻塞其他成员。CLI 缓存用户不能用作本次网页登录的身份回退。

代码更新后需要重启后端。只更新静态 JS 无法让旧进程加载新的 /login/ 路由和接口。在原终端停止后重新执行 npm start，或在 NAS 重建容器。重启后检查 /api/health 和 /api/feishu-cli/status，再从 `/login/` 发起授权。

CLI 的 api 命令返回 {ok:true, identity:"user", data}，原始 OpenAPI 返回 {code:0, data}，后端兼容这两种格式。仍会核对本次授权返回的 open_id 与 user_info 完全一致，不使用历史缓存用户签发会话。

扫码失败时，poll 接口返回安全的 errorCode 和中文说明：feishu_authorization_failed（授权未完成）、feishu_identity_failed（身份校验失败）、feishu_workspace_denied（未获准加入工作区）、feishu_account_failed（账号创建失败）。这些响应不包含令牌、设备码或 CLI 原始输出。

GET /api/runtime 可核对运行中的构建和启动时间；updateAvailable 为 true 或旧后端返回 404 时，登录页明确提示先重启服务。管理后台“部署与诊断”也显示该状态。
