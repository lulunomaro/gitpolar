import { fail } from './auth.mjs';

// Request contract of ghcr.io/immich-app/immich-machine-learning:v3.4.2.
const endpoint = process.env.GITPOLAR_IMMICH_URL?.replace(/\/+$/, '');
export const aiEnabled = Boolean(endpoint);
const clip = process.env.GITPOLAR_IMMICH_CLIP || 'ViT-B-16-SigLIP2__webli';
const face = process.env.GITPOLAR_IMMICH_FACE || 'buffalo_s';
const ocr = process.env.GITPOLAR_IMMICH_OCR || 'PP-OCRv5_mobile';
// Bump the revision when installing different weights under the same names.
export const modelKey = JSON.stringify(['immich-3.4.2/1', process.env.GITPOLAR_IMMICH_REVISION || 'main', clip, face, ocr]);

function vector(raw) {
  const values = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(values) || !values.length || values.length > 8192 || !values.every(Number.isFinite))
    throw new Error('Immich 返回了无效的特征向量');
  const norm = Math.hypot(...values);
  if (!norm) throw new Error('Immich 返回了空特征向量');
  return Float32Array.from(values, value => value / norm);
}

export function similarity(a, b) {
  if (a.length !== b.length) throw new Error('模型特征维度不一致，请检查模型版本');
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

async function predict(entries, field, value) {
  if (!endpoint) fail(503, 'NAS 尚未配置 Immich 识别服务。');
  const form = new FormData();
  form.set('entries', JSON.stringify(entries));
  if (field === 'image') form.set(field, new Blob([value], {type:'image/jpeg'}), 'preview.jpg');
  else form.set(field, value);
  let response;
  try {
    response = await fetch(endpoint + '/predict', {method:'POST', body:form, redirect:'error', signal:AbortSignal.timeout(180_000)});
  } catch { fail(503, '连接 Immich 超时或服务离线，请检查 NAS 上的机器学习服务。'); }
  if (!response.ok) fail(503, `Immich 推理失败（HTTP ${response.status}），请检查模型和服务日志。`);
  return response.json();
}

export async function recognizePhoto(bytes) {
  const result = await predict({
    clip: {visual:{modelName:clip}},
    'facial-recognition': {detection:{modelName:face, options:{minScore:0.6}}, recognition:{modelName:face}},
    ocr: {detection:{modelName:ocr, options:{minScore:0.5, maxResolution:736}}, recognition:{modelName:ocr, options:{minScore:0.65}}},
  }, 'image', bytes);
  if (!Array.isArray(result.ocr?.text) || !result.ocr.text.every(t => typeof t === 'string') || !Array.isArray(result['facial-recognition']))
    throw new Error('Immich 识别结果不完整');
  const faces = result['facial-recognition'].map(({embedding, boundingBox}) => {
    const box = [boundingBox.x1 / result.imageWidth, boundingBox.y1 / result.imageHeight, boundingBox.x2 / result.imageWidth, boundingBox.y2 / result.imageHeight];
    if (!box.every(Number.isFinite)) throw new Error('Immich 返回了无效的人脸位置');
    return {vector:vector(embedding), box:box.map(x => Math.max(0, Math.min(1, x)))};
  });
  return {visual:vector(result.clip), text:result.ocr.text.join('\n'), faces};
}

const queries = new Map();
export async function encodeQuery(text) {
  if (queries.has(text)) return queries.get(text);
  const pending = predict({clip:{textual:{modelName:clip, options:{language:'zh-Hans'}}}}, 'text', text).then(r => vector(r.clip));
  queries.set(text, pending);
  if (queries.size > 64) queries.delete(queries.keys().next().value);
  try { return await pending; } catch (error) { if (queries.get(text) === pending) queries.delete(text); throw error; }
}
