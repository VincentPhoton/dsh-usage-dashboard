/**
 * Tiny TTL memo for the /api routes.
 *
 * The usage endpoint replays every session log, so it must not run on every
 * tab click; the balance endpoint also calls the DeepSeek API. The memo:
 *
 * - `get()` serves a successful cached response while it is within `ttlMs`,
 *   otherwise recomputes;
 * - `refresh()` recomputes unconditionally and reseeds the cache;
 * - concurrent recomputes (of either kind) are deduped into one upstream
 *   call;
 * - `ok:false` responses are never cached, so a transient failure is retried
 *   on the next request.
 *
 * No timers are held, so nothing needs disposal on plugin unload.
 */
export interface Memo<T> {
    get(): Promise<T>;
    refresh(): Promise<T>;
}
export declare function memoize<T extends {
    ok: boolean;
}>(ttlMs: number, compute: () => Promise<T>): Memo<T>;
