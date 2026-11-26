# 文件与目录分类

| 类别 | 路径 | 用途 |
| --- | --- | --- |
| 主站界面 | index.html、app.js、live.js、styles.css | 仓库树、分支、Git Graph 和版本比较 |
| 账号登录 | login/ | 飞书扫码和登录状态 |
| NAS 管理 | admin/ | 用户、团队、角色、存储与部署诊断 |
| 采购库存 | procurement/ | 日期与提交人工作台、批量导入、审批、到货及入库 |
| 后端服务 | server.mjs、backend/ | Git/LFS、SQLite、登录、采购、固件 API |
| 预览源码 | viewer/、procurement/viewer.js | 三维查看器源码 |
| 发布静态资源 | public/、assets/ | 已构建的本地查看器、CAD 解析库和品牌资源 |
| SolidWorks 插件 | solidworks-addin/ | 任务窗格、独立窗口、Git Graph、合图工具 |
| 工作站工具 | tools/ | SolidWorks 导出与固件工位；tools/firmware/station.json 属于本机配置 |
| 仓库模板 | templates/ | CAD 的 Git LFS、锁定与忽略规则 |
| 构建打包 | scripts/ | 查看器构建、NAS 包、插件包 |
| Ubuntu 发布 | deploy/ubuntu/ | systemd 服务、存储准备、配置示例与安装脚本 |
| 容器发布 | Dockerfile、compose.yaml | NAS Compose 部署 |
| 文档 | docs/ | 使用、API、协作、部署与验收说明 |
| 测试 | tests/ | 后端回归与固件工位验证 |
| 本地运行数据 | data/ | 开发机数据库、仓库和 LFS；Git 忽略 |
| 本地产物 | artifacts/ | 测试日志、截图、发布包和迁移快照；Git 忽略 |

服务器上的程序、配置、业务数据、备份与日志路径见 [Ubuntu 目录表](../deploy/ubuntu/README.md)。正式 .env、飞书应用密钥、个人令牌、采购数据和 CAD 文件不进入源码仓库。
