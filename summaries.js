import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function localOrigin(value) {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(u.hostname)
    || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('Summary origin must be loopback HTTP.');
  return u.origin;
}
export function activeSummaries(detail, sessionId) {
  if (detail?.id !== sessionId || !Array.isArray(detail.blockDetails)) throw new Error('Summary identity/schema mismatch.');
  const blocks = detail.blockDetails;
  if (blocks.some(b => !b || typeof b.blockId !== 'string' || typeof b.active !== 'boolean'
    || (b.directBlockIds !== undefined && (!Array.isArray(b.directBlockIds) || b.directBlockIds.some(id => typeof id !== 'string'))))) throw new Error('Unsupported block schema.');
  const byId = new Map(blocks.map(b => [b.blockId, b]));
  if (byId.size !== blocks.length) throw new Error('Duplicate block identity.');
  const covered = new Set();
  const visit = (id, seen) => {
    const pending = [id];
    while (pending.length) {
      const next = pending.pop();
      if (seen.has(next)) continue;
      seen.add(next); covered.add(next);
      pending.push(...(byId.get(next)?.directBlockIds ?? []));
    }
  };
  for (const b of blocks.filter(b => b.active === true)) {
    for (const id of b.directBlockIds ?? []) visit(id, new Set([b.blockId]));
  }
  const texts = blocks.filter(b => b.active === true && !covered.has(b.blockId)
    && !(b.parentBlockId && byId.get(b.parentBlockId)?.active === true)
    && typeof b.summary === 'string').sort((a,b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map(b => b.summary.trim()).filter(Boolean);
  return [...new Set(texts)];
}
// Only a bounded, exact-session GET; never calls compression or a model.
export async function readSummaries(sessionId, config, signal, deps = {}) {
  if (!config.summaryChars) return [];
  const timeout = AbortSignal.timeout(1500);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let reader;
  try {
    const stateHome = process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
    let discovered = config.summaryOrigin;
    if (!discovered) {
      const raw = (await (deps.readFile ?? readFile)(join(stateHome, 'billion-context', 'proxy-origin'), { encoding: 'utf8', signal: combined })).trim();
      discovered = raw.startsWith('{') ? JSON.parse(raw).origin : raw;
    }
    const origin = localOrigin(discovered);
    const response = await (deps.fetch ?? globalThis.fetch)(`${origin}/__bili/sessions/${encodeURIComponent(sessionId)}/detail`, { signal: combined, redirect: 'error', headers: { 'x-bili-plugin-bypass': '1' } });
    reader = response.body?.getReader();
    if (!response.ok || Number(response.headers.get('content-length')) > 2097152) return [];
    if (!reader) return [];
    let size = 0; const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2097152) return [];
      chunks.push(value);
    }
    return activeSummaries(JSON.parse(Buffer.concat(chunks).toString('utf8')), sessionId);
  } catch { return []; }
  finally { if (reader) await reader.cancel().catch(() => {}); }
}
