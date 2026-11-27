import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const dataRoot = resolve(process.env.DATA_DIR || resolve(root, 'data'));
export const namespace = process.env.WORKSPACE_NAME || 'polar-lab';
export const host = process.env.HOST || '0.0.0.0';
export const port = Number(process.env.PORT || 4317);
export const origin = new URL(process.env.APP_ORIGIN || `http://127.0.0.1:${port}`);
if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(namespace)) throw new Error('Invalid WORKSPACE_NAME.');
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('APP_ORIGIN must be an HTTP(S) origin.');
export const originAliases = (process.env.APP_ORIGIN_ALIASES || '').split(',').map(value => value.trim()).filter(Boolean).map(value => {
  const alias = new URL(value);
  if (!['http:', 'https:'].includes(alias.protocol) || alias.pathname !== '/' || alias.search || alias.hash || alias.username || alias.password) throw new Error('APP_ORIGIN_ALIASES must contain HTTP(S) origins.');
  return alias;
});
export const dbPath = resolve(dataRoot, 'gitpolar.sqlite');
export const repoRoot = resolve(dataRoot, 'repositories');
export const lfsRoot = resolve(dataRoot, 'lfs');
export const maxLfsBytes = Number(process.env.LFS_MAX_BYTES || 20 * 1024 ** 3);
export const sessionSeconds = 12 * 60 * 60;
export const cookieName = 'gitpolar_session';
export const personalWorkspacesEnabled = process.env.FEISHU_PERSONAL_WORKSPACES === 'true';
export const workspaceFilesRoot = process.env.WORKSPACE_FILES_DIR && resolve(process.env.WORKSPACE_FILES_DIR);
if (personalWorkspacesEnabled && !workspaceFilesRoot) throw new Error('WORKSPACE_FILES_DIR is required for personal workspaces.');
export const clientId = process.env.GITHUB_CLIENT_ID?.trim();
export const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
export const githubConfigured = Boolean(clientId && clientSecret);
export const callbackUrl = new URL('/auth/github/callback', origin).href;

export const maxPreviewBytes = Number(process.env.PREVIEW_MAX_BYTES || 128 * 1024 ** 2);

// Password authentication is available only to isolated regression test fixtures. Normal runs use Feishu exclusively.
export const authProvider = process.env.NODE_ENV === 'test' && process.env.AUTH_PROVIDER === 'local' ? 'local' : 'feishu';
