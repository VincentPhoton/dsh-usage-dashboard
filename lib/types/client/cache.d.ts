/**
 * Package-local TTL caches shared by the widget, the dashboard, and every
 * tab switch. Cached values outlive the TTL: `get()` still returns them
 * (marked by `at`) so a reopening tab can render instantly and refresh in
 * the background, while `getFresh()` is the cache-aware fetch path.
 *
 * When a `storageKey` is given, every `put()` also mirrors the entry to
 * localStorage so a page refresh keeps the instant first paint (the data
 * shown is the last known good value; a background refresh updates it).
 */
export interface CacheHit<T> {
    data: T;
    at: number;
}
export interface ResourceCache<T> {
    /** Last cached value even when stale; null when never cached. */
    get(): CacheHit<T> | null;
    /** Value only when it is still within the TTL. */
    getFresh(): T | null;
    put(data: T): void;
}
export declare function createCache<T>(ttlMs: number, storageKey?: string, isUsable?: (data: T) => boolean): ResourceCache<T>;
