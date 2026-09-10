/**
 * DeepSeek API price table and cost estimation.
 *
 * Two things the previous flat constant got wrong: every model was billed at
 * deepseek-v4-pro rates (flash is ~3x cheaper), and the 2026-08-17 switch to
 * peak/off-peak pricing was not modelled at all.
 *
 * Rates are CNY per 1M tokens, from DeepSeek's 2026-08-13 price announcement.
 * Peak window is Beijing time 09:00–12:00 and 14:00–18:00; off-peak is half of
 * peak. The deepseek-v4-flash-vision-exp model is billed exactly like flash
 * (same table), with images converted to tokens by size and priced together
 * with text tokens. Usage recorded before the switch is still costed at the
 * old flat rates, so historical days keep the price that was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 */
import type { PricingInfo, PricingRates } from './contract.ts'

/** 2026-08-17 00:00 Beijing time (UTC+8), when peak/off-peak pricing took effect. */
export const PEAK_PRICING_FROM_MS = Date.UTC(2026, 7, 16, 16, 0, 0)

/** Peak hours in Beijing time, as [startHour, endHour) pairs. */
const PEAK_WINDOWS: Array<[number, number]> = [[9, 12], [14, 18]]

const BEIJING_OFFSET_MS = 8 * 3_600_000

type Tier = 'pro' | 'flash' | 'vision'

/** Flat rates in effect until 2026-08-17. */
const LEGACY_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.025, input: 3, output: 6 },
  flash: { cacheHit: 0.02, input: 1, output: 2 },
  // The vision model billed at flash rates from day one, so its pre-switch
  // history is costed at the same flat prices as flash.
  vision: { cacheHit: 0.02, input: 1, output: 2 },
}

/** Peak rates from 2026-08-17; off-peak is exactly half of each. */
const PEAK_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.1, input: 3, output: 9 },
  // Official policy: deepseek-v4-flash-vision-exp is priced identically to
  // deepseek-v4-flash; images cost tokens, not their own multiplier.
  vision: { cacheHit: 0.1, input: 3, output: 9 },
}

const halved = (rates: PricingRates): PricingRates => ({
  cacheHit: rates.cacheHit / 2,
  input: rates.input / 2,
  output: rates.output / 2,
})

/** Which price tier a model name falls into; anything unrecognised is billed
 *  as pro, the conservative (more expensive) guess. Vision is matched first:
 *  `deepseek-v4-flash-vision-exp` also contains "flash". */
export function tierOf(model: string): Tier {
  const name = model.toLowerCase()
  if (name.includes('vision')) return 'vision'
  if (name.includes('flash')) return 'flash'
  return 'pro'
}

/**
 * Image token conversion (DeepSeek official rule, Vision guide):
 * - Images below roughly 384×384 pixels are scaled UP preserving aspect
 *   ratio; larger images are scaled DOWN so their pixel count is roughly that
 *   of an 800×800 image.
 * - Tokens are proportional to the (resized) pixel count, capped at 384
 *   tokens per image, so 2000×2000 and 5000×5000 cost the same.
 * - Each image is counted independently; `detail: low` caps at 512×512.
 *
 * The estimate is for the "how much came from images" breakdown; the exact
 * provider count is already folded into the usage record's `inputTokens`.
 * Returns tokens (possibly fractional) — 0 for missing/invalid dimensions.
 */
export function estimateImageTokens(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0
  const area = width * height
  const scaledArea = Math.min(800 * 800, Math.max(384 * 384, area))
  return 384 * (scaledArea / (800 * 800))
}

/** Whether a moment falls in a peak window, judged in Beijing time so the
 *  estimate does not drift with the machine's timezone. */
export function isPeak(timeMs: number): boolean {
  const hour = Math.floor((((timeMs + BEIJING_OFFSET_MS) % 86_400_000) + 86_400_000) % 86_400_000 / 3_600_000)
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/** Rates applying to one model at one moment. */
export function ratesAt(timeMs: number, model: string): PricingRates {
  const tier = tierOf(model)
  if (timeMs < PEAK_PRICING_FROM_MS) return LEGACY_RATES[tier]
  const peak = PEAK_RATES[tier]
  return isPeak(timeMs) ? peak : halved(peak)
}

/**
 * What prefix caching saved on one record: the cache-hit tokens re-priced at
 * the cache-miss rate, minus what they actually cost.
 */
export function cacheSavingOf(timeMs: number, model: string, cache: number): number {
  const rates = ratesAt(timeMs, model)
  return (cache * (rates.input - rates.cacheHit)) / 1_000_000
}

const applyRates = (rates: PricingRates, input: number, cache: number, output: number): number =>
  (input * rates.input + cache * rates.cacheHit + output * rates.output) / 1_000_000

/** Estimated CNY cost of one usage record. */
export function costOf(timeMs: number, model: string, input: number, cache: number, output: number): number {
  return applyRates(ratesAt(timeMs, model), input, cache, output)
}

/**
 * The same record priced as if it had landed in an idle window — used to
 * answer "what would shifting work off-peak save me" under the peak/off-peak
 * table that has been in effect since 2026-08-17.
 */
export function costUnderPeakEra(timeMs: number, model: string, input: number, cache: number, output: number, forceOffPeak = false): number {
  const peak = PEAK_RATES[tierOf(model)]
  const rates = !forceOffPeak && isPeak(timeMs) ? peak : halved(peak)
  return applyRates(rates, input, cache, output)
}

/** The price table to show the user. Peak/off-peak split is in effect and the
 *  per-tier rate table is static; only `inPeakNow` changes with the clock. */
export function pricingInfo(nowMs: number): PricingInfo {
  return {
    currency: 'CNY',
    switchDate: '2026-08-17',
    inPeakNow: isPeak(nowMs),
    peakWindows: ['09:00–12:00', '14:00–18:00'],
    tiers: [
      { model: 'deepseek-v4-pro', peak: PEAK_RATES.pro, offPeak: halved(PEAK_RATES.pro) },
      { model: 'deepseek-v4-flash', peak: PEAK_RATES.flash, offPeak: halved(PEAK_RATES.flash) },
      { model: 'deepseek-v4-flash-vision-exp', peak: PEAK_RATES.vision, offPeak: halved(PEAK_RATES.vision) },
    ],
  }
}
