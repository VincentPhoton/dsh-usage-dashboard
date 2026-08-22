/**
 * dsh-usage-dashboard host plugin.
 *
 * Registers the package's own fenced JSON API under
 * `/api/dsh-usage-dashboard` (balance + usage + session), consumed by the
 * client half through same-origin fetch. `balance` and `usage` are memoized
 * with a TTL so that tab switches and the widget's polling don't replay
 * session logs or hammer the DeepSeek API; responses carry `Cache-Control`
 * so the browser's HTTP cache serves repeat requests without a network
 * round trip. `?refresh=1` bypasses the memo for an explicit force refresh.
 * `session` (usage for exactly one session, keyed by `?id=`) reads a single
 * session log and is deliberately not memoized — it is cheap and must
 * reflect that session's live state, not a 5-minute-stale snapshot.
 */
import type { HostContext } from './context.ts';
/** Plugin identity for the cordis.patch.yml row (and the client bundle id). */
export declare const name = "dsh-usage-dashboard";
/** Services required before load: the web server plus the two data sources. */
export declare const inject: string[];
/**
 * Mount the /api/dsh-usage-dashboard routes.
 * @param ctx - host Cordis context.
 */
export declare function apply(ctx: HostContext): void;
