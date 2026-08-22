/**
 * DeepSeek API price table and cost estimation.
 *
 * Two things the previous flat constant got wrong: every model was billed at
 * deepseek-v4-pro rates (flash is ~3x cheaper), and the 2026-08-17 switch to
 * peak/off-peak pricing was not modelled at all.
 *
 * Rates are CNY per 1M tokens, from DeepSeek's 2026-08-13 price announcement.
 * Peak window is Beijing time 09:00–12:00 and 14:00–18:00; off-peak is half of
 * peak. Usage recorded before the switch is still costed at the old flat rates,
 * so historical days keep the price that was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 */
import type { PricingInfo, PricingRates } from './contract.ts';
/** 2026-08-17 00:00 Beijing time (UTC+8), when peak/off-peak pricing starts. */
export declare const PEAK_PRICING_FROM_MS: number;
type Tier = 'pro' | 'flash';
/** Which price tier a model name falls into; anything unrecognised is billed
 *  as pro, the conservative (more expensive) guess. */
export declare function tierOf(model: string): Tier;
/** Whether a moment falls in a peak window, judged in Beijing time so the
 *  estimate does not drift with the machine's timezone. */
export declare function isPeak(timeMs: number): boolean;
/** Rates applying to one model at one moment. */
export declare function ratesAt(timeMs: number, model: string): PricingRates;
/**
 * What prefix caching saved on one record: the cache-hit tokens re-priced at
 * the cache-miss rate, minus what they actually cost.
 */
export declare function cacheSavingOf(timeMs: number, model: string, cache: number): number;
/** Estimated CNY cost of one usage record. */
export declare function costOf(timeMs: number, model: string, input: number, cache: number, output: number): number;
/**
 * The same record priced under the peak/off-peak table regardless of when it
 * happened — `forceOffPeak` prices it as if it had landed in an idle window.
 * Used to answer "what will the new pricing cost me" before the switch and
 * "what would shifting off-peak save" after it.
 */
export declare function costUnderPeakEra(timeMs: number, model: string, input: number, cache: number, output: number, forceOffPeak?: boolean): number;
/** The price table to show the user, describing whatever is in effect now. */
export declare function pricingInfo(nowMs: number): PricingInfo;
export {};
