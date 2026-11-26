# 飞书扫码怎么登录

普通成员打开 /login/，只需要三步：

1. 点击「生成飞书登录二维码」。
2. 用手机飞书扫描页面里的二维码，确认授权；也可以点击二维码旁的飞书授权链接。
3. 保持页面打开。确认后会自动进入原本要访问的仓库、采购或管理页面。

页面显示有效期和扫码状态；过期后点「重新生成二维码」。不要把二维码转发给别人代扫，扫码确认的飞书身份就是本次登录的身份。

## 本机已安装 CLI

本次按请求运行 npx @larksuite/cli@latest install，并核验已安装的 lark-cli 为 1.0.100。已有应用配置时，网页会自动检测，无需成员填写 App ID、App Secret 或回调地址。

程序会为网页登录复制选中的 CLI 应用配置到 DATA_DIR/lark-cli-login，清空复制配置中的旧用户列表，不复制个人用户令牌，也不切换原个人 CLI 的活动配置。每次二维码授权完成后核对这次返回的 open_id 与 user_info，再生成 gitpolar 的飞书会话。

若没有显式的飞书允许名单、指定项管，且还没有飞书项管，首次从原 CLI 配置中已登记的操作者身份扫码，可以建立项管账号，并记录其经验证的租户。同一租户的后续成员可加入，再由项管分配职责。有显式允许名单时按允许名单执行。不会把任意第一个扫描者提为项管。

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
- GET /api/feishu-cli/poll?id=...：等待扫码，完成后签发一次飞书会话。
- POST /api/feishu-cli/cancel?id=...：取消本次扫码并回收子进程。

同一 NAS 的 CLI 授权串行执行，其他成员正在扫码时页面会提示稍后重试；已经登录的成员不受影响。CLI 缓存用户不能用作本次网页登录的身份回退。

代码更新后需要重启后端。只更新静态 JS 无法让旧进程加载新的 /login/ 路由和接口。当前开发机上停止旧 4317 进程及另启 4318 新版服务都被自动审批拒绝（blocked by policy），旧进程未被替换。须由运行服务的人在原终端停止后重新执行 npm start，或在 NAS 重建容器。
