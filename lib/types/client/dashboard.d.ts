/** The 「额度」 conversation view tab: full balance & usage dashboard.
 *
 * Caching: the first render comes straight from the package-local cache
 * (see ./api.ts), so reopening the tab shows data instantly. A background
 * refresh then updates it without blocking; a full-screen 加载中 only
 * appears when nothing has ever been cached.
 */
import { type ReactElement } from 'react';
import { type Translate } from './i18n.tsx';
import type { ModelUsage } from '../contract.ts';
import type { ConversationViewsSource } from './views.ts';
export declare const modelKeyOf: (m: ModelUsage) => string;
export declare const modelNameOf: (m: ModelUsage, t?: Translate) => string;
export declare function BalanceDashboard(props: {
    sessionId?: string;
    views: ConversationViewsSource;
}): ReactElement;
