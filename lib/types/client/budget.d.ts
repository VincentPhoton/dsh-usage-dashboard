export type BudgetStatus = 'healthy' | 'risk' | 'over';
export interface BudgetSnapshot {
    spent: number;
    budget: number;
    ratio: number;
    remaining: number;
    forecast: number;
    forecastOver: number;
    status: BudgetStatus;
}
/**
 * Project the current month's cost to month end. DeepSeek's billing boundary
 * is Beijing time, so this stays deterministic even when the browser runs in
 * another timezone.
 */
export declare function budgetSnapshot(spentValue: number, budgetValue: number, nowMs?: number): BudgetSnapshot;
