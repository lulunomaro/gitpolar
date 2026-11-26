# 协作交接 · 0.7.0

本次工作在 codex/repository-context 分支，起点为 118e216。协作者先拉取远端分支，再按 .env.example 配置自己的 NAS/开发机环境。不要共享 .env、正式 data/ 或账号令牌。

## 模块分工

| 模块 | 位置与职责 |
| --- | --- |
| 主站 | app.js / index.html / styles.css，GitHub 风格仓库、分支与历史；导航接管理和采购 |
| NAS 管理 | admin/、backend/admin.mjs；管理员角色、用量、仓库状态、文件锁、诊断 |
| 飞书身份 | backend/feishu.mjs、auth.mjs、store.mjs；唯一网页登录、PKCE、稳定用户、会话 provider |
| 采购业务 | procurement/app.js、backend/procurement.mjs；团队职责、申请状态机、库存与审计 |
| STEP 标注 | procurement/viewer.js，基于已有 CAD worker 的 OCCT BRep 面编号 |
| 飞书仓库 | backend/feishu-warehouse.mjs；入库凭证队列、幂等同步、余额表只读查询 |
| 仓库归属 | backend/repository-context.mjs；持久仓库 ID、远端匹配、多远端歧义、防错仓库 ID 头 |
| 部署与构建 | server.mjs 显式静态文件映射；Dockerfile 显式复制目录；scripts/package-nas.mjs 白名单打包 |

## 开发与验证

npm ci；npm run build:viewer；npm test；npm run package:nas。

修改查看器后必须重建 public/；NAS Docker 镜像不安装 esbuild。添加静态页面时同时维护 server.mjs、Dockerfile 和 package-nas.mjs。测试启动独立临时目录和端口，真实使用 Git/LFS 与 SQLite；测试夹具中的密码登录只在 NODE_ENV=test 且 AUTH_PROVIDER=local 有效，普通运行和生产始终为飞书。

## 当前交付与后续连接

- 已实现 NAS 后台、采购审批与库存、STEP 孔壁人工螺纹标注、飞书唯一登录、仓库归属接口。
- 需填入正式飞书应用凭证、允许名单、指定项管 open_id，以及真实仓库 Base/表 ID/字段映射，再与团队飞书做实网联调。已有 CLI 用户授权过期，不应把个人 CLI 缓存当成 NAS 的应用凭证。
- 采购沿用独立附件和请求数据，尚未批量迁移旧 machining-hub 数据；未实现自动供应商报价、支付、分批收货或库存领用。
- 原生 SolidWorks 插件未修改、未重装、未操作。仓库自动归属接口尚未接入插件事件。
- 当前源码与 NAS 包已更新；旧 4317 服务没有被这次测试替换。上一轮停止旧服务的操作被自动审批拒绝，仅返回 blocked by policy。请在有权限的正常部署流程中重载服务，不能据本地测试认定旧进程已经更新。

本次没有把真实 CAD 工程、采购附件、数据目录或密钥放入公开代码仓库；测试截图与 NAS ZIP 在本机 artifacts/，不提交 Git。
