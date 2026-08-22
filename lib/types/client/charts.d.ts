/** Dependency-free bar chart and heatmap primitives. */
import { type ReactElement } from 'react';
import { type LocaleId } from './i18n.tsx';
export interface BarDatum {
    label: string;
    value: number;
    /** Tooltip text, composed as `heading · row · row`; each ` · ` segment is
     *  rendered on its own line, the first as the heading. */
    title?: string;
}
/** Color palette for per-model grouped bars, cycled by model order. */
export declare const MODEL_COLORS: string[];
export declare function Bars(props: {
    data: BarDatum[];
    height?: number;
    labelEvery?: number;
    minWidth?: number;
}): ReactElement;
export interface HeatDatum {
    date: string;
    total: number;
    cost: number;
    calls: number;
}
/**
 * Multi-series bar chart: one bar per time slot, each series' value stacked
 * inside it (series[0] at the bottom, later series stacked above, same order
 * in every column). Segment height is scaled against the largest *per-slot
 * total* across all slots (not the largest single value) so the stacked
 * height reflects that slot's combined usage and columns stay comparable to
 * each other. Each segment stays its own focusable/hoverable/tappable point —
 * `pointIndex = i * series.length + seriesIndex` is unchanged from the old
 * side-by-side layout, so `chart-focus.ts`'s roving tabindex (plain ±1 /
 * Home / End, no 2-D semantics) needs no changes: arrow keys still move one
 * point at a time, they just now walk bottom-to-top through one column's
 * models before advancing to the next column, instead of left-to-right
 * through side-by-side bars.
 */
export declare function GroupedBars(props: {
    series: Array<{
        key: string;
        color: string;
        bars: BarDatum[];
    }>;
    height?: number;
    labelEvery?: number;
    minWidth?: number;
}): ReactElement;
/**
 * Calendar heatmap: one flex column per week, cells filling the card's full
 * width (rather than a fixed pixel size hugging the left edge), month labels
 * below the grid and a 少→多 scale legend — modelled on Codex's activity
 * graph. No weekday row: at this cell count a day is identified by hovering
 * it, not by which row it sits in.
 */
export declare function Heatmap(props: {
    data: HeatDatum[];
}): ReactElement;
export declare const fmt: (v: string | number) => string;
export declare const fmtInt: (v: number | undefined) => string;
export declare const fmtCompact: (v: number | undefined, locale?: LocaleId) => string;
