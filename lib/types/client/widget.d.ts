/** The draggable bottom-right floating balance widget.
 *
 * Where it sits (corner) and whether it is collapsed are user choices, so both
 * are persisted (see ./prefs.ts) and restored before the first paint; the
 * widget also re-snaps to its corner when the frame resizes (window resize,
 * sidebar collapse) instead of stranding itself at stale pixel coordinates.
 */
import { type ReactElement } from 'react';
import type { ConversationViewsSource } from './views.ts';
interface SessionListState {
    current?: string;
}
export type UseSessionsHook = <T>(selector: (state: SessionListState) => T) => T;
export declare function QuotaWidget(props: {
    useSessions: UseSessionsHook;
    views: ConversationViewsSource;
}): ReactElement | null;
export {};
