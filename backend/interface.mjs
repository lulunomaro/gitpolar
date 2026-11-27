import { db, getUser } from './store.mjs';
import { authenticate, requireOrigin, body, json, fail } from './auth.mjs';
import { git } from './git.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS ui_preferences (
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
const localDay = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

async function contributionActivity(user, year, repositories) {
  const activity = [];
  const names = new Set(
    [user.username, user.name, profile(user.id).display_name].filter(Boolean).map((n) => n.toLowerCase())
  );
  const handle = user.username.toLowerCase();
  for (let i = 0; i < repositories.length; i += 4) {
    const batch = await Promise.all(
      repositories.slice(i, i + 4).map(async (repo) => {
        const text = await git(
          repo.name,
          [
            'log',
            '--all',
            `--since=${year}-01-01T00:00:00+14:00`,
            `--until=${year}-12-31T23:59:59-12:00`,
            '--format=%H%x00%aI%x00%an%x00%ae%x00%s',
            '-8000',
          ],
          { allowFailure: true }
        );
        const seen = new Set(),
          events = [];
        for (const line of text.trim().split('\n')) {
          const [oid, date, author, email, message] = line.split('\0');
          if (!date?.startsWith(year + '-') || seen.has(oid)) continue;
          if (
            !names.has(author.toLowerCase()) &&
            email.toLowerCase() !== handle + '@gitpolar.local' &&
            email.toLowerCase() !== handle + '@local'
          )
            continue;
          seen.add(oid);
          events.push({ type: 'commit', repo: repo.name, oid, date: localDay(date), message });
        }
        return events;
      })
    );
    activity.push(...batch.flat());
  }
  const issues = db
    .prepare(
      `SELECT i.number,i.title,i.created_at,r.name FROM issues i JOIN repos r ON r.id=i.repo_id WHERE i.author_id=? AND r.status='ready' AND i.created_at LIKE ?`
    )
    .all(user.id, year + '-%');
  activity.push(
    ...issues.map((i) => ({
      type: 'issue',
      repo: i.name,
      number: i.number,
      date: localDay(i.created_at),
      message: i.title,
    }))
  );
  return activity;
}
export async function interfaceApi(req, res, path, params) {
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
  const match = /^\/api\/profiles\/([a-z0-9][a-z0-9_-]{0,47})(?:\/(follow|followers|following))?$/.exec(path);
  if (!match) fail(404, 'Interface route not found.');
  const current = viewer(req, req.method !== 'GET');
  const row = db.prepare('SELECT id,created_at FROM users WHERE username=?').get(match[1]);
  if (!row) fail(404, '找不到这个用户。');
  if (current.personalOnly && row.id !== current.id) fail(403, '此账号可访问本人的个人工作台。');
  if (row.id !== current.id && db.prepare('SELECT 1 FROM personal_workspaces WHERE user_id=?').get(row.id))
    fail(404, '找不到这个用户。');
  const user = getUser(row.id),
    p = profile(user.id);
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
  const year = params.get('year') || String(new Date().getFullYear());
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
  const activity = current.personalOnly ? [] : await contributionActivity(user, year, repositories);
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
    year,
    days,
    total: activity.length,
    activity: activity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    followers: count('SELECT count(*) AS n FROM user_follows WHERE followed_id=?', user.id),
    following: count('SELECT count(*) AS n FROM user_follows WHERE follower_id=?', user.id),
    isFollowing: following(current.id, user.id),
  });
}
