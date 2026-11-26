import { createHash } from 'node:crypto';
import { db, getUser, userCount, now } from './store.mjs';
import { origin } from './config.mjs';
import { authenticate, random, cookie, setCookie, newSession, fail } from './auth.mjs';

const appId = process.env.FEISHU_APP_ID?.trim();
const appSecret = process.env.FEISHU_APP_SECRET?.trim();
export const feishuConfigured = Boolean(appId && appSecret);
export const feishuCallbackUrl = new URL('/auth/feishu/callback', origin).href;
const stateName = 'gitpolar_feishu_oauth', attempts = new Map();
db.exec(`CREATE TABLE IF NOT EXISTS feishu_identities (
  open_id TEXT PRIMARY KEY, tenant_key TEXT NOT NULL, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id), created_at TEXT NOT NULL
)`);
db.exec(`CREATE TABLE IF NOT EXISTS feishu_trusted_tenants (tenant_key TEXT PRIMARY KEY, created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL)`);
export const hasFeishuIdentity = userId => Boolean(db.prepare('SELECT 1 FROM feishu_identities WHERE user_id=?').get(userId));
const allowedValues = name => (process.env[name] || '').split(',').map(value=>value.trim()).filter(Boolean);

export function beginFeishu(req,res,params) {
  if (!feishuConfigured) fail(503,'Feishu login is not configured.');
  const link = params.get('link') === '1';
  const auth = authenticate(req);
  if (link && !auth?.user) fail(401,'Sign in before linking your Feishu account.');
  for (const [key,value] of attempts) if (value.expires < Date.now()) attempts.delete(key);
  const state = random(), verifier = random();
  attempts.set(state,{verifier,expires:Date.now()+600000,linkUserId:link?auth.user.id:null});
  const authorize = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
  authorize.search = new URLSearchParams({client_id:appId,redirect_uri:feishuCallbackUrl,response_type:'code',scope:'auth:user.id:read',state,
    code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  res.writeHead(302,{'Set-Cookie':setCookie(stateName,state,600),Location:authorize.href}).end();
}

// Browser OAuth and CLI device authorization enter the same stable identity and role policy.
export function getOrCreateFeishuUser(profile,{bootstrapAdminIds=[]}={}) {
  if(typeof profile?.open_id!=='string'||!profile.open_id||typeof profile.tenant_key!=='string'||!profile.tenant_key) fail(400,'Invalid verified Feishu identity.');
  const tenants=allowedValues('FEISHU_ALLOWED_TENANTS'),members=allowedValues('FEISHU_ALLOWED_OPEN_IDS'),admins=allowedValues('FEISHU_ADMIN_OPEN_IDS');
  const designated=admins.includes(profile.open_id),explicitPolicy=tenants.length>0||members.length>0||admins.length>0;
  const adminExists=Boolean(db.prepare("SELECT 1 FROM users u JOIN feishu_identities f ON f.user_id=u.id WHERE u.role='admin' LIMIT 1").get());
  // A dedicated NAS CLI's already configured operator can bootstrap the first Feishu manager.
  // It must match the identity verified by this specific device flow, not a shared cached login afterwards.
  const bootstrap=!explicitPolicy&&!adminExists&&bootstrapAdminIds.includes(profile.open_id);
  const trustedTenant=!explicitPolicy&&Boolean(db.prepare('SELECT 1 FROM feishu_trusted_tenants WHERE tenant_key=?').get(profile.tenant_key));
  let identity=db.prepare('SELECT user_id FROM feishu_identities WHERE open_id=? AND tenant_key=?').get(profile.open_id,profile.tenant_key);
  if(!identity&&!designated&&!bootstrap&&!trustedTenant&&!tenants.includes(profile.tenant_key)&&!members.includes(profile.open_id))fail(403,'This Feishu identity is not allowed to join the workspace.');
  db.exec('BEGIN IMMEDIATE');
  try {
    if(!identity) {
      const username='fs-'+createHash('sha256').update(profile.open_id).digest('hex').slice(0,20);
      const result=db.prepare('INSERT INTO users(username,display_name,role,created_at) VALUES(?,?,?,?)').run(username,String(profile.name||'Feishu user').slice(0,100),designated||bootstrap||!userCount()?'admin':'writer',now());
      identity={user_id:Number(result.lastInsertRowid)};
      db.prepare('INSERT INTO feishu_identities(open_id,tenant_key,user_id,created_at) VALUES(?,?,?,?)').run(profile.open_id,profile.tenant_key,identity.user_id,now());
    } else if(designated||bootstrap) db.prepare("UPDATE users SET role='admin' WHERE id=?").run(identity.user_id);
    if(bootstrap)db.prepare('INSERT OR IGNORE INTO feishu_trusted_tenants(tenant_key,created_by,created_at) VALUES(?,?,?)').run(profile.tenant_key,identity.user_id,now());
    db.exec('COMMIT');
  } catch(error) {db.exec('ROLLBACK');throw error;}
  return getUser(identity.user_id);
}

export async function finishFeishu(req,res,params) {
  const state = params.get('state');
  const attempt = state === cookie(req,stateName) && attempts.get(state);
  const redirect = result => res.writeHead(302,{Location:'/?auth='+result}).end();
  if (!attempt || attempt.expires < Date.now()) return redirect('failed');
  attempts.delete(state);
  res.setHeader('Set-Cookie',setCookie(stateName,'',0));
  if (params.has('error')) return redirect('cancelled');
  try {
    if (!params.get('code')) return redirect('failed');
    const exchange = await fetch('https://accounts.feishu.cn/oauth/v3/token',{
      method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
      body:JSON.stringify({grant_type:'authorization_code',client_id:appId,client_secret:appSecret,code:params.get('code'),redirect_uri:feishuCallbackUrl,code_verifier:attempt.verifier})
    });
    const token = await exchange.json();
    if (!exchange.ok || !token.access_token) return redirect('failed');
    const profileResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info',{
      redirect:'error',headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(10000)
    });
    const profileResult = await profileResponse.json(), profile = profileResult.data;
    if (!profileResponse.ok || profileResult.code !== 0 || typeof profile?.open_id !== 'string' || !profile.open_id || typeof profile.tenant_key !== 'string' || !profile.tenant_key) return redirect('failed');
    let identity = db.prepare('SELECT user_id FROM feishu_identities WHERE open_id=? AND tenant_key=?').get(profile.open_id,profile.tenant_key);
    if (attempt.linkUserId) {
      const current = authenticate(req)?.user;
      if (current?.id !== attempt.linkUserId) return redirect('failed');
      if (identity && identity.user_id !== current.id) return redirect('identity-conflict');
      const existing = db.prepare('SELECT open_id FROM feishu_identities WHERE user_id=?').get(current.id);
      if (existing && existing.open_id !== profile.open_id) return redirect('identity-conflict');
      if (!identity) db.prepare('INSERT INTO feishu_identities(open_id,tenant_key,user_id,created_at) VALUES(?,?,?,?)').run(profile.open_id,profile.tenant_key,current.id,now());
      identity = {user_id:current.id};
    } else {
      try { identity={user_id:getOrCreateFeishuUser(profile).id}; }
      catch(error) { if(error.status===403)return redirect('not-allowed');throw error; }
    }
    newSession(res,getUser(identity.user_id),'feishu');
    res.setHeader('Set-Cookie',[res.getHeader('Set-Cookie'),setCookie(stateName,'',0)]);
    res.writeHead(302,{Location:'/procurement/'}).end();
  } catch {
    console.error('Feishu sign-in failed. Check application configuration and network access.');
    return redirect('failed');
  }
}
let tenantCredential, tokenRequest;
export async function feishuTenantToken() {
  if (!feishuConfigured) fail(503,'Feishu application credentials are not configured.');
  if (tenantCredential && tenantCredential.expires > Date.now()+60000) return tenantCredential.token;
  if (!tokenRequest) tokenRequest = (async()=>{
    const response = await fetch('https://accounts.feishu.cn/oauth/v3/token',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},
      body:JSON.stringify({grant_type:'client_credentials',client_id:appId,client_secret:appSecret})
    });
    const value = await response.json();
    if (!response.ok || typeof value.access_token !== 'string' || !Number.isFinite(value.expires_in) || value.expires_in<=0) fail(502,'Feishu application authentication failed. Check the NAS application credentials.');
    tenantCredential={token:value.access_token,expires:Date.now()+value.expires_in*1000};
    return tenantCredential.token;
  })().finally(()=>tokenRequest=null);
  return tokenRequest;
}
export async function feishuRequest(path,method='GET',data) {
  const token = await feishuTenantToken();
  const response = await fetch('https://open.feishu.cn/open-apis/'+path,{
    method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(data === undefined ? {} : {body:JSON.stringify(data)})
  });
  const value = await response.json();
  if (!response.ok || value.code !== 0) fail(502,'Feishu warehouse request failed (code '+(value.code ?? response.status)+'). Check the application permissions and field mapping.');
  return value.data;
}
