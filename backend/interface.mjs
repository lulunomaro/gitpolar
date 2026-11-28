import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { db, getUser } from './store.mjs';
import { authenticate, requireOrigin, body, json, fail } from './auth.mjs';
import { repoPath } from './git.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS profile_avatars(user_id INTEGER PRIMARY KEY REFERENCES users(id),bytes BLOB NOT NULL,version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ui_preferences (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 preset TEXT NOT NULL DEFAULT 'github', color_mode TEXT NOT NULL DEFAULT 'light');
CREATE TABLE IF NOT EXISTS user_profiles (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 display_name TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '',
 location TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', pins TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS user_follows (
 follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(follower_id, followed_id), CHECK(follower_id<>followed_id));`);

function viewer(req, mutate = false) {
  const auth = authenticate(req, { includePersonal: true });
  if (!auth) fail(401, '请使用飞书登录。');
  if (mutate && !auth.token) requireOrigin(req);
  return auth.user;
}
const defaults = { display_name: '', bio: '', company: '', location: '', website: '', pins: '[]' };
const profile = (id) => db.prepare('SELECT * FROM user_profiles WHERE user_id=?').get(id) || defaults;
const following = (a, b) =>
  Boolean(db.prepare('SELECT 1 FROM user_follows WHERE follower_id=? AND followed_id=?').get(a, b));
const count = (sql, id) => db.prepare(sql).get(id).n;
function safeField(value, max) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    fail(400, '资料格式或长度不正确。');
  return value.trim();
}
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const localDay = value => dayFormatter.format(new Date(value));
const isoDayOffset=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
async function contributionActivity(user, first, last, repositories, years) {
  const activity = [];
  const start = new Date(first+'T00:00:00+08:00').toISOString();
  const end = new Date(new Date(last+'T00:00:00+08:00').getTime()+86400000).toISOString();
  const names = new Set(
    [user.username, user.name, profile(user.id).display_name].filter(Boolean).map((n) => n.toLowerCase())
  );
  const handle = user.username.toLowerCase();
  for (let i = 0; i < repositories.length; i += 4) {
    const batch = await Promise.all(
      repositories.slice(i, i + 4).map(async (repo) => {
        // Read the full reachable history without buffering the entire Git log or cutting off rebased author dates.
        const child=spawn('git',['--git-dir='+repoPath(repo.name),'log','--branches','--tags','--format=%H%x00%aI%x00%an%x00%ae%x00%s'],{stdio:['ignore','pipe','ignore'],windowsHide:true});
        const closed=once(child,'close');
        const events=[];
        for await(const line of createInterface({input:child.stdout,crlfDelay:Infinity})) {
          const [oid, date, author, email, message] = line.split('\0');
          if (!date) continue;
          if (
            !names.has(author.toLowerCase()) &&
            email.toLowerCase() !== handle + '@gitpolar.local' &&
            email.toLowerCase() !== handle + '@local'
          )
            continue;
          const day=localDay(date);years.add(Number(day.slice(0,4)));
          if(day<first || day>last) continue;
          events.push({ type: 'commit', repo: repo.name, oid, date: day, message });
        }
        if((await closed)[0]!==0) throw Error('Unable to read contribution history.');
        return events;
      })
    );
    activity.push(...batch.flat());
  }
  const issues = db
    .prepare(
      `SELECT i.number,i.title,i.created_at,r.name FROM issues i JOIN repos r ON r.id=i.repo_id WHERE i.author_id=? AND r.status='ready' AND i.created_at>=? AND i.created_at<?`
    )
    .all(user.id, start, end);
  activity.push(
    ...issues.map((i) => ({
      type: 'issue',
      repo: i.name,
      number: i.number,
      date: localDay(i.created_at),
      message: i.title,
    }))
  );
  for(const [table,author,type] of [['code_pulls','author_id','pull'],['album_pulls','author_id','album']]) {
    const rows=db.prepare(`SELECT p.number,p.title,p.created_at,r.name FROM ${table} p JOIN repos r ON r.id=p.repo_id WHERE p.${author}=? AND r.status='ready' AND p.created_at>=? AND p.created_at<?`).all(user.id,start,end);
    activity.push(...rows.map(p=>({type,number:p.number,message:p.title,date:localDay(p.created_at),repo:p.name})));
  }
  return activity;
}
export async function interfaceApi(req, res, path, params) {
  if(path==='/api/me/avatar' && ['PUT','DELETE'].includes(req.method)) {
    const user=viewer(req,true);
    if(req.method==='DELETE') db.prepare('DELETE FROM profile_avatars WHERE user_id=?').run(user.id);
    else {
      const v=await body(req,400000),encoded=v.png;
      if(typeof encoded!=='string' || !/^[a-zA-Z0-9+/]+=*$/.test(encoded)) fail(400,'Invalid PNG avatar.');
      const bytes=Buffer.from(encoded,'base64');
      if(bytes.length<33||bytes.length>256*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(16)>512||bytes.readUInt32BE(20)>512)fail(400,'Upload a PNG of up to 512 × 512 pixels.');
      const version=createHash('sha256').update(bytes).digest('hex').slice(0,16);
      db.prepare('INSERT INTO profile_avatars VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET bytes=excluded.bytes,version=excluded.version').run(user.id,bytes,version);
    }
    return json(res,{ok:true});
  }
  if (path === '/api/me/appearance') {
    const user = viewer(req, req.method !== 'GET');
    if (req.method === 'GET')
      return json(
        res,
        db
          .prepare('SELECT preset,color_mode AS colorMode FROM ui_preferences WHERE user_id=?')
          .get(user.id) || { preset: 'github', colorMode: 'light' }
      );
    if (req.method === 'PUT') {
      const input = await body(req);
      if (
        !['workspace', 'github'].includes(input.preset) ||
        !['light', 'dark', 'system'].includes(input.colorMode)
      )
        fail(400, '请选择有效的界面预设和颜色。');
      db.prepare(
        'INSERT INTO ui_preferences(user_id,preset,color_mode) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET preset=excluded.preset,color_mode=excluded.color_mode'
      ).run(user.id, input.preset, input.colorMode);
      return json(res, { preset: input.preset, colorMode: input.colorMode });
    }
    fail(405, 'Unsupported appearance action.');
  }
  if (path === '/api/me/profile' && req.method === 'PATCH') {
    const user = viewer(req, true),
      input = await body(req),
      old = profile(user.id),
      next = { ...old };
    const fields = {
      name: ['display_name', 100],
      bio: ['bio', 160],
      company: ['company', 100],
      location: ['location', 100],
      website: ['website', 240],
    };
    for (const [key, [column, max]] of Object.entries(fields))
      if (Object.hasOwn(input, key)) next[column] = safeField(input[key], max);
    if (next.website) {
      let url;
      try {
        url = new URL(next.website);
      } catch {
        fail(400, '网址需要以 https:// 或 http:// 开头。');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        fail(400, '请输入普通网页地址。');
    }
    if (Object.hasOwn(input, 'pins')) {
      if (
        user.personalOnly ||
        !Array.isArray(input.pins) ||
        input.pins.length > 6 ||
        new Set(input.pins).size !== input.pins.length
      )
        fail(400, '最多置顶 6 个仓库。');
      for (const name of input.pins)
        if (
          typeof name !== 'string' ||
          !db.prepare("SELECT 1 FROM repos WHERE name=? AND status='ready'").get(name)
        )
          fail(400, '置顶仓库不存在。');
      next.pins = JSON.stringify(input.pins);
    }
    db.prepare(
      `INSERT INTO user_profiles(user_id,display_name,bio,company,location,website,pins) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,bio=excluded.bio,company=excluded.company,location=excluded.location,website=excluded.website,pins=excluded.pins`
    ).run(user.id, next.display_name, next.bio, next.company, next.location, next.website, next.pins);
    return json(res, { ok: true });
  }
  const match = /^\/api\/profiles\/([a-z0-9][a-z0-9_-]{0,47})(?:\/(follow|followers|following|avatar))?$/.exec(path);
  if (!match) fail(404, 'Interface route not found.');
  const current = viewer(req, req.method !== 'GET');
  const row = db.prepare('SELECT id,created_at FROM users WHERE username=?').get(match[1]);
  if (!row) fail(404, '找不到这个用户。');
  if (current.personalOnly && row.id !== current.id) fail(403, '此账号可访问本人的个人工作台。');
  if (row.id !== current.id && db.prepare('SELECT 1 FROM personal_workspaces WHERE user_id=?').get(row.id))
    fail(404, '找不到这个用户。');
  const user = getUser(row.id),
    p = profile(user.id);
  if(match[2]==='avatar' && req.method==='GET') {
    const pic=db.prepare('SELECT bytes FROM profile_avatars WHERE user_id=?').get(user.id);if(!pic)fail(404,'Avatar not found.');
    return res.writeHead(200,{'Content-Type':'image/png'}).end(Buffer.from(pic.bytes));
  }
  if (match[2] === 'follow') {
    if (current.personalOnly || current.id === user.id) fail(400, '请选择其他团队成员。');
    if (req.method === 'PUT')
      db.prepare('INSERT OR IGNORE INTO user_follows(follower_id,followed_id) VALUES(?,?)').run(
        current.id,
        user.id
      );
    else if (req.method === 'DELETE')
      db.prepare('DELETE FROM user_follows WHERE follower_id=? AND followed_id=?').run(current.id, user.id);
    else fail(405, 'Unsupported follow action.');
    return json(res, { following: following(current.id, user.id) });
  }
  if (req.method !== 'GET') fail(405, 'Unsupported profile action.');
  if (['followers', 'following'].includes(match[2])) {
    const followers = match[2] === 'followers';
    return json(res, {
      users: db
        .prepare(
          `SELECT u.username,coalesce(nullif(p.display_name,''),nullif(u.display_name,''),u.username) AS name,p.bio FROM user_follows f JOIN users u ON u.id=f.${followers ? 'follower_id' : 'followed_id'} LEFT JOIN user_profiles p ON p.user_id=u.id WHERE f.${followers ? 'followed_id' : 'follower_id'}=? ORDER BY u.username`
        )
        .all(user.id),
    });
  }
  const year = params.get('year') || localDay(new Date()).slice(0, 4);
  if (!/^\d{4}$/.test(year) || Number(year) < 1970 || Number(year) > 9999) fail(400, '无效年份。');
  const repositories = current.personalOnly
    ? []
    : db.prepare("SELECT name,creator_id,description,kind,created_at FROM repos WHERE status='ready'").all();
  const starred = current.personalOnly
    ? []
    : db
        .prepare(
          "SELECT r.name FROM preferences p JOIN repos r ON r.id=p.repo_id WHERE p.user_id=? AND p.kind='star' AND r.status='ready'"
        )
        .all(user.id)
        .map((r) => r.name);
  const today=localDay(new Date()),trailing=!params.has('year');
  const first=trailing?isoDayOffset(today,-364):year+'-01-01',last=trailing?today:year+'-12-31';
  const years=new Set([Number(year),Number(localDay(row.created_at).slice(0,4))]);
  if(!current.personalOnly) for(const [table,column] of [['issues','author_id'],['code_pulls','author_id'],['album_pulls','author_id']]) {
    for(const entry of db.prepare(`SELECT DISTINCT strftime('%Y',created_at,'+8 hours') y FROM ${table} WHERE ${column}=?`).all(user.id))if(entry.y)years.add(Number(entry.y));
  }
  const activity=current.personalOnly?[]:await contributionActivity(user,first,last,repositories,years);
  const personalProjects=current.personalOnly?[]:db.prepare("SELECT p.id,p.title,r.name repo FROM repo_projects p JOIN repos r ON r.id=p.repo_id WHERE p.owner_id=? AND r.status='ready'").all(user.id);
  const packages=current.personalOnly?[]:db.prepare("SELECT p.name,p.version,r.name repo FROM repo_packages p JOIN repos r ON r.id=p.repo_id WHERE p.publisher=? AND r.status='ready' ORDER BY p.id DESC").all(user.id);
  const days = {};
  for (const event of activity) days[event.date] = (days[event.date] || 0) + 1;
  return json(res, {
    username: user.username,
    name: p.display_name || user.name || user.username,
    bio: p.bio,
    company: p.company,
    location: p.location,
    website: p.website,
    createdAt: row.created_at,
    own: current.id === user.id,
    pins: JSON.parse(p.pins).filter((n) => repositories.some((r) => r.name === n)),
    repositories: repositories.filter((r) => r.creator_id === user.id).map((r) => r.name),
    starred,
    year,first,last,trailing,years:[...years],projects:personalProjects,packages,
    days,
    total: activity.length,
    activity: activity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    followers: count('SELECT count(*) AS n FROM user_follows WHERE followed_id=?', user.id),
    following: count('SELECT count(*) AS n FROM user_follows WHERE follower_id=?', user.id),
    isFollowing: following(current.id, user.id),
  });
}
