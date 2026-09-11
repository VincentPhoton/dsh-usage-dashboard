/**
 * Tiny TTL memo for the /api routes.
 *
 * The usage endpoint replays every session log, so it must not run on every
 * tab click; the balance endpoint also calls the DeepSeek API. The memo:
 *
 * - `get()` serves a successful cached response while it is within `ttlMs`,
 *   otherwise recomputes;
 * - `refresh()` recomputes unconditionally and reseeds the cache, superseding
 *   any compute already in flight (the user asked for a bypass, so joining an
 *   older computation would hand back exactly what they were bypassing);
 * - concurrent recomputes of the same kind are deduped into one upstream call;
 * - `ok:false` responses are never cached, so a transient failure is retried
 *   on the next request.
 *
 * No timers are held, so nothing needs disposal on plugin unload.
 */

interface Entry<T> {
  value: T
  setAt: number
}

interface MemoState<T> {
  entry: Entry<T> | undefined
  inflight: Promise<T> | undefined
}

export interface Memo<T> {
  get(): Promise<T>
  refresh(): Promise<T>
}

export function memoize<T extends { ok: boolean }>(ttlMs: number, compute: () => Promise<T>): Memo<T> {
  const state: MemoState<T> = { entry: undefined, inflight: undefined }

  /**
   * Start a compute and take ownership of `inflight`. Only the newest
   * computation owns the slot and the cache: a superseded one must neither
   * clear the slot (a later caller would start a redundant third compute) nor
   * seed its value, because "finishes later" does not mean "is fresher" — a
   * slow superseded replay landing after a fast refresh would otherwise
   * overwrite the newer response with staler data.
   */
  const start = (): Promise<T> => {
    const task = compute().then(
      (value) => {
        if (state.inflight === task) {
          state.inflight = undefined
          if (value.ok) state.entry = { value, setAt: Date.now() }
        }
        return value
      },
      (err: unknown) => {
        if (state.inflight === task) state.inflight = undefined
        throw err
      },
    )
    state.inflight = task
    return task
  }

  return {
    get: () => {
      const hit = state.entry
      if (hit !== undefined && hit.value.ok && Date.now() - hit.setAt < ttlMs) {
        return Promise.resolve(hit.value)
      }
      // Join whatever compute is already running rather than starting a second.
      return state.inflight ?? start()
    },
    // An explicit refresh must not be answered with a computation that started
    // before the user asked: it supersedes the in-flight one and returns its
    // own result.
    refresh: () => start(),
  }
}
