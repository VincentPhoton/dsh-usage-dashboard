import type { BalanceResponse, SessionUsageResponse, UsageResponse } from './contract.ts';
import type { CredentialsFace, SessionPersistenceFace } from './context.ts';
export declare function fetchBalance(credentials: CredentialsFace | undefined): Promise<BalanceResponse>;
export declare function fetchUsage(persistence: SessionPersistenceFace | undefined, nowMs?: number): Promise<UsageResponse>;
/**
 * Usage for exactly one session — the 「额度」tab's own conversation, as
 * opposed to `fetchUsage`'s account-wide replay. Reads a single session log
 * (not every session on disk), so it is cheap enough to call on every tab
 * mount without a TTL memo; the caller is expected to re-fetch whenever the
 * session id it cares about changes.
 */
export declare function fetchSessionUsage(persistence: SessionPersistenceFace | undefined, sessionId: string): Promise<SessionUsageResponse>;
