# gitpolar · NAS Git 服务

gitpolar 现在使用真实后端：Git 官方 `git-http-backend` 提供 Smart HTTP，仓库以标准 bare repository 保存；账号、令牌、议题与锁信息使用 SQLite；SolidWorks 等大文件通过 Git LFS 存储。网页会在 Git push 后自动刷新提交、分支和文件。

## 本机运行

需要 Node.js 24+ 和 Git。CAD 客户端还需安装 Git LFS。

```powershell
cd lan-git
Copy-Item .env.example .env
npm ci
node server.mjs
```

打开 `.env` 中的 `APP_ORIGIN` 地址。首次进入时点击 **Initialize gitpolar** 创建管理员；后续成员在右上角头像 → **Manage users** 创建。`APP_ORIGIN` 必须填写团队实际使用的地址，例如 `http://192.168.1.20:4317`，不要在给队友使用时仍填写 `127.0.0.1`。

完整工程 ZIP 使用固定版本的 yazl，三维预览使用本地 Three.js 和 OCCT WebAssembly 资源；本机首次启动前执行 `npm ci`。运行 `npm test` 会启动独立临时服务，并使用真实 Git / Git LFS 客户端执行集成测试，不会修改正式数据目录。

## NAS 部署

项目包含 `Dockerfile` 与 `compose.yaml`。详细步骤见 [NAS 部署说明](docs/NAS.md)。

```sh
cp .env.example .env
# 编辑 APP_ORIGIN、NAS_DATA_DIR、GITPOLAR_UID、GITPOLAR_GID
mkdir -p data
docker compose up -d --build
```

默认挂载一个数据目录，里面包含仓库、LFS 实体和数据库。容器更新不会清除这些内容。客户端统一使用 HTTP(S) + gitpolar 访问令牌；当前版本未提供 SSH 监听服务。

## 日常 Git 使用

1. 在网页新建仓库。全新项目可保留 README 初始化；导入已有项目时取消 README 和 CAD 模板，得到空仓库。
2. 右上角头像 → **Git access tokens**，生成一个自己的令牌。令牌仅显示一次。
3. 复制 **Code** 下的真实 HTTP(S) 地址。

```sh
git clone http://NAS_IP:4317/polar-lab/robot-cad.git
# 提示 Username：填写 gitpolar 用户名
# 提示 Password：填写 gitpolar 访问令牌
cd robot-cad
# 添加项目文件后：
git add .
git commit -m "Add project files"
git push origin main
```

网页读取的是 NAS 的真实 Git 数据。网页编辑文本也会生成 Git 提交，客户端可通过 `git pull` 取回。

本版为一个团队共享空间：登录用户可以读取所有团队仓库；Writer 可以推送、建仓库和编辑文本；Reader 只能读取仓库；Admin 还可创建用户。不是按项目隔离的多租户托管服务。

## SolidWorks / CAD

SolidWorks 原生插件提供 **侧边栏、上方 gitpolar 工具栏和独立 Git Graph 窗口**。点击“保存当前成果”即可为修改的图纸取得 LFS 编辑锁、保存、按设置更新预览、提交并推送 NAS；显示与保存选项可在插件里切换。原生分支管理窗口支持创建、切换、更新、发布、合并、重命名、删除、暂存、标签、CAD 冲突选版、双分支人工合图与文件锁，日常操作无需命令行。安装和日常使用见 [原生插件说明](solidworks-addin/README.md)。

0.6.3 增加原生 **人工合图**：将两个分支的总装及依赖分别取出，插入一个临时总装，在 SolidWorks 手工合图；核对结果保存路径、应用并标记解决后，再点击“完成合并”生成保留两边历史的提交。引用会重连到工作副本，临时比较文件留在仓库外。操作细节见 [插件说明](solidworks-addin/README.md#人工合图合并063)。

新仓库勾选 **SolidWorks / CAD template**，会提交 `.gitattributes` 和 `.gitignore`。模板将原生 SolidWorks 文件放入 LFS，并标记为 `lockable`。工具栏的 **SolidWorks** 面板支持 CAD 清单、按类型筛选、网页文件锁和完整工程 ZIP；**History** 可取回某次提交的文件或整套工程。STEP/STL 可直接三维查看；SLDASM/SLDPRT 可关联由 SolidWorks 导出的预览，并检查源版本匹配。v0.5 增加按零件依赖追踪的装配历史、分体几何去重预览和双版本同步查看；在文件页点击 **Compare**，选择分支、标签或提交查看前后变化。详见 [SolidWorks 工作流](docs/SOLIDWORKS.md)。

```sh
git lfs install
git clone http://NAS_IP:4317/polar-lab/robot-cad.git
cd robot-cad
git config lfs.locksverify true
git lfs lock "装配/底盘.SLDASM"
# 用 SolidWorks 编辑，保存，再 git add / commit / push
git lfs unlock "装配/底盘.SLDASM"
```

Git LFS 使用标准 Batch、Basic Transfer 和 Locking API。服务端验证上传的字节数和 SHA-256；接收 push 前检查 LFS 对象是否存在，并拒绝修改其他成员锁住的文件。锁对同一仓库中的路径生效，跨分支共享。

## 电控工作区后端

固件可托管在 Gitee 或 GitHub。主线汇总各车组 DJI、DM 固件，车组单独授权。HTTP 接口提供提交、差异与合并冲突、draw.io 读写、个人 Windows 工位串口遥测、固件身份、选版构建和烧录核验。工位复用本机 CubeMX 与 Keil。配置、权限及调用示例见 [电控工作区](docs/FIRMWARE.md)。

## 可选 GitHub 登录

GitHub 只作为身份提供方，仓库与 LFS 文件保存在 NAS。

1. 在 GitHub 注册 OAuth App，Homepage URL 填 `APP_ORIGIN`；回调 URL 填 `APP_ORIGIN/auth/github/callback`。
2. `.env` 中填写 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。设置 `GITHUB_ALLOWED_USERS=alice,bob`，允许指定 GitHub 账号加入已有团队。
3. 重启服务，登录窗口会出现 **Sign in with GitHub**。允许的新 GitHub 账号创建为 Writer，本地用户名为 `gh-原GitHub用户名`。

没有配置 GitHub OAuth 时，本地账号仍可完整使用 Git 和 LFS。Git 客户端始终使用 gitpolar 访问令牌，不能把 GitHub 密码填入 NAS 的 Git 登录框。

修改 `viewer/` 后执行 `npm run build:viewer` 更新 `public/` 中的本地预览资源；NAS 部署包已包含构建产物。

执行 `npm run package:nas -- OUTPUT_ZIP_PATH` 可重建 NAS 源码部署包；该包包含 `public/` 构建产物并排除正式 `.env`、数据和 node_modules。

## 当前边界

- 已接通：真实仓库、分支/标签、提交与文件展示、HTTP clone/fetch/push、文本网页提交、Git LFS、文件锁、账号/角色/访问令牌、持久化议题、NAS Compose 配置。
- 尚未实现：Pull request 审查与合并、Actions runner、SSH key 托管、按仓库分配权限、NAS 直接解析原生 CAD 二进制、特征/尺寸级自动几何差异识别。SolidWorks 引用和网格由 Windows 本机工具导出。
- 网页 ZIP 下载会还原 LFS 原文件并保留当前提交的目录。缺失 LFS 内容时停止导出并报告路径；仓库外装配引用仍需通过 Pack and Go 整理。
- 浏览器直接打开 `index.html` 仍是独立界面演示。通过 `node server.mjs` 或 NAS 服务打开时只展示服务器数据，不会导入浏览器旧演示仓库。

界面图标基于 Octicons，授权见 `THIRD_PARTY_NOTICES.md`。协议选择和官方参考见 [架构说明](docs/ARCHITECTURE.md)。
