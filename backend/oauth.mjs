import { createHash } from 'node:crypto';
import { db,getUser,userCount,now } from './store.mjs';
import { origin,clientId,clientSecret,callbackUrl } from './config.mjs';
import { random,cookie,setCookie,newSession,fail } from './auth.mjs';
const attempts=new Map(),stateName='gitpolar_oauth';
export function beginOAuth(res) {
  for(const [key,value] of attempts)if(value.expires<Date.now())attempts.delete(key);
  const state=random(),verifier=random();attempts.set(state,{verifier,expires:Date.now()+600000});
  const authorize=new URL('https://github.com/login/oauth/authorize');
  authorize.search=new URLSearchParams({client_id:clientId,redirect_uri:callbackUrl,state,scope:'',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  res.writeHead(302,{'Set-Cookie':setCookie(stateName,state,600),Location:authorize.href}).end();
}
export async function finishOAuth(req,res,params) {
  const state=params.get('state'),attempt=state===cookie(req,stateName)&&attempts.get(state);
  const redirect=(target)=>res.writeHead(302,{Location:target}).end();
  if(!attempt || attempt.expires<Date.now())return redirect('/?auth=failed');
  attempts.delete(state);res.setHeader('Set-Cookie',setCookie(stateName,'',0));
  if(params.get('error')==='access_denied')return redirect('/?auth=cancelled');
  try {
    if(!params.get('code')||params.has('error'))throw new Error('No authorization code.');
    const exchange=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code:params.get('code'),redirect_uri:callbackUrl,code_verifier:attempt.verifier}),signal:AbortSignal.timeout(10000),redirect:'error'});
    const token=await exchange.json();if(!exchange.ok||!token.access_token)throw new Error('Token exchange failed.');
    const response=await fetch('https://api.github.com/user',{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token.access_token}`,'User-Agent':'gitpolar'},signal:AbortSignal.timeout(10000),redirect:'error'});
    const profile=await response.json();
    if(!response.ok||!Number.isSafeInteger(profile.id)||typeof profile.login!=='string')throw new Error('Invalid GitHub profile.');
    let user=db.prepare('SELECT id FROM users WHERE github_id=?').get(profile.id);
    if(!user) {
      const allowed=(process.env.GITHUB_ALLOWED_USERS||'').toLowerCase().split(',').map(s=>s.trim());
      if(userCount()&&!allowed.includes(profile.login.toLowerCase()))return redirect('/?auth=not-allowed');
      const username=`gh-${profile.login.toLowerCase()}`;
      const result=db.prepare('INSERT INTO users(username,github_id,display_name,role,created_at) VALUES(?,?,?,?,?)').run(username,profile.id,String(profile.name||profile.login).slice(0,100),userCount()?'writer':'admin',now());
      user={id:Number(result.lastInsertRowid)};
    }
    newSession(res,getUser(user.id));
    res.setHeader('Set-Cookie',[res.getHeader('Set-Cookie'),setCookie(stateName,'',0)]);
    return redirect('/');
  }catch{console.error('GitHub sign-in failed. Check OAuth configuration and network access.');return redirect('/?auth=failed');}
}
