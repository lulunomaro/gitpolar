# NAS 活动相册仓库

相册是普通 Git 仓库的一种展示方式。原图使用 Git LFS，目录和日期索引保存在 `.gitpolar/album.json`。主站仓库列表、仓库页和导航抽屉都有可视化相册入口，仍使用原有飞书登录与团队内部权限。

## 导入

先核对拥有者在同一个飞书应用下的身份。管理员可以将已核实的通讯录用户预先关联到 Gitpolar；此操作不创建本地密码，也不替用户登录。拥有者以后使用本人的飞书账号扫码即可识别为同一成员。导入脚本只接受已经绑定飞书身份的用户 ID。

在 NAS 上，以服务用户运行，加载现有服务环境配置后执行：

```sh
node scripts/import-photo-album.mjs \
  --source '/mnt/photos/活动原图' \
  --name team-activities \
  --owner-id 12 \
  --title '队伍活动相册' \
  --python python3
```

`--owner-id` 以实际用户数据库为准，不要照抄其他部署中的编号。需要 Node.js 24、Git、Python 3 和 Pillow；Ubuntu 可安装 `python3-pil`。`--env FILE` 可加载指定环境文件，但运行用户需要有读取权限，部署时应沿用 systemd 的环境与服务身份。

原上传目录保持不变。首次导入会在现有 LFS 机械硬盘上保存独立、不可变的原图对象；内容相同的照片共用同一个 SHA-256 对象。预览缓存位于 `DATA_DIR/album-previews/仓库ID`，可重新生成。导入遇到坏图会明确报错并在提交前停止，成功导入会生成一个 Git 提交。重复运行可以更新索引和照片集合，原来的提交仍可查看。

照片按原目录分组，`相册封面` 子目录用作父相册封面。日期先取原目录中的活动日期，再使用 EXIF 或文件名。区间、月份和只有年份的日期保留其精度；没有日期时标记未知，不用下载或上传时间补拍摄日期。

## 浏览与版本

- `/albums/`：相册仓库列表。
- `/albums/?repo=team-activities`：按活动与年份浏览照片。
- `/albums/?repo=team-activities&ref=分支名或提交ID`：浏览指定版本。
- 原仓库页保留文件树、分支和 Git Graph；照片路径是 `photos/原有目录/文件名`。

缩略图和大图 URL 固定到当前 Git 提交，切换分支后不会混用另一个版本。索引与原图内容不一致时返回明确错误，重新导入后才展示新图。点开照片可左右切换、使用键盘方向键，并下载原图。

需要复制全部原图时正常 `git clone` 并运行 `git lfs pull`。只需要目录和版本记录时，设置 `GIT_LFS_SKIP_SMUDGE=1` 再克隆，可避免拉取所有原图。

## 接口

以下接口均要求现有 Gitpolar 登录或访问令牌：

- `GET /api/albums`：相册仓库与拥有者、照片数量、年份、封面。
- `GET /api/repos/:name/album?ref=main`：指定提交的相册和照片索引。
- `GET|HEAD /api/repos/:name/album/media?ref=提交ID&id=照片ID&size=thumb|preview|original`：缩略图、大图或原图下载。原图保持原文件格式，派生预览为 JPEG。

## Serpent 筛片与桌面导出

在仓库首页选择活动，或点「全部照片」跨活动筛片。支持等高排列和瀑布流，两种排版直接使用 Serpent v0.3.8 的布局算法。切换后浏览器记住布局。按年份、星级、标签或名称筛选，打开大图，在「星级与标签」中整理。保存会在当前分支创建小型 JSON 提交，协作者刷新后即可看到。历史提交、标签版本和只读账号均可查看整理结果。

在一个活动的照片页打开「导出到 Serpent」并下载 ZIP，解压后在 Serpent 的「导入外部资源库／导入 Eagle 资源库」中选择 `.library` 文件夹。包内含该提交的原图、活动分类、日期、星级、标签和原路径。桌面修改保存在桌面库中。NAS 按请求从 Git LFS 流式导出。

- `PUT /api/repos/:name/album/selection?ref=分支` 传入 `id, expectedHead, rating, tags`。星级为 0–5，0 表示未打星。分支更新冲突返回 409。整理信息保存在 `.gitpolar/curation/<活动ID>.json`。
- `GET /api/repos/:name/album/serpent?ref=提交ID&activity=活动ID` 下载这个活动的 Eagle 兼容资源库。

上游排版源码为 [asset-grid-layout.ts](https://github.com/dolag233/Serpent/blob/b3714d416379ba546abfb5065bf2f447dec43314/src/renderer/asset-grid-layout.ts)，外部库格式对应 [eagle-library.ts](https://github.com/dolag233/Serpent/blob/b3714d416379ba546abfb5065bf2f447dec43314/src/worker/eagle-library.ts)。浏览器本地加载转译后的模块，MIT 许可随模块附在 `albums/vendor/Serpent-LICENSE.txt`。
