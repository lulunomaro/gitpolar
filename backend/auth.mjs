import { randomBytes, createHash, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db, getUser, userCount, now } from './store.mjs';
import { cookieName, sessionSeconds, authProvider, personalWorkspacesEnabled } from './config.mjs';
import { requestOrigin } from './request-origin.mjs';
export const hash = text => createHash('sha256').update(text).digest('hex');
export const random = () => randomBytes(32).toString('base64url');
const scrypt = promisify(derive);
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
export const cookie = (req, key) => req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${key}=`))?.slice(key.length+1);
export const setCookie = (key, value, seconds) => `${key}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${requestOrigin().protocol === 'https:' ? '; Secure' : ''}`;
export async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 1024) fail(400, 'Password must contain 10 to 1024 characters.');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function checkPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 1024 || !encoded) return false;
  const [, salt, expected] = encoded.split(':');
  const actual = await scrypt(password, salt, 64);
  const saved = Buffer.from(expected, 'hex');
  return actual.length === saved.length && timingSafeEqual(actual, saved);
}
export async function createUser({ username, password, role = 'writer', name = '' }, setup = false) {
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(username || '')) fail(400, 'Use a lowercase username with letters, numbers, hyphens or underscores.');
  if (!['admin','writer','reader'].includes(role)) fail(400, 'Invalid role.');
  const encoded = await passwordHash(password);
  // Check after password hashing as two initial setup requests may overlap.
  if (setup && userCount()) fail(409, 'gitpolar has already been initialized.');
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'Username is already in use.');
  const result = db.prepare('INSERT INTO users(username,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?)').run(username,encoded,String(name).slice(0,100),setup?'admin':role,now());
  return getUser(Number(result.lastInsertRowid));
}
export function newSession(res, user, provider = 'local', secret = random()) {
  if (provider === 'feishu' && user.personalOnly) provider = 'feishu-personal';
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions(hash,user_id,expires,provider) VALUES(?,?,?,?)').run(hash(secret),user.id,Date.now()+sessionSeconds*1000,provider);
  res.setHeader('Set-Cookie',setCookie(cookieName,secret,sessionSeconds));
}
export function redeliverFeishuSession(req, res, userId, secret) {
  const session = db.prepare("SELECT expires FROM sessions WHERE hash=? AND user_id=? AND provider IN ('feishu','feishu-personal') AND expires>?").get(hash(secret), userId, Date.now());
  if (!session) return false;
  if (cookie(req, cookieName) !== secret) res.setHeader('Set-Cookie', setCookie(cookieName, secret, Math.ceil((session.expires-Date.now())/1000)));
  return true;
}
export function authenticate(req, {includePersonal = false} = {}) {
  const authorization = req.headers.authorization || '';
  let token, username;
  if (authorization.startsWith('Bearer ')) token = authorization.slice(7);
  else if (authorization.startsWith('Basic ')) {
    const decoded = Buffer.from(authorization.slice(6),'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    username = decoded.slice(0,colon); token = colon >= 0 ? decoded.slice(colon+1) : '';
  }
  if (token) {
    const record = db.prepare('SELECT id,user_id FROM tokens WHERE hash=?').get(hash(token));
    const user = record && getUser(record.user_id);
    if (user && (authProvider !== 'feishu' || db.prepare('SELECT 1 FROM feishu_identities WHERE user_id=?').get(user.id)) && (!username || user.username.toLowerCase() === username.toLowerCase())) {
      db.prepare('UPDATE tokens SET last_used=? WHERE id=?').run(now(),record.id);
      return { user, token: true };
    }
  }
  const secret = cookie(req,cookieName);
  if (secret) {
    const record = db.prepare('SELECT user_id,provider FROM sessions WHERE hash=? AND expires>?').get(hash(secret),Date.now());
    if (record?.provider === 'feishu-personal') {
      if (!includePersonal || !personalWorkspacesEnabled) return null;
      const user = getUser(record.user_id);
      return user ? {user: {...user, personalOnly: true}, token: false} : null;
    }
    if (record && (authProvider !== 'feishu' || record.provider === 'feishu')) return { user:getUser(record.user_id),token:false };
  }
  return null;
}
export function requireAuth(req, res, write = false, admin = false, git = false) {
  const auth = authenticate(req);
  if (!auth || (git && !auth.token)) { if (git) res.setHeader('WWW-Authenticate','Basic realm="gitpolar", charset="UTF-8"'); fail(401,git?'Use a gitpolar access token for Git and LFS.':'Sign in or use a gitpolar access token.'); }
  if (write && auth.user.role === 'reader') fail(403,'This account has read-only access.');
  if (admin && auth.user.role !== 'admin') fail(403,'Administrator access is required.');
  if (write && !git && !auth.token && req.headers.origin !== requestOrigin().origin) fail(403,'The request origin does not match APP_ORIGIN.');
  return auth.user;
}
export function requireOrigin(req) { if (req.headers.origin !== requestOrigin().origin) fail(403,'The request origin does not match APP_ORIGIN.'); }
export async function body(req, max = 512 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > max) fail(413,'Request body is too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { fail(400,'Invalid JSON body.'); }
}
export function json(res, data, status = 200) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(data)); }
export function newToken(userId, name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 100) fail(400,'Enter a token name (up to 100 characters).');
  const token = `gitpolar_${random()}`, id = randomBytes(12).toString('hex');
  db.prepare('INSERT INTO tokens(id,hash,user_id,name,created_at) VALUES(?,?,?,?,?)').run(id,hash(token),userId,name.trim(),now());
  return { id,token,name:name.trim() };
}
