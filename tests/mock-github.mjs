// Test-only fetch shim. Production never imports this file.
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(url==='https://github.com/login/oauth/access_token') {
    if(options.method!=='POST'||options.body.get('client_secret')!=='test-oauth-secret'||options.body.get('code_verifier')?.length!==43)return Response.json({error:'bad_verification_code'});
    return Response.json({access_token:options.body.get('code')==='blocked-code'?'test-blocked-token':'test-oauth-token'});
  }
  if(url==='https://api.github.com/user')return Response.json(options.headers.Authorization==='Bearer test-blocked-token'?{id:987654,login:'blocked-user',name:'Blocked'}:{id:123456,login:'octo-test',name:'OAuth test user'});
  return original(url,options);
};
