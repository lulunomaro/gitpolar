# 电控工作区后端

gitpolar 提供同源 HTTP API，沿用现有登录 Cookie、Origin 校验及个人访问令牌。源代码保存在指定的 Gitee 或 GitHub 仓库。NAS 保存 Git 对象缓存、工位、操作结果和实机验证记录。Windows 工位主动连接 NAS，负责访问该电脑的串口、CubeMX 和 Keil。前端可以通过同一个 NAS 地址完成全部操作。

## 代码仓库与车组

在 NAS 的 .env 配置 FIRMWARE_GIT_URL。当前工程使用 https://gitee.com/cambridge-linker/27_Reinstall_RoboticArm.git，原始分支为 engineer。私有仓库在 NAS 配置有读写权限的服务凭据 FIRMWARE_GIT_USER、FIRMWARE_GIT_TOKEN，或使用本机已有 Git 凭据管理器。GitHub 使用同样的 HTTPS Git 接口。只让服务账号及受信任的托管管理员在上游直接写入，其他网页成员使用 gitpolar 授权。上游已获得写权限的用户另外受 Gitee/GitHub 自身的分支规则约束。

主线 main 与各车组分支由同一个远端托管，网页没有主线权限向车组的自动继承。站点 Admin 初始管理 main，可委派主线 manager/writer。车组 manager 管理本组授权并可写入，writer 可提交。站点 Reader 保持只读。主线 manager 创建、删除车组并汇总，汇总会产生含两个父提交的 Git 提交。managers 和 writers 的授权随仓库保存在控制分支 gitpolar/firmware-access。车组创建、删除以及权限登记使用一次带旧版本校验的原子推送。

已有 engineer 仓库可先只读浏览、选择版本和构建。主线管理员显式调用 initialize 后，main 和 teams/engineer/{dji,dm} 从选定的 engineer 提交建立。工程仍位于 dji_board 和 DM_board，保留历史及原目录引用。新增车组使用 teams/<车组标识>/{dji,dm}，文件存于 vehicles/<车组标识>/<板型>/。可从主线已经汇总的一组工程复制模板。删除车组会删除两条开发分支和其授权，已经汇总到 main 的文件与历史仍可取回。

### 仓库接口

下表的路径均相对 `/api/firmware`。带 Cookie 的写请求须有与 APP_ORIGIN 匹配的 Origin，或使用 gitpolar 的 Bearer 令牌。所有 oid 均为完整提交号。编辑器收到 409 时应重新读取数据，让用户确认冲突。

| 方法与路径 | 输入与结果 |
| --- | --- |
| GET /api/firmware | 根入口。返回 repository、accessVersion、main、原始 source 和 groups，两种板卡分别有分支、提交和目录。 |
| POST /initialize | 原仓库尚无 main 时传 expectedSource、manager 和可选 name。只创建新引用，已有 main 的仓库直接使用 teams 接口。 |
| POST /teams | id（小写英文标识，main 已由汇总分支占用）、name（可用中文）、manager、expectedAccess，可选 from、templateGroup。返回新的 accessVersion。 |
| DELETE /teams | id、expectedAccess，以及 expectedHeads 中 dji/dm 两个完整提交号。 |
| GET /access?scope=组标识或main | 对应管理者可读取 grants 及 accessVersion。 |
| PUT /access | scope、username、role、expectedAccess。role 可为 manager、writer 或 null（撤销）。车组需保留一位管理者。 |
| GET /history、/files、/file | 传 ref 和可选 oid。车组文件路径相对所选板卡目录，main 和原始分支的路径相对仓库根。history 默认列出该范围内的提交，可用 path 筛选、用 offset 翻页。file 返回文本或 Base64。 |
| POST /commits | ref、expectedHead、message、files。一次提交可含多项 {path,text}、{path,base64} 或 {path,remove:true}。 |
| GET /compare | baseRef、headRef，可选 baseOid、headOid、仓库相对 path。返回变更文件、两端 SHA、真实三方合并的冲突路径。指定 path 后返回逐行 patch。 |
| POST /merge | 主线 manager 传车组 ref、sourceOid 和 mainOid。冲突时返回 409 和 conflicts，成功时返回合并提交及双亲。 |
| GET /drawio、PUT /drawio | GET 传 ref、path 和可选 oid，返回完整 xml 与 oid。PUT 传 ref、path、xml、message、expectedHead，返回新 oid。保留多页、压缩及非压缩 draw.io 数据。 |

draw.io 编辑器以后可以在 init 事件后加载 GET 返回的 XML，在 save 或 autosave 事件中执行 PUT。嵌入页应核对消息来自配置的编辑器窗口和 origin。下一次保存使用上一次成功响应的 oid。新建图直接 PUT 一个 .drawio 路径。已有相同文件且分支已变化时，先重新载入。所有编辑操作沿用车组或主线的权限。

## 连接 Windows 串口与工具链

工位使用 Python 3.11+、Git 和 pyserial 3.5。通过 POST /api/firmware/stations 创建个人工位，保存一次性返回的 key，在运行工位的进程中设置 GITPOLAR_STATION_KEY。在 tools/firmware/station.example.json 配置 NAS 地址、独立构建目录和原始工作副本路径，然后启动工位。

```powershell
python -m pip install pyserial==3.5
python tools/firmware/station.py tools/firmware/station.example.json
```

NAS 与工位之间传输仓库信息、端口数据和运行结果，团队网络部署使用 HTTPS。工位可用 Windows Git 凭据读取私有仓库。已存在于本地的固定提交直接读 Git 对象，工作副本中未提交的修改不会进入构建。工位没有监听端口。配对密钥仅授权该工位交换任务和数据，网页账号只可使用自己的工位。

| 方法与路径 | 用途 |
| --- | --- |
| GET /stations、GET /stations/{id} | 是否在线、端口列表、当前打开端口、最后心跳、支持的板卡配置。 |
| POST /stations/{id}/jobs | 用客户端生成的 UUID 作为 id。kind 可为 serial-open、serial-close、build、flash。相同请求和 id 的重试返回原操作。 |
| GET /stations/{id}/jobs 或 /jobs/{jobId} | 日志、构建标识、固件指纹及进度。状态包括 queued、running、ok、failed、unknown。工位掉线期间未领取的烧录请求过期后标为 expired。 |
| GET /stations/{id}/samples?after=序号 | 按 seq 增量读取串口数据，含端口、时间、原始 Base64 和解码事件。每次最多 128 组，保留最近 512 组，工位报告接收队列丢弃计数。 |
| GET /stations/{id}/compare?ref=目标分支 | 将当前开发板主动报告的提交与所选分支或指定 oid 比较。可附仓库相对 path 查看补丁。没有版本回报、仓库不匹配或无法找到提交时返回 unknown 和原因。 |
| POST /stations/{id}/verification | 传 flash 操作 ID、outcome（passed 或 failed）和实测 note。通过需要烧录成功且再次打开串口后读回同仓库、分支、完整提交、板型与构建 UUID。 |
| GET /stations/{id}/verification | 实机结果、经手人、时间及当时的版号证据。 |

工位按递增的批次号发送心跳。重发最近一批时，NAS 只保存一份采样，并返回该批次已领取的任务或原来的空结果。随后入队的任务由下一批新心跳领取。

串口任务传 port（如 COM5）和 baud。端口打开后持续接收，无需网页直接访问 USB。上位机接收协议依据配套的 [Serial_Port_Assistant](https://gitee.com/cambridge-linker/Serial_Port_Assistant)。接收器保留所有原始字节，对 StandardRobot++ 的 0x5A 帧执行 CRC8 和 CRC16 校验，解码 Debug 字段及 IMU 数据，支持分包和粘包。

新构建的机械臂固件在原有 SRPP USB 任务里周期发送 0xF0 只读版本帧。内容为 `GITPOLAR/1 托管域名/账号/仓库 分支 完整SHA 板型 构建UUID`，也支持独立采集工程用串口文本行回报同一格式。DM 在 SRPP 输出模式上报版本，启用 VOFA 时继续使用原数据流。旧固件可读串口。缺少身份帧或回报过期时，当前板上版本为未知。含源码身份但不含构建 UUID 的历史回报可用于比较代码。

### 构建、烧录与核验

build 任务传 profile、ref、oid。针对原 engineer 分支加 family，针对 main 加 group、family。profile 可选 engineer-dm、engineer-dji。车组分支从 ref 得到组和板型。下面的请求用原 engineer 分支构建 DM 固件。

```json
{
  "id": "b9b3b28b-a99d-48fa-8e7e-c14992328d4c",
  "kind": "build",
  "profile": "engineer-dm",
  "ref": "engineer",
  "oid": "56ccc62bed9371e4d4e35e9be2a76ac13d108bfa",
  "family": "dm",
  "generate": false
}
```

工位从该提交导出板卡源码，用 D:\Keil5\UV4\UV4.exe 构建指定 Target，检查新生成的映像和版本信息。默认使用仓库内已生成的工程。传 `generate: true` 时，工位先让 D:\ST\STM32CubeMX 按该版 .ioc 重新生成外设初始化代码，再用原有 Keil 工程编译。工位在临时副本中固定 .ioc 指定的 STM32Cube 固件包，保留自定义 Keil 分组及编译配置。首次使用相应固件包时可能需要下载。日志、映像与 SHA-256 保存在工位工作目录对应的任务 UUID 下。[ST 的 CubeMX 命令行说明](https://dev.st.com/stm32cube-docs/stm32cubemx/6.18.0/en/docs/markup/CubeMX_CLI.html)

| 板型 | 工程与 Target | 工作副本内的构建适配 |
| --- | --- | --- |
| DM | DM_board/MDK-ARM/CtrBoard-H7_StandardRobotpp.uvprojx，CtrBoard-H7_StandardRobotpp | 注入只读版本帧，保留 VOFA 输出模式。 |
| DJI | dji_board/MDK-ARM/standard_robot.uvprojx，standard_robot | 原始 56ccc62 的 Keil Target 漏列仓库已有的 lift_video 头文件目录及两份 C 源文件，工位在临时工程补全。重新生成时保留该提交的 stm32f4xx_it.c，沿用工程自定义的串口中断分工和 FreeRTOS 时钟处理。 |

工位内置上述提交的两种板卡配置，支持跨分支修改机械臂、升降图传、算法、控制器及设备库目录中的 C/H，以及 Markdown 和 draw.io。工位状态中的 editableSourceDirs 列出该目标的目录。改变构建脚本或板型配置的版本需要在工位登记相应工具链与源码树。自有独立采集工程可在 station JSON 的 profiles 中登记 id、repository、family、trees（已核对的板卡目录 Git tree）、project、target、editableSourceDirs、identityHeader 及可选 ioc，在固件串口输出 GITPOLAR_VERSION_LINE。本机程序路径和参数来自工位配置。

flash 使用新的操作 UUID、同一份构建参数，并额外传成功 build 的任务 ID。工位核对源码、Target、HEX 和 AXF 指纹，然后用已登记 Keil Target 的调试器配置下载。烧录会关闭监控端口，设备重新枚举后用 serial-open 打开正确端口再验证。工位重启时领取过而结果不确定的操作标为 unknown。

### 开发验证

```powershell
npm test
python tests/firmware_station_test.py -v
```

Node 测试通过实际 HTTP、SQLite、临时 Git 远端和真实 Git 合并验证权限、并发保存、文件比较、车组生命周期和工位接口。Python 测试覆盖串口回环、完整性校验、固件身份、工位目标与映像绑定，烧录测试使用替身。

在工程车 `engineer@56ccc62` 上，Windows 工位通过 NAS 接口分别构建了 DJI 和 DM 的仓库工程，两份 HEX 均携带所选分支、提交和构建编号，Keil 均报告 0 错误、0 警告。打开 CubeMX 重新生成选项后，DJI 也通过编译。DM 的 .ioc 保留了 UART5_RX 的 DMA 请求，生成的串口驱动没有对应的 `hdma_uart5_rx`，Keil 在中断文件报错。该提交的 DM 可使用默认构建，调整 .ioc 和板级驱动后可再选择重新生成。只有成功的构建会进入烧录流程。
