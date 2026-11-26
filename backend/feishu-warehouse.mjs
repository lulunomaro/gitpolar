import { db, ensureColumn } from './store.mjs';
import { authenticate, requireOrigin, json, fail } from './auth.mjs';
import { canManageWarehouse } from './procurement.mjs';
import { feishuConfigured, feishuRequest } from './feishu.mjs';

const baseToken = process.env.FEISHU_WAREHOUSE_BASE_TOKEN?.trim() || '';
const ledgerTable = process.env.FEISHU_WAREHOUSE_TABLE_ID?.trim() || '';
const inventoryTable = process.env.FEISHU_INVENTORY_TABLE_ID?.trim() || '';
const ledgerDefaults = {receiptId:'gitpolar入库ID',name:'物料名称',spec:'规格型号',quantity:'数量',unit:'单位',location:'库位',requestId:'采购单',createdAt:'入库时间',actor:'入库人'};
const inventoryDefaults = {name:'物料名称',spec:'规格型号',unit:'单位',quantity:'库存数量',location:'库位'};
ensureColumn('pc_stock_receipts', 'feishu_attempts', 'INTEGER NOT NULL DEFAULT 0');
function mapping(name,defaults) {
  let custom;
  try { custom=JSON.parse(process.env[name] || '{}'); } catch { fail(503,'Invalid '+name+' JSON field mapping.'); }
  if (!custom || Array.isArray(custom) || typeof custom !== 'object' || Object.keys(custom).some(key=>!(key in defaults))) fail(503,'Invalid '+name+' field mapping.');
  const fields={...defaults,...custom};
  if (Object.values(fields).some(value=>typeof value!=='string'||!value.trim()||value.length>100)||new Set(Object.values(fields)).size!==Object.keys(fields).length) fail(503,'Invalid '+name+' field names.');
  return fields;
}
const validId=value=>/^[a-zA-Z0-9_-]+$/.test(value);
function configured(table) { return feishuConfigured && validId(baseToken) && validId(table); }
function receiptCounts() {
  const counts={pending:0,synced:0,failed:0};
  for(const row of db.prepare('SELECT feishu_status AS status,count(*) AS n FROM pc_stock_receipts GROUP BY feishu_status').all()) counts[row.status]=row.n;
  return counts;
}
function status() {
  let lastError;
  try { mapping('FEISHU_WAREHOUSE_FIELDS',ledgerDefaults); mapping('FEISHU_INVENTORY_FIELDS',inventoryDefaults); }
  catch(error) { lastError=error.message; }
  lastError ||= db.prepare("SELECT feishu_error FROM pc_stock_receipts WHERE feishu_status='failed' ORDER BY created_at DESC LIMIT 1").get()?.feishu_error;
  return {configured:feishuConfigured,baseConfigured:configured(ledgerTable),inventoryConfigured:configured(inventoryTable),...receiptCounts(),...(lastError?{lastError}:{})};
}
function tablePath(table) { return 'bitable/v1/apps/'+encodeURIComponent(baseToken)+'/tables/'+encodeURIComponent(table)+'/records'; }
let syncing;
async function syncReceipts() {
  if (!configured(ledgerTable)) fail(503,'Configure FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_WAREHOUSE_BASE_TOKEN and FEISHU_WAREHOUSE_TABLE_ID on the NAS first.');
  const fields=mapping('FEISHU_WAREHOUSE_FIELDS',ledgerDefaults);
  let synced=0,failed=0;
  const receipts=db.prepare("SELECT * FROM pc_stock_receipts WHERE feishu_status IN ('pending','failed') ORDER BY feishu_attempts,created_at,id LIMIT 20").all();
  for(const receipt of receipts) {
    try {
      // A permanent receipt ID is searched before writing, and reused as Feishu's UUID client_token.
      // This also recovers a write whose response was lost before the local acknowledgement.
      const existing=await feishuRequest(tablePath(ledgerTable)+'/search?page_size=1','POST',{
        field_names:[fields.receiptId],filter:{conjunction:'and',conditions:[{field_name:fields.receiptId,operator:'is',value:[receipt.id]}]}
      });
      let recordId=existing?.items?.[0]?.record_id;
      if (!recordId) {
        const values={receiptId:receipt.id,name:receipt.item_name,spec:receipt.spec,quantity:receipt.quantity,unit:receipt.unit,
          location:receipt.location,requestId:receipt.request_id,createdAt:Date.parse(receipt.created_at),actor:receipt.actor_name};
        const response=await feishuRequest(tablePath(ledgerTable)+'?client_token='+encodeURIComponent(receipt.id),'POST',{
          fields:Object.fromEntries(Object.entries(values).map(([key,value])=>[fields[key],value]))
        });
        recordId=response?.record?.record_id;
      }
      if(typeof recordId !== 'string' || !recordId) throw new Error('Feishu did not return a warehouse record ID.');
      synced += db.prepare("UPDATE pc_stock_receipts SET feishu_status='synced',feishu_record_id=?,feishu_error=NULL,feishu_synced_at=? WHERE id=? AND feishu_status<>'synced'").run(recordId,new Date().toISOString(),receipt.id).changes;
    } catch(error) {
      const message=error.status?error.message:'Feishu warehouse is temporarily unavailable. Retry after checking the network.';
      failed += db.prepare("UPDATE pc_stock_receipts SET feishu_status='failed',feishu_error=?,feishu_attempts=feishu_attempts+1 WHERE id=? AND feishu_status<>'synced'").run(message.slice(0,500),receipt.id).changes;
    }
  }
  return {synced,failed,pending:receiptCounts().pending};
}
export function syncWarehouse() {
  if(!syncing) syncing=syncReceipts().finally(()=>syncing=null);
  return syncing;
}
function cellText(value) {
  if(typeof value === 'string')return value;
  if(Array.isArray(value))return value.map(cellText).join('');
  if(value && typeof value === 'object')return typeof value.text==='string'?value.text:typeof value.name==='string'?value.name:'';
  return value==null?'':String(value);
}
async function remoteInventory(params) {
  if(!configured(inventoryTable))fail(503,'Configure FEISHU_INVENTORY_TABLE_ID to query the existing Feishu stock balance table.');
  const fields=mapping('FEISHU_INVENTORY_FIELDS',inventoryDefaults),query=(params.get('q')||'').trim();
  const pageToken=params.get('pageToken')||'';
  if(query.length>200||pageToken.length>2000)fail(400,'Inventory search is too long.');
  const search=new URLSearchParams({page_size:'100',...(pageToken?{page_token:pageToken}:{})});
  const data=await feishuRequest(tablePath(inventoryTable)+'/search?'+search,'POST',{
    field_names:Object.values(fields),...(query?{filter:{conjunction:'or',conditions:['name','spec'].map(key=>({field_name:fields[key],operator:'contains',value:[query]}))}}:{})
  });
  return {items:(data?.items||[]).map(row=>({id:row.record_id,source:'feishu',name:cellText(row.fields?.[fields.name]),spec:cellText(row.fields?.[fields.spec]),
    unit:cellText(row.fields?.[fields.unit]),quantity:Number(row.fields?.[fields.quantity])||0,location:cellText(row.fields?.[fields.location])})),
    hasMore:Boolean(data?.has_more),nextPageToken:data?.page_token||''};
}
export async function warehouseApi(req,res,pathname,params) {
  const auth=authenticate(req);if(!auth?.user)fail(401,'Sign in to gitpolar first.');
  if(req.method !== 'GET' && !auth.token)requireOrigin(req);
  if(pathname==='/api/procurement/feishu/status'&&req.method==='GET')return json(res,status());
  if(pathname==='/api/procurement/feishu/inventory'&&req.method==='GET')return json(res,await remoteInventory(params));
  if(pathname==='/api/procurement/feishu/sync'&&req.method==='POST'){
    if(!canManageWarehouse(auth.user))fail(403,'Only a project manager or storekeeper can sync warehouse receipts.');
    return json(res,await syncWarehouse());
  }
  fail(404,'Unknown Feishu warehouse endpoint.');
}
export function startWarehouseSync() {
  if(process.env.FEISHU_WAREHOUSE_AUTO_SYNC!=='true'||!configured(ledgerTable))return;
  const timer=setInterval(()=>syncWarehouse().catch(()=>{}),60000);timer.unref();
  return ()=>clearInterval(timer);
}
