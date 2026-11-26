# gitpolar · SolidWorks 原生 Git Graph

SolidWorks 的 Windows x64 插件。深色提交列表、彩色分支连线、分支与标签、右键菜单，以及下方的文件和 CAD 预览面板，均使用原生 WinForms 绘制。

## 安装与构建

需要 SolidWorks、.NET Framework 4.8、Git for Windows 和 Git LFS。本机运行验证版本为 SolidWorks 2025 SP5.0。

```powershell
.\Build.ps1
.\Test-LocalGit.ps1
.\Test-Repository.ps1
.\Test-ManualMergeGit.ps1
powershell.exe -STA -File .\Test-MergeDialogs.ps1
powershell.exe -STA -File .\Test-WindowLifecycle.ps1
```

构建使用本机 .NET Framework 编译器及已安装的 SolidWorks interop，产物在 `bin-native/`。解压 `gitpolar-solidworks-addin.zip` 到固定位置后，用 Windows PowerShell 执行：

```powershell
.\Install.ps1 -Workspace 'D:\CAD\project' -Repository 'project' -LoadNow
```

使用 `-LoadNow` 前先打开 SolidWorks。安装器会从当前电脑的 SolidWorks 安装目录复制 interop，并为当前用户注册 COM。以管理员身份运行还会登记“工具 → 插件”所需的机器级条目；只执行当前用户注册时，支持本次会话加载，自动启动发现尚未保证。

在插件里选择本地 Git 工作副本；连接地址取自该副本的 `origin`。NAS 认证使用本机 Git 凭据管理器，事先配置 gitpolar 用户名和访问令牌。

## 三种入口

通过侧边栏“显示方式”或上方 gitpolar →“显示设置”切换，设置会保存在本机。

| 方式 | 日常用法 |
| --- | --- |
| 侧边栏 | 右侧任务窗格显示“保存当前成果”、简版提交图、分支与本地改动状态；可打开完整提交图。 |
| 上方工具栏 | 在 SolidWorks CommandManager 的 gitpolar 页签和菜单中使用“保存当前成果”“Git Graph”“侧边栏”“显示设置”。 |
| 独立窗口 | 显示可调整大小的原生 Git Graph，集中查看分支、提交、修改文件和历史 CAD。 |

侧边栏顶部依次提供“打开完整 Git Graph”“分支管理 / 合并”“保存当前成果”，下面是当前图纸状态、更新/推送和提交历史。完整 Git Graph 与分支管理均为 SolidWorks 原生窗口。首次启动无需先打开图纸或手动切换其他任务页；缩短窗口时侧栏可滚动，主要入口保持在内容顶部。

三个入口共用工作副本和操作状态；保存期间会阻止重复执行写入操作。工具栏模式下，保存进度和错误也会写入 SolidWorks 状态栏。

## 画一会，点一下保存

1. 打开工作副本中的零件、装配体或工程图并编辑。
2. 点击“保存当前成果”。插件保存当前工作副本中已修改的打开图纸；对于配置了 origin 的 LFS `lockable` 文件，会先确认锁归属并自动取得自己的编辑锁。队友已锁定的文件会显示锁定者。
3. 根据设置为当前零件或装配体生成增量预览，提交源文件及对应预览，并生成带文件名与时间的提交说明。
4. 启用“提交后推送 NAS”且配置 origin 时，执行 Git push 和 Git LFS 上传。成功后刷新提交图并记录最近保存时间。没有文件改动时不会创建空提交。

“显示与保存设置”可以关闭每次导出预览，也可以只做本地提交。大型装配导出时间取决于模型规模。一次快捷保存包含当前工作副本中的所有源文件改动；需要挑选文件或填写说明时，用完整窗口左上角的提交选项按钮。

保存后继续保留自己的编辑锁，方便接着画；完成编辑交接时，在“分支管理 / 合并 → 编辑锁”选择图纸并点击“释放自己的锁”。锁按仓库路径生效。NAS 推送失败时本地提交仍保留，可通过完整窗口的 Push 重试。

## 原生 Git Graph 与实体预览（0.6.5.5）

完整窗口采用 VS Code 风格的活动栏、源代码管理侧栏、编辑器标签、图标工具栏、24 像素提交行、彩色分支标签和蓝色状态栏。点击左侧分支过滤历史；右键提交仍可创建分支、比较及打开图纸。分支管理和人工合图均在原生窗口内操作。

选择提交后，在下方目录树点击零件或装配体。Ctrl/Shift 点击另一个提交可比较两版，预览标题显示固定提交号。点击右侧展开按钮可扩大预览区域。

预览从各自固定提交取出 Git/LFS 原文件和关联图纸，使用独立文件名重连历史依赖，以只读方式在 SolidWorks 后台生成等轴测、着色并显示边线的图像。生成后关闭预览副本，恢复原先活动文档及背景设置；模型按实体范围裁切留白。预览缓存放在本机 `%LOCALAPPDATA%/gitpolar/solidworks/renders/`，不进入 Git 提交。

每侧单独显示生成状态或缺失文件提示；某一提交没有该文件时，另一侧仍会加载。首轮生成时间取决于装配大小，后续按仓库、提交、文件及渲染样式读取缓存。需要旋转或检查特征时，点击“打开此版本”进入 SolidWorks。零件存在未纳入仓库的旧上下文引用时，只显示该提交内已保存的实体，并注明“外部引用未更新”。历史装配的组件引用仍须在该提交中唯一解析。快速切换提交会取消尚未开始的旧预览请求；缺失或失败的一侧不会显示为已就绪。

真实 SolidWorks 验证（后台运行）：

```powershell
powershell.exe -STA -File .\Test-HistoricalPreview.ps1 -Workspace <仓库> -Oid <提交> -Path 零件/电池板.SLDPRT -Image <输出PNG>
powershell.exe -STA -File .\Test-EditorUi.ps1 -Workspace <仓库> -Head <新提交> -Base <旧提交> -Path 零件/电池板.SLDPRT -OutputDirectory <截图目录>
```

## SolidWorks 宿主联动（0.6.5.5）

侧栏显示当前活动零件、装配体或工程图，以及未保存、只读和工作副本归属状态。切换或关闭文档后自动更新；无活动文档、新建未另存文件、只读历史副本或其他工作副本文件下，“保存当前成果”不可用。SolidWorks 顶部命令使用相同的可用状态，并为保存、提交图、侧栏、设置、分支、更新和推送显示独立图标。

任务窗格使用单独的稳定子窗口承接 SolidWorks 原生尺寸，滚动和布局在内部视图完成。若启动时 SolidWorks 报告 gitpolar 已选中、但实际宿主仍隐藏，界面线程延后完成该标签的原生激活；用户选择其他任务页时不会夺回焦点。`Test-TaskPaneEmbedding.ps1` 核对实际 HWND 的父子关系、祖先裁剪、顶部按钮范围、三次标签切换以及窗口缩放恢复；普通控件截图不能替代这项检查。

侧栏在界面线程延后读取活动文档，命令可用性回调和 CAD 状态诊断只读取托管缓存；关闭/切换图纸的原生事件回调中不访问模型对象；图纸切换时暂不可用的 COM 对象会延后读取。预览临时文档不参与编辑上下文。预览生成结束后恢复仓库状态，不保留过期的生成进度。

本机适配验证使用 SolidWorks 2025 SP5.0、Windows x64 和 .NET Framework 4.8。安装在其他 SolidWorks 版本或多显示器缩放环境前，需要分别验证；工程图的完整保存/比较流程和复杂配置切换不包含在本轮宿主回归中。

```powershell
powershell.exe -STA -File .\Test-EditorUi.ps1 -Stress -Workspace <独立验证仓库> -Head <提交> -Base <提交> -Path 零件/电池板.SLDPRT -OutputDirectory <截图目录>
powershell.exe -File .\Test-NativeHost.ps1 -Workspace <独立验证仓库> -Report <报告JSON> -ScreenshotDirectory <截图目录>
```

未配置默认零件模板时，可在宿主回归中用 `-PartTemplate <本机.prtdot>` 明确指定现有模板；该参数不会更改 SolidWorks 默认模板设置。

宿主回归仅可在独立测试工程中运行：它关闭并重开该工程已保存图纸，创建并关闭一个临时未保存零件和只读副本，然后切换三种显示方式。发现其他项目或未保存图纸时停止，不关闭它们。

## 图形化分支与同步

侧边栏“分支管理 / 同步”、Git Graph 上方“分支管理”和 SolidWorks 顶部 gitpolar 页签都可进入同一个原生窗口。

| 页签 / 按钮 | 操作 |
| --- | --- |
| 新建分支 | 从当前 HEAD、所选提交、本地/远端分支或标签创建；可立即切换并发布到 NAS。 |
| 分支 | 查看本地与远端分支、当前分支和跟踪状态；切换、重命名、删除、设置跟踪、合并到当前分支。远端分支首次切换会建立对应本地跟踪分支。 |
| 更新当前分支 | 从跟踪的远端分支仅快进拉取，避免隐式产生合并；分叉时可在列表选择需要合入的分支。 |
| 发布 / 推送 | 推送当前分支和 LFS 文件；首次发布自动设置跟踪。 |
| 工作区 | 查看修改文件、保存当前成果、进入提交选项和锁定所选图纸。 |
| 暂存 | 保存当前工作区（含未跟踪文件）、恢复或删除本地暂存。恢复后保留原暂存。 |
| 标签 | 从指定版本创建标签，推送标签，删除本地或远端标签。 |
| 冲突 | 列出冲突文件，保留一边、导入双分支装配，或将已手工保存的文件标记解决；完成或中止合并。 |
| 人工合图 | 将固定的两边装配体连同依赖取出，插入临时总装；手工合图后核对结果保存路径、应用结果，再生成双亲合并提交。 |
| 编辑锁 | 查看锁持有人，取得编辑锁，释放自己的锁。 |
| 仓库连接 | 修改 NAS 的 HTTP(S) origin 地址，认证沿用本机 Git 凭据管理器。 |

删除会先确认；本地未合并分支拒绝删除。切换、更新、合并或恢复暂存会保存并关闭项目图纸，完成后重新打开；其他工作副本和历史文件不参与。发生合并冲突时图纸保持关闭，冲突处理完后再恢复。

## 人工合图合并（0.6.3）

1. 在“分支”页选择要合入的分支，点击 **人工合图合并…**，选择 A（当前分支）和 B（合入分支）的总装。可以并排放置，也可以按同一原点叠放。已有 Git 冲突时，从“冲突 / 人工合图”页点击 **导入双分支装配…**。
2. 插件按固定的 HEAD / MERGE_HEAD 取出完整图纸，通过本机 Git LFS 恢复实际内容。两边的文件分别命名并重连引用，再插入一个独立临时总装；工作副本里的图纸保持关闭。复制不会修改原分支文件。
3. 在 SolidWorks 中手工选择、删除、复制、替换组件和调整配合；可以解散不需要的比较层级，也可以另存一个最终总装。正常保存。合图目录、提交身份和进度记录在本机，关闭窗口或重新启动 SolidWorks 后可点击 **打开合图装配** 继续。
4. 激活最终总装，点击 **应用人工结果…**。选择最终的 .SLDASM，核对总装及全部依赖的仓库相对路径。路径可以编辑；同时保留两边同名文件时，默认使用不同名字，避免覆盖。
5. 勾选“我已完成手工合图…”后应用。插件用 SolidWorks Pack and Go 导出全部关联图纸，重连到最终工作副本路径，检查引用不依赖临时合图目录；取得需要的 LFS 编辑锁后写回，并只暂存这些结果文件。对应冲突此时标记解决，其他冲突仍需单独处理。
6. 点击 **完成合并**，生成保留 A、B 两个父提交的 Git 合并提交，再按需推送 NAS。即使 Git 没有发现文件冲突，“人工合图合并”也会暂停，等待明确应用人工结果。

应用结果后再修改图纸，需要重新应用；未保存、未标记或提交身份发生变化时，不能完成旧会话的合并。中止会恢复 Git 工作副本，保留本机的人工合图副本和被覆盖文件备份。

零件、子装配及设计外部引用需要纳入仓库。无法唯一匹配的同名引用、仓库外的关联图纸和未外部保存的虚拟零件会提示处理；插件不会从当前打开的其他项目猜测引用。工程图冲突仍可逐个选版或手工保存后标记。

本机实测：两边包含同名总装、子装配、零件，厚度分别为 4 / 6 mm；导入后仍读取各自版本，人工编辑为 5 mm 后写回三个原仓库路径，重新打开确认 5 mm，最终提交保留精确的两个父提交。独立 Git 回归另覆盖无冲突暂停、显式确认、只暂存指定冲突、过期会话、结果修改及中止。`Test-CadMergeResult.ps1 -Workspace <独立验证仓库> -ExpectedThicknessMm 5` 可在 SolidWorks 打开验证结果后复核父提交、文件指纹、全部组件引用及实体尺寸；原生对话框回归检查默认/最小尺寸下的确认按钮和编辑路径提交。

## 稳定性验证

0.6.2 修复了窗口关闭或 SolidWorks 退出后，异步刷新仍访问已释放控件的路径。异步回调绑定插件任务窗格的生命周期，关闭后停止投递；所有界面入口都会恢复宿主原有的同步上下文。回归测试覆盖加载中连续关闭 24 个窗口，以及任务窗格销毁后的延迟回调。

## 提交图与历史 CAD

- 按实际 Git 父子关系绘制分叉、合并和标签。支持分支筛选、描述/作者/SHA 搜索、键盘选择及加载更多。
- 选择提交查看父提交、修改文件和已保存的 SolidWorks 缩略图；内部 `.gitpolar/` 预览资源不混入源文件列表。
- Ctrl/Shift 选择另一提交，或使用右键“Select for Comparison”，查看两次保存的 CAD 预览。
- 双击修改文件或点击 Open CAD，在 SolidWorks 中以只读方式打开完整历史版本。先关闭同名当前图纸，避免 SolidWorks 替换引用。
- 历史打开使用独立 detached worktree，优先读取共享本地 LFS 对象，仅在缺少 CAD 时从 origin 获取；不会为此恢复网页预览网格。
- Fetch、Push、仅快进 Pull、创建与切换分支都使用本地 Git。切换、更新和合并前自动保存并关闭本工作副本的图纸，操作结束后重开。工作副本需要先提交或暂存改动。
- 仓库菜单可以导出实际原生窗口 PNG，窗口被其他应用遮挡时也可导出。

预览区使用普通浅灰背景；旧青色背景的扁平缩略图会统一为灰色零件轮廓。

侧边栏和提交图里的缩略图是静态预览。完整三维检查在 SolidWorks 中进行；尚未实现尺寸/特征级自动几何差异及二进制 CAD 自动合并。

## 本机文件与卸载

设置与日志在 `%LOCALAPPDATA%\gitpolar\solidworks`。`previews/` 缓存精确历史源文件及缩略图，`merges/` 存放独立合图目录，Git 私有目录里的 `gitpolar-cad-merge.json` 记录会话；`history/` 存放登记的历史 worktree；与编辑工作副本分开。删除登记的历史工作副本使用 `git worktree remove`。

`Uninstall.ps1` 移除注册，保留图纸、设置和历史。更换已加载 DLL 前关闭 SolidWorks。

## 后台验证接口

通过 `ISldWorks.GetAddInObject("Gitpolar.SolidWorks.Addin")` 获取本地 COM IDispatch：

- `GetStateJson()`：当前模式、原生窗口、所选提交、预览、保存状态与上方命令 ID。
- `SetDisplayMode("sidebar" | "toolbar" | "window")`：切换三种入口。
- `OnQuickSave()`：执行与按钮一致的快捷保存。
- `OnShowBranches()` / `OnPull()` / `OnPush()`：分支管理、更新和推送。
- `RunRepositoryAction(action, json)`：调用与界面相同的仓库操作；人工合图支持 `merge-manual`、`prepare-cad-merge`、`open-cad-merge`、`inspect-cad-result`、`apply-cad-result`、`mark-manual-resolved`、`continue-merge`。
- `SaveBranchesScreenshot(path)`：导出分支管理窗口。
- `CloseGraph()` / `CloseBranches()`：关闭插件窗口，用于生命周期回归。
- `SelectRevision(head, baseline, path)`：按精确提交选择对比。
- `OpenRevision(oid, path)`：只读打开历史 CAD。
- `SaveScreenshot(path)` / `SaveSidebarScreenshot(path)`：导出实际窗口或侧边栏。

进程外客户端使用 IDispatch 调用，无需自定义接口封送器。界面操作统一调度至 SolidWorks 的界面线程；没有开启 HTTP 自动化端口。

## 界面参考

参考了 `mhutchie/vscode-git-graph` 的公开界面和交互。Git 拓扑、分支连线、原生绘制和 SolidWorks 集成由本项目实现。
