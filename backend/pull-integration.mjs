import { git } from './git.mjs';
import { fail } from './auth.mjs';

export async function isAncestor(repo, ancestor, tip) {
  const result = await git(repo.name, ['merge-base', '--is-ancestor', ancestor, tip], {result: true});
  if (result.code > 1) throw Error('Could not read pull request ancestry.');
  return result.code === 0;
}

// The target can have further commits by the time the UI sees a merge pushed from SolidWorks.
export async function externalIntegration(repo, pr, tip, head) {
  if (!tip || tip === pr.base_oid || !await isAncestor(repo, head, tip)) return null;
  if (!await isAncestor(repo, pr.base_oid, tip) || await isAncestor(repo, head, pr.base_oid)) return null;
  if (head !== pr.head_oid && !await isAncestor(repo, pr.head_oid, head)) return null;
  const chain = (await git(repo.name, ['rev-list', '--first-parent', '--reverse', pr.base_oid + '..' + tip])).trim().split('\n');
  // On the first-parent chain, every commit after the integration also contains head.
  let low = 0, high = chain.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (await isAncestor(repo, head, chain[mid])) high = mid;
    else low = mid + 1;
  }
  const merged = chain[low];
  const base = merged === head ? pr.base_oid : (await git(repo.name, ['rev-parse', merged + '^1'])).trim();
  return {merged, base, head};
}

export async function checkResolutionCoverage(repo, base, head, resolution) {
  // A native merge has explicit Git decisions, including deliberately keeping our version of a file.
  if (await isAncestor(repo, head, resolution)) return;
  const ancestor = (await git(repo.name, ['merge-base', base, head])).trim();
  const changedPaths = async (a, b) => new Set((await git(repo.name,
    ['diff', '--no-renames', '--name-only', '-z', a, b, '--'])).split('\0').filter(Boolean));
  const [incoming, target, result] = await Promise.all([
    changedPaths(ancestor, head), changedPaths(ancestor, base), changedPaths(base, resolution),
  ]);
  for (const path of incoming) {
    if (!target.has(path) && !result.has(path)) {
      fail(409, `The saved result omits a source-branch change to ${path}. Include it in the result or confirm your choice in a two-parent Git merge.`);
    }
  }
}
