import { type Translate } from './i18n.tsx';
/** Value axis shared by daily, hourly, and per-model usage charts. */
export declare const CHART_METRICS: readonly ["tokens", "cost", "calls"];
export type ChartMetric = (typeof CHART_METRICS)[number];
export interface ChartMetricPoint {
    total: number;
    cost: number;
    calls: number;
}
export declare const isChartMetric: (value: unknown) => value is ChartMetric;
export declare function chartMetricValue(metric: ChartMetric, point: ChartMetricPoint): number;
export declare function chartMetricName(metric: ChartMetric, t?: Translate): string;
