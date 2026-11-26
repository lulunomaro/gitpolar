import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { authenticate, body, fail, json, requireOrigin } from './auth.mjs';
import { dataRoot } from './config.mjs';
import { db, getUser, now } from './store.mjs';

const defaultTeam = 'mechanical';
const roles = ['member', 'lead', 'buyer', 'storekeeper'];
const states = ['draft', 'submitted', 'rejected', 'approved', 'ordered', 'received', 'stocked'];
const fileDirectory = join(dataRoot, 'procurement', 'files');
const fileLimit = 64 * 1024 * 1024;
const maxQuantity = 1_000_000;

// Receipts are also the Feishu outbox. Only their four delivery fields can be updated.
db.exec(`
  CREATE TABLE IF NOT EXISTS pc_teams (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE
  );
  INSERT INTO pc_teams(id,name) VALUES('mechanical','机械组') ON CONFLICT(id) DO NOTHING;
  CREATE TABLE IF NOT EXISTS pc_assignments (
    user_id INTEGER NOT NULL REFERENCES users(id), team_id TEXT NOT NULL REFERENCES pc_teams(id),
    role TEXT NOT NULL CHECK(role IN ('member','lead','buyer','storekeeper')), PRIMARY KEY(user_id,team_id)
  );
  CREATE TABLE IF NOT EXISTS pc_requests (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, team_id TEXT NOT NULL REFERENCES pc_teams(id),
    applicant_id INTEGER NOT NULL REFERENCES users(id), notes TEXT NOT NULL, state TEXT NOT NULL
      CHECK(state IN ('draft','submitted','rejected','approved','ordered','received','stocked')),
    order_reference TEXT NOT NULL DEFAULT '', tracking_number TEXT NOT NULL DEFAULT '', supplier TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pc_requests_team_state ON pc_requests(team_id,state);
  CREATE INDEX IF NOT EXISTS pc_requests_owner ON pc_requests(applicant_id);
  CREATE TABLE IF NOT EXISTS pc_files (
    id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL,
    size INTEGER NOT NULL CHECK(size BETWEEN 1 AND 67108864), sha256 TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pc_items (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES pc_requests(id), ordinal INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('standard','machining')), name TEXT NOT NULL, spec TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), unit TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents >= 0), url TEXT NOT NULL,
    material TEXT NOT NULL, process TEXT NOT NULL, file_id TEXT REFERENCES pc_files(id),
    drawing_file_id TEXT REFERENCES pc_files(id), threads TEXT NOT NULL, UNIQUE(request_id,ordinal)
  );
  CREATE INDEX IF NOT EXISTS pc_items_model ON pc_items(file_id) WHERE file_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS pc_items_drawing ON pc_items(drawing_file_id) WHERE drawing_file_id IS NOT NULL;
  CREATE TRIGGER IF NOT EXISTS pc_frozen_items_insert BEFORE INSERT ON pc_items
    WHEN EXISTS (SELECT 1 FROM pc_requests WHERE id=NEW.request_id AND state NOT IN ('draft','rejected'))
    BEGIN SELECT RAISE(ABORT,'Submitted request items are immutable'); END;
  CREATE TRIGGER IF NOT EXISTS pc_frozen_items_update BEFORE UPDATE ON pc_items
    WHEN EXISTS (SELECT 1 FROM pc_requests WHERE id IN (OLD.request_id,NEW.request_id) AND state NOT IN ('draft','rejected'))
    BEGIN SELECT RAISE(ABORT,'Submitted request items are immutable'); END;
  CREATE TRIGGER IF NOT EXISTS pc_frozen_items_delete BEFORE DELETE ON pc_items
    WHEN EXISTS (SELECT 1 FROM pc_requests WHERE id=OLD.request_id AND state NOT IN ('draft','rejected'))
    BEGIN SELECT RAISE(ABORT,'Submitted request items are immutable'); END;
  CREATE TABLE IF NOT EXISTS pc_events (
    id INTEGER PRIMARY KEY, request_id TEXT NOT NULL REFERENCES pc_requests(id), action TEXT NOT NULL,
    actor_id INTEGER NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, note TEXT NOT NULL,
    admin_override INTEGER NOT NULL CHECK(admin_override IN (0,1)), created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pc_events_request ON pc_events(request_id,id);
  CREATE TRIGGER IF NOT EXISTS pc_events_no_edit BEFORE UPDATE ON pc_events
    BEGIN SELECT RAISE(ABORT,'Procurement events are immutable'); END;
  CREATE TRIGGER IF NOT EXISTS pc_events_no_delete BEFORE DELETE ON pc_events
    BEGIN SELECT RAISE(ABORT,'Procurement events are immutable'); END;
  CREATE TABLE IF NOT EXISTS pc_inventory (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, spec TEXT NOT NULL, unit TEXT NOT NULL,
    location TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 9007199254740991), updated_at TEXT NOT NULL,
    UNIQUE(kind,name,spec,unit,location)
  );
  CREATE TABLE IF NOT EXISTS pc_stock_receipts (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES pc_requests(id), item_id TEXT NOT NULL UNIQUE REFERENCES pc_items(id),
    kind TEXT NOT NULL, item_name TEXT NOT NULL, spec TEXT NOT NULL, unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), location TEXT NOT NULL,
    actor_id INTEGER NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at TEXT NOT NULL,
    feishu_status TEXT NOT NULL DEFAULT 'pending' CHECK(feishu_status IN ('pending','synced','failed')),
    feishu_record_id TEXT, feishu_error TEXT, feishu_synced_at TEXT
  );
  CREATE INDEX IF NOT EXISTS pc_receipts_delivery ON pc_stock_receipts(feishu_status,created_at);
  CREATE TRIGGER IF NOT EXISTS pc_receipts_no_edit BEFORE UPDATE OF
    id,request_id,item_id,kind,item_name,spec,unit,quantity,location,actor_id,actor_name,created_at ON pc_stock_receipts
    BEGIN SELECT RAISE(ABORT,'Stock receipt contents are immutable'); END;
  CREATE TRIGGER IF NOT EXISTS pc_receipts_no_delete BEFORE DELETE ON pc_stock_receipts
    BEGIN SELECT RAISE(ABORT,'Stock receipts are immutable'); END;
`);

function transaction(work, write = true) {
  db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
  try {
    const result = work(); // Synchronous until COMMIT, including permissions and state checks.
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function account(req) {
  const auth = authenticate(req);
  if (!auth?.user) fail(401, '请先登录 gitpolar。');
  if (req.method !== 'GET' && !auth.token) requireOrigin(req);
  return auth.user;
}

function managerOnly(user) {
  if (user.role !== 'admin') fail(403, '只有项管可以管理采购团队和权限。');
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, `${label}须为对象。`);
  return value;
}

function text(value, label, limit, required = false) {
  if (value == null) value = '';
  if (typeof value !== 'string') fail(400, `${label}须为文本。`);
  const result = value.trim();
  if (result.length > limit || (required && !result) || result.includes('\0')) fail(400, `${label}无效。`);
  return result;
}

function integer(value, label, min, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `${label}超出范围或不是整数。`);
  return value;
}

function teamExists(teamId) {
  if (!db.prepare('SELECT 1 FROM pc_teams WHERE id=?').get(teamId)) fail(404, '找不到采购团队。');
}

function myRoles(user) {
  const assigned = db.prepare('SELECT team_id AS teamId,role FROM pc_assignments WHERE user_id=? ORDER BY team_id').all(user.id);
  if (!assigned.length && user.role !== 'admin') return [{teamId: defaultTeam, role: 'member'}];
  return assigned;
}

export function canManageWarehouse(user) {
  if (!user) return false;
  return user.role === 'admin' || Boolean(db.prepare("SELECT 1 FROM pc_assignments WHERE user_id=? AND role='storekeeper' LIMIT 1").get(user.id));
}

function meta(user) {
  const projectManager = user.role === 'admin';
  const assignments = db.prepare(`SELECT a.user_id AS userId,u.username,a.team_id AS teamId,t.name AS teamName,a.role
    FROM pc_assignments a JOIN users u ON u.id=a.user_id JOIN pc_teams t ON t.id=a.team_id
    ORDER BY t.name,u.username`).all();
  return {
    user, projectManager, teams: db.prepare('SELECT id,name FROM pc_teams ORDER BY name,id').all(),
    assignments, myRoles: myRoles(user), states,
    users: projectManager ? db.prepare('SELECT id,username,display_name AS name FROM users ORDER BY username').all() : []
  };
}

function createTeam(user, input) {
  managerOnly(user);
  const id = text(input.id, '团队 ID', 64, true);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) fail(400, '团队 ID 请使用小写字母、数字、短横线或下划线。');
  const name = text(input.name, '团队名称', 100, true);
  if (db.prepare('SELECT 1 FROM pc_teams WHERE id=? OR name=?').get(id, name)) fail(409, '团队 ID 或名称已存在。');
  db.prepare('INSERT INTO pc_teams(id,name) VALUES(?,?)').run(id, name);
  return {team: {id, name}};
}

function assign(user, input) {
  managerOnly(user);
  const teamId = text(input.teamId, '团队 ID', 64, true);
  const userId = integer(input.userId, '账号 ID', 1);
  if (!roles.includes(input.role)) fail(400, '未知采购角色。');
  teamExists(teamId);
  if (!getUser(userId)) fail(404, '找不到该账号。');
  db.prepare(`INSERT INTO pc_assignments(user_id,team_id,role) VALUES(?,?,?)
    ON CONFLICT(user_id,team_id) DO UPDATE SET role=excluded.role`).run(userId, teamId, input.role);
  return {ok: true};
}

// The same predicate governs request lists, details, transitions and attached-file downloads.
const visible = `(r.applicant_id=$uid OR $pm=1 OR EXISTS (
  SELECT 1 FROM pc_assignments a WHERE a.user_id=$uid AND
    ((a.role='lead' AND a.team_id=r.team_id) OR
     (a.role IN ('buyer','storekeeper') AND r.state IN ('approved','ordered','received','stocked')))))`;
const scope = user => ({$uid: user.id, $pm: Number(user.role === 'admin')});
const summaryFields = `r.id,r.title,r.team_id AS teamId,t.name AS teamName,r.state,
  r.applicant_id AS applicantId,COALESCE(NULLIF(u.display_name,''),u.username) AS applicantName,
  r.created_at AS createdAt,r.updated_at AS updatedAt,
  (SELECT COALESCE(SUM(i.quantity*i.unit_price_cents),0) FROM pc_items i WHERE i.request_id=r.id) AS totalCents,
  (SELECT COUNT(*) FROM pc_items i WHERE i.request_id=r.id) AS itemCount`;
const summaryFrom = 'FROM pc_requests r JOIN pc_teams t ON t.id=r.team_id JOIN users u ON u.id=r.applicant_id';

function listRequests(user, params) {
  const conditions = [visible];
  const bindings = scope(user);
  const state = params.get('state');
  if (state) {
    if (!states.includes(state)) fail(400, '未知申请状态。');
    conditions.push('r.state=$state');
    bindings.$state = state;
  }
  if (params.get('mine') === '1') conditions.push('r.applicant_id=$uid');
  const query = text(params.get('q'), '搜索词', 200);
  if (query) {
    conditions.push(`(instr(lower(r.title),lower($q)) OR instr(lower(r.id),lower($q)) OR instr(lower(t.name),lower($q))
      OR instr(lower(u.username),lower($q)) OR instr(lower(u.display_name),lower($q)) OR EXISTS
      (SELECT 1 FROM pc_items i WHERE i.request_id=r.id AND (instr(lower(i.name),lower($q)) OR instr(lower(i.spec),lower($q)))))`);
    bindings.$q = query;
  }
  return db.prepare(`SELECT ${summaryFields} ${summaryFrom} WHERE ${conditions.join(' AND ')} ORDER BY r.updated_at DESC,r.rowid DESC`).all(bindings);
}

function requestHeader(user, id) {
  const request = db.prepare(`SELECT ${summaryFields},r.notes,r.order_reference AS orderReference,
    r.tracking_number AS trackingNumber,r.supplier ${summaryFrom} WHERE r.id=$id AND ${visible}`).get({...scope(user), $id: id});
  if (!request) fail(404, '找不到可访问的采购申请。');
  return request;
}

function detail(user, id) {
  const request = requestHeader(user, id);
  request.items = db.prepare(`SELECT id,kind,name,spec,quantity,unit,unit_price_cents AS unitPriceCents,
    url,material,process,file_id AS fileId,drawing_file_id AS drawingFileId,threads
    FROM pc_items WHERE request_id=? ORDER BY ordinal`).all(id).map(item => ({...item, threads: JSON.parse(item.threads)}));
  request.events = db.prepare(`SELECT id,action,actor_name AS actorName,note,created_at AS createdAt,admin_override AS adminOverride
    FROM pc_events WHERE request_id=? ORDER BY id`).all(id).map(event => ({...event, adminOverride: Boolean(event.adminOverride)}));
  return request;
}

function logEvent(requestId, action, actor, note, adminOverride, at) {
  db.prepare(`INSERT INTO pc_events(request_id,action,actor_id,actor_name,note,admin_override,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(requestId, action, actor.id, actor.name || actor.username, note, Number(adminOverride), at);
}
function purchaseUrl(value) {
  const link = text(value, '购买链接', 4096);
  if (!link) return '';
  let parsed;
  try { parsed = new URL(link); } catch { fail(400, '购买链接格式无效。'); }
  if (!/^https?:\/\//i.test(link) || !parsed.hostname || parsed.username || parsed.password || /[\x00-\x1f\\]/.test(link)) {
    fail(400, '请输入 HTTP 或 HTTPS 购买链接。');
  }
  return link;
}

function threadAnnotations(values = []) {
  if (!Array.isArray(values) || values.length > 200) fail(400, '每个零件最多可标注 200 个螺纹孔。');
  return values.map(value => {
    object(value, '螺纹孔');
    const meshIndex = integer(value.meshIndex, '网格编号', 0);
    const faceIndex = integer(value.faceIndex, '面编号', 0);
    const thread = text(value.thread, '螺纹规格', 64, true);
    const {through, point} = value;
    if (typeof through !== 'boolean') fail(400, '请选择是否为通孔。');
    const depthMm = value.depthMm ?? null;
    if (!(through && depthMm === null) && (!Number.isFinite(depthMm) || depthMm < 0 || (!through && depthMm === 0))) {
      fail(400, '请填写有效的螺纹深度（毫米）。');
    }
    if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) fail(400, '螺纹孔标注须包含三个有效坐标。');
    return {meshIndex, faceIndex, thread, depthMm, through, point};
  });
}

function attachment(value, actor, applicantId, retained, extensions, required) {
  const id = text(value, '附件 ID', 64, required);
  if (!id) return null;
  const file = db.prepare('SELECT owner_id,name FROM pc_files WHERE id=?').get(id);
  if (!file || (file.owner_id !== actor.id && actor.role !== 'admin' && !retained.has(id))) fail(404, '找不到可用于本申请的附件。');
  if (!extensions.includes(extname(file.name).toLowerCase())) fail(400, '请将 STEP 模型和 DWG 图纸放入对应的附件栏。');
  const otherDraft = db.prepare(`SELECT 1 FROM pc_items i JOIN pc_requests r ON r.id=i.request_id
    WHERE (i.file_id=? OR i.drawing_file_id=?) AND r.applicant_id<>? AND r.state IN ('draft','rejected') LIMIT 1`).get(id, id, applicantId);
  if (otherDraft) fail(409, '此附件已用于其他申请人的草稿。');
  return id;
}

function replaceItems(requestId, values, actor, applicantId) {
  if (!Array.isArray(values) || !values.length) fail(400, '请至少提供一个采购明细。');
  const retained = new Set(db.prepare('SELECT file_id,drawing_file_id FROM pc_items WHERE request_id=?')
    .all(requestId).flatMap(row => [row.file_id, row.drawing_file_id]));
  const insert = db.prepare(`INSERT INTO pc_items(id,request_id,ordinal,kind,name,spec,quantity,unit,unit_price_cents,
    url,material,process,file_id,drawing_file_id,threads) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  db.prepare('DELETE FROM pc_items WHERE request_id=?').run(requestId);
  let total = 0;
  for (const [index, input] of values.entries()) {
    object(input, '采购明细');
    const kind = input.kind;
    if (!['standard', 'machining'].includes(kind)) fail(400, '请选择标准件或加工件。');
    const name = text(input.name, '品名', 200, true);
    // Machining specs can also carry a surface treatment and a note for each annotated face.
    const spec = text(input.spec, '规格', kind === 'machining' ? 48 * 1024 : 500);
    const quantity = integer(input.quantity, '数量', 1, maxQuantity);
    const unit = text(input.unit, '单位', 32) || '件';
    const price = integer(input.unitPriceCents ?? 0, '单价（分）', 0);
    total += price * quantity;
    if (!Number.isSafeInteger(total)) fail(400, '采购金额超出精确计价范围。');
    const url = purchaseUrl(input.url);
    const material = text(input.material, '材料', 200);
    const process = text(input.process, '工艺', 500);
    const model = attachment(input.fileId, actor, applicantId, retained, ['.step', '.stp'], kind === 'machining');
    const drawing = attachment(input.drawingFileId, actor, applicantId, retained, ['.dwg'], false);
    const threads = threadAnnotations(input.threads);
    if (threads.length && (kind !== 'machining' || !model)) fail(400, '请在加工件的 STEP 模型上标注螺纹孔。');
    insert.run(randomUUID(), requestId, index, kind, name, spec, quantity, unit, price,
      url, material, process, model, drawing, JSON.stringify(threads));
  }
}

function createRequest(user, input) {
  const teamId = text(input.teamId, '团队 ID', 64, true);
  teamExists(teamId);
  if (user.role !== 'admin' && !myRoles(user).some(role => role.teamId === teamId)) fail(403, '只能为所属团队创建申请。');
  const title = text(input.title, '标题', 200, true);
  const notes = text(input.notes, '申请说明', 4000);
  const id = randomUUID(), at = now();
  db.prepare(`INSERT INTO pc_requests(id,title,team_id,applicant_id,notes,state,created_at,updated_at)
    VALUES(?,?,?,?,?,'draft',?,?)`).run(id, title, teamId, user.id, notes, at, at);
  replaceItems(id, input.items, user, user.id);
  logEvent(id, 'create', user, '', false, at);
  return {request: detail(user, id)};
}

function editRequest(user, id, input) {
  const request = requestHeader(user, id);
  if (request.applicantId !== user.id && user.role !== 'admin') fail(403, '只有申请人和项管可以编辑申请。');
  if (!['draft', 'rejected'].includes(request.state)) fail(409, '只有草稿或退回的申请可以编辑。');
  if (input.teamId !== undefined && input.teamId !== request.teamId) fail(400, '已有申请不能更换团队。');
  if (!['title', 'notes', 'items'].some(key => Object.hasOwn(input, key))) fail(400, '请提供要修改的标题、说明或明细。');
  const title = input.title === undefined ? request.title : text(input.title, '标题', 200, true);
  const notes = input.notes === undefined ? request.notes : text(input.notes, '申请说明', 4000);
  if (input.items !== undefined) replaceItems(id, input.items, user, request.applicantId);
  const at = now();
  db.prepare('UPDATE pc_requests SET title=?,notes=?,updated_at=? WHERE id=?').run(title, notes, at, id);
  logEvent(id, 'edit', user, '', request.applicantId !== user.id, at);
  return {request: detail(user, id)};
}

const transitions = {
  submit:  {from: ['draft', 'rejected'], to: 'submitted', by: 'applicant'},
  approve: {from: ['submitted'], to: 'approved', by: 'lead'},
  reject:  {from: ['submitted'], to: 'rejected', by: 'lead'},
  order:   {from: ['approved'], to: 'ordered', by: 'buyer'},
  receive: {from: ['ordered'], to: 'received', by: 'applicant'},
  stock:   {from: ['received'], to: 'stocked', by: 'storekeeper'}
};

function responsible(user, request, role) {
  if (role === 'applicant') return request.applicantId === user.id;
  const assigned = myRoles(user);
  if (role === 'lead') {
    return request.applicantId !== user.id && assigned.some(a => a.role === 'lead' && a.teamId === request.teamId);
  }
  return assigned.some(a => a.role === role);
}

function stockRequest(user, id, location, at) {
  const lines = db.prepare('SELECT id,kind,name,spec,unit,quantity FROM pc_items WHERE request_id=? ORDER BY ordinal').all(id);
  const receipt = db.prepare(`INSERT INTO pc_stock_receipts(id,request_id,item_id,kind,item_name,spec,unit,quantity,location,
    actor_id,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
  const balance = db.prepare(`INSERT INTO pc_inventory(id,kind,name,spec,unit,location,quantity,updated_at) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(kind,name,spec,unit,location) DO UPDATE SET quantity=pc_inventory.quantity+excluded.quantity,updated_at=excluded.updated_at
      WHERE pc_inventory.quantity<=9007199254740991-excluded.quantity`);
  for (const item of lines) {
    receipt.run(randomUUID(), id, item.id, item.kind, item.name, item.spec, item.unit, item.quantity, location, user.id, user.name || user.username, at);
    if (!balance.run(randomUUID(), item.kind, item.name, item.spec, item.unit, location, item.quantity, at).changes) {
      fail(409, '入库后将超过该物料的库存数量上限。');
    }
  }
}

function act(user, id, input) {
  const request = requestHeader(user, id);
  const action = input.action;
  if (typeof action !== 'string' || !Object.hasOwn(transitions, action)) fail(400, '未知采购操作。');
  const {from, to, by} = transitions[action];
  const override = !responsible(user, request, by);
  if (override && user.role !== 'admin') fail(403, '当前账号无权对这份申请执行该操作。');
  if (!from.includes(request.state)) fail(409, '申请状态已变化，请刷新后查看。');
  const note = text(input.note, action === 'reject' ? '退回原因' : '操作备注', 2000, action === 'reject');
  const at = now();
  if (action === 'order') {
    const reference = text(input.orderReference, '订单编号', 200, true);
    const supplier = text(input.supplier, '供应商', 200);
    const tracking = text(input.trackingNumber, '物流单号', 200);
    db.prepare('UPDATE pc_requests SET order_reference=?,supplier=?,tracking_number=? WHERE id=?').run(reference, supplier, tracking, id);
  }
  if (action === 'stock') stockRequest(user, id, text(input.location, '库位', 160, true), at);
  db.prepare('UPDATE pc_requests SET state=?,updated_at=? WHERE id=?').run(to, at, id);
  logEvent(id, action, user, note, override, at);
  return {request: detail(user, id)};
}

function inventory(params) {
  const query = text(params.get('q'), '搜索词', 200);
  const kind = params.get('kind') || '';
  if (kind && !['standard', 'machining'].includes(kind)) fail(400, '未知库存类别。');
  const bindings = {$q: query, $kind: kind};
  const kindFilter = "($kind='' OR kind=$kind)";
  const specOrLocation = 'instr(lower(spec),lower($q)) OR instr(lower(location),lower($q)) OR instr(lower(unit),lower($q))';
  const items = db.prepare(`SELECT id,kind,name,spec,unit,quantity,location,updated_at AS updatedAt FROM pc_inventory
    WHERE ${kindFilter} AND ($q='' OR instr(lower(name),lower($q)) OR ${specOrLocation})
    ORDER BY name,spec,location,unit,id`).all(bindings);
  const receipts = db.prepare(`SELECT id,request_id AS requestId,kind,item_name AS itemName,spec,unit,quantity,location,
    actor_name AS actorName,created_at AS createdAt,feishu_status AS feishuStatus FROM pc_stock_receipts
    WHERE ${kindFilter} AND ($q='' OR instr(lower(item_name),lower($q)) OR instr(lower(request_id),lower($q)) OR ${specOrLocation})
    ORDER BY created_at DESC,rowid DESC`).all(bindings);
  return {items, receipts};
}
function fileName(value) {
  const name = text(value, '附件名', 255, true);
  if (/[\/\\:\x00-\x1f\x7f]/.test(name) || !['.step', '.stp', '.dwg'].includes(extname(name).toLowerCase())) {
    fail(400, '请提供 STEP、STP 或 DWG 文件的原始文件名。');
  }
  return name;
}

async function upload(req, params, owner) {
  const name = fileName(params.get('name'));
  if (Number(req.headers['content-length']) > fileLimit) fail(413, '附件大小上限为 64 MiB。');
  if (/^(application\/json|multipart\/form-data)\b/i.test(req.headers['content-type'] || '')) fail(415, '请直接发送文件字节。');
  const id = randomUUID(), path = join(fileDirectory, id);
  await mkdir(fileDirectory, {recursive: true});
  const handle = await open(path, 'wx', 0o600);
  const digest = createHash('sha256');
  let size = 0;
  async function* chunks() {
    // Keep the connection available for the 413 response when a chunked upload crosses the limit.
    for await (const chunk of req.iterator({destroyOnReturn: false})) {
      size += chunk.length;
      if (size > fileLimit) fail(413, '附件大小上限为 64 MiB。');
      digest.update(chunk);
      yield chunk;
    }
    if (size === 0) fail(400, '文件为空。');
  }
  try {
    try {
      await handle.writeFile(chunks());
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Registration follows a complete write and a second credential check on long uploads.
    if (account(req).id !== owner.id) fail(403, '上传账号已变更。');
    const sha256 = digest.digest('hex');
    db.prepare('INSERT INTO pc_files(id,owner_id,name,size,sha256,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, owner.id, name, size, sha256, now());
    return {file: {id, name, size, sha256, url: `/api/procurement/files/${id}`}};
  } catch (error) {
    req.resume();
    await unlink(path);
    throw error;
  }
}

async function download(user, res, id) {
  const file = db.prepare('SELECT owner_id,name,size FROM pc_files WHERE id=?').get(id);
  if (!file) fail(404, '找不到可访问的附件。');
  if (user.role !== 'admin' && file.owner_id !== user.id) {
    const allowed = db.prepare(`SELECT 1 FROM pc_items i JOIN pc_requests r ON r.id=i.request_id
      WHERE (i.file_id=$id OR i.drawing_file_id=$id) AND ${visible} LIMIT 1`).get({...scope(user), $id: id});
    if (!allowed) fail(404, '找不到可访问的附件。');
  }
  let handle;
  try { handle = await open(join(fileDirectory, id), 'r'); }
  catch (error) { if (error.code === 'ENOENT') fail(404, '存储中找不到该附件。'); throw error; }
  try {
    const name = encodeURIComponent(file.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
    res.writeHead(200, {'Content-Type': 'application/octet-stream', 'Content-Length': file.size,
      'Content-Disposition': `attachment; filename*=UTF-8''${name}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'});
    await pipeline(handle.createReadStream(), res);
  } finally { await handle.close(); }
}

// `changed` is the Git repository SSE publisher. Procurement data is scoped per account.
export async function procurementApi(req, res, pathname, params, changed) {
  const user = account(req);
  const route = pathname.slice('/api/procurement'.length);
  const read = fn => json(res, transaction(fn, false));
  async function write(fn, status = 200) {
    const input = object(await body(req, 8 * 1024 * 1024), '请求');
    const result = transaction(() => fn(account(req), input));
    return json(res, result, status);
  }
  if (route === '/meta' && req.method === 'GET') return read(() => meta(user));
  if (route === '/teams' && req.method === 'POST') return write(createTeam, 201);
  if (route === '/assignments' && req.method === 'PUT') return write(assign);
  if (route === '/requests') {
    if (req.method === 'POST') return write(createRequest, 201);
    if (req.method === 'GET') return read(() => ({requests: listRequests(user, params)}));
  }
  const requestMatch = /^\/requests\/([\w-]+)(\/actions)?$/.exec(route);
  if (requestMatch) {
    const [, id, actions] = requestMatch;
    if (actions && req.method === 'POST') return write((actor, input) => act(actor, id, input));
    if (!actions && req.method === 'PATCH') return write((actor, input) => editRequest(actor, id, input));
    if (!actions && req.method === 'GET') return read(() => ({request: detail(user, id)}));
  }
  if (route === '/files' && req.method === 'POST') return json(res, await upload(req, params, user), 201);
  const fileMatch = /^\/files\/([\w-]+)$/.exec(route);
  if (fileMatch && req.method === 'GET') return download(user, res, fileMatch[1]);
  if (route === '/inventory' && req.method === 'GET') return read(() => inventory(params));
  fail(404, '找不到采购接口。');
}
