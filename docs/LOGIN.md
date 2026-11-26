# 飞书扫码怎么登录

普通成员打开 /login/，只需要三步：

1. 点击「生成飞书登录二维码」。
2. 用手机飞书扫描页面里的二维码，确认授权；也可以点击二维码旁的飞书授权链接。
3. 保持页面打开。确认后会自动进入原本要访问的仓库、采购或管理页面。

页面显示有效期和扫码状态；过期后点「重新生成二维码」。不要把二维码转发给别人代扫，扫码确认的飞书身份就是本次登录的身份。

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

## 网页 OAuth 备用方式

飞书网页 OAuth 仍为同一种身份提供方的备用通道，配置 FEISHU_APP_ID、FEISHU_APP_SECRET 和回调后，在 CLI 未安装时可以使用。默认主入口是 CLI 扫码。本地密码和 GitHub 均不作为登录方式。

## 接口与部署

- GET /api/feishu-cli/status：检测 CLI 及应用配置，不触发登录。
- POST /api/feishu-cli/start：生成这次浏览器专属二维码；设备码仅保存在服务端。
- GET /api/feishu-cli/qr?id=...：返回该浏览器绑定的二维码。
- GET /api/feishu-cli/poll?id=...：等待扫码，完成后签发一次飞书会话。首个响应丢失时，在本流程有效期内可给原浏览器补发同一有效会话，不创建第二个会话；注销后不能重新取回。
- POST /api/feishu-cli/cancel?id=...：取消本次扫码并回收子进程。

同一 NAS 的 CLI 授权串行执行，其他成员正在扫码时页面会提示稍后重试；已经登录的成员不受影响。CLI 缓存用户不能用作本次网页登录的身份回退。

代码更新后需要重启后端。只更新静态 JS 无法让旧进程加载新的 /login/ 路由和接口。在原终端停止后重新执行 npm start，或在 NAS 重建容器。重启后检查 /api/health 和 /api/feishu-cli/status，再从 /login/ 重新扫码。

CLI 的 api 命令返回 {ok:true, identity:"user", data}，原始 OpenAPI 返回 {code:0, data}，后端兼容这两种格式。仍会核对本次授权返回的 open_id 与 user_info 完全一致，不使用历史缓存用户签发会话。

扫码失败时，poll 接口返回安全的 errorCode 和中文说明：feishu_authorization_failed（授权未完成）、feishu_identity_failed（身份校验失败）、feishu_workspace_denied（未获准加入工作区）、feishu_account_failed（账号创建失败）。这些响应不包含令牌、设备码或 CLI 原始输出。

GET /api/runtime 可核对运行中的构建和启动时间；updateAvailable 为 true 或旧后端返回 404 时，登录页明确提示先重启服务。管理后台“部署与诊断”也显示该状态。
