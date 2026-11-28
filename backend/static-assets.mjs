import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const compress = promisify(gzip);
// Keys come exclusively from the server's fixed public asset map.
const files = new Map();

async function asset(file) {
  const url = new URL('../' + file, import.meta.url);
  const info = await stat(url, { bigint: true });
  const version = `${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  let entry = files.get(file);
  if (entry?.version !== version) {
    const content = readFile(url).then(bytes => ({
      bytes,
      etag: `W/"${createHash('sha256').update(bytes).digest('hex')}"`,
    }));
    entry = { version, content };
    files.set(file, entry);
    content.catch(() => { if (files.get(file) === entry) files.delete(file); });
  }
  return entry.content;
}

function acceptsGzip(header = '') {
  let wildcard = false;
  for (const token of header.toLowerCase().split(',')) {
    const [coding, weight] = token.trim().split(/\s*;\s*q\s*=\s*/);
    const enabled = weight === undefined || Number(weight) > 0;
    if (coding === 'gzip') return enabled;
    if (coding === '*') wildcard = enabled;
  }
  return wildcard;
}

export async function serveStatic(req, res, [file, type]) {
  const item = await asset(file);
  res.setHeader('Cache-Control', 'public, no-cache');
  res.setHeader('ETag', item.etag);
  const compressible = item.bytes.length >= 1024 && /^(text\/|application\/(json|wasm))/.test(type);
  if (compressible) res.setHeader('Vary', 'Accept-Encoding');
  const validators = (req.headers['if-none-match'] || '').split(',').map(tag => tag.trim().replace(/^W\//, ''));
  if (validators.includes('*') || validators.includes(item.etag.slice(2))) {
    res.writeHead(304).end();
    return;
  }
  let body = item.bytes;
  if (compressible && acceptsGzip(req.headers['accept-encoding'])) {
    item.gzip ??= compress(body, { level: 4 }).catch(error => { delete item.gzip; throw error; });
    body = await item.gzip;
    res.setHeader('Content-Encoding', 'gzip');
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}
