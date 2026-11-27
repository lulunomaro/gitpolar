import { AsyncLocalStorage } from 'node:async_hooks';
import { origin, originAliases } from './config.mjs';

const context = new AsyncLocalStorage();
const configured = [origin, ...originAliases];
const origins = new Set(configured.map(value => value.origin));

export function requestOrigin() { return context.getStore() || origin; }
export function isApplicationOrigin(value) { return origins.has(value); }

// Only configured hosts select a public URL; forwarded headers never add origins.
export function withRequestOrigin(req, callback) {
  const host = String(req.headers.host || '').toLowerCase();
  const selected = configured.find(value => value.host === host) || origin;
  return context.run(selected, callback);
}
