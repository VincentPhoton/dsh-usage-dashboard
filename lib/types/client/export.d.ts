import type { UsageData } from '../contract.ts';
/** YYYYMMDD in DeepSeek's billing timezone. */
export declare function exportDateStamp(nowMs?: number): string;
/** RFC 4180 cell escaping plus spreadsheet-formula neutralisation for labels. */
export declare function csvCell(value: string | number): string;
export declare function dailyUsageCsv(usage: UsageData): string;
export declare function modelUsageCsv(usage: UsageData): string;
export declare function fullUsageJson(usage: UsageData, nowMs?: number): string;
export declare function downloadText(filename: string, text: string, mediaType: string): void;
