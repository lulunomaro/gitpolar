# 应用接口

统一前缀 `/api`。浏览器使用 HttpOnly 会话 Cookie；脚本可使用 `Authorization: Bearer gitpolar_...`。依赖 Cookie 的写操作需要匹配 `APP_ORIGIN` 的 `Origin` 头。

| 方法与路径 | 用途 |
| --- | --- |
| `GET /api/health` | 无需登录的服务检查。 |
| `GET /api/session` | 会话、初始化状态、工作区名、OAuth 配置和后端能力。 |
| `GET /auth/feishu` / `GET /auth/feishu/callback` | 正常部署唯一的网页登录与回调。 |
| `POST /api/logout` | 退出当前会话。本地 setup/login 和 GitHub 登录在正常部署返回 403。 |
| `GET /api/users` | 项管列出成员，成员通过飞书加入；角色修改见管理接口。 |
| `GET/POST /api/tokens` | 查看令牌元数据/创建一个仅返回一次明文的令牌。 |
| `DELETE /api/tokens/ID` | 撤销当前用户自己的令牌。 |
| `GET /api/events` | 已登录用户的 SSE 仓库更新事件。 |
| `GET/POST /api/repos` | 列出真实仓库/创建 bare 仓库。 |
| `GET/PATCH /api/repos/NAME` | 仓库信息/修改描述。 |
| `POST /api/repository-context/resolve` | 通过远端或持久仓库 ID 识别当前图纸归属，显式报告多远端歧义。 |
| `GET /api/repos/NAME/context?ref=main&path=...` | 仓库身份、账号权限、固定版本与图纸在该版本中的状态。 |
| `GET /api/repos/NAME/browse?ref=main&path=...` | 目录、文件、README、提交、分支及文件锁。 |
| `GET /api/repos/NAME/files?ref=main` | 递归文件索引，不加载全部文件内容。 |
| `GET /api/repos/NAME/raw?ref=main&path=...` | 下载 Git blob 或已还原的 LFS 实体。 |
| `GET /api/repos/NAME/archive?ref=main` | 固定到一个提交的完整 ZIP；流式还原全部 LFS 原文件，缺失内容返回 409。 |
| `PUT /api/repos/NAME/file` | 生成文本文件提交；二进制/CAD 通过 Git 客户端提交。 |
| `GET /api/repos/NAME/preview?ref=main&path=...` | STEP/STL 或原生装配/零件的预览地址、格式、大小、源版本校验与诊断。 |
| `GET /api/repos/NAME/cad?ref=main` | CAD 文件分类、真实大小、LFS 可用性、锁和统计。 |
| `GET /api/repos/NAME/history?ref=main&path=...&cursor=0` | 路径或仓库历史，每页 25 条；支持分支、标签与提交 SHA。 |
| `POST /api/repos/NAME/locks` | 锁定已存在的文件；请求 `{path,ref}`，返回新锁，冲突返回 409。 |
| `POST /api/repos/NAME/locks/ID/unlock` | 释放自己的锁；管理员可传 `{force:true}` 释放他人的锁。 |
| `GET /api/repos/NAME/locks` | 当前文件锁。 |
| `POST /api/repos/NAME/preferences` | Star/Watch 偏好。 |
| `GET /api/issues` | 工作区已保存的议题。 |
| `POST /api/repos/NAME/issues` | 新建议题。 |

创建仓库请求：

```json
{"name":"robot-cad","description":"Team CAD","initialize":true,"cad":true}
```

`initialize` 添加 README；`cad` 添加 CAD/LFS 模板。导入已有仓库时将两者都设为 `false`。

网页提交请求：

```json
{"branch":"main","path":"docs/note.md","text":"# Note\n","message":"Update note"}
```

Git 客户端远端为：`http(s)://NAS:PORT/WORKSPACE/NAME.git`。Smart HTTP 使用 Basic 认证，用户名为 gitpolar 用户名，密码为 gitpolar 访问令牌。Git LFS 接口位于同一远端的 `/info/lfs` 下。

应用 API 的错误为 JSON，包含 `error`。LFS 锁冲突按 LFS 规范返回 409 与已有锁。Git pack 传输保留 Git 协议自身的状态和错误格式。

`PUT /file` 还可传 `expectedHead`（打开编辑器时 browse 响应中的 commit OID；空仓库为 null）。若分支已变化，服务器返回 409，避免覆盖打开编辑器后发生的其他提交。网页提交会自动携带该字段。

## CAD、历史与导出约定

`cad` 返回 `{ref,oid,files,counts,locks,totalFiles,totalBytes,missingLfs,nativeInGit,referencesVerified:false}`。`files` 包含 `path`、`kind`、`size`、`lfs` 和 `available`；`oid` 是固定的 Git 提交。分类不解析原生装配引用。

`history` 返回 `{ref,oid,path,commits,nextCursor}`，记录包括 `oid/hash/author/date/message`。后续页使用上次返回的完整 `oid` 作为 `ref`，配合 `nextCursor`，避免分支变化造成分页重复。文件历史按字面路径筛选，不自动跟随改名，也不把删除提交列为可下载文件版本。

`archive` 返回 `application/zip`，文件名含短提交号。响应头 `X-Gitpolar-Commit` 标识完整提交 SHA，`X-Gitpolar-LFS: hydrated` 表示 LFS 原文件已填入。缺失对象、磁盘文件或长度不符会在发送 ZIP 前返回 409。ZIP 不包含外部引用文件或子模块内容。

网页与标准 Git LFS Locking API 共用锁记录、所有权和管理员强制解锁规则。两种入口的锁变更均通过 SSE 通知网页。Reader 只有查询、历史与下载权限。

## 三维预览

`preview` 返回 `{available,oid,sourcePath,maxBytes}`。可用时另外返回 `{format,path,size,derived,configuration,url}`；`url` 固定到当前提交并读取 NAS 上的原模型内容。不可用时返回 `reason/message`，包括 `not-generated`、`stale`、`missing-preview`、`missing-lfs`、`too-large`、`manifest`、`unsupported`。

直接 STEP/STL 可显示；SLDASM/SLDPRT 必须在 `.gitpolar/previews.json` 中登记。清单版本为 1，`previews` 数组记录 `{source,path,projectFingerprint,previewOid,configuration,generatedAt}`。项目指纹由排序后的原生 CAD 文件路径与其 Git blob ID 计算，包含 LFS 指针的内容标识。对全部仓库内 CAD 文件和导出文件的校验用于发现过期预览，不证明外部引用齐全。

`/viewer.js`、`/cad-worker.js`、`/cad-vendor/occt-import-js.js` 与 `.wasm` 均由实例自身提供。`/tools/Export-SolidWorksPreview.ps1` 提供工作站侧辅助脚本。


## CAD 版本比较与依赖历史（v0.5）

GET /api/repos/:name/compare?base=BASE&head=HEAD&path=SOURCE

需登录，base/head 接受分支、标签或完整提交号。base 缺省时使用 head 第一父提交；只有首次提交时两侧相同。返回固定后的 base/head 提交信息、路径增删改、相关依赖标记、相对独立内容容量、两个版本各自的 preview 元数据，以及场景实例的 added/removed/modified/moved/unchanged 状态。路径在某侧不存在时该侧 preview 明确返回 missing。容量不是物理磁盘用量。此端点和预览均为只读。

GET /api/repos/:name/history?ref=REF&path=SOURCE&scope=dependencies&cursor=0

按第一父链分页检查源文档和其历史依赖，dependencyOnly 标记“总装本身未变、引用零件或依赖成员变化”的提交；previewOnly 区分仅预览/配置清单发生变化的提交。scope 为 explicit 或 project-fallback；cursor 是已扫描提交偏移，可出现本页无相关提交但仍有 nextCursor 的情况。未传 scope 时保留普通路径历史行为。

.gitpolar/previews.json version:2 每条 previews 条目包含 source、configuration、dependencies:[{path,oid}]，并使用 path/previewOid 的单模型或 components:[{id,name,source,configuration,path,previewOid,transform}] 的分体场景。依赖必须包含源文件；oid/previewOid 是该提交中经过 Git 过滤后的 blob ID。transform 是列主序 4×4 仿射矩阵，平移单位 mm。资产通过同一提交的 raw 接口读取。显式依赖过期时不提供看似最新的模型。scene 响应按独立资产计算大小并执行预览容量上限。


## 客户端仓库上下文

新增只读仓库解析协议支持不同工程分别持有持久仓库 ID，不按同名零件或共同提交猜归属。应用仓库接口可携带 X-Gitpolar-Repository-Id 进行身份校验，ID 与 NAME 不符时返回 409，响应头返回实际 ID。完整请求、响应、歧义处理和后续插件接入约定见 [客户端图纸与仓库归属](REPOSITORY_CONTEXT.md)。


## NAS 管理、采购与飞书

详见 [管理后台与飞书唯一登录](ADMIN.md) 和 [采购、发加工与库存接口](PROCUREMENT.md)。`GET /api/session` 返回 `authProvider: "feishu"`、`feishuLoginUrl`、`feishuCallbackUrl`、`feishuLinked` 及 admin/procurement/repositoryContext 能力标记。网页登录使用飞书签发的会话；Git/LFS 继续使用该账号的访问令牌。
