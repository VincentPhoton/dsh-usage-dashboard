export interface Store<T> {
    get(): T;
    set(value: T): void;
    subscribe(fn: () => void): () => void;
}
/** Whether the floating balance widget is shown. */
export declare const widgetVisibleStore: Store<boolean>;
/** Conversation view ids on which the widget is allowed to appear. `null`
 * means "all available views" and preserves the pre-setting default; once a
 * user customizes the list, newly installed plugin tabs arrive unchecked. */
export declare const widgetTabIdsStore: Store<string[] | null>;
/** Balance (in the account's own currency) below which both surfaces warn.
 *  0 turns the warning off. */
export declare const lowBalanceStore: Store<number>;
/** Monthly estimated-cost budget in CNY. 0 leaves budget tracking disabled. */
export declare const monthlyBudgetStore: Store<number>;
/** Shared time range for the usage chart and both cost rankings. */
export declare const usageWindowStore: Store<7 | 30 | 90 | 365>;
/** Whether charts compare token volume, estimated CNY cost, or call count. */
export declare const chartMetricStore: Store<"cost" | "calls" | "tokens">;
export declare const quotaViewActiveStore: Store<boolean>;
