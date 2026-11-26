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

已安装且配置飞书 CLI 时，直接打开 `.env` 中的 `APP_ORIGIN` 地址，点击 **使用飞书登录 → 生成飞书登录二维码**，用手机飞书扫码确认即可。NAS 首次配置和项管归属见 [扫码登录说明](docs/LOGIN.md)。成员通过飞书首次登录加入，项管在 **管理后台 → 用户** 和 **采购与库存 → 团队权限** 分配权限。`APP_ORIGIN` 必须填写团队实际使用的地址，例如 `http://192.168.1.20:4317`，不要在给队友使用时仍填写 `127.0.0.1`。

完整工程 ZIP 使用固定版本的 yazl，三维预览使用本地 Three.js 和 OCCT WebAssembly 资源；本机首次启动前执行 `npm ci`。运行 `npm test` 会启动独立临时服务，并使用真实 Git / Git LFS 客户端执行集成测试，不会修改正式数据目录。

## NAS 部署

项目包含 `Dockerfile` 与 `compose.yaml`。详细步骤见 [NAS 部署说明](docs/NAS.md)。

```sh
cp .env.example .env
# 编辑 APP_ORIGIN、NAS_DATA_DIR、UID/GID 和飞书应用/允许名单
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

本版为一个团队共享空间：登录用户可以读取所有团队仓库；Writer 可以推送、建仓库和编辑文本；Reader 只能读取仓库；Admin（项管）管理成员角色、采购权限和部署诊断。不是按项目隔离的多租户托管服务。

## 客户端仓库归属

后端提供按 Git 远端或持久仓库 ID 解析归属的只读接口，区分未提交图纸、尚未推送的分支和多远端歧义，并支持应用 API 的仓库 ID 校验。协议与测试说明见 [仓库归属说明](docs/REPOSITORY_CONTEXT.md)。当前 SolidWorks 插件仍使用手动选择的工作副本，自动发现和切换接入尚未完成。

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

## 飞书唯一登录

**推荐使用 CLI 扫码登录**：打开 `/login/`，生成二维码、飞书扫码、自动返回原页面。Docker 已包含 CLI，配置保存在 NAS 数据卷中；普通成员不需要填写应用参数。详细操作见 [LOGIN.md](docs/LOGIN.md)。

网页及 NAS 正常运行只允许飞书登录。GitHub 登录、本地密码登录和密码初始化接口均禁用；旧密码会话不能继续登录。Git 客户端使用飞书账号下生成的 gitpolar 访问令牌。

如使用备用网页 OAuth：

1. 配置自建飞书应用的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`，回调设置为 `APP_ORIGIN/auth/feishu/callback`。
2. 配置 `FEISHU_ALLOWED_TENANTS` 或 `FEISHU_ALLOWED_OPEN_IDS`；用 `FEISHU_ADMIN_OPEN_IDS` 指定项管的应用内 open_id。初次部署应先指定项管。
3. 登录使用飞书的稳定身份关联，成员显示名称不会决定权限。旧部署已有本地用户时，指定的飞书项管也能建立管理账号，旧仓库数据保留。

详见 [NAS 管理与登录](docs/ADMIN.md)。

## 采购、发加工与库存

从主站导航进入 **采购与库存**（`/procurement/`）。标准件填写规格、数量和商品链接；加工件导入 STEP、在三维模型上人工标注螺纹面，可配同名 DWG，然后加入购物车，组成申请单。

流程为 **组员提交 → 同组组长审批 → 采购登记订单 → 申请人确认到货 → 库管入库**。项管分配团队与职责。数据、附件、操作记录和入库流水持久化在 NAS；飞书入库流水同步和现有库存查询可按真实表结构配置。

使用、接口及飞书字段说明见 [采购系统说明](docs/PROCUREMENT.md)，协作者入口见 [协作交接](docs/COLLABORATION.md)。

修改 `viewer/` 后执行 `npm run build:viewer` 更新 `public/` 中的本地预览资源；NAS 部署包已包含构建产物。

执行 `npm run package:nas -- OUTPUT_ZIP_PATH` 可重建 NAS 源码部署包；该包包含 `public/` 构建产物并排除正式 `.env`、数据和 node_modules。

## 当前边界

- 已接通：真实仓库、分支/标签、提交与文件展示、HTTP clone/fetch/push、文本网页提交、Git LFS、文件锁、账号/角色/访问令牌、持久化议题、NAS 管理后台、飞书唯一登录、采购/发加工审批与库存、NAS Compose 配置。
- 尚未实现：Pull request 审查与合并、Actions runner、SSH key 托管、按仓库分配权限、NAS 直接解析原生 CAD 二进制、特征/尺寸级自动几何差异识别。SolidWorks 引用和网格由 Windows 本机工具导出。
- 网页 ZIP 下载会还原 LFS 原文件并保留当前提交的目录。缺失 LFS 内容时停止导出并报告路径；仓库外装配引用仍需通过 Pack and Go 整理。
- 浏览器直接打开 `index.html` 仍是独立界面演示。通过 `node server.mjs` 或 NAS 服务打开时只展示服务器数据，不会导入浏览器旧演示仓库。

界面图标基于 Octicons，授权见 `THIRD_PARTY_NOTICES.md`。协议选择和官方参考见 [架构说明](docs/ARCHITECTURE.md)。
