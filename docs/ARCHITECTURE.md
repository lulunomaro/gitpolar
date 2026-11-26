# 后端结构与协议选择

## Git 官方提供什么

Git 官方提供传输、对象数据库、引用和仓库管理程序。`git-http-backend` 是 CGI 服务端，可处理 Smart HTTP 的 `upload-pack`（clone/fetch）和 `receive-pack`（push）。配合 bare repository，就能在自己的机器上托管标准 Git 仓库。

Git 本身不包含 GitHub 这样的用户、网页、访问令牌、议题和大文件 Web 管理系统。gitpolar 在官方 Git 命令外增加这些应用接口；不自行实现 Git 对象格式或 pack 协议。

| 方式 | 官方组件/形式 | 本版本的选择 |
| --- | --- | --- |
| HTTP / HTTPS | `git-http-backend` + bare 仓库 | 已实现。网页和 Git/LFS 共用一个 NAS 端口，Git 客户端使用 gitpolar PAT。 |
| SSH | `git-shell` / `git-upload-pack` / `git-receive-pack` | 官方支持；本版本没有 SSH 监听、密钥管理和系统账号映射。 |
| `git://` | `git daemon` | 协议本身不提供用户认证，因此未作为团队写入入口。 |
| 本地路径 / 共享文件系统 | bare 仓库路径 | Git 支持，但本版让客户端走 HTTP(S)，由服务统一处理身份和 LFS。 |

官方参考：

- https://git-scm.com/docs/git-http-backend
- https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols
- https://git-scm.com/docs/git-shell

## 大文件与锁

Git 可保存任意二进制。对于会不断修改的大型 CAD 文件，Git LFS 在 Git 历史里保存小型指针，将原始内容保存在 LFS 对象目录。LFS 是独立于核心 Git 的开放项目和协议；客户端发现远端 `REPO.git/info/lfs`，使用标准 Batch 和 Basic Transfer 接口。

服务端实现：

- Batch API：生成上传、下载和校验动作。
- 流式 PUT：核对对象大小与 SHA-256，再将完整对象落盘。
- Locking API：创建、查询、验证和释放文件锁。
- pre-receive：在引用更新之前，拒绝缺失 LFS 对象的提交，并检查其他成员对变更路径持有的锁。

官方协议与客户端参考：

- https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
- https://github.com/git-lfs/git-lfs/blob/main/docs/api/basic-transfers.md
- https://github.com/git-lfs/git-lfs/blob/main/docs/api/locking.md
- https://git-lfs.com/

## 一次 push 的路径

```text
Git / Git LFS client
  ├── LFS batch → upload object → SHA-256 verification → NAS data/lfs/
  └── authenticated Smart HTTP
        → official git http-backend
        → git receive-pack
        → gitpolar pre-receive (LFS availability + foreign locks)
        → bare repository refs and objects on NAS
        → SSE repository event
        → gitpolar refreshes catalog / branch / file metadata
```

服务器端用 `spawn` / 参数数组调用 Git，不通过拼接 shell 命令处理仓库名、分支和文件路径。Git 的 CGI 输出与请求体以流式方式连接 HTTP。网页读取 Git 的树和 blob，而不是另一份工作区副本。

## 模块

- `server.mjs`：启动、静态页面、API 路由、Git/LFS 路由与 SSE。
- `backend/git.mjs`：bare 仓库、Git 命令、目录/文件读取、网页提交和 CGI 传输。
- `backend/lfs.mjs`：LFS 对象，以及网页和客户端共用的文件锁。
- `backend/snapshot.mjs`：固定提交的文件索引、小型 LFS 指针批量读取、对象可用性和 CAD 分类。
- `backend/preview.mjs`：同一提交中的预览关联、CAD 源指纹与过期判定。
- `viewer/`：Three.js 查看器、独立 STEP/STL 解析 Worker；由 `scripts/build-viewer.mjs` 构建到 `public/`。
- `tools/Export-SolidWorksPreview.ps1`：SolidWorks 工作站导出 STEP / 登记已有导出。
- `backend/archive.mjs`：使用 yazl 流式生成包含 LFS 原文件的工程 ZIP，按需使用 ZIP64。
- `backend/pre-receive.mjs`：由 Git 进程调用的实际服务端接收钩子。
- `backend/store.mjs`：SQLite 结构与持久化。
- `backend/auth.mjs`：本地密码、会话、令牌和权限检查。
- `backend/oauth.mjs`：可选 GitHub 身份登录。
- `backend/api.mjs`：应用 API。
- `live.js` / `app.js`：网页调用真实接口；直接用 file:// 打开时保留界面演示。

## 数据与权限

一个实例对应一个团队工作区；`WORKSPACE_NAME` 在投入使用后应保持不变。授权成员可读该空间内全部仓库。Writer/Admin 可写，Reader 不可写。访问令牌继承账号权限，可单独撤销；数据库中保存令牌摘要，而不是明文令牌。本地密码使用 scrypt；会话保存在 SQLite 中，重启后仍可继续使用。

GitHub OAuth 只读取 GitHub 身份，不授予 NAS 对 GitHub 仓库的读写权限；项目代码、CAD 和 LFS 文件不因登录而上传到 GitHub。未初始化时，首个合法账号成为管理员；初始化后新的 GitHub 账号必须在允许名单中。

## CAD 快照与历史

网页与下载入口以 Git 提交 SHA 固定版本。历史读取真实 `git log`，不会依靠单独的文件历史数据库。工程 ZIP 使用固定版本的 yazl（由 package-lock.json 固定依赖）逐项读取 Git blob 或 LFS 原文件，保留目录和文件模式。先校验全部 LFS 记录与磁盘长度，再发送 ZIP；传输过程中读取失败会中止响应。对象上传时的 SHA-256 校验负责内容完整性。

SolidWorks 清单根据真实路径扩展名分类，明确区分文件存储可用性和装配引用完整性。原生引用解析尚未实现，界面不会推断装配依赖。

## 预览渲染

Three.js 负责浏览器显示和操作，OCCT 的独立 WASM 文件在 Worker 中将 STEP 转为三角网格；STL 在同一后台线程解析。读取到的几何保留 STEP 导出坐标，浏览器不自行修改原始 CAD。SolidWorks 文件通过当前提交的清单关联导出模型；源路径集合、原生 CAD blob 或预览 blob 改变后不继续展示旧几何。
