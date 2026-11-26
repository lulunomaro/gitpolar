import readExcelFile from 'read-excel-file/node';
import { unzipSync } from 'fflate';
import { posix } from 'node:path';
import { fail } from './auth.mjs';

export const importLimit = 128 * 1024 * 1024;
export const importItemLimit = 1000;
export const machiningCategories = ['碳板','cnc','铝方管','打印件','金属3d打印','钢件铨洲','玻纤板','其他'];
const cell = value => String(value ?? '').trim();
const header = value => cell(value).toLowerCase().replace(/[\s（）()／/]/g, '');
const stem = value => posix.basename(value.replaceAll('\\', '/')).replace(/\.[^.]+$/, '').toLowerCase();
const aliases = {
  name:['零件名称','品名','名称','物料名称','name'], code:['编号','零件编号','物料编码','code'],
  quantity:['数量','采购数量','需求数量','quantity','qty'], spec:['规格 / 尺寸（mm）','规格','规格型号','型号','尺寸','spec'],
  process:['类别','分类','工艺','加工类别','category','process'], material:['建议制造 / 采购材料','采购材料','材料','材质','material'],
  unit:['单位','unit'], price:['预算单价','单价','单价元','含税单价','price'], url:['购买链接','采购链接','商品链接','链接','url'],
  filename:['对应交付文件','交付文件','文件名','模型文件','STEP文件','filename'], notes:['备注','安装位置','部位']
};
export function parseDelimited(input) {
  const text = String(input).replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
  const rows = [], row = [];
  let value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || !value) quoted = !quoted;
      else value += c;
    } else if (!quoted && (c === delimiter || c === '\n' || c === '\r')) {
      row.push(value); value = '';
      if (c !== delimiter) { if (c === '\r' && text[i + 1] === '\n') i++; rows.push(row.splice(0)); }
    } else value += c;
  }
  if (quoted) fail(400, '表格有未闭合的引号，请检查 CSV 或粘贴内容。');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
function decodedName(name) {
  if (/[\u4e00-\u9fff]/.test(name) || !/[\x80-\xff]/.test(name)) return name.replaceAll('\\', '/');
  try { return new TextDecoder('gb18030', {fatal:true}).decode(Uint8Array.from(name, c => c.charCodeAt(0))).replaceAll('\\', '/'); }
  catch { return name.replaceAll('\\', '/'); }
}
function archive(bytes) {
  let expanded = 0, count = 0;
  try {
    return Object.entries(unzipSync(bytes, {filter(info) {
      if (!/\.(?:step|stp|dwg|xlsx|csv|tsv)$/i.test(info.name) || /(?:^|\/)__MACOSX\//.test(info.name)) return false;
      expanded += info.originalSize;
      if (++count > 3000 || expanded > 512 * 1024 * 1024 || info.originalSize > 64 * 1024 * 1024) fail(413, '整包最多 3000 个相关文件，解压后最多 512 MiB，每个附件最多 64 MiB。');
      return true;
    }})).map(([name, bytes]) => ({name:decodedName(name), bytes:Buffer.from(bytes)}));
  } catch (error) { if (error.status) throw error; fail(400, '无法读取 ZIP，请上传未加密的 BOM.zip 或 STEP/DWG 文件包。'); }
}
async function workbook(bytes) {
  try {
    const sheets = await readExcelFile(bytes);
    return (sheets.find(sheet => sheet.sheet === '总表') || sheets[0])?.data || [];
  } catch { fail(400, '无法读取 Excel，请使用 .xlsx 格式，或另存为 CSV。'); }
}
function textBytes(bytes) {
  try { return new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { return new TextDecoder('gb18030').decode(bytes); }
}
export async function parseProcurementImport(bytes, filename, pasted = false) {
  const files = /\.zip$/i.test(filename) ? archive(bytes) : [];
  const pairs = new Map();
  for (const file of files) {
    if (!/\.(step|stp|dwg)$/i.test(file.name)) continue;
    const key = file.name.replace(/\.[^.]+$/, '').toLowerCase();
    let pair = pairs.get(key);
    if (!pair) { pair = {key, name:posix.basename(file.name).replace(/\.[^.]+$/, ''), process: file.name.split('/').slice(0,-1).reverse().find(x => machiningCategories.includes(x)) || '其他'}; pairs.set(key, pair); }
    const type = /\.dwg$/i.test(file.name) ? 'drawing' : 'model';
    if (pair[type]) fail(400, '同一目录有重名模型或图纸：' + file.name);
    pair[type] = file;
  }
  const sheetFile = files.filter(file => /\.(xlsx|csv|tsv)$/i.test(file.name) && !posix.basename(file.name).startsWith('~$')).sort((a,b) => Number(/bom/i.test(b.name)) - Number(/bom/i.test(a.name)))[0];
  let table = [];
  if (sheetFile) table = /\.xlsx$/i.test(sheetFile.name) ? await workbook(sheetFile.bytes) : parseDelimited(textBytes(sheetFile.bytes));
  else if (/\.xlsx$/i.test(filename)) table = await workbook(bytes);
  else if (pasted || /\.(csv|tsv|txt)$/i.test(filename)) table = parseDelimited(textBytes(bytes));
  else if (!/\.zip$/i.test(filename)) fail(400, '请导入 BOM.zip、Excel .xlsx、CSV，或粘贴表格。');
  const warnings = [], items = [], used = new Set();
  if (table.length) {
    const headerIndex = table.findIndex(row => row.some(value => aliases.name.map(header).includes(header(value))));
    if (headerIndex < 0) fail(400, '没有找到“零件名称 / 品名 / 名称”表头。可下载模板后填入，或直接粘贴带表头的 Excel 区域。');
    const headers = table[headerIndex].map(header);
    const columns = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex(h => names.map(header).includes(h))]));
    for (const [index, row] of table.slice(headerIndex + 1).entries()) {
      const get = key => columns[key] < 0 ? '' : cell(row[columns[key]]);
      const name = get('name');
      if (!name || ['合计','总计'].includes(name)) continue;
      const quantity = Number(get('quantity') || 1), rawPrice = get('price').replace(/[￥¥,]/g, '');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) fail(400, '表格第 ' + (headerIndex + index + 2) + ' 行的数量须为 1～1000000 的整数。');
      if (rawPrice && !/^\d+(\.\d{1,2})?$/.test(rawPrice)) fail(400, '表格第 ' + (headerIndex + index + 2) + ' 行的单价须为人民币元，最多两位小数。');
      const unitPriceCents = Math.round(Number(rawPrice || 0) * 100);
      if (!Number.isSafeInteger(unitPriceCents)) fail(400, '表格单价超出范围。');
      const candidates = [get('filename'), [get('code'),name].filter(Boolean).join('_'), name, get('code')].filter(Boolean);
      const wanted = get('filename').split(/[\r\n;]/).map(s => s.trim()).filter(Boolean);
      let pair = [...pairs.values()].find(p => wanted.some(path => p.key === path.replaceAll('\\','/').replace(/\.[^.]+$/, '').toLowerCase()));
      if (!pair) {
        const matches = [...pairs.values()].filter(p => candidates.some(candidate => stem(candidate) === stem(p.name)) || (get('code') && p.name.toLowerCase().startsWith(get('code').toLowerCase() + '_')));
        if (matches.length === 1) pair = matches[0];
        else if (matches.length > 1) warnings.push(name + ' 有多个同名交付文件，请按目录核对，未自动配对。');
      }
      if (pair) used.add(pair.key);
      const process = get('process') || pair?.process || '';
      const kind = process === '标准件' ? 'standard' : pair || process ? 'machining' : 'standard';
      const item = {_importNames:candidates.map(stem),kind,name,quantity,unit:get('unit') || '件',unitPriceCents,spec:[get('spec'),get('notes')].filter(Boolean).join('\n'),url:get('url'),material:get('material'),process:kind === 'standard' ? '' : process || '其他',threads:[],_pair:pair};
      if (kind === 'machining' && !pair) warnings.push(name + ' 尚未配对 STEP / DWG，请补充交付文件后提交。');
      items.push(item);
    }
  }
  for (const pair of pairs.values()) {
    if (!used.has(pair.key)) items.push({kind:pair.process==='标准件'?'standard':'machining',name:pair.name,quantity:1,unit:'件',unitPriceCents:0,spec:'',url:'',material:'',process:pair.process,threads:[],_pair:pair});
  }
  if (!items.length) fail(400, '没有找到采购明细或 STEP/DWG 文件。');
  if (items.length > importItemLimit) fail(400, '每次最多导入 1000 个明细，请分成多个批次。');
  return {items,warnings};
}
