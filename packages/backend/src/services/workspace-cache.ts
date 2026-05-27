/**
 * Workspace ACL cache abstraction.
 *
 * Today we run on a single Railway instance so an in-process Map is fine.
 * The moment we scale horizontally, two instances will have divergent
 * caches and a workspace revocation on instance A won't propagate to
 * instance B until both their TTLs expire.
 *
 * This module hides the backend choice behind a small interface so the
 * switch to Redis (or any distributed cache) is a one-file change in
 * `getBackend()` below.
 *
 * Cached value semantics:
 *   - `string[]` → list of workspace names the user is allowed in
 *   - `null`     → user is superadmin (unrestricted)
 *   - cache miss → not present in cache
 */

export type AllowedWorkspaces = string[] | null;

export interface WorkspaceCacheBackend {
  get(userId: string): Promise<AllowedWorkspaces | undefined>;
  set(userId: string, value: AllowedWorkspaces, ttlMs: number): Promise<void>;
  delete(userId: string): Promise<void>;
}

// ─── Default: in-memory Map with TTL ───────────────────────────────

interface Entry {
  value: AllowedWorkspaces;
  expiresAt: number;
}

class InMemoryBackend implements WorkspaceCacheBackend {
  private store = new Map<string, Entry>();

  async get(userId: string): Promise<AllowedWorkspaces | undefined> {
    const entry = this.store.get(userId);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(userId);
      return undefined;
    }
    return entry.value;
  }

  async set(userId: string, value: AllowedWorkspaces, ttlMs: number): Promise<void> {
    this.store.set(userId, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(userId: string): Promise<void> {
    this.store.delete(userId);
  }
}

// ─── Backend selection ─────────────────────────────────────────────
// To wire Redis in the future:
//   1. Add `redis` to package.json
//   2. Implement `class RedisBackend implements WorkspaceCacheBackend`
//      using GET/SETEX/DEL
//   3. In getBackend(): `if (process.env.REDIS_URL) return new RedisBackend(...)`
// No call sites change.

let backend: WorkspaceCacheBackend | null = null;

export function getWorkspaceCacheBackend(): WorkspaceCacheBackend {
  if (!backend) {
    backend = new InMemoryBackend();
  }
  return backend;
}

/** Test hook: replace the backend (e.g. with a stub). */
export function _setWorkspaceCacheBackendForTests(b: WorkspaceCacheBackend) {
  backend = b;
}
