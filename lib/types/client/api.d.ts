import type { BalanceResponse, SessionUsageResponse, UsageResponse } from '../contract.ts';
/** Last cached value (possibly stale), for an instant first render. */
export declare const getCachedBalance: () => BalanceResponse | null;
export declare const getCachedUsage: () => UsageResponse | null;
/** When the cached usage was fetched, so a consumer can say how old it is. */
export declare const getCachedUsageAt: () => number | null;
export declare const subscribeUsage: (fn: () => void) => (() => void);
export declare function fetchBalance(force?: boolean): Promise<BalanceResponse>;
export declare function fetchUsage(force?: boolean): Promise<UsageResponse>;
export declare const getCachedSessionUsage: (sessionId: string) => SessionUsageResponse | null;
export declare const subscribeSessionUsage: (sessionId: string, fn: () => void) => (() => void);
export declare function fetchSessionUsage(sessionId: string, force?: boolean): Promise<SessionUsageResponse>;
