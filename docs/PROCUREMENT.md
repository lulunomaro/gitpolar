# 采购、发加工与库存

入口为 /procurement/，与主站及 NAS 管理后台共用飞书会话和品牌导航。页面沿用 GitHub 的标签、表格、状态标识与操作记录风格。既有 rmuc-machining-hub 的分类、STEP/DWG 配对和包络尺寸工作流作为业务参考；没有拷贝供应商的账号、私有接口或报价算法。

## 日常操作

1. 标准件：填写名称、规格、数量、单位、商品链接和可选预算单价，加入购物车。链接只保存，不会自动购买或请求链接内容。
2. 加工件：选择 STEP/STP，可同时配同名 DWG；本地三维解析后拖动旋转、平移、缩放，点选孔壁，填写螺纹规格、通孔/盲孔和深度，保存标注。填写工艺、材料和表面处理后加入购物车。
3. 购物车：标准件与加工件可合并；填写标题、小组、用途后保存草稿或提交。标签页购物车保存在当前浏览器会话，保存草稿才成为跨设备可访问的服务器记录。
4. 同组组长审批，退回时填写原因。申请人修改退回单后可重提；通过后明细冻结。
5. 采购填写订单编号、可选供应商和物流单号，登记为已下单。
6. 申请人确认整单到货，库管填写整单库位并入库。库存和每条明细的入库凭证在同一事务写入。
7. 库存页按名称、规格、库位和标准件/加工件类别查询；申请详情保留所有操作的经手人与时间，也能重新打开原始 STEP 和人工标注。

螺纹标注保存的是原始文件中的 meshIndex、BRep faceIndex、点坐标、螺纹规格、深度与通孔标记，文件保存 SHA-256。它是人工加工要求，不是自动孔识别或供应商加工可行性判定；STEP 文件更换时需要重新标注。每个 STEP/STP/DWG 附件最大 64 MiB。

## 职责

Git 的 admin/writer/reader 与采购职责分别管理。Git 只读成员也能发起采购申请。

| 角色 | 作用 |
| --- | --- |
| 项管（admin） | 全局访问，创建团队、分配职责、管理账号、必要时代办并留审计记录 |
| member | 自己小组的申请与本人收货 |
| lead | 审核本组申请，不能审核自己发起的申请 |
| buyer | 查看已批准及后续申请，登记下单信息 |
| storekeeper | 查看后续申请、整单入库、同步飞书凭证 |

默认团队 mechanical / 机械组；未分配的成员作为机械组普通组员。每个用户在每个小组有一个采购职责；可在不同小组有不同职责。新增团队和分配职责在团队权限页完成。审批权限和状态均由服务端校验。

状态：draft → submitted → approved → ordered → received → stocked；submitted 可退回 rejected，再修改、重提。当前按整单收货和整单单库位入库，不支持分批到货、领用出库、拆单付款或财务报销。库存按 kind/name/spec/unit/location 合并，同单重复入库返回 409，不重复累加。

## 飞书仓库连接

登录使用的飞书用户授权，与 NAS 持续运行所需的应用仓库权限是两个场景。同步以自建应用身份获取 tenant_access_token；必须把真实 Base 授权给应用，并在开发者后台开通相应记录读取/创建权限。

配置两张现有表：

- FEISHU_WAREHOUSE_BASE_TOKEN：Base 的 app_token。
- FEISHU_WAREHOUSE_TABLE_ID：接收入库流水的 table_id。
- FEISHU_INVENTORY_TABLE_ID：可选的现有库存余额表，页面只读查询，不覆盖其数量。

入库流水字段默认映射：

| 映射键 | 默认字段名 | 字段类型 |
| --- | --- | --- |
| receiptId | gitpolar入库ID | 文本；稳定凭证标识 |
| name | 物料名称 | 文本 |
| spec | 规格型号 | 文本 |
| quantity | 数量 | 数字 |
| unit | 单位 | 文本 |
| location | 库位 | 文本 |
| requestId | 采购单 | 文本 |
| createdAt | 入库时间 | 日期；API 传毫秒时间戳 |
| actor | 入库人 | 文本 |

实际字段不同则在 FEISHU_WAREHOUSE_FIELDS 填写 JSON 映射，例如 {"name":"零件名称","location":"货架位置"}，其他字段沿用默认值。现有库存余额查询默认读取物料名称、规格型号、单位、库存数量、库位；FEISHU_INVENTORY_FIELDS 可用 name/spec/unit/quantity/location 覆盖字段名。

凭证初始 pending；项管或库管点击同步后更新为 synced/failed。先按稳定入库 ID 查询已有飞书记录，再用同一个 UUID client_token 创建，恢复网络响应丢失后的未确认写入。失败保留错误，重试不重复增加本地库存。每次最多处理 20 条；FEISHU_WAREHOUSE_AUTO_SYNC=true 时每分钟处理一批，默认关闭。外部表字段需先配置好，再开启。

飞书现有库存和本地库存分开呈现，避免把同一批物料加两次。未提供仓库地址/表 ID、应用权限或字段映射时，页面显示待配置，不会声称已连接。当前尚未对用户的正式飞书仓库执行读写。

## 数据与 API

SQLite 表统一 pc_ 前缀。原始附件在 DATA_DIR/procurement/files/，需纳入 NAS 备份。每条入库明细有唯一凭证，pc_stock_receipts 同时充当待同步队列。操作记录和凭证业务字段不能被修改或删除。

| 方法与路径 | 用途 |
| --- | --- |
| GET /api/procurement/meta | 团队、本人职责、项管可分配成员 |
| POST /api/procurement/teams | 项管创建团队 |
| PUT /api/procurement/assignments | 项管分配用户团队职责 |
| GET/POST /api/procurement/requests | 可见申请清单 / 创建草稿 |
| GET/PATCH /api/procurement/requests/ID | 明细、审计 / 编辑草稿或退回单 |
| POST /api/procurement/requests/ID/actions | submit/approve/reject/order/receive/stock |
| POST /api/procurement/files?name=... | 原始字节流上传附件 |
| GET /api/procurement/files/ID | 经过归属/可见性校验的原文件下载 |
| GET /api/procurement/inventory?q=...&kind=standard | 本地库存及入库流水 |
| GET /api/procurement/feishu/status | 实际配置状态及待同步/成功/失败数量 |
| POST /api/procurement/feishu/sync | 项管或库管同步入库凭证 |
| GET /api/procurement/feishu/inventory?q=...&pageToken=... | 只读查询飞书现有库存余额 |

创建请求的 items 同时支持 standard/machining，单位价格为整数分，数量为正整数。动作必须在正确前置状态执行；不通过开放 PATCH 接口直接设置状态。

官方协议参考：

- https://open.feishu.cn/document/authentication-management/access-token/obtain-oauth-code.md
- https://open.feishu.cn/document/authentication-management/access-token/get-user-access-token.md
- https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/tenant_access_token.md
- https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create.md
- https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search.md
