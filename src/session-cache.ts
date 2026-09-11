/**
 * Revision-keyed cache for one session's folded usage.
 *
 * Reading a session log means decompressing and JSON-parsing every event in it
 * — on this machine ~170ms for 27 MiB of logs across 12 sessions, against ~8ms
 * to fold the parsed events into aggregates. The host's `list()`/`stat()` hand
 * out an opaque `revision` per session that is comparable for equality, so an
 * unchanged log can reuse its previous fold instead of being read again.
 *
 * Rules that keep this safe:
 *
 * - an entry is only stored and only served when the caller supplies a
 *   revision; without one there is no way to prove the log is unchanged, so
 *   the caller must re-read (this is what keeps legacy hosts correct);
 * - a revision that no longer matches is a miss, never a stale hit;
 * - the cache never invents data: a miss is always "re-read the log".
 *
 * `weight` lets the owner bound memory by something meaningful (records held,
 * not sessions), and {@link RevisionCache.retainOnly} drops sessions that have
 * disappeared from disk so the cache cannot grow forever.
 */

interface Entry<T> {
  revision: string
  value: T
  weight: number
}

export interface RevisionCache<T> {
  /** Cached value for exactly this revision; undefined on miss or no revision. */
  get(id: string, revision: string | undefined): T | undefined
  /** Store a fold. Ignored without a revision, since it could never be served. */
  set(id: string, revision: string | undefined, value: T, weight: number): void
  /** Drop every entry whose id is not listed (deleted sessions, eviction). */
  retainOnly(ids: Iterable<string>): void
  /** Total weight currently held, for tests and diagnostics. */
  weight(): number
  /** Number of sessions currently held, for tests and diagnostics. */
  size(): number
}

/**
 * @param maxWeight - upper bound on the summed weight of all entries. Once
 *   exceeded, least-recently-used entries are dropped until it fits again; a
 *   single entry heavier than the cap is still stored (the alternative would
 *   be re-reading it on every request).
 */
export function createRevisionCache<T>(maxWeight: number): RevisionCache<T> {
  const entries = new Map<string, Entry<T>>()
  let total = 0

  const drop = (id: string): void => {
    const entry = entries.get(id)
    if (entry === undefined) return
    entries.delete(id)
    total -= entry.weight
  }

  return {
    get: (id, revision) => {
      if (revision === undefined || revision === '') return undefined
      const entry = entries.get(id)
      if (entry === undefined || entry.revision !== revision) return undefined
      // Refresh recency: a session the dashboard keeps asking about must not be
      // evicted in favour of a one-off old one.
      entries.delete(id)
      entries.set(id, entry)
      return entry.value
    },
    set: (id, revision, value, weight) => {
      if (revision === undefined || revision === '') return
      drop(id)
      entries.set(id, { revision, value, weight })
      total += weight
      while (total > maxWeight && entries.size > 1) {
        const oldest = entries.keys().next()
        if (oldest.done === true) break
        drop(oldest.value)
      }
    },
    retainOnly: (ids) => {
      const keep = ids instanceof Set ? ids : new Set(ids)
      for (const id of [...entries.keys()]) if (!keep.has(id)) drop(id)
    },
    weight: () => total,
    size: () => entries.size,
  }
}
