# 界面预设与个人主页

在账户菜单选择 **Appearance**，或直接访问 `/#/settings/appearance`。

- **原版工作区**：保留竖向应用导航、原有工作台及 Serpent 相册布局。
- **GitHub**：使用顶栏、橙色下划线页签、Dashboard 三栏动态、个人主页与设置布局；Gitpolar 名称和现有图标保持不变。

默认使用 GitHub 预设。预设与 Light / Dark / Sync with system 选择保存到飞书账号；浏览器缓存设置用于页面启动。两套预设共用现有仓库、采购、相册、权限和飞书登录，不需要复制业务数据。

GitHub 预设在按钮按下处显示高光，仓库、分支和相册的选中标记会滑到新位置。鼠标、触屏和键盘均可按原方式操作。在系统辅助功能中开启「减少动态效果」后，页面与菜单直接切换。

当前风格的保存点为 Git 标签 `gitpolar-workspace-preset-20261128`。`ui/workspace-manifest.json` 记录保存时的前端文件 SHA-256，额外完整源码快照由发布流程保留。原版布局的 CSS 留在原路径，新预设通过 `data-preset="github"` 应用独立样式。

## 页面入口

| 页面 | 地址 |
| --- | --- |
| Dashboard | `/#/` |
| 自己的个人主页 | `/#/profile` |
| 成员主页 | `/#/users/用户名` |
| 个人仓库与 Stars | `/#/profile/repositories`、`/#/profile/stars` |
| 个人资料设置 | `/#/settings/profile` |
| 外观设置 | `/#/settings/appearance` |
| 个人文件 | `/#/files` |
| 相册、采购、后台 | `/albums/`、`/procurement/`、`/admin/` |

主页置顶最多六个实际存在的仓库。名称、简介、单位、位置和网址通过资料设置保存，用户可以关注其他团队成员。贡献方格读取本实例 Git 提交和议题；提交作者按账号名、显示名或 Gitpolar 邮箱归属，使用北京时间按日分组，不生成示例贡献。原有个人工作台账号只能访问自己的资料和文件。

## 后端接口

- `GET|PUT /api/me/appearance`：`preset` 为 `github|workspace`，`colorMode` 为 `light|dark|system`。
- `PATCH /api/me/profile`：更新 `name`、`bio`、`company`、`location`、`website` 或 `pins`。
- `GET /api/profiles/:username`：资料、仓库、Stars、贡献和关注人数；可传 `year`。
- `PUT|DELETE /api/profiles/:username/follow`：关注或取消关注。
- `GET /api/profiles/:username/followers|following`：对应成员列表。

持久资料保存在 SQLite。写接口沿用飞书会话及同源检查，界面主题不改变角色权限。

## 验证

`npm test` 包含资料、账号独立预设、真实贡献、关注和静态资源回归。安装 Python Pillow、Playwright Chromium 后，可运行 `python tests/interface-workspace.e2e.py`，验证真实页面的资料更新、仓库置顶、原版恢复、深浅主题、Git Graph、采购、后台和移动视口。截图写入忽略目录 `artifacts/interface-ui/`。

详细的 10 轮对照、验证及尚存差异见 [GitHub 预设审查记录](GITHUB-PRESET-AUDIT.md)。分支选择器支持 Branches / Tags 和键盘选择，相册 PR 可从 Dashboard 或仓库 Pull requests 直接进入审核。
