export type ChartFocusKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';
/** Resolve roving focus without adding every chart point to the page Tab order. */
export declare function nextChartFocus(current: number, count: number, key: ChartFocusKey, horizontalStep?: number): number;
export declare function lastPopulatedIndex(values: number[]): number;
/**
 * Touch tap toggles a chart point's tooltip pin: tapping the already-pinned
 * point releases it, tapping any other point (or none pinned yet) pins that
 * one instead. Shared by bar, grouped-bar and heatmap touch handling so pin
 * state never forks into a parallel machine per chart type.
 */
export declare function nextPinnedIndex(current: number | null, tapped: number): number | null;
/**
 * Distinguishes a tap from a scroll/drag using the touch/pointer start-to-end
 * displacement and elapsed time. A page scroll that merely passes over a data
 * point moves well past `moveThreshold` before release; a long press held past
 * `timeThreshold` without lifting is not a quick tap either.
 */
export declare function isTapGesture(dx: number, dy: number, dt: number, moveThreshold?: number, timeThreshold?: number): boolean;
/**
 * Per-slot totals across every series of a stacked bar chart: each column's
 * height must reflect the *summed* usage of every selected model at that
 * time slot, not any single model's value — otherwise a column with many
 * small models would look shorter than a column with one large one even
 * though it represents more total usage.
 */
export declare function stackedTotals(series: Array<{
    bars: Array<{
        value: number;
    }>;
}>, count: number): number[];
/**
 * Highest value in the list, or 1 when every value is zero — the shared
 * fallback scale so an all-zero chart still divides safely instead of by 0.
 */
export declare function maxOrOne(values: number[]): number;
