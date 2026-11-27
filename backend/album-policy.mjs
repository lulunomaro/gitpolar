// Album proposals own their review refs. The repository creator maintains main.
export function albumRefError(repo, ref, userId) {
  if (repo?.kind !== 'album') return '';
  const name = ref.toLowerCase();
  if (/^refs\/(?:heads\/album-pr|gitpolar\/album-pr)(?:\/|$)/.test(name)) return '投稿分支由相册 PR 管理。';
  if (name === 'refs/heads/main' && userId !== repo.creator_id)
    return '请提交相册 PR，由仓库负责人合并到 main。';
  return '';
}
