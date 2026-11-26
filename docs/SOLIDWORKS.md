# SolidWorks 项目工作流

## 上传前整理完整工程

建议一个机械项目使用一个仓库，把总装、零件、工程图、项目需要的库文件和导出文件放在同一目录内，保留相对目录关系。Git 管理实际提交的文件；它不会自动把装配引用的外部文件加入仓库。

从已有装配整理项目时，在 SolidWorks 中使用 **Pack and Go**，核对要包含的工程图、标准件和其他引用，将结果保存到项目文件夹。先在本地打开整理后的总装，检查引用，再提交整个项目目录。不要只上传一个 SLDASM 就认为所有零件也已上传。

SolidWorks 官方参考：
https://help.solidworks.com/2026/english/SolidWorks/sldworks/c_pack_go_overview.htm

## 新建 CAD 仓库

网页新建仓库时勾选 **SolidWorks / CAD template**。模板文件是 `templates/solidworks.gitattributes` 和 `templates/solidworks.gitignore`。

- 原生 `.SLDPRT`、`.SLDASM`、`.SLDDRW`、`.SLDLFP`、`.SLDDRT`，以及 `.PRTDOT`、`.ASMDOT`、`.DRWDOT` 使用 LFS，并设置 `lockable`。
- STEP/STP、Parasolid、STL、3MF 使用 LFS。扩展名匹配不区分大小写。
- 源代码、README 和未指定的文件使用普通 Git。
- 忽略 SolidWorks 临时锁文件 `~$*`，以及 `*.swp`、`*.swo`。

客户端安装 Git LFS 后：

```sh
git lfs install
git clone http://NAS_IP:4317/polar-lab/robot-cad.git
cd robot-cad
git config lfs.locksverify true
```

Git 密码使用右上角账号菜单中生成的 **gitpolar access token**。如果之前在未安装 LFS 时克隆过，只看见指针文本，先执行 `git lfs install`，再执行 `git lfs pull`。

已有仓库需要手动合并模板规则，再对希望交由 LFS 管理的文件执行 `git add --renormalize .`、提交并推送。此操作只改变后续版本，不自动缩减已经存在的普通 Git 历史。

## 在目录树与分支之间查看设计

仓库 Code 页左侧是实际 Git 文件目录树，右侧显示所选目录、文件内容或已有的 CAD 预览。点击目录前的箭头只展开/折叠导航；点击目录名进入该目录，点击 SLDPRT/SLDASM 查看对应零件/装配。Go to file 可搜索较深的文件。

上方分支菜单可搜索、切换分支，保留当前文件路径；树、提交号和预览一起更新。目标分支没有该文件时会明确提示，可继续从目录树找文件。预览只使用所选提交的原图、依赖与预览资源。

点击 Branches 查看全部分支和最近提交；New branch 可从当前版本或其他分支的已记录提交创建分支。创建后继续浏览原文件。在本机设计时，用 git fetch origin 和 git switch --track origin/新分支名 检出服务器新建的分支，再按照后面的锁定、编辑、导出预览和推送流程保存修改。

工具栏 Compare 比较所选分支与默认分支；在默认分支有其他分支时，直接提供另一分支的比较入口。比较页可在修改前/修改后的下拉框直接选择分支，或选择指定提交/标签；中间的交换按钮会保留文件路径并调换两侧。左侧文件树支持改动文件和全部文件、按路径筛选，已删除文件也保留历史入口。两侧显示分支名与提交号；点击加载两个预览后可同步查看修改前后，也可从比较页返回同一文件。总装原文件没改时保留当前装配入口，变化的引用零件单独标记。文本文件可并排查看两个版本的原文。文件 History 用于查看该路径及装配依赖的历次提交。

分支列表中的删除操作需要确认，且默认分支不能删除。先通过 Compare 保留需要的修改，再清理不再使用的分支。

## 网页 SolidWorks 面板

在仓库 **Code** 页点击工具栏的 **SolidWorks**：

- 按实际仓库内容列出装配、零件、工程图、模板、库特征和交换文件；可按名称、目录和类型过滤。
- 显示真实文件大小、Git/LFS 存储方式、LFS 原文件是否存在、锁拥有者。
- 标出由普通 Git 保存的原生 CAD 文件，方便检查 LFS 配置。
- 可锁定/解锁实际要编辑的文件，查看文件历史，或下载整份工程。

面板固定在打开时的提交，锁状态继续随其他成员操作更新。文件锁按仓库路径生效、跨分支共享。单纯的文件清单和 LFS 可用性检查不能证明装配引用齐全，接口仍返回 `referencesVerified:false`。下面的 v2 导出工具从 SolidWorks 收集引用并记录依赖快照；比较页会标明是否存在明确的依赖清单。

## 编辑、提交与解锁

推荐在 Git LFS 客户端取得锁，可同时更新本地可写属性：

```sh
git pull --ff-only
git lfs locks
git lfs lock "装配/底盘.SLDASM"
# 还会修改哪个零件或工程图，就分别锁定对应路径。
# 在 SolidWorks 中编辑、保存，提交前关闭文档。
git add .
git commit -m "Update chassis assembly"
git push origin main
git lfs unlock "装配/底盘.SLDASM"
```

网页与客户端使用同一份 Git LFS 锁。网页创建的锁能在 `git lfs locks` 中看到，客户端创建的锁也能在网页释放。**网页锁定不会更改另一台电脑上的文件权限**。如果先在网页锁定，执行 `git lfs locks --verify` 确认属于自己，再在 Windows 文件属性中解除该文件的只读属性；也可在确认后用 PowerShell 对这个文件执行 `attrib -R "装配/底盘.SLDASM"`。

Git LFS 会把可锁定但未取得锁的文件设为只读。服务器拒绝修改其他成员已锁路径的推送，即使客户端关闭 `lfs.locksverify`。锁定总装不会自动锁定被引用零件；锁定范围按实际修改的文件决定。

普通用户只能释放自己的锁。管理员可在确认对方停止编辑后使用网页 **Force unlock**，或 `git lfs unlock --force PATH`。Reader 可以浏览、查看历史和下载，不能取得或释放锁。

## 完整工程 ZIP

**Code → Download ZIP**、SolidWorks 面板的 **Download complete project**、文件页面的 **Download project** 均导出当前显示提交中的整个仓库。

- 目录结构保留在 `仓库名/` 下；普通 Git 文件原样写入，LFS 指针替换为 NAS 中实际保存的原文件。
- 同一次导出固定到同一个提交；下载过程中分支前进不会混入新版本。
- ZIP 文件名附带短提交号，便于区别版本。
- 导出前逐个核对 LFS 对象记录、磁盘文件和长度。缺失或不完整时返回 409 并列出路径，不生成看似完整的指针包。
- 大文件按流读取并写出 ZIP，使用 yazl 的自动 ZIP64 支持。不会把整份 CAD 文件读进内存，也不生成服务器工作副本。
- 不包含 `.git`、未提交文件、仓库外的引用文件或子模块内部内容。

解压后的 ZIP 可用于交付或取回文件；要继续参与版本协作，请使用 Git clone / pull。

## 查看和取回历史版本

文件页和 SolidWorks 清单中的 **History** 支持加载更早记录。SLDASM/SLDPRT 使用依赖历史：v2 清单按明确记录的依赖检查，没有依赖清单时保守检查工程 CAD 变化。其他文件按当前路径显示提交。改名以前的旧路径历史不会自动拼接。仓库文件表头的 **History** 显示整个项目的提交。

每条记录提供：

- **View version**：查看这个提交下的文件，页面显示版本号，并提供回到默认分支的入口。
- **Download file**：取回该版本的原始文件，包括 LFS 二进制。
- **Project ZIP**：取回该提交下的整个项目，便于同时还原相匹配的总装、零件与图纸。

机械装配优先取回整个项目，避免只下载一个历史总装却继续使用新版本零件。在 Git 工作副本中另开历史评审分支，可在当前修改已保存的情况下执行：

```sh
git fetch origin
git switch -c review/cad-version COMMIT_SHA
git lfs pull
```

将 `COMMIT_SHA` 替换为 History 中对应提交的完整 SHA。此操作创建评审分支；NAS 上的默认分支不会因此回退。

## 装配体和零件三维预览

打开 STEP/STP 或 STL 文件页，点击 **Load 3D preview**。支持旋转、平移、缩放、等轴/前/顶/右视图、适应窗口、轮廓边、实体隐藏、单独查看、爆炸展开和全屏。STEP 解析在浏览器后台线程执行，模型与解析资源都从自己的 NAS 加载。

原生 SLDASM/SLDPRT 文件页显示已登记的 STEP/STL 预览。辅助脚本生成预览并写入 `.gitpolar/previews.json`；源文件、预览、清单在同一次 Git 提交中推送。网页不会把原生文档当作可直接解析的 STEP。

### 使用 SolidWorks 自动导出

将仓库提供的 `tools/Export-SolidWorksPreview.ps1` 保存到本机工具目录。自动导出分支使用 **Windows PowerShell 5.1**，连接已经打开的 SolidWorks，不会自行启动它。先在 SolidWorks 中打开仓库内的总装或零件，解析需要显示的组件并保存全部改动，再执行：

```powershell
powershell.exe -NoProfile -File "C:\gitpolar-tools\Export-SolidWorksPreview.ps1" -RepoRoot "D:\work\robot-cad"
```

脚本导出当前活动文档/配置的 STEP 到 `.gitpolar/previews/`，保留 SolidWorks 导出的实体位置；不执行 Git 提交或推送。然后在项目工作副本中运行：

```sh
git add .
git commit -m "Update CAD and matching preview"
git push origin main
```

自动导出使用 `IModelDocExtension.SaveAs`；该 COM 导出分支仍需在实际安装 SolidWorks 的工作站验证。登记、版本校验和浏览器 STEP/STL 渲染分别验证。预览对应导出时的活动配置，切换配置后应重新导出。

### 登记手动导出的 STEP/STL

如果已经从当前保存的总装/零件导出了 STEP 或 STL，把导出文件放入仓库，再执行：

```powershell
powershell.exe -NoProfile -File "C:\gitpolar-tools\Export-SolidWorksPreview.ps1" -RepoRoot "D:\work\robot-cad" -Source "装配/底盘.SLDASM" -Preview "预览/底盘.step" -RegisterOnly
```

手动登记要求导出确实对应当前源文件；它不能从一个独立 STEP 反推出是哪一份 SLDASM 生成的。脚本核对文件路径和 Git 内容标识，并写入清单。

### 预览与源版本匹配

登记时计算仓库内全部原生 CAD 路径与经过 Git/LFS 过滤后的 blob 标识的指纹。网页对所查看的提交重新计算同一指纹，并检查导出文件本身的 blob 标识。因此只修改零件、没有修改 SLDASM，也会让原装配预览过期；更改 STEP 后未重新登记也会过期。历史提交仍可使用当时匹配的预览。

这是按仓库内原生 CAD 文件集合进行的校验，不是对 SolidWorks 外部引用的解析。外部库文件应先通过 Pack and Go 收集到仓库。爆炸展开是便于查看的实体平移，不模拟装配配合或关节运动。STL 通常只有网格实体，其单位由导出设置决定；STEP 显示单位为毫米。

默认单个预览文件上限为 128 MiB，可通过 `PREVIEW_MAX_BYTES` 调整。这个限制独立于 LFS 文件存储限制；过大的装配建议使用较轻的展示模型。

## 当前验证范围

集成测试使用明确标注的合成二进制，验证中文目录、推送/拉取、原文件字节、当前/历史 ZIP、网页与 CLI 锁互通、权限与缺失对象错误。它不代表真实 SolidWorks 装配打开验证。

三维预览通过 STEP/STL 或分体显示网格实现；新版 Windows 工具通过 SolidWorks API 收集引用，NAS 不直接解析 SLDASM/SLDPRT 二进制。二进制几何合并及特征/尺寸级自动差异识别尚未实现。


## 节省空间的装配预览与双版本比较（v0.5）

在 SolidWorks 中保存项目全部修改后，使用 Windows PowerShell 5.1：

~~~powershell
powershell.exe -NoProfile -STA -File "C:\gitpolar-tools\Export-SolidWorksProject.ps1" -RepoRoot "D:\work\robot-cad" -Source "装配\底盘.SLDASM"
git add .
git commit -m "Adjust battery holder mounting holes"
git push origin main
~~~

也可在保留两个脚本的工具目录中使用旧入口并添加 `-Incremental` 和 `-Source` 参数。工具随 NAS 发布包的 tools/ 目录提供，模型始终在 Windows 本机导出，不上传云端。

新版工具通过 SolidWorks 类型接口读取已解析文档的实体显示三角网格，按每个实体网格内容的 SHA-256 保存二进制 STL，单位 mm。相同内容只保留同一资源路径；重复运行不重写资源。装配清单记录各实例的配置、原始文件、名称、位置矩阵和源文件经过 Git LFS 过滤后的对象 ID。相同零件出现多次时复用几何，实例位置分别记录。只移动实例时通常只更新 JSON 清单，不新增网格。

每次导出仍读取所显示实体的网格以确定内容是否相同；这是增量存储，不承诺跳过所有未变零件的转换 CPU 时间。显示网格精度取决于 SolidWorks 的图像质量设置；缺少显示网格时调用本机 SolidWorks 的实体网格化接口。纯草图不生成实体网格；无法网格化且面积不超过 0.0001 mm² 的退化薄片记录在 nonGeometricComponents 中，其余实体失败会中止导出。原始 SLDASM/SLDPRT 完整保留，网格不用于制造尺寸判定。比较时按组件实例和唯一实体名匹配，避免实体枚举顺序重排造成大量假增删；实体改名或同名且无法唯一匹配时，仍可能显示为新增/删除。比较位姿时忽略 0.0001 mm 以下的平移及 1e-8 以下的旋转矩阵元素差异，这是显示判定，不用于制造测量。

使用要求：

- 当前可见的持久化组件必须位于仓库内；确实在仓库外的组件需要先通过 Pack and Go 收集。嵌入的虚拟组件及 3D Interconnect 缓存按所属持久化装配文件追踪，不需要为预览强制拆成独立文件。历史设计引用或已压缩组件的缺失路径记录在 unresolvedReferences 中；这不代表缺失配置可以重新构建。
- 导出前保存已经打开文档中的设计修改。工具从磁盘新打开的只读装配，允许因解析最新已保存零件而出现的重建标记；不会自动保存大总装的显示缓存。已隐藏、压缩的组件及其子组件不进入当前显示场景；实际存在的引用仍记录在依赖清单中。装配上下文的用户实体保留该上下文几何。
- 工具可以连接已运行的 SolidWorks，必要时启动自己的实例。仅关闭自己打开的源文档或自己启动的进程，恢复此前活动文档，不保存用户其他文档。文档配置选择不同且文档已由用户打开时，要求先在 SolidWorks 激活并保存所需配置。
- 可用 -Configuration 选择已保存配置，-InteropDirectory 指定非默认安装的 api/redist 目录。只读 CAD 文件也能生成预览。

在仓库或文件页面点击 **Compare**。修改前/后可填写分支、标签或完整提交号，默认比较当前提交与其第一个父提交。支持两个预览同步旋转、缩放、切换视角，以及按文件/实例突出新增、删除、修改和移动。勾选“只看原图变化零件”可将两侧同步聚焦到变化实例；取消后恢复完整装配。点击文件变化列表可切换比较对象。两侧的原件、依赖和预览都固定到各自完整提交，不混用最新零件。

装配历史按第一父提交链检查历史清单与依赖对象：总装文件没变、引用零件变化的提交仍会出现，标记为“引用零件变化”；历史中加入/删除依赖也会被识别。旧清单缺少明确依赖时退回整个 CAD 工程范围，可能多显示其他零件的变化。

单独替换已登记的 STEP/STL、替换分体预览中的网格，或重新登记使过期预览恢复可用，都会在对应提交中显示为“预览或配置变化”。历史使用各个提交中实际保存的文件版本。

容量统计是 head 中相对 base 新增的独立内容之和，区分原生 CAD、预览和其他文件；它不包含 Git 打包开销、压缩、文件系统分配和其他分支已有对象，不能等同 NAS 实际磁盘增量。Git LFS 对变化的原文件仍保存完整新版本。保留旧提交所需的资源；不要为节省空间删除仍被历史版本引用的网格。

旧版 version:1 单 STEP/STL 清单仍然可读；v2 清单也允许保留未迁移的 v1 条目，新生成条目使用明确依赖和分体几何。两种格式可分别出现在比较页左右两侧。

紫色表示网格有变化而源文件内容未改，可能来自重新网格化或装配上下文；黄色表示原图文件或引用配置改变。“只看原图变化零件”聚焦原图变化和明显的实例位移，保留其余网格变化供完整装配中查看。


## 2026-11-26：原生窗口预览（0.6.4）

原生 Git Graph 不再读取 CAD 文件内嵌的线框缩略图。插件从对应 Git/LFS 提交隔离取出图纸及引用，后台生成浅灰背景、等轴测、着色带边线的图像，裁切留白并缓存在工作副本外。选中不同提交后，按目录树中的图纸显示修改前后预览；任意一侧失败不阻塞另一侧。原生预览和 NAS 网页的 STEP/网格预览分别缓存；原生图像生成需要安装 SolidWorks 的 Windows 工作站。操作和验证脚本见 solidworks-addin/README.md。
