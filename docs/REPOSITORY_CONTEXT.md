# 客户端图纸与仓库归属（后端协议 v1）

后端按稳定仓库 ID 和 Git 远端识别仓库，不按图纸名称、提交 SHA、最近一次使用的仓库或工作站盘符猜测。每次请求独立解析，A 工程、B 工程和库零件可以分别持有自己的上下文。

当前已实现后端接口与鉴权/串库校验；SolidWorks 插件的自动工作副本发现和窗口跟随切换尚未接入。现有插件仍使用其手动选择的工作副本。

## 接口

需要登录 Cookie 或 gitpolar Bearer 令牌。Reader 也可调用这些只读接口。Cookie 调用 POST 解析接口时，需要匹配 APP_ORIGIN 的 Origin 头；令牌调用无需浏览器 Origin。

- POST /api/repository-context/resolve：由选定远端或已绑定 ID 解析归属。
- GET /api/repos/NAME/context?ref=main&path=零件/支架.SLDPRT：取得已知仓库的身份、版本和路径状态。
- GET /api/session 的 capabilities.repositoryContext 表示服务器支持此协议。

首次识别请求：

~~~json
{
  "remotes": [
    {"name": "origin", "url": "http://NAS:4317/polar-lab/chassis.git"}
  ],
  "ref": "main",
  "path": "零件/支架.SLDPRT"
}
~~~

成功响应的主要字段：

~~~json
{
  "schemaVersion": 1,
  "resolved": true,
  "matchedBy": "remote",
  "matchedRemotes": ["origin"],
  "repository": {
    "id": "仓库的持久 UUID",
    "name": "chassis",
    "namespace": "polar-lab",
    "cloneUrl": "http://NAS:4317/polar-lab/chassis.git",
    "apiUrl": "/api/repos/chassis"
  },
  "permissions": {"read": true, "write": true},
  "revision": {"ref": "main", "oid": "固定提交 SHA", "available": true},
  "document": {"path": "零件/支架.SLDPRT", "state": "tracked", "blobOid": "文件 Git blob SHA", "mode": "100644", "size": 123}
}
~~~

repository.id 直接使用数据库已有的仓库 UUID，不依赖仓库显示名称、文档名或提交内容。两个仓库可以拥有相同历史和同名零件，ID 仍不同。数据库与仓库存储一起保留时，服务器重启不会改变 ID；同名仓库重建不会继承旧身份。

ref 接受分支名、标签名或完整提交 SHA；不传时使用服务端 HEAD 指向的默认分支。path 只能是以 / 分隔的仓库内相对路径，不接受 C:/CAD/...、UNC 绝对路径、反斜杠或 .. 跳转。

## 新文件与尚未推送的分支

归属和服务端版本可用性分别返回：

| 情况 | resolved | document.state / revision |
| --- | --- | --- |
| 已知仓库中已推送的图纸 | true | tracked，含固定提交及 blob ID |
| 仓库已知，但图纸尚未出现在所选服务端版本 | true | not-in-revision |
| 本地新分支尚未推送，或空仓库尚无提交 | true | revision.available=false、reason=ref-not-on-server；路径为 revision-unavailable |
| 未提供路径 | true | document=null |

not-in-revision 只说明所选服务端提交没有该路径，不代表后端已经检查过客户端的 Git 暂存区，也不能用它判断本地文件究竟未跟踪、未提交还是尚未推送。size 是 Git blob 的长度；LFS 图纸的原始大小与对象可用性仍通过现有 CAD / 文件接口查询。

## 多远端和已绑定身份

remotes 接受最多 32 个 {name,url}，仅使用与本实例 APP_ORIGIN、工作区路径都匹配的 HTTP(S) 仓库地址。允许尾部 .git 和单个尾斜杠。识别过程只解析地址，不访问传入地址、不读取客户端路径。URL 中的账号、密码、查询参数和片段会被拒绝；客户端先移除 URL 中的凭据。

多个不同的 gitpolar 仓库路径匹配时返回 409 / ambiguous-remotes，不自动选择第一个或默认选择 origin。响应提供 candidates 和 remoteChoices。即使其中一个仓库已经不存在，也不会擅自改选另一个 upstream。客户端可传 preferredRemote 明确选择某个远端；相同仓库的多个地址不会构成歧义。

识别成功后，客户端可按本地工作副本保存 repository.id，后续请求传 repositoryId。可用绑定所在仓库的本地 Git 配置保存，例如 git config --local gitpolar.repositoryId UUID；不要把机器绝对路径写进共享源文件。

已绑定 ID 与选定的本实例远端指向不同仓库时返回 409 / identity-conflict。绑定 ID 已不存在时返回 404 / repository-id-not-found，不按同名远端偷偷重新绑定。若 NAS 地址变化，可向已确认的新服务器提交持久 ID；返回的新 cloneUrl 可用于显式更新连接。此时 matchedRemotes 可能为空，表示旧远端地址没有在当前实例得到验证；解析接口不会自动修改远端，也不会推送文件。permissions.write 只表示账号的服务端权限，不代表本地工作副本可写。

其他未识别情况：

| HTTP / reason | 意义 |
| --- | --- |
| 200 / foreign-remote | 地址不属于当前实例，例如同名 GitHub 仓库、其他主机或其他工作区；不按名称或提交 SHA 回退匹配 |
| 200 / no-repository-identity | 没有提供远端或已绑定 ID |
| 404 / repository-not-found | 地址属于本实例，但对应仓库不存在或未就绪 |
| 400 | 请求格式、远端或相对路径无效 |
| 401 / 403 | 未登录，或 Cookie POST 的 Origin 不匹配 |

## 防止后续 API 请求串库

所有 /api/repos/NAME 路径下的接口均接受 X-Gitpolar-Repository-Id 请求头。新客户端应把解析得到的 UUID 随读取、建分支、文件锁和写入请求一起发送。路径中的 NAME 与 UUID 不对应时，后端在执行操作前返回 409。响应头也返回实际 X-Gitpolar-Repository-Id。旧客户端未发送此头时，沿用原接口行为。

此校验用于应用 API，不修改标准 Git Smart HTTP 协议。Git push 的目标仍由当前工作副本的远端和分支配置决定，插件应在执行前固定该工作副本，不能从另一个图纸的全局 UI 选择中获取目标。

## SolidWorks 客户端后续接入约定

1. 在安全的界面刷新时机取得当前实际编辑文档的已保存路径；未另存的新文档先显示待保存状态，不猜归属。
2. 在工作站执行 Git 的工作副本发现，取得该文件所在最近工作副本的根目录、当前分支/HEAD 和远端。使用 git rev-parse --show-toplevel 等 Git 能力，兼容 .git 目录、worktree 的 .git 文件和子模块；不能只手工拼装目录名。
3. 用根目录计算仓库内相对路径，再调用解析接口。每个本地工作副本分别保存绑定；切换文档不能覆盖正在执行操作的目标。
4. 各文档分别归属：总装引用的共享库零件可能属于另一个仓库；外部零件也可能尚未进入任何 Git 工作副本。不要因为它被总装引用就归入总装仓库。
5. 保存、分支切换和预览开始时固定 root / repositoryId / ref / path；异步完成时只更新仍属于同一上下文的界面。

这些客户端步骤是后续接入契约，不表示当前原生插件已完成自动切库。
