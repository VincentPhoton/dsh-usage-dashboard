import { type Translate } from './i18n.tsx';
export type SyncState = 'syncing' | 'fresh' | 'cached' | 'fallback' | 'error';
/** Short, stable freshness copy for the dashboard status row. */
export declare function updatedText(updatedAt: number | null, nowMs?: number, t?: Translate): string;
export declare function syncStatusText(state: SyncState, updatedAt: number | null, nowMs?: number, t?: Translate): string;
