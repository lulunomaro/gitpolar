# Gitpolar 仓库协作

飞书团队成员登录后，从 **Repositories** 打开仓库。相册投稿在相册仓库的 **Pull requests** 下进入，普通仓库和 Fork 之间的代码、图纸评审使用仓库的 **Pull requests** 页。

## 提交和合并图纸

1. 在仓库的分支选择器打开 **Branches**，从当前版本创建工作分支。也可以在 **Fork** 页面创建自己的仓库副本。Fork 继承分支、标签和 LFS 文件，在同一文件系统中复用 LFS 数据块。
2. 保存并推送修改。在目标仓库选择 **Pull requests → New pull request**，选目标分支、源仓库和源分支。
3. 队友可以查看提交、逐文件差异、添加文件评论、批准或要求修改。**Compare files and CAD assemblies** 打开两个不可变版本的 CAD 对比，三维预览使用对应提交中的预览资源。
4. 文本修改可以直接 **Merge pull request**。二进制装配体需要人工合图时，从当前目标分支创建结果分支，将处理好的装配体和引用零件一起提交并推送。在 PR 的 **Conversation → Confirm a manually resolved assembly** 选择结果分支、填写说明，再点 **Use this saved revision**。Gitpolar 使用所选提交的完整文件树，保留目标分支、源分支和独立结果提交的历史。

**Settings → Pull requests and workflows** 可设为合并前必须由另一名成员批准。源分支的提交发生变化时，需要重新批准。队友持有的文件锁同样适用于网页合并。

## 议题、项目和通知

- 在 Issue 详情评论、分配成员、设置仓库标签、关闭或重开。列表可按 `author:`、`assignee:`、`label:` 和状态筛选。
- **Projects** 可以加入本仓库的 Issue、PR 和草稿，用看板、表格、按日期的路线图查看。项目可以保存带状态筛选条件的视图，并给条目添加文本、数值和日期字段。
- 顶栏 **Notifications** 显示所关注仓库、参与的讨论、任务分配及 @ 提及。通知可以逐条或全部标为已读。账号设置可分别调整关注和参与通知。
- **Packages** 可以从仓库指定提交发布文件版本，发布记录固定到提交。成员可以从仓库下载，在发布者的个人主页查询。这是通用文件制品仓库。

## NAS 自动检查

**Actions → Run workflow** 可运行 Git 对象完整性检查、代码扫描或选定分支下的 `.github/workflows/*.yml`。自动运行由仓库负责人在仓库设置中启用，日志和结果按提交保存。**Security and quality** 可查看扫描告警、导入 SARIF 2.1.0 文件、处理告警或提交仅报告人和维护者可见的报告。

以下工作流在 Linux NAS 上运行，可放入仓库的 `.github/workflows/check.yml`。

```yaml
name: Repository check
on: [push, pull_request, workflow_dispatch]
jobs:
  verify:
    runs-on: gitpolar
    steps:
      - uses: actions/checkout@v4
      - name: Check project README
        run: test -s README.md
```

内置工作器支持 shell 步骤、checkout、job 的 `needs` 和 branch 筛选。作业读取指定提交的 Git 快照，使用临时文件系统和离线 Linux 工具。LFS 文件在工作流快照中为 Git 指针。需要第三方工具的团队可以把现有扫描器的 SARIF 结果导入对应分支。自定义 shell 工作流需要 Python 3、PyYAML、`prlimit` 和支持 `--disable-userns`、`--size` 的 bubblewrap。宿主机要允许非特权用户命名空间。独立安装的实例工作器可放在 `/opt/gitpolar/runtime/bin/bwrap`。
